/* ============================================================
   TamTai - Thư viện chung cho toàn bộ frontend
   Chứa các hàm tiện ích: giỏ hàng, API, xác thực, định dạng, ...
   ============================================================ */
(function () {
  // ===================== HẰNG SỐ =====================
  var CART_KEY = "tamtai_cart";                    // Key lưu giỏ hàng trong localStorage
  var PROFILE_KEY = "tamtai_profile";              // Key lưu thông tin profile
  var API_BASE_URL = "https://sale-web-backend.onrender.com";      // Địa chỉ backend API
  var CHATBOT_EMBED_URL = "http://127.0.0.1:8010/embed/chatbot.js"; // URL embed chatbot
  var GOOGLE_CLIENT_ID = "27435447565-fk6hsgmd17rqjuqegeqvq1monbo632gr.apps.googleusercontent.com"; // Client ID Google OAuth
  var DEFAULT_PRODUCT_IMAGE = "../../images/acer-refurbished-laptop-500x500.webp"; // Ảnh mặc định sản phẩm

  /**
   * parseJson - Phân tích chuỗi JSON an toàn
   * @param {string} raw - Chuỗi JSON cần parse
   * @param {*} fallback - Giá trị trả về nếu parse thất bại
   * @returns {*} Kết quả parse hoặc fallback
   */
  function parseJson(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;  // Trả về fallback nếu JSON không hợp lệ
    }
  }


  /**
   * sanitizeStorageKeyPart - Vệ sinh chuỗi để dùng làm key trong localStorage
   * @param {string} value - Giá trị cần vệ sinh
   * @param {string} fallback - Giá trị mặc định nếu value rỗng
   * @returns {string} Chuỗi đã được loại bỏ ký tự đặc biệt
   */
  function sanitizeStorageKeyPart(value, fallback) {
    var raw = String(value || "").trim();
    if (!raw) {
      return fallback || "unknown";
    }
    // Chỉ giữ lại chữ cái, số, gạch dưới và gạch ngang
    var safe = raw.replace(/[^a-zA-Z0-9_-]/g, "_");
    return safe || (fallback || "unknown");
  }

  /**
   * parseJwtPayload - Giải mã payload từ JWT token (không xác thực chữ ký)
   * @param {string} token - JWT token dạng header.payload.signature
   * @returns {object|null} Payload đã giải mã hoặc null nếu lỗi
   */
  function parseJwtPayload(token) {
    if (!token || typeof token !== "string") {
      return null;
    }
    // Tách token thành 3 phần: header, payload, signature
    var parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }

    try {
      // Chuyển base64url → base64 chuẩn
      var payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (payload.length % 4 !== 0) {
        payload += "=";
      }

      if (typeof atob !== "function") {
        return null;
      }
      // Giải mã base64 và parse JSON
      return JSON.parse(atob(payload));
    } catch (error) {
      return null;
    }
  }

  /**
   * getCartStorageKey - Xác định key lưu giỏ hàng dựa trên vai trò người dùng
   * Khách (guest) dùng key chung, user dùng key riêng theo customer_id
   * @returns {string} Key để lưu giỏ hàng trong localStorage
   */
  function getCartStorageKey() {
    // Lấy vai trò người dùng, mặc định là "guest"
    var role = localStorage.getItem("tamtai_role") || "guest";

    // Nếu không phải user (guest/admin) → dùng key chung
    if (role !== "user") {
      return CART_KEY;
    }

    // User đã đăng nhập → tạo key riêng gắn với customer_id
    var customerId = localStorage.getItem("tamtai_customer_id");
    if (customerId) {
      return CART_KEY + "_user_" + sanitizeStorageKeyPart(customerId, "unknown");
    }

    // Thử lấy customer_id từ profile đã lưu
    var profile = parseJson(localStorage.getItem("tamtai_customer_profile"), null);
    if (profile && profile.customer_id) {
      return CART_KEY + "_user_" + sanitizeStorageKeyPart(profile.customer_id, "unknown");
    }

    // Dự phòng: giải mã token để lấy user identifier
    var token = localStorage.getItem("access_token");
    var payload = parseJwtPayload(token);
    var tokenUserId = payload && (payload.sub || payload.customer_id || payload.user_id || payload.email);
    if (tokenUserId) {
      return CART_KEY + "_user_" + sanitizeStorageKeyPart(tokenUserId, "unknown");
    }

    return CART_KEY + "_user_anonymous";
  }

  /**
   * normalizeCart - Chuẩn hóa dữ liệu giỏ hàng về dạng mảng
   * @param {*} rawCart - Dữ liệu thô (mảng hoặc object có thuộc tính items)
   * @returns {Array} Mảng các sản phẩm trong giỏ
   */
  function normalizeCart(rawCart) {
    // Nếu là mảng → dùng trực tiếp
    if (Array.isArray(rawCart)) {
      return rawCart;
    }
    // Nếu là object có trường items → lấy items
    if (rawCart && Array.isArray(rawCart.items)) {
      return rawCart.items;
    }
    // Mặc định trả về mảng rỗng
    return [];
  }

  /**
   * getCart - Lấy giỏ hàng từ localStorage
   * @returns {Array} Mảng sản phẩm trong giỏ hàng
   */
  function getCart() {
    return normalizeCart(parseJson(localStorage.getItem(getCartStorageKey()), []));
  }

  /**
   * saveCart - Lưu giỏ hàng vào localStorage và phát sự kiện cập nhật
   * @param {Array} cart - Mảng sản phẩm cần lưu
   */
  function saveCart(cart) {
    var normalizedCart = normalizeCart(cart);
    localStorage.setItem(getCartStorageKey(), JSON.stringify(normalizedCart));
    // Phát sự kiện để các component khác cập nhật (badge, ...)
    window.dispatchEvent(new CustomEvent("tamtai:cart-updated", { detail: { cart: normalizedCart } }));
  }

  /**
   * addToCart - Thêm sản phẩm vào giỏ hàng
   * @param {object} item - Sản phẩm (có thể có productId, id, name, price, image, ...)
   * @param {number} quantity - Số lượng (mặc định 1)
   * Nếu sản phẩm đã tồn tại → tăng số lượng; chưa có → thêm mới
   */
  function addToCart(item, quantity) {
    // Đảm bảo số lượng tối thiểu là 1
    var qty = Number(quantity || 1);
    if (qty < 1) {
      qty = 1;
    }
    // Xác định ID sản phẩm; nếu không có thì tạo ID tạm
    var productId = item && (item.productId || item.id) ? String(item.productId || item.id) : "item-" + Date.now();
    var cart = getCart();
    // Tìm sản phẩm đã có trong giỏ
    var existing = cart.find(function (entry) {
      return String(entry.productId || entry.id) === productId;
    });

    if (existing) {
      existing.qty += qty;  // Tăng số lượng
    } else {
      // Thêm sản phẩm mới với các trường cần thiết
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

  /**
   * clearCart - Xóa toàn bộ giỏ hàng
   */
  function clearCart() {
    saveCart([]);
  }

  /**
   * formatCurrency - Định dạng số thành tiền tệ Việt Nam
   * @param {number} value - Số tiền cần định dạng
   * @returns {string} Chuỗi đã định dạng kèm ký hiệu ₫
   */
  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "\u20ab"; // VD: "1.234.567 ₫"
  }

  /**
   * parseCurrency - Chuyển chuỗi tiền tệ về số
   * @param {string} text - Chuỗi chứa số tiền (VD: "1.234.567₫")
   * @returns {number} Giá trị số
   */
  function parseCurrency(text) {
    if (!text) {
      return 0;
    }
    // Loại bỏ tất cả ký tự không phải số
    var numeric = String(text).replace(/[^\d]/g, "");
    return Number(numeric || 0);
  }

  /**
   * normalizeText - Chuẩn hóa văn bản: loại bỏ dấu tiếng Việt, chữ thường
   * Dùng cho tìm kiếm và so sánh không phân biệt dấu
   * @param {string} value - Văn bản cần chuẩn hóa
   * @returns {string} Văn bản đã chuẩn hóa
   */
  function normalizeText(value) {
    if (value === null || value === undefined) {
      return "";
    }
    // NFD tách dấu khỏi ký tự, regex loại bỏ các dấu đó
    return String(value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /**
   * buildApiUrl - Xây dựng URL đầy đủ từ path
   * @param {string} path - Đường dẫn tương đối hoặc tuyệt đối
   * @returns {string} URL hoàn chỉnh (ghép với API_BASE_URL nếu cần)
   */
  function buildApiUrl(path) {
    var input = String(path || "");
    // Nếu đã là URL đầy đủ thì trả về luôn
    if (/^https?:\/\//i.test(input)) {
      return input;
    }
    // Đảm bảo path bắt đầu bằng "/"
    if (!input.startsWith("/")) {
      input = "/" + input;
    }
    return API_BASE_URL + input;
  }

  /**
   * fetchJson - Gọi API và trả về dữ liệu JSON
   * @param {string} path - Đường dẫn API (tương đối hoặc tuyệt đối)
   * @param {object} options - Tùy chọn fetch (method, headers, body, ...)
   * @returns {Promise<object>} Dữ liệu JSON từ response
   * @throws {Error} Nếu HTTP status không OK
   */
  async function fetchJson(path, options) {
    var response = await fetch(buildApiUrl(path), options || {});
    var body = null;

    try {
      body = await response.json();  // Parse JSON body
    } catch (error) {
      body = null;  // Nếu không parse được thì bỏ qua
    }

    // Nếu HTTP status lỗi → throw Error với message từ API hoặc status code
    if (!response.ok) {
      var message = body && body.detail ? body.detail : ("Request failed: " + response.status);
      throw new Error(String(message));
    }

    return body;
  }

  /**
   * getRole - Lấy vai trò người dùng hiện tại
   * @returns {string} "admin" | "user" | "guest"
   */
  function getRole() {
    return localStorage.getItem("tamtai_role") || "guest";
  }

  /**
   * showAdminMenuLink - Hiện/ẩn link menu admin dựa trên role
   * @param {HTMLElement} rootNode - Node gốc để query (mặc định document)
   */
  function showAdminMenuLink(rootNode) {
    var root = rootNode || document;
    var adminMenuLink = root.querySelector("#adminMenuLink");
    if (!adminMenuLink) {
      return;
    }
    // Nếu role là admin → hiển thị link; ngược lại → ẩn
    adminMenuLink.style.display = getRole() === "admin" ? "flex" : "none";
  }

  /**
   * setupSearchRedirect - Thiết lập sự kiện Enter trên ô tìm kiếm
   * Khi người dùng nhấn Enter → chuyển hướng sang trang sản phẩm với từ khóa
   * @param {string|HTMLElement} inputSelector - Selector hoặc element input
   * @param {string} redirectPath - Đường dẫn trang kết quả tìm kiếm
   */
  function setupSearchRedirect(inputSelector, redirectPath) {
    var input = typeof inputSelector === "string" ? document.querySelector(inputSelector) : inputSelector;
    if (!input) {
      return;
    }

    input.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") {
        return;  // Chỉ xử lý phím Enter
      }

      var keyword = input.value.trim();
      if (!keyword) {
        return;  // Bỏ qua nếu từ khóa rỗng
      }

      // Chuyển hướng sang trang sản phẩm với query string
      var destination = redirectPath || "../products/products.html";
      window.location.href = destination + "?q=" + encodeURIComponent(keyword);
    });
  }

  /**
   * getProfile - Lấy thông tin profile người dùng từ localStorage
   * @returns {object} Thông tin profile (fullName, email, phone, address) mặc định rỗng
   */
  function getProfile() {
    return parseJson(localStorage.getItem(PROFILE_KEY), {
      fullName: "",
      email: "",
      phone: "",
      address: ""
    });
  }

  /**
   * saveProfile - Lưu thông tin profile vào localStorage
   * @param {object} profile - Thông tin cần lưu
   */
  function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  /**
   * clearSession - Xóa toàn bộ dữ liệu phiên đăng nhập khỏi localStorage
   * Bao gồm: access_token, role, customer_id, customer_profile, profile
   */
  function clearSession() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("tamtai_role");
    localStorage.removeItem("tamtai_customer_id");
    localStorage.removeItem("tamtai_customer_profile");
    localStorage.removeItem(PROFILE_KEY);
  }

  /**
   * logout - Đăng xuất: xóa session và chuyển hướng
   * @param {string} redirectPath - Đường dẫn chuyển hướng sau logout (mặc định login.html)
   */
  function logout(redirectPath) {
    clearSession();
    window.location.href = redirectPath || "../auth/login.html";
  }

  /**
   * bindLogoutButtons - Gán sự kiện click cho tất cả nút có data-logout
   * @param {HTMLElement} rootNode - Node gốc để query (mặc định document)
   */
  function bindLogoutButtons(rootNode) {
    var root = rootNode || document;
    var buttons = root.querySelectorAll("[data-logout]");
    if (!buttons.length) {
      return;
    }
    // Gán sự kiện click cho từng nút logout
    buttons.forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        // Cho phép ghi đè redirect bằng data-redirect
        logout(button.getAttribute("data-redirect") || "../auth/login.html");
      });
    });
  }

  /**
   * initStandaloneChatbot - Nhúng script chatbot vào trang (chỉ nhúng 1 lần)
   * Kiểm tra nếu đã có script chatbot thì không nhúng lại
   */
  function initStandaloneChatbot() {
    if (!document.body) {
      return;
    }
    // Chỉ nhúng 1 lần — nếu đã có script chatbot thì thoát
    if (document.querySelector('script[data-sale-web-chatbot-embed-loader="true"]')) {
      return;
    }

    var script = document.createElement("script");
    script.src = CHATBOT_EMBED_URL;
    script.async = true;
    script.dataset.saleWebChatbotEmbedLoader = "true";
    // Xử lý lỗi nếu không tải được chatbot
    script.addEventListener("error", function () {
      console.warn("Standalone chatbot service is not available at " + CHATBOT_EMBED_URL);
    });
    document.head.appendChild(script);
  }

  var CART_FLYER_CSS = null;  // Biến lưu style element để tránh tạo lại

  /**
   * ensureCartFlyerStyle - Đảm bảo CSS cho badge giỏ hàng đã được thêm vào <head>
   * Chỉ thêm 1 lần, các lần sau sẽ bỏ qua
   */
  function ensureCartFlyerStyle() {
    if (CART_FLYER_CSS) return;
    CART_FLYER_CSS = document.createElement("style");
    // CSS cho badge giỏ hàng và badge thông báo
    CART_FLYER_CSS.textContent = ".cart-badge,.notify-badge{position:absolute;top:-6px;right:-8px;min-width:18px;height:18px;border-radius:999px;background:#e74c3c;color:#fff;font-size:10px;font-weight:800;display:none;align-items:center;justify-content:center;line-height:1;padding:0 5px;box-shadow:0 2px 6px rgba(0,0,0,0.2);pointer-events:none;z-index:5}.header-icons a{position:relative}";
    document.head.appendChild(CART_FLYER_CSS);
  }

  /**
   * updateCartBadge - Cập nhật số lượng hiển thị trên badge giỏ hàng
   * Tính tổng số lượng tất cả sản phẩm; ẩn badge nếu giỏ rỗng
   */
  function updateCartBadge() {
    var cart = getCart();
    // Tính tổng số lượng (qty) của tất cả items
    var count = cart.reduce(function (sum, item) { return sum + (item.qty || 1); }, 0);
    document.querySelectorAll(".cart-badge").forEach(function (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline-flex" : "none"; // Ẩn nếu giỏ rỗng
    });
  }

  /**
   * initCartBadges - Tạo badge hiển thị số lượng cho các link giỏ hàng
   * Tìm tất cả link chứa "cart" trong header-icons và thêm badge
   */
  function initCartBadges() {
    ensureCartFlyerStyle();
    // Tìm các link giỏ hàng và thêm badge nếu chưa có
    document.querySelectorAll('.header-icons a[href*="cart"]').forEach(function (link) {
      if (!link.querySelector(".cart-badge")) {
        var badge = document.createElement("span");
        badge.className = "cart-badge";
        link.appendChild(badge);
      }
    });
    updateCartBadge(); // Cập nhật số lượng ban đầu
  }

  /**
   * initNotifyBadges - Tạo badge hiển thị số thông báo chưa đọc
   */
  function initNotifyBadges() {
    // Tìm các link thông báo và thêm badge nếu chưa có
    document.querySelectorAll('.header-icons a[href*="notification"]').forEach(function (link) {
      if (!link.querySelector(".notify-badge")) {
        var badge = document.createElement("span");
        badge.className = "notify-badge";
        link.appendChild(badge);
      }
    });
    updateNotifyBadge(); // Cập nhật số lượng ban đầu
  }

  /**
   * updateNotifyBadge - Cập nhật số thông báo chưa đọc trên badge
   * Đọc giá trị từ localStorage "tamtai_notify_unread"
   */
  function updateNotifyBadge() {
    // Lấy số thông báo chưa đọc từ localStorage, mặc định 0
    var unread = parseInt(localStorage.getItem("tamtai_notify_unread") || "0", 10);
    document.querySelectorAll(".notify-badge").forEach(function (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? "inline-flex" : "none"; // Ẩn nếu không có thông báo
    });
  }

  /**
   * syncNotifyBadgeFromApi - Đồng bộ số thông báo chưa đọc từ API
   * Chỉ chạy khi có token và role là user
   */
  function syncNotifyBadgeFromApi() {
    var token = localStorage.getItem("access_token");
    var role = localStorage.getItem("tamtai_role");
    if (!token || role !== "user") return; // Chỉ user mới cần đồng bộ
    TamTai.fetchJson("/notifications/unread-count", {
      headers: { Authorization: "Bearer " + token }
    }).then(function (data) {
      if (data && typeof data.unread_count === "number") {
        // Lưu vào localStorage và cập nhật badge
        localStorage.setItem("tamtai_notify_unread", String(data.unread_count));
        updateNotifyBadge();
      }
    }).catch(function () {}); // Im lặng nếu lỗi
  }

  /**
   * flyToCart - Hiệu ứng "bay" sản phẩm vào giỏ hàng
   * Tạo một phần tử ảnh nhỏ bay từ vị trí nguồn đến icon giỏ hàng
   * @param {HTMLElement} sourceEl - Phần tử gốc (nơi click thêm giỏ)
   * @param {string} imageUrl - URL ảnh sản phẩm để bay
   */
  function flyToCart(sourceEl, imageUrl) {
    // Tìm link giỏ hàng trong header để làm đích bay đến
    var cartLink = document.querySelector('.header-icons a[href*="cart"]');
    if (!cartLink || !sourceEl) return;
    // Lấy tọa độ của nguồn và đích
    var srcRect = sourceEl.getBoundingClientRect();
    var tgtRect = cartLink.getBoundingClientRect();
    // Tạo thẻ ảnh bay
    var flyer = document.createElement("img");
    flyer.src = imageUrl || DEFAULT_PRODUCT_IMAGE;
    flyer.alt = "";
    flyer.style.cssText = "position:fixed;z-index:99999;width:48px;height:48px;border-radius:8px;object-fit:cover;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,0.25);transition:all 0.55s cubic-bezier(0.22,0.61,0.36,1)";
    flyer.style.left = (srcRect.left + srcRect.width / 2 - 24) + "px";
    flyer.style.top = (srcRect.top - 8) + "px";
    document.body.appendChild(flyer);
    // Animation frame tiếp theo => di chuyển đến vị trí giỏ hàng và thu nhỏ
    requestAnimationFrame(function () {
      flyer.style.left = (tgtRect.left + tgtRect.width / 2 - 16) + "px";
      flyer.style.top = (tgtRect.top - 16) + "px";
      flyer.style.width = "32px";
      flyer.style.height = "32px";
      flyer.style.opacity = "0.6";
    });
    // Sau 550ms (khớp với transition) thì xóa ảnh bay và cập nhật badge
    setTimeout(function () {
      flyer.remove();
      updateCartBadge();
    }, 550);
  }

  // ===================== PUBLIC API =====================
  // Xuất các hàm và hằng số ra window.TamTai để dùng toàn cục
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

  /**
   * updateLogoLink - Cập nhật tất cả link logo trỏ về trang sản phẩm
   */
  function updateLogoLink() {
    document.querySelectorAll(".logo-box").forEach(function (logo) {
      logo.href = "../products/products.html";
    });
  }

  /**
   * injectFooterIntroLink - Thêm link "Giới thiệu website" vào footer
   * Tìm cột "Về Website" và thêm link landing page vào đầu danh sách
   */
  function injectFooterIntroLink() {
    // Tìm cột footer có tiêu đề "Về Website"
    var headings = document.querySelectorAll(".footer-col h3");
    var col = null;
    headings.forEach(function (h) {
      if (h.textContent.trim() === "V\u1ec1 Website") col = h.parentElement;
    });
    if (!col) return;
    // Không thêm nếu đã có link giới thiệu
    if (col.querySelector('[data-intro-link]')) return;
    var link = document.createElement("a");
    link.setAttribute("data-intro-link", "");
    link.href = "../core/landing.html";
    link.textContent = "Gi\u1edbi thi\u1ec7u website";
    var firstLink = col.querySelector("a");
    if (firstLink) {
      col.insertBefore(link, firstLink); // Chèn trước link đầu tiên
    } else {
      col.appendChild(link);
    }
  }

  // ===================== KHỞI TẠO KHI DOM SẴN SÀNG =====================
  document.addEventListener("DOMContentLoaded", function () {
    // ===== Các tác vụ khởi tạo khi trang load xong =====
    showAdminMenuLink(document);            // Hiện/ẩn menu admin
    bindLogoutButtons(document);            // Gán sự kiện logout
    initStandaloneChatbot();                // Nhúng chatbot
    initCartBadges();                       // Tạo badge giỏ hàng
    initNotifyBadges();                     // Tạo badge thông báo
    updateLogoLink();                       // Cập nhật link logo
    injectFooterIntroLink();                // Thêm link giới thiệu footer

    // Lắng nghe sự kiện cập nhật giỏ hàng để refresh badge
    window.addEventListener("tamtai:cart-updated", updateCartBadge);
    // Lắng nghe sự kiện storage từ tab khác (đồng bộ badge thông báo)
    window.addEventListener("storage", function (e) {
      if (e.key === "tamtai_notify_unread") updateNotifyBadge();
    });
    syncNotifyBadgeFromApi();               // Đồng bộ thông báo từ API
  });
})();

