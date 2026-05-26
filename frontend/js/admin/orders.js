/* ===== Trang Quản lý Đơn hàng Admin ===== */
(function () {
  var Admin = window.TamTaiAdmin;
  // Danh sách trạng thái đơn hàng cho dropdown
  var ORDER_STATUSES = ["Pending", "Confirmed", "Shipping", "Delivered", "Cancelled"];
  var state = {
    orders: [],
    sorting: {
      orders: { key: "order_date", direction: "desc" }
    },
    pagination: {
      orders: 1
    }
  };

  /* ---- Ánh xạ trạng thái đơn hàng ---- */
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
    return { label: "Chờ xử lý", className: "is-neutral" };
  }

  /* ---- Render bảng đơn hàng ---- */
  // Mỗi dòng có dropdown chọn trạng thái + nút Lưu để cập nhật inline
  function renderOrders() {
    var body = document.getElementById("ordersTableBody");
    var countNode = document.getElementById("ordersCount");
    if (!body) {
      return;
    }

    var sorted = Admin.sortItems(state.orders, "orders", state.sorting.orders);
    var pageData = Admin.paginateItems(sorted, state.pagination.orders);
    state.pagination.orders = pageData.currentPage;

    if (countNode) {
      countNode.textContent = pageData.totalItems + " đơn";
    }

    Admin.renderPagination(
      document.getElementById("ordersPagination"),
      document.getElementById("ordersPageSummary"),
      pageData,
      "orders"
    );

    body.innerHTML = pageData.items.length ? pageData.items.map(function (order) {
      var status = getStatusMeta(order.status);
      var options = ORDER_STATUSES.map(function (entry) {
        return '<option value="' + Admin.escapeHtml(entry) + '"' + (String(order.status || "").toLowerCase() === entry.toLowerCase() ? " selected" : "") + ">" + Admin.escapeHtml(entry) + "</option>";
      }).join("");

      return [
        "<tr>",
        "  <td>" + Admin.escapeHtml(order.order_id) + "</td>",
        "  <td><span class=\"entity-primary\">" + Admin.escapeHtml(order.customer_name || "-") + "</span><span class=\"entity-secondary\">" + Admin.escapeHtml(order.customer_email || "-") + "</span></td>",
        "  <td class=\"money-text\">" + Admin.escapeHtml(Admin.formatMoney(order.total_amount || 0)) + "</td>",
        "  <td>" + Admin.escapeHtml(Admin.formatDate(order.order_date)) + "</td>",
        "  <td><span class=\"status-chip " + status.className + "\">" + Admin.escapeHtml(status.label) + "</span></td>",
        "  <td>",
        "    <div class=\"inline-actions\">",
        "      <select class=\"admin-select\" data-order-status=\"" + Admin.escapeHtml(order.order_id) + "\">" + options + "</select>",
        "      <button type=\"button\" class=\"btn btn-soft\" data-action=\"save-order-status\" data-id=\"" + Admin.escapeHtml(order.order_id) + "\">Lưu</button>",
        "    </div>",
        "  </td>",
        "</tr>"
      ].join("");
    }).join("") : Admin.renderEmptyRow(6, "Không có đơn hàng phù hợp.");

    Admin.renderSortButtons(document, state.sorting);
  }

  /* ---- Làm mới thống kê & tải đơn hàng ---- */
  async function refreshStats() {
    var dashboard = await Admin.fetchDashboard();
    Admin.renderStats(dashboard && dashboard.stats);
  }

  // Gọi API lấy đơn hàng theo từ khóa
  async function loadOrders() {
    state.orders = await Admin.fetchOrders(document.getElementById("adminGlobalSearch").value);
    state.pagination.orders = 1;
    renderOrders();
  }

  /* ---- Cập nhật trạng thái đơn hàng ---- */
  // Lấy giá trị từ dropdown, gọi PATCH /admin/orders/{id}/status
  async function updateOrderStatus(orderId, messageNode) {
    var select = document.querySelector('select[data-order-status="' + orderId + '"]');
    if (!select) {
      return;
    }

    await Admin.request("/admin/orders/" + encodeURIComponent(orderId) + "/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: select.value })
    });

    await Promise.all([refreshStats(), loadOrders()]);
    Admin.showMessage(messageNode, "Đã cập nhật trạng thái đơn hàng.", "success");
  }

  /* ---- Khởi tạo trang ---- */
  // Xác thực admin, tìm kiếm, sắp xếp, phân trang, load dữ liệu
  document.addEventListener("DOMContentLoaded", async function () {
    var shell = Admin.initShell({
      navKey: "orders",
      searchPlaceholder: "Tìm mã đơn, khách hàng hoặc trạng thái..."
    });

    var canAccess = await Admin.verifyAccess(shell.messageNode);
    if (!canAccess) {
      return;
    }

    Admin.bindTopSearch(shell.pageSearchInput, function () {
      loadOrders().catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể tìm đơn hàng.", "error");
      });
    });

    Admin.bindSortButtons(document, function (payload) {
      if (payload.viewName !== "orders") {
        return;
      }
      var current = state.sorting.orders;
      state.sorting.orders = {
        key: payload.key,
        direction: current.key === payload.key
          ? (current.direction === "asc" ? "desc" : "asc")
          : Admin.getInitialSortDirection(payload.key)
      };
      state.pagination.orders = 1;
      renderOrders();
    });

    Admin.bindPagination(document, function (payload) {
      if (payload.viewName !== "orders") {
        return;
      }
      state.pagination.orders = payload.page;
      renderOrders();
    });

    document.getElementById("refreshOrdersBtn").addEventListener("click", function () {
      Promise.all([refreshStats(), loadOrders()]).then(function () {
        Admin.showMessage(shell.messageNode, "Đã làm mới dữ liệu đơn hàng.", "success");
      }).catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể làm mới đơn hàng.", "error");
      });
    });

    document.getElementById("ordersTableBody").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action='save-order-status']");
      if (!button) {
        return;
      }

      updateOrderStatus(button.getAttribute("data-id"), shell.messageNode).catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể cập nhật trạng thái đơn hàng.", "error");
      });
    });

    try {
      await Promise.all([refreshStats(), loadOrders()]);
    } catch (error) {
      Admin.showMessage(shell.messageNode, error.message || "Không thể tải trang đơn hàng.", "error");
    }
  });
})();
