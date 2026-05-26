/* ============================================================
   TamTai - Landing Page
   Xử lý hiển thị trang chủ: danh mục, sản phẩm nổi bật, hero slider
   ============================================================ */
(function () {
  // ===================== HẰNG SỐ =====================
  var DEFAULT_IMAGE = (window.TamTai && TamTai.DEFAULT_PRODUCT_IMAGE) || "../../images/acer-refurbished-laptop-500x500.webp";
  var HERO_ROTATE_MS = 3000;          // Thời gian xoay slider (ms)
  var HERO_MAX_SLIDES = 8;            // Số slide tối đa

  // Thứ tự ưu tiên hiển thị danh mục
  var CATEGORY_PRIORITY = [
    "CAT_PHONE",
    "CAT_LAPTOP",
    "CAT_HEADPHONE",
    "CAT_SMARTWATCH",
    "CAT_KEYBOARD",
    "CAT_MOUSE"
  ];

  // Nhãn hiển thị cho từng danh mục
  var CATEGORY_LABELS = {
    CAT_PHONE: "\u0110i\u1ec7n tho\u1ea1i",
    CAT_LAPTOP: "Laptop",
    CAT_HEADPHONE: "Tai nghe",
    CAT_SMARTWATCH: "\u0110\u1ed3ng h\u1ed3 th\u00f4ng minh",
    CAT_KEYBOARD: "B\u00e0n ph\u00edm",
    CAT_MOUSE: "Chu\u1ed9t m\u00e1y t\u00ednh"
  };

  /**
   * normalizeText - Chuẩn hóa văn bản (bỏ dấu, chữ thường)
   * Dùng TamTai.normalizeText nếu có, tự xử lý nếu không
   * @param {string} value - Văn bản cần chuẩn hóa
   * @returns {string} Văn bản đã chuẩn hóa
   */
  function normalizeText(value) {
    if (window.TamTai && typeof TamTai.normalizeText === "function") {
      return TamTai.normalizeText(value);  // Dùng hàm từ common.js
    }
    // Dự phòng nếu TamTai chưa load
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /**
   * escapeHtml - Thoát các ký tự HTML đặc biệt để tránh XSS
   * @param {string} value - Chuỗi cần thoát
   * @returns {string} Chuỗi đã thoát
   */
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * toNumber - Chuyển đổi an toàn sang số
   * @param {*} value - Giá trị cần chuyển
   * @param {*} fallback - Giá trị mặc định nếu không phải số hợp lệ
   * @returns {number} Giá trị số hoặc fallback
   */
  function toNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  /**
   * toImageSrc - Xây dựng URL đầy đủ cho ảnh sản phẩm
   * Nếu là URL tuyệt đối hoặc data URI thì giữ nguyên
   * Nếu là đường dẫn tương đối thì ghép với API_BASE_URL
   * @param {string} imageUrl - URL ảnh gốc
   * @returns {string} URL ảnh hoàn chỉnh
   */
  function toImageSrc(imageUrl) {
    var raw = String(imageUrl || "").trim();
    if (!raw) {
      return DEFAULT_IMAGE;  // Trả về ảnh mặc định nếu không có URL
    }
    // Giữ nguyên nếu là URL tuyệt đối hoặc data URI
    if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) {
      return raw;
    }
    // Ghép với API base nếu là đường dẫn tương đối
    if (window.TamTai && typeof TamTai.buildApiUrl === "function") {
      if (raw.startsWith("/")) {
        return TamTai.buildApiUrl(raw);
      }
      return TamTai.buildApiUrl("/" + raw);
    }

    return raw;
  }

  /**
   * formatCount - Định dạng số đếm theo locale Việt Nam
   * @param {number} value - Số cần định dạng
   * @returns {string} Chuỗi đã định dạng (VD: "1.234")
   */
  function formatCount(value) {
    return Number(value || 0).toLocaleString("vi-VN"); // VD: "1.234"
  }

  /**
   * categoryLabel - Lấy tên hiển thị của danh mục
   * Ưu tiên nhãn định sẵn trong CATEGORY_LABELS, dự phòng từ tên gốc
   * @param {string} categoryId - Mã danh mục
   * @param {string} fallbackName - Tên dự phòng
   * @returns {string} Tên danh mục đã dịch
   */
  function categoryLabel(categoryId, fallbackName) {
    // Ưu tiên nhãn có sẵn
    if (CATEGORY_LABELS[categoryId]) {
      return CATEGORY_LABELS[categoryId];
    }
    // Dự phòng: nhận diện danh mục qua tên đã chuẩn hóa
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

  /**
   * getCategoryPriority - Lấy độ ưu tiên hiển thị của danh mục
   * @param {string} categoryId - Mã danh mục
   * @returns {number} Chỉ số ưu tiên (thấp hơn = hiển thị trước)
   */
  function getCategoryPriority(categoryId) {
    var idx = CATEGORY_PRIORITY.indexOf(categoryId);
    return idx === -1 ? 999 : idx;  // Nếu không có trong danh sách ưu tiên → xếp cuối
  }

  /**
   * compareCategories - So sánh hai danh mục để sắp xếp
   * So sánh theo độ ưu tiên trước, sau đó theo tên alphabet (tiếng Việt)
   * @param {object} a - Danh mục thứ nhất
   * @param {object} b - Danh mục thứ hai
   * @returns {number} Kết quả so sánh (-1, 0, 1)
   */
  function compareCategories(a, b) {
    var pa = getCategoryPriority(a.category_id);
    var pb = getCategoryPriority(b.category_id);
    if (pa !== pb) {
      return pa - pb;  // So sánh theo ưu tiên
    }
    // Cùng ưu tiên → so sánh theo tên alphabet tiếng Việt
    return categoryLabel(a.category_id, a.category_name).localeCompare(categoryLabel(b.category_id, b.category_name), "vi");
  }

  /**
   * resolveCategoryId - Tìm mã danh mục từ tên hiển thị
   * Duyệt alias và tìm kiếm mờ trong danh sách danh mục
   * @param {string} name - Tên danh mục cần tìm
   * @param {object} categoriesById - Map danh mục theo ID
   * @returns {string} Mã danh mục nếu tìm thấy, chuỗi rỗng nếu không
   */
  function resolveCategoryId(name, categoriesById) {
    var normalized = normalizeText(name);
    if (!normalized) {
      return "";
    }
    // Bảng alias ánh xạ tên tiếng Việt → mã danh mục
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
    // Tìm kiếm mờ trong danh sách danh mục
    var matched = Object.values(categoriesById).find(function (category) {
      var categoryName = normalizeText(categoryLabel(category.category_id, category.category_name));
      return normalized === categoryName || normalized.indexOf(categoryName) !== -1 || categoryName.indexOf(normalized) !== -1;
    });

    return matched ? matched.category_id : "";
  }

  /**
   * setStatValue - Cập nhật giá trị thống kê trong DOM
   * Tìm phần tử có data-stat tương ứng và gán textContent
   * @param {string} key - Tên chỉ số thống kê
   * @param {string|number} value - Giá trị cần hiển thị
   */
  function setStatValue(key, value) {
    var node = document.querySelector('[data-stat="' + key + '"]');
    if (!node) {
      return;
    }
    node.textContent = String(value);
  }

  /**
   * renderStats - Hiển thị thống kê tổng quan trang landing
   * Tính: số sản phẩm, số danh mục có sản phẩm, đánh giá trung bình, tổng reviews
   * @param {Array} products - Danh sách sản phẩm
   * @param {Array} categories - Danh sách danh mục
   */
  function renderStats(products, categories) {
    var productCount = products.length;  // Tổng sản phẩm

    // Đếm số sản phẩm thuộc mỗi danh mục
    var categoryCounts = {};
    products.forEach(function (product) {
      var categoryId = String(product.category_id || "");
      categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
    });
    // Đếm số danh mục có ít nhất 1 sản phẩm
    var categoryCount = categories.filter(function (category) {
      return (categoryCounts[category.category_id] || 0) > 0;
    }).length;
    if (!categoryCount) {
      categoryCount = Object.keys(categoryCounts).filter(Boolean).length;
    }

    // Tính điểm đánh giá trung bình
    var ratings = products
      .map(function (product) { return toNumber(product.rating_avg, 0); })
      .filter(function (rating) { return rating > 0; });
    var avgRating = ratings.length
      ? (ratings.reduce(function (sum, value) { return sum + value; }, 0) / ratings.length)
      : 0;

    // Tổng số lượng review
    var totalReviews = products.reduce(function (sum, product) {
      return sum + toNumber(product.total_reviews, 0);
    }, 0);

    // Gán giá trị vào các phần tử HTML
    setStatValue("product-count", formatCount(productCount));
    setStatValue("category-count", formatCount(categoryCount));
    setStatValue("avg-rating", avgRating ? avgRating.toFixed(1) : "0.0");
    setStatValue("total-reviews", formatCount(totalReviews));
  }

  /**
   * renderCategoryCards - Hiển thị danh sách danh mục dạng thẻ (card)
   * Lọc danh mục có sản phẩm, sắp xếp theo độ ưu tiên, giới hạn 6
   * @param {Array} categories - Danh sách danh mục
   * @param {Array} products - Danh sách sản phẩm
   */
  function renderCategoryCards(categories, products) {
    var grid = document.querySelector(".category-grid");
    if (!grid) {
      return;
    }
    // Đếm sản phẩm theo danh mục
    var counts = {};
    products.forEach(function (product) {
      var categoryId = String(product.category_id || "");
      counts[categoryId] = (counts[categoryId] || 0) + 1;
    });
    // Lọc danh mục có sản phẩm, sắp xếp, lấy tối đa 6
    var list = categories
      .filter(function (category) {
        return (counts[category.category_id] || 0) > 0;
      })
      .sort(compareCategories)
      .slice(0, 6);

    if (!list.length) {
      return;
    }
    // Render HTML cho từng thẻ danh mục
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

  /**
   * bindCategoryNavigation - Gán sự kiện click cho các thẻ danh mục
   * Khi click vào thẻ → chuyển hướng sang trang sản phẩm với category filter
   * @param {object} categoriesById - Map danh mục theo ID
   */
  function bindCategoryNavigation(categoriesById) {
    var grid = document.querySelector(".category-grid");
    if (!grid) {
      return;
    }
    // Dùng event delegation để xử lý click
    grid.addEventListener("click", function (event) {
      var card = event.target.closest(".category-card");
      if (!card) {
        return;
      }
      // Lấy categoryId từ data attribute hoặc suy luận từ tên
      var categoryId = card.getAttribute("data-category-id") || "";
      if (!categoryId) {
        var label = (card.querySelector("h3") ? card.querySelector("h3").textContent : card.textContent).trim();
        categoryId = resolveCategoryId(label, categoriesById);
      }
      // Chuyển hướng đến trang sản phẩm với filter danh mục
      if (categoryId) {
        window.location.href = "../products/products.html?category=" + encodeURIComponent(categoryId);
        return;
      }
      window.location.href = "../products/products.html";
    });
  }

  /**
   * buildHeroSlides - Xây dựng danh sách slide cho hero slider
   * Chọn các sản phẩm nổi bật (nhiều review, rating cao), loại ảnh trùng
   * @param {Array} products - Danh sách sản phẩm
   * @param {object} categoriesById - Map danh mục
   * @returns {Array} Mảng slide {id, name, tag, image}
   */
  function buildHeroSlides(products, categoriesById) {
    var seenImages = {};  // Để loại bỏ ảnh trùng lặp

    return products
      .slice() // Tạo bản sao để không ảnh hưởng mảng gốc
      .sort(function (a, b) {
        // Sắp xếp theo số review (cao→thấp), sau đó rating (cao→thấp)
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
        // Loại sản phẩm không có ảnh hoặc ảnh trùng
        var image = toImageSrc(product.image_url);
        if (!image || seenImages[image]) {
          return false;
        }
        seenImages[image] = true;
        return true;
      })
      .slice(0, HERO_MAX_SLIDES) // Giới hạn số slide
      .map(function (product) {
        // Xây dựng đối tượng slide
        var category = categoriesById[product.category_id] || null;
        return {
          id: String(product.product_id || ""),
          name: String(product.product_name || "\u0053\u1ea3n ph\u1ea9m n\u1ed5i b\u1eadt"),
          tag: categoryLabel(product.category_id, category && category.category_name),
          image: toImageSrc(product.image_url)
        };
      });
  }

  /**
   * setupHeroSlider - Thiết lập hero slider: tự động xoay, điều hướng, dots
   * @param {Array} slides - Mảng các slide {id, name, tag, image}
   */
  function setupHeroSlider(slides) {
    // Lấy các phần tử DOM của hero slider
    var media = document.querySelector(".hero-media");
    if (!media || !slides.length) {
      return;  // Không có slide → không khởi tạo
    }

    var frame = media.querySelector(".hero-media-frame");
    var imageEl = media.querySelector(".hero-media-image");
    var tagEl = media.querySelector(".hero-media-tag");
    var titleEl = media.querySelector(".hero-media-title");
    var dotsWrap = media.querySelector(".hero-media-dots");
    var prevBtn = media.querySelector(".hero-prev");
    var nextBtn = media.querySelector(".hero-next");

    if (!frame || !imageEl || !tagEl || !titleEl || !dotsWrap) {
      return;  // Thiếu phần tử cần thiết
    }

    var currentIndex = 0;   // Slide hiện tại
    var timerId = null;      // ID của interval tự động xoay

    // navigateToDetail - Chuyển đến trang chi tiết sản phẩm hiện tại
    function navigateToDetail() {
      var activeSlide = slides[currentIndex];
      if (!activeSlide || !activeSlide.id) {
        window.location.href = "../products/products.html";
        return;
      }
      // Chuyển đến trang chi tiết sản phẩm
      window.location.href = "../products/product-detail.html?id=" + encodeURIComponent(activeSlide.id);
    }

    /**
     * render - Hiển thị slide tại vị trí index
     * Thực hiện hiệu ứng fade: ẩn ảnh cũ → đổi nội dung → hiện ảnh mới
     * @param {number} index - Chỉ số slide cần hiển thị
     */
    function render(index) {
      currentIndex = (index + slides.length) % slides.length;  // Xử lý vòng tròn
      var slide = slides[currentIndex];

      // Fade out ảnh cũ → đổi nội dung → fade in ảnh mới
      imageEl.style.opacity = "0";
      setTimeout(function () {
        imageEl.src = slide.image;
        imageEl.alt = slide.name;
        tagEl.textContent = slide.tag;
        titleEl.textContent = slide.name;
        imageEl.style.opacity = "1";
      }, 60);

      // Cập nhật dots (chấm tròn chỉ slide)
      dotsWrap.querySelectorAll(".hero-dot").forEach(function (dot, dotIndex) {
        dot.classList.toggle("active", dotIndex === currentIndex);
      });
    }

    // stopAuto - Dừng tự động xoay slider
    function stopAuto() {
      if (timerId) {
        clearInterval(timerId);  // Xóa interval hiện tại
        timerId = null;
      }
    }

    // startAuto - Bắt đầu tự động xoay, không chạy nếu chỉ có 1 slide
    function startAuto() {
      if (slides.length <= 1) {
        return;
      }
      stopAuto();  // Đảm bảo không có interval cũ
      timerId = setInterval(function () {
        render(currentIndex + 1);  // Chuyển đến slide tiếp theo
      }, HERO_ROTATE_MS);
    }

    // restartAuto - Dừng rồi chạy lại tự động xoay (reset timer)
    function restartAuto() {
      stopAuto();
      startAuto();
    }

    // ===== Tạo dots điều hướng =====
    // ===== Gán sự kiện cho dots =====
    // ===== Gán sự kiện cho dots (click chọn slide) =====
    dotsWrap.addEventListener("click", function (event) {
      var dot = event.target.closest(".hero-dot");
      if (!dot) {
        return;
      }
      var index = Number(dot.getAttribute("data-index"));
      if (!Number.isFinite(index)) {
        return;
      }
      render(index);          // Chuyển đến slide được chọn
      restartAuto();          // Reset timer tự động xoay
    });

    // ===== Nút prev/next =====
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        render(currentIndex - 1);  // Lùi 1 slide
        restartAuto();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        render(currentIndex + 1);  // Tiến 1 slide
        restartAuto();
      });
    }

    // ===== Click/Enter trên frame → xem chi tiết =====
    frame.addEventListener("click", navigateToDetail);
    frame.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigateToDetail();
      }
    });

    // ===== Dừng/tự động xoay khi hover =====
    media.addEventListener("mouseenter", stopAuto);
    media.addEventListener("mouseleave", startAuto);

    // ===== Nếu chỉ có 1 slide → ẩn điều hướng =====
    if (slides.length <= 1) {
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
      dotsWrap.style.display = "none";
    }

    render(0);    // Hiển thị slide đầu tiên
    startAuto();  // Bắt đầu tự động xoay
  }

  /**
   * isUserLoggedIn - Kiểm tra xem người dùng đã đăng nhập chưa
   * @returns {boolean} true nếu có access_token hợp lệ
   */
  function isUserLoggedIn() {
    var token = localStorage.getItem("access_token");
    return Boolean(token && String(token).trim());
  }

  /**
   * setupActionTracking - Thiết lập theo dõi hành động trên landing page
   * Lưu điểm đến cuối cùng, điều chỉnh link tài khoản theo trạng thái đăng nhập
   */
  function setupActionTracking() {
    // Lưu dấu vết khi người dùng click nút chính
    var actionButtons = document.querySelectorAll(".btn-primary, .btn-secondary");
    actionButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        localStorage.setItem("tamtai_last_entry", "landing");
      });
    });

    // Điều chỉnh nút tài khoản: login nếu chưa đăng nhập, profile nếu đã đăng nhập
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

  /**
   * renderFallbackFacts - Hiển thị thống kê dự phòng khi không load được API
   * Sử dụng số liệu mặc định để trang không bị trống
   */
  function renderFallbackFacts() {
    setStatValue("product-count", "60");
    setStatValue("category-count", "6");
  }

  /**
   * loadLandingData - Hàm chính: tải dữ liệu landing page từ API
   * Lấy danh mục + sản phẩm → render stats, category cards, hero slider
   * Nếu lỗi hoặc không có TamTai → dùng dữ liệu dự phòng
   */
  async function loadLandingData() {
    // Nếu chưa load TamTai hoặc không có fetchJson → dùng dữ liệu dự phòng
    if (!window.TamTai || typeof TamTai.fetchJson !== "function") {
      renderFallbackFacts();
      setupHeroSlider([
        { id: "", name: "\u004b\u0068\u00e1m ph\u00e1 60 s\u1ea3n ph\u1ea9m c\u00f4ng ngh\u1ec7", tag: "\u0053\u1ea3n ph\u1ea9m n\u1ed5i b\u1eadt", image: DEFAULT_IMAGE }
      ]);
      return;
    }

    try {
      // Gọi API song song lấy danh mục và sản phẩm
      var categoriesData = await TamTai.fetchJson("/categories?skip=0&limit=100");
      var productsData = await TamTai.fetchJson("/products?skip=0&limit=500");

      var categories = Array.isArray(categoriesData) ? categoriesData : [];
      var products = Array.isArray(productsData) ? productsData : [];

      // Xây dựng map danh mục để tra cứu nhanh
      var categoriesById = {};
      categories.forEach(function (category) {
        categoriesById[category.category_id] = category;
      });

      // Render các thành phần trên trang
      renderStats(products, categories);
      renderCategoryCards(categories, products);
      bindCategoryNavigation(categoriesById);

      // Xây dựng và thiết lập hero slider
      var slides = buildHeroSlides(products, categoriesById);
      if (!slides.length) {
        slides = [{ id: "", name: "\u004b\u0068\u00e1m ph\u00e1 60 s\u1ea3n ph\u1ea9m c\u00f4ng ngh\u1ec7", tag: "\u0053\u1ea3n ph\u1ea9m n\u1ed5i b\u1eadt", image: DEFAULT_IMAGE }];
      }
      setupHeroSlider(slides);
    } catch (error) {
      // Nếu API lỗi → dùng dữ liệu dự phòng để trang không trống
      renderFallbackFacts();
      bindCategoryNavigation({});
      setupHeroSlider([
        { id: "", name: "\u004b\u0068\u00e1m ph\u00e1 60 s\u1ea3n ph\u1ea9m c\u00f4ng ngh\u1ec7", tag: "\u0053\u1ea3n ph\u1ea9m n\u1ed5i b\u1eadt", image: DEFAULT_IMAGE }
      ]);
    }
  }

  // ===================== KHỞI TẠO KHI DOM SẴN SÀNG =====================
  document.addEventListener("DOMContentLoaded", function () {
    setupActionTracking();  // Theo dõi hành động người dùng
    loadLandingData();      // Tải dữ liệu và render trang
  });
})();
