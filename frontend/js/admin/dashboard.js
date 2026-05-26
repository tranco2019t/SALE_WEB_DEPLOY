/* ===== Trang Dashboard Admin ===== */
(function () {
  var Admin = window.TamTaiAdmin;
  // Biến trạng thái: dữ liệu dashboard, từ khóa tìm kiếm, sắp xếp, phân trang
  var state = {
    dashboard: null,
    keyword: "",
    sorting: {
      dashboardOrders: { key: "order_date", direction: "desc" },
      dashboardTopProducts: { key: "unit_price", direction: "desc" }
    },
    pagination: {
      dashboardTopProducts: 1
    }
  };

  /* ---- Ánh xạ trạng thái đơn hàng ---- */
  // Chuyển status từ API thành nhãn tiếng Việt và class CSS
  function getStatusMeta(status) {
    var normalized = String(status || "").trim().toLowerCase();
    if (normalized.indexOf("deliver") !== -1 || normalized.indexOf("done") !== -1) {
      return { label: "Đã giao", className: "is-success" };
    }
    if (normalized.indexOf("ship") !== -1) {
      return { label: "Đang giao", className: "is-warning" };
    }
    if (normalized.indexOf("cancel") !== -1) {
      return { label: "Đã hủy", className: "is-danger" };
    }
    if (normalized.indexOf("confirm") !== -1) {
      return { label: "Đã xác nhận", className: "is-warning" };
    }
    if (normalized.indexOf("pend") !== -1) {
      return { label: "Chờ xử lý", className: "is-neutral" };
    }
    return { label: status || "Không rõ", className: "is-neutral" };
  }

  // Kiểm tra xem item có khớp với từ khóa tìm kiếm ở một trong các field không
  function matchesKeyword(item, fields) {
    if (!state.keyword) {
      return true;
    }

    return fields.some(function (field) {
      return String(item[field] || "").toLowerCase().indexOf(state.keyword.toLowerCase()) !== -1;
    });
  }

  /* ---- Render bảng đơn hàng gần đây ---- */
  // Lọc theo keyword, sắp xếp, hiển thị trong #dashboardOrdersTable
  function renderRecentOrders() {
    var body = document.getElementById("dashboardOrdersTable");
    if (!body) {
      return;
    }

    var orders = ((state.dashboard && state.dashboard.recent_orders) || []).filter(function (order) {
      return matchesKeyword(order, ["order_id", "customer_name", "customer_email", "status"]);
    });

    orders = Admin.sortItems(orders, "dashboardOrders", state.sorting.dashboardOrders);

    body.innerHTML = orders.length ? orders.map(function (order) {
      var status = getStatusMeta(order.status);
      return [
        "<tr>",
        "  <td>" + Admin.escapeHtml(order.order_id) + "</td>",
        "  <td><span class=\"entity-primary\">" + Admin.escapeHtml(order.customer_name || order.customer_email || "-") + "</span></td>",
        "  <td><span class=\"status-chip " + status.className + "\">" + Admin.escapeHtml(status.label) + "</span></td>",
        "  <td class=\"money-text\">" + Admin.escapeHtml(Admin.formatMoney(order.total_amount || 0)) + "</td>",
        "  <td>" + Admin.escapeHtml(Admin.formatDate(order.order_date)) + "</td>",
        "</tr>"
      ].join("");
    }).join("") : Admin.renderEmptyRow(5, "Không có đơn hàng phù hợp.");
  }

  /* ---- Render danh sách dạng mini card ---- */
  // Dùng cho top sản phẩm và sản phẩm sắp hết hàng
  // Hỗ trợ sắp xếp và phân trang nếu có viewName
  function renderMiniList(targetId, items, emptyText, viewName, clickHrefBuilder) {
    var node = document.getElementById(targetId);
    if (!node) {
      return;
    }

    var filtered = items.filter(function (item) {
      return matchesKeyword(item, ["product_id", "product_name", "category_name"]);
    });

    if (viewName) {
      filtered = Admin.sortItems(filtered, viewName, state.sorting[viewName]);
    }

    var pageData = viewName ? Admin.paginateItems(filtered, state.pagination[viewName]) : null;
    var visibleItems = pageData ? pageData.items : filtered;

    if (viewName) {
      Admin.renderPagination(
        document.getElementById(viewName + "Pagination"),
        document.getElementById(viewName + "PageSummary"),
        pageData,
        viewName
      );
    }

    if (!visibleItems.length) {
      node.innerHTML = "<div class=\"empty-state\">" + Admin.escapeHtml(emptyText) + "</div>";
      return;
    }

    node.innerHTML = visibleItems.map(function (item) {
      var secondary = (item.category_name ? ("Danh mục: " + item.category_name + " | ") : "")
        + "Tồn: " + (item.stock_quantity || 0)
        + " | Đã bán: " + (item.sold_quantity || 0);
      var inner = [
        "<div class=\"mini-card-head\">",
        "  <div>",
        "    <strong class=\"mini-card-title\">" + Admin.escapeHtml(item.product_name || "-") + "</strong>",
        "    <span class=\"mini-card-subtext\">" + Admin.escapeHtml(secondary) + "</span>",
        "  </div>",
        "  <div class=\"money-text\">" + Admin.escapeHtml(Admin.formatMoney(item.unit_price || 0)) + "</div>",
        "</div>"
      ].join("");

      if (!clickHrefBuilder) {
        return "<article class=\"mini-card\">" + inner + "</article>";
      }

      return [
        "<article class=\"mini-card\">",
        "  <a class=\"mini-card-link\" href=\"" + Admin.escapeHtml(clickHrefBuilder(item)) + "\">",
        inner,
        "  </a>",
        "</article>"
      ].join("");
    }).join("");
  }

  /* ---- Render toàn bộ dashboard ---- */
  // Gọi renderStats, renderRecentOrders, renderMiniList cho top sản phẩm và low stock
  function renderDashboard() {
    Admin.renderStats(state.dashboard && state.dashboard.stats);
    renderRecentOrders();
    renderMiniList(
      "dashboardTopProducts",
      (state.dashboard && state.dashboard.top_products) || [],
      "Chưa có sản phẩm nổi bật.",
      "dashboardTopProducts",
      function (item) {
        return "./products.html?edit=" + encodeURIComponent(item.product_id);
      }
    );
    renderMiniList(
      "dashboardLowStock",
      (state.dashboard && state.dashboard.low_stock_products) || [],
      "Không có sản phẩm sắp hết hàng."
    );
    renderSortControls();
  }

  // Cập nhật giao diện điều khiển sắp xếp (field chọn, nút tăng/giảm)
  function renderSortControls() {
    var field = document.getElementById("dashboardSortField");
    var ascBtn = document.getElementById("dashboardSortAsc");
    var descBtn = document.getElementById("dashboardSortDesc");
    var s = state.sorting.dashboardTopProducts;
    if (field) field.value = s && s.key ? s.key : "product_name";
    if (ascBtn) ascBtn.classList.toggle("is-active", s && s.direction === "asc");
    if (descBtn) descBtn.classList.toggle("is-active", s && s.direction === "desc");
  }

  /* ---- Làm mới dữ liệu dashboard ---- */
  // Gọi API dashboard, reset phân trang, render lại toàn bộ
  async function refreshData(messageNode) {
    Admin.showMessage(messageNode, "Đang tải dữ liệu tổng quan...", "info");
    state.dashboard = await Admin.fetchDashboard();
    state.pagination.dashboardTopProducts = 1;
    renderDashboard();
    Admin.showMessage(messageNode, "Đã làm mới dữ liệu tổng quan.", "success");
  }

  /* ---- Khởi tạo trang ---- */
  // Xác thực admin, thiết lập tìm kiếm, sắp xếp, phân trang, refresh data
  document.addEventListener("DOMContentLoaded", async function () {
    var shell = Admin.initShell({
      navKey: "dashboard",
      searchPlaceholder: "Tìm trong mục tổng quan..."
    });

    var canAccess = await Admin.verifyAccess(shell.messageNode);
    if (!canAccess) {
      return;
    }

    Admin.bindTopSearch(shell.pageSearchInput, function (value) {
      state.keyword = value;
      renderDashboard();
    });

    Admin.bindSortButtons(document, function (payload) {
      var current = state.sorting[payload.viewName] || { key: "", direction: "asc" };
      state.sorting[payload.viewName] = {
        key: payload.key,
        direction: current.key === payload.key
          ? (current.direction === "asc" ? "desc" : "asc")
          : Admin.getInitialSortDirection(payload.key)
      };
      if (Object.prototype.hasOwnProperty.call(state.pagination, payload.viewName)) {
        state.pagination[payload.viewName] = 1;
      }
      renderDashboard();
    });

    function handleSortFieldChange() {
      var field = document.getElementById("dashboardSortField");
      if (!field) return;
      var s = state.sorting.dashboardTopProducts || { key: "unit_price", direction: "desc" };
      s.key = field.value;
      s.direction = s.direction || "desc";
      state.sorting.dashboardTopProducts = s;
      state.pagination.dashboardTopProducts = 1;
      renderDashboard();
    }

    var sortField = document.getElementById("dashboardSortField");
    if (sortField) sortField.addEventListener("change", handleSortFieldChange);

    function handleSortArrowClick(dir) {
      var s = state.sorting.dashboardTopProducts || { key: "unit_price", direction: "desc" };
      s.direction = dir;
      state.sorting.dashboardTopProducts = s;
      state.pagination.dashboardTopProducts = 1;
      renderDashboard();
    }

    var ascBtn = document.getElementById("dashboardSortAsc");
    var descBtn = document.getElementById("dashboardSortDesc");
    if (ascBtn) ascBtn.addEventListener("click", function () { handleSortArrowClick("asc"); });
    if (descBtn) descBtn.addEventListener("click", function () { handleSortArrowClick("desc"); });

    Admin.bindPagination(document, function (payload) {
      if (!Object.prototype.hasOwnProperty.call(state.pagination, payload.viewName)) {
        return;
      }
      state.pagination[payload.viewName] = payload.page;
      renderDashboard();
    });

    var refreshButton = document.getElementById("refreshOverviewBtn");
    if (refreshButton) {
      refreshButton.addEventListener("click", function () {
        refreshData(shell.messageNode).catch(function (error) {
          Admin.showMessage(shell.messageNode, error.message || "Không thể làm mới tổng quan.", "error");
        });
      });
    }

    try {
      await refreshData(shell.messageNode);
    } catch (error) {
      Admin.showMessage(shell.messageNode, error.message || "Không thể tải trang tổng quan.", "error");
    }
  });
})();
