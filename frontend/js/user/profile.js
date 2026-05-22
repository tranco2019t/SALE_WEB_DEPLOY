(function () {
  function displayValue(value) {
    var text = (value || "").toString().trim();
    return text ? text : "chưa có";
  }

  function normalizeEditValue(value) {
    var text = (value || "").toString().trim();
    if (!text) {
      return "";
    }
    var lower = text.toLowerCase();
    if (lower === "chưa có" || lower === "nan" || lower === "n/a") {
      return "";
    }
    return text;
  }

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

  function parseMoney(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string" && value.trim()) {
      var parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  function formatMoney(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "chưa có";
    }
    return Number(value).toLocaleString("vi-VN") + "đ";
  }

  function resolveOrderTotal(order) {
    var direct = parseMoney(order && (order.total_amount || order.total));
    if (direct !== null) {
      return direct;
    }

    var items = Array.isArray(order && order.items)
      ? order.items
      : (Array.isArray(order && order.order_items) ? order.order_items : []);

    if (!items.length) {
      return null;
    }

    return items.reduce(function (sum, item) {
      var amount = parseMoney(item.amount);
      if (amount !== null) {
        return sum + amount;
      }

      var quantity = Math.max(0, Number(item.quantity || 0));
      var unitPrice = parseMoney(item.price_at_purchase || item.unit_price || item.unitPrice);
      return sum + ((unitPrice !== null ? unitPrice : 0) * quantity);
    }, 0);
  }

  function mapOrderStatus(rawStatus) {
    var normalized = (rawStatus || "").toString().trim().toLowerCase();
    if (!normalized) {
      return { label: "chưa có", className: "pending" };
    }

    if (normalized.indexOf("deliver") !== -1 || normalized.indexOf("đã giao") !== -1) {
      return { label: "Đã giao", className: "ok" };
    }
    if (normalized.indexOf("ship") !== -1 || normalized.indexOf("giao") !== -1) {
      return { label: "Đang giao", className: "pending" };
    }
    if (normalized.indexOf("cancel") !== -1 || normalized.indexOf("hủy") !== -1) {
      return { label: "Đã hủy", className: "pending" };
    }
    if (normalized.indexOf("pend") !== -1 || normalized.indexOf("wait") !== -1 || normalized.indexOf("chờ") !== -1) {
      return { label: "Chờ xác nhận", className: "pending" };
    }
    return { label: rawStatus, className: "pending" };
  }

  function applyProfileData(profileInput) {
    var profile = profileInput || TamTai.getProfile();
    var fullName = displayValue(profile.fullName);
    var email = displayValue(profile.email);
    var phone = displayValue(profile.phone);

    var nameHeading = document.querySelector(".profile-head h2");
    var emailHeading = document.querySelector(".profile-head p");
    var formInputs = document.querySelectorAll(".account-form input");

    if (nameHeading) {
      nameHeading.textContent = fullName;
    }
    if (emailHeading) {
      emailHeading.textContent = email;
    }
    if (formInputs[0]) {
      formInputs[0].value = fullName;
    }
    if (formInputs[1]) {
      formInputs[1].value = email;
    }
    if (formInputs[2]) {
      formInputs[2].value = phone;
    }
  }

  function renderOrdersTable(orders) {
    var table = document.querySelector(".orders-table");
    if (!table) {
      return;
    }

    var headerRow = table.querySelector(".order-row.order-head");
    if (!headerRow) {
      return;
    }

    table.innerHTML = "";
    table.appendChild(headerRow);

    if (!orders || !orders.length) {
      var emptyRow = document.createElement("div");
      emptyRow.className = "order-row order-empty";
      emptyRow.textContent = "chưa có đơn hàng";
      table.appendChild(emptyRow);
      return;
    }

    orders.slice(0, 4).forEach(function (order) {
      var status = mapOrderStatus(order.status);
      var totalText = formatMoney(resolveOrderTotal(order));
      var row = document.createElement("div");
      row.className = "order-row";
      row.innerHTML = [
        "<span>" + displayValue(order.order_id) + "</span>",
        "<span>" + formatDate(order.order_date) + "</span>",
        "<span>" + totalText + "</span>",
        '<span class="' + status.className + '">' + displayValue(status.label) + "</span>"
      ].join("");
      table.appendChild(row);
    });
  }

  async function syncProfileFromBackend() {
    var token = localStorage.getItem("access_token");
    var role = TamTai.getRole();
    if (!token || role !== "user") {
      applyProfileData();
      renderOrdersTable([]);
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
        applyProfileData();
        renderOrdersTable([]);
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
      applyProfileData(mapped);

      var ordersResponse = await fetch(TamTai.API_BASE_URL + "/orders?skip=0&limit=20", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token
        }
      });

      if (!ordersResponse.ok) {
        renderOrdersTable([]);
        return;
      }

      var orders = await ordersResponse.json();
      renderOrdersTable(Array.isArray(orders) ? orders : []);
    } catch (error) {
      applyProfileData();
      renderOrdersTable([]);
    }
  }

  async function saveProfileToBackend(profile) {
    var token = localStorage.getItem("access_token");
    var customerId = localStorage.getItem("tamtai_customer_id");
    var role = TamTai.getRole();
    if (!token || !customerId || role !== "user") {
      return false;
    }

    var payload = {
      customer_name: profile.fullName || null,
      customer_email: profile.email || null,
      phone_number: profile.phone || null
    };

    try {
      var response = await fetch(TamTai.API_BASE_URL + "/customers/" + encodeURIComponent(customerId), {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");
    TamTai.showAdminMenuLink(document);
    syncProfileFromBackend();

    var saveButton = document.querySelector(".account-form button");
    if (!saveButton) {
      return;
    }

    saveButton.addEventListener("click", async function () {
      var inputs = document.querySelectorAll(".account-form input");
      var fullName = normalizeEditValue(inputs[0] ? inputs[0].value : "");
      var email = normalizeEditValue(inputs[1] ? inputs[1].value : "").toLowerCase();
      var phone = normalizeEditValue(inputs[2] ? inputs[2].value : "");

      var localProfile = {
        fullName: fullName,
        email: email,
        phone: phone
      };

      TamTai.saveProfile(localProfile);
      applyProfileData(localProfile);

      var saved = await saveProfileToBackend(localProfile);
      if (saved) {
        alert("Đã cập nhật thông tin tài khoản.");
      } else {
        alert("Đã lưu tạm trên trình duyệt. Backend chưa cập nhật được lúc này.");
      }
    });
  });
})();
