/* ============================================================
   TamTai - Đăng ký tài khoản
   Xử lý: gửi OTP, xác thực OTP, đăng ký với mật khẩu, Google Sign-Up
   ============================================================ */
(function () {
  var otpCooldownTimer = null;  // Timer đếm ngược gửi lại OTP

  /**
   * togglePassword - Bật/tắt hiển thị mật khẩu
   * @param {HTMLElement} btn - Nút eye-btn
   */
  function togglePassword(btn) {
    var input = btn.parentElement.querySelector("input");
    var icon = btn.querySelector("i");
    if (!input || !icon) {
      return;
    }
    // Chuyển đổi giữa hiện/ẩn mật khẩu
    var showing = input.type === "text";
    input.type = showing ? "password" : "text";
    icon.classList.toggle("fa-eye", showing);
    icon.classList.toggle("fa-eye-slash", !showing);
  }

  /**
   * setOtpStatus - Cập nhật trạng thái OTP (thành công/lỗi)
   * @param {HTMLElement} textEl - Phần tử hiển thị thông báo
   * @param {string} message - Nội dung thông báo
   * @param {boolean} isError - true nếu là thông báo lỗi (màu đỏ)
   */
  function setOtpStatus(textEl, message, isError) {
    if (!textEl) {
      return;
    }
    textEl.textContent = message;
    textEl.style.color = isError ? "#cc3d3d" : "#4d8f49";  // Đỏ cho lỗi, xanh cho thành công
  }

  /**
   * startOtpCooldown - Bắt đầu đếm ngược trước khi cho phép gửi lại OTP
   * Vô hiệu hóa nút gửi, hiển thị thời gian còn lại, tự động kích hoạt lại sau khi hết giờ
   * @param {HTMLElement} button - Nút gửi OTP
   * @param {number} seconds - Thời gian chờ (mặc định 60s)
   */
  function startOtpCooldown(button, seconds) {
    var remaining = Number(seconds || 60);
    button.disabled = true;  // Vô hiệu hóa nút
    button.textContent = "Resend (" + remaining + "s)";

    // Xóa timer cũ nếu có
    if (otpCooldownTimer) {
      clearInterval(otpCooldownTimer);
    }

    // Đếm ngược mỗi giây
    otpCooldownTimer = setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        // Hết thời gian chờ → kích hoạt lại nút
        clearInterval(otpCooldownTimer);
        otpCooldownTimer = null;
        button.disabled = false;
        button.textContent = "Send code";
        return;
      }
      button.textContent = "Resend (" + remaining + "s)";
    }, 1000);
  }

  /**
   * isValidEmail - Kiểm tra định dạng email hợp lệ
   * @param {string} email - Email cần kiểm tra
   * @returns {boolean} true nếu email hợp lệ
   */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);  // Regex kiểm tra email cơ bản
  }

  /**
   * sendOtp - Gửi mã OTP đến email để xác thực đăng ký
   * Gọi API /customers/register/request-otp
   * @param {string} email - Email nhận OTP
   * @param {HTMLElement} sendOtpBtn - Nút gửi OTP (để bật/tắt đếm ngược)
   * @param {HTMLElement} otpStatusText - Phần tử hiển thị trạng thái
   * @throws {Error} Nếu API trả về lỗi
   */
  async function sendOtp(email, sendOtpBtn, otpStatusText) {
    var response = await fetch(TamTai.API_BASE_URL + "/customers/register/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    });

    var data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Failed to send OTP code");
    }

    // Lấy thời gian hiệu lực và thời gian chờ từ API
    var ttl = data.expires_in_minutes || 10;
    var cooldown = data.resend_after_seconds || 60;
    setOtpStatus(otpStatusText, "OTP đã gửi tới " + email + ". Mã hết hạn sau " + ttl + " phút.", false);
    startOtpCooldown(sendOtpBtn, cooldown);  // Bắt đầu đếm ngược
  }

  /**
   * registerWithOtp - Đăng ký tài khoản với OTP
   * Gọi API /customers/register/with-otp
   * @param {object} payload - Thông tin đăng ký {customer_name, customer_email, password, otp_code}
   * @throws {Error} Nếu API trả về lỗi
   */
  async function registerWithOtp(payload) {
    var response = await fetch(TamTai.API_BASE_URL + "/customers/register/with-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    var data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Registration failed");
    }
    // Hàm không trả về dữ liệu → thành công nếu không throw
  }

  /**
   * handleGoogleRegister - Xử lý đăng ký bằng Google
   * Gửi id_token lên backend → tự động tạo tài khoản hoặc đăng nhập
   * @param {object} response - Response từ Google Sign-In
   */
  async function handleGoogleRegister(response) {
    try {
      // Gửi id_token lên backend
      var apiResponse = await fetch(TamTai.API_BASE_URL + "/customers/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: response.credential })
      });

      var data = await apiResponse.json();
      if (!apiResponse.ok) {
        throw new Error(data.detail || "Google register failed");
      }

      // Lưu thông tin và chuyển hướng đến profile
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token_type", data.token_type || "bearer");
      localStorage.setItem("tamtai_role", "user");
      window.location.href = "../user/profile.html";
    } catch (error) {
          alert(error.message || "Đăng ký thất bại.");
    }
  }

  /**
   * initGoogleButton - Khởi tạo nút Google Sign-Up
   * Sử dụng Google Identity Services
   */
  function initGoogleButton() {
    // Kiểm tra thư viện Google đã load
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      return;
    }

    var googleRegisterBtn = document.getElementById("googleRegisterBtn");
    if (!googleRegisterBtn) {
      return;
    }

    // Khởi tạo Google Sign-In
    google.accounts.id.initialize({
      client_id: TamTai.GOOGLE_CLIENT_ID,
      callback: handleGoogleRegister
    });

    // Render nút Google (sign up)
    google.accounts.id.renderButton(googleRegisterBtn, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "signup_with"
    });
  }

  // ===================== KHỞI TẠO KHI DOM SẴN SÀNG =====================
  document.addEventListener("DOMContentLoaded", function () {
    // Thiết lập tìm kiếm
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");

    // Lấy các phần tử DOM
    var form = document.getElementById("registerForm");
    var registerName = document.getElementById("registerName");
    var registerEmail = document.getElementById("registerEmail");
    var registerOtp = document.getElementById("registerOtp");
    var registerPassword = document.getElementById("registerPassword");
    var registerConfirmPassword = document.getElementById("registerConfirmPassword");
    var sendOtpBtn = document.getElementById("sendOtpBtn");
    var otpStatusText = document.getElementById("otpStatusText");

    // Gán sự kiện toggle mật khẩu
    document.querySelectorAll(".eye-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        togglePassword(btn);
      });
    });

    // ===== Gửi OTP =====
    if (sendOtpBtn && registerEmail) {
      sendOtpBtn.addEventListener("click", async function () {
        var email = registerEmail.value.trim().toLowerCase();
        if (!isValidEmail(email)) {
          setOtpStatus(otpStatusText, "Email không hợp lệ.", true);
          return;
        }

        sendOtpBtn.disabled = true;
        try {
          await sendOtp(email, sendOtpBtn, otpStatusText);
        } catch (error) {
          sendOtpBtn.disabled = false;  // Kích hoạt lại nút nếu lỗi
          setOtpStatus(otpStatusText, error.message || "Không gửi được OTP.", true);
        }
      });
    }

    // ===== Submit form đăng ký =====
    if (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Đọc giá trị từ form
        var customer_name = registerName.value.trim();
        var customer_email = registerEmail.value.trim().toLowerCase();
        var otp_code = registerOtp.value.trim();
        var password = registerPassword.value;
        var confirmPassword = registerConfirmPassword.value;

        // ===== Validation =====
        if (!customer_name || !customer_email || !password || !confirmPassword || !otp_code) {
          alert("Vui lòng điền đủ thông tin và mã OTP.");
          return;
        }
        if (!isValidEmail(customer_email)) {
          alert("Email không hợp lệ.");
          return;
        }
        if (!/^\d{6}$/.test(otp_code)) {
          alert("OTP phải gồm đúng 6 chữ số.");
          return;
        }
        if (password.length < 6) {
          alert("Mật khẩu tối thiểu 6 ký tự.");
          return;
        }
        if (password !== confirmPassword) {
          alert("Mật khẩu xác nhận chưa khớp.");
          return;
        }

        try {
          // Gọi API đăng ký
          await registerWithOtp({
            customer_name: customer_name,
            customer_email: customer_email,
            password: password,
            otp_code: otp_code
          });

          alert("Đăng ký thành công. Bạn có thể đăng nhập ngay.");
          window.location.href = "login.html";  // Chuyển đến trang đăng nhập
        } catch (error) {
          alert(error.message || "Đăng ký thất bại.");
        }
      });
    }

    // Khởi tạo Google Sign-Up
    window.addEventListener("load", initGoogleButton);
  });
})();

