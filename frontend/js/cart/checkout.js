(function () {
  var DEFAULT_IMAGE = (window.TamTai && TamTai.DEFAULT_PRODUCT_IMAGE) || "../../images/acer-refurbished-laptop-500x500.webp";
  var checkoutState = {
    customerId: "",
    profile: null,
    addresses: [],
    selectedAddressId: ""
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

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

  function getShippingFee() {
    var checked = document.querySelector('input[name="shipping"]:checked');
    if (!checked) {
      return 0;
    }

    var wrapper = checked.closest(".method-item");
    if (!wrapper) {
      return 0;
    }

    var amountEl = wrapper.querySelector("strong");
    return amountEl ? TamTai.parseCurrency(amountEl.textContent) : 0;
  }

  function getShippingMethodLabel() {
    var checked = document.querySelector('input[name="shipping"]:checked');
    if (!checked) {
      return "";
    }

    var wrapper = checked.closest(".method-item");
    var text = wrapper ? wrapper.querySelector("span") : null;
    return text ? String(text.textContent || "").trim() : "";
  }

  function getPaymentMethodLabel() {
    var checked = document.querySelector('input[name="payment"]:checked');
    if (!checked) {
      return "";
    }

    var wrapper = checked.closest(".method-item");
    var text = wrapper ? wrapper.querySelector("span") : null;
    return text ? String(text.textContent || "").trim() : "";
  }

  function ensureSummaryContainer() {
    var orderSummary = document.querySelector(".order-summary");
    if (!orderSummary) {
      return null;
    }

    var listWrap = orderSummary.querySelector("#checkoutSummaryItems");
    if (listWrap) {
      return listWrap;
    }

    listWrap = document.createElement("div");
    listWrap.id = "checkoutSummaryItems";

    var firstSummaryItem = orderSummary.querySelector(".summary-item");
    if (firstSummaryItem) {
      orderSummary.querySelectorAll(".summary-item").forEach(function (item) {
        listWrap.appendChild(item);
      });
      orderSummary.insertBefore(listWrap, orderSummary.querySelector(".price-line"));
    }

    return listWrap;
  }

  function toImageSrc(imageUrl) {
    var raw = String(imageUrl || "").trim();
    if (!raw) {
      return DEFAULT_IMAGE;
    }

    if (/^https?:\/\//i.test(raw) || raw.indexOf("data:") === 0) {
      return raw;
    }

    if (window.TamTai && typeof TamTai.buildApiUrl === "function") {
      if (raw.charAt(0) === "/") {
        return TamTai.buildApiUrl(raw);
      }
      return TamTai.buildApiUrl("/" + raw);
    }

    return raw;
  }

  function renderSummaryItems() {
    var cart = TamTai.getCart();
    var listWrap = ensureSummaryContainer();
    if (!listWrap) {
      return { subtotal: 0, total: 0 };
    }

    if (!cart.length) {
      listWrap.innerHTML = '<p class="empty-cart-note">Giỏ hàng đang trống.</p>';
    } else {
      listWrap.innerHTML = cart.map(function (item) {
        var image = toImageSrc(item.image);
        var name = String(item.name || "Sản phẩm");
        var qty = Math.max(1, Number(item.qty || 1));
        var price = Number(item.price || 0);

        return [
          '<div class="summary-item">',
          '  <div class="thumb"><img src="' + escapeHtml(image) + '" alt="' + escapeHtml(name) + '"></div>',
          '  <div class="meta">',
          "    <h3>" + escapeHtml(name) + "</h3>",
          "    <p>SL: " + qty + "</p>",
          "  </div>",
          "  <strong>" + TamTai.formatCurrency(price * qty) + "</strong>",
          "</div>"
        ].join("");
      }).join("");
    }

    var subtotal = cart.reduce(function (sum, item) {
      return sum + Number(item.price || 0) * Math.max(1, Number(item.qty || 1));
    }, 0);
    var shippingFee = getShippingFee();
    var discountAmount = window._checkoutDiscountAmount || 0;
    var total = subtotal + shippingFee - discountAmount;
    if (total < 0) {
      total = 0;
    }

    var subtotalEl = document.getElementById("checkoutSubtotal");
    var discountLine = document.getElementById("discountPriceLine");
    var discountEl = document.getElementById("checkoutDiscount");
    var shippingEl = document.getElementById("checkoutShipping");
    var totalEl = document.getElementById("checkoutTotal");

    if (subtotalEl) subtotalEl.textContent = TamTai.formatCurrency(subtotal);
    if (discountLine) discountLine.style.display = discountAmount > 0 ? "" : "none";
    if (discountEl) discountEl.textContent = "-" + TamTai.formatCurrency(discountAmount);
    if (shippingEl) shippingEl.textContent = TamTai.formatCurrency(shippingFee);
    if (totalEl) totalEl.textContent = TamTai.formatCurrency(total);

    return { subtotal: subtotal, total: total };
  }

  function getCheckoutElements() {
    return {
      form: document.getElementById("checkoutShippingForm"),
      fullName: document.getElementById("checkoutFullName"),
      phone: document.getElementById("checkoutPhone"),
      email: document.getElementById("checkoutEmail"),
      city: document.getElementById("checkoutCity"),
      detailAddress: document.getElementById("checkoutDetailAddress"),
      note: document.getElementById("checkoutNote"),
      savedAddressesSection: document.getElementById("savedAddressesSection"),
      savedAddressesList: document.getElementById("savedAddressesList"),
      citySuggestions: document.getElementById("checkoutCitySuggestions")
    };
  }

  function getCheckoutFields() {
    var elements = getCheckoutElements();

    return {
      fullName: elements.fullName ? String(elements.fullName.value || "").trim() : "",
      phone: elements.phone ? String(elements.phone.value || "").trim() : "",
      email: elements.email ? String(elements.email.value || "").trim() : "",
      city: elements.city ? String(elements.city.value || "").trim() : "",
      detailAddress: elements.detailAddress ? String(elements.detailAddress.value || "").trim() : "",
      note: elements.note ? String(elements.note.value || "").trim() : ""
    };
  }

  function validateCheckoutFields(fields) {
    if (!fields.fullName || !fields.phone || !fields.email || !fields.city || !fields.detailAddress) {
      return { ok: false, message: "Vui lòng điền đầy đủ thông tin giao hàng." };
    }

    if (fields.email.indexOf("@") === -1) {
      return { ok: false, message: "Email không hợp lệ." };
    }

    var paymentChecked = document.querySelector('input[name="payment"]:checked');
    if (!paymentChecked) {
      return { ok: false, message: "Vui lòng chọn phương thức thanh toán." };
    }

    return { ok: true };
  }

  function composeShippingAddress(fields) {
    var parts = [
      "Nguoi nhan: " + fields.fullName,
      "SDT: " + fields.phone,
      "Email: " + fields.email,
      "Khu vuc: " + fields.city,
      "Dia chi: " + fields.detailAddress
    ];

    var shippingMethod = getShippingMethodLabel();
    if (shippingMethod) {
      parts.push("Van chuyen: " + shippingMethod);
    }

    if (fields.note) {
      parts.push("Ghi chu: " + fields.note);
    }

    return parts.join(" | ");
  }

  function setInputValue(input, value, force) {
    if (!input) {
      return;
    }

    if (!force && String(input.value || "").trim()) {
      return;
    }

    input.value = value || "";
  }

  function getProfileSnapshot() {
    return checkoutState.profile || TamTai.getProfile() || {};
  }

  function fillProfileFields(profile, force) {
    var elements = getCheckoutElements();
    var source = profile || {};

    setInputValue(elements.fullName, source.fullName || source.customer_name || "", force);
    setInputValue(elements.phone, source.phone || source.phone_number || "", force);
    setInputValue(elements.email, source.email || source.customer_email || "", force);
  }

  function formatSavedAddressLine(address) {
    var parts = [
      address && address.street,
      address && address.district,
      address && address.city,
      address && address.zipcode
    ].map(function (item) {
      return String(item || "").trim();
    }).filter(Boolean);

    return parts.join(", ");
  }

  function buildCheckoutAddressValue(address) {
    if (!address) {
      return "";
    }

    var parts = [
      address.street,
      address.district,
      address.zipcode
    ].map(function (item) {
      return String(item || "").trim();
    }).filter(Boolean);

    return parts.join(", ");
  }

  function setActiveSavedAddress(addressId) {
    checkoutState.selectedAddressId = String(addressId || "").trim();

    var list = document.getElementById("savedAddressesList");
    if (!list) {
      return;
    }

    list.querySelectorAll(".saved-address-card").forEach(function (button) {
      var isActive = button.getAttribute("data-address-id") === checkoutState.selectedAddressId;
      button.classList.toggle("is-active", isActive);
    });
  }

  function applySavedAddress(addressId) {
    var id = String(addressId || "").trim();
    if (!id) {
      return;
    }

    var address = checkoutState.addresses.find(function (entry) {
      return String(entry.address_id || "") === id;
    });
    if (!address) {
      return;
    }

    var elements = getCheckoutElements();
    var profile = getProfileSnapshot();

    fillProfileFields(profile, true);
    setInputValue(elements.city, String(address.city || "").trim(), true);
    setInputValue(elements.detailAddress, buildCheckoutAddressValue(address), true);
    setActiveSavedAddress(id);
  }

  function renderCitySuggestions(addresses) {
    var citySuggestions = document.getElementById("checkoutCitySuggestions");
    if (!citySuggestions) {
      return;
    }

    var seen = {};
    var cities = [];

    (addresses || []).forEach(function (address) {
      var city = String((address && address.city) || "").trim();
      if (!city) {
        return;
      }

      var key = normalizeText(city);
      if (seen[key]) {
        return;
      }

      seen[key] = true;
      cities.push(city);
    });

    citySuggestions.innerHTML = cities.map(function (city) {
      return '<option value="' + escapeHtml(city) + '"></option>';
    }).join("");
  }

  function renderSavedAddresses(addresses) {
    var elements = getCheckoutElements();
    if (!elements.savedAddressesSection || !elements.savedAddressesList) {
      return;
    }

    if (!Array.isArray(addresses) || !addresses.length) {
      elements.savedAddressesSection.style.display = "none";
      elements.savedAddressesList.innerHTML = "";
      return;
    }

    elements.savedAddressesSection.style.display = "";
    elements.savedAddressesList.innerHTML = addresses.map(function (address, index) {
      var isDefault = Number(address.is_default || 0) === 1;
      var title = isDefault ? "Địa chỉ mặc định" : ("Địa chỉ " + (index + 1));
      var profile = getProfileSnapshot();
      var fullName = profile.fullName || profile.customer_name || "";
      var phone = profile.phone || profile.phone_number || "";

      return [
        '<button type="button" class="saved-address-card" data-address-id="' + escapeHtml(address.address_id) + '">',
        '  <div class="saved-address-top">',
        '    <span class="saved-address-name">' + escapeHtml(title) + '</span>',
        isDefault ? '    <span class="saved-address-badge">Mặc định</span>' : "",
        "  </div>",
        '  <p class="saved-address-phone">' + escapeHtml(String(fullName || "").trim() + (phone ? " | " + phone : "")) + "</p>",
        '  <p class="saved-address-line">' + escapeHtml(formatSavedAddressLine(address)) + "</p>",
        "</button>"
      ].join("");
    }).join("");
  }

  async function resolveCurrentCustomerId(token) {
    if (checkoutState.customerId) {
      return checkoutState.customerId;
    }

    var fromStorage = String(localStorage.getItem("tamtai_customer_id") || "").trim();
    if (fromStorage) {
      checkoutState.customerId = fromStorage;
      return fromStorage;
    }

    var profileRaw = localStorage.getItem("tamtai_customer_profile");
    if (profileRaw) {
      try {
        var profile = JSON.parse(profileRaw);
        if (profile && profile.customer_id) {
          var profileId = String(profile.customer_id).trim();
          if (profileId) {
            localStorage.setItem("tamtai_customer_id", profileId);
            checkoutState.customerId = profileId;
            return profileId;
          }
        }
      } catch (error) {
        // ignore malformed cached profile
      }
    }

    var me = await TamTai.fetchJson("/customers/me", {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token
      }
    });

    var customerId = String((me && me.customer_id) || "").trim();
    if (!customerId) {
      throw new Error("Khong xac dinh duoc tai khoan dang nhap.");
    }

    localStorage.setItem("tamtai_customer_id", customerId);
    checkoutState.customerId = customerId;
    return customerId;
  }

  async function hydrateCheckoutAddressBook() {
    fillProfileFields(TamTai.getProfile(), false);

    var token = localStorage.getItem("access_token");
    if (!token || TamTai.getRole() !== "user") {
      return;
    }

    try {
      var me = await TamTai.fetchJson("/customers/me", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token
        }
      });

      checkoutState.customerId = String((me && me.customer_id) || "").trim();
      checkoutState.profile = {
        fullName: me.customer_name || "",
        email: me.customer_email || "",
        phone: me.phone_number || "",
        address: me.address || "",
        customer_id: checkoutState.customerId
      };

      localStorage.setItem("tamtai_customer_id", checkoutState.customerId);
      localStorage.setItem("tamtai_customer_profile", JSON.stringify(me));
      TamTai.saveProfile(checkoutState.profile);
      fillProfileFields(checkoutState.profile, true);

      var addresses = await TamTai.fetchJson("/addresses/customer/" + encodeURIComponent(checkoutState.customerId), {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token
        }
      });

      checkoutState.addresses = Array.isArray(addresses) ? addresses.slice() : [];
      checkoutState.addresses.sort(function (a, b) {
        return Number(b.is_default || 0) - Number(a.is_default || 0);
      });

      renderSavedAddresses(checkoutState.addresses);
      renderCitySuggestions(checkoutState.addresses);

      var defaultAddress = checkoutState.addresses.find(function (address) {
        return Number(address.is_default || 0) === 1;
      }) || checkoutState.addresses[0];

      if (defaultAddress) {
        applySavedAddress(defaultAddress.address_id);
      }
    } catch (error) {
      renderSavedAddresses([]);
    }
  }

  function pickPaymentMethod(methods, selectedLabel) {
    if (!Array.isArray(methods) || !methods.length) {
      return null;
    }

    var selected = normalizeText(selectedLabel);

    function includesAny(haystack, keywords) {
      return keywords.some(function (keyword) {
        return haystack.indexOf(keyword) !== -1;
      });
    }

    var normalizedMethods = methods.map(function (method) {
      return {
        raw: method,
        normalizedName: normalizeText(method.mode_name)
      };
    });

    var keywordSets = {
      cod: ["cod", "nhan hang", "tien mat", "cash"],
      bank: ["chuyen khoan", "ngan hang", "bank"],
      wallet: ["vi", "momo", "zalopay", "wallet"]
    };

    var targetGroup = "";
    if (includesAny(selected, keywordSets.cod)) {
      targetGroup = "cod";
    } else if (includesAny(selected, keywordSets.bank)) {
      targetGroup = "bank";
    } else if (includesAny(selected, keywordSets.wallet)) {
      targetGroup = "wallet";
    }

    if (targetGroup) {
      var foundByGroup = normalizedMethods.find(function (entry) {
        return includesAny(entry.normalizedName, keywordSets[targetGroup]);
      });
      if (foundByGroup) {
        return foundByGroup.raw;
      }
    }

    var foundByExact = normalizedMethods.find(function (entry) {
      return entry.normalizedName === selected;
    });
    if (foundByExact) {
      return foundByExact.raw;
    }

    return methods[0];
  }

  function buildOrderItemsFromCart(cart) {
    return cart.map(function (item) {
      var productId = String(item.productId || item.id || "").trim();
      return {
        product_id: productId,
        quantity: Math.max(1, Number(item.qty || 1))
      };
    }).filter(function (item) {
      return Boolean(item.product_id);
    });
  }

  async function submitCheckout(confirmBtn) {
    var token = localStorage.getItem("access_token");
    if (!token || TamTai.getRole() !== "user") {
      window.location.href = "../auth/login.html?redirect=" + encodeURIComponent("../cart/checkout.html");
      return;
    }

    var cart = TamTai.getCart();
    if (!Array.isArray(cart) || !cart.length) {
      alert("Gio hang dang trong, khong the xac nhan thanh toan.");
      return;
    }

    var fields = getCheckoutFields();
    var validation = validateCheckoutFields(fields);
    if (!validation.ok) {
      alert(validation.message);
      return;
    }

    var paymentLabel = getPaymentMethodLabel();

    confirmBtn.disabled = true;
    var originalText = confirmBtn.textContent;
    confirmBtn.textContent = "Dang xu ly...";

    try {
      var customerId = await resolveCurrentCustomerId(token);
      var paymentMethods = await TamTai.fetchJson("/payment-methods?skip=0&limit=100");
      var selectedPayment = pickPaymentMethod(paymentMethods, paymentLabel);

      if (!selectedPayment || !selectedPayment.payment_method_id) {
        throw new Error("Chua co phuong thuc thanh toan trong he thong.");
      }

      var orderItems = buildOrderItemsFromCart(cart);
      if (!orderItems.length) {
        throw new Error("Khong co san pham hop le de tao don hang.");
      }

      var discountCode = (document.getElementById("discountCodeInput") || {}).value || "";
      var payload = {
        customer_id: customerId,
        payment_method_id: String(selectedPayment.payment_method_id),
        shipping_address: composeShippingAddress(fields),
        shipping_fee: getShippingFee(),
        discount_amount: window._checkoutDiscountAmount || 0,
        discount_code: discountCode.trim() || null,
        items: orderItems
      };

      var order = await TamTai.fetchJson("/orders/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(payload)
      });

      TamTai.clearCart();
      alert("Dat hang thanh cong. Ma don: #" + String(order.order_id || ""));

      if (order && order.order_id) {
        window.location.href = "order-detail.html?id=" + encodeURIComponent(String(order.order_id));
      } else {
        window.location.href = "all-orders.html";
      }
    } catch (error) {
      alert("Khong the tao don hang: " + (error && error.message ? error.message : "Loi khong xac dinh"));
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = originalText;
    }
  }

  function bindSavedAddressSelection() {
    var savedAddressesList = document.getElementById("savedAddressesList");
    if (!savedAddressesList) {
      return;
    }

    savedAddressesList.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-address-id]");
      if (!button) {
        return;
      }

      applySavedAddress(button.getAttribute("data-address-id"));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");

    var elements = getCheckoutElements();
    if (elements.form) {
      elements.form.addEventListener("submit", function (event) {
        event.preventDefault();
      });
    }

    renderSummaryItems();
    bindSavedAddressSelection();

    hydrateCheckoutAddressBook().catch(function () {});

    document.querySelectorAll('input[name="shipping"]').forEach(function (radio) {
      radio.addEventListener("change", renderSummaryItems);
    });

    var applyBtn = document.getElementById("applyDiscountBtn");
    var discountInput = document.getElementById("discountCodeInput");
    var discountMsg = document.getElementById("discountMessage");

    if (applyBtn && discountInput) {
      applyBtn.addEventListener("click", function () {
        var code = discountInput.value.trim();
        if (!code) {
          discountMsg.textContent = "Vui lòng nhập mã giảm giá.";
          discountMsg.className = "discount-msg is-error";
          return;
        }

        applyBtn.disabled = true;
        applyBtn.textContent = "Đang kiểm tra...";
        window._checkoutDiscountAmount = 0;

        var token = localStorage.getItem("access_token");
        if (!token) {
          discountMsg.textContent = "Vui lòng đăng nhập để sử dụng mã giảm giá.";
          discountMsg.className = "discount-msg is-error";
          applyBtn.disabled = false;
          applyBtn.textContent = "Áp dụng";
          return;
        }

        var cart = TamTai.getCart();
        var subtotal = cart.reduce(function (sum, item) {
          return sum + Number(item.price || 0) * Math.max(1, Number(item.qty || 1));
        }, 0);
        var productIds = cart.map(function (item) {
          return String(item.productId || item.id || "").trim();
        }).filter(Boolean);

        TamTai.fetchJson("/discount-codes/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
          },
          body: JSON.stringify({ code: code, subtotal: subtotal, product_ids: productIds })
        }).then(function (data) {
          var discountAmount = Number(data && data.discount_amount);
          if (data && data.valid === true && Number.isFinite(discountAmount) && discountAmount >= 0) {
            window._checkoutDiscountAmount = discountAmount;
            discountMsg.textContent = "Áp dụng mã thành công! Giảm " + TamTai.formatCurrency(discountAmount) + " (" + data.discount_percent + "%)";
            discountMsg.className = "discount-msg is-success";
            renderSummaryItems();
          } else {
            discountMsg.textContent = "Mã giảm giá không áp dụng cho giỏ hàng hiện tại.";
            discountMsg.className = "discount-msg is-error";
            renderSummaryItems();
          }
        }).catch(function (err) {
          var msg = (err && err.message) || "Mã giảm giá không hợp lệ hoặc đã hết hạn.";
          discountMsg.textContent = msg;
          discountMsg.className = "discount-msg is-error";
          renderSummaryItems();
        }).finally(function () {
          applyBtn.disabled = false;
          applyBtn.textContent = "Áp dụng";
        });
      });
    }

    var confirmBtn = document.querySelector(".confirm-btn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        submitCheckout(confirmBtn);
      });
    }
  });
})();
