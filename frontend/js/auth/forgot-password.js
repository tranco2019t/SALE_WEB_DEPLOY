/* ============================================================
   TamTai - Quên mật khẩu
   Xử lý: yêu cầu OTP, xác thực OTP, đặt lại mật khẩu
   ============================================================ */
(function () {
  var otpCooldownTimer = null;      // Timer đếm ngược gửi lại OTP

  // state - Lưu trạng thái xác thực OTP
  var state = {
    verifiedEmail: "",   // Email đã xác thực OTP
    resetToken: ""       // Token cho phép đặt lại mật khẩu
  };

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
   * isValidEmail - Kiểm tra email hợp lệ
   * @param {string} email - Email cần kiểm tra
   * @returns {boolean}
   */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * setStatus - Cập nhật thông báo trạng thái
   * @param {HTMLElement} textEl - Phần tử hiển thị
   * @param {string} message - Nội dung
   * @param {boolean} isError - true = màu đỏ, false = màu xanh
   */
  function setStatus(textEl, message, isError) {
    if (!textEl) {
      return;
    }
    textEl.textContent = message;
    textEl.style.color = isError ? "#cc3d3d" : "#4d8f49";  // Đỏ/xanh
  }

  /**
   * disablePasswordFields - Vô hiệu hóa hoặc kích hoạt các trường mật khẩu
   * Ngăn người dùng nhập mật khẩu mới trước khi xác thực OTP
   * @param {boolean} disabled - true = vô hiệu hóa, false = kích hoạt
   */
  function disablePasswordFields(disabled) {
    var newPasswordInput = document.getElementById("forgotNewPassword");
    var confirmPasswordInput = document.getElementById("forgotConfirmPassword");
    var submitBtn = document.getElementById("forgotSubmitBtn");

    if (newPasswordInput) {
      newPasswordInput.disabled = disabled;
      if (disabled) newPasswordInput.value = "";  // Xóa giá trị khi disable
    }
    if (confirmPasswordInput) {
      confirmPasswordInput.disabled = disabled;
      if (disabled) confirmPasswordInput.value = "";
    }
    if (submitBtn) {
      submitBtn.disabled = disabled;
    }
  }

  /**
   * clearVerificationState - Xóa trạng thái xác thực OTP
   * Reset email và token, vô hiệu hóa trường mật khẩu
   */
  function clearVerificationState() {
    state.verifiedEmail = "";
    state.resetToken = "";
    disablePasswordFields(true);  // Khóa trường mật khẩu
  }

  /**
   * startOtpCooldown - Đếm ngược thời gian chờ gửi lại OTP
   * @param {HTMLElement} button - Nút gửi OTP
   * @param {number} seconds - Thời gian chờ (giây)
   */
  function startOtpCooldown(button, seconds) {
    var remaining = Number(seconds || 60);
    button.disabled = true;  // Vô hiệu hóa nút trong thời gian chờ
    button.textContent = "Gui lai (" + remaining + "s)";

    // Xóa timer cũ nếu có
    if (otpCooldownTimer) {
      clearInterval(otpCooldownTimer);
    }

    // Đếm ngược mỗi 1 giây
    otpCooldownTimer = setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        // Hết thời gian chờ → kích hoạt lại nút
        clearInterval(otpCooldownTimer);
        otpCooldownTimer = null;
        button.disabled = false;
        button.textContent = "Gửi mã";
        return;
      }
      button.textContent = "Gui lai (" + remaining + "s)";
    }, 1000);
  }

  /**
   * requestOtp - Gửi yêu cầu OTP quên mật khẩu
   * Gọi API /customers/forgot-password/request-otp
   * @param {string} email - Email yêu cầu
   * @param {HTMLElement} sendOtpBtn - Nút gửi OTP
   * @param {HTMLElement} statusEl - Phần tử hiển thị trạng thái
   * @throws {Error} Nếu API lỗi
   */
  async function requestOtp(email, sendOtpBtn, statusEl) {
    var response = await fetch(TamTai.API_BASE_URL + "/customers/forgot-password/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    });

    var data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Khong gui duoc OTP.");
    }

    var ttl = data.expires_in_minutes || 10;              // Thời gian hiệu lực
    var cooldown = data.resend_after_seconds || 60;       // Thời gian chờ gửi lại
    setStatus(statusEl, "OTP da gui toi " + email + ". Hieu luc " + ttl + " phut.", false);
    startOtpCooldown(sendOtpBtn, cooldown);               // Bắt đầu đếm ngược
  }

  /**
   * verifyOtp - Xác thực mã OTP quên mật khẩu
   * Gọi API /customers/forgot-password/verify-otp
   * @param {string} email - Email xác thực
   * @param {string} otpCode - Mã OTP 6 chữ số
   * @returns {object} Dữ liệu API (chứa reset_token)
   * @throws {Error} Nếu OTP không hợp lệ
   */
  async function verifyOtp(email, otpCode) {
    var response = await fetch(TamTai.API_BASE_URL + "/customers/forgot-password/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        otp_code: otpCode
      })
    });

    var data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "OTP khong hop le.");
    }

    return data;  // Trả về dữ liệu (chứa reset_token)
  }

  /**
   * resetPassword - Đặt lại mật khẩu mới
   * Gọi API /customers/forgot-password/reset
   * @param {string} email - Email
   * @param {string} resetToken - Token từ bước xác thực OTP
   * @param {string} newPassword - Mật khẩu mới
   * @throws {Error} Nếu API lỗi
   */
  async function resetPassword(email, resetToken, newPassword) {
    var response = await fetch(TamTai.API_BASE_URL + "/customers/forgot-password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        reset_token: resetToken,
        new_password: newPassword
      })
    });

    var data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Khong cap nhat duoc mat khau.");
    }
  }

  // ===================== KHỞI TẠO KHI DOM SẴN SÀNG =====================
  document.addEventListener("DOMContentLoaded", function () {
    // Thiết lập tìm kiếm
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");

    // Lấy các phần tử DOM
    var form = document.getElementById("forgotPasswordForm");
    var emailInput = document.getElementById("forgotEmail");
    var otpInput = document.getElementById("forgotOtp");
    var sendOtpBtn = document.getElementById("forgotSendOtpBtn");
    var verifyOtpBtn = document.getElementById("forgotVerifyOtpBtn");
    var statusEl = document.getElementById("forgotOtpStatusText");
    var newPasswordInput = document.getElementById("forgotNewPassword");
    var confirmPasswordInput = document.getElementById("forgotConfirmPassword");

    // Gán sự kiện toggle mật khẩu
    document.querySelectorAll(".eye-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        togglePassword(btn);
      });
    });

    // Khởi tạo: khóa trường mật khẩu
    clearVerificationState();

    // Kiểm tra tất cả phần tử tồn tại
    if (!form || !emailInput || !otpInput || !sendOtpBtn || !verifyOtpBtn || !statusEl || !newPasswordInput || !confirmPasswordInput) {
      return;
    }

    // Khi người dùng thay đổi email → reset trạng thái xác thực
    emailInput.addEventListener("input", function () {
      clearVerificationState();
      setStatus(statusEl, "Mã OTP có hiệu lực 10 phút.", false);
    });

    // Khi người dùng thay đổi OTP → reset trạng thái xác thực
    otpInput.addEventListener("input", function () {
      clearVerificationState();
      setStatus(statusEl, "Mã OTP có hiệu lực 10 phút.", false);
    });

    // ===== Gửi OTP =====
    sendOtpBtn.addEventListener("click", async function () {
      var email = emailInput.value.trim().toLowerCase();
      clearVerificationState();

      if (!isValidEmail(email)) {
        setStatus(statusEl, "Vui long nhap email hop le.", true);
        return;
      }

      sendOtpBtn.disabled = true;
      try {
        await requestOtp(email, sendOtpBtn, statusEl);
      } catch (error) {
        sendOtpBtn.disabled = false;
        setStatus(statusEl, error.message || "Khong gui duoc OTP.", true);
      }
    });

    // ===== Xác thực OTP =====
    verifyOtpBtn.addEventListener("click", async function () {
      var email = emailInput.value.trim().toLowerCase();
      var otpCode = otpInput.value.trim();
      clearVerificationState();

      if (!isValidEmail(email)) {
        setStatus(statusEl, "Vui long nhap email hop le.", true);
        return;
      }
      if (!/^\d{6}$/.test(otpCode)) {
        setStatus(statusEl, "OTP phai gom dung 6 chu so.", true);
        return;
      }

      verifyOtpBtn.disabled = true;
      try {
        // Xác thực OTP → nhận reset_token
        var payload = await verifyOtp(email, otpCode);
        state.verifiedEmail = email;
        state.resetToken = payload.reset_token || "";
        disablePasswordFields(false);  // Mở khóa trường mật khẩu
        setStatus(statusEl, "Xac minh OTP thanh cong. Ban co the dat mat khau moi.", false);
      } catch (error) {
        setStatus(statusEl, error.message || "OTP khong hop le.", true);
      } finally {
        verifyOtpBtn.disabled = false;
      }
    });

    // ===== Submit form đặt lại mật khẩu =====
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var email = emailInput.value.trim().toLowerCase();
      var password = newPasswordInput.value.trim();
      var confirm = confirmPasswordInput.value.trim();

      // Kiểm tra đã xác thực OTP chưa
      if (!state.resetToken || state.verifiedEmail !== email) {
        alert("Ban can xac minh OTP dung email truoc khi dat mat khau moi.");
        return;
      }

      // Validation
      if (password.length < 6) {
        alert("Mat khau moi toi thieu 6 ky tu.");
        return;
      }
      if (password !== confirm) {
        alert("Mat khau xac nhan chua khop.");
        return;
      }

      var submitBtn = document.getElementById("forgotSubmitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;  // Vô hiệu hóa nút submit
      }

      try {
        // Gọi API đặt lại mật khẩu
        await resetPassword(email, state.resetToken, password);
        alert("Cap nhat mat khau thanh cong. Vui long dang nhap lai.");
        window.location.href = "login.html";  // Chuyển đến trang đăng nhập
      } catch (error) {
        alert(error.message || "Khong cap nhat duoc mat khau.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;  // Kích hoạt lại nút
        }
      }
    });
  });
})();
