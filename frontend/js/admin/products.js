(function () {
  var Admin = window.TamTaiAdmin;
  var state = {
    categories: [],
    products: [],
    editingProductId: "",
    sorting: {
      products: { key: "product_id", direction: "desc" }
    },
    pagination: {
      products: 1
    }
  };

  function renderProducts() {
    var tableBody = document.getElementById("productsTableBody");
    var countNode = document.getElementById("productsCount");
    if (!tableBody) {
      return;
    }

    var sorted = Admin.sortItems(state.products, "products", state.sorting.products);
    var pageData = Admin.paginateItems(sorted, state.pagination.products);
    state.pagination.products = pageData.currentPage;

    if (countNode) {
      countNode.textContent = pageData.totalItems + " sản phẩm";
    }

    Admin.renderPagination(
      document.getElementById("productsPagination"),
      document.getElementById("productsPageSummary"),
      pageData,
      "products"
    );

    tableBody.innerHTML = pageData.items.length ? pageData.items.map(function (product) {
      return [
        "<tr>",
        "  <td>" + Admin.escapeHtml(product.product_id) + "</td>",
        "  <td>",
        "    <div class=\"product-cell\">",
        "      <div class=\"entity-thumb\"><img src=\"" + Admin.escapeHtml(Admin.toImageSrc(product.image_url)) + "\" alt=\"" + Admin.escapeHtml(product.product_name) + "\"></div>",
        "      <div>",
        "        <span class=\"entity-primary\">" + Admin.escapeHtml(product.product_name) + "</span>",
        "        <span class=\"entity-secondary\">Giảm: " + Admin.escapeHtml(product.discount_percent) + "% | Đánh giá: " + Admin.escapeHtml(product.rating_avg) + "</span>",
        "      </div>",
        "    </div>",
        "  </td>",
        "  <td>" + Admin.escapeHtml(product.category_name || product.category_id) + "</td>",
        "  <td class=\"money-text\">" + Admin.escapeHtml(Admin.formatMoney(product.unit_price || 0)) + "</td>",
        "  <td>" + Admin.escapeHtml(product.stock_quantity) + "</td>",
        "  <td>" + Admin.escapeHtml(product.sold_quantity || 0) + "</td>",
        "  <td>",
        "    <div class=\"row-actions\">",
        "      <button type=\"button\" class=\"icon-btn is-edit\" data-action=\"edit-product\" data-id=\"" + Admin.escapeHtml(product.product_id) + "\"><i class=\"fa-solid fa-pen\"></i></button>",
        "      <button type=\"button\" class=\"icon-btn is-delete\" data-action=\"delete-product\" data-id=\"" + Admin.escapeHtml(product.product_id) + "\"><i class=\"fa-solid fa-trash\"></i></button>",
        "    </div>",
        "  </td>",
        "</tr>"
      ].join("");
    }).join("") : Admin.renderEmptyRow(7, "Không có sản phẩm phù hợp.");

    Admin.renderSortButtons(document, state.sorting);
  }

  function populateCategoryOptions() {
    Admin.populateSelect(
      document.getElementById("productCategoryFilter"),
      "Tất cả danh mục",
      state.categories,
      "category_id",
      "category_name"
    );

    Admin.populateSelect(
      document.getElementById("productCategory"),
      "Chọn danh mục",
      state.categories,
      "category_id",
      "category_name"
    );
  }

  function resetProductForm() {
    state.editingProductId = "";
    document.getElementById("productForm").reset();
    document.getElementById("productFormId").value = "";
    document.getElementById("productFormTitle").textContent = "Thêm sản phẩm mới";
    document.getElementById("productSubmitBtn").textContent = "Lưu sản phẩm";
    if (state.categories.length) {
      document.getElementById("productCategory").value = state.categories[0].category_id;
    }
  }

  function fillProductForm(productId) {
    var product = state.products.find(function (item) {
      return item.product_id === productId;
    });

    if (!product) {
      return;
    }

    state.editingProductId = product.product_id;
    document.getElementById("productFormTitle").textContent = "Cập nhật sản phẩm";
    document.getElementById("productSubmitBtn").textContent = "Cập nhật";
    document.getElementById("productFormId").value = product.product_id;
    document.getElementById("productName").value = product.product_name || "";
    document.getElementById("productCategory").value = product.category_id || "";
    document.getElementById("productImageUrl").value = product.image_url || "";
    document.getElementById("productPrice").value = product.unit_price || 0;
    document.getElementById("productDiscount").value = product.discount_percent || 0;
    document.getElementById("productStock").value = product.stock_quantity || 0;
    document.getElementById("productRating").value = product.rating_avg || 0;
    document.getElementById("productReviews").value = product.total_reviews || 0;
    document.getElementById("productDescription").value = product.description || "";
    document.getElementById("productName").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function refreshStats() {
    var dashboard = await Admin.fetchDashboard();
    Admin.renderStats(dashboard && dashboard.stats);
  }

  async function loadProducts() {
    state.products = await Admin.fetchProducts(
      document.getElementById("adminGlobalSearch").value,
      document.getElementById("productCategoryFilter").value
    );
    state.pagination.products = 1;
    renderProducts();
  }

  async function saveProduct(event, messageNode) {
    event.preventDefault();
    var editingId = document.getElementById("productFormId").value;
    var payload = {
      product_name: document.getElementById("productName").value.trim(),
      category_id: document.getElementById("productCategory").value,
      image_url: document.getElementById("productImageUrl").value.trim() || null,
      unit_price: Number(document.getElementById("productPrice").value || 0),
      discount_percent: Number(document.getElementById("productDiscount").value || 0),
      stock_quantity: Number(document.getElementById("productStock").value || 0),
      rating_avg: Number(document.getElementById("productRating").value || 0),
      total_reviews: Number(document.getElementById("productReviews").value || 0),
      description: document.getElementById("productDescription").value.trim() || null
    };

    await Admin.request(editingId ? "/admin/products/" + encodeURIComponent(editingId) : "/admin/products", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    await Promise.all([refreshStats(), loadProducts()]);
    resetProductForm();
    Admin.showMessage(messageNode, editingId ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm mới.", "success");
  }

  async function deleteProduct(productId, messageNode) {
    if (!window.confirm("Bạn chắc chắn muốn xóa sản phẩm này?")) {
      return;
    }

    await Admin.request("/admin/products/" + encodeURIComponent(productId), { method: "DELETE" });
    await Promise.all([refreshStats(), loadProducts()]);
    Admin.showMessage(messageNode, "Đã xóa sản phẩm.", "success");
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var shell = Admin.initShell({
      navKey: "products",
      searchPlaceholder: "Tìm sản phẩm theo mã, tên hoặc mô tả..."
    });

    var canAccess = await Admin.verifyAccess(shell.messageNode);
    if (!canAccess) {
      return;
    }

    Admin.bindTopSearch(shell.pageSearchInput, function () {
      loadProducts().catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể tìm sản phẩm.", "error");
      });
    });

    Admin.bindSortButtons(document, function (payload) {
      if (payload.viewName !== "products") {
        return;
      }

      var current = state.sorting.products;
      state.sorting.products = {
        key: payload.key,
        direction: current.key === payload.key
          ? (current.direction === "asc" ? "desc" : "asc")
          : Admin.getInitialSortDirection(payload.key)
      };
      state.pagination.products = 1;
      renderProducts();
    });

    Admin.bindPagination(document, function (payload) {
      if (payload.viewName !== "products") {
        return;
      }
      state.pagination.products = payload.page;
      renderProducts();
    });

    document.getElementById("productCategoryFilter").addEventListener("change", function () {
      loadProducts().catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể lọc danh mục.", "error");
      });
    });

    document.getElementById("refreshProductsBtn").addEventListener("click", function () {
      Promise.all([refreshStats(), loadProducts()]).then(function () {
        Admin.showMessage(shell.messageNode, "Đã làm mới dữ liệu sản phẩm.", "success");
      }).catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể làm mới sản phẩm.", "error");
      });
    });

    document.getElementById("resetProductFormBtn").addEventListener("click", resetProductForm);
    document.getElementById("productCancelBtn").addEventListener("click", resetProductForm);

    document.getElementById("productForm").addEventListener("submit", function (event) {
      saveProduct(event, shell.messageNode).catch(function (error) {
        Admin.showMessage(shell.messageNode, error.message || "Không thể lưu sản phẩm.", "error");
      });
    });

    document.getElementById("productsTableBody").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }

      var action = button.getAttribute("data-action");
      var id = button.getAttribute("data-id");

      if (action === "edit-product") {
        fillProductForm(id);
        return;
      }

      if (action === "delete-product") {
        deleteProduct(id, shell.messageNode).catch(function (error) {
          Admin.showMessage(shell.messageNode, error.message || "Không thể xóa sản phẩm.", "error");
        });
      }
    });

    try {
      state.categories = await Admin.fetchCategories();
      populateCategoryOptions();
      await Promise.all([refreshStats(), loadProducts()]);
      resetProductForm();

      var editTarget = new URLSearchParams(window.location.search).get("edit");
      if (editTarget) {
        fillProductForm(editTarget);
      }
    } catch (error) {
      Admin.showMessage(shell.messageNode, error.message || "Không thể tải trang sản phẩm.", "error");
    }
  });
})();
