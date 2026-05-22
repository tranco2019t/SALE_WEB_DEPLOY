(function () {
  var CART_KEY = "tamtai_cart";
  var PROFILE_KEY = "tamtai_profile";
  var API_BASE_URL = "http://127.0.0.1:8000";
  var CHATBOT_EMBED_URL = "http://127.0.0.1:8010/embed/chatbot.js";
  var GOOGLE_CLIENT_ID = "27435447565-fk6hsgmd17rqjuqegeqvq1monbo632gr.apps.googleusercontent.com";
  var DEFAULT_PRODUCT_IMAGE = "../../images/acer-refurbished-laptop-500x500.webp";

  function parseJson(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }


  function sanitizeStorageKeyPart(value, fallback) {
    var raw = String(value || "").trim();
    if (!raw) {
      return fallback || "unknown";
    }

    var safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_");
    return safe || (fallback || "unknown");
  }

  function parseJwtPayload(token) {
    if (!token || typeof token !== "string") {
      return null;
    }

    var parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }

    try {
      var payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (payload.length % 4 !== 0) {
        payload += "=";
      }

      if (typeof atob !== "function") {
        return null;
      }

      return JSON.parse(atob(payload));
    } catch (error) {
      return null;
    }
  }

  function getCartStorageKey() {
    var role = localStorage.getItem("tamtai_role") || "guest";

    if (role !== "user") {
      return CART_KEY;
    }

    var customerId = localStorage.getItem("tamtai_customer_id");
    if (customerId) {
      return CART_KEY + "_user_" + sanitizeStorageKeyPart(customerId, "unknown");
    }

    var profile = parseJson(localStorage.getItem("tamtai_customer_profile"), null);
    if (profile && profile.customer_id) {
      return CART_KEY + "_user_" + sanitizeStorageKeyPart(profile.customer_id, "unknown");
    }

    var token = localStorage.getItem("access_token");
    var payload = parseJwtPayload(token);
    var tokenUserId = payload && (payload.sub || payload.customer_id || payload.user_id || payload.email);
    if (tokenUserId) {
      return CART_KEY + "_user_" + sanitizeStorageKeyPart(tokenUserId, "unknown");
    }

    return CART_KEY + "_user_anonymous";
  }

  function normalizeCart(rawCart) {
    if (Array.isArray(rawCart)) {
      return rawCart;
    }

    if (rawCart && Array.isArray(rawCart.items)) {
      return rawCart.items;
    }

    return [];
  }

  function getCart() {
    return normalizeCart(parseJson(localStorage.getItem(getCartStorageKey()), []));
  }

  function saveCart(cart) {
    var normalizedCart = normalizeCart(cart);
    localStorage.setItem(getCartStorageKey(), JSON.stringify(normalizedCart));
    window.dispatchEvent(new CustomEvent("tamtai:cart-updated", { detail: { cart: normalizedCart } }));
  }

  function addToCart(item, quantity) {
    var qty = Number(quantity || 1);
    if (qty < 1) {
      qty = 1;
    }

    var productId = item && (item.productId || item.id) ? String(item.productId || item.id) : "item-" + Date.now();
    var cart = getCart();
    var existing = cart.find(function (entry) {
      return String(entry.productId || entry.id) === productId;
    });

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id: productId,
        productId: productId,
        categoryId: item && item.categoryId ? String(item.categoryId) : null,
        name: item && item.name ? item.name : "S\u1ea3n ph\u1ea9m",
        price: Number((item && item.price) || 0),
        oldPrice: Number((item && (item.oldPrice || item.price)) || 0),
        image: item && item.image ? item.image : DEFAULT_PRODUCT_IMAGE,
        qty: qty
      });
    }

    saveCart(cart);
  }

  function clearCart() {
    saveCart([]);
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "\u20ab";
  }

  function parseCurrency(text) {
    if (!text) {
      return 0;
    }

    var numeric = String(text).replace(/[^\d]/g, "");
    return Number(numeric || 0);
  }

  function normalizeText(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function buildApiUrl(path) {
    var input = String(path || "");
    if (/^https?:\/\//i.test(input)) {
      return input;
    }

    if (!input.startsWith("/")) {
      input = "/" + input;
    }

    return API_BASE_URL + input;
  }

  async function fetchJson(path, options) {
    var response = await fetch(buildApiUrl(path), options || {});
    var body = null;

    try {
      body = await response.json();
    } catch (error) {
      body = null;
    }

    if (!response.ok) {
      var message = body && body.detail ? body.detail : ("Request failed: " + response.status);
      throw new Error(String(message));
    }

    return body;
  }

  function getRole() {
    return localStorage.getItem("tamtai_role") || "guest";
  }

  function showAdminMenuLink(rootNode) {
    var root = rootNode || document;
    var adminMenuLink = root.querySelector("#adminMenuLink");
    if (!adminMenuLink) {
      return;
    }
    adminMenuLink.style.display = getRole() === "admin" ? "flex" : "none";
  }

  function setupSearchRedirect(inputSelector, redirectPath) {
    var input = typeof inputSelector === "string" ? document.querySelector(inputSelector) : inputSelector;
    if (!input) {
      return;
    }

    input.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") {
        return;
      }

      var keyword = input.value.trim();
      if (!keyword) {
        return;
      }

      var destination = redirectPath || "../products/products.html";
      window.location.href = destination + "?q=" + encodeURIComponent(keyword);
    });
  }

  function getProfile() {
    return parseJson(localStorage.getItem(PROFILE_KEY), {
      fullName: "",
      email: "",
      phone: "",
      address: ""
    });
  }

  function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function clearSession() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("tamtai_role");
    localStorage.removeItem("tamtai_customer_id");
    localStorage.removeItem("tamtai_customer_profile");
    localStorage.removeItem(PROFILE_KEY);
  }

  function logout(redirectPath) {
    clearSession();
    window.location.href = redirectPath || "../auth/login.html";
  }

  function bindLogoutButtons(rootNode) {
    var root = rootNode || document;
    var buttons = root.querySelectorAll("[data-logout]");
    if (!buttons.length) {
      return;
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        logout(button.getAttribute("data-redirect") || "../auth/login.html");
      });
    });
  }

  function initStandaloneChatbot() {
    if (!document.body) {
      return;
    }

    if (document.querySelector('script[data-sale-web-chatbot-embed-loader="true"]')) {
      return;
    }

    var script = document.createElement("script");
    script.src = CHATBOT_EMBED_URL;
    script.async = true;
    script.dataset.saleWebChatbotEmbedLoader = "true";
    script.addEventListener("error", function () {
      console.warn("Standalone chatbot service is not available at " + CHATBOT_EMBED_URL);
    });
    document.head.appendChild(script);
  }

  var CART_FLYER_CSS = null;

  function ensureCartFlyerStyle() {
    if (CART_FLYER_CSS) return;
    CART_FLYER_CSS = document.createElement("style");
    CART_FLYER_CSS.textContent = ".cart-badge,.notify-badge{position:absolute;top:-6px;right:-8px;min-width:18px;height:18px;border-radius:999px;background:#e74c3c;color:#fff;font-size:10px;font-weight:800;display:none;align-items:center;justify-content:center;line-height:1;padding:0 5px;box-shadow:0 2px 6px rgba(0,0,0,0.2);pointer-events:none;z-index:5}.header-icons a{position:relative}";
    document.head.appendChild(CART_FLYER_CSS);
  }

  function updateCartBadge() {
    var cart = getCart();
    var count = cart.reduce(function (sum, item) { return sum + (item.qty || 1); }, 0);
    document.querySelectorAll(".cart-badge").forEach(function (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline-flex" : "none";
    });
  }

  function initCartBadges() {
    ensureCartFlyerStyle();
    document.querySelectorAll('.header-icons a[href*="cart"]').forEach(function (link) {
      if (!link.querySelector(".cart-badge")) {
        var badge = document.createElement("span");
        badge.className = "cart-badge";
        link.appendChild(badge);
      }
    });
    updateCartBadge();
  }

  function initNotifyBadges() {
    document.querySelectorAll('.header-icons a[href*="notification"]').forEach(function (link) {
      if (!link.querySelector(".notify-badge")) {
        var badge = document.createElement("span");
        badge.className = "notify-badge";
        link.appendChild(badge);
      }
    });
    updateNotifyBadge();
  }

  function updateNotifyBadge() {
    var unread = parseInt(localStorage.getItem("tamtai_notify_unread") || "0", 10);
    document.querySelectorAll(".notify-badge").forEach(function (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? "inline-flex" : "none";
    });
  }

  function syncNotifyBadgeFromApi() {
    var token = localStorage.getItem("access_token");
    var role = localStorage.getItem("tamtai_role");
    if (!token || role !== "user") return;
    TamTai.fetchJson("/notifications/unread-count", {
      headers: { Authorization: "Bearer " + token }
    }).then(function (data) {
      if (data && typeof data.unread_count === "number") {
        localStorage.setItem("tamtai_notify_unread", String(data.unread_count));
        updateNotifyBadge();
      }
    }).catch(function () {});
  }

  function flyToCart(sourceEl, imageUrl) {
    var cartLink = document.querySelector('.header-icons a[href*="cart"]');
    if (!cartLink || !sourceEl) return;
    var srcRect = sourceEl.getBoundingClientRect();
    var tgtRect = cartLink.getBoundingClientRect();
    var flyer = document.createElement("img");
    flyer.src = imageUrl || DEFAULT_PRODUCT_IMAGE;
    flyer.alt = "";
    flyer.style.cssText = "position:fixed;z-index:99999;width:48px;height:48px;border-radius:8px;object-fit:cover;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,0.25);transition:all 0.55s cubic-bezier(0.22,0.61,0.36,1)";
    flyer.style.left = (srcRect.left + srcRect.width / 2 - 24) + "px";
    flyer.style.top = (srcRect.top - 8) + "px";
    document.body.appendChild(flyer);
    requestAnimationFrame(function () {
      flyer.style.left = (tgtRect.left + tgtRect.width / 2 - 16) + "px";
      flyer.style.top = (tgtRect.top - 16) + "px";
      flyer.style.width = "32px";
      flyer.style.height = "32px";
      flyer.style.opacity = "0.6";
    });
    setTimeout(function () {
      flyer.remove();
      updateCartBadge();
    }, 550);
  }

  window.TamTai = {
    API_BASE_URL: API_BASE_URL,
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
    DEFAULT_PRODUCT_IMAGE: DEFAULT_PRODUCT_IMAGE,
    getCart: getCart,
    saveCart: saveCart,
    addToCart: addToCart,
    clearCart: clearCart,
    formatCurrency: formatCurrency,
    parseCurrency: parseCurrency,
    normalizeText: normalizeText,
    buildApiUrl: buildApiUrl,
    fetchJson: fetchJson,
    getRole: getRole,
    showAdminMenuLink: showAdminMenuLink,
    setupSearchRedirect: setupSearchRedirect,
    getProfile: getProfile,
    saveProfile: saveProfile,
    clearSession: clearSession,
    logout: logout,
    bindLogoutButtons: bindLogoutButtons,
    flyToCart: flyToCart,
    updateCartBadge: updateCartBadge,
    initCartBadges: initCartBadges,
    updateNotifyBadge: updateNotifyBadge,
    initNotifyBadges: initNotifyBadges,
    syncNotifyBadgeFromApi: syncNotifyBadgeFromApi
  };

  function updateLogoLink() {
    document.querySelectorAll(".logo-box").forEach(function (logo) {
      logo.href = "../products/products.html";
    });
  }

  function injectFooterIntroLink() {
    var headings = document.querySelectorAll(".footer-col h3");
    var col = null;
    headings.forEach(function (h) {
      if (h.textContent.trim() === "V\u1ec1 Website") col = h.parentElement;
    });
    if (!col) return;
    if (col.querySelector('[data-intro-link]')) return;
    var link = document.createElement("a");
    link.setAttribute("data-intro-link", "");
    link.href = "../core/landing.html";
    link.textContent = "Gi\u1edbi thi\u1ec7u website";
    var firstLink = col.querySelector("a");
    if (firstLink) {
      col.insertBefore(link, firstLink);
    } else {
      col.appendChild(link);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    showAdminMenuLink(document);
    bindLogoutButtons(document);
    initStandaloneChatbot();
    initCartBadges();
    initNotifyBadges();
    updateLogoLink();
    injectFooterIntroLink();
    window.addEventListener("tamtai:cart-updated", updateCartBadge);
    window.addEventListener("storage", function (e) {
      if (e.key === "tamtai_notify_unread") updateNotifyBadge();
    });
    syncNotifyBadgeFromApi();
  });
})();

