(function () {
  var DEFAULT_IMAGE = (window.TamTai && TamTai.DEFAULT_PRODUCT_IMAGE) || "../../images/acer-refurbished-laptop-500x500.webp";
  var HERO_ROTATE_MS = 3000;
  var HERO_MAX_SLIDES = 8;

  var CATEGORY_PRIORITY = [
    "CAT_PHONE",
    "CAT_LAPTOP",
    "CAT_HEADPHONE",
    "CAT_SMARTWATCH",
    "CAT_KEYBOARD",
    "CAT_MOUSE"
  ];

  var CATEGORY_LABELS = {
    CAT_PHONE: "\u0110i\u1ec7n tho\u1ea1i",
    CAT_LAPTOP: "Laptop",
    CAT_HEADPHONE: "Tai nghe",
    CAT_SMARTWATCH: "\u0110\u1ed3ng h\u1ed3 th\u00f4ng minh",
    CAT_KEYBOARD: "B\u00e0n ph\u00edm",
    CAT_MOUSE: "Chu\u1ed9t m\u00e1y t\u00ednh"
  };

  function normalizeText(value) {
    if (window.TamTai && typeof TamTai.normalizeText === "function") {
      return TamTai.normalizeText(value);
    }

    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

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

  function formatCount(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  }

  function categoryLabel(categoryId, fallbackName) {
    if (CATEGORY_LABELS[categoryId]) {
      return CATEGORY_LABELS[categoryId];
    }

    var normalized = normalizeText(fallbackName || "");
    if (normalized === "dien thoai") {
      return "\u0110i\u1ec7n tho\u1ea1i";
    }
    if (normalized === "dong ho thong minh") {
      return "\u0110\u1ed3ng h\u1ed3 th\u00f4ng minh";
    }
    if (normalized === "ban phim") {
      return "B\u00e0n ph\u00edm";
    }
    if (normalized === "chuot may tinh") {
      return "Chu\u1ed9t m\u00e1y t\u00ednh";
    }

    return fallbackName || categoryId || "Kh\u00e1c";
  }

  function getCategoryPriority(categoryId) {
    var idx = CATEGORY_PRIORITY.indexOf(categoryId);
    return idx === -1 ? 999 : idx;
  }

  function compareCategories(a, b) {
    var pa = getCategoryPriority(a.category_id);
    var pb = getCategoryPriority(b.category_id);
    if (pa !== pb) {
      return pa - pb;
    }

    return categoryLabel(a.category_id, a.category_name).localeCompare(categoryLabel(b.category_id, b.category_name), "vi");
  }

  function resolveCategoryId(name, categoriesById) {
    var normalized = normalizeText(name);
    if (!normalized) {
      return "";
    }

    var aliases = {
      "dien thoai": "CAT_PHONE",
      "laptop": "CAT_LAPTOP",
      "tai nghe": "CAT_HEADPHONE",
      "dong ho": "CAT_SMARTWATCH",
      "dong ho thong minh": "CAT_SMARTWATCH",
      "ban phim": "CAT_KEYBOARD",
      "chuot": "CAT_MOUSE",
      "chuot may tinh": "CAT_MOUSE"
    };

    if (aliases[normalized] && categoriesById[aliases[normalized]]) {
      return aliases[normalized];
    }

    var matched = Object.values(categoriesById).find(function (category) {
      var categoryName = normalizeText(categoryLabel(category.category_id, category.category_name));
      return normalized === categoryName || normalized.indexOf(categoryName) !== -1 || categoryName.indexOf(normalized) !== -1;
    });

    return matched ? matched.category_id : "";
  }

  function setStatValue(key, value) {
    var node = document.querySelector('[data-stat="' + key + '"]');
    if (!node) {
      return;
    }

    node.textContent = String(value);
  }

  function renderStats(products, categories) {
    var productCount = products.length;

    var categoryCounts = {};
    products.forEach(function (product) {
      var categoryId = String(product.category_id || "");
      categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
    });

    var categoryCount = categories.filter(function (category) {
      return (categoryCounts[category.category_id] || 0) > 0;
    }).length;

    if (!categoryCount) {
      categoryCount = Object.keys(categoryCounts).filter(Boolean).length;
    }

    var ratings = products
      .map(function (product) { return toNumber(product.rating_avg, 0); })
      .filter(function (rating) { return rating > 0; });

    var avgRating = ratings.length
      ? (ratings.reduce(function (sum, value) { return sum + value; }, 0) / ratings.length)
      : 0;

    var totalReviews = products.reduce(function (sum, product) {
      return sum + toNumber(product.total_reviews, 0);
    }, 0);

    setStatValue("product-count", formatCount(productCount));
    setStatValue("category-count", formatCount(categoryCount));
    setStatValue("avg-rating", avgRating ? avgRating.toFixed(1) : "0.0");
    setStatValue("total-reviews", formatCount(totalReviews));
  }

  function renderCategoryCards(categories, products) {
    var grid = document.querySelector(".category-grid");
    if (!grid) {
      return;
    }

    var counts = {};
    products.forEach(function (product) {
      var categoryId = String(product.category_id || "");
      counts[categoryId] = (counts[categoryId] || 0) + 1;
    });

    var list = categories
      .filter(function (category) {
        return (counts[category.category_id] || 0) > 0;
      })
      .sort(compareCategories)
      .slice(0, 6);

    if (!list.length) {
      return;
    }

    grid.innerHTML = list.map(function (category) {
      var label = categoryLabel(category.category_id, category.category_name);
      var count = counts[category.category_id] || 0;

      return [
        '<article class="category-card" data-category-id="' + escapeHtml(category.category_id) + '">',
        '  <h3>' + escapeHtml(label) + '</h3>',
        '  <p>' + escapeHtml(formatCount(count)) + ' \u0073\u1ea3n ph\u1ea9m</p>',
        '</article>'
      ].join("");
    }).join("");
  }

  function bindCategoryNavigation(categoriesById) {
    var grid = document.querySelector(".category-grid");
    if (!grid) {
      return;
    }

    grid.addEventListener("click", function (event) {
      var card = event.target.closest(".category-card");
      if (!card) {
        return;
      }

      var categoryId = card.getAttribute("data-category-id") || "";
      if (!categoryId) {
        var label = (card.querySelector("h3") ? card.querySelector("h3").textContent : card.textContent).trim();
        categoryId = resolveCategoryId(label, categoriesById);
      }

      if (categoryId) {
        window.location.href = "../products/products.html?category=" + encodeURIComponent(categoryId);
        return;
      }

      window.location.href = "../products/products.html";
    });
  }

  function buildHeroSlides(products, categoriesById) {
    var seenImages = {};

    return products
      .slice()
      .sort(function (a, b) {
        var bReviews = toNumber(b.total_reviews, 0);
        var aReviews = toNumber(a.total_reviews, 0);
        if (bReviews !== aReviews) {
          return bReviews - aReviews;
        }

        var bRating = toNumber(b.rating_avg, 0);
        var aRating = toNumber(a.rating_avg, 0);
        return bRating - aRating;
      })
      .filter(function (product) {
        var image = toImageSrc(product.image_url);
        if (!image || seenImages[image]) {
          return false;
        }

        seenImages[image] = true;
        return true;
      })
      .slice(0, HERO_MAX_SLIDES)
      .map(function (product) {
        var category = categoriesById[product.category_id] || null;

        return {
          id: String(product.product_id || ""),
          name: String(product.product_name || "\u0053\u1ea3n ph\u1ea9m n\u1ed5i b\u1eadt"),
          tag: categoryLabel(product.category_id, category && category.category_name),
          image: toImageSrc(product.image_url)
        };
      });
  }

  function setupHeroSlider(slides) {
    var media = document.querySelector(".hero-media");
    if (!media || !slides.length) {
      return;
    }

    var frame = media.querySelector(".hero-media-frame");
    var imageEl = media.querySelector(".hero-media-image");
    var tagEl = media.querySelector(".hero-media-tag");
    var titleEl = media.querySelector(".hero-media-title");
    var dotsWrap = media.querySelector(".hero-media-dots");
    var prevBtn = media.querySelector(".hero-prev");
    var nextBtn = media.querySelector(".hero-next");

    if (!frame || !imageEl || !tagEl || !titleEl || !dotsWrap) {
      return;
    }

    var currentIndex = 0;
    var timerId = null;

    function navigateToDetail() {
      var activeSlide = slides[currentIndex];
      if (!activeSlide || !activeSlide.id) {
        window.location.href = "../products/products.html";
        return;
      }

      window.location.href = "../products/product-detail.html?id=" + encodeURIComponent(activeSlide.id);
    }

    function render(index) {
      currentIndex = (index + slides.length) % slides.length;
      var slide = slides[currentIndex];

      imageEl.style.opacity = "0";
      setTimeout(function () {
        imageEl.src = slide.image;
        imageEl.alt = slide.name;
        tagEl.textContent = slide.tag;
        titleEl.textContent = slide.name;
        imageEl.style.opacity = "1";
      }, 60);

      dotsWrap.querySelectorAll(".hero-dot").forEach(function (dot, dotIndex) {
        dot.classList.toggle("active", dotIndex === currentIndex);
      });
    }

    function stopAuto() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    function startAuto() {
      if (slides.length <= 1) {
        return;
      }

      stopAuto();
      timerId = setInterval(function () {
        render(currentIndex + 1);
      }, HERO_ROTATE_MS);
    }

    function restartAuto() {
      stopAuto();
      startAuto();
    }

    dotsWrap.innerHTML = slides.map(function (_, index) {
      return '<button type="button" class="hero-dot" data-index="' + index + '" aria-label="\u1ea2nh ' + (index + 1) + '"></button>';
    }).join("");

    dotsWrap.addEventListener("click", function (event) {
      var dot = event.target.closest(".hero-dot");
      if (!dot) {
        return;
      }

      var index = Number(dot.getAttribute("data-index"));
      if (!Number.isFinite(index)) {
        return;
      }

      render(index);
      restartAuto();
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        render(currentIndex - 1);
        restartAuto();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        render(currentIndex + 1);
        restartAuto();
      });
    }

    frame.addEventListener("click", navigateToDetail);
    frame.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigateToDetail();
      }
    });

    media.addEventListener("mouseenter", stopAuto);
    media.addEventListener("mouseleave", startAuto);

    if (slides.length <= 1) {
      if (prevBtn) {
        prevBtn.style.display = "none";
      }
      if (nextBtn) {
        nextBtn.style.display = "none";
      }
      dotsWrap.style.display = "none";
    }

    render(0);
    startAuto();
  }

  function isUserLoggedIn() {
    var token = localStorage.getItem("access_token");
    return Boolean(token && String(token).trim());
  }

  function setupActionTracking() {
    var actionButtons = document.querySelectorAll(".btn-primary, .btn-secondary");
    actionButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        localStorage.setItem("tamtai_last_entry", "landing");
      });
    });

    var accountButton = document.querySelector(".hero-actions .btn-secondary");
    if (!accountButton) {
      return;
    }

    function resolveAccountTarget() {
      return isUserLoggedIn() ? "../user/profile.html" : "../auth/login.html";
    }

    accountButton.setAttribute("href", resolveAccountTarget());

    accountButton.addEventListener("click", function (event) {
      event.preventDefault();
      var target = resolveAccountTarget();
      accountButton.setAttribute("href", target);
      window.location.href = target;
    });
  }

  function renderFallbackFacts() {
    setStatValue("product-count", "60");
    setStatValue("category-count", "6");
  }

  async function loadLandingData() {
    if (!window.TamTai || typeof TamTai.fetchJson !== "function") {
      renderFallbackFacts();
      setupHeroSlider([
        { id: "", name: "\u004b\u0068\u00e1m ph\u00e1 60 s\u1ea3n ph\u1ea9m c\u00f4ng ngh\u1ec7", tag: "\u0053\u1ea3n ph\u1ea9m n\u1ed5i b\u1eadt", image: DEFAULT_IMAGE }
      ]);
      return;
    }

    try {
      var categoriesData = await TamTai.fetchJson("/categories?skip=0&limit=100");
      var productsData = await TamTai.fetchJson("/products?skip=0&limit=500");

      var categories = Array.isArray(categoriesData) ? categoriesData : [];
      var products = Array.isArray(productsData) ? productsData : [];

      var categoriesById = {};
      categories.forEach(function (category) {
        categoriesById[category.category_id] = category;
      });

      renderStats(products, categories);
      renderCategoryCards(categories, products);
      bindCategoryNavigation(categoriesById);

      var slides = buildHeroSlides(products, categoriesById);
      if (!slides.length) {
        slides = [{ id: "", name: "\u004b\u0068\u00e1m ph\u00e1 60 s\u1ea3n ph\u1ea9m c\u00f4ng ngh\u1ec7", tag: "\u0053\u1ea3n ph\u1ea9m n\u1ed5i b\u1eadt", image: DEFAULT_IMAGE }];
      }

      setupHeroSlider(slides);
    } catch (error) {
      renderFallbackFacts();
      bindCategoryNavigation({});
      setupHeroSlider([
        { id: "", name: "\u004b\u0068\u00e1m ph\u00e1 60 s\u1ea3n ph\u1ea9m c\u00f4ng ngh\u1ec7", tag: "\u0053\u1ea3n ph\u1ea9m n\u1ed5i b\u1eadt", image: DEFAULT_IMAGE }
      ]);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupActionTracking();
    loadLandingData();
  });
})();
