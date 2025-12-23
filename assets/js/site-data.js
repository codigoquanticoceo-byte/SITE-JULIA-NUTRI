(function () {
  const STORAGE_KEY = "juliaSiteData.v1";
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const DEFAULT_DATA = {
    hero: {
      title: "Planilhas e Arquivos Prontos",
      paragraph: "✔ Manual de Boas Práticas (MBP)\n✔ POPs – Procedimentos Operacionais Padronizados\n✔ Planilhas Profissionais",
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
        id: "planilha-estoque",
        title: "Artigo de exemplo nutrição",
        description: "Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.",
        price: 29,
        image: "1.webp"
      },
      {
        id: "planilha-relatorios",
        title: "Artigo de exemplo nutrição",
        description: "Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.",
        price: 25,
        image: "2.webp"
      },
      {
        id: "planilha-fichas",
        title: "Artigo de exemplo nutrição",
        description: "Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.",
        price: 25,
        image: "3.webp"
      },
      {
        id: "planilha-checklists",
        title: "Artigo de exemplo nutrição",
        description: "Esse artigo é destinado para pessoas de tal faixa etária, seguindo esse processo você ganhará tal resultado.",
        price: 20,
        image: "4.png"
      }
    ]
  };

  let memoryState = clone(DEFAULT_DATA);

  const normalizeSlug = (text, fallback) => {
    if (!text) {
      return fallback;
    }
    return text
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .trim() || fallback;
  };

  const normalizeProduct = (product, index = 0) => {
    if (!product || typeof product !== "object") {
      return null;
    }

    const title = (product.title || "").trim() || `Produto ${index + 1}`;
    const slugFallback = `produto-${index + 1}`;
    const idSource = (product.id || title || slugFallback).trim();
    const normalizedPrice = Number(product.price);

    return {
      id: normalizeSlug(idSource, slugFallback),
      title,
      description: (product.description || "").trim(),
      price: Number.isFinite(normalizedPrice) ? Number(normalizedPrice.toFixed(2)) : 0,
      image: (product.image || "1.webp").trim() || "1.webp"
    };
  };

  const ensureArray = (value, fallback) => (Array.isArray(value) ? value : clone(fallback));

  const mergeWithDefaults = (source) => {
    const merged = clone(DEFAULT_DATA);
    if (!source || typeof source !== "object") {
      return merged;
    }

    merged.hero.title = (source.hero?.title || merged.hero.title).trim();
    merged.hero.paragraph = (source.hero?.paragraph || merged.hero.paragraph).trim();
    merged.hero.bullets = ensureArray(source.hero?.bullets, merged.hero.bullets)
      .map((bullet) => (bullet || "").trim())
      .filter(Boolean);

    if (Array.isArray(source.products) && source.products.length) {
      const normalizedProducts = source.products
        .map((product, idx) => normalizeProduct(product, idx))
        .filter(Boolean);
      if (normalizedProducts.length) {
        merged.products = normalizedProducts;
      }
    }

    return merged;
  };

  const read = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        memoryState = clone(DEFAULT_DATA);
        return memoryState;
      }
      const parsed = JSON.parse(raw);
      memoryState = mergeWithDefaults(parsed);
    } catch (error) {
      console.warn("SiteData: não foi possível ler o armazenamento local.", error);
    }
    return memoryState;
  };

  const dispatchUpdate = (payload) => {
    const detail = clone(payload);
    try {
      window.dispatchEvent(new CustomEvent("siteData:updated", { detail }));
    } catch (_) {
      const fallbackEvent = document.createEvent("CustomEvent");
      fallbackEvent.initCustomEvent("siteData:updated", false, false, detail);
      window.dispatchEvent(fallbackEvent);
    }
  };

  const commit = (data) => {
    const snapshot = clone(data);
    memoryState = snapshot;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("SiteData: não foi possível salvar no armazenamento local.", error);
    }
    if (typeof window !== "undefined") {
      dispatchUpdate(snapshot);
    }
    return snapshot;
  };

  const updateHero = (payload = {}) => {
    const data = read();
    const bulletSource = Array.isArray(payload.bullets)
      ? payload.bullets
      : data.hero.bullets;
    const sanitizedBullets = bulletSource
      .map((bullet) => (bullet || "").trim())
      .filter(Boolean);

    const titleInput = (payload.title ?? data.hero.title ?? DEFAULT_DATA.hero.title)
      .toString()
      .trim();
    const paragraphInput =
      typeof payload.paragraph === "string"
        ? payload.paragraph
        : data.hero.paragraph ?? "";

    const nextHero = {
      ...data.hero,
      ...payload,
      title: titleInput || DEFAULT_DATA.hero.title,
      paragraph: paragraphInput.trim(),
      bullets: sanitizedBullets
    };

    return commit({
      ...data,
      hero: nextHero
    });
  };

  const createProduct = (product) => {
    const data = read();
    const normalized = normalizeProduct(product, data.products.length);
    const nextProducts = [...data.products, normalized];
    return commit({
      ...data,
      products: nextProducts
    });
  };

  const updateProduct = (productId, payload = {}) => {
    if (!productId) {
      return read();
    }
    const data = read();
    const index = data.products.findIndex((product) => product.id === productId);
    if (index === -1) {
      return data;
    }
    const merged = {
      ...data.products[index],
      ...payload
    };
    const normalized = normalizeProduct(merged, index);
    const nextProducts = [...data.products];
    nextProducts[index] = normalized;
    return commit({
      ...data,
      products: nextProducts
    });
  };

  const deleteProduct = (productId) => {
    if (!productId) {
      return read();
    }
    const data = read();
    const nextProducts = data.products.filter((product) => product.id !== productId);
    return commit({
      ...data,
      products: nextProducts
    });
  };

  const overwriteAll = (payload) => {
    const merged = mergeWithDefaults(payload);
    return commit(merged);
  };

  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("SiteData: não foi possível limpar o armazenamento local.", error);
    }
    return commit(clone(DEFAULT_DATA));
  };

  window.SiteData = {
    STORAGE_KEY,
    get: () => clone(read()),
    getDefaults: () => clone(DEFAULT_DATA),
    updateHero,
    createProduct,
    updateProduct,
    deleteProduct,
    overwriteAll,
    reset
  };
})();
