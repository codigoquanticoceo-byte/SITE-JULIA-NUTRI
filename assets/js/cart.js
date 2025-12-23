(function () {
  const CART_KEY = "juliaCart.v1";
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const readCart = () => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.warn("Carrinho: não foi possível ler o armazenamento local.", error);
    }
    return [];
  };

  const persistCart = (items) => {
    const snapshot = clone(items);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn("Carrinho: não foi possível salvar no armazenamento local.", error);
    }
    try {
      window.dispatchEvent(new CustomEvent("cart:updated", { detail: snapshot }));
    } catch (_) {
      const fallbackEvent = document.createEvent("CustomEvent");
      fallbackEvent.initCustomEvent("cart:updated", false, false, snapshot);
      window.dispatchEvent(fallbackEvent);
    }
  };

  const getTotalItems = (items) => items.reduce((total, current) => total + (current.qty || 0), 0);

  const updateCartCountDisplay = () => {
    const badge = document.getElementById("cartCount");
    if (!badge) {
      return;
    }
    const total = getTotalItems(readCart());
    badge.textContent = total;
  };

  window.addToCart = (product) => {
    if (!product || !product.id) {
      return;
    }
    const cart = readCart();
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: product.id,
        title: product.title || "Produto",
        price: Number(product.price) || 0,
        image: product.image || "",
        qty: 1
      });
    }

    persistCart(cart);
    updateCartCountDisplay();
  };

  document.addEventListener("DOMContentLoaded", updateCartCountDisplay);

  window.addEventListener("storage", (event) => {
    if (event.key === CART_KEY) {
      updateCartCountDisplay();
    }
  });

  window.CartStore = {
    get: () => clone(readCart()),
    clear: () => {
      persistCart([]);
      updateCartCountDisplay();
    }
  };
})();
