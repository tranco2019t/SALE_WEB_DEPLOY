(function () {
  var DEFAULT_IMAGE = (window.TamTai && TamTai.DEFAULT_PRODUCT_IMAGE) || "../../images/acer-refurbished-laptop-500x500.webp";

  function getQuery(name, fallback) {
    var value = new URLSearchParams(window.location.search).get(name);
    if (value === null || value === undefined || value === "") {
      return fallback;
    }
    return value;
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

  function setupQuantity() {
    var qtyBox = document.querySelector(".qty-box");
    if (!qtyBox) {
      return function () { return 1; };
    }

    var buttons = qtyBox.querySelectorAll("button");
    var valueEl = qtyBox.querySelector("span");
    var qty = Number(valueEl ? valueEl.textContent : 1);
    if (!qty || qty < 1) {
      qty = 1;
    }

    function update() {
      if (valueEl) {
        valueEl.textContent = String(qty);
      }
    }

    if (buttons[0]) {
      buttons[0].addEventListener("click", function () {
        qty = Math.max(1, qty - 1);
        update();
      });
    }

    if (buttons[1]) {
      buttons[1].addEventListener("click", function () {
        qty += 1;
        update();
      });
    }

    update();
    return function () { return qty; };
  }

  function buildStarsMarkup(rating) {
    var safeRating = Math.max(0, Math.min(5, Number(rating || 0)));
    var full = Math.round(safeRating);
    var html = "";

    for (var i = 1; i <= 5; i += 1) {
      html += i <= full ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    }

    return html;
  }

  function mapApiProduct(raw) {
    var price = toNumber(raw.unit_price, 0);
    var discountPercent = toNumber(raw.discount_percent, 0);

    return {
      id: String(raw.product_id),
      categoryId: String(raw.category_id || ""),
      name: String(raw.product_name || "S\u1ea3n ph\u1ea9m"),
      description: String(raw.description || "\u0110ang c\u1eadp nh\u1eadt m\u00f4 t\u1ea3."),
      image: toImageSrc(raw.image_url),
      price: price,
      discountPercent: discountPercent,
      oldPrice: getOriginalPrice(price, discountPercent),
      ratingAvg: toNumber(raw.rating_avg, 0),
      totalReviews: toNumber(raw.total_reviews, 0),
      stockQuantity: toNumber(raw.stock_quantity, 0)
    };
  }

  function buildFallbackProduct() {
    var name = getQuery("name", "S\u1ea3n ph\u1ea9m");
    var price = toNumber(getQuery("price", "0"), 0);
    var image = toImageSrc(getQuery("image", DEFAULT_IMAGE));
    var id = getQuery("id", "product-fallback");

    return {
      id: id,
      categoryId: "",
      name: name,
      description: "Th\u00f4ng tin chi ti\u1ebft s\u1ebd \u0111\u01b0\u1ee3c c\u1eadp nh\u1eadt sau.",
      image: image,
      price: price,
      discountPercent: 0,
      oldPrice: price,
      ratingAvg: 0,
      totalReviews: 0,
      stockQuantity: 0
    };
  }

  function renderProduct(product, categoryName) {
    var title = document.querySelector(".info-area h2");
    var priceEl = document.querySelector(".price");
    var imageEl = document.querySelector(".image-box img");
    var descEl = document.querySelector(".desc");
    var tagEl = document.querySelector(".tag");
    var breadcrumbCurrent = document.querySelector(".breadcrumb-row strong");
    var breadcrumbCategory = document.querySelector(".breadcrumb-row a[href='products.html']");
    var starsEl = document.querySelector(".stars");
    var ratingTextEl = document.querySelector(".rating-row span:not(.stars)");
    var addCartBtn = document.querySelector(".btn-cart");
    var buyNowBtn = document.querySelector(".btn-buy");

    if (title) {
      title.textContent = product.name;
    }

    if (priceEl) {
      priceEl.textContent = TamTai.formatCurrency(product.price);
    }

    if (imageEl) {
      imageEl.src = product.image;
      imageEl.alt = product.name;
    }

    if (descEl) {
      descEl.textContent = product.description;
    }

    if (tagEl) {
      tagEl.textContent = categoryName || product.categoryId || "S\u1ea3n ph\u1ea9m";
    }

    if (breadcrumbCurrent) {
      breadcrumbCurrent.textContent = product.name;
    }

    if (breadcrumbCategory) {
      breadcrumbCategory.textContent = categoryName || "S\u1ea3n ph\u1ea9m";
      breadcrumbCategory.href = "products.html" + (product.categoryId ? ("?category=" + encodeURIComponent(product.categoryId)) : "");
    }

    if (starsEl) {
      starsEl.innerHTML = buildStarsMarkup(product.ratingAvg);
    }

    if (ratingTextEl) {
      ratingTextEl.textContent = product.ratingAvg.toFixed(1) + " | " + product.totalReviews + " \u0111\u00e1nh gi\u00e1";
    }

    if (addCartBtn) {
      addCartBtn.style.display = "inline-flex";
    }

    if (buyNowBtn) {
      buyNowBtn.style.display = "inline-flex";
    }

    document.title = product.name + " - TAM TAI";
  }

  function toCartItem(product) {
    return {
      id: product.id,
      productId: product.id,
      categoryId: product.categoryId,
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      image: product.image
    };
  }

  async function loadCategoryName(categoryId) {
    if (!categoryId) {
      return "";
    }

    try {
      var payload = await TamTai.fetchJson("/categories/" + encodeURIComponent(categoryId));
      return payload && payload.category_name ? String(payload.category_name) : "";
    } catch (error) {
      return "";
    }
  }

  document.addEventListener("DOMContentLoaded", async function () {
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");

    var getQty = setupQuantity();
    var productId = getQuery("id", "");
    var product = null;
    var categoryName = "";

    if (productId) {
      try {
        var payload = await TamTai.fetchJson("/products/" + encodeURIComponent(productId));
        product = mapApiProduct(payload || {});
        categoryName = await loadCategoryName(product.categoryId);
      } catch (error) {
        product = null;
      }
    }

    if (!product) {
      product = buildFallbackProduct();
    }

    renderProduct(product, categoryName);

    var addCartBtn = document.querySelector(".btn-cart");
    if (addCartBtn) {
      addCartBtn.addEventListener("click", function (event) {
        event.preventDefault();
        TamTai.addToCart(toCartItem(product), getQty());
        TamTai.flyToCart(addCartBtn, product.image);
      });
    }

    var buyNowBtn = document.querySelector(".btn-buy");
    if (buyNowBtn) {
      buyNowBtn.addEventListener("click", function (event) {
        event.preventDefault();
        TamTai.addToCart(toCartItem(product), getQty());
        window.location.href = "../cart/checkout.html?from=buy-now";
      });
    }
  });
})();

