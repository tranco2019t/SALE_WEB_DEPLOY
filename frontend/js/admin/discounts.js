(function () {
  var Admin = window.TamTaiAdmin;
  var state = {
    products: [],
    customers: [],
    discounts: [],
    editingDiscountId: "",
    sorting: {
      discounts: { key: "code", direction: "asc" }
    },
    pagination: {
      discounts: 1
    }
  };

  function getDiscountProductLabel(discount) {
    if (discount.product_name) {
      return discount.product_name;
    }
    if (discount.product_id) {
      return "Mã SP: " + discount.product_id;
    }
    return "Tất cả sản phẩm";
  }

  function getDiscountCustomerLabel(discount) {
    if (discount.customer_name) {
      return discount.customer_name;
    }
    if (discount.customer_email) {
      return discount.customer_email;
    }
    if (discount.customer_id) {
      return "Mã KH: " + discount.customer_id;
    }
    return "Tất cả người dùng";
  }

  function renderDiscounts() {
    var body = document.getElementById("discountsTableBody");
    var countNode = document.getElementById("discountsCount");
    if (!body) {
      return;
    }

    var sorted = Admin.sortItems(state.discounts, "discounts", state.sorting.discounts);
    var pageData = Admin.paginateItems(sorted, state.pagination.discounts);
    state.pagination.discounts = pageData.currentPage;

    if (countNode) {
      countNode.textContent = pageData.totalItems + " mã";
    }

    Admin.renderPagination(
      document.getElementById("discountsPagination"),
      document.getElementById("discountsPageSummary"),
      pageData,
      "discounts"
    );

    body.innerHTML = pageData.items.length ? pageData.items.map(function (discount) {
      return [
        "<tr>",
        "  <td><span class=\"entity-primary\">" + Admin.escapeHtml(discount.code) + "</span><span class=\"entity-secondary\">" + Admin.escapeHtml(discount.description || "-") + "</span></td>",
        "  <td>" + Admin.escapeHtml(discount.discount_percent) + "%</td>",
        "  <td>" + Admin.escapeHtml(getDiscountProductLabel(discount)) + "</td>",
        "  <td>" + Admin.escapeHtml(getDiscountCustomerLabel(discount)) + "</td>",
        "  <td>" + Admin.escapeHtml(discount.used_count) + "/" + Admin.escapeHtml(discount.usage_limit) + "</td>",
        "  <td><span class=\"status-chip " + (discount.is_active ? "is-success" : "is-danger") + "\">" + (discount.is_active ? "Đang bật" : "Đang tắt") + "</span></td>",
        "  <td>",
        "    <div class=\"row-actions\">",
        "      <button type=\"button\" class=\"icon-btn is-edit\" data-action=\"edit-discount\" data-id=\"" + Admin.escapeHtml(discount.discount_code_id) + "\"><i class=\"fa-solid fa-pen\"></i></button>",
        "      <button type=\"button\" class=\"icon-btn is-view\" data-action=\"toggle-discount\" data-id=\"" + Admin.escapeHtml(discount.discount_code_id) + "\"><i class=\"fa-solid " + (discount.is_active ? "fa-toggle-on" : "fa-toggle-off") + "\"></i></button>",
        "      <button type=\"button\" class=\"icon-btn is-delete\" data-action=\"delete-discount\" data-id=\"" + Admin.escapeHtml(discount.discount_code_id) + "\"><i class=\"fa-solid fa-trash\"></i></button>",
        "    </div>",
        "  </td>",
        "</tr>"
      ].join("");
    }).join("") : Admin.renderEmptyRow(7, "Chưa có mã giảm giá nào.");

    Admin.renderSortButtons(document, state.sorting);
  }

  function populateTargets() {
    Admin.populateSelect(
      document.getElementById("discountProduct"),
      "Tất cả sản phẩm",
      state.products,
      "product_id",
      "product_name"
    );

    Admin.populateSelect(
      document.getElementById("discountCustomer"),
      "Tất cả người dùng",
      state.customers,
      "customer_id",
      function (customer) {
        return customer.customer_name + " - " + customer.customer_email;
      }
    );
  }

  function resetDiscountForm() {
    state.editingDiscountId = "";
    document.getElementById("discountForm").reset();
    document.getElementById("discountFormId").value = "";
    document.getElementById("discountFormTitle").textContent = "Thêm mã giảm giá";
    document.getElementById("discountSubmitBtn").textContent = "Lưu mã";
    document.getElementById("discountStatus").value = "true";
    document.getElementById("discountUsageLimit").value = 1;
  }

  function fillDiscountForm(discountId) {
    var discount = state.discounts.find(function (item) {
      return item.discount_code_id === discountId;
    });

    if (!discount) {
      return;
    }

    state.editingDiscountId = discount.discount_code_id;
    document.getElementById("discountFormTitle").textContent = "Cập nhật mã giảm giá";
    document.getElementById("discountSubmitBtn").textContent = "Cập nhật";
    document.getElementById("discountFormId").value = discount.discount_code_id;
    document.getElementById("discountCode").value = discount.code || "";
    document.getElementById("discountPercent").value = discount.discount_percent || 1;
    document.getElementById("discountProduct").value = discount.product_id || "";
    document.getElementById("discountCustomer").value = discount.customer_id || "";
    document.getElementById("discountUsageLimit").value = discount.usage_limit || 1;
    document.getElementById("discountStartsAt").value = Admin.formatDateTimeLocal(discount.starts_at);
    document.getElementById("discountExpiresAt").value = Admin.formatDateTimeLocal(discount.expires_at);
    document.getElementById("discountStatus").value = discount.is_active ? "true" : "false";
    document.getElementById("discountDescription").value = discount.description || "";
    document.getElementById("discountCode").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function refreshStats() {
    var dashboard = await Admin.fetchDashboard();
    Admin.renderStats(dashboard && dashboard.stats);
  }

  async function loadDiscounts() {
    state.discounts = await Admin.fetchDiscountCodes(document.getElementById("adminGlobalSearch").value);
    state.pagination.discounts = 1;
    renderDiscounts();
  }

  async function saveDiscount(event, messageNode) {
    event.preventDefault();

    var discountId = document.getElementById("discountFormId").value;
    var payload = {
      code: document.getElementById("discountCode").value.trim(),
      discount_percent: Number(document.getElementById("discountPercent").value || 0),
      product_id: document.getElementById("discountProduct").value || null,
      customer_id: document.getElementById("discountCustomer").value || null,
      usage_limit: Number(document.getElementById("discountUsageLimit").value || 1),
      starts_at: document.getElementById("discountStartsAt").value || null,
      expires_at: document.getElementById("discountExpiresAt").value || null,
      is_active: document.getElementById("discountStatus").value === "true",
      description: document.getElementById("discountDescription").value.trim() || null
    };

    await Admin.request(discountId ? "/admin/discount-codes/" + encodeURIComponent(discountId) : "/admin/discount-codes", {
      method: discountId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    await Promise.all([refreshStats(), loadDiscounts()]);
    resetDiscountForm();
    var successMessage = "";
    if (discountId) {
      successMessage = payload.customer_id
        ? "Đã cập nhật mã giảm giá. Nếu vừa gán khách hàng mới, hệ thống đã tạo thông báo."
        : "Đã cập nhật mã giảm giá. Nếu mã vừa chuyển sang toàn bộ khách hàng, hệ thống đã gửi thông báo hàng loạt.";
    } else {
      successMessage = payload.customer_id
        ? "Đã tạo mã giảm giá mới và gửi thông báo cho khách hàng được chọn."
        : "Đã tạo mã giảm giá mới và gửi thông báo cho toàn bộ khách hàng.";
    }
    Admin.showMessage(messageNode, successMessage, "success");
  }

  async function toggleDiscount(discountId, messageNode) {
    var discount = state.discounts.find(function (item) {
      return item.discount_code_id === discountId;
    });
    if (!discount) {
      return;
    }

    await Admin.request("/admin/discount-codes/" + encodeURIComponent(discountId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !discount.is_active })
    });

    await Promise.all([refreshStats(), loadDiscounts()]);
    Admin.showMessage(messageNode, "Đã đổi trạng thái mã giảm giá.", "success");
  }

  async function deleteDiscount(discountId, messageNode) {
    if (!window.confirm("Bạn chắc chắn muốn xóa mã giảm giá này?")) {
      return;
    }

    await Admin.request("/admin/discount-codes/" + encodeURIComponent(discountId), {
      method: "DELETE"
    });

    await Promise.all([refreshStats(), loadDiscounts()]);
    Admin.showMessage(messageNode, "Đã xóa mã giảm giá.", "success");
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var shell = Admin.initShell({
      navKey: "discounts",
      searchPlaceholder: "Tìm mã giảm giá, sản phẩm hoặc người dùng..."
    });

    var canAccess = await Admin.verifyAccess(shell.messageNode);
    if (!canAccess) {
      return;
    }

    Admin.bindTopSearch(shell.pageSearchInput, function () {
      loadDiscounts().catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể tìm mã giảm giá.", "error");
      });
    });

    Admin.bindSortButtons(document, function (payload) {
      if (payload.viewName !== "discounts") {
        return;
      }
      var current = state.sorting.discounts;
      state.sorting.discounts = {
        key: payload.key,
        direction: current.key === payload.key
          ? (current.direction === "asc" ? "desc" : "asc")
          : Admin.getInitialSortDirection(payload.key)
      };
      state.pagination.discounts = 1;
      renderDiscounts();
    });

    Admin.bindPagination(document, function (payload) {
      if (payload.viewName !== "discounts") {
        return;
      }
      state.pagination.discounts = payload.page;
      renderDiscounts();
    });

    document.getElementById("refreshDiscountsBtn").addEventListener("click", function () {
      Promise.all([refreshStats(), loadDiscounts()]).then(function () {
        Admin.showMessage(shell.messageNode, "Đã làm mới mã giảm giá.", "success");
      }).catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể làm mới mã giảm giá.", "error");
      });
    });

    document.getElementById("resetDiscountFormBtn").addEventListener("click", resetDiscountForm);
    document.getElementById("discountCancelBtn").addEventListener("click", resetDiscountForm);

    document.getElementById("discountForm").addEventListener("submit", function (event) {
      saveDiscount(event, shell.messageNode).catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể lưu mã giảm giá.", "error");
      });
    });

    document.getElementById("discountsTableBody").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }

      var action = button.getAttribute("data-action");
      var id = button.getAttribute("data-id");

      if (action === "edit-discount") {
        fillDiscountForm(id);
        return;
      }

      if (action === "toggle-discount") {
        toggleDiscount(id, shell.messageNode).catch(function (error) {
          Admin.showMessage(shell.messageNode, error.message || "Không thể đổi trạng thái mã giảm giá.", "error");
        });
        return;
      }

      if (action === "delete-discount") {
        deleteDiscount(id, shell.messageNode).catch(function (error) {
          Admin.showMessage(shell.messageNode, error.message || "Không thể xóa mã giảm giá.", "error");
        });
      }
    });

    try {
      var results = await Promise.all([
        refreshStats(),
        loadDiscounts(),
        Admin.fetchProducts("", ""),
        Admin.fetchCustomers("")
      ]);

      state.products = results[2] || [];
      state.customers = results[3] || [];
      populateTargets();
      resetDiscountForm();
    } catch (error) {
      Admin.showMessage(shell.messageNode, error.message || "Không thể tải trang mã giảm giá.", "error");
    }
  });
})();
