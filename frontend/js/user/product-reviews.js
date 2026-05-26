/* ===== Trang đánh giá sản phẩm người dùng ===== */
(function () {
  // Kích thước trang và giới hạn upload ảnh
  var REVIEW_PAGE_SIZE = 10;           // Số sản phẩm hiển thị mỗi trang
  var MAX_REVIEW_IMAGES = 5;           // Tối đa 5 ảnh mỗi đánh giá
  var MAX_REVIEW_IMAGE_SIZE = 5 * 1024 * 1024; // Giới hạn 5MB mỗi ảnh
  var DEFAULT_IMAGE = "../../images/acer-refurbished-laptop-500x500.webp";

  // Biến trạng thái toàn cục
  var state = {
    token: "",            // Token xác thực
    customerId: "",       // ID khách hàng
    products: [],         // Danh sách sản phẩm đã mua
    pendingProducts: [],  // Sản phẩm chưa được đánh giá
    reviewsByProduct: {}, // Map các review đã có theo product_id
    page: 1               // Trang hiện tại
  };

  // Hiển thị giá trị, nếu rỗng trả về "chưa có"
  function displayValue(value) {
    var text = (value || "").toString().trim();
    return text ? text : "chưa có";
  }

  // Thoát HTML để an toàn khi chèn nội dung vào DOM
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Định dạng ngày tháng thành dd/MM/yyyy
  function formatDate(dateValue) {
    if (!dateValue) {
      return "chưa có";
    }

    var date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return "chưa có";
    }

    var dd = String(date.getDate()).padStart(2, "0");
    var mm = String(date.getMonth() + 1).padStart(2, "0");
    var yyyy = date.getFullYear();
    return dd + "/" + mm + "/" + yyyy;
  }

  /* ---- Xử lý đường dẫn ảnh ---- */
  // Nếu là URL tuyệt đối hoặc data URI thì dùng nguyên, nếu là đường dẫn tương đối thì build qua API
  function resolveAssetUrl(url) {
    var text = String(url || "").trim();
    if (!text) {
      return DEFAULT_IMAGE;
    }

    if (/^(https?:)?\/\//i.test(text) || text.indexOf("data:") === 0) {
      return text;
    }

    if (text.charAt(0) === "/" && window.TamTai && typeof TamTai.buildApiUrl === "function") {
      return TamTai.buildApiUrl(text);
    }

    return text;
  }

  // Cập nhật sidebar với tên và email từ profile
  function applySidebarProfile(profileInput) {
    var profile = profileInput || TamTai.getProfile();
    var heading = document.querySelector(".profile-head h2");
    var emailText = document.querySelector(".profile-head p");

    if (heading) {
      heading.textContent = displayValue(profile.fullName);
    }
    if (emailText) {
      emailText.textContent = displayValue(profile.email);
    }
  }

  /* ---- Hiển thị trạng thái rỗng ---- */
  // Khi không có sản phẩm nào để đánh giá
  function renderEmpty(message) {
    var list = document.getElementById("reviewList");
    var summary = document.getElementById("reviewSummary");
    var pagination = document.getElementById("reviewPagination");

    if (summary) {
      summary.textContent = "";
    }
    if (pagination) {
      pagination.innerHTML = "";
    }
    if (!list) {
      return;
    }

    list.innerHTML = '<p class="review-empty">' + escapeHtml(message || "chưa có dữ liệu") + "</p>";
  }

  /* ---- Lấy context khách hàng từ API ---- */
  // Đảm bảo customerId và token hợp lệ, đồng bộ profile + sidebar
  async function ensureCustomerContext() {
    var token = localStorage.getItem("access_token");
    var role = TamTai.getRole();
    if (!token || role !== "user") {
      return false;
    }

    state.token = token;

    try {
      var response = await fetch(TamTai.API_BASE_URL + "/customers/me", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token
        }
      });

      if (!response.ok) {
        return false;
      }

      var customer = await response.json();
      state.customerId = customer.customer_id || "";

      var mapped = {
        fullName: customer.customer_name || "",
        email: customer.customer_email || "",
        phone: customer.phone_number || "",
        address: customer.address || ""
      };

      localStorage.setItem("tamtai_customer_id", state.customerId);
      localStorage.setItem("tamtai_customer_profile", JSON.stringify(customer));
      TamTai.saveProfile(mapped);
      applySidebarProfile(mapped);

      return Boolean(state.customerId);
    } catch (error) {
      return false;
    }
  }

  /* ---- Lấy danh sách sản phẩm đã mua ---- */
  // GET /orders, sau đó trích xuất danh sách sản phẩm từ các order items
  async function fetchPurchasedProducts() {
    if (!state.token) {
      return [];
    }

    try {
      var response = await fetch(TamTai.API_BASE_URL + "/orders?skip=0&limit=100", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + state.token
        }
      });
      if (!response.ok) {
        return [];
      }

      var data = await response.json();
      var rows = Array.isArray(data) ? data : [];
      var productMap = {};
      var orderedIds = [];

      rows.forEach(function (order) {
        var items = Array.isArray(order.items)
          ? order.items
          : (Array.isArray(order.order_items) ? order.order_items : []);

        items.forEach(function (item) {
          var productId = String(item.product_id || "").trim();
          if (!productId || productMap[productId]) {
            return;
          }

          productMap[productId] = {
            product_id: productId,
            product_name: item.product_name || ("Sản phẩm " + productId),
            description: item.description || "",
            image_url: resolveAssetUrl(item.image_url || DEFAULT_IMAGE)
          };
          orderedIds.push(productId);
        });
      });

      return orderedIds.map(function (productId) {
        return productMap[productId];
      });
    } catch (error) {
      return [];
    }
  }

  /* ---- Lấy danh sách đánh giá đã gửi ---- */
  // GET /reviews/customer/{customerId}, trả về map product_id -> review (lấy bản mới nhất)
  async function fetchMyReviews() {
    if (!state.customerId || !state.token) {
      return {};
    }

    try {
      var response = await fetch(
        TamTai.API_BASE_URL + "/reviews/customer/" + encodeURIComponent(state.customerId),
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + state.token
          }
        }
      );

      if (!response.ok) {
        return {};
      }

      var rows = await response.json();
      if (!Array.isArray(rows)) {
        return {};
      }

      var map = {};
      rows.forEach(function (review) {
        var productId = String(review.product_id || "").trim();
        if (!productId) {
          return;
        }

        review.image_urls = Array.isArray(review.image_urls) ? review.image_urls : [];

        var existing = map[productId];
        if (!existing) {
          map[productId] = review;
          return;
        }

        var currentTime = new Date(review.created_at || 0).getTime();
        var existingTime = new Date(existing.created_at || 0).getTime();
        if (currentTime >= existingTime) {
          map[productId] = review;
        }
      });

      return map;
    } catch (error) {
      return {};
    }
  }

  // Lọc ra các sản phẩm chưa có đánh giá (cần đánh giá)
  function buildPendingReviewProducts(products, reviewsByProduct) {
    return (products || []).filter(function (product) {
      return !reviewsByProduct[product.product_id];
    });
  }

  /* ---- Tạo HTML cho bộ chọn sao ---- */
  // Tạo 5 nút sao, tô active nếu <= selectedRating
  function createStarsHtml(selectedRating) {
    var html = "";
    for (var i = 1; i <= 5; i += 1) {
      var activeClass = i <= selectedRating ? " active" : "";
      html += '<button type="button" class="star-btn' + activeClass + '" data-value="' + i + '">&#9733;</button>';
    }
    return html;
  }

  /* ---- Tạo thẻ HTML cho một sản phẩm cần đánh giá ---- */
  // Gồm: ảnh, tên sản phẩm, bộ chọn sao, textarea nhận xét, input file ảnh, nút gửi
  function createReviewCard(product) {
    var image = resolveAssetUrl(product.image_url || DEFAULT_IMAGE);

    return [
      '<article class="review-item" data-product-id="' + escapeHtml(product.product_id) + '">',
      '  <div class="review-product">',
      '    <img src="' + escapeHtml(image) + '" alt="Sản phẩm">',
      "    <div>",
      "      <h3>" + escapeHtml(displayValue(product.product_name)) + "</h3>",
      "      <p>Mã sản phẩm: " + escapeHtml(displayValue(product.product_id)) + " | Chưa đánh giá</p>",
      '      <p class="review-meta">' + escapeHtml(displayValue(product.description)) + "</p>",
      "    </div>",
      "  </div>",
      '  <div class="review-actions-top">',
      '    <a class="buy-again-btn" href="../cart/cart.html">Mua lại</a>',
      "  </div>",
      '  <form class="review-form">',
      "    <label>Đánh giá sao</label>",
      '    <div class="star-picker">',
      createStarsHtml(0),
      '      <span class="rating-text">Chưa chọn sao</span>',
      "    </div>",
      '    <input class="rating-value" type="hidden" value="0">',
      "    <label>Nhận xét của bạn</label>",
      '    <textarea class="review-comment" rows="4" placeholder="Chia sẻ trải nghiệm sử dụng sản phẩm..."></textarea>',
      "    <label>Hình ảnh sản phẩm</label>",
      '    <input class="review-image-input" type="file" accept="image/*" multiple>',
      '    <p class="review-image-hint">Chọn tối đa 5 ảnh, mỗi ảnh dưới 5MB.</p>',
      '    <div class="review-image-preview"></div>',
      '    <p class="image-count">Chưa chọn ảnh.</p>',
      '    <button type="submit" class="submit-review-btn">Gửi đánh giá</button>',
      "  </form>",
      "</article>"
    ].join("");
  }

  // Hiển thị tổng kết: "Hiển thị X - Y / Z sản phẩm chưa đánh giá"
  function renderSummary(totalItems, currentPage, pageSize) {
    var summary = document.getElementById("reviewSummary");
    if (!summary) {
      return;
    }

    if (!totalItems) {
      summary.textContent = "";
      return;
    }

    var start = (currentPage - 1) * pageSize + 1;
    var end = Math.min(currentPage * pageSize, totalItems);
    summary.textContent = "Hiển thị " + start + " - " + end + " / " + totalItems + " sản phẩm chưa đánh giá";
  }

  /* ---- Tạo thanh phân trang ---- */
  // Nút Trước, các số trang, nút Sau
  function renderPagination(totalItems, currentPage, pageSize) {
    var pagination = document.getElementById("reviewPagination");
    if (!pagination) {
      return;
    }

    pagination.innerHTML = "";

    var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (totalItems <= pageSize) {
      return;
    }

    var html = [];
    html.push('<button type="button" class="review-page-btn" data-page="' + (currentPage - 1) + '"' + (currentPage === 1 ? " disabled" : "") + ">Trước</button>");
    for (var i = 1; i <= totalPages; i += 1) {
      html.push('<button type="button" class="review-page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + "</button>");
    }
    html.push('<button type="button" class="review-page-btn" data-page="' + (currentPage + 1) + '"' + (currentPage === totalPages ? " disabled" : "") + ">Sau</button>");
    pagination.innerHTML = html.join("");
  }

  /* ---- Render trang đánh giá hiện tại ---- */
  // Cắt mảng pendingProducts theo trang, render từng card, gọi bindReviewItems
  function renderReviewPage() {
    var list = document.getElementById("reviewList");
    if (!list) {
      return;
    }

    var totalItems = state.pendingProducts.length;
    if (!totalItems) {
      renderEmpty("Bạn đã đánh giá hết sản phẩm đã mua.");
      return;
    }

    var totalPages = Math.max(1, Math.ceil(totalItems / REVIEW_PAGE_SIZE));
    if (state.page > totalPages) {
      state.page = totalPages;
    }
    if (state.page < 1) {
      state.page = 1;
    }

    var startIndex = (state.page - 1) * REVIEW_PAGE_SIZE;
    var pageItems = state.pendingProducts.slice(startIndex, startIndex + REVIEW_PAGE_SIZE);

    list.innerHTML = pageItems.map(createReviewCard).join("");
    renderSummary(totalItems, state.page, REVIEW_PAGE_SIZE);
    renderPagination(totalItems, state.page, REVIEW_PAGE_SIZE);
    bindReviewItems();
  }

  // Cập nhật giao diện sao và text hiển thị khi người dùng chọn sao
  function updateStarsVisual(item, rating) {
    var stars = item.querySelectorAll(".star-btn");
    var ratingText = item.querySelector(".rating-text");

    stars.forEach(function (star) {
      var starValue = Number(star.getAttribute("data-value") || 0);
      star.classList.toggle("active", starValue <= rating);
    });

    if (ratingText) {
      ratingText.textContent = rating > 0 ? ("Bạn đã chọn " + rating + " sao") : "Chưa chọn sao";
    }
  }

  /* ---- Kiểm tra tính hợp lệ của file ảnh ---- */
  // Tối đa 5 file, mỗi file <= 5MB, phải là định dạng ảnh
  function validateImageFiles(files) {
    if (files.length > MAX_REVIEW_IMAGES) {
      return "Bạn chỉ có thể chọn tối đa " + MAX_REVIEW_IMAGES + " ảnh.";
    }

    for (var i = 0; i < files.length; i += 1) {
      var file = files[i];
      if (!file.type || file.type.indexOf("image/") !== 0) {
        return "Chỉ hỗ trợ tệp hình ảnh.";
      }
      if (file.size > MAX_REVIEW_IMAGE_SIZE) {
        return "Mỗi ảnh đánh giá phải nhỏ hơn 5MB.";
      }
    }

    return "";
  }

  // Hiển thị preview các ảnh đã chọn (dùng URL.createObjectURL)
  function renderSelectedImages(item, files) {
    var preview = item.querySelector(".review-image-preview");
    var count = item.querySelector(".image-count");

    if (!preview || !count) {
      return;
    }

    if (!files.length) {
      preview.innerHTML = "";
      count.textContent = "Chưa chọn ảnh.";
      return;
    }

    preview.innerHTML = files.map(function (file) {
      return '<img class="review-thumb" src="' + escapeHtml(URL.createObjectURL(file)) + '" alt="' + escapeHtml(file.name || "Ảnh đánh giá") + '">';
    }).join("");

    count.textContent = "Đã chọn " + files.length + " ảnh.";
  }

  /* ---- Gửi đánh giá lên API ---- */
  // POST /reviews/ với FormData chứa product_id, customer_id, rating, comment, images
  async function submitReview(productId, rating, comment, files) {
    var formData = new FormData();
    formData.append("product_id", productId);
    formData.append("customer_id", state.customerId);
    formData.append("rating", String(rating));
    formData.append("comment", comment || "");

    files.forEach(function (file) {
      formData.append("images", file, file.name);
    });

    var response = await fetch(TamTai.API_BASE_URL + "/reviews/", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + state.token
      },
      body: formData
    });

    var data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      throw new Error((data && data.detail) || "Không gửi được đánh giá.");
    }

    return data;
  }

  /* ---- Gán sự kiện cho các thẻ đánh giá ---- */
  // Sự kiện click sao, change file ảnh, submit form
  function bindReviewItems() {
    var reviewItems = document.querySelectorAll(".review-item");

    reviewItems.forEach(function (item) {
      var stars = item.querySelectorAll(".star-btn");
      var ratingValue = item.querySelector(".rating-value");
      var form = item.querySelector(".review-form");
      var imageInput = item.querySelector(".review-image-input");

      stars.forEach(function (star) {
        star.addEventListener("click", function () {
          var value = Number(star.getAttribute("data-value") || 0);
          if (ratingValue) {
            ratingValue.value = String(value);
          }
          updateStarsVisual(item, value);
        });
      });

      if (imageInput) {
        imageInput.addEventListener("change", function () {
          var files = Array.prototype.slice.call(imageInput.files || []);
          var validationError = validateImageFiles(files);

          if (validationError) {
            imageInput.value = "";
            renderSelectedImages(item, []);
            alert(validationError);
            return;
          }

          renderSelectedImages(item, files);
        });
      }

      if (!form) {
        return;
      }

      form.addEventListener("submit", async function (event) {
        event.preventDefault();

        var productId = item.getAttribute("data-product-id");
        var rating = Number((ratingValue && ratingValue.value) || 0);
        var commentInput = form.querySelector(".review-comment");
        var comment = commentInput ? commentInput.value.trim() : "";
        var submitBtn = form.querySelector(".submit-review-btn");
        var files = Array.prototype.slice.call((imageInput && imageInput.files) || []);

        if (!productId) {
          alert("Không tìm thấy mã sản phẩm.");
          return;
        }

        if (rating < 1 || rating > 5) {
          alert("Vui lòng chọn số sao trước khi gửi đánh giá.");
          return;
        }

        if (!comment) {
          alert("Vui lòng nhập nhận xét của bạn.");
          return;
        }

        var validationError = validateImageFiles(files);
        if (validationError) {
          alert(validationError);
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
        }

        try {
          var saved = await submitReview(productId, rating, comment, files);
          state.reviewsByProduct[productId] = saved;
          state.pendingProducts = state.pendingProducts.filter(function (product) {
            return product.product_id !== productId;
          });
          renderReviewPage();
          alert("Đã lưu đánh giá vào hệ thống.");
        } catch (error) {
          alert(error.message || "Không gửi được đánh giá.");
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
          }
        }
      });
    });
  }

  // Gán sự kiện click cho các nút phân trang
  function bindPagination() {
    var pagination = document.getElementById("reviewPagination");
    if (!pagination) {
      return;
    }

    pagination.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-page]");
      if (!button || button.disabled) {
        return;
      }

      var page = Number(button.getAttribute("data-page") || 1);
      if (!Number.isFinite(page) || page < 1 || page === state.page) {
        return;
      }

      state.page = page;
      renderReviewPage();
    });
  }

  /* ---- Khởi tạo trang ---- */
  // Kiểm tra đăng nhập, tải sản phẩm đã mua, tải review đã gửi, lọc sản phẩm chưa đánh giá
  document.addEventListener("DOMContentLoaded", async function () {
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");
    TamTai.showAdminMenuLink(document);
    applySidebarProfile();
    bindPagination();

    var canUse = await ensureCustomerContext();
    if (!canUse) {
      renderEmpty("Bạn cần đăng nhập để xem và gửi đánh giá.");
      return;
    }

    var products = await fetchPurchasedProducts();
    var reviewsMap = await fetchMyReviews();

    state.products = products;
    state.reviewsByProduct = reviewsMap;
    state.pendingProducts = buildPendingReviewProducts(products, reviewsMap);
    state.page = 1;

    renderReviewPage();
  });
})();
