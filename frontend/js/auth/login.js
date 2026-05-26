/* ============================================================
   TamTai - Đăng nhập
   Xử lý form đăng nhập, phân biệt admin/user, Google Sign-In
   ============================================================ */
(function () {
  /**
   * togglePassword - Bật/tắt hiển thị mật khẩu
   * Đổi type input giữa "password" và "text", đổi icon mắt
   * @param {HTMLElement} btn - Nút eye-btn được click
   */
  function togglePassword(btn) {
    var input = btn.parentElement.querySelector("input");
    var icon = btn.querySelector("i");
    if (!input || !icon) {
      return;
    }
    // Nếu đang hiện → ẩn đi, nếu đang ẩn → hiện ra
    var showing = input.type === "text";
    input.type = showing ? "password" : "text";
    icon.classList.toggle("fa-eye", showing);
    icon.classList.toggle("fa-eye-slash", !showing);
  }

  /**
   * loginAdmin - Đăng nhập tài khoản admin
   * Gửi POST request đến /admin/login với form-data
   * @param {string} email - Email admin
   * @param {string} password - Mật khẩu
   * @param {string} redirectTarget - Hướng chuyển tiếp (admin or user)
   */
  async function loginAdmin(email, password, redirectTarget) {
    // API admin dùng form-data (OAuth2 compatible)
    var formBody = new URLSearchParams();
    formBody.append("username", email);
    formBody.append("password", password);

    var adminResponse = await fetch(TamTai.API_BASE_URL + "/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString()
    });

    var adminData = await adminResponse.json();
    if (!adminResponse.ok) {
      throw new Error(adminData.detail || "Admin login failed");
    }

    // Lưu thông tin đăng nhập vào localStorage
    localStorage.setItem("access_token", adminData.access_token);
    localStorage.setItem("token_type", adminData.token_type || "bearer");
    localStorage.setItem("tamtai_role", "admin");
    // Chuyển hướng đến trang admin
    window.location.href = redirectTarget === "admin" ? "../admin/admin.html" : "../admin/admin.html";
  }

  /**
   * loginCustomer - Đăng nhập tài khoản khách hàng
   * Gửi POST request đến /customers/login với JSON body
   * @param {string} email - Email hoặc số điện thoại
   * @param {string} password - Mật khẩu
   * @param {string} redirectTarget - Hướng chuyển tiếp
   */
  async function loginCustomer(email, password, redirectTarget) {
    var response = await fetch(TamTai.API_BASE_URL + "/customers/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email_or_phone: email,
        password: password
      })
    });

    var data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Login failed");
    }

    // Lưu thông tin đăng nhập
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("token_type", data.token_type || "bearer");
    localStorage.setItem("tamtai_role", "user");
    // Chuyển hướng: user → profile, redirect=admin → admin
    window.location.href = redirectTarget === "admin" ? "../admin/admin.html" : "../user/profile.html";
  }

  /**
   * handleGoogleLogin - Xử lý đăng nhập bằng Google
   * Gửi id_token lên backend để xác thực
   * @param {object} response - Response từ Google Sign-In (chứa credential)
   */
  async function handleGoogleLogin(response) {
    try {
      // Gửi id_token lên backend để xác thực Google
      var apiResponse = await fetch(TamTai.API_BASE_URL + "/customers/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: response.credential })
      });

      var data = await apiResponse.json();
      if (!apiResponse.ok) {
        throw new Error(data.detail || "Google login failed");
      }

      // Lưu thông tin và chuyển hướng
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token_type", data.token_type || "bearer");
      localStorage.setItem("tamtai_role", "user");
      window.location.href = "../user/profile.html";
    } catch (error) {
      alert(error.message || "Google sign-in failed. Please try again.");
    }
  }

  /**
   * initGoogleButton - Khởi tạo nút Google Sign-In
   * Sử dụng thư viện Google Identity Services để render nút đăng nhập
   */
  function initGoogleButton() {
    // Kiểm tra thư viện Google Identity Services đã load chưa
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      return;
    }

    var googleLoginBtn = document.getElementById("googleLoginBtn");
    if (!googleLoginBtn) {
      return;
    }

    // Khởi tạo Google Sign-In với client ID và callback
    google.accounts.id.initialize({
      client_id: TamTai.GOOGLE_CLIENT_ID,
      callback: handleGoogleLogin
    });

    // Render nút Google Sign-In với tùy chỉnh giao diện
    google.accounts.id.renderButton(googleLoginBtn, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "signin_with"
    });
  }

  // ===================== KHỞI TẠO KHI DOM SẴN SÀNG =====================
  document.addEventListener("DOMContentLoaded", function () {
    // Thiết lập tìm kiếm trên header
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");

    // Gán sự kiện toggle mật khẩu cho các nút eye
    document.querySelectorAll(".eye-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        togglePassword(btn);
      });
    });

    // Lấy các phần tử form
    var form = document.getElementById("loginForm");
    var emailInput = document.getElementById("loginEmail");
    var passwordInput = document.getElementById("loginPassword");
    // Đọc tham số redirect từ URL (nếu có)
    var redirectTarget = new URLSearchParams(window.location.search).get("redirect");

    if (form && emailInput && passwordInput) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();  // Ngăn reload trang

        var email = emailInput.value.trim().toLowerCase();
        var password = passwordInput.value.trim();

        // Kiểm tra đầu vào
        if (!email || !password) {
          alert("Vui lòng nhập email và mật khẩu.");
          return;
        }

        try {
          // Phân biệt admin và user dựa trên email
          if (email === "admin@tamtai.vn") {
            await loginAdmin(email, password, redirectTarget);
          } else {
            await loginCustomer(email, password, redirectTarget);
          }
        } catch (error) {
          alert(error.message || "Đăng nhập thất bại.");
        }
      });
    }

    // Khởi tạo Google Sign-In sau khi trang load xong
    window.addEventListener("load", initGoogleButton);
  });
})();
