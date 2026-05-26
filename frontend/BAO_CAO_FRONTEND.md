# BÁO CÁO FRONTEND - DỰ ÁN THƯƠNG MẠI ĐIỆN TỬ TAM TAI

## MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Công nghệ sử dụng](#2-công-nghệ-sử-dụng)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Cách tổ chức giao diện (Multi-Page Application)](#4-cách-tổ-chức-giao-diện-multi-page-application)
5. [Các trang chính](#5-các-trang-chính)
6. [Xử lý JavaScript](#6-xử-lý-javascript)
7. [Quản lý trạng thái (State Management)](#7-quản-lý-trạng-thái-state-management)
8. [Xác thực người dùng (Authentication)](#8-xác-thực-người-dùng-authentication)
9. [Giao tiếp với Backend API](#9-giao-tiếp-với-backend-api)
10. [Chức năng Giỏ hàng](#10-chức-năng-giỏ-hàng)
11. [Trang Admin](#11-trang-admin)
12. [Các luồng dữ liệu chính](#12-các-luồng-dữ-liệu-chính)
13. [Bảo vệ trang & Kiểm soát truy cập](#13-bảo-vệ-trang--kiểm-soát-truy-cập)
14. [Tổng kết](#14-tổng-kết)

---

## 1. Tổng quan dự án

**Tên dự án:** Tam Tai E-Commerce  
**Mô tả:** Một trang web thương mại điện tử bán các sản phẩm công nghệ (điện thoại, laptop, tai nghe, bàn phím, chuột, đồng hồ thông minh).  
**Loại ứng dụng:** Multi-Page Application (MPA) - Ứng dụng nhiều trang  
**Ngôn ngữ:** HTML5, CSS3, JavaScript thuần (Vanilla JS)  
**Backend:** FastAPI (Python) tại `http://127.0.0.1:8000`

---

## 2. Công nghệ sử dụng

| Công nghệ | Chi tiết |
|-----------|----------|
| **Frontend Framework** | **Không có** - Sử dụng JavaScript thuần (Vanilla JS) |
| **HTML** | HTML5 - Mỗi trang là một file .html riêng biệt |
| **CSS** | CSS3 thuần - Không dùng preprocessor (SASS/SCSS) |
| **JavaScript** | ES6+ (async/await, arrow functions, IIFE, fetch API) |
| **Build Tools** | **Không có** - Không Webpack, Vite, Babel |
| **Package Manager** | **Không có** - Không package.json, không node_modules |
| **Font** | Google Fonts: Anton (tiêu đề), Be Vietnam Pro (nội dung), JetBrains Mono (mật khẩu) |
| **Icons** | Font Awesome 6.5 (CDN miễn phí) |
| **Đăng nhập Google** | Google Identity Services (GSI) - OAuth 2.0 |
| **Backend API** | FastAPI Python |
| **Lưu trữ client** | localStorage - token, giỏ hàng, thông tin profile cache |
| **HTTP Client** | Fetch API (JavaScript built-in) |

> **Điểm đặc biệt:** Project này KHÔNG sử dụng bất kỳ framework JavaScript nào (React, Vue, Angular) và cũng không có build tools hay package manager. Đây là một dự án frontend "thuần chay" 100%.

---

## 3. Cấu trúc thư mục

```
frontend/
│
├── css/                           # Stylesheet (CSS)
│   ├── admin/                     #   CSS cho trang Admin
│   │   ├── base.css               #     Layout chung admin
│   │   ├── dashboard.css          #     Dashboard
│   │   ├── customers.css          #     Quản lý khách hàng
│   │   ├── discounts.css          #     Quản lý mã giảm giá
│   │   ├── orders.css             #     Quản lý đơn hàng
│   │   └── products.css           #     Quản lý sản phẩm
│   ├── auth/                      #   CSS cho trang xác thực
│   │   ├── login.css              #     Đăng nhập
│   │   └── register.css           #     Đăng ký
│   ├── cart/                      #   CSS cho trang giỏ hàng
│   │   ├── cart.css               #     Giỏ hàng
│   │   ├── checkout.css           #     Thanh toán
│   │   ├── all-orders.css         #     Lịch sử đơn hàng
│   │   └── order-detail.css       #     Chi tiết đơn hàng
│   ├── core/                      #   CSS cho trang chính
│   │   └── landing.css            #     Trang chủ
│   ├── info/                      #   CSS cho trang thông tin
│   │   └── info-pages.css         #     FAQ, trợ giúp, chính sách
│   ├── products/                  #   CSS cho trang sản phẩm
│   │   ├── products.css           #     Danh sách sản phẩm
│   │   └── product-detail.css     #     Chi tiết sản phẩm
│   └── user/                      #   CSS cho trang người dùng
│       ├── profile.css            #     Trang cá nhân
│       └── notification.css       #     Thông báo
│
├── html/                          # Giao diện HTML
│   ├── admin/                     #   Trang Admin
│   │   ├── admin.html             #     Dashboard tổng quan
│   │   ├── customers.html         #     Quản lý khách hàng
│   │   ├── discounts.html         #     Quản lý mã giảm giá
│   │   ├── orders.html            #     Quản lý đơn hàng
│   │   └── products.html          #     Quản lý sản phẩm
│   ├── auth/                      #   Trang xác thực
│   │   ├── login.html             #     Đăng nhập
│   │   ├── register.html          #     Đăng ký
│   │   └── forgot-password.html   #     Quên mật khẩu
│   ├── cart/                      #   Trang giỏ hàng & đơn hàng
│   │   ├── cart.html              #     Giỏ hàng
│   │   ├── checkout.html          #     Thanh toán
│   │   ├── all-orders.html        #     Lịch sử đơn hàng
│   │   └── order-detail.html      #     Chi tiết đơn hàng
│   ├── core/                      #   Trang chính
│   │   └── landing.html           #     Trang chủ (Landing Page)
│   ├── info/                      #   Trang thông tin tĩnh
│   │   ├── faq.html               #     Câu hỏi thường gặp
│   │   ├── help-center.html       #     Trung tâm trợ giúp
│   │   ├── privacy-policy.html    #     Chính sách bảo mật
│   │   ├── operating-regulations.html  # Quy chế hoạt động
│   │   └── promotions.html        #     Khuyến mãi
│   ├── products/                  #   Trang sản phẩm
│   │   ├── products.html          #     Danh sách sản phẩm
│   │   └── product-detail.html    #     Chi tiết sản phẩm
│   └── user/                      #   Trang người dùng
│       ├── profile.html           #     Thông tin cá nhân
│       ├── address.html           #     Quản lý địa chỉ
│       ├── password.html          #     Đổi mật khẩu
│       ├── notification.html      #     Thông báo
│       └── product-reviews.html   #     Đánh giá sản phẩm
│
└── js/                            # JavaScript
    ├── core/                      #   JS dùng chung
    │   ├── common.js              #     Thư viện toàn cục (TamTai namespace)
    │   └── landing.js             #     Logic trang chủ
    ├── admin/                     #   JS cho Admin
    │   ├── core.js                #     Thư viện chung Admin (TamTaiAdmin)
    │   ├── dashboard.js           #     Dashboard
    │   ├── customers.js           #     Quản lý khách hàng
    │   ├── discounts.js           #     Quản lý mã giảm giá
    │   ├── orders.js              #     Quản lý đơn hàng
    │   └── products.js            #     Quản lý sản phẩm
    ├── auth/                      #   JS cho xác thực
    │   ├── login.js               #     Đăng nhập
    │   ├── register.js            #     Đăng ký
    │   └── forgot-password.js     #     Quên mật khẩu
    ├── cart/                      #   JS cho giỏ hàng
    │   ├── cart.js                #     Giỏ hàng
    │   ├── checkout.js            #     Thanh toán
    │   ├── all-orders.js          #     Lịch sử đơn hàng
    │   ├── order-detail.js        #     Chi tiết đơn hàng
    │   └── orders-data.js         #     Dữ liệu mẫu tĩnh
    ├── products/                  #   JS cho sản phẩm
    │   ├── products.js            #     Danh sách sản phẩm
    │   └── product-detail.js      #     Chi tiết sản phẩm
    └── user/                      #   JS cho người dùng
        ├── address.js             #     Địa chỉ
        ├── notification.js        #     Thông báo
        ├── password.js            #     Mật khẩu
        ├── product-reviews.js     #     Đánh giá sản phẩm
        └── profile.js             #     Trang cá nhân
```

**Tổng cộng:** 48 file nguồn (15 HTML, 16 CSS, 17 JS)

---

## 4. Cách tổ chức giao diện (Multi-Page Application)

### 4.1 Multi-Page Application (MPA) là gì?

Khác với các ứng dụng Single-Page Application (SPA) như React, Vue - nơi chỉ có **một file HTML duy nhất** và JavaScript xử lý mọi chuyển hướng, **MPA** hoạt động theo cách truyền thống: mỗi trang là **một file HTML riêng biệt**, và mỗi lần chuyển trang là **trình duyệt tải lại toàn bộ trang**.

### 4.2 Cách điều hướng (Routing)

- **Điều hướng bằng thẻ `<a>`:** Dùng đường dẫn tương đối giữa các file HTML
  ```html
  <a href="../products/products.html">Sản phẩm</a>
  <a href="../products/product-detail.html?id=PROD001">Chi tiết</a>
  ```

- **Điều hướng bằng JavaScript:**
  ```javascript
  window.location.href = "../user/profile.html";
  ```

- **Truyền tham số qua URL (Query Parameters):**
  ```javascript
  // Tạo URL: product-detail.html?id=PROD001&category=laptop
  // Đọc tham số:
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  ```

### 4.3 Sơ đồ điều hướng giữa các trang

```
Trang Chủ (landing.html)
  ├──> Danh sách sản phẩm (products.html)
  │     ├──> Chi tiết sản phẩm (product-detail.html)
  │     │     └──> Giỏ hàng (cart.html) → Thanh toán (checkout.html)
  │     │                                          └──> Chi tiết đơn hàng
  │     └──> Giỏ hàng (cart.html)
  │           └──> Thanh toán (checkout.html)
  ├──> Đăng nhập (login.html) → Trang cá nhân (profile.html)
  │     └──> Quên mật khẩu (forgot-password.html)
  └──> Đăng ký (register.html) → Đăng nhập

Trang cá nhân (profile.html)
  ├──> Quản lý địa chỉ (address.html)
  ├──> Đổi mật khẩu (password.html)
  ├──> Lịch sử đơn hàng (all-orders.html)
  ├──> Đánh giá sản phẩm (product-reviews.html)
  └──> Admin Dashboard (admin.html) [chỉ admin]

Admin Dashboard (admin.html)
  ├──> Quản lý sản phẩm (admin/products.html)
  ├──> Quản lý đơn hàng (admin/orders.html)
  ├──> Quản lý khách hàng (admin/customers.html)
  └──> Quản lý mã giảm giá (admin/discounts.html)
```

---

## 5. Các trang chính

### 5.1 Trang Chủ (core/landing.html)

Trang chủ là "bộ mặt" của website, bao gồm các phần:

| Phần | Mô tả |
|------|-------|
| **Header** | Logo, thanh tìm kiếm, icon giỏ hàng (có badge số lượng), nút Đăng nhập/Đăng ký |
| **Hero Slider** | Banner quảng cáo chạy tự động, có nút điều hướng |
| **Stats Strip** | Thống kê ấn tượng: tổng sản phẩm, danh mục, đánh giá trung bình, số lượng đánh giá |
| **Danh mục nổi bật** | Grid 6 danh mục sản phẩm (Điện thoại, Laptop, Tai nghe, Bàn phím, Chuột, Đồng hồ) |
| **Giá trị mang lại** | 4 giá trị: Miễn phí vận chuyển, Bảo hành 12 tháng, Hỗ trợ 24/7, Thanh toán an toàn |
| **Footer** | Liên kết nhanh, thông tin công ty |

**JavaScript:** `landing.js` xử lý:
- Gọi API lấy danh sách danh mục và sản phẩm
- Render thống kê (stats)
- Render các card danh mục
- Tạo slider tự động chuyển ảnh

### 5.2 Trang Đăng nhập (auth/login.html)

**Chức năng:**
- Form đăng nhập với email và mật khẩu
- Checkbox "Ghi nhớ đăng nhập"
- Nút hiện/ẩn mật khẩu (toggle)
- Đăng nhập bằng Google (Google OAuth)
- Link "Quên mật khẩu" và "Đăng ký"

**Xử lý đặc biệt:**
- Nếu email là `admin@tamtai.vn` → gọi API admin riêng
- Nếu là user → gọi API customer thông thường
- Sau đăng nhập: admin → trang admin, user → trang cá nhân

### 5.3 Trang Đăng ký (auth/register.html)

**Quy trình đăng ký 2 bước:**
1. **Bước 1 - Xác thực email:**
   - Nhập tên và email
   - Click "Gửi mã xác thực" → API gửi OTP 6 chữ số về email
   - Nút countdown 60 giây, OTP hết hạn sau 10 phút
   - Nhập mã OTP để xác minh
2. **Bước 2 - Tạo mật khẩu:**
   - Nhập mật khẩu và xác nhận mật khẩu
   - Validation: tối thiểu 8 ký tự, có chữ hoa, chữ thường, số
   - Submit → API đăng ký → redirect về trang đăng nhập

### 5.4 Trang Danh sách Sản phẩm (products/products.html)

**Đây là trang phức tạp nhất với nhiều tính năng lọc:**

| Tính năng | Mô tả |
|-----------|-------|
| **Hero Slider** | Ảnh banner quảng cáo sản phẩm |
| **Lọc nhanh danh mục** | 6 nút danh mục ở đầu trang |
| **Bộ lọc nâng cao** | Checkbox danh mục + thanh trượt giá (dual slider) + dropdown sắp xếp |
| **Tìm kiếm** | Ô tìm kiếm sản phẩm |
| **Product Grid** | Grid hiển thị sản phẩm dạng card |
| **Phân trang** | Nút chuyển trang, hiển thị số trang hiện tại |

**Mỗi card sản phẩm hiển thị:**
- Ảnh sản phẩm (có fallback nếu lỗi)
- Tên sản phẩm
- Giá mới và giá cũ (gạch ngang)
- Badge giảm giá (%)

### 5.5 Trang Chi tiết Sản phẩm (products/product-detail.html)

**Bố cục:**
- **Breadcrumb:** Điện thoại > iPhone 15 Pro Max
- **Ảnh sản phẩm:** Ảnh chính lớn
- **Thông tin:** Tên, rating (sao), giá (cũ + mới), mô tả
- **Hành động:**
  - Bộ chọn số lượng (+/-)
  - Nút "Thêm vào giỏ" (có hiệu ứng bay vào giỏ)
  - Nút "Mua ngay" (thêm vào giỏ + chuyển đến checkout)

### 5.6 Trang Giỏ hàng (cart/cart.html)

**Chức năng:**
- Hiển thị danh sách sản phẩm đã thêm vào giỏ
- Mỗi item: ảnh, tên, giá cũ/mới, số lượng (+/-), nút xóa
- Panel tổng kết: tạm tính, phí ship, tổng cộng
- Gợi ý sản phẩm liên quan (4 sản phẩm không có trong giỏ)
- Nút "Tiến hành thanh toán"
- Đồng bộ giá từ API để đảm bảo giá mới nhất

### 5.7 Trang Thanh toán (cart/checkout.html)

**Form thanh toán gồm:**
1. **Thông tin giao hàng:** Họ tên, SĐT, Email, Thành phố (có gợi ý), Địa chỉ chi tiết, Ghi chú
2. **Địa chỉ đã lưu:** Dropdown chọn địa chỉ có sẵn (tự động điền form)
3. **Phương thức vận chuyển:** Giao nhanh / Giao tiết kiệm
4. **Phương thức thanh toán:** COD / Chuyển khoản / Ví điện tử
5. **Mã giảm giá:** Ô nhập + nút "Áp dụng" (gọi API validate)
6. **Tổng kết:** Danh sách items, tạm tính, giảm giá, phí ship, tổng

### 5.8 Trang Quản lý Admin

#### Dashboard (admin/admin.html)
- **Stats Strip:** 5 thẻ hiển thị tổng sản phẩm, khách hàng, đơn hàng, doanh thu, mã giảm giá
- **Đơn hàng gần đây:** Bảng 5 đơn hàng mới nhất
- **Sản phẩm sắp hết hàng:** Danh sách cảnh báo tồn kho thấp
- **Sản phẩm bán chạy:** Top sản phẩm theo doanh số (có sắp xếp, phân trang)

#### Quản lý Sản phẩm (admin/products.html)
- Bảng với cột: ID, Tên (kèm thumbnail), Danh mục, Giá, Tồn kho, Đã bán
- Lọc theo danh mục
- CRUD: Tạo mới, Sửa, Xóa sản phẩm
- Form panel hiện ra khi thêm/sửa

#### Quản lý Đơn hàng (admin/orders.html)
- Bảng tất cả đơn hàng
- Cập nhật trạng thái inline (dropdown): Pending → Confirmed → Shipping → Delivered / Cancelled
- Nút Save để lưu thay đổi

#### Quản lý Khách hàng (admin/customers.html)
- Bảng danh sách khách hàng
- Modal xem chi tiết thông tin khách hàng
- Form sửa thông tin inline
- Chuyển đổi trạng thái Active/Locked

#### Quản lý Mã giảm giá (admin/discounts.html)
- Bảng mã giảm giá
- Form tạo/sửa: mã code, phần trăm, sản phẩm áp dụng, khách hàng áp dụng, giới hạn, ngày hiệu lực
- Toggle kích hoạt/vô hiệu hóa
- Xóa mã giảm giá (có xác nhận)

### 5.9 Trang Người dùng

| Trang | Chức năng |
|-------|-----------|
| **profile.html** | Xem/sửa thông tin cá nhân (tên, email, SĐT), 4 đơn hàng gần nhất |
| **address.html** | Quản lý địa chỉ: thêm, xóa, đánh dấu mặc định |
| **password.html** | Đổi mật khẩu: nhập mật khẩu cũ + mới, validation, tự động logout |
| **notification.html** | Thông báo: tabs lọc (Tất cả/Đơn hàng/Khuyến mãi/Hệ thống), đánh dấu đã đọc |
| **product-reviews.html** | Đánh giá sản phẩm: chọn sao (1-5), nhập bình luận, upload ảnh (tối đa 5) |

---

## 6. Xử lý JavaScript

### 6.1 Kiến trúc Namespace

JavaScript được tổ chức theo mô hình **IIFE (Immediately Invoked Function Expression)** và **Namespace**:

```javascript
// common.js - Module dùng chung
var TamTai = (function() {
    // Private functions and variables
    function fetchJson(path, options) { ... }
    function addToCart(product) { ... }
    
    // Public API
    return {
        fetchJson: fetchJson,
        addToCart: addToCart,
        getRole: function() { ... },
        logout: function() { ... }
    };
})();
```

Các module chia làm 2 namespace chính:
- **`window.TamTai`** - Dùng chung cho toàn bộ frontend (common.js)
- **`window.TamTaiAdmin`** - Dùng riêng cho trang admin (admin/core.js)

### 6.2 Các thành phần trong TamTai (common.js)

Đây là "trái tim" của frontend, chứa các chức năng:

| Chức năng | Mô tả |
|-----------|-------|
| **Cart Management** | `getCart()`, `saveCart()`, `addToCart()`, `clearCart()` - Quản lý giỏ hàng trong localStorage |
| **API Helper** | `fetchJson()` - Gọi API với fetch, tự động parse JSON và xử lý lỗi |
| **Format** | `formatCurrency()` - Định dạng tiền tệ VND (VD: 12.500.000₫) |
| **Auth** | `getRole()`, `getProfile()`, `saveProfile()`, `clearSession()`, `logout()` |
| **Badge** | `updateCartBadge()` - Cập nhật số lượng giỏ hàng trên icon |
| **Animation** | `flyToCart()` - Hiệu ứng sản phẩm bay vào giỏ hàng |
| **Chatbot** | `initChatbot()` - Khởi tạo chatbot từ server ngoài |

### 6.3 Thành phần trong TamTaiAdmin (admin/core.js)

| Chức năng | Mô tả |
|-----------|-------|
| **verifyAccess()** | Kiểm tra quyền admin trước khi load trang |
| **request()** | Gọi API có kèm Bearer token, tự động redirect nếu 401 |
| **sortTable()** | Sắp xếp bảng theo cột |
| **paginate()** | Phân trang |
| **modalForm()** | Form trong modal |
| **renderStats()** | Render thống kê dashboard |
| **populateSelect()** | Đổ dữ liệu vào dropdown |

### 6.4 Pattern chung của mỗi trang

```javascript
document.addEventListener("DOMContentLoaded", function() {
    // 1. Khởi tạo các tiện ích chung
    TamTai.setupSearchRedirect();
    TamTai.showAdminMenuLink();
    TamTai.bindLogoutButtons();
    TamTai.updateCartBadge();
    
    // 2. Khởi tạo state
    var state = {
        data: [],
        currentPage: 1,
        filters: {}
    };
    
    // 3. Load dữ liệu từ API
    loadData();
    
    // 4. Bind sự kiện
    function bindEvents() { ... }
    
    // 5. Render giao diện
    function render() { ... }
});
```

---

## 7. Quản lý trạng thái (State Management)

Dự án **không** sử dụng thư viện quản lý state (Redux, Zustand, Pinia). State được quản lý bằng:

### 7.1 localStorage (Lưu trữ bền vững)

| Key | Mục đích |
|-----|----------|
| `access_token` | JWT token xác thực |
| `token_type` | Loại token (bearer) |
| `tamtai_role` | Vai trò: `guest`, `user`, `admin` |
| `tamtai_customer_id` | ID khách hàng hiện tại |
| `tamtai_cart` | Giỏ hàng (dạng JSON array) |
| `tamtai_customer_profile` | Profile khách hàng (JSON) |
| `tamtai_notify_unread` | Số thông báo chưa đọc |

### 7.2 In-memory State (Biến trong module)

Mỗi file JS dùng IIFE với biến `state` cục bộ:

```javascript
var state = {
    products: [],
    sorting: { key: "product_id", direction: "desc" },
    pagination: { current: 1 },
    filters: { categories: [], priceRange: [0, 100000000] }
};
```

### 7.3 Event-driven Updates

```javascript
// Khi giỏ hàng thay đổi -> phát sự kiện
window.dispatchEvent(new CustomEvent("tamtai:cart-updated"));

// Lắng nghe ở trang khác
window.addEventListener("storage", function(e) {
    if (e.key === "tamtai_cart") { updateCartBadge(); }
});
```

---

## 8. Xác thực người dùng (Authentication)

### 8.1 Luồng Đăng ký

```
Nhập tên + email
  → Gửi mã OTP (POST /customers/register/request-otp)
  → Countdown 60s trên nút
  → Nhập mã OTP 6 số
  → Nhập mật khẩu + xác nhận
  → Xác thực OTP (POST /customers/register/with-otp)
  → Thành công: alert + redirect về trang đăng nhập
```

### 8.2 Luồng Đăng nhập

```
Nhập email + password
  → Kiểm tra email có phải admin không?
  ├── Admin: POST /admin/login (form-urlencoded)
  └── User: POST /customers/login (JSON)
  
  → Lưu access_token, role vào localStorage
  → Admin: redirect đến admin dashboard
  → User: redirect đến trang cá nhân
```

### 8.3 Google OAuth

```
Click "Đăng nhập với Google"
  → Google Identity Services hiện popup
  → Nhận credential (id_token)
  → POST /customers/google { id_token: credential }
  → Lưu token + role = "user"
  → Redirect đến trang cá nhân
```

### 8.4 Phiên làm việc (Session)

- Token JWT được lưu trong `localStorage`
- Mỗi request API đều gửi kèm: `Authorization: Bearer <token>`
- **Không có cơ chế refresh token** - nếu hết hạn → 401 → redirect về login

### 8.5 Đăng xuất

```javascript
// Click nút logout (data-logout attribute)
TamTai.logout();
  → Xóa: access_token, token_type, tamtai_role, customer_id, profile
  → Redirect: auth/login.html
```

---

## 9. Giao tiếp với Backend API

### 9.1 Cấu hình

- **Base URL:** `http://127.0.0.1:8000`
- **Phương thức:** Fetch API (JavaScript built-in)
- **Định dạng dữ liệu:** JSON (trừ khi upload file)

### 9.2 Hàm gọi API chung

```javascript
// Trong common.js - TamTai.fetchJson
async function fetchJson(path, options) {
    const response = await fetch(buildApiUrl(path), options || {});
    const body = await response.json();
    if (!response.ok) {
        throw new Error(body.detail || "Request failed: " + response.status);
    }
    return body;
}
```

### 9.3 Hàm gọi API cho Admin

```javascript
// Trong admin/core.js - TamTaiAdmin.request
// Tự động thêm header Authorization: Bearer <token>
// Tự động xử lý lỗi 401/403 → clear session → redirect login
async function request(path, options) { ... }
```

### 9.4 Danh sách API Endpoints

#### Public (Không cần xác thực)
| Method | Endpoint | Mục đích |
|--------|----------|----------|
| GET | /categories/ | Danh sách danh mục |
| GET | /categories/{id} | Chi tiết danh mục |
| GET | /products/ | Danh sách sản phẩm |
| GET | /products/{id} | Chi tiết sản phẩm |
| POST | /customers/register/request-otp | Gửi mã OTP đăng ký |
| POST | /customers/register/with-otp | Đăng ký với OTP |
| POST | /customers/login | Đăng nhập |
| POST | /customers/google | Đăng nhập Google |
| POST | /customers/forgot-password/request-otp | Gửi OTP quên mật khẩu |
| POST | /customers/forgot-password/verify-otp | Xác thực OTP |
| POST | /customers/forgot-password/reset | Đặt lại mật khẩu |
| GET | /payment-methods/ | Danh sách phương thức thanh toán |

#### User (Cần token)
| Method | Endpoint | Mục đích |
|--------|----------|----------|
| POST | /orders/ | Tạo đơn hàng |
| GET | /orders/ | Danh sách đơn hàng |
| GET | /orders/{id} | Chi tiết đơn hàng |
| GET | /customers/me | Lấy thông tin cá nhân |
| PUT | /customers/{id} | Cập nhật thông tin |
| POST | /customers/change-password | Đổi mật khẩu |
| GET | /addresses/customer/{id} | Danh sách địa chỉ |
| POST | /addresses/ | Thêm địa chỉ |
| DELETE | /addresses/{id} | Xóa địa chỉ |
| GET | /reviews/customer/{id} | Danh sách đánh giá |
| POST | /reviews/ | Gửi đánh giá (multipart/form-data) |
| POST | /discount-codes/validate | Kiểm tra mã giảm giá |
| GET | /notifications/ | Danh sách thông báo |
| PATCH | /notifications/{id}/read | Đánh dấu đã đọc |
| PATCH | /notifications/read-all | Đánh dấu tất cả đã đọc |

#### Admin (Cần token admin)
| Method | Endpoint | Mục đích |
|--------|----------|----------|
| POST | /admin/login | Đăng nhập admin |
| GET | /admin/me | Xác thực admin |
| GET | /admin/dashboard | Thống kê dashboard |
| GET | /admin/products | Danh sách sản phẩm (admin) |
| POST | /admin/products | Thêm sản phẩm |
| PUT | /admin/products/{id} | Sửa sản phẩm |
| DELETE | /admin/products/{id} | Xóa sản phẩm |
| GET | /admin/orders | Danh sách đơn hàng |
| PATCH | /admin/orders/{id}/status | Cập nhật trạng thái đơn |
| GET | /admin/customers | Danh sách khách hàng |
| PATCH | /admin/customers/{id} | Sửa thông tin khách hàng |
| GET | /admin/discount-codes | Danh sách mã giảm giá |
| POST | /admin/discount-codes | Thêm mã giảm giá |
| PATCH | /admin/discount-codes/{id} | Sửa mã giảm giá |
| DELETE | /admin/discount-codes/{id} | Xóa mã giảm giá |

---

## 10. Chức năng Giỏ hàng

### 10.1 Cách lưu trữ

Giỏ hàng được lưu trong **localStorage**:
- **Khách (guest):** key = `tamtai_cart`
- **Người dùng đã đăng nhập:** key = `tamtai_cart_user_{customerId}`

Cấu trúc dữ liệu giỏ hàng:
```javascript
[
    {
        id: "PROD001",
        name: "iPhone 15 Pro Max",
        price: 27990000,
        oldPrice: 32990000,
        image: "images/iphone15.jpg",
        quantity: 2,
        category_id: "CAT_PHONE"
    }
]
```

### 10.2 Luồng thao tác với giỏ hàng

```
Thêm vào giỏ:
  → TamTai.addToCart(product)
  → Đọc giỏ hàng từ localStorage (key theo user)
  → Nếu sản phẩm đã tồn tại → tăng số lượng
  → Nếu chưa → thêm mới
  → Lưu lại localStorage
  → Phát sự kiện "tamtai:cart-updated"
  → Cập nhật badge trên icon giỏ hàng
  → Chạy hiệu ứng bay vào giỏ (flyToCart)

Trang giỏ hàng (cart.html):
  → Đọc giỏ hàng từ localStorage
  → syncCartWithApi(): gọi API lấy giá mới nhất cho mỗi sản phẩm
  → Render danh sách items + panel tổng kết
  → Load sản phẩm liên quan (loại trừ sản phẩm đã có trong giỏ)
```

### 10.3 Các thao tác trên giỏ hàng

| Thao tác | Mô tả |
|----------|-------|
| **Tăng/Giảm số lượng** | Click +/- , cập nhật localStorage, tính lại tổng |
| **Xóa sản phẩm** | Click icon xóa, cập nhật localStorage, re-render |
| **Áp dụng mã giảm giá** | Nhập code → gọi API validate → cập nhật tổng |
| **Thanh toán** | Kiểm tra đăng nhập → kiểm tra giỏ hàng → tạo đơn hàng |

---

## 11. Trang Admin

### 11.1 Cách bảo vệ trang Admin

Mỗi trang admin đều gọi `TamTaiAdmin.verifyAccess()` ngay khi tải:

```javascript
TamTaiAdmin.verifyAccess = function() {
    // 1. Kiểm tra localStorage có role = "admin" và có token không
    // 2. Nếu không → redirect về login
    // 3. Nếu có → gọi API GET /admin/me để xác thực token còn hiệu lực
    // 4. Nếu 401/403 → clear session → redirect login
};
```

### 11.2 Bố cục Admin

- **Sidebar:** Menu điều hướng (Dashboard, Sản phẩm, Đơn hàng, Khách hàng, Mã giảm giá)
- **Main Content:** Nội dung chính của từng trang
- **Top Bar:** Tên trang, nút đăng xuất

### 11.3 Các chức năng Admin

| Trang | Chức năng chính |
|-------|-----------------|
| **Dashboard** | Thống kê, đơn hàng gần đây, cảnh báo tồn kho, top sản phẩm |
| **Products** | CRUD sản phẩm, lọc danh mục, sắp xếp bảng |
| **Orders** | Xem tất cả đơn, cập nhật trạng thái inline |
| **Customers** | Xem/sửa thông tin khách hàng, khóa/mở khóa |
| **Discounts** | CRUD mã giảm giá, bật/tắt, xóa |

---

## 12. Các luồng dữ liệu chính

### 12.1 Luồng Mua hàng hoàn chỉnh

```
Trang chủ → Xem sản phẩm → Chi tiết sản phẩm → Thêm vào giỏ
                                                   │
                                                   ▼
                                              Giỏ hàng
                                                   │
                                                   ▼
                              ┌──────────── Có tài khoản? ────────────┐
                              │                                        │
                              ▼                                        ▼
                          Thanh toán                            Đăng nhập / Đăng ký
                              │                                        │
                              ▼                                        │
                    Nhập thông tin giao hàng ◄─────────────────────────┘
                    Chọn phương thức VC + TT
                    Áp dụng mã giảm giá
                              │
                              ▼
                     Xác nhận thanh toán
                     POST /orders/
                              │
                              ▼
                  Thành công → Chi tiết đơn hàng
                  Xóa giỏ hàng
```

### 12.2 Luồng Xác thực

```
Mở trang bất kỳ
  → JS kiểm tra localStorage có token không?
  ├── Có → Hiển thị giao diện đã đăng nhập
  │         → Admin menu hiện ra (nếu là admin)
  │         → Ẩn nút "Đăng ký ngay"
  └── Không → Hiển thị giao diện khách
              → Nút "Đăng nhập" / "Đăng ký" hiện ra
```

### 12.3 Pattern fetch dữ liệu chung

```
DOMContentLoaded
  → Gọi API (fetch/then hoặc async/await)
  → Parse dữ liệu
  → Render HTML vào DOM
  → Bind sự kiện (click, change, input...)
```

---

## 13. Bảo vệ trang & Kiểm soát truy cập

Vì là MPA (không có SPA router), không có "route guard" theo nghĩa truyền thống. Tuy nhiên, có các cơ chế bảo vệ sau:

### 13.1 Bảo vệ trang Admin
- Gọi `TamTaiAdmin.verifyAccess()` ở đầu mỗi trang admin
- Kiểm tra role === "admin" + token hợp lệ
- Nếu không → redirect về login

### 13.2 Bảo vệ API Admin
- `TamTaiAdmin.request()` tự động kiểm tra response 401/403
- Nếu lỗi → clear session + redirect login

### 13.3 Bảo vệ tính năng User
- Trước khi checkout, kiểm tra `TamTai.getRole()`
- Nếu là guest → redirect login với tham số `?redirect=`

### 13.4 Ẩn/Hiện UI theo role
- Phần tử có `data-guest-only="true"`: ẩn khi đã đăng nhập
- Link Admin: chỉ hiện khi role === "admin"

---

## 14. Tổng kết

### Điểm mạnh
1. **Đơn giản, dễ triển khai:** Chỉ cần HTTP server tĩnh (Live Server, Python http server, nginx)
2. **Không phụ thuộc:** Không cần npm install, không need build tools
3. **Tính năng đầy đủ:** Một e-commerce hoàn chỉnh với user, admin, giỏ hàng, thanh toán
4. **Cấu trúc rõ ràng:** Tổ chức theo domain (admin, auth, cart, products, user)
5. **Hiệu ứng mượt:** fly-to-cart animation, slider auto-rotate

### Điểm có thể cải thiện
1. **Không có build process:** Không minify, bundle, tree-shaking
2. **CSS thuần:** Lặp code, không có variables/utilities
3. **Full page reload:** Mỗi lần chuyển trang là load lại toàn bộ
4. **Không TypeScript:** Không kiểm tra kiểu dữ liệu
5. **State phân mảnh:** State rải rác khắp các module
6. **Không testing:** Không có unit test / e2e test
7. **Không refresh token:** Token hết hạn là mất phiên đăng nhập

---

*Báo cáo này được tạo từ mã nguồn thực tế của dự án Tam Tai E-Commerce Frontend.*
*Ngày tạo: 25/05/2026*
