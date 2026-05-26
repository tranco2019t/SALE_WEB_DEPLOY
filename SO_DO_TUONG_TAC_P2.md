# SƠ ĐỒ TƯƠNG TÁC HTML ↔ JS — TAM TAI E-COMMERCE (PHẦN 2)

---

## 9. checkout.html + checkout.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → const cart = getCart() → nếu rỗng → redirect cart.html
  → renderSummaryItems()

renderSummaryItems():
  cart.forEach(item →
    #checkoutItems.innerHTML += `<li>${item.name} × ${item.quantity} = ${formatCurrency(...)}</li>`
  )
  #checkoutSubtotal.textContent = formatCurrency(subtotal)
  #checkoutShipping.textContent = subtotal >= 500000 ? "Miễn phí" : "30,000₫"
  #checkoutTotal.textContent = formatCurrency(subtotal + shipping)

hydrateCheckoutAddressBook():
  → fetchJson("GET /customers/me")
  → profile.name → #fullName.value
  → profile.phone → #phone.value
  → fetchJson("GET /addresses/customer/{id}")
  → addresses.forEach → #addressSelect.innerHTML += `<option>` (ghi nhận địa chỉ có sẵn)

setupDiscountHandler():
  #discountInput + #applyDiscountBtn click
  → code = #discountInput.value.trim()
  → POST /discount-codes/validate { code, cart }
  → hợp lệ → #discountDisplay.textContent = formatCurrency(discount) + ẩn input

submitCheckout():
  #checkoutForm submit → e.preventDefault()
  → validate tất cả field (tên, sđt, địa chỉ)
  → payload = { items: [...], shipping_address, payment_method, discount_code, ... }
  → POST /orders/
  → Thành công → clearCart() → location.href = "order-detail.html?id={orderId}"
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#checkoutItems` | `.innerHTML` = danh sách sản phẩm + số lượng |
| `#checkoutSubtotal` | `.textContent` = tạm tính |
| `#checkoutShipping` | `.textContent` = phí ship |
| `#checkoutTotal` | `.textContent` = tổng cộng |
| `#fullName`, `#phone` | `.value` = thông tin từ profile API |
| `#addressSelect` | `.innerHTML` = `<option>` từ danh sách địa chỉ |
| `#discountInput` | `.value` = mã giảm giá nhập |
| `#applyDiscountBtn` | `click` → validate discount |
| `#discountDisplay` | `.textContent` = số tiền giảm |
| `#checkoutForm` | `submit` → validate → POST /orders/ |
| `#orderMessage` | `.textContent` = thông báo lỗi/thành công |

---

## 10. all-orders.html + all-orders.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → loadOrdersFromBackend()

loadOrdersFromBackend():
  → fetchJson("GET /orders")
  → orders.map(toFrontendOrder) (chuẩn hóa field)
  → filterOrders() + renderOrders()

filterOrders():
  statusFilter = #orderStatus.value (all | pending | confirmed | ...)
  keyword = #searchOrder.value.toLowerCase()
  → lọc orders theo status + keyword (mã đơn hoặc tên sản phẩm)

renderOrders(orders):
  #orderList.innerHTML = orders.map(createOrderRow).join("")
  createOrderRow(order) → tr HTML có:
    • #orderId (textContent)
    • .order-date
    • .order-total
    • .order-status (span với class màu)
    • .order-action (nút "Xem chi tiết")

Paginate:
  itemsPerPage = 10
  currentPage click → slice orders → render
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#orderList` | `.innerHTML` = danh sách đơn hàng dạng bảng |
| `#orderStatus` | `change` → `.value` → filterOrders() |
| `#searchOrder` | `keyup` → `.value` → filterOrders() |
| `.order-status` | `.className` = "order-status " + status (màu sắc) |
| `.btn-view-detail` | `click` → location.href = "order-detail.html?id=..." |
| `.pagination` | `click` → currentPage → renderOrders() |

---

## 11. order-detail.html + order-detail.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → orderId = getOrderIdFromUrl() (từ URL params)
  → loadOrderFromBackend(orderId)

loadOrderFromBackend(id):
  → fetchJson("GET /orders/" + id)
  → order = mapBackendOrder(data) → renderOverview(order) + renderItems(order)

renderOverview(order):
  #orderId.textContent = order.id
  #orderDate.textContent = order.created_at
  #orderStatus.textContent = order.status (kèm badge màu)
  #orderCustomerName.textContent = order.customer_name
  #orderPhone.textContent = order.phone
  #orderAddress.textContent = order.shipping_address
  #orderSubtotal.textContent = formatCurrency(order.subtotal)
  #orderTotal.textContent = formatCurrency(order.total) (8 card thông tin)

renderItems(order):
  order.items.forEach(item →
    #orderItems.innerHTML += card HTML (ảnh, tên, giá, số lượng, thành tiền)
  )
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#orderId` | `.textContent` = mã đơn hàng |
| `#orderDate` | `.textContent` = ngày tạo |
| `#orderStatus` | `.textContent` + CSS class = trạng thái |
| `#orderCustomerName` | `.textContent` = tên khách hàng |
| `#orderPhone` | `.textContent` = số điện thoại |
| `#orderAddress` | `.textContent` = địa chỉ giao hàng |
| `#orderSubtotal` | `.textContent` = tạm tính |
| `#orderTotal` | `.textContent` = tổng tiền |
| `#orderItems` | `.innerHTML` = danh sách sản phẩm trong đơn |

---

## 12. profile.html + profile.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → syncProfileFromBackend()

syncProfileFromBackend():
  → fetchJson("GET /customers/me")
  → applyProfileData(profile)

applyProfileData(profile):
  // Sidebar
  #profileAvatar.src = profile.avatar
  #profileSidebarName.textContent = profile.name
  #profileSidebarEmail.textContent = profile.email
  // Form
  #profileName.value = profile.name
  #profileEmail.value = profile.email (disabled)
  #profilePhone.value = profile.phone
  #profileAddress.value = profile.address

renderOrdersTable():
  → fetchJson("GET /orders?limit=4")
  → #recentOrders.innerHTML = bảng 4 đơn gần nhất

setupSaveButton():
  #saveProfileBtn click
  → thu thập #profileName.value, #profilePhone.value, #profileAddress.value
  → PUT /customers/me
  → thành công → `TamTai.logout()` (nếu đổi email) hoặc reload
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#profileAvatar` | `.src` = ảnh đại diện |
| `#profileSidebarName` | `.textContent` = tên |
| `#profileSidebarEmail` | `.textContent` = email |
| `#profileName` | `.value` = tên (có thể sửa) |
| `#profileEmail` | `.value` = email (disabled) |
| `#profilePhone` | `.value` = số điện thoại |
| `#profileAddress` | `.value` = địa chỉ |
| `#recentOrders` | `.innerHTML` = bảng 4 đơn gần nhất |
| `#saveProfileBtn` | `click` → PUT /customers/me |

---

## 13. address.html + address.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → ensureCustomerContext() → fetchJson("GET /customers/me")
  → loadAddresses(customerId)

loadAddresses(customerId):
  → fetchJson("GET /addresses/customer/" + customerId)
  → renderAddressList(addresses)

renderAddressList(addresses):
  #addressList.innerHTML = addresses.map(addr →
    card HTML có: tên, sđt, địa chỉ, `default` badge, nút xóa
  )

createAddress():
  #addressForm submit → #fullName.value + #phone.value + #addressDetail.value
  → POST /addresses/ với customerId
  → thành công → loadAddresses() (re-render)

deleteAddress(addressId):
  → DELETE /addresses/ + addressId
  → thành công → loadAddresses() (re-render)
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#addressList` | `.innerHTML` = danh sách địa chỉ |
| `#addressForm` | `submit` → createAddress() |
| `#fullName`, `#phone`, `#addressDetail` | `.value` đọc dữ liệu nhập |
| `.address-card` | chứa thông tin 1 địa chỉ |
| `.badge-default` | hiển thị "Mặc định" nếu is_default |
| `.btn-delete` | `click` → deleteAddress(id) |

---

## 14. password.html + password.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → gán sự kiện cho #passwordForm

#passwordForm submit:
  → currentPassword = #currentPassword.value
  → newPassword = #newPassword.value
  → confirmPassword = #confirmPassword.value
  → validate:
      • newPassword ≥ 6 ký tự
      • confirmPassword === newPassword
  → changePasswordOnBackend(currentPassword, newPassword)

changePasswordOnBackend(current, new):
  → POST /customers/change-password { current_password, new_password }
  → thành công → alert("Đổi mật khẩu thành công!") → TamTai.logout()
  → thất bại → #passwordMessage.textContent = lỗi
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#passwordForm` | `submit` → validate + gọi API |
| `#currentPassword` | `.value` = mật khẩu hiện tại |
| `#newPassword` | `.value` = mật khẩu mới |
| `#confirmPassword` | `.value` = nhập lại mật khẩu mới |
| `#passwordMessage` | `.textContent` = thông báo lỗi |
| TamTai.logout() | xóa localStorage → redirect login |

---

## 15. notification.html + notification.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → nếu logged in (getRole()) → fetchJson("GET /notifications")
  → nếu guest → getFakeNotifications() (dữ liệu mẫu)
  → renderNotifications(notifications)

renderNotifications(notifications):
  #notificationList.innerHTML = notifications.map(n →
    `<div class="notification-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
       <h4>${n.title}</h4>
       <p>${n.message}</p>
       <span class="time">${timeAgo(n.created_at)}</span>
     </div>`
  )

Click vào notification:
  → PATCH /notifications/{id}/read
  → remove class "unread"
  → cập nhật số chưa đọc

Tab filter:
  .tab-btn click → data-category → lọc (all | order | system | promotion)
  → ẩn/hiện notification theo category

"Mark all read":
  → PATCH /notifications/read-all
  → remove all "unread" class
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#notificationList` | `.innerHTML` = danh sách thông báo |
| `.notification-item` | class `unread` = chưa đọc + `click` → PATCH đọc |
| `[data-id]` | định danh notification khi click |
| `.tab-btn` | `click` → data-category → lọc hiển thị |
| `#markAllRead` | `click` → PATCH /notifications/read-all |

---

## 16. product-reviews.html + product-reviews.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → fetchPurchasedProducts() → lấy order → lấy product IDs đã mua
  → fetchMyReviews() → GET /reviews/customer/{id}
  → buildPendingReviewProducts() → lọc sản phẩm chưa review
  → renderReviewPage()

Star picker:
  .star click → data-value → #ratingValue.value = sao → highlight sao

File upload:
  #reviewImages change → FileList → kiểm tra ≤ 5 files, ≤ 5MB mỗi file
  → preview ảnh trong #imagePreview.innerHTML

Submit:
  #reviewForm submit → e.preventDefault()
  → FormData: product_id, rating, comment, images[]
  → POST /reviews/ với Content-Type: multipart/form-data
  → thành công → reload page
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#pendingProducts` | `.innerHTML` = danh sách SP chờ review |
| `.star` | `click` → data-value → set rating |
| `#ratingValue` | `.value` = số sao đã chọn (ẩn) |
| `#reviewComment` | `.value` = nội dung đánh giá |
| `#reviewImages` | `change` → FileList → preview |
| `#imagePreview` | `.innerHTML` = ảnh preview |
| `#reviewForm` | `submit` → POST /reviews/ (FormData) |
| `#reviewMessage` | `.textContent` = thông báo kết quả |

---

## 17. admin/core.js (TamTaiAdmin — Thư viện admin dùng chung)

**Sơ đồ tương tác:**
```
verifyAccess():
  → getRole() !== "admin" → redirect landing.html

TamTaiAdmin.sortData(data, key, order):
  → sắp xếp mảng theo field (asc/desc)

TamTaiAdmin.paginateData(data, page, perPage):
  → slice((page-1)*perPage, page*perPage)

TamTaiAdmin.renderPagination(total, page, perPage, callback):
  → tạo HTML nút trang → .pagination.innerHTML
  → mỗi nút click → callback(page)

TamTaiAdmin.fetchAndRender(url, renderFn, ...):
  → fetchJson(url) → renderFn(data)

TamTaiAdmin.getPageFromUrl() → đọc ?page= từ URL
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `.pagination` | `.innerHTML` = nút trang từ renderPagination() |
| location.href | verifyAccess() redirect nếu không phải admin |

---

## 18. admin/dashboard.js + admin.html

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → verifyAccess()
  → renderStats()
  → renderCharts()

renderStats():
  → fetchJson("GET /admin/dashboard")
  → stats = { total_products, total_orders, total_customers, total_revenue, total_discounts }
  → #statProducts.textContent = stats.total_products
  → #statOrders.textContent = stats.total_orders
  → #statCustomers.textContent = stats.total_customers
  → #statRevenue.textContent = formatCurrency(stats.total_revenue)
  → #statDiscounts.textContent = stats.total_discounts

renderCharts():
  → Chart.js (CDN) vẽ biểu đồ doanh thu theo tháng
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#statProducts` | `.textContent` = tổng sản phẩm |
| `#statOrders` | `.textContent` = tổng đơn hàng |
| `#statCustomers` | `.textContent` = tổng khách hàng |
| `#statRevenue` | `.textContent` = tổng doanh thu |
| `#statDiscounts` | `.textContent` = tổng mã giảm giá |
| `#revenueChart` | Chart.js vẽ biểu đồ |

---

## 19. admin/products.html + admin/products.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → verifyAccess()
  → fetchProducts() → GET /admin/products
  → renderProducts()

renderProducts(products):
  #productTableBody.innerHTML = products.map(p →
    `<tr>
      <td>${p.id}</td>
      <td><img src="${p.image}" width="50"></td>
      <td>${p.name}</td>
      <td>${formatCurrency(p.price)}</td>
      <td>${p.stock}</td>
      <td>${p.category_name}</td>
      <td>
        <button onclick="editProduct(${p.id})">Sửa</button>
        <button onclick="deleteProduct(${p.id})">Xóa</button>
      </td>
    </tr>`
  )

saveProduct():
  #productForm submit → đọc các field (#productName, #productPrice, ...)
  → nếu có id → PUT /admin/products/{id}
  → nếu không → POST /admin/products/
  → thành công → fetchProducts() + đóng modal

deleteProduct(id):
  → confirm → DELETE /admin/products/{id}
  → thành công → fetchProducts()
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#productTableBody` | `.innerHTML` = danh sách sản phẩm (có nút Sửa/Xóa) |
| `#productForm` | `submit` → POST hoặc PUT |
| `#productName`, `#productPrice`, `#productStock`, `#productCategory`, `#productImage` | `.value` đọc dữ liệu form |
| `#productModal` | `.classList` show/hide modal |
| `.btn-edit` | `click` → editProduct(id) → fill form |
| `.btn-delete` | `click` → deleteProduct(id) |

---

## 20. admin/orders.html + admin/orders.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → verifyAccess()
  → fetchOrders() → GET /admin/orders
  → renderOrders()

renderOrders(orders):
  #orderTableBody.innerHTML = orders.map(o →
    `<tr>
      <td>${o.id}</td>
      <td>${o.customer_name}</td>
      <td>${formatCurrency(o.total)}</td>
      <td>
        <select onchange="updateOrderStatus(${o.id}, this.value)">
          <option ${o.status === 'pending' ? 'selected' : ''}>pending</option>
          <option ${o.status === 'confirmed' ? 'selected' : ''}>confirmed</option>
          <option ${o.status === 'shipping' ? 'selected' : ''}>shipping</option>
          <option ${o.status === 'completed' ? 'selected' : ''}>completed</option>
          <option ${o.status === 'cancelled' ? 'selected' : ''}>cancelled</option>
        </select>
      </td>
      <td>${o.created_at}</td>
      <td><button onclick="viewOrderDetail(${o.id})">Chi tiết</button></td>
    </tr>`
  )

updateOrderStatus(id, newStatus):
  → PATCH /admin/orders/{id}/status { status: newStatus }
  → thành công → fetchOrders()
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#orderTableBody` | `.innerHTML` = danh sách đơn hàng |
| `select` (trong mỗi row) | `change` → updateOrderStatus(id, value) |
| `.btn-detail` | `click` → viewOrderDetail(id) |
| Pagination | `.pagination` → trang tiếp theo |

---

## 21. admin/customers.html + admin/customers.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → verifyAccess()
  → fetchCustomers() → GET /admin/customers
  → renderCustomers()

renderCustomers(customers):
  #customerTableBody.innerHTML = customers.map(c →
    `<tr>
      <td>${c.id}</td>
      <td>${c.name}</td>
      <td>${c.email}</td>
      <td>${c.phone}</td>
      <td>
        <span class="badge ${c.is_active ? 'active' : 'inactive'}">
          ${c.is_active ? 'Hoạt động' : 'Khóa'}
        </span>
      </td>
      <td>
        <button onclick="openCustomerModal(${c.id})">Xem</button>
        <button onclick="toggleCustomer(${c.id}, ${!c.is_active})">
          ${c.is_active ? 'Khóa' : 'Mở khóa'}
        </button>
      </td>
    </tr>`
  )

openCustomerModal(id):
  → fetchJson("GET /admin/customers/" + id)
  → fill #customerDetail với thông tin chi tiết
  → show modal

toggleCustomer(id, newStatus):
  → PATCH /admin/customers/{id}/toggle { is_active: newStatus }
  → thành công → fetchCustomers()
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#customerTableBody` | `.innerHTML` = danh sách khách hàng |
| `.badge` | class `active`/`inactive` + textContent |
| `.btn-toggle` | `click` → toggleCustomer(id, status) |
| `.btn-view` | `click` → openCustomerModal(id) |
| `#customerDetail` | `.innerHTML` = thông tin chi tiết trong modal |

---

## 22. admin/discounts.html + admin/discounts.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → verifyAccess()
  → fetchDiscountCodes() → GET /admin/discount-codes
  → fetchProducts() → GET /products/
  → fetchCustomers() → GET /customers/
  → renderDiscounts()

renderDiscounts(discounts):
  #discountTableBody.innerHTML = discounts.map(d →
    `<tr>
      <td>${d.code}</td>
      <td>${d.discount_percent}%</td>
      <td>${formatCurrency(d.min_order_value)}</td>
      <td>${d.max_uses}</td>
      <td>${d.used_count}</td>
      <td>${d.expires_at}</td>
      <td>
        <span class="badge ${d.is_active ? 'active' : 'inactive'}">
          ${d.is_active ? 'Đang chạy' : 'Tắt'}
        </span>
      </td>
      <td>
        <button onclick="toggleDiscount(${d.id}, ${!d.is_active})">Bật/Tắt</button>
        <button onclick="editDiscount(${d.id})">Sửa</button>
        <button onclick="deleteDiscount(${d.id})">Xóa</button>
      </td>
    </tr>`
  )

saveDiscount():
  #discountForm submit → đọc tất cả field
  → POST /admin/discount-codes/ (nếu mới)
  → PUT /admin/discount-codes/{id} (nếu sửa)
  → tự động tạo notification cho khách hàng

toggleDiscount(id, newStatus):
  → PATCH /admin/discount-codes/{id}/toggle

deleteDiscount(id):
  → confirm → DELETE /admin/discount-codes/{id}
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#discountTableBody` | `.innerHTML` = danh sách mã giảm giá |
| `#discountForm` | `submit` → POST/PUT discount |
| `#discountCode`, `#discountPercent`, `#minOrderValue`, `#maxUses`, `#expiresAt` | `.value` đọc dữ liệu form |
| `.badge` | class `active`/`inactive` |
| `.btn-toggle` | `click` → toggleDiscount(id) |
| `.btn-edit` | `click` → editDiscount(id) → fill form |
| `.btn-delete` | `click` → deleteDiscount(id) |

---

# CÂU HỎI ÔN TẬP

## A — common.js (Thư viện dùng chung)

1. **`getCart()` đọc dữ liệu từ đâu?**  
   localStorage.getItem("tamtai_cart") — parse JSON → trả về mảng.

2. **Khi người dùng đã đăng nhập, giỏ hàng lưu ở key nào?**  
   `tamtai_cart_user_{ID}` — mỗi user có giỏ riêng.

3. **`addToCart()` làm gì khi sản phẩm đã tồn tại trong giỏ?**  
   Tăng quantity lên 1, không thêm phần tử mới.

4. **`flyToCart(el)` tạo hiệu ứng gì?**  
   Clone element → bay từ vị trí click đến icon giỏ hàng → xóa clone.

5. **`logout()` xóa những key nào trong localStorage?**  
   `tamtai_token`, `tamtai_role`, `tamtai_profile`, `tamtai_customer_profile`, `tamtai_customer_id`.

6. **`updateBadge()` lấy số liệu từ đâu để hiển thị?**  
   `getCart().reduce((sum, item) => sum + item.quantity, 0)` — tổng số lượng, không phải tổng sản phẩm.

7. **`getRole()` trả về giá trị gì?**  
   localStorage.getItem("tamtai_role") — "admin" hoặc "customer" hoặc null.

8. **`formatCurrency(50000)` trả về chuỗi gì?**  
   "50.000₫" (dùng toLocaleString("vi-VN")).

## B — Landing page

9. **`loadLandingData()` fetch bao nhiêu API?**  
   2 API: GET /products/ và GET /products/categories/.

10. **`.product-grid` được render bằng cách nào?**  
    `.innerHTML` = map sản phẩm → chuỗi HTML card.

11. **Number trong `[data-stat="products"]` lấy từ đâu?**  
    Từ API dashboard hoặc tính từ độ dài mảng products.

12. **Hero slider chạy bằng cơ chế gì?**  
    setInterval + CSS transform (dịch chuyển ảnh).

## C — Auth (Login / Register / Forgot password)

13. **Làm sao login phân biệt admin và customer?**  
    So sánh email === "admin@tamtai.vn" → gọi loginAdmin(), còn lại gọi loginCustomer().

14. **Register có mấy bước?**  
    2 bước: (1) nhập email → gửi OTP, (2) nhập OTP + password → register.

15. **OTP timer chạy thế nào?**  
    setInterval mỗi 1s giảm biến `countdown`, cập nhật `#otpTimer.textContent`.

16. **Forgot password có state gì quan trọng?**  
    `state.verifiedEmail` (lưu email đã verify) và `state.resetToken` (token sau khi xác thực OTP).

17. **`disablePasswordFields(true)` làm gì?**  
    Đặt `#newPassword.disabled = true` và `#confirmPassword.disabled = true` — chưa verify OTP thì không cho nhập pass.

## D — Products & Product detail

18. **Products.js lọc sản phẩm ở đâu — client hay server?**  
    **Client-side**: fetch tất cả 1 lần → lọc/sort/phân trang trên JS.

19. **`state.render()` chạy những bước nào?**  
    filterProducts() → sortProducts() → paginateProducts() → buildProductCard() → .product-grid.innerHTML.

20. **`mapApiProduct(product)` làm gì?**  
    Chuẩn hóa tên field từ API (VD: `product_name` → `name`, `product_price` → `price`).

21. **"Mua ngay" khác "Thêm vào giỏ" thế nào?**  
    Cả 2 đều gọi addToCart(), nhưng "Mua ngay" còn redirect sang checkout.html.

22. **`#productDescription` dùng innerHTML hay textContent?**  
    innerHTML — vì dữ liệu từ API có thể chứa thẻ HTML (danh sách, in đậm...).

23. **Số lượng trong product-detail tối thiểu là mấy?**  
    1 — `#decreaseQty` không cho giảm dưới 1.

## E — Cart & Checkout

24. **Cart.js fetch API để làm gì?**  
    `syncCartWithApi()` — fetch từng sản phẩm để cập nhật giá mới nhất từ server.

25. **`updateItem(index, action)` dùng thuộc tính HTML nào để định danh?**  
    `data-index="${index}"` — gắn vào mỗi item row + button.

26. **Phí ship tính thế nào trong cart?**  
    subtotal ≥ 500.000₫ → "Miễn phí", ngược lại → "30,000₫".

27. **Checkout gửi dữ liệu qua phương thức gì?**  
    POST /orders/ với JSON body: items, shipping_address, payment_method, discount_code.

28. **Discount code được validate bằng cách nào?**  
    POST /discount-codes/validate { code, cart: getCart() } → server trả về discount_amount.

29. **Giỏ hàng bị xóa khi nào?**  
    Sau khi submit checkout thành công → `clearCart()`.

## F — Orders (All orders & Order detail)

30. **`toFrontendOrder()` làm gì?**  
    Map dữ liệu từ API → chuẩn hóa field cho frontend dùng.

31. **Filter orders có mấy tiêu chí?**  
    2: status (dropdown) + keyword (search input, tìm theo mã đơn hoặc tên sản phẩm).

32. **Order detail render bao nhiêu card overview?**  
    8 card: mã đơn, ngày, trạng thái, tên KH, SĐT, địa chỉ, tạm tính, tổng tiền.

33. **Làm sao biết orderId ở trang order-detail?**  
    `new URLSearchParams(location.search).get("id")`.

## G — User (Profile, Address, Password)

34. **Profile form field nào bị disabled?**  
    `#profileEmail` — email không được sửa.

35. **Khi đổi password thành công, chuyện gì xảy ra?**  
    alert → `TamTai.logout()` → xóa token → redirect về login.html.

36. **Address page load dữ liệu từ API nào?**  
    GET /addresses/customer/{customerId} — cần customerId từ GET /customers/me trước.

37. **Địa chỉ mới được tạo bằng phương thức gì?**  
    POST /addresses/ với body chứa fullName, phone, addressDetail, customerId.

## H — Notifications & Reviews

38. **Notification unread được đánh dấu bằng CSS gì?**  
    Class `.unread` — thêm background màu khác.

39. **Click notification gọi API gì?**  
    PATCH /notifications/{id}/read — đánh dấu đã đọc.

40. **"Mark all read" gọi API gì?**  
    PATCH /notifications/read-all.

41. **Review có upload ảnh không? Giới hạn gì?**  
    Có, dùng `<input type="file" multiple>` — tối đa 5 ảnh, mỗi ảnh ≤ 5MB.

42. **Review gửi dữ liệu dạng gì?**  
    `FormData` (multipart/form-data) — vì có file ảnh.

43. **Làm sao biết sản phẩm nào chưa được review?**  
    Lấy danh sách product IDs từ đơn hàng → lấy danh sách đã review → lọc ra sản phẩm chưa có review.

## I — Admin

44. **`verifyAccess()` làm gì nếu không phải admin?**  
    `location.href = "../core/landing.html"` — redirect về trang chủ.

45. **Admin dashboard render mấy stat?**  
    5: Sản phẩm, Đơn hàng, Khách hàng, Doanh thu, Mã giảm giá.

46. **Admin sản phẩm dùng POST hay PUT khi thêm/sửa?**  
    Thêm mới → POST /admin/products/.  
    Sửa → PUT /admin/products/{id}.

47. **Admin đơn hàng cập nhật trạng thái bằng API nào?**  
    PATCH /admin/orders/{id}/status { status: "..." }.

48. **Admin khách hàng có thể làm gì?**  
    Xem chi tiết + Khóa/Mở khóa tài khoản (PATCH /admin/customers/{id}/toggle).

49. **Admin discount tạo notification tự động khi nào?**  
    Khi tạo/sửa discount — gửi thông báo đến tất cả khách hàng.

50. **Tất cả admin page dùng chung thư viện gì?**  
    `TamTaiAdmin` trong admin/core.js — verifyAccess(), sortData(), paginateData(), renderPagination(), fetchAndRender().

---

## J — Tổng quan luồng dữ liệu

51. **Liệt kê 4 cách JS tương tác với HTML trong project này?**  
    - `.value` — đọc từ input (login form, search, filter)  
    - `.textContent` — ghi text (tên sản phẩm, giá, thông báo)  
    - `.innerHTML` — ghi HTML (danh sách sản phẩm, bảng orders, grid categories)  
    - `.src` — đổi ảnh (productImage, profileAvatar)

52. **TOÀN BỘ request API đều đi qua hàm nào?**  
    `TamTai.fetchJson(url, method, body)` — bọc fetch() sẵn có, tự động gắn Authorization header từ token.

53. **localStorage lưu những thông tin nhạy cảm gì?**  
    `tamtai_token` (JWT token) — nếu bị lộ, kẻ gian có thể giả mạo đăng nhập.

54. **Pattern chung của mọi page là gì?**  
    DOMContentLoaded → fetch API → render vào HTML (textContent/innerHTML) → gán sự kiện (addEventListener).

55. **Project này là SPA hay MPA?**  
    **MPA** (Multi-Page Application) — mỗi page là một file .html riêng, không dùng router client-side.
