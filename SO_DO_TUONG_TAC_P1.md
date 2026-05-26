# SƠ ĐỒ TƯƠNG TÁC HTML ↔ JS — TAM TAI E-COMMERCE (PHẦN 1)

---

## 1. common.js (TamTai — Thư viện dùng chung)

**Sơ đồ tương tác:**
```
localStorage ──→ getCart() / saveCart() ──→ giỏ hàng offline
       ↑                    ↓
  addToCart() ←────── click "Thêm vào giỏ" (các page)
       ↓
  fetchJson(url) ──→ fetch() ──→ API backend (GET/POST/PUT/DELETE)
       ↓
  formatCurrency(vnd) ──→ .textContent / .innerHTML hiện giá
       ↓
  getRole() ──→ localStorage.getItem("tamtai_role") ──→ phân quyền
       ↓
  logout() ──→ xóa localStorage ──→ location.href = "login.html"
       ↓
  flyToCart(el) ──→ animation từ sản phẩm → icon giỏ (`.cart-badge`)
       ↓
  updateBadge() ──→ `.cart-badge`.textContent = số lượng
       ↓
  initCommon() ──→ DOMContentLoaded → check login → cập nhật UI
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `.cart-badge` | `updateBadge()` → .textContent = tổng số lượng |
| `.btn-logout` | `logout()` → xóa token + redirect |
| `.cart-icon` | click → gọi flyToCart() animation |
| API_BASE_URL = "http://127.0.0.1:8000" | fetchJson() gửi request đến backend |

---

## 2. landing.html + landing.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
       ↓
  loadLandingData() ──┐
       ├── fetchJson("/products/") ──→ danh sách sản phẩm
       └── fetchJson("/products/categories/") ──→ danh sách category
       ↓
  renderFeaturedProducts(products) ──→ .product-grid.innerHTML = card HTML
       ↓
  renderCategories(categories) ──→ .category-grid.innerHTML = category HTML
       ↓
  renderStats() ──→ [data-stat] element.textContent = số liệu
       ↓
  setupHeroSlider() ──→ .hero-slider (chuyển ảnh tự động)
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `.product-grid` | `.innerHTML` = danh sách product card |
| `.category-grid` | `.innerHTML` = danh sách category |
| `[data-stat="products"]` | `.textContent` = tổng số sản phẩm |
| `[data-stat="customers"]` | `.textContent` = tổng số khách hàng |
| `[data-stat="orders"]` | `.textContent` = tổng số đơn hàng |
| `.hero-slider` | CSS transform + setInterval chuyển slide |

---

## 3. login.html + login.js

**Sơ đồ tương tác:**
```
form#loginForm submit
       ↓
  e.preventDefault()
       ↓
  email = #loginEmail.value
  password = #loginPassword.value
       ↓
  Nếu email === "admin@tamtai.vn"
       → loginAdmin() ──→ fetchJson("POST /admin/login")
       → lưu token + role="admin" vào localStorage
       → location.href = "../admin/admin.html"
  Ngược lại
       → loginCustomer() ──→ fetchJson("POST /customers/login")
       → lưu token + role="customer" vào localStorage
       → location.href = "../core/landing.html"
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#loginForm` | `addEventListener("submit", ...)` |
| `#loginEmail` | `.value` đọc email người dùng nhập |
| `#loginPassword` | `.value` đọc password người dùng nhập |
| `#loginMessage` | `.textContent` = thông báo lỗi/thành công |
| localStorage | `setItem("tamtai_token", ...)`, `setItem("tamtai_role", ...)` |

---

## 4. register.html + register.js

**Sơ đồ tương tác:**
```
DOMContentLoaded → gán sự kiện các bước

Bước 1: Nhập email → click "Gửi OTP"
  sendOtp() → fetchJson("POST /customers/send-otp") 
            → ẩn bước 1, hiện bước 2, start countdown 60s

Bước 2: Nhập OTP + password + confirm password
  #otpTimer: đếm ngược 60s (setInterval)
  #otpInput.value + #regPassword.value + #regConfirmPassword.value
       ↓
  registerWithOtp() → fetchJson("POST /customers/register")
       ↓
  Thành công → alert → location.href = "login.html"
  Thất bại → #registerMessage.textContent = lỗi
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#step1`, `#step2` | `.classList.add("hidden")` / `.remove("hidden")` chuyển bước |
| `#otpTimer` | `.textContent` = thời gian đếm ngược |
| `#otpInput` | `.value` đọc mã OTP |
| `#regEmail` | `.value` đọc email |
| `#regPassword` | `.value` đọc mật khẩu |
| `#regConfirmPassword` | `.value` xác nhận mật khẩu |
| `#registerMessage` | `.textContent` = thông báo |

---

## 5. forgot-password.html + forgot-password.js

**Sơ đồ tương tác:**
```
state = { verifiedEmail: null, resetToken: null }

Step 1: #fpEmail → "Gửi OTP"
  requestOtp() → POST /customers/forgot-password → state.verifiedEmail = email

Step 2: #fpOtp → "Xác thực"
  verifyOtp() → POST /customers/verify-reset-otp → state.resetToken = token
              → enable #newPassword + #confirmPassword

Step 3: #newPassword + #confirmPassword → "Đặt lại"
  resetPassword() → POST /customers/reset-password
                  → clearVerificationState() → redirect login
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#fpEmail` | `.value` đọc email |
| `#fpOtp` | `.value` đọc OTP |
| `#newPassword`, `#confirmPassword` | `.value` + `.disabled` (disable khi chưa verify) |
| `#fpMessage` | `.textContent` = thông báo |
| `.step` (3 bước) | `.classList` ẩn/hiện theo state |

---

## 6. products.html + products.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → fetchJson("/products/") → lưu vào state.allProducts
  → fetchJson("/products/categories/") → render .category-filters
  → state.render()

state.render()
  → filterProducts() (theo selectedCategories, priceMin, priceMax, keyword)
  → sortProducts() (theo sortMode: price-asc, price-desc, name, newest)
  → paginateProducts() (theo currentPage, itemsPerPage)
  → buildProductCard() → .product-grid.innerHTML

Event click:
  .category-filters input[type="checkbox"] → toggle selectedCategories → render()
  #priceMin, #priceMax change → update state → render()
  #searchInput keyup → debounce → update keyword → render()
  .sort-select change → update sortMode → render()
  .pagination a click → update currentPage → render()
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `.product-grid` | `.innerHTML` = kết quả lọc/sort/phân trang |
| `.category-filters input[type="checkbox"]` | `change` → toggle state.selectedCategories |
| `#priceMin`, `#priceMax` | `change` → `.value` → state.priceMin/Max |
| `#searchInput` | `keyup` → `.value` → debounce → render lại |
| `.sort-select` | `change` → state.sortMode |
| `.pagination` | `.innerHTML` = nút trang + click → currentPage |

---

## 7. product-detail.html + product-detail.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → id = new URLSearchParams(location.search).get("id")
  → fetchJson("/products/" + id)
  → mapApiProduct(product) (chuẩn hóa field)
  → renderProduct()

renderProduct(product):
  #productImage.src = product.image
  #productName.textContent = product.name
  #productPrice.textContent = formatCurrency(product.price)
  #productOldPrice.textContent = formatCurrency(product.oldPrice)
  #productDescription.innerHTML = product.description (hỗ trợ HTML)
  #productRating.innerHTML = sao (★)
  #productSold.textContent = product.sold
  #productCategory.textContent = product.category_name
  #productStock.textContent = product.stock

setupQuantity():
  #decreaseQty → giảm số lượng (≥ 1)
  #increaseQty → tăng số lượng
  #quantity.value = số hiện tại

"Thêm vào giỏ" click
  → addToCart(product, quantity)
  → flyToCart()
  → alert

"Mua ngay" click
  → addToCart(product, quantity)
  → location.href = "checkout.html"
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `#productImage` | `.src` = ảnh sản phẩm |
| `#productName` | `.textContent` = tên sản phẩm |
| `#productPrice` | `.textContent` = giá (đã format) |
| `#productOldPrice` | `.textContent` = giá cũ |
| `#productDescription` | `.innerHTML` = mô tả (có thể có HTML tags) |
| `#productRating` | `.innerHTML` = sao đánh giá |
| `#productSold` | `.textContent` = số đã bán |
| `#productCategory` | `.textContent` = tên danh mục |
| `#productStock` | `.textContent` = tồn kho |
| `#quantity` | `.value` = số lượng + `change` event |
| `#decreaseQty`, `#increaseQty` | `click` → tăng/giảm value |
| `.btn-add-cart` | `click` → addToCart + flyToCart |
| `.btn-buy-now` | `click` → addToCart + redirect checkout |

---

## 8. cart.html + cart.js

**Sơ đồ tương tác:**
```
DOMContentLoaded
  → syncCartWithApi() ──→ từng item trong cart → fetchJson("/products/" + id)
                         → cập nhật giá mới nhất từ API
  → renderCartItems()

renderCartItems():
  cart.forEach((item, index) →
    .cart-items.innerHTML += `
      <div data-index="${index}">
        <img src="${item.image}">
        <span class="item-name">${item.name}</span>
        <button data-action="decrease" data-index="${index}">−</button>
        <span class="quantity" data-index="${index}">${item.quantity}</span>
        <button data-action="increase" data-index="${index}">+</button>
        <span class="item-price">${formatCurrency(item.price * item.quantity)}</span>
        <button data-action="remove" data-index="${index}">×</button>
      </div>
    `
  )

updateItem(index, action):
  if action === "increase" → item.quantity++
  if action === "decrease" → item.quantity-- (xóa nếu = 0)
  if action === "remove"  → splice khỏi mảng
  saveCart(cart) → renderCartItems() → renderSummary()

renderSummary():
  subtotal = sum(item.price * item.quantity)
  #cartSubtotal.textContent = formatCurrency(subtotal)
  #cartShipping.textContent = subtotal >= 500000 ? "Miễn phí" : "30,000₫"
  #cartTotal.textContent = formatCurrency(subtotal + shipping)
```

**Giao điểm HTML ↔ JS:**
| HTML element | JS thao tác |
|---|---|
| `.cart-items` | `.innerHTML` = danh sách item |
| `button[data-action]` | `click` → đọc data-index + data-action → updateItem() |
| `.item-name`, `.item-price`, `.quantity` | `.textContent` hiển thị dữ liệu |
| `#cartSubtotal` | `.textContent` = tạm tính |
| `#cartShipping` | `.textContent` = phí ship |
| `#cartTotal` | `.textContent` = tổng cộng |
| `#checkoutBtn` | `click` → location.href = "checkout.html" |
