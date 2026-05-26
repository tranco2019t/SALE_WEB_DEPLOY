/* ===== Trang đổi mật khẩu người dùng ===== */
(function () {
  // Hiển thị giá trị, nếu rỗng trả về "chua co"
  function displayValue(value) {
    var text = (value || "").toString().trim();
    return text ? text : "chua co";
  }

  // Cập nhật sidebar hiển thị tên và email người dùng
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

  /* ---- Đồng bộ hồ sơ từ backend ---- */
  // GET /customers/me để lấy thông tin và lưu vào localStorage
  async function syncProfileFromBackend() {
    var token = localStorage.getItem("access_token");
    var role = TamTai.getRole();
    if (!token || role !== "user") {
      return;
    }

    try {
      var response = await fetch(TamTai.API_BASE_URL + "/customers/me", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token
        }
      });

      if (!response.ok) {
        return;
      }

      var customer = await response.json();
      var mapped = {
        fullName: customer.customer_name || "",
        email: customer.customer_email || "",
        phone: customer.phone_number || "",
        address: customer.address || ""
      };

      localStorage.setItem("tamtai_customer_id", customer.customer_id || "");
      localStorage.setItem("tamtai_customer_profile", JSON.stringify(customer));
      TamTai.saveProfile(mapped);
      applySidebarProfile(mapped);
    } catch (error) {
      // Keep local profile fallback
    }
  }

  /* ---- Gọi API đổi mật khẩu ---- */
  // POST /customers/change-password với current_password và new_password
  async function changePasswordOnBackend(currentPassword, newPassword) {
    var token = localStorage.getItem("access_token");
    var role = TamTai.getRole();
    if (!token || role !== "user") {
      throw new Error("Ban can dang nhap lai de doi mat khau.");
    }

    var response = await fetch(TamTai.API_BASE_URL + "/customers/change-password", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    });

    var data = await response.json();
    if (!response.ok) {
      throw new Error((data && data.detail) || "Khong doi duoc mat khau.");
    }
  }

  /* ---- Khởi tạo trang ---- */
  // Kiểm tra form: validate mật khẩu (tối thiểu 8 ký tự, có chữ hoa, thường, số)
  // Nếu hợp lệ thì gọi API, thành công thì tự động logout
  document.addEventListener("DOMContentLoaded", function () {
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");
    TamTai.showAdminMenuLink(document);
    applySidebarProfile();
    syncProfileFromBackend();

    var form = document.querySelector(".password-form");
    if (!form) {
      return;
    }

    var submitBtn = form.querySelector("button");
    if (!submitBtn) {
      return;
    }

    submitBtn.addEventListener("click", async function () {
      var inputs = form.querySelectorAll("input");
      var currentPassword = inputs[0] ? inputs[0].value.trim() : "";
      var newPassword = inputs[1] ? inputs[1].value.trim() : "";
      var confirmPassword = inputs[2] ? inputs[2].value.trim() : "";

      if (!currentPassword || !newPassword || !confirmPassword) {
        alert("Vui long nhap du 3 truong mat khau.");
        return;
      }

      if (newPassword.length < 8) {
        alert("Mat khau moi can it nhat 8 ky tu.");
        return;
      }

      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        alert("Mat khau moi can co chu hoa, chu thuong va so.");
        return;
      }

      if (newPassword !== confirmPassword) {
        alert("Mat khau xac nhan chua khop.");
        return;
      }

      submitBtn.disabled = true;
      try {
        await changePasswordOnBackend(currentPassword, newPassword);
        inputs.forEach(function (input) { input.value = ""; });
        alert("Da doi mat khau thanh cong. Vui long dang nhap lai.");
        TamTai.logout("../auth/login.html");
      } catch (error) {
        alert(error.message || "Khong doi duoc mat khau.");
      } finally {
        submitBtn.disabled = false;
      }
    });
  });
})();
