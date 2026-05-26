(function () {
  // ====== Khởi tạo hằng số và cấu hình mặc định ======
  var DEFAULT_IMAGE = (window.TamTai && TamTai.DEFAULT_PRODUCT_IMAGE) || "../../images/acer-refurbished-laptop-500x500.webp";
  var BASE_VISIBLE_ITEMS = 9;

  // Định nghĩa danh mục ưu tiên và nhãn hiển thị
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

  var PRICE_MIN = 0;
  var PRICE_MAX = 50000000;

  // Hàm tiện ích: thoát HTML để tránh XSS
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Chuẩn hóa chuỗi (bỏ dấu, lowercase) để tìm kiếm
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

  // Chuyển đổi giá trị sang số, nếu không hợp lệ trả về fallback
  function toNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  // Chuyển đổi đường dẫn ảnh sang URL đầy đủ
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

  // Lấy tên hiển thị của danh mục theo ID
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

  // Lấy chỉ số ưu tiên sắp xếp danh mục
  function getCategoryPriority(categoryId) {
    var idx = CATEGORY_PRIORITY.indexOf(categoryId);
    return idx === -1 ? 999 : idx;
  }

  // So sánh hai danh mục để sắp xếp
  function compareCategories(a, b) {
    var pa = getCategoryPriority(a.category_id);
    var pb = getCategoryPriority(b.category_id);
    if (pa !== pb) {
      return pa - pb;
    }
    return categoryLabel(a.category_id, a.category_name).localeCompare(categoryLabel(b.category_id, b.category_name), "vi");
  }

  // Kiểm tra xem categoryId có thuộc danh mục chính không
  function isPrimaryCategoryId(categoryId) {
    return CATEGORY_PRIORITY.indexOf(String(categoryId || "")) !== -1;
  }

  // Tính giá gốc trước khi giảm dựa trên giá hiện tại và % giảm
  function getPriceBeforeDiscount(price, discountPercent) {
    if (!discountPercent || discountPercent <= 0 || discountPercent >= 100) {
      return price;
    }

    var before = (price * 100) / (100 - discountPercent);
    return Math.round(before);
  }

  // Xác định ID danh mục từ chuỗi truy vấn (hỗ trợ tên tiếng Việt và alias)
  function resolveCategoryIdFromQuery(rawCategory, categoriesById) {
    if (!rawCategory) {
      return "";
    }

    var input = String(rawCategory).trim();
    if (!input) {
      return "";
    }

    if (categoriesById[input]) {
      return input;
    }

    var normalized = normalizeText(input);
    var aliases = {
      "dien thoai": "CAT_PHONE",
      "laptop": "CAT_LAPTOP",
      "tai nghe": "CAT_HEADPHONE",
      "dong ho": "CAT_SMARTWATCH",
      "dong ho thong minh": "CAT_SMARTWATCH",
      "ban phim": "CAT_KEYBOARD",
      "chuot": "CAT_MOUSE",
      "chuot may tinh": "CAT_MOUSE",
      "phone": "CAT_PHONE",
      "headphone": "CAT_HEADPHONE",
      "watch": "CAT_SMARTWATCH",
      "keyboard": "CAT_KEYBOARD",
      "mouse": "CAT_MOUSE"
    };

    if (aliases[normalized] && categoriesById[aliases[normalized]]) {
      return aliases[normalized];
    }

    var matched = Object.values(categoriesById).find(function (category) {
      var categoryName = normalizeText(categoryLabel(category.category_id, category.category_name));
      return categoryName === normalized || categoryName.indexOf(normalized) !== -1 || normalized.indexOf(categoryName) !== -1;
    });

    return matched ? matched.category_id : "";
  }

  // Sắp xếp danh sách sản phẩm theo chế độ: 0-mặc định, 1-giá tăng, 2-giá giảm
  function sortProducts(list, sortMode) {
    var cloned = list.slice();

    if (sortMode === 1) {
      cloned.sort(function (a, b) { return a.price - b.price; });
    } else if (sortMode === 2) {
      cloned.sort(function (a, b) { return b.price - a.price; });
    } else {
      cloned.sort(function (a, b) { return a.orderIndex - b.orderIndex; });
    }

    return cloned;
  }

  // Kiểm tra giá nằm trong khoảng [min, max]
  function matchPriceRange(price, min, max) {
    return price >= min && price <= max;
  }

  // Xây dựng HTML cho một thẻ sản phẩm trong lưới
  function buildProductCard(product) {
    var oldPrice = getPriceBeforeDiscount(product.price, product.discountPercent);
    var hasDiscount = oldPrice > product.price;

    return [
      '<article class="product-card" data-product-id="' + escapeHtml(product.id) + '">',
      '  <div class="product-image"><img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '"></div>',
      '  <h3>' + escapeHtml(product.name) + '</h3>',
      '  <div class="price-row">',
      '    <p class="current-price">' + TamTai.formatCurrency(product.price) + '</p>',
      hasDiscount ? ('    <span class="old-price">' + TamTai.formatCurrency(oldPrice) + '</span>') : '',
      hasDiscount ? ('    <span class="discount-badge">-' + escapeHtml(product.discountPercent) + '%</span>') : '',
      '  </div>',
      '  <div class="product-extra">',
      '    <span class="rating"><i class="fa-solid fa-star"></i> ' + escapeHtml(product.ratingAvg.toFixed(1)) + ' (' + escapeHtml(product.totalReviews) + ')</span>',
      '    <span>T\u1ed3n: ' + escapeHtml(product.stockQuantity) + '</span>',
      '  </div>',
      '  <div class="product-actions">',
      '    <button type="button" class="btn-add-cart" data-action="add-cart">Th\u00eam v\u00e0o gi\u1ecf</button>',
      '    <button type="button" class="btn-buy-now" data-action="buy-now">Mua ngay</button>',
      '  </div>',
      '</article>'
    ].join('');
  }

  // Chuyển đổi đối tượng sản phẩm thành item để thêm vào giỏ hàng
  function toCartItem(product) {
    return {
      id: product.id,
      productId: product.id,
      categoryId: product.categoryId,
      name: product.name,
      price: product.price,
      oldPrice: getPriceBeforeDiscount(product.price, product.discountPercent),
      image: product.image
    };
  }

  // Kiểm tra trạng thái đăng nhập của người dùng
  function isLoggedIn() {
    var token = localStorage.getItem('access_token');
    var hasToken = Boolean(token && String(token).trim());
    if (!hasToken) {
      return false;
    }

    if (window.TamTai && typeof TamTai.getRole === 'function') {
      return TamTai.getRole() !== 'guest';
    }

    var role = localStorage.getItem('tamtai_role') || 'guest';
    return role !== 'guest';
  }

  // Ẩn/hiện các phần tử chỉ dành cho khách (chưa đăng nhập)
  function toggleGuestOnlyElements() {
    var loggedIn = isLoggedIn();
    var guestOnlyElements = document.querySelectorAll('[data-guest-only]');

    guestOnlyElements.forEach(function (element) {
      element.style.display = loggedIn ? 'none' : '';
    });
  }

  // Tải dữ liệu danh mục và sản phẩm từ API, chuẩn hóa về cấu trúc chung
  async function loadCatalog() {
    var categoriesData = await TamTai.fetchJson('/categories?skip=0&limit=100');
    var productsData = await TamTai.fetchJson('/products?skip=0&limit=500');

    var categories = Array.isArray(categoriesData) ? categoriesData : [];
    var products = Array.isArray(productsData) ? productsData : [];

    var categoriesById = {};
    categories.forEach(function (category) {
      categoriesById[category.category_id] = category;
    });

    var normalizedProducts = products
      .filter(function (product) {
        return isPrimaryCategoryId(product.category_id);
      })
      .map(function (product, index) {
        var category = categoriesById[product.category_id] || null;

        return {
          id: String(product.product_id),
          categoryId: String(product.category_id || ''),
          categoryName: categoryLabel(product.category_id, category && category.category_name),
          name: String(product.product_name || 'S\u1ea3n ph\u1ea9m'),
          description: String(product.description || ''),
          image: toImageSrc(product.image_url),
          price: toNumber(product.unit_price, 0),
          discountPercent: toNumber(product.discount_percent, 0),
          stockQuantity: toNumber(product.stock_quantity, 0),
          ratingAvg: toNumber(product.rating_avg, 0),
          totalReviews: toNumber(product.total_reviews, 0),
          orderIndex: index
        };
      });

    return {
      categories: categories,
      categoriesById: categoriesById,
      products: normalizedProducts
    };
  }

  // Render bộ lọc danh mục (checkbox cho từng danh mục)
  function renderCategoryFilters(filterBlock, categories, categoryCounts) {
    if (!filterBlock) {
      return;
    }

    var total = categories.reduce(function (sum, category) {
      return sum + (categoryCounts[category.category_id] || 0);
    }, 0);

    var html = [];
    html.push('<h2>Danh m\u1ee5c</h2>');
    html.push('<label><input type="checkbox" data-filter-type="category" data-category="all"> T\u1ea5t c\u1ea3 (' + total + ')</label>');

    categories.forEach(function (category) {
      var count = categoryCounts[category.category_id] || 0;
      html.push(
        '<label><input type="checkbox" data-filter-type="category" data-category="' + escapeHtml(category.category_id) + '"> '
        + escapeHtml(categoryLabel(category.category_id, category.category_name))
        + ' (' + count + ')</label>'
      );
    });

    filterBlock.innerHTML = html.join('');
  }

  // Render bộ lọc khoảng giá (thanh trượt kép min-max)
  function renderPriceFilters(filterBlock, minVal, maxVal) {
    if (!filterBlock) {
      return;
    }

    function fmt(v) { return Number(v).toLocaleString("vi-VN") + "\u20ab"; }

    filterBlock.innerHTML = [
      '<h2>Kho\u1ea3ng gi\u00e1</h2>',
      '<div class="price-slider-wrap">',
      '  <div class="price-slider-track">',
      '    <div class="price-slider-fill" id="priceSliderFill"></div>',
      '  </div>',
      '  <input type="range" class="price-range price-range-min" id="priceRangeMin" min="0" max="50000000" step="10000" value="' + minVal + '">',
      '  <input type="range" class="price-range price-range-max" id="priceRangeMax" min="0" max="50000000" step="10000" value="' + maxVal + '">',
      '  <div class="price-slider-values">',
      '    <span id="priceLabelMin">' + fmt(minVal) + '</span>',
      '    <span id="priceLabelMax">' + fmt(maxVal) + '</span>',
      '  </div>',
      '</div>'
    ].join('');
  }

  // Đồng bộ trạng thái checkbox danh mục với state
  function syncCategoryInputs(filterBlock, selectedCategories) {
    if (!filterBlock) {
      return;
    }

    filterBlock.querySelectorAll('input[data-filter-type="category"]').forEach(function (input) {
      var value = input.getAttribute('data-category');
      if (value === 'all') {
        input.checked = selectedCategories.size === 0;
      } else {
        input.checked = selectedCategories.has(value);
      }
    });
  }

  // Đồng bộ giá trị thanh trượt giá với state
  function syncPriceInputs(filterBlock, min, max) {
    var minEl = filterBlock && filterBlock.querySelector("#priceRangeMin");
    var maxEl = filterBlock && filterBlock.querySelector("#priceRangeMax");
    if (minEl) minEl.value = min;
    if (maxEl) maxEl.value = max;
  }

  // Gán data-category-id cho các nút danh mục nhanh (quick items)
  function attachQuickCategoryIds(quickItems, categoriesById) {
    quickItems.forEach(function (item) {
      var label = normalizeText(item.textContent);
      var categoryId = resolveCategoryIdFromQuery(label, categoriesById);
      if (categoryId) {
        item.setAttribute('data-category-id', categoryId);
      }
    });
  }

  // Đồng bộ trạng thái active của các nút danh mục nhanh
  function syncQuickItems(quickItems, selectedCategories) {
    quickItems.forEach(function (item) {
      var itemCategoryId = item.getAttribute('data-category-id') || '';
      var active = selectedCategories.size === 1 && selectedCategories.has(itemCategoryId);
      item.classList.toggle('active', active);
    });
  }

  /* === Slider ảnh hero (tự động chuyển slide) === */
  function setupHeroSlides(allProducts) {
    var frame = document.querySelector(".hero-img-frame");
    var img = frame && frame.querySelector("img");
    var prevBtn = document.querySelector(".hero-img-prev");
    var nextBtn = document.querySelector(".hero-img-next");
    var dotsWrap = document.querySelector(".hero-img-dots");
    if (!img || !prevBtn || !nextBtn || !dotsWrap) return;

    var slides = allProducts.slice(0, 8).filter(function (p) { return p.image; });
    if (!slides.length) return;

    var idx = 0;
    dotsWrap.innerHTML = slides.map(function (_, i) {
      return '<button type="button" class="hero-img-dot' + (i === 0 ? " is-active" : "") + '" data-idx="' + i + '"></button>';
    }).join("");

    function go(i) {
      idx = (i + slides.length) % slides.length;
      img.style.opacity = "0";
      setTimeout(function () {
        img.src = slides[idx].image;
        img.alt = slides[idx].name;
        img.style.opacity = "1";
      }, 80);
      dotsWrap.querySelectorAll(".hero-img-dot").forEach(function (d, di) {
        d.classList.toggle("is-active", di === idx);
      });
    }

    prevBtn.addEventListener("click", function (e) { e.preventDefault(); go(idx - 1); });
    nextBtn.addEventListener("click", function (e) { e.preventDefault(); go(idx + 1); });
    dotsWrap.addEventListener("click", function (e) {
      var dot = e.target.closest(".hero-img-dot");
      if (dot) go(Number(dot.getAttribute("data-idx")));
    });

    img.style.transition = "opacity 0.35s ease";
    setInterval(function () { go(idx + 1); }, 4000);
  }

  /* === Trang chính: khởi tạo sự kiện, state, và render lần đầu === */
  document.addEventListener('DOMContentLoaded', async function () {
    TamTai.setupSearchRedirect('.search-box input', '../products/products.html');
    toggleGuestOnlyElements();

    window.addEventListener('storage', function (event) {
      if (event.key === 'access_token' || event.key === 'tamtai_role') {
        toggleGuestOnlyElements();
      }
    });

    var grid = document.querySelector('.product-grid');
    var sortSelect = document.querySelector('.filter-block select');
    var quickItems = Array.prototype.slice.call(document.querySelectorAll('.quick-item'));
    var searchInput = document.querySelector('.search-box input');
    var heading = document.querySelector('.products-head h2');
    var filterBlocks = document.querySelectorAll('.filter-panel .filter-block');
    var categoryFilterBlock = filterBlocks[0] || null;
    var priceFilterBlock = filterBlocks[1] || null;
    var paginationWrap = document.getElementById('productsPagination');

    if (!grid) {
      return;
    }

    grid.innerHTML = '<p class="empty-products">\u0110ang t\u1ea3i d\u1eef li\u1ec7u s\u1ea3n ph\u1ea9m...</p>';

    try {
      var catalog = await loadCatalog();
      var products = catalog.products;
      var productById = {};
      products.forEach(function (product) {
        productById[product.id] = product;
      });

      var categoryCounts = {};
      products.forEach(function (product) {
        categoryCounts[product.categoryId] = (categoryCounts[product.categoryId] || 0) + 1;
      });

      var categories = catalog.categories
        .filter(function (category) {
          return isPrimaryCategoryId(category.category_id) && categoryCounts[category.category_id] > 0;
        })
        .sort(compareCategories);

      renderCategoryFilters(categoryFilterBlock, categories, categoryCounts);
      renderPriceFilters(priceFilterBlock, 0, PRICE_MAX);
      attachQuickCategoryIds(quickItems, catalog.categoriesById);

      setupHeroSlides(products);

      var params = new URLSearchParams(window.location.search);
      var initialKeywordRaw = params.get('q') || '';
      var initialKeyword = normalizeText(initialKeywordRaw);
      var initialCategoryId = resolveCategoryIdFromQuery(params.get('category'), catalog.categoriesById);
      if (initialCategoryId && !isPrimaryCategoryId(initialCategoryId)) {
        initialCategoryId = '';
      }

      // State trung tâm: lưu trạng thái bộ lọc, từ khóa, sắp xếp, phân trang
      var state = {
        selectedCategories: new Set(initialCategoryId ? [initialCategoryId] : []),
        priceMin: 0,
        priceMax: PRICE_MAX,
        keyword: initialKeyword,
        sortMode: sortSelect ? sortSelect.selectedIndex : 0,
        currentPage: 1,
        PAGE_SIZE: 9,
        // Hàm render chính: lọc sản phẩm theo state -> sắp xếp -> phân trang -> cập nhật giao diện
        render: function () {
          syncCategoryInputs(categoryFilterBlock, state.selectedCategories);
          syncPriceInputs(priceFilterBlock, state.priceMin, state.priceMax);
          syncQuickItems(quickItems, state.selectedCategories);

          var filtered = products.filter(function (product) {
            var byCategory = state.selectedCategories.size === 0 || state.selectedCategories.has(product.categoryId);
            var byPrice = matchPriceRange(product.price, state.priceMin, state.priceMax);
            var byKeyword = true;

            if (state.keyword) {
              var haystack = normalizeText(product.name + ' ' + product.description + ' ' + product.categoryName);
              byKeyword = haystack.indexOf(state.keyword) !== -1;
            }

            return byCategory && byPrice && byKeyword;
          });

          var sorted = sortProducts(filtered, state.sortMode);
          var totalPages = Math.ceil(sorted.length / state.PAGE_SIZE) || 1;
          if (state.currentPage > totalPages) state.currentPage = totalPages;
          var start = (state.currentPage - 1) * state.PAGE_SIZE;
          var visible = sorted.slice(start, start + state.PAGE_SIZE);

          if (!visible.length) {
            grid.innerHTML = '<p class="empty-products">Kh\u00f4ng t\u00ecm th\u1ea5y s\u1ea3n ph\u1ea9m ph\u00f9 h\u1ee3p.</p>';
          } else {
            grid.innerHTML = visible.map(buildProductCard).join('');
          }

          if (heading) {
            heading.textContent = 'S\u1ea2N PH\u1ea8M (' + filtered.length + ')';
          }

          if (paginationWrap) {
            if (totalPages <= 1) {
              paginationWrap.innerHTML = '';
            } else {
              var btns = [];
              btns.push('<button type="button" class="page-btn" data-page="' + (state.currentPage - 1) + '"' + (state.currentPage <= 1 ? ' disabled' : '') + '>\u2039</button>');
              for (var p = 1; p <= totalPages; p++) {
                btns.push('<button type="button" class="page-btn' + (p === state.currentPage ? ' is-active' : '') + '" data-page="' + p + '">' + p + '</button>');
              }
              btns.push('<button type="button" class="page-btn" data-page="' + (state.currentPage + 1) + '"' + (state.currentPage >= totalPages ? ' disabled' : '') + '>\u203a</button>');
              paginationWrap.innerHTML = btns.join('');
            }
          }
        }
      };

      if (searchInput && initialKeywordRaw) {
        searchInput.value = initialKeywordRaw;
      }

      function resetPage() { state.currentPage = 1; }

      // Xử lý sự kiện khi checkbox danh mục thay đổi
      if (categoryFilterBlock) {
        categoryFilterBlock.addEventListener('change', function (event) {
          var input = event.target.closest('input[data-filter-type="category"]');
          if (!input) return;
          var value = input.getAttribute('data-category');
          if (value === 'all') {
            state.selectedCategories.clear();
          } else {
            if (input.checked) state.selectedCategories.add(value);
            else state.selectedCategories.delete(value);
          }
          resetPage();
          state.render();
        });
      }

      // Cập nhật nhãn hiển thị và thanh trượt khi kéo slider giá
      function updatePriceLabel() {
        var minEl = document.getElementById("priceRangeMin");
        var maxEl = document.getElementById("priceRangeMax");
        var minLabel = document.getElementById("priceLabelMin");
        var maxLabel = document.getElementById("priceLabelMax");
        var fill = document.getElementById("priceSliderFill");
        if (!minEl || !maxEl) return;
        var min = Number(minEl.value);
        var max = Number(maxEl.value);
        if (min > max) { minEl.value = max; min = max; }
        if (max < min) { maxEl.value = min; max = min; }
        state.priceMin = Number(minEl.value);
        state.priceMax = Number(maxEl.value);
        var pctMin = (state.priceMin / PRICE_MAX) * 100;
        var pctMax = (state.priceMax / PRICE_MAX) * 100;
        if (minLabel) minLabel.textContent = Number(state.priceMin).toLocaleString("vi-VN") + "\u20ab";
        if (maxLabel) maxLabel.textContent = Number(state.priceMax).toLocaleString("vi-VN") + "\u20ab";
        if (fill) fill.style.cssText = "left:" + pctMin + "%;width:" + (pctMax - pctMin) + "%";
      }

      // Xử lý sự kiện kéo thanh trượt khoảng giá (cập nhật label trong lúc kéo)
      if (priceFilterBlock) {
        priceFilterBlock.addEventListener("input", function (event) {
          var slider = event.target.closest(".price-range");
          if (!slider) return;
          updatePriceLabel();
        });
        priceFilterBlock.addEventListener("change", function (event) {
          var slider = event.target.closest(".price-range");
          if (!slider) return;
          updatePriceLabel();
          resetPage();
          state.render();
        });
      }

      // Xử lý click vào nút danh mục nhanh (quick access)
      quickItems.forEach(function (item) {
        item.addEventListener('click', function (event) {
          event.preventDefault();
          var categoryId = item.getAttribute('data-category-id') || '';
          state.selectedCategories.clear();
          if (categoryId) state.selectedCategories.add(categoryId);
          resetPage();
          state.render();
        });
      });

      // Xử lý tìm kiếm theo từ khóa (gõ đến đâu lọc đến đó)
      if (searchInput) {
        searchInput.addEventListener('input', function () {
          state.keyword = normalizeText(searchInput.value);
          resetPage();
          state.render();
        });
      }

      // Xử lý thay đổi lựa chọn sắp xếp
      if (sortSelect) {
        sortSelect.addEventListener('change', function () {
          state.sortMode = sortSelect.selectedIndex;
          resetPage();
          state.render();
        });
      }

      // Xử lý phân trang: click vào nút trang
      if (paginationWrap) {
        paginationWrap.addEventListener('click', function (event) {
          var btn = event.target.closest('.page-btn[data-page]');
          if (!btn || btn.disabled) return;
          state.currentPage = Number(btn.getAttribute('data-page'));
          state.render();
        });
      }

      // Xử lý sự kiện trên lưới sản phẩm: Add-to-Cart, Buy-Now, và điều hướng chi tiết
      grid.addEventListener('click', function (event) {
        var actionButton = event.target.closest('button[data-action]');
        if (actionButton) {
          event.preventDefault();
          event.stopPropagation();

          var cardForAction = actionButton.closest('.product-card[data-product-id]');
          if (!cardForAction) {
            return;
          }

          var productId = cardForAction.getAttribute('data-product-id');
          var action = actionButton.getAttribute('data-action');
          var product = productById[productId];
          if (!product) {
            return;
          }

          if (action === 'add-cart') {
            TamTai.addToCart(toCartItem(product), 1);
            TamTai.flyToCart(cardForAction, product.image);
            return;
          }

          if (action === 'buy-now') {
            TamTai.addToCart(toCartItem(product), 1);
            window.location.href = '../cart/checkout.html?from=buy-now';
            return;
          }
        }

        var card = event.target.closest('.product-card[data-product-id]');
        if (!card) {
          return;
        }

        var productIdForDetail = card.getAttribute('data-product-id');
        if (!productIdForDetail) {
          return;
        }

        window.location.href = '../products/product-detail.html?id=' + encodeURIComponent(productIdForDetail);
      });

      state.render();
    } catch (error) {
      grid.innerHTML = '<p class="empty-products">Kh\u00f4ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u s\u1ea3n ph\u1ea9m. Vui l\u00f2ng th\u1eed l\u1ea1i.</p>';
      if (moreBtn) {
        moreBtn.style.display = 'none';
      }
      if (heading) {
        heading.textContent = 'S\u1ea2N PH\u1ea8M';
      }
    }
  });
})();



