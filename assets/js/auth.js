(function () {
  const ADMIN_EMAILS = ["codigoquanticoceo@gmail.com"]; // mantenha a lista centralizada

  const toLower = (value) => (value || "").toString().trim().toLowerCase();
  const isAdminEmail = (email) => ADMIN_EMAILS.includes(toLower(email));

  let supabase = null;
  let currentSession = null;
  let readyResolver = null;
  const readyPromise = new Promise((resolve) => {
    readyResolver = resolve;
  });
  const subscribers = new Set();

  const notifyReady = () => {
    if (readyResolver) {
      readyResolver();
      readyResolver = null;
    }
  };

  const buildSessionPayload = (session) => {
    if (!session || !session.user) {
      return null;
    }
    const user = session.user;
    const metadata = user.user_metadata || {};
    const adminFlag = metadata.is_admin ?? metadata.isAdmin;

    return {
      id: user.id,
      email: user.email,
      nome: metadata.nome || metadata.name || metadata.full_name || "",
      isAdmin: Boolean(adminFlag) || isAdminEmail(user.email),
      raw: session
    };
  };

  const updateSession = (session) => {
    currentSession = buildSessionPayload(session);
    revealAdminLink(currentSession);
    subscribers.forEach((callback) => {
      try {
        callback(currentSession);
      } catch (error) {
        console.warn("Auth subscriber error", error);
      }
    });
    notifyReady();
  };

  const fetchInitialSession = async () => {
    if (!supabase) {
      notifyReady();
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      updateSession(data?.session || null);
    } catch (error) {
      console.warn("Auth: não foi possível obter a sessão do Supabase.", error);
      notifyReady();
    }
  };

  const initSupabase = () => {
    supabase = window.supabaseClient;
    if (!supabase) {
      console.warn("Auth: Supabase client indisponível.");
      notifyReady();
      return;
    }
    fetchInitialSession();
    supabase.auth.onAuthStateChange((event, session) => {
      updateSession(session);
    });
  };

  const revealAdminLink = (session = currentSession) => {
    const adminBtn = document.getElementById("adminBtn");
    if (!adminBtn) {
      return;
    }
    adminBtn.style.display = session?.isAdmin ? "flex" : "none";
  };

  document.addEventListener("DOMContentLoaded", () => {
    revealAdminLink(currentSession);
  });

  if (window.supabaseClient) {
    initSupabase();
  } else {
    window.addEventListener("supabase:ready", initSupabase, { once: true });
  }

  window.Auth = {
    ADMIN_EMAILS,
    isAdminEmail,
    getSession: () => currentSession,
    ready: () => readyPromise,
    onSessionChange: (callback) => {
      if (typeof callback !== "function") {
        return () => {};
      }
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    signOut: async () => {
      if (!window.supabaseClient) {
        return;
      }
      await window.supabaseClient.auth.signOut();
    }
  };
})();
