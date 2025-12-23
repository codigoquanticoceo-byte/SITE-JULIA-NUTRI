(function () {
  const DEFAULT_DATA = {
    hero: {
      title: "Planilhas e Arquivos Prontos",
      paragraph:
        "✔ Manual de Boas Práticas (MBP)\n✔ POPs – Procedimentos Operacionais Padronizados\n✔ Planilhas Profissionais",
      bullets: [
        "Planilhas de controle de estoque",
        "Modelos de relatórios",
        "Fichas técnicas",
        "Checklists de rotina",
        "Documentos administrativos"
      ]
    },
    products: [
      {
        slug: "planilha-estoque",
        title: "Artigo de exemplo nutrição",
        description:
          "Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.",
        price: 29,
        image: "1.webp",
        position: 1
      },
      {
        slug: "planilha-relatorios",
        title: "Artigo de exemplo nutrição",
        description:
          "Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.",
        price: 25,
        image: "2.webp",
        position: 2
      },
      {
        slug: "planilha-fichas",
        title: "Artigo de exemplo nutrição",
        description:
          "Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.",
        price: 25,
        image: "3.webp",
        position: 3
      },
      {
        slug: "planilha-checklists",
        title: "Artigo de exemplo nutrição",
        description:
          "Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.",
        price: 20,
        image: "4.png",
        position: 4
      }
    ]
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const mapDefaults = () => ({
    hero: {
      id: null,
      title: DEFAULT_DATA.hero.title,
      paragraph: DEFAULT_DATA.hero.paragraph,
      bullets: [...DEFAULT_DATA.hero.bullets]
    },
    products: DEFAULT_DATA.products.map((product, idx) => ({
      id: product.slug,
      dbId: null,
      slug: product.slug,
      title: product.title,
      description: product.description,
      price: Number(product.price) || 0,
      image: product.image,
      position: Number.isFinite(product.position) ? product.position : idx + 1
    }))
  });

  let supabase = window.supabaseClient || null;
  let state = mapDefaults();
  let readyResolver = null;
  const readyPromise = new Promise((resolve) => {
    readyResolver = resolve;
  });

  const finishReady = () => {
    if (readyResolver) {
      readyResolver();
      readyResolver = null;
    }
  };

  const dispatchUpdate = () => {
    const detail = clone(state);
    try {
      window.dispatchEvent(new CustomEvent("siteData:updated", { detail }));
    } catch (error) {
      const fallbackEvent = document.createEvent("CustomEvent");
      fallbackEvent.initCustomEvent("siteData:updated", false, false, detail);
      window.dispatchEvent(fallbackEvent);
    }
  };

  const ensureSupabase = () =>
    new Promise((resolve) => {
      if (supabase) {
        resolve(supabase);
        return;
      }
      if (window.supabaseClient) {
        supabase = window.supabaseClient;
        resolve(supabase);
        return;
      }
      const timeout = setTimeout(() => {
        resolve(null);
      }, 4000);

      const handler = (event) => {
        clearTimeout(timeout);
        supabase = window.supabaseClient || event.detail?.supabase || null;
        window.removeEventListener("supabase:ready", handler);
        resolve(supabase);
      };

      window.addEventListener("supabase:ready", handler, { once: true });
    });

  const requireSupabase = async () => {
    const client = await ensureSupabase();
    if (!client) {
      throw new Error("Supabase não configurado no navegador.");
    }
    return client;
  };

  const sanitizeBullets = (bullets, fallback) => {
    const source = Array.isArray(bullets) ? bullets : fallback;
    return (source || [])
      .map((bullet) => (bullet || "").trim())
      .filter(Boolean);
  };

  const mapHeroRecord = (record) => ({
    id: record?.id || null,
    title: (record?.title || DEFAULT_DATA.hero.title).trim(),
    paragraph: (record?.paragraph || DEFAULT_DATA.hero.paragraph || "").trim(),
    bullets: sanitizeBullets(record?.bullets, DEFAULT_DATA.hero.bullets)
  });

  const normalizeSlug = (text, fallback) => {
    if (!text) {
      return fallback;
    }
    return (
      text
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .trim() || fallback
    );
  };

  const mapProductRecord = (record, index = 0) => ({
    id: record?.slug || record?.id || `produto-${index + 1}`,
    dbId: record?.id || null,
    slug: record?.slug || record?.id || `produto-${index + 1}`,
    title: (record?.title || `Produto ${index + 1}`).trim(),
    description: (record?.description || "").trim(),
    price: Number(record?.price) || 0,
    image: (record?.image || "1.webp").trim() || "1.webp",
    position: Number.isFinite(record?.position) ? Number(record.position) : index + 1
  });

  const normalizeProductInput = (product, index = 0) => {
    const slugFallback = `produto-${index + 1}`;
    const title = (product.title || `Produto ${index + 1}`).trim();
    const slug = normalizeSlug(product.slug || product.id || title, slugFallback);
    const price = Number(product.price);

    return {
      slug,
      title,
      description: (product.description || "").trim(),
      price: Number.isFinite(price) ? Number(price.toFixed(2)) : 0,
      image: (product.image || "1.webp").trim() || "1.webp",
      position: Number.isFinite(product.position)
        ? Number(product.position)
        : index + 1
    };
  };

  const getNextPosition = () =>
    state.products.reduce((current, product) => {
      return Math.max(current, Number(product.position) || 0);
    }, 0) + 1;

  const refresh = async () => {
    const client = await ensureSupabase();
    if (!client) {
      state = mapDefaults();
      dispatchUpdate();
      finishReady();
      return clone(state);
    }

    try {
      const heroPromise = client
        .from("hero_content")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const productsPromise = client
        .from("products")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      const [{ data: heroData, error: heroError }, { data: productData, error: productError }] =
        await Promise.all([heroPromise, productsPromise]);

      if (heroError) {
        throw heroError;
      }
      if (productError) {
        throw productError;
      }

      const hero = heroData ? mapHeroRecord(heroData) : mapDefaults().hero;
      const products = Array.isArray(productData) && productData.length
        ? productData.map((record, idx) => mapProductRecord(record, idx))
        : mapDefaults().products;

      state = { hero, products };
    } catch (error) {
      console.warn("SiteData: não foi possível ler o conteúdo remoto, usando padrão.", error);
      state = mapDefaults();
    }

    dispatchUpdate();
    finishReady();
    return clone(state);
  };

  const updateHero = async (payload = {}) => {
    const client = await requireSupabase();
    const currentHero = state.hero || mapDefaults().hero;
    const sanitizedBullets = sanitizeBullets(payload.bullets, currentHero.bullets);

    const record = {
      id: currentHero.id || undefined,
      title: (payload.title ?? currentHero.title ?? DEFAULT_DATA.hero.title)
        .toString()
        .trim() || DEFAULT_DATA.hero.title,
      paragraph: (payload.paragraph ?? currentHero.paragraph ?? "").toString().trim(),
      bullets: sanitizedBullets
    };

    const { error } = await client
      .from("hero_content")
      .upsert(record, { onConflict: "id" })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    await refresh();
    return clone(state);
  };

  const createProduct = async (product) => {
    const client = await requireSupabase();
    const normalized = normalizeProductInput(product, state.products.length);
    const record = {
      slug: normalized.slug,
      title: normalized.title,
      description: normalized.description,
      price: normalized.price,
      image: normalized.image,
      position: normalized.position || getNextPosition()
    };

    const { error } = await client.from("products").insert(record);
    if (error) {
      throw error;
    }

    await refresh();
    return clone(state);
  };

  const findProductById = (productId) =>
    state.products.find(
      (product) => product.id === productId || product.dbId === productId
    );

  const updateProduct = async (productId, payload = {}) => {
    if (!productId) {
      throw new Error("Produto inválido.");
    }

    const client = await requireSupabase();
    const current = findProductById(productId);
    if (!current || !current.dbId) {
      throw new Error("Produto não encontrado.");
    }

    const index = state.products.findIndex((product) => product.id === current.id);
    const normalized = normalizeProductInput({ ...current, ...payload }, index);

    const { error } = await client
      .from("products")
      .update({
        slug: normalized.slug,
        title: normalized.title,
        description: normalized.description,
        price: normalized.price,
        image: normalized.image,
        position: normalized.position
      })
      .eq("id", current.dbId);

    if (error) {
      throw error;
    }

    await refresh();
    return clone(state);
  };

  const deleteProduct = async (productId) => {
    if (!productId) {
      throw new Error("Produto inválido.");
    }

    const client = await requireSupabase();
    const current = findProductById(productId);
    if (!current || !current.dbId) {
      throw new Error("Produto não encontrado.");
    }

    const { error } = await client.from("products").delete().eq("id", current.dbId);
    if (error) {
      throw error;
    }

    await refresh();
    return clone(state);
  };

  const reset = async () => {
    const client = await requireSupabase();
    await client.from("hero_content").delete().neq("id", null);
    await client.from("products").delete().neq("id", null);

    await client.from("hero_content").insert({
      title: DEFAULT_DATA.hero.title,
      paragraph: DEFAULT_DATA.hero.paragraph,
      bullets: DEFAULT_DATA.hero.bullets
    });

    const defaultProducts = DEFAULT_DATA.products.map((product, idx) => ({
      slug: product.slug,
      title: product.title,
      description: product.description,
      price: product.price,
      image: product.image,
      position: product.position || idx + 1
    }));

    if (defaultProducts.length) {
      await client.from("products").insert(defaultProducts);
    }

    await refresh();
    return clone(state);
  };

  window.SiteData = {
    get: () => clone(state),
    getDefaults: () => clone(mapDefaults()),
    ready: () => readyPromise,
    refresh,
    updateHero,
    createProduct,
    updateProduct,
    deleteProduct,
    reset
  };

  refresh();
})();
