/* ===== Thư viện dùng chung cho Admin (TamTaiAdmin) ===== */
// Chứa các hàm tiện ích: xác thực, request API, sắp xếp, phân trang, modal, render...
(function (window) {
  // Số lượng item mỗi trang mặc định
  var PAGE_SIZE = 10;

  // Thoát HTML để tránh XSS khi chèn nội dung vào DOM
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Chuẩn hóa giá trị tìm kiếm (trim khoảng trắng)
  function normalizeSearchValue(value) {
    return String(value || "").trim();
  }

  // Định dạng tiền tệ (ủy quyền cho TamTai.formatCurrency)
  function formatMoney(value) {
    return TamTai.formatCurrency(Number(value || 0));
  }

  // Định dạng ngày tháng theo locale vi-VN, nếu lỗi trả về chuỗi gốc
  function formatDate(value) {
    if (!value) {
      return "-";
    }

    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("vi-VN");
  }

  // Định dạng ngày giờ thành chuỗi dùng cho input type="datetime-local" (YYYY-MM-DDTHH:mm)
  function formatDateTimeLocal(value) {
    if (!value) {
      return "";
    }

    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    var pad = function (part) {
      return String(part).padStart(2, "0");
    };

    return [
      date.getFullYear(),
      "-",
      pad(date.getMonth() + 1),
      "-",
      pad(date.getDate()),
      "T",
      pad(date.getHours()),
      ":",
      pad(date.getMinutes())
    ].join("");
  }

  /* ---- Xử lý đường dẫn ảnh sản phẩm ---- */
  // Nếu là URL tuyệt đối hoặc data URI thì dùng nguyên, nếu không thì build qua API
  function toImageSrc(imageUrl) {
    var raw = String(imageUrl || "").trim();
    if (!raw) {
      return TamTai.DEFAULT_PRODUCT_IMAGE;
    }

    if (/^https?:\/\//i.test(raw) || raw.indexOf("data:") === 0) {
      return raw;
    }

    return TamTai.buildApiUrl(raw.indexOf("/") === 0 ? raw : "/" + raw);
  }

  // Chuyển đổi giá trị ngày thành timestamp (ms), nếu lỗi trả về 0
  function parseDateValue(value) {
    if (!value) {
      return 0;
    }

    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  /* ---- Chuyển hướng đến trang đăng nhập ---- */
  // Đưa người dùng về trang login với query redirect=admin
  function redirectToLogin() {
    window.location.href = "../auth/login.html?redirect=admin";
  }

  /* ---- Tạo headers xác thực cho request ---- */
  // Lấy access_token từ localStorage và thêm vào Authorization header
  function getAuthHeaders(extraHeaders) {
    var token = localStorage.getItem("access_token");
    return Object.assign({ Authorization: "Bearer " + token }, extraHeaders || {});
  }

  /* ---- Hiển thị thông báo trên giao diện ---- */
  // type: "info", "success", "error". Nếu message rỗng thì ẩn thông báo
  function showMessage(node, message, type) {
    if (!node) {
      return;
    }

    if (!message) {
      node.textContent = "";
      node.className = "page-message";
      return;
    }

    node.textContent = message;
    node.className = "page-message is-visible is-" + (type || "info");
  }

  /* ---- Hàm request API tổng quát ---- */
  // Tự động thêm Authorization header, xử lý lỗi 401/403 (logout + redirect)
  // Parse response JSON, throw Error nếu request thất bại
  async function request(path, options) {
    var response = await fetch(TamTai.API_BASE_URL + path, Object.assign({}, options || {}, {
      headers: getAuthHeaders((options && options.headers) || {})
    }));

    if (response.status === 401 || response.status === 403) {
      TamTai.clearSession();
      redirectToLogin();
      throw new Error("Phiên đăng nhập admin đã hết hạn.");
    }

    var raw = await response.text();
    var data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (error) {
        data = raw;
      }
    }

    if (!response.ok) {
      throw new Error((data && data.detail) || (data && data.error && data.error.message) || "Yêu cầu thất bại.");
    }

    return data;
  }

  /* ---- Kiểm tra quyền truy cập Admin ---- */
  // Gọi /admin/me để xác thực, nếu không hợp lệ thì redirect về login
  async function verifyAccess(messageNode) {
    if (TamTai.getRole() !== "admin" || !localStorage.getItem("access_token")) {
      redirectToLogin();
      return false;
    }

    try {
      await request("/admin/me");
      return true;
    } catch (error) {
      showMessage(messageNode, error.message || "Không thể xác minh quyền admin.", "error");
      return false;
    }
  }

  /* ---- Hàm gọi API lấy dữ liệu ---- */
  // GET /categories, /admin/dashboard, /admin/products, /admin/orders, /admin/customers, /admin/discount-codes
  async function fetchCategories() {
    var response = await fetch(TamTai.API_BASE_URL + "/categories?skip=0&limit=100");
    var raw = await response.text();
    var data = [];
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (error) {
        data = [];
      }
    }
    return Array.isArray(data) ? data : [];
  }

  // Lấy dữ liệu dashboard thống kê
  function fetchDashboard() {
    return request("/admin/dashboard");
  }

  // Lấy danh sách sản phẩm, hỗ trợ tìm kiếm và lọc theo danh mục
  function fetchProducts(keyword, categoryId) {
    return request("/admin/products?skip=0&limit=300&keyword=" + encodeURIComponent(keyword || "") + "&category_id=" + encodeURIComponent(categoryId || ""));
  }

  // Lấy danh sách đơn hàng, hỗ trợ tìm kiếm
  function fetchOrders(keyword) {
    return request("/admin/orders?skip=0&limit=300&keyword=" + encodeURIComponent(keyword || ""));
  }

  // Lấy danh sách khách hàng, hỗ trợ tìm kiếm
  function fetchCustomers(keyword) {
    return request("/admin/customers?skip=0&limit=300&keyword=" + encodeURIComponent(keyword || ""));
  }

  // Lấy danh sách mã giảm giá, hỗ trợ tìm kiếm
  function fetchDiscountCodes(keyword) {
    return request("/admin/discount-codes?skip=0&limit=300&keyword=" + encodeURIComponent(keyword || ""));
  }

  /* ---- Render thống kê dashboard ---- */
  // Cập nhật các ô stat (sản phẩm, khách hàng, đơn hàng, doanh thu, mã giảm giá)
  function renderStats(stats) {
    if (!stats) {
      return;
    }

    var map = {
      statProducts: stats.total_products || 0,
      statCustomers: stats.total_customers || 0,
      statOrders: stats.total_orders || 0,
      statRevenue: formatMoney(stats.total_revenue || 0),
      statDiscountCodes: stats.active_discount_codes || 0
    };

    Object.keys(map).forEach(function (id) {
      var node = document.getElementById(id);
      if (node) {
        node.textContent = map[id];
      }
    });
  }

  /* ---- Điền dữ liệu vào dropdown ---- */
  // Tạo các option từ mảng items, valueSelector/labelSelector là hàm hoặc tên thuộc tính
  function populateSelect(selectNode, placeholder, items, valueSelector, labelSelector) {
    if (!selectNode) {
      return;
    }

    var currentValue = selectNode.value;
    var options = [placeholder ? '<option value="">' + escapeHtml(placeholder) + "</option>" : ""];

    (items || []).forEach(function (item) {
      var value = typeof valueSelector === "function" ? valueSelector(item) : item[valueSelector];
      var label = typeof labelSelector === "function" ? labelSelector(item) : item[labelSelector];
      options.push('<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + "</option>");
    });

    selectNode.innerHTML = options.join("");
    selectNode.value = currentValue || "";
  }

  // Tạo hàng trống trong bảng với thông báo tùy chỉnh
  function renderEmptyRow(colspan, message) {
    return '<tr><td colspan="' + colspan + '"><div class="empty-state">' + escapeHtml(message) + "</div></td></tr>";
  }

  /* ---- Hàm hỗ trợ sắp xếp ---- */
  // Trả về hướng sắp xếp mặc định (desc cho các trường số/ngày, asc cho text)
  function getInitialSortDirection(key) {
    return [
      "created_at",
      "customer_id",
      "discount_percent",
      "order_date",
      "order_id",
      "orders_count",
      "product_id",
      "sold_quantity",
      "stock_quantity",
      "total_amount",
      "total_spent",
      "unit_price",
      "usage_limit"
    ].indexOf(key) !== -1 ? "desc" : "asc";
  }

  // Lấy giá trị của một trường để so sánh, xử lý riêng theo từng view (orders, products, customers, discounts)
  function getSortValue(viewName, item, key) {
    if (!item) {
      return "";
    }

    if (viewName === "dashboardOrders" || viewName === "orders") {
      if (key === "order_id") {
        return Number(item.order_id || 0);
      }
      if (key === "customer_name") {
        return String(item.customer_name || item.customer_email || "").toLowerCase();
      }
      if (key === "status") {
        return String(item.status || "").toLowerCase();
      }
      if (key === "total_amount") {
        return Number(item.total_amount || 0);
      }
      if (key === "order_date") {
        return parseDateValue(item.order_date);
      }
    }

    if (viewName === "dashboardTopProducts" || viewName === "products" || viewName === "dashboardLowStock") {
      if (key === "product_id") {
        return String(item.product_id || "").toLowerCase();
      }
      if (key === "product_name") {
        return String(item.product_name || "").toLowerCase();
      }
      if (key === "category_name") {
        return String(item.category_name || item.category_id || "").toLowerCase();
      }
      if (key === "unit_price" || key === "stock_quantity" || key === "sold_quantity") {
        return Number(item[key] || 0);
      }
    }

    if (viewName === "customers") {
      if (key === "customer_id") {
        return Number(item.customer_id || 0);
      }
      if (key === "customer_name") {
        return String(item.customer_name || "").toLowerCase();
      }
      if (key === "customer_email") {
        return String(item.customer_email || "").toLowerCase();
      }
      if (key === "orders_count" || key === "total_spent") {
        return Number(item[key] || 0);
      }
      if (key === "created_at" || key === "updated_at" || key === "last_order_date") {
        return parseDateValue(item[key]);
      }
      if (key === "is_active") {
        return item.is_active ? 1 : 0;
      }
    }

    if (viewName === "discounts") {
      if (key === "discount_percent" || key === "usage_limit") {
        return Number(item[key] || 0);
      }
      if (key === "is_active") {
        return item.is_active ? 1 : 0;
      }
      if (key === "created_at" || key === "starts_at" || key === "expires_at") {
        return parseDateValue(item[key]);
      }
      if (key === "customer_name") {
        return String(item.customer_name || item.customer_email || "").toLowerCase();
      }
      if (key === "product_name") {
        return String(item.product_name || "").toLowerCase();
      }
    }

    var rawValue = item[key];
    return typeof rawValue === "string" ? rawValue.toLowerCase() : rawValue;
  }

  // So sánh hai giá trị theo hướng (asc/desc), hỗ trợ string và number
  function compareValues(left, right, direction) {
    var dir = direction === "desc" ? -1 : 1;

    if (typeof left === "string" || typeof right === "string") {
      return String(left || "").localeCompare(String(right || ""), "vi", {
        numeric: true,
        sensitivity: "base"
      }) * dir;
    }

    var leftValue = left === null || left === undefined ? Number.NEGATIVE_INFINITY : left;
    var rightValue = right === null || right === undefined ? Number.NEGATIVE_INFINITY : right;

    if (leftValue === rightValue) {
      return 0;
    }

    return leftValue > rightValue ? dir : -dir;
  }

  /* ---- Sắp xếp danh sách ---- */
  // Clone mảng, nếu có sortState.key thì sort theo getSortValue + compareValues
  function sortItems(items, viewName, sortState) {
    var list = Array.isArray(items) ? items.slice() : [];
    if (!sortState || !sortState.key) {
      return list;
    }

    return list.sort(function (left, right) {
      return compareValues(
        getSortValue(viewName, left, sortState.key),
        getSortValue(viewName, right, sortState.key),
        sortState.direction
      );
    });
  }

  /* ---- Phân trang ---- */
  // Cắt mảng theo PAGE_SIZE, trả về { items, totalItems, totalPages, currentPage, start, end }
  function paginateItems(items, currentPage) {
    var list = Array.isArray(items) ? items : [];
    var totalItems = list.length;
    var totalPages = totalItems ? Math.ceil(totalItems / PAGE_SIZE) : 0;
    var page = totalPages ? Math.min(Math.max(currentPage || 1, 1), totalPages) : 1;
    var startIndex = totalItems ? (page - 1) * PAGE_SIZE : 0;
    var pageItems = list.slice(startIndex, startIndex + PAGE_SIZE);

    return {
      items: pageItems,
      totalItems: totalItems,
      totalPages: totalPages,
      currentPage: page,
      start: totalItems ? startIndex + 1 : 0,
      end: startIndex + pageItems.length
    };
  }

  /* ---- Render thanh phân trang ---- */
  // Tạo các nút trang (‹, số trang, ›), gắn data-page-view và data-page-target
  function renderPagination(containerNode, summaryNode, pageData, viewName) {
    if (summaryNode) {
      summaryNode.textContent = pageData.totalItems
        ? ("Hiển thị " + pageData.start + "-" + pageData.end + " / " + pageData.totalItems)
        : "Không có dữ liệu để hiển thị.";
    }

    if (!containerNode) {
      return;
    }

    if (pageData.totalPages <= 1) {
      containerNode.innerHTML = "";
      return;
    }

    var buttons = [
      '<button type="button" class="page-btn" data-page-view="' + escapeHtml(viewName) + '" data-page-target="' + escapeHtml(Math.max(1, pageData.currentPage - 1)) + '"' + (pageData.currentPage === 1 ? " disabled" : "") + ">‹</button>"
    ];

    var startPage = Math.max(1, pageData.currentPage - 2);
    var endPage = Math.min(pageData.totalPages, startPage + 4);
    startPage = Math.max(1, endPage - 4);

    for (var page = startPage; page <= endPage; page += 1) {
      buttons.push(
        '<button type="button" class="page-btn' + (page === pageData.currentPage ? " is-active" : "") + '" data-page-view="' + escapeHtml(viewName) + '" data-page-target="' + escapeHtml(page) + '">' + escapeHtml(page) + "</button>"
      );
    }

    buttons.push(
      '<button type="button" class="page-btn" data-page-view="' + escapeHtml(viewName) + '" data-page-target="' + escapeHtml(Math.min(pageData.totalPages, pageData.currentPage + 1)) + '"' + (pageData.currentPage === pageData.totalPages ? " disabled" : "") + ">›</button>"
    );

    containerNode.innerHTML = buttons.join("");
  }

  /* ---- Modal form helper ---- */
  // Di chuyển form vào modal để thêm/sửa, khi đóng modal thì trả form về vị trí cũ
  var _modalState = { hostMap: new Map() };

  // Mở modal form: di chuyển form vào modal body, đặt tiêu đề
  function openFormModal(formSelector, title) {
    var formNode = document.querySelector(formSelector);
    var modal = document.getElementById("entityFormModal");
    if (!formNode || !modal) return;

    var modalBody = modal.querySelector(".modal-body");
    var modalTitle = modal.querySelector("#entityFormModalTitle");

    // Save original parent for restore
    if (!_modalState.hostMap.has(formNode)) {
      _modalState.hostMap.set(formNode, { parent: formNode.parentNode, next: formNode.nextSibling });
    }

    // Move form into modal
    modalBody.appendChild(formNode);
    if (modalTitle && title) modalTitle.textContent = title;

    modal.removeAttribute("hidden");
    document.documentElement.classList.add("modal-open");
  }

  // Đóng modal: trả form về vị trí gốc, xóa hidden attribute khỏi modal
  function closeFormModal() {
    var modal = document.getElementById("entityFormModal");
    if (!modal) return;

    // Move any saved forms back to original places
    _modalState.hostMap.forEach(function (info, formNode) {
      try {
        if (info.next) {
          info.parent.insertBefore(formNode, info.next);
        } else {
          info.parent.appendChild(formNode);
        }
      } catch (e) {
        // ignore
      }
    });
    _modalState.hostMap.clear();

    modal.setAttribute("hidden", "true");
    document.documentElement.classList.remove("modal-open");
  }

  // Global delegation for opening/closing form modal
  document.addEventListener("click", function (e) {
    var target = e.target;

    // Mở modal khi click nút có data-open-form (attribute chứa selector của form)
    var openBtn = target.closest && target.closest('[data-open-form]');
    if (openBtn) {
      var selector = openBtn.getAttribute('data-open-form');
      var title = openBtn.getAttribute('data-form-title') || "";
      openFormModal(selector, title);
      return;
    }

    // Mở modal khi click nút chỉnh sửa (.icon-btn.is-edit) - tự động tìm form tương ứng
    var editBtn = target.closest && target.closest('.icon-btn.is-edit');
    if (editBtn) {
      // Try to open corresponding form if exists (#productForm, #discountForm, #customerForm)
      if (document.getElementById('productForm')) openFormModal('#productForm', 'Cập nhật sản phẩm');
      else if (document.getElementById('discountForm')) openFormModal('#discountForm', 'Cập nhật mã giảm giá');
      else if (document.getElementById('customerForm')) openFormModal('#customerForm', 'Cập nhật người dùng');
      return;
    }

    // Đóng modal khi click nút đóng hoặc click ra ngoài (backdrop)
    if (target.closest && (target.matches('[data-close-modal]') || target.closest('[data-close-modal]'))) {
      closeFormModal();
      return;
    }
  });

  // Export modal helpers cho các module khác dùng
  window.TamTai = window.TamTai || {};
  window.TamTai.openFormModal = openFormModal;
  window.TamTai.closeFormModal = closeFormModal;

  /* ---- Render trạng thái nút sắp xếp ---- */
  // Duyệt các .sort-btn và cập nhật class active + icon (fa-sort-up/fa-sort-down/fa-sort)
  function renderSortButtons(root, sorting) {
    var scope = root || document;
    scope.querySelectorAll(".sort-btn").forEach(function (button) {
      var viewName = button.getAttribute("data-sort-view");
      var key = button.getAttribute("data-sort-key");
      var icon = button.querySelector("i");
      var current = sorting[viewName];
      var isActive = Boolean(current && current.key === key);

      button.classList.toggle("is-active", isActive);
      if (icon) {
        icon.className = "fa-solid " + (isActive
          ? (current.direction === "asc" ? "fa-sort-up" : "fa-sort-down")
          : "fa-sort");
      }
    });
  }

  // Đánh dấu navigation item đang active dựa trên data-admin-nav
  function activateNav(navKey) {
    document.querySelectorAll("[data-admin-nav]").forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("data-admin-nav") === navKey);
    });
  }

  /* ---- Gán sự kiện cho UI ---- */
  // Event delegation cho nút sắp xếp, gọi callback onSort với { viewName, key }
  function bindSortButtons(root, onSort) {
    root.addEventListener("click", function (event) {
      var button = event.target.closest(".sort-btn");
      if (!button) {
        return;
      }

      onSort({
        viewName: button.getAttribute("data-sort-view"),
        key: button.getAttribute("data-sort-key")
      });
    });
  }

  // Event delegation cho nút phân trang, gọi callback onPaginate với { viewName, page }
  function bindPagination(root, onPaginate) {
    root.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-page-view]");
      if (!button || button.disabled) {
        return;
      }

      onPaginate({
        viewName: button.getAttribute("data-page-view"),
        page: Number(button.getAttribute("data-page-target") || 1)
      });
    });
  }

  // Gán sự kiện input cho ô tìm kiếm, gọi callback onChange với giá trị đã chuẩn hóa
  function bindTopSearch(inputNode, onChange) {
    if (!inputNode) {
      return;
    }

    inputNode.addEventListener("input", function () {
      onChange(normalizeSearchValue(inputNode.value));
    });
  }

  /* ---- Khởi tạo shell Admin ---- */
  // Thiết lập logout button, active nav, placeholder cho ô tìm kiếm
  // Trả về { pageSearchInput, messageNode }
  function initShell(config) {
    TamTai.bindLogoutButtons(document);
    activateNav(config.navKey);

    var pageSearchInput = document.getElementById("adminGlobalSearch");
    if (pageSearchInput && config.searchPlaceholder) {
      pageSearchInput.placeholder = config.searchPlaceholder;
    }

    return {
      pageSearchInput: pageSearchInput,
      messageNode: document.getElementById("pageMessage")
    };
  }

  window.TamTaiAdmin = {
    PAGE_SIZE: PAGE_SIZE,
    escapeHtml: escapeHtml,
    normalizeSearchValue: normalizeSearchValue,
    formatMoney: formatMoney,
    formatDate: formatDate,
    formatDateTimeLocal: formatDateTimeLocal,
    toImageSrc: toImageSrc,
    redirectToLogin: redirectToLogin,
    request: request,
    verifyAccess: verifyAccess,
    fetchCategories: fetchCategories,
    fetchDashboard: fetchDashboard,
    fetchProducts: fetchProducts,
    fetchOrders: fetchOrders,
    fetchCustomers: fetchCustomers,
    fetchDiscountCodes: fetchDiscountCodes,
    showMessage: showMessage,
    renderStats: renderStats,
    populateSelect: populateSelect,
    renderEmptyRow: renderEmptyRow,
    getInitialSortDirection: getInitialSortDirection,
    sortItems: sortItems,
    paginateItems: paginateItems,
    renderPagination: renderPagination,
    renderSortButtons: renderSortButtons,
    activateNav: activateNav,
    bindSortButtons: bindSortButtons,
    bindPagination: bindPagination,
    bindTopSearch: bindTopSearch,
    initShell: initShell
  };
})(window);
