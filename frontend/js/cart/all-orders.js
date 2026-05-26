(function () {
  // ====== Dữ liệu đơn hàng mặc định (fallback) và cấu hình ======
  var ordersData = window.TamTaiOrdersData || {
    orders: [],
    statusMeta: {
      pending: { label: "Chờ xác nhận", className: "pending" },
      shipping: { label: "Đang giao", className: "shipping" },
      delivered: { label: "Đã giao", className: "delivered" },
      cancelled: { label: "Đã hủy", className: "cancelled" }
    },
    defaultPageSize: 10,
    formatCurrency: function (value) {
      return Number(value || 0).toLocaleString("vi-VN") + "đ";
    }
  };

  // Các tham chiếu DOM
  var filtersWrap = document.getElementById("ordersFilters");
  var filterButtons = filtersWrap ? filtersWrap.querySelectorAll("button[data-status]") : [];
  var searchInput = document.getElementById("orderSearch");
  var ordersBody = document.getElementById("ordersBody");
  var paginationWrap = document.getElementById("pagination");
  var summaryEl = document.getElementById("ordersSummary");

  // State: bộ lọc trạng thái, từ khóa tìm kiếm, trang hiện tại
  var state = {
    status: "all",
    searchKeyword: "",
    page: 1
  };

  // Chuẩn hóa mã đơn (bỏ #, in hoa)
  function normalizeOrderId(orderId) {
    return String(orderId || "")
      .replace("#", "")
      .trim()
      .toUpperCase();
  }

  // Chuyển đổi giá trị tiền tệ về số
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

  // Chuẩn hóa chuỗi trạng thái (bỏ dấu, lowercase) để so khớp
  function normalizeStatusText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  }

  // Định dạng ngày tháng thành dd/MM/yyyy
  function formatDate(dateValue) {
    if (!dateValue) {
      return "Chưa có";
    }

    var date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return "Chưa có";
    }

    var dd = String(date.getDate()).padStart(2, "0");
    var mm = String(date.getMonth() + 1).padStart(2, "0");
    var yyyy = date.getFullYear();
    return dd + "/" + mm + "/" + yyyy;
  }

  // Map trạng thái từ API sang cấu trúc hiển thị (key, label, className)
  function mapStatus(rawStatus) {
    var normalized = normalizeStatusText(rawStatus);
    if (!normalized) {
      return { key: "pending", label: "Chưa có", className: "pending" };
    }
    if (normalized.indexOf("deliver") !== -1 || normalized.indexOf("da giao") !== -1) {
      return { key: "delivered", label: "Đã giao", className: "delivered" };
    }
    if (normalized.indexOf("ship") !== -1 || normalized.indexOf("giao") !== -1) {
      return { key: "shipping", label: "Đang giao", className: "shipping" };
    }
    if (normalized.indexOf("cancel") !== -1 || normalized.indexOf("huy") !== -1) {
      return { key: "cancelled", label: "Đã hủy", className: "cancelled" };
    }
    if (normalized.indexOf("pend") !== -1 || normalized.indexOf("wait") !== -1 || normalized.indexOf("cho") !== -1) {
      return { key: "pending", label: "Chờ xác nhận", className: "pending" };
    }
    return { key: "pending", label: rawStatus, className: "pending" };
  }

  // Map đơn hàng từ API sang cấu trúc frontend
  function toFrontendOrder(raw) {
    var status = mapStatus(raw.status);
    var items = Array.isArray(raw.items)
      ? raw.items
      : (Array.isArray(raw.order_items) ? raw.order_items : []);

    var itemCount = items.reduce(function (sum, item) {
      return sum + Math.max(0, Number(item.quantity || 0));
    }, 0);

    var total = parseMoney(raw.total_amount);
    if (total === null) {
      total = parseMoney(raw.total);
    }

    if (total === null && items.length) {
      total = items.reduce(function (sum, item) {
        var amount = parseMoney(item.amount);
        if (amount === null) {
          var qty = Math.max(0, Number(item.quantity || 0));
          var unit = parseMoney(item.price_at_purchase);
          if (unit === null) {
            unit = parseMoney(item.unit_price || item.unitPrice);
          }
          amount = unit !== null ? unit * qty : 0;
        }
        return sum + amount;
      }, 0);
    }

    return {
      id: raw.order_id,
      date: formatDate(raw.order_date),
      itemCount: itemCount,
      total: total,
      status: status.key,
      statusLabel: status.label,
      statusClassName: status.className
    };
  }

  /* === Gọi API lấy danh sách đơn hàng của người dùng === */
  async function loadOrdersFromBackend() {
    var token = localStorage.getItem("access_token");
    var role = TamTai.getRole();
    if (!token || role !== "user") {
      ordersData.orders = [];
      return false;
    }

    try {
      var response = await fetch(TamTai.API_BASE_URL + "/orders?skip=0&limit=100", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token
        }
      });

      if (!response.ok) {
        ordersData.orders = [];
        return false;
      }

      var payload = await response.json();
      var rows = Array.isArray(payload) ? payload : [];
      ordersData.orders = rows.map(toFrontendOrder);
      return true;
    } catch (error) {
      ordersData.orders = [];
      return false;
    }
  }

  // Lọc đơn hàng theo trạng thái và từ khóa tìm kiếm
  function filterOrders() {
    return ordersData.orders.filter(function (order) {
      var byStatus = state.status === "all" || order.status === state.status;
      var normalizedId = normalizeOrderId(order.id);
      var byKeyword = !state.searchKeyword || normalizedId.indexOf(state.searchKeyword) !== -1;
      return byStatus && byKeyword;
    });
  }

  // Tạo HTML cho một dòng đơn hàng trong bảng
  function createOrderRow(order) {
    var status = order.statusLabel
      ? { label: order.statusLabel, className: order.statusClassName }
      : (ordersData.statusMeta[order.status] || { label: "Chưa có", className: "pending" });

    var hasItemCount = Number.isFinite(order.itemCount);
    var itemText = hasItemCount ? (order.itemCount + " sản phẩm") : "Chưa có";
    var totalText = typeof order.total === "number" && Number.isFinite(order.total)
      ? ordersData.formatCurrency(order.total)
      : "Chưa có";

    var repayLabel = order.status === "pending" ? "Thanh toán tiếp" : "Mua lại";
    var repayLink = order.status === "pending" ? "checkout.html" : "cart.html";

    return [
      '<div class="order-row">',
      "  <span>#" + normalizeOrderId(order.id) + "</span>",
      "  <span>" + order.date + "</span>",
      "  <span>" + itemText + "</span>",
      "  <span>" + totalText + "</span>",
      '  <span class="status ' + status.className + '">' + status.label + "</span>",
      '  <span class="actions">',
      '    <a href="order-detail.html?id=' + encodeURIComponent(normalizeOrderId(order.id)) + '">Chi tiết</a>',
      '    <a href="' + repayLink + '">' + repayLabel + "</a>",
      "  </span>",
      "</div>"
    ].join("");
  }

  /* === Render phân trang === */
  function renderPagination(totalItems, pageSize) {
    var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (state.page > totalPages) {
      state.page = totalPages;
    }

    var html = "";
    html += '<button data-page="' + (state.page - 1) + '"' + (state.page === 1 ? " disabled" : "") + ">Trước</button>";
    for (var i = 1; i <= totalPages; i += 1) {
      html += '<button data-page="' + i + '"' + (state.page === i ? ' class="active"' : "") + ">" + i + "</button>";
    }
    html += '<button data-page="' + (state.page + 1) + '"' + (state.page === totalPages ? " disabled" : "") + ">Sau</button>";
    paginationWrap.innerHTML = html;
  }

  // Hiển thị dòng "Hiển thị x - y / z đơn hàng"
  function renderSummary(totalItems, pageSize) {
    if (!summaryEl) {
      return;
    }

    if (totalItems === 0) {
      summaryEl.textContent = "Hiển thị 0 - 0 / 0 đơn hàng";
      return;
    }

    var start = (state.page - 1) * pageSize + 1;
    var end = Math.min(state.page * pageSize, totalItems);
    summaryEl.textContent = "Hiển thị " + start + " - " + end + " / " + totalItems + " đơn hàng";
  }

  /* === Render chính: lọc -> phân trang -> tạo hàng và cập nhật giao diện === */
  function renderOrders() {
    var pageSize = ordersData.defaultPageSize || 10;
    var filteredOrders = filterOrders();
    var totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
    if (state.page > totalPages) {
      state.page = totalPages;
    }

    var startIndex = (state.page - 1) * pageSize;
    var pagedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

    if (!pagedOrders.length) {
      ordersBody.innerHTML = '<div class="order-row order-empty">Chưa có đơn hàng</div>';
    } else {
      ordersBody.innerHTML = pagedOrders.map(createOrderRow).join("");
    }

    renderSummary(filteredOrders.length, pageSize);
    renderPagination(filteredOrders.length, pageSize);
  }

  // Đồng bộ class active trên các nút lọc trạng thái
  function setActiveFilter() {
    filterButtons.forEach(function (button) {
      var isActive = button.getAttribute("data-status") === state.status;
      button.classList.toggle("active", isActive);
    });
  }

  /* === Gán sự kiện: lọc trạng thái, tìm kiếm, phân trang === */
  function bindEvents() {
    if (filtersWrap) {
      filtersWrap.addEventListener("click", function (event) {
        var target = event.target.closest("button[data-status]");
        if (!target) {
          return;
        }
        state.status = target.getAttribute("data-status");
        state.page = 1;
        setActiveFilter();
        renderOrders();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.searchKeyword = normalizeOrderId(searchInput.value);
        state.page = 1;
        renderOrders();
      });
    }

    if (paginationWrap) {
      paginationWrap.addEventListener("click", function (event) {
        var target = event.target.closest("button[data-page]");
        if (!target || target.disabled) {
          return;
        }
        state.page = Number(target.getAttribute("data-page")) || 1;
        renderOrders();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  /* === Khởi tạo trang danh sách đơn hàng === */
  document.addEventListener("DOMContentLoaded", async function () {
    await loadOrdersFromBackend();  // Tải dữ liệu từ API
    bindEvents();
    setActiveFilter();
    renderOrders();
  });
})();
