(function () {
  // ====== Hằng số cấu hình ======
  var DEFAULT_IMAGE = (window.TamTai && TamTai.DEFAULT_PRODUCT_IMAGE) || "../../images/acer-refurbished-laptop-500x500.webp";
  var LABEL_PRODUCT = "S\u1ea3n ph\u1ea9m";
  var LABEL_EMPTY_CART = "Gi\u1ecf h\u00e0ng \u0111ang tr\u1ed1ng. H\u00e3y th\u00eam s\u1ea3n ph\u1ea9m m\u1edbi nh\u00e9.";
  var LABEL_LOADING_RELATED = "\u0110ang t\u1ea3i g\u1ee3i \u00fd s\u1ea3n ph\u1ea9m...";
  var LABEL_RELATED_FAILED = "Kh\u00f4ng th\u1ec3 t\u1ea3i g\u1ee3i \u00fd l\u00fac n\u00e0y.";
  var LABEL_RELATED_EMPTY = "Ch\u01b0a c\u00f3 g\u1ee3i \u00fd ph\u00f9 h\u1ee3p.";
  var LABEL_ALERT_EMPTY_CHECKOUT = "Gi\u1ecf h\u00e0ng \u0111ang tr\u1ed1ng, ch\u01b0a th\u1ec3 thanh to\u00e1n.";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function toImageSrc(imageUrl) {
    var raw = String(imageUrl || "").trim();
    if (!raw) {
      return DEFAULT_IMAGE;
    }

    if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) {
      return raw;
    }

    if (window.TamTai && typeof TamTai.buildApiUrl === "function") {
      if (raw.startsWith("/")) {
        return TamTai.buildApiUrl(raw);
      }
      return TamTai.buildApiUrl("/" + raw);
    }

    return raw;
  }

  function getOriginalPrice(price, discountPercent) {
    if (!discountPercent || discountPercent <= 0 || discountPercent >= 100) {
      return price;
    }

    return Math.round((price * 100) / (100 - discountPercent));
  }

  // Tạo container #cartItemsContainer nếu chưa có
  function ensureContainer() {
    var cartPanel = document.querySelector(".cart-panel");
    if (!cartPanel) {
      return null;
    }

    var container = cartPanel.querySelector("#cartItemsContainer");
    if (container) {
      return container;
    }

    container = document.createElement("div");
    container.id = "cartItemsContainer";

    cartPanel.querySelectorAll(".cart-item, .empty-cart-note").forEach(function (node) {
      node.remove();
    });

    cartPanel.appendChild(container);
    return container;
  }

  /* === Cập nhật bảng tóm tắt giỏ hàng (tạm tính, phí ship, tổng) === */
  function renderSummary(cart) {
    var summaryRows = document.querySelectorAll(".summary-panel .summary-row");
    var subtotal = cart.reduce(function (sum, item) {
      return sum + toNumber(item.price, 0) * Math.max(1, toNumber(item.qty, 1));
    }, 0);
    var shipping = cart.length > 0 ? 30000 : 0;
    var total = subtotal + shipping;

    if (summaryRows[0]) {
      summaryRows[0].querySelector("strong").textContent = TamTai.formatCurrency(subtotal);
    }
    if (summaryRows[1]) {
      summaryRows[1].querySelector("strong").textContent = TamTai.formatCurrency(shipping);
      summaryRows[1].querySelector("strong").classList.remove("ship");
    }
    if (summaryRows[2]) {
      summaryRows[2].querySelector("strong").textContent = TamTai.formatCurrency(total);
    }

    var titleSpan = document.querySelector(".cart-panel h1 span");
    if (titleSpan) {
      titleSpan.textContent = "(" + cart.length + " s\u1ea3n ph\u1ea9m)";
    }
  }

  /* === Render danh sách sản phẩm trong giỏ hàng === */
  function renderCartItems(cartInput) {
    var container = ensureContainer();
    if (!container) {
      return;
    }

    var cart = Array.isArray(cartInput) ? cartInput : TamTai.getCart();
    if (!cart.length) {
      container.innerHTML = '<p class="empty-cart-note">' + LABEL_EMPTY_CART + '</p>';
      renderSummary([]);
      return;
    }

    container.innerHTML = cart.map(function (item, index) {
      var name = item.name || LABEL_PRODUCT;
      var image = toImageSrc(item.image || DEFAULT_IMAGE);
      var price = toNumber(item.price, 0);
      var oldPrice = toNumber(item.oldPrice, price);
      var qty = Math.max(1, toNumber(item.qty, 1));
      var oldPriceHtml = oldPrice > price
        ? ('    <p class="old-price">' + TamTai.formatCurrency(oldPrice) + '</p>')
        : "";

      return [
        '<div class="cart-item" data-index="' + index + '">',
        '  <div class="item-image"><img src="' + escapeHtml(image) + '" alt="' + escapeHtml(name) + '"></div>',
        '  <div class="item-info">',
        '    <h2>' + escapeHtml(name) + '</h2>',
        oldPriceHtml,
        '    <p class="new-price">' + TamTai.formatCurrency(price) + '</p>',
        '  </div>',
        '  <div class="item-actions">',
        '    <div class="qty-box">',
        '      <button type="button" data-action="minus">-</button>',
        '      <span>' + qty + '</span>',
        '      <button type="button" data-action="plus">+</button>',
        '    </div>',
        '    <button class="remove-btn" type="button" data-action="remove">X\u00f3a</button>',
        '  </div>',
        '</div>'
      ].join("");
    }).join("");

    renderSummary(cart);
  }

  // Chuẩn hóa item giỏ hàng (dùng dữ liệu API nếu có để lấy giá mới nhất)
  function normalizeCartItem(item, apiProduct) {
    var currentId = String((item && (item.productId || item.id)) || "");

    if (!apiProduct) {
      return {
        id: currentId || String((item && item.id) || ""),
        productId: currentId || String((item && item.id) || ""),
        categoryId: item && item.categoryId ? String(item.categoryId) : "",
        name: item && item.name ? String(item.name) : LABEL_PRODUCT,
        price: toNumber(item && item.price, 0),
        oldPrice: toNumber(item && (item.oldPrice || item.price), 0),
        image: toImageSrc(item && item.image),
        qty: Math.max(1, toNumber(item && item.qty, 1))
      };
    }

    var productId = String(apiProduct.product_id || currentId || (item && item.id) || "");
    var price = toNumber(apiProduct.unit_price, toNumber(item && item.price, 0));
    var discount = toNumber(apiProduct.discount_percent, 0);

    return {
      id: productId,
      productId: productId,
      categoryId: String(apiProduct.category_id || (item && item.categoryId) || ""),
      name: String(apiProduct.product_name || (item && item.name) || LABEL_PRODUCT),
      price: price,
      oldPrice: getOriginalPrice(price, discount),
      image: toImageSrc(apiProduct.image_url || (item && item.image) || DEFAULT_IMAGE),
      qty: Math.max(1, toNumber(item && item.qty, 1))
    };
  }

  // So sánh hai item có giống nhau không (dùng để phát hiện thay đổi)
  function isSameItem(a, b) {
    return String(a.id || "") === String(b.id || "")
      && String(a.productId || "") === String(b.productId || "")
      && String(a.categoryId || "") === String(b.categoryId || "")
      && String(a.name || "") === String(b.name || "")
      && toNumber(a.price, 0) === toNumber(b.price, 0)
      && toNumber(a.oldPrice, 0) === toNumber(b.oldPrice, 0)
      && String(a.image || "") === String(b.image || "")
      && toNumber(a.qty, 1) === toNumber(b.qty, 1);
  }

  /* === Đồng bộ giỏ hàng localStorage với API: cập nhật giá mới nhất từ server === */
  async function syncCartWithApi() {
    var cart = TamTai.getCart();
    if (!Array.isArray(cart) || !cart.length) {
      return [];
    }

    if (!window.TamTai || typeof TamTai.fetchJson !== "function") {
      return cart;
    }

    var uniqueIds = [];
    var seen = {};

    cart.forEach(function (item) {
      var id = String((item && (item.productId || item.id)) || "").trim();
      if (!id || seen[id]) {
        return;
      }
      seen[id] = true;
      uniqueIds.push(id);
    });

    if (!uniqueIds.length) {
      return cart;
    }

    var fetchPairs = await Promise.all(uniqueIds.map(async function (id) {
      try {
        var payload = await TamTai.fetchJson("/products/" + encodeURIComponent(id));
        return [id, payload || null];
      } catch (error) {
        return [id, null];
      }
    }));

    var productById = {};
    var successCount = 0;
    fetchPairs.forEach(function (pair) {
      productById[pair[0]] = pair[1];
      if (pair[1]) {
        successCount += 1;
      }
    });

    if (successCount === 0) {
      return cart;
    }

    var changed = false;
    var merged = cart.map(function (item) {
      var id = String((item && (item.productId || item.id)) || "");
      var apiProduct = productById[id] || null;

      if (!apiProduct) {
        changed = true;
        return null;
      }

      var normalized = normalizeCartItem(item, apiProduct);
      if (!changed && !isSameItem(normalized, item || {})) {
        changed = true;
      }

      return normalized;
    }).filter(Boolean);

    if (merged.length !== cart.length) {
      changed = true;
    }

    if (changed) {
      TamTai.saveCart(merged);
    }

    return merged;
  }

  // Tạo HTML thẻ sản phẩm gợi ý
  function buildRelatedCard(product) {
    var id = String(product.product_id || "");
    var name = String(product.product_name || LABEL_PRODUCT);
    var image = toImageSrc(product.image_url || DEFAULT_IMAGE);
    var price = toNumber(product.unit_price, 0);
    var rating = toNumber(product.rating_avg, 0);
    var reviews = toNumber(product.total_reviews, 0);

    return [
      '<article class="related-card" data-product-id="' + escapeHtml(id) + '">',
      '  <div class="related-image"><img src="' + escapeHtml(image) + '" alt="' + escapeHtml(name) + '"></div>',
      '  <h3>' + escapeHtml(name) + '</h3>',
      '  <p class="related-price">' + TamTai.formatCurrency(price) + '</p>',
      '  <p class="rating"><i class="fa-solid fa-star"></i> ' + escapeHtml(rating.toFixed(1)) + ' - ' + escapeHtml(reviews) + '</p>',
      '</article>'
    ].join("");
  }

  // Sắp xếp sản phẩm gợi ý: theo đánh giá, lượt mua, tồn kho
  function sortRelatedProducts(a, b) {
    var bReviews = toNumber(b.total_reviews, 0);
    var aReviews = toNumber(a.total_reviews, 0);
    if (bReviews !== aReviews) {
      return bReviews - aReviews;
    }

    var bRating = toNumber(b.rating_avg, 0);
    var aRating = toNumber(a.rating_avg, 0);
    if (bRating !== aRating) {
      return bRating - aRating;
    }

    return toNumber(b.stock_quantity, 0) - toNumber(a.stock_quantity, 0);
  }

  /* === Render danh sách sản phẩm gợi ý dưới giỏ hàng === */
  async function renderRelatedProducts(cartInput) {
    var grid = document.querySelector(".related-grid");
    if (!grid) {
      return;
    }

    grid.innerHTML = '<p class="related-empty-note">' + LABEL_LOADING_RELATED + '</p>';

    if (!window.TamTai || typeof TamTai.fetchJson !== "function") {
      grid.innerHTML = '<p class="related-empty-note">' + LABEL_RELATED_FAILED + '</p>';
      return;
    }

    try {
      var products = await TamTai.fetchJson("/products?skip=0&limit=500");
      var list = Array.isArray(products) ? products : [];

      var cart = Array.isArray(cartInput) ? cartInput : TamTai.getCart();
      var cartIds = {};
      cart.forEach(function (item) {
        var id = String((item && (item.productId || item.id)) || "").trim();
        if (id) {
          cartIds[id] = true;
        }
      });

      var related = list
        .filter(function (product) {
          var id = String(product.product_id || "").trim();
          return id && !cartIds[id];
        })
        .sort(sortRelatedProducts)
        .slice(0, 4);

      if (!related.length) {
        grid.innerHTML = '<p class="related-empty-note">' + LABEL_RELATED_EMPTY + '</p>';
        return;
      }

      grid.innerHTML = related.map(buildRelatedCard).join("");
    } catch (error) {
      grid.innerHTML = '<p class="related-empty-note">' + LABEL_RELATED_FAILED + '</p>';
    }
  }

  // Xử lý thay đổi số lượng (+) / (-) hoặc xóa sản phẩm khỏi giỏ
  function updateItem(index, action) {
    var cart = TamTai.getCart();
    var item = cart[index];
    if (!item) {
      return;
    }

    if (action === "minus") {
      item.qty = Math.max(1, toNumber(item.qty, 1) - 1);
    } else if (action === "plus") {
      item.qty = toNumber(item.qty, 1) + 1;
    } else if (action === "remove") {
      cart.splice(index, 1);
    }

    TamTai.saveCart(cart);
    renderCartItems(cart);
    renderRelatedProducts(cart);
  }

  /* === Khởi tạo trang giỏ hàng === */
  document.addEventListener("DOMContentLoaded", async function () {
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");

    var latestCart = await syncCartWithApi();  // Tải giỏ hàng + đồng bộ giá
    renderCartItems(latestCart);                // Render danh sách sản phẩm
    await renderRelatedProducts(latestCart);    // Render gợi ý sản phẩm

    // Xử lý sự kiện click vào nút + / - / Xóa trong giỏ hàng
    var container = ensureContainer();
    if (container) {
      container.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-action]");
        if (!button) {
          return;
        }

        var row = button.closest(".cart-item");
        if (!row) {
          return;
        }

        var index = Number(row.getAttribute("data-index"));
        var action = button.getAttribute("data-action");
        updateItem(index, action);
      });
    }

    // Click vào sản phẩm gợi ý -> điều hướng đến trang chi tiết
    var relatedGrid = document.querySelector(".related-grid");
    if (relatedGrid) {
      relatedGrid.addEventListener("click", function (event) {
        var card = event.target.closest(".related-card[data-product-id]");
        if (!card) {
          return;
        }

        var productId = card.getAttribute("data-product-id");
        if (!productId) {
          return;
        }

        window.location.href = "../products/product-detail.html?id=" + encodeURIComponent(productId);
      });
    }

    // Nút "Thanh toán": kiểm tra giỏ hàng trống trước khi chuyển trang
    var checkoutBtn = document.querySelector(".checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", function (event) {
        if (TamTai.getCart().length === 0) {
          event.preventDefault();
          alert(LABEL_ALERT_EMPTY_CHECKOUT);
        }
      });
    }
  });
})();
