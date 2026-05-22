(function () {
  var READ_KEY = "tamtai_notify_read";
  var UNREAD_KEY = "tamtai_notify_unread";

  function getAuthToken() {
    return localStorage.getItem("access_token");
  }

  function getRole() {
    return localStorage.getItem("tamtai_role") || "guest";
  }

  function isLoggedIn() {
    return getAuthToken() && getRole() === "user";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeNotificationType(type) {
    var normalized = String(type || "").trim().toLowerCase();
    if (normalized === "orders") return "order";
    return normalized;
  }

  function getIconForType(type) {
    var normalized = normalizeNotificationType(type);
    if (normalized === "promo") return "fa-ticket";
    if (normalized === "order") return "fa-bag-shopping";
    return "fa-circle-info";
  }

  function parseNotificationDate(value) {
    if (!value) return null;

    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    var text = String(value).trim();
    if (!text) return null;

    // Older API responses may omit timezone even though the value is UTC.
    var normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text)
      ? (text + "Z")
      : text;

    var parsed = new Date(normalized);
    if (isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  function getTimeAgo(dateStr) {
    if (!dateStr) return "";
    var d = parseNotificationDate(dateStr);
    if (!d) return dateStr;
    var now = new Date();
    var diffMs = Math.max(0, now - d);
    var diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return diffMin + " phút trước";
    var diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return diffHour + " giờ trước";
    var diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return diffDay + " ngày trước";
    return d.toLocaleDateString("vi-VN");
  }

  function renderNotifications(items, readSet) {
    var list = document.querySelector(".notify-list");
    if (!list) return;
    if (!items || !items.length) {
      list.innerHTML = '<p style="padding:20px;text-align:center;color:#6d7e6f;">Không có thông báo.</p>';
      updateLocalBadge();
      return;
    }
    list.innerHTML = items.map(function (n, index) {
      var isUnread = !n.is_read && (!readSet || !readSet.has(index));
      var iconClass = getIconForType(n.type);
      var normalizedType = normalizeNotificationType(n.type);
      return [
        '<article class="notify-item' + (isUnread ? ' unread' : '') + '" data-notify-index="' + index + '" data-notify-id="' + escapeHtml(n.notification_id) + '" data-category="' + escapeHtml(normalizedType) + '">',
        '  <div class="icon"><i class="fa-solid ' + iconClass + '"></i></div>',
        '  <div class="content">',
        '    <h2>' + escapeHtml(n.title) + '</h2>',
        '    <p>' + escapeHtml(n.message || "") + '</p>',
        '    <span>' + escapeHtml(getTimeAgo(n.created_at)) + '</span>',
        '  </div>',
        '</article>'
      ].join("");
    }).join("");

    var itemsArr = Array.prototype.slice.call(list.querySelectorAll(".notify-item"));
    itemsArr.forEach(function (item, index) {
      item.addEventListener("click", function () {
        item.classList.remove("unread");
        var nid = item.getAttribute("data-notify-id");
        if (isLoggedIn() && nid) {
          TamTai.fetchJson("/notifications/" + encodeURIComponent(nid) + "/read", {
            method: "PATCH",
            headers: { Authorization: "Bearer " + getAuthToken() }
          }).then(function () {
            if (window.TamTai && typeof TamTai.syncNotifyBadgeFromApi === "function") {
              TamTai.syncNotifyBadgeFromApi();
            }
          }).catch(function () {});
        } else {
          var localRead = new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
          localRead.add(index);
          localStorage.setItem(READ_KEY, JSON.stringify(Array.from(localRead)));
        }
        updateLocalBadge();
      });
    });

    updateLocalBadge();
  }

  function updateLocalBadge() {
    var unread = 0;
    var items = document.querySelectorAll(".notify-item");
    items.forEach(function (item) {
      if (item.classList.contains("unread")) unread++;
    });
    localStorage.setItem(UNREAD_KEY, String(unread));
    var badge = document.getElementById("notifyBadge");
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? "inline-flex" : "none";
    }
  }

  function getFakeNotifications() {
    return [
      { notification_id: "f1", type: "orders", title: "Đơn hàng #DH1002 đang được giao", message: "Tài xế đã lấy hàng và đang giao đến bạn. Dự kiến nhận hàng trước 17:30 hôm nay.", created_at: new Date(Date.now() - 5 * 60000).toISOString(), is_read: false },
      { notification_id: "f2", type: "promo", title: "Mã giảm giá mới cho bạn", message: "Nhập mã TAMTAI50 để giảm 50.000đ cho đơn từ 1.000.000đ.", created_at: new Date(Date.now() - 30 * 60000).toISOString(), is_read: false },
      { notification_id: "f3", type: "system", title: "Cập nhật chính sách bảo hành", message: "Chúng tôi đã cập nhật chính sách bảo hành mới áp dụng từ ngày 01/04/2026.", created_at: new Date(Date.now() - 6 * 3600000).toISOString(), is_read: true },
      { notification_id: "f4", type: "promo", title: "Ưu đãi cuối tuần", message: "Giảm đến 15% cho phụ kiện công nghệ. Thời gian áp dụng đến hết Chủ nhật.", created_at: new Date(Date.now() - 24 * 3600000).toISOString(), is_read: true }
    ];
  }

  function getActiveCategory() {
    var active = document.querySelector(".notify-tabs button.active");
    if (!active) return "all";

    var label = active.textContent.trim().toLowerCase();
    if (label.indexOf("đơn hàng") !== -1) return "order";
    if (label.indexOf("khuyến mãi") !== -1) return "promo";
    if (label.indexOf("hệ thống") !== -1) return "system";
    return "all";
  }

  document.addEventListener("DOMContentLoaded", function () {
    TamTai.setupSearchRedirect(".search-box input", "../products/products.html");

    var tabs = document.querySelectorAll(".notify-tabs button");
    var list = document.querySelector(".notify-list");
    var markAllButton = document.querySelector(".notify-head button");

    function filterByTab(category, items) {
      if (!items) return;
      items.forEach(function (item) {
        var cat = item.getAttribute("data-category");
        item.style.display = (category === "all" || cat === category) ? "" : "none";
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        filterByTab(getActiveCategory(), document.querySelectorAll(".notify-item"));
      });
    });

    if (isLoggedIn()) {
      TamTai.fetchJson("/notifications/?skip=0&limit=100", {
        headers: { Authorization: "Bearer " + getAuthToken() }
      }).then(function (data) {
        var items = Array.isArray(data) ? data : [];
        renderNotifications(items, null);
        if (markAllButton) {
          markAllButton.addEventListener("click", function () {
            TamTai.fetchJson("/notifications/read-all", {
              method: "PATCH",
              headers: { Authorization: "Bearer " + getAuthToken() }
            }).then(function () {
              document.querySelectorAll(".notify-item").forEach(function (item) {
                item.classList.remove("unread");
              });
              updateLocalBadge();
              if (window.TamTai && typeof TamTai.syncNotifyBadgeFromApi === "function") {
                TamTai.syncNotifyBadgeFromApi();
              }
              document.querySelector(".notify-tabs button.active") && filterByTab(
                getActiveCategory(),
                document.querySelectorAll(".notify-item")
              );
            }).catch(function () {});
          });
        }
        var firstTab = document.querySelector(".notify-tabs button.active");
        if (firstTab) {
          filterByTab(getActiveCategory(), document.querySelectorAll(".notify-item"));
        }
      }).catch(function () {
        var localRead = new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
        renderNotifications(getFakeNotifications(), localRead);
        if (markAllButton) {
          markAllButton.addEventListener("click", function () {
            document.querySelectorAll(".notify-item").forEach(function (item) {
              item.classList.remove("unread");
            });
            var allIndices = Array.prototype.slice.call(document.querySelectorAll(".notify-item")).map(function (_, i) { return i; });
            localStorage.setItem(READ_KEY, JSON.stringify(allIndices));
            updateLocalBadge();
          });
        }
      });
    } else {
      var localRead = new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
      renderNotifications(getFakeNotifications(), localRead);
      if (markAllButton) {
        markAllButton.addEventListener("click", function () {
          document.querySelectorAll(".notify-item").forEach(function (item) {
            item.classList.remove("unread");
          });
          var allIndices = Array.prototype.slice.call(document.querySelectorAll(".notify-item")).map(function (_, i) { return i; });
          localStorage.setItem(READ_KEY, JSON.stringify(allIndices));
          updateLocalBadge();
        });
      }
    }
  });
})();
