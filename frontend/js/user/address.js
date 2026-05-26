/* ===== Trang quản lý địa chỉ người dùng ===== */
(function () {
  // Biến trạng thái toàn cục trong module
  var state = {
    customerId: "",  // ID khách hàng hiện tại
    token: "",       // Token xác thực
    addresses: []    // Danh sách địa chỉ
  };

  // Hiển thị giá trị, nếu rỗng trả về "chưa có"
  function displayValue(value) {
    var text = (value || "").toString().trim();
    return text ? text : "chưa có";
  }

  // Lấy tên và số điện thoại từ profile đã lưu
  function getProfileMeta() {
    var profile = TamTai.getProfile();
    return {
      fullName: displayValue(profile.fullName),
      phone: displayValue(profile.phone)
    };
  }

  // Cập nhật sidebar với tên và email của người dùng
  function applySidebarProfile() {
    var profile = TamTai.getProfile();
    var heading = document.querySelector(".profile-head h2");
    var emailText = document.querySelector(".profile-head p");
    if (heading) {
      heading.textContent = displayValue(profile.fullName);
    }
    if (emailText) {
      emailText.textContent = displayValue(profile.email);
    }
  }

  // Ghép các thành phần địa chỉ (street, district, city) thành chuỗi
  function composeAddressLine(address) {
    var parts = [address.street, address.district, address.city, address.zipcode]
      .map(function (item) { return (item || "").toString().trim(); })
      .filter(Boolean);
    if (!parts.length) {
      return "chưa có";
    }
    return parts.join(", ");
  }

  /* ---- Hiển thị danh sách địa chỉ ---- */
  // Mỗi địa chỉ là một thẻ article, địa chỉ mặc định có badge "Mặc định"
  function renderAddressList(addresses) {
    var addressList = document.querySelector(".address-list");
    if (!addressList) {
      return;
    }

    var meta = getProfileMeta();
    addressList.innerHTML = "";

    if (!addresses.length) {
      addressList.innerHTML = '<article class="address-item"><p class="address-line">chưa có địa chỉ</p></article>';
      return;
    }

    addresses.forEach(function (address, index) {
      var isDefault = Number(address.is_default || 0) === 1;
      var item = document.createElement("article");
      item.className = "address-item" + (isDefault ? " default" : "");
      item.setAttribute("data-address-id", address.address_id);

      item.innerHTML = [
        '<div class="address-head">',
        "  <h3>" + (isDefault ? "Địa chỉ mặc định" : "Địa chỉ " + (index + 1)) + "</h3>",
        isDefault ? '  <span class="address-badge">Mặc định</span>' : "",
        "</div>",
        '<p class="address-line">' + meta.fullName + " | " + meta.phone + "</p>",
        '<p class="address-line">' + composeAddressLine(address) + "</p>",
        '<div class="address-actions">',
        '  <button type="button" data-action="delete" class="ghost">Xóa</button>',
        "</div>"
      ].join("");

      addressList.appendChild(item);
    });
  }

  /* ---- Lấy context khách hàng từ API ---- */
  // Đảm bảo customerId và token hợp lệ, đồng bộ profile
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
      localStorage.setItem("tamtai_customer_id", state.customerId);
      TamTai.saveProfile({
        fullName: customer.customer_name || "",
        email: customer.customer_email || "",
        phone: customer.phone_number || "",
        address: customer.address || ""
      });
      applySidebarProfile();
      return Boolean(state.customerId);
    } catch (error) {
      return false;
    }
  }

  /* ---- Tải danh sách địa chỉ từ API ---- */
  // GET /addresses/customer/{customerId}
  async function loadAddresses() {
    var ok = await ensureCustomerContext();
    if (!ok) {
      state.addresses = [];
      renderAddressList([]);
      return;
    }

    try {
      var response = await fetch(
        TamTai.API_BASE_URL + "/addresses/customer/" + encodeURIComponent(state.customerId),
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + state.token
          }
        }
      );

      if (!response.ok) {
        state.addresses = [];
        renderAddressList([]);
        return;
      }

      var data = await response.json();
      state.addresses = Array.isArray(data) ? data : [];
      renderAddressList(state.addresses);
    } catch (error) {
      state.addresses = [];
      renderAddressList([]);
    }
  }

  // Cập nhật tên/số điện thoại khách hàng qua PUT API nếu có thay đổi
  async function updateCustomerProfile(fullName, phone) {
    var payload = {};
    if (fullName) {
      payload.customer_name = fullName;
    }
    if (phone) {
      payload.phone_number = phone;
    }

    if (!Object.keys(payload).length) {
      return true;
    }

    try {
      var response = await fetch(TamTai.API_BASE_URL + "/customers/" + encodeURIComponent(state.customerId), {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + state.token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /* ---- Thêm địa chỉ mới ---- */
  // Lấy dữ liệu từ form (tỉnh/huyện/xã/chi tiết), POST /addresses/
  // Nếu có tên/sđt mới thì cập nhật profile luôn
  async function createAddress() {
    var form = document.querySelector(".address-form");
    if (!form) {
      return;
    }

    var fields = form.querySelectorAll("input");
    var fullName = fields[0] ? fields[0].value.trim() : "";
    var phone = fields[1] ? fields[1].value.trim() : "";
    var province = fields[2] ? fields[2].value.trim() : "";
    var district = fields[3] ? fields[3].value.trim() : "";
    var ward = fields[4] ? fields[4].value.trim() : "";
    var detail = fields[5] ? fields[5].value.trim() : "";

    if (!province || !district || !detail) {
      alert("Vui lòng nhập ít nhất Tỉnh/Thành phố, Quận/Huyện và Địa chỉ chi tiết.");
      return;
    }

    var ok = await ensureCustomerContext();
    if (!ok) {
      alert("Bạn cần đăng nhập lại để thêm địa chỉ.");
      return;
    }

    var street = detail + (ward ? ", " + ward : "");
    var payload = {
      customer_id: state.customerId,
      street: street,
      city: province,
      district: district,
      zipcode: null,
      is_default: state.addresses.length ? 0 : 1
    };

    try {
      var response = await fetch(TamTai.API_BASE_URL + "/addresses/", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + state.token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("create_failed");
      }

      if (fullName || phone) {
        await updateCustomerProfile(fullName, phone);
        TamTai.saveProfile({
          fullName: fullName || TamTai.getProfile().fullName || "",
          email: TamTai.getProfile().email || "",
          phone: phone || TamTai.getProfile().phone || "",
          address: street
        });
        applySidebarProfile();
      }

      fields.forEach(function (field) { field.value = ""; });
      await loadAddresses();
      alert("Đã thêm địa chỉ.");
    } catch (error) {
      alert("Không thêm được địa chỉ. Vui lòng thử lại.");
    }
  }

  /* ---- Xóa địa chỉ ---- */
  // DELETE /addresses/{addressId}, sau đó tải lại danh sách
  async function deleteAddress(addressId) {
    var ok = await ensureCustomerContext();
    if (!ok) {
      alert("Bạn cần đăng nhập lại để xóa địa chỉ.");
      return;
    }

    try {
      var response = await fetch(TamTai.API_BASE_URL + "/addresses/" + encodeURIComponent(addressId), {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + state.token
        }
      });
      if (!response.ok) {
        throw new Error("delete_failed");
      }
      await loadAddresses();
    } catch (error) {
      alert("Không xóa được địa chỉ. Vui lòng thử lại.");
    }
  }

  // Gán sự kiện click cho các nút Xóa trong danh sách địa chỉ (event delegation)
  function bindAddressActions() {
    var addressList = document.querySelector(".address-list");
    if (!addressList) {
      return;
    }

    addressList.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }

      var action = button.getAttribute("data-action");
      var item = button.closest(".address-item");
      if (!item) {
        return;
      }
      var addressId = item.getAttribute("data-address-id");

      if (action === "delete" && addressId) {
        deleteAddress(addressId);
      }
    });
  }

  // Gán sự kiện submit cho form thêm địa chỉ mới
  function bindAddAddressForm() {
    var form = document.querySelector(".address-form");
    if (!form) {
      return;
    }

    var saveBtn = form.querySelector("button");
    if (!saveBtn) {
      return;
    }

    saveBtn.addEventListener("click", function () {
      createAddress();
    });
  }

  /* ---- Khởi tạo trang ---- */
  document.addEventListener("DOMContentLoaded", function () {
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");
    TamTai.showAdminMenuLink(document);
    applySidebarProfile();
    bindAddressActions();
    bindAddAddressForm();
    loadAddresses();
  });
})();
