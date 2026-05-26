(function () {
  // ====== Dữ liệu mặc định và cấu hình ======
  var ordersData = window.TamTaiOrdersData || {
    orders: [],
    statusMeta: {
      pending: { label: "Chờ xác nhận", className: "pending" },
      shipping: { label: "Đang giao", className: "shipping" },
      delivered: { label: "Đã giao", className: "delivered" },
      cancelled: { label: "Đã hủy", className: "cancelled" }
    },
    formatCurrency: function (value) {
      return Number(value || 0).toLocaleString("vi-VN") + "đ";
    }
  };

  var DEFAULT_IMAGE = "../../images/acer-refurbished-laptop-500x500.webp";
  var overviewEl = document.getElementById("orderOverview");  // Khu vực hiển thị thông tin chung
  var itemsEl = document.getElementById("orderItems");         // Khu vực hiển thị danh sách sản phẩm

  function normalizeOrderId(orderId) {
    return String(orderId || "")
      .replace("#", "")
      .trim()
      .toUpperCase();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Trả về giá trị hoặc "chưa có" nếu rỗng
  function displayValue(value) {
    var text = String(value || "").trim();
    return text ? text : "chưa có";
  }

  function parseMoney(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string" && value.trim()) {
      var parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  // Định dạng tiền tệ
  function formatMoney(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "chưa có";
    }
    return ordersData.formatCurrency(value);
  }

  function formatDate(value) {
    if (!value) {
      return "chưa có";
    }

    var raw = String(value).trim();
    if (raw.indexOf("/") !== -1) {
      return raw;
    }

    var date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return "chưa có";
    }

    var dd = String(date.getDate()).padStart(2, "0");
    var mm = String(date.getMonth() + 1).padStart(2, "0");
    var yyyy = date.getFullYear();
    return dd + "/" + mm + "/" + yyyy;
  }

  function mapStatus(rawStatus) {
    var normalized = String(rawStatus || "").trim().toLowerCase();
    if (!normalized) {
      return { key: "pending", label: "chưa có", className: "pending" };
    }
    if (normalized.indexOf("deliver") !== -1 || normalized.indexOf("đã giao") !== -1) {
      return { key: "delivered", label: "Đã giao", className: "delivered" };
    }
    if (normalized.indexOf("ship") !== -1 || normalized.indexOf("giao") !== -1) {
      return { key: "shipping", label: "Đang giao", className: "shipping" };
    }
    if (normalized.indexOf("cancel") !== -1 || normalized.indexOf("hủy") !== -1) {
      return { key: "cancelled", label: "Đã hủy", className: "cancelled" };
    }
    if (normalized.indexOf("pend") !== -1 || normalized.indexOf("wait") !== -1 || normalized.indexOf("chờ") !== -1) {
      return { key: "pending", label: "Chờ xác nhận", className: "pending" };
    }
    return { key: "pending", label: rawStatus, className: "pending" };
  }

  // Map một sản phẩm trong đơn hàng từ API
  function mapBackendItem(item, fallbackStatus) {
    var status = mapStatus(item.status || fallbackStatus);
    var qty = Number(item.quantity);
    var unitPrice = parseMoney(item.price_at_purchase || item.unit_price || item.unitPrice);
    var total = parseMoney(item.amount);

    if (total === null && unitPrice !== null && Number.isFinite(qty)) {
      total = unitPrice * qty;
    }

    return {
      name: displayValue(item.product_name || item.name),
      description: displayValue(item.description),
      image: item.image_url || item.image || DEFAULT_IMAGE,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : null,
      statusLabel: status.label,
      statusClass: status.className,
      unitPrice: unitPrice,
      total: total
    };
  }

  // Map toàn bộ đơn hàng từ API sang cấu trúc frontend
  function mapBackendOrder(raw) {
    var status = mapStatus(raw.status);
    var items = [];
    if (Array.isArray(raw.items)) {
      items = raw.items.map(function (item) {
        return mapBackendItem(item, raw.status);
      });
    } else if (Array.isArray(raw.order_items)) {
      items = raw.order_items.map(function (item) {
        return mapBackendItem(item, raw.status);
      });
    }

    return {
      id: normalizeOrderId(raw.order_id),
      date: formatDate(raw.order_date),
      statusLabel: status.label,
      statusClassName: status.className,
      total: parseMoney(raw.total_amount || raw.total),
      shippingAddress: displayValue(raw.shipping_address),
      shippingFee: parseMoney(raw.shipping_fee),
      discountAmount: parseMoney(raw.discount_amount),
      paymentMethod: displayValue(raw.payment_method_name || raw.payment_method_id),
      items: items,
      source: "backend"
    };
  }

  // Lấy mã đơn hàng từ tham số URL ?id=
  function getOrderIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return normalizeOrderId(params.get("id"));
  }

  /* === Gọi API lấy chi tiết đơn hàng === */
  async function loadOrderFromBackend(orderId) {
    var token = localStorage.getItem("access_token");
    var role = TamTai.getRole();
    if (!token || role !== "user") {
      return null;
    }

    try {
      var response = await fetch(TamTai.API_BASE_URL + "/orders/" + encodeURIComponent(orderId), {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token
        }
      });
      if (!response.ok) {
        return null;
      }
      var payload = await response.json();
      return mapBackendOrder(payload || {});
    } catch (error) {
      return null;
    }
  }

  /* === Render các thẻ thông tin chung của đơn hàng (mã đơn, ngày, trạng thái, tổng tiền, địa chỉ, ...) === */
  function renderOverview(order) {
    if (!overviewEl) {
      return;
    }

    var cards = [
      { label: "Mã đơn", value: "#" + displayValue(order.id) },
      { label: "Ngày đặt", value: displayValue(order.date) },
      { label: "Trạng thái", value: '<span class="status ' + order.statusClassName + '">' + escapeHtml(order.statusLabel) + "</span>" },
      { label: "Tổng tiền", value: formatMoney(order.total) },
      { label: "Địa chỉ giao", value: escapeHtml(displayValue(order.shippingAddress)) },
      { label: "Phí vận chuyển", value: formatMoney(order.shippingFee) },
      { label: "Giảm giá", value: formatMoney(order.discountAmount) },
      { label: "Thanh toán", value: escapeHtml(displayValue(order.paymentMethod)) }
    ];

    overviewEl.innerHTML = cards.map(function (card) {
      return [
        '<article class="overview-card">',
        '  <p class="label">' + card.label + "</p>",
        '  <p class="value">' + card.value + "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  /* === Render danh sách sản phẩm trong đơn hàng === */
  function renderItems(items) {
    if (!itemsEl) {
      return;
    }

    if (!Array.isArray(items) || !items.length) {
      itemsEl.innerHTML = '<p class="empty-note">chưa có thông tin sản phẩm cho đơn hàng này</p>';
      return;
    }

    itemsEl.innerHTML = items.map(function (item) {
      var quantityText = item.quantity !== null ? String(item.quantity) : "chưa có";
      var unitPriceText = formatMoney(item.unitPrice);
      var totalText = formatMoney(item.total);

      return [
        '<article class="product-card">',
        '  <img class="product-image" src="' + escapeHtml(item.image) + '" alt="Sản phẩm">',
        '  <div class="product-info">',
        "    <h3>" + escapeHtml(item.name) + "</h3>",
        "    <p>" + escapeHtml(item.description) + "</p>",
        '    <div class="product-meta">',
        '      <span class="meta-chip">Số lượng: ' + escapeHtml(quantityText) + "</span>",
        '      <span class="meta-chip status ' + item.statusClass + '">Trạng thái: ' + escapeHtml(item.statusLabel) + "</span>",
        "    </div>",
        "  </div>",
        '  <div class="product-total">',
        '    <p class="line">Đơn giá</p>',
        '    <p class="value">' + escapeHtml(unitPriceText) + "</p>",
        '    <p class="line">Tạm tính</p>',
        '    <p class="value">' + escapeHtml(totalText) + "</p>",
        "  </div>",
        "</article>"
      ].join("");
    }).join("");
  }

  // Hiển thị thông báo khi không tìm thấy đơn hàng
  function renderNotFound(orderId) {
    if (overviewEl) {
      overviewEl.innerHTML = [
        '<article class="overview-card">',
        '  <p class="label">Mã đơn</p>',
        '  <p class="value">' + (orderId ? ("#" + escapeHtml(orderId)) : "chưa có") + "</p>",
        "</article>",
        '<article class="overview-card">',
        '  <p class="label">Trạng thái</p>',
        '  <p class="value">không tìm thấy đơn hàng</p>',
        "</article>"
      ].join("");
    }
    if (itemsEl) {
      itemsEl.innerHTML = '<p class="empty-note">chưa có thông tin sản phẩm</p>';
    }
  }

  /* === Khởi tạo trang chi tiết đơn hàng === */
  document.addEventListener("DOMContentLoaded", async function () {
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");
    TamTai.showAdminMenuLink(document);

    var orderId = getOrderIdFromUrl();        // Lấy mã đơn từ URL
    var isLoggedInUser = Boolean(localStorage.getItem("access_token")) && TamTai.getRole() === "user";
    if (!orderId) {
      renderNotFound("");    // Không có mã đơn -> thông báo lỗi
      return;
    }

    var order = null;
    // Chỉ gọi API nếu người dùng đã đăng nhập
    if (isLoggedInUser) {
      order = await loadOrderFromBackend(orderId);
    }
    if (!order) {
      renderNotFound(orderId);  // Không tìm thấy -> thông báo
      return;
    }

    renderOverview(order);      // Render thông tin chung
    renderItems(order.items);   // Render danh sách sản phẩm
  });
})();
