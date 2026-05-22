(function () {
  var Admin = window.TamTaiAdmin;
  var state = {
    customers: [],
    sorting: {
      customers: { key: "customer_id", direction: "desc" }
    },
    pagination: {
      customers: 1
    }
  };

  function renderCustomers() {
    var body = document.getElementById("customersTableBody");
    var countNode = document.getElementById("customersCount");
    if (!body) {
      return;
    }

    var sorted = Admin.sortItems(state.customers, "customers", state.sorting.customers);
    var pageData = Admin.paginateItems(sorted, state.pagination.customers);
    state.pagination.customers = pageData.currentPage;

    if (countNode) {
      countNode.textContent = pageData.totalItems + " tài khoản";
    }

    Admin.renderPagination(
      document.getElementById("customersPagination"),
      document.getElementById("customersPageSummary"),
      pageData,
      "customers"
    );

    body.innerHTML = pageData.items.length ? pageData.items.map(function (customer) {
      var statusClass = customer.is_active ? "is-success" : "is-danger";
      var statusLabel = customer.is_active ? "Hoạt động" : "Tạm khóa";
      return [
        "<tr>",
        "  <td>" + Admin.escapeHtml(customer.customer_id) + "</td>",
        "  <td><button type=\"button\" class=\"detail-trigger\" data-action=\"view-customer\" data-id=\"" + Admin.escapeHtml(customer.customer_id) + "\">" + Admin.escapeHtml(customer.customer_name) + "</button><span class=\"entity-secondary\">Đơn gần nhất: " + Admin.escapeHtml(Admin.formatDate(customer.last_order_date)) + "</span></td>",
        "  <td><span class=\"entity-primary\">" + Admin.escapeHtml(customer.customer_email) + "</span><span class=\"entity-secondary\">" + Admin.escapeHtml(customer.phone_number || "-") + "</span></td>",
        "  <td>" + Admin.escapeHtml(customer.orders_count || 0) + "</td>",
        "  <td class=\"money-text\">" + Admin.escapeHtml(Admin.formatMoney(customer.total_spent || 0)) + "</td>",
        "  <td><span class=\"status-chip " + statusClass + "\">" + statusLabel + "</span></td>",
        "  <td>",
        "    <div class=\"row-actions\">",
        "      <button type=\"button\" class=\"icon-btn is-view\" data-action=\"view-customer\" data-id=\"" + Admin.escapeHtml(customer.customer_id) + "\"><i class=\"fa-solid fa-eye\"></i></button>",
        "      <button type=\"button\" class=\"icon-btn is-edit\" data-action=\"edit-customer\" data-id=\"" + Admin.escapeHtml(customer.customer_id) + "\"><i class=\"fa-solid fa-pen\"></i></button>",
        "      <button type=\"button\" class=\"icon-btn " + (customer.is_active ? "is-delete" : "is-edit") + "\" data-action=\"toggle-customer\" data-id=\"" + Admin.escapeHtml(customer.customer_id) + "\"><i class=\"fa-solid " + (customer.is_active ? "fa-lock" : "fa-lock-open") + "\"></i></button>",
        "    </div>",
        "  </td>",
        "</tr>"
      ].join("");
    }).join("") : Admin.renderEmptyRow(7, "Không có tài khoản phù hợp.");

    Admin.renderSortButtons(document, state.sorting);
  }

  function resetCustomerForm() {
    document.getElementById("customerForm").reset();
    document.getElementById("customerFormId").value = "";
    document.getElementById("customerFormTitle").textContent = "Chỉnh sửa người dùng";
    document.getElementById("customerStatus").value = "1";
  }

  function fillCustomerForm(customerId) {
    var customer = state.customers.find(function (item) {
      return item.customer_id === customerId;
    });

    if (!customer) {
      return;
    }

    document.getElementById("customerFormTitle").textContent = "Cập nhật " + customer.customer_id;
    document.getElementById("customerFormId").value = customer.customer_id;
    document.getElementById("customerName").value = customer.customer_name || "";
    document.getElementById("customerEmail").value = customer.customer_email || "";
    document.getElementById("customerPhone").value = customer.phone_number || "";
    document.getElementById("customerAddress").value = customer.address || "";
    document.getElementById("customerStatus").value = customer.is_active ? "1" : "0";
    document.getElementById("customerName").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function closeModal() {
    var modal = document.getElementById("customerDetailModal");
    if (!modal) {
      return;
    }
    modal.hidden = true;
    document.body.classList.remove("admin-modal-open");
  }

  function renderCustomerModal(customer) {
    var title = document.getElementById("customerDetailTitle");
    var body = document.getElementById("customerDetailBody");
    if (!title || !body) {
      return;
    }

    var statusClass = customer.is_active ? "is-success" : "is-danger";
    var statusLabel = customer.is_active ? "Hoạt động" : "Tạm khóa";
    title.textContent = customer.customer_name || ("Khách hàng " + customer.customer_id);
    body.innerHTML = [
      "<div class=\"detail-grid\">",
      "  <article class=\"detail-card\"><span class=\"detail-label\">Mã khách hàng</span><div class=\"detail-value\">" + Admin.escapeHtml(customer.customer_id) + "</div></article>",
      "  <article class=\"detail-card\"><span class=\"detail-label\">Trạng thái</span><div class=\"detail-value\"><span class=\"status-chip " + statusClass + "\">" + statusLabel + "</span></div></article>",
      "  <article class=\"detail-card\"><span class=\"detail-label\">Email</span><div class=\"detail-value\">" + Admin.escapeHtml(customer.customer_email || "-") + "</div></article>",
      "  <article class=\"detail-card\"><span class=\"detail-label\">Số điện thoại</span><div class=\"detail-value\">" + Admin.escapeHtml(customer.phone_number || "-") + "</div></article>",
      "  <article class=\"detail-card\"><span class=\"detail-label\">Tổng đơn hàng</span><div class=\"detail-value\">" + Admin.escapeHtml(customer.orders_count || 0) + "</div></article>",
      "  <article class=\"detail-card\"><span class=\"detail-label\">Tổng chi tiêu</span><div class=\"detail-value money-text\">" + Admin.escapeHtml(Admin.formatMoney(customer.total_spent || 0)) + "</div></article>",
      "  <article class=\"detail-card\"><span class=\"detail-label\">Ngày tạo</span><div class=\"detail-value\">" + Admin.escapeHtml(Admin.formatDate(customer.created_at)) + "</div></article>",
      "  <article class=\"detail-card\"><span class=\"detail-label\">Đơn gần nhất</span><div class=\"detail-value\">" + Admin.escapeHtml(Admin.formatDate(customer.last_order_date)) + "</div></article>",
      "  <article class=\"detail-card is-wide\"><span class=\"detail-label\">Địa chỉ</span><div class=\"detail-value\">" + Admin.escapeHtml(customer.address || "-") + "</div></article>",
      "</div>"
    ].join("");
  }

  async function openCustomerModal(customerId, messageNode) {
    var modal = document.getElementById("customerDetailModal");
    var title = document.getElementById("customerDetailTitle");
    var body = document.getElementById("customerDetailBody");
    if (!modal || !title || !body) {
      return;
    }

    modal.hidden = false;
    document.body.classList.add("admin-modal-open");
    title.textContent = "Đang tải...";
    body.innerHTML = "<div class=\"empty-state\">Đang tải thông tin khách hàng...</div>";

    try {
      var customer = await Admin.request("/admin/customers/" + encodeURIComponent(customerId));
      renderCustomerModal(customer);
    } catch (error) {
      Admin.showMessage(messageNode, error.message || "Không thể tải thông tin khách hàng.", "error");
      closeModal();
    }
  }

  async function refreshStats() {
    var dashboard = await Admin.fetchDashboard();
    Admin.renderStats(dashboard && dashboard.stats);
  }

  async function loadCustomers() {
    state.customers = await Admin.fetchCustomers(document.getElementById("adminGlobalSearch").value);
    state.pagination.customers = 1;
    renderCustomers();
  }

  async function saveCustomer(event, messageNode) {
    event.preventDefault();

    var customerId = document.getElementById("customerFormId").value;
    if (!customerId) {
      Admin.showMessage(messageNode, "Hãy chọn một người dùng để chỉnh sửa.", "info");
      return;
    }

    await Admin.request("/admin/customers/" + encodeURIComponent(customerId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: document.getElementById("customerName").value.trim(),
        customer_email: document.getElementById("customerEmail").value.trim(),
        phone_number: document.getElementById("customerPhone").value.trim() || null,
        address: document.getElementById("customerAddress").value.trim() || null,
        is_active: document.getElementById("customerStatus").value === "1"
      })
    });

    await Promise.all([refreshStats(), loadCustomers()]);
    Admin.showMessage(messageNode, "Đã cập nhật người dùng.", "success");
  }

  async function toggleCustomer(customerId, messageNode) {
    var customer = state.customers.find(function (item) {
      return item.customer_id === customerId;
    });

    if (!customer) {
      return;
    }

    await Admin.request("/admin/customers/" + encodeURIComponent(customerId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !customer.is_active })
    });

    await Promise.all([refreshStats(), loadCustomers()]);
    Admin.showMessage(messageNode, "Đã cập nhật trạng thái tài khoản.", "success");
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var shell = Admin.initShell({
      navKey: "customers",
      searchPlaceholder: "Tìm người dùng theo tên, email hoặc số điện thoại..."
    });

    var canAccess = await Admin.verifyAccess(shell.messageNode);
    if (!canAccess) {
      return;
    }

    Admin.bindTopSearch(shell.pageSearchInput, function () {
      loadCustomers().catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể tìm người dùng.", "error");
      });
    });

    Admin.bindSortButtons(document, function (payload) {
      if (payload.viewName !== "customers") {
        return;
      }

      var current = state.sorting.customers;
      state.sorting.customers = {
        key: payload.key,
        direction: current.key === payload.key
          ? (current.direction === "asc" ? "desc" : "asc")
          : Admin.getInitialSortDirection(payload.key)
      };
      state.pagination.customers = 1;
      renderCustomers();
    });

    Admin.bindPagination(document, function (payload) {
      if (payload.viewName !== "customers") {
        return;
      }
      state.pagination.customers = payload.page;
      renderCustomers();
    });

    document.getElementById("refreshCustomersBtn").addEventListener("click", function () {
      Promise.all([refreshStats(), loadCustomers()]).then(function () {
        Admin.showMessage(shell.messageNode, "Đã làm mới dữ liệu người dùng.", "success");
      }).catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể làm mới người dùng.", "error");
      });
    });

    document.getElementById("resetCustomerFormBtn").addEventListener("click", resetCustomerForm);
    document.getElementById("customerCancelBtn").addEventListener("click", resetCustomerForm);

    document.getElementById("customerForm").addEventListener("submit", function (event) {
      saveCustomer(event, shell.messageNode).catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể cập nhật người dùng.", "error");
      });
    });

    document.getElementById("customersTableBody").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }

      var action = button.getAttribute("data-action");
      var id = button.getAttribute("data-id");

      if (action === "edit-customer") {
        fillCustomerForm(id);
        return;
      }

      if (action === "view-customer") {
        openCustomerModal(id, shell.messageNode);
        return;
      }

      if (action === "toggle-customer") {
        toggleCustomer(id, shell.messageNode).catch(function (error) {
          Admin.showMessage(shell.messageNode, error.message || "Không thể đổi trạng thái người dùng.", "error");
        });
      }
    });

    var modal = document.getElementById("customerDetailModal");
    var closeButton = document.getElementById("closeCustomerDetailBtn");
    if (closeButton) {
      closeButton.addEventListener("click", closeModal);
    }
    if (modal) {
      modal.addEventListener("click", function (event) {
        if (event.target.closest("[data-close-customer-modal]")) {
          closeModal();
        }
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeModal();
      }
    });

    try {
      await Promise.all([refreshStats(), loadCustomers()]);
      resetCustomerForm();
    } catch (error) {
      Admin.showMessage(shell.messageNode, error.message || "Không thể tải trang người dùng.", "error");
    }
  });
})();
