# DB Check Commands

Tài liệu này gom các lệnh để kiểm tra dữ liệu của web trong database Postgres khi project đang chạy bằng Docker.

Database hiện tại của project:

- Container DB: `sale_web_project-db-1`
- Database name: `saleweb`
- Username: `postgres`
- Password: `postgres`

## 1. Cách vào DB trong Docker Desktop

Mở Docker Desktop:

1. Vào `Containers`
2. Chọn container `sale_web_project-db-1`
3. Chọn tab `Exec`
4. Chạy lệnh:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d saleweb
```

Sau khi vào `psql`:

- Gõ từng lệnh một rồi nhấn Enter
- Lệnh SQL phải kết thúc bằng `;`
- Lệnh `psql` như `\dt`, `\d customers`, `\q` thì không cần `;`
- Nếu lỡ gõ sai và bị kẹt prompt kiểu `saleweb-#` thì bấm `Ctrl+C`
- Các cột trong DB dùng tên kiểu CamelCase, nên khi chỉ định cột phải dùng dấu `"` như `"CustomerEmail"`

## 2. Lệnh cơ bản

```sql
\conninfo
\dt
\d customers
\d products
\d orders
\d orderitems
\d reviews
\d categories
\d addresses
\d notifications
\d wishlists
\d discountcodes
\d paymentmethods
\q
```

## 3. Thống kê nhanh toàn bộ dữ liệu

```sql
SELECT
  (SELECT COUNT(*) FROM categories) AS categories_count,
  (SELECT COUNT(*) FROM products) AS products_count,
  (SELECT COUNT(*) FROM customers) AS customers_count,
  (SELECT COUNT(*) FROM orders) AS orders_count,
  (SELECT COUNT(*) FROM orderitems) AS orderitems_count,
  (SELECT COUNT(*) FROM reviews) AS reviews_count,
  (SELECT COUNT(*) FROM wishlists) AS wishlists_count,
  (SELECT COUNT(*) FROM addresses) AS addresses_count,
  (SELECT COUNT(*) FROM notifications) AS notifications_count,
  (SELECT COUNT(*) FROM discountcodes) AS discountcodes_count,
  (SELECT COUNT(*) FROM paymentmethods) AS paymentmethods_count;
```

## 4. Xem dữ liệu từng bảng

### 4.1 Categories

```sql
SELECT COUNT(*) FROM categories;
SELECT * FROM categories LIMIT 20;
SELECT * FROM categories ORDER BY "CategoryName";
```

### 4.2 Products

```sql
SELECT COUNT(*) FROM products;
SELECT * FROM products LIMIT 20;

SELECT
  "ProductID",
  "ProductName",
  "UnitPrice",
  "DiscountPercent",
  "StockQuantity",
  "RatingAvg",
  "TotalReviews"
FROM products
ORDER BY "ProductName"
LIMIT 50;
```

### 4.3 Customers

```sql
SELECT COUNT(*) FROM customers;
SELECT * FROM customers LIMIT 20;

SELECT
  "CustomerID",
  "CustomerName",
  "CustomerEmail",
  "PhoneNumber",
  "Address",
  "CreatedAt",
  "UpdatedAt",
  "IsActive"
FROM customers
ORDER BY "CreatedAt" DESC NULLS LAST
LIMIT 50;
```

### 4.4 Orders

```sql
SELECT COUNT(*) FROM orders;
SELECT * FROM orders LIMIT 20;

SELECT
  "OrderID",
  "CustomerID",
  "PaymentMethodID",
  "OrderDate",
  "Status",
  "ShippingAddress",
  "ShippingFee",
  "DiscountAmount"
FROM orders
ORDER BY "OrderDate" DESC NULLS LAST
LIMIT 50;
```

### 4.5 Order Items

```sql
SELECT COUNT(*) FROM orderitems;
SELECT * FROM orderitems LIMIT 20;

SELECT
  "OrderItemID",
  "OrderID",
  "ProductID",
  "Quantity",
  "Amount",
  "PriceAtPurchase",
  "Profit",
  "Discount"
FROM orderitems
LIMIT 50;
```

### 4.6 Reviews

```sql
SELECT COUNT(*) FROM reviews;
SELECT * FROM reviews LIMIT 20;

SELECT
  "ReviewID",
  "ProductID",
  "CustomerID",
  "Rating",
  "Comment",
  "ImageUrls",
  "CreatedAt"
FROM reviews
ORDER BY "CreatedAt" DESC NULLS LAST
LIMIT 50;
```

### 4.7 Wishlists

```sql
SELECT COUNT(*) FROM wishlists;
SELECT * FROM wishlists LIMIT 20;
```

### 4.8 Addresses

```sql
SELECT COUNT(*) FROM addresses;
SELECT * FROM addresses LIMIT 20;
```

### 4.9 Notifications

```sql
SELECT COUNT(*) FROM notifications;
SELECT * FROM notifications LIMIT 20;
```

### 4.10 Discount Codes

```sql
SELECT COUNT(*) FROM discountcodes;
SELECT * FROM discountcodes LIMIT 20;
```

### 4.11 Payment Methods

```sql
SELECT COUNT(*) FROM paymentmethods;
SELECT * FROM paymentmethods LIMIT 20;
```

## 5. Tìm user

Lưu ý: trong project này "user" nằm ở bảng `customers`, không phải bảng `users`.

### 5.1 Xem tất cả user

```sql
SELECT
  "CustomerID",
  "CustomerName",
  "CustomerEmail",
  "PhoneNumber",
  "Address",
  "IsActive"
FROM customers
ORDER BY "CustomerName";
```

### 5.2 Tìm user theo tên

```sql
SELECT *
FROM customers
WHERE "CustomerName" ILIKE '%tam%';
```

### 5.3 Tìm user theo email

```sql
SELECT *
FROM customers
WHERE "CustomerEmail" ILIKE '%gmail.com%';
```

### 5.4 Tìm user theo số điện thoại

```sql
SELECT *
FROM customers
WHERE "PhoneNumber" ILIKE '%098%';
```

### 5.5 Xem user đang active hay bị khóa

```sql
SELECT
  "CustomerID",
  "CustomerName",
  "CustomerEmail",
  "IsActive"
FROM customers
ORDER BY "IsActive" DESC, "CustomerName";
```

## 6. Tìm sản phẩm

### 6.1 Tìm theo tên

```sql
SELECT
  "ProductID",
  "ProductName",
  "UnitPrice",
  "StockQuantity"
FROM products
WHERE "ProductName" ILIKE '%iphone%'
ORDER BY "ProductName";
```

### 6.2 Xem sản phẩm sắp hết hàng

```sql
SELECT
  "ProductID",
  "ProductName",
  "StockQuantity"
FROM products
WHERE "StockQuantity" <= 5
ORDER BY "StockQuantity", "ProductName";
```

### 6.3 Xem sản phẩm được review nhiều

```sql
SELECT
  "ProductID",
  "ProductName",
  "RatingAvg",
  "TotalReviews"
FROM products
ORDER BY "TotalReviews" DESC, "RatingAvg" DESC
LIMIT 20;
```

### 6.4 Xem sản phẩm theo category

```sql
SELECT
  p."ProductID",
  p."ProductName",
  p."UnitPrice",
  p."StockQuantity",
  c."CategoryName"
FROM products p
JOIN categories c ON p."Category" = c."CategoryID"
ORDER BY c."CategoryName", p."ProductName";
```

## 7. Tìm đơn hàng

### 7.1 Xem tất cả đơn hàng mới nhất

```sql
SELECT
  "OrderID",
  "CustomerID",
  "OrderDate",
  "Status",
  "ShippingFee",
  "DiscountAmount"
FROM orders
ORDER BY "OrderDate" DESC NULLS LAST
LIMIT 50;
```

### 7.2 Tìm đơn theo trạng thái

```sql
SELECT *
FROM orders
WHERE "Status" ILIKE '%pending%'
ORDER BY "OrderDate" DESC NULLS LAST;
```

### 7.3 Đếm số đơn theo trạng thái

```sql
SELECT
  "Status",
  COUNT(*) AS total_orders
FROM orders
GROUP BY "Status"
ORDER BY total_orders DESC;
```

### 7.4 Tìm đơn của một user

```sql
SELECT
  o."OrderID",
  o."OrderDate",
  o."Status",
  o."ShippingFee",
  o."DiscountAmount",
  c."CustomerName",
  c."CustomerEmail"
FROM orders o
JOIN customers c ON o."CustomerID" = c."CustomerID"
WHERE c."CustomerEmail" ILIKE '%gmail.com%'
ORDER BY o."OrderDate" DESC NULLS LAST;
```

### 7.5 Xem chi tiết sản phẩm trong đơn

```sql
SELECT
  oi."OrderID",
  oi."ProductID",
  p."ProductName",
  oi."Quantity",
  oi."PriceAtPurchase",
  oi."Amount",
  oi."Discount"
FROM orderitems oi
JOIN products p ON oi."ProductID" = p."ProductID"
WHERE oi."OrderID" = 'ORDER_ID_HERE';
```

### 7.6 Tính tổng tiền từng đơn

```sql
SELECT
  o."OrderID",
  c."CustomerName",
  COALESCE(SUM(oi."Amount"), 0) AS items_total,
  o."ShippingFee",
  o."DiscountAmount",
  COALESCE(SUM(oi."Amount"), 0) + o."ShippingFee" - o."DiscountAmount" AS final_total
FROM orders o
JOIN customers c ON o."CustomerID" = c."CustomerID"
LEFT JOIN orderitems oi ON o."OrderID" = oi."OrderID"
GROUP BY o."OrderID", c."CustomerName", o."ShippingFee", o."DiscountAmount"
ORDER BY o."OrderDate" DESC NULLS LAST;
```

## 8. Tìm review

### 8.1 Xem review mới nhất

```sql
SELECT
  r."ReviewID",
  p."ProductName",
  c."CustomerName",
  r."Rating",
  r."Comment",
  r."ImageUrls",
  r."CreatedAt"
FROM reviews r
JOIN products p ON r."ProductID" = p."ProductID"
JOIN customers c ON r."CustomerID" = c."CustomerID"
ORDER BY r."CreatedAt" DESC NULLS LAST
LIMIT 50;
```

### 8.2 Tìm review theo sản phẩm

```sql
SELECT
  r."ReviewID",
  c."CustomerName",
  r."Rating",
  r."Comment",
  r."CreatedAt"
FROM reviews r
JOIN customers c ON r."CustomerID" = c."CustomerID"
WHERE r."ProductID" = 'PRODUCT_ID_HERE'
ORDER BY r."CreatedAt" DESC NULLS LAST;
```

### 8.3 Tìm review của một user

```sql
SELECT
  r."ReviewID",
  p."ProductName",
  r."Rating",
  r."Comment",
  r."CreatedAt"
FROM reviews r
JOIN products p ON r."ProductID" = p."ProductID"
JOIN customers c ON r."CustomerID" = c."CustomerID"
WHERE c."CustomerEmail" ILIKE '%gmail.com%'
ORDER BY r."CreatedAt" DESC NULLS LAST;
```

## 9. Tìm wishlist

```sql
SELECT
  w."WishlistID",
  c."CustomerName",
  c."CustomerEmail",
  p."ProductName",
  p."UnitPrice"
FROM wishlists w
JOIN customers c ON w."CustomerID" = c."CustomerID"
JOIN products p ON w."ProductID" = p."ProductID"
ORDER BY c."CustomerName", p."ProductName";
```

### 9.1 Wishlist của một user

```sql
SELECT
  w."WishlistID",
  p."ProductID",
  p."ProductName",
  p."UnitPrice",
  p."StockQuantity"
FROM wishlists w
JOIN products p ON w."ProductID" = p."ProductID"
JOIN customers c ON w."CustomerID" = c."CustomerID"
WHERE c."CustomerEmail" ILIKE '%gmail.com%'
ORDER BY p."ProductName";
```

## 10. Tìm địa chỉ giao hàng

```sql
SELECT
  a."AddressID",
  c."CustomerName",
  c."CustomerEmail",
  a."Street",
  a."City",
  a."District",
  a."Zipcode",
  a."IsDefault"
FROM addresses a
JOIN customers c ON a."CustomerID" = c."CustomerID"
ORDER BY c."CustomerName", a."IsDefault" DESC;
```

## 11. Tìm thông báo

### 11.1 Xem tất cả thông báo

```sql
SELECT
  n."NotificationID",
  c."CustomerName",
  n."Title",
  n."Message",
  n."Type",
  n."ReferenceID",
  n."IsRead",
  n."CreatedAt"
FROM notifications n
JOIN customers c ON n."CustomerID" = c."CustomerID"
ORDER BY n."CreatedAt" DESC NULLS LAST
LIMIT 50;
```

### 11.2 Xem thông báo chưa đọc

```sql
SELECT
  n."NotificationID",
  c."CustomerName",
  n."Title",
  n."Type",
  n."CreatedAt"
FROM notifications n
JOIN customers c ON n."CustomerID" = c."CustomerID"
WHERE n."IsRead" = false
ORDER BY n."CreatedAt" DESC NULLS LAST;
```

## 12. Tìm mã giảm giá

### 12.1 Xem tất cả mã giảm giá

```sql
SELECT
  d."DiscountCodeID",
  d."Code",
  d."Description",
  d."DiscountPercent",
  d."ProductID",
  d."CustomerID",
  d."UsageLimit",
  d."UsedCount",
  d."StartsAt",
  d."ExpiresAt",
  d."IsActive"
FROM discountcodes d
ORDER BY d."CreatedAt" DESC NULLS LAST;
```

### 12.2 Xem mã giảm giá còn active

```sql
SELECT
  "DiscountCodeID",
  "Code",
  "DiscountPercent",
  "UsageLimit",
  "UsedCount",
  "StartsAt",
  "ExpiresAt"
FROM discountcodes
WHERE "IsActive" = true
ORDER BY "CreatedAt" DESC NULLS LAST;
```

### 12.3 Xem mã giảm giá gán cho user nào

```sql
SELECT
  d."Code",
  d."DiscountPercent",
  c."CustomerName",
  c."CustomerEmail"
FROM discountcodes d
LEFT JOIN customers c ON d."CustomerID" = c."CustomerID"
ORDER BY d."Code";
```

## 13. Tìm phương thức thanh toán

```sql
SELECT *
FROM paymentmethods
ORDER BY "ModeName";
```

## 14. Các câu join tổng hợp hay dùng

### 14.1 Đơn hàng + user + phương thức thanh toán

```sql
SELECT
  o."OrderID",
  o."OrderDate",
  o."Status",
  c."CustomerName",
  c."CustomerEmail",
  p."ModeName" AS payment_method
FROM orders o
JOIN customers c ON o."CustomerID" = c."CustomerID"
JOIN paymentmethods p ON o."PaymentMethodID" = p."PaymentMethodID"
ORDER BY o."OrderDate" DESC NULLS LAST
LIMIT 100;
```

### 14.2 Product + category

```sql
SELECT
  p."ProductID",
  p."ProductName",
  c."CategoryName",
  c."Subcategory",
  p."UnitPrice",
  p."StockQuantity",
  p."RatingAvg",
  p."TotalReviews"
FROM products p
JOIN categories c ON p."Category" = c."CategoryID"
ORDER BY c."CategoryName", p."ProductName";
```

### 14.3 Review + customer + product

```sql
SELECT
  r."ReviewID",
  c."CustomerName",
  c."CustomerEmail",
  p."ProductName",
  r."Rating",
  r."Comment",
  r."CreatedAt"
FROM reviews r
JOIN customers c ON r."CustomerID" = c."CustomerID"
JOIN products p ON r."ProductID" = p."ProductID"
ORDER BY r."CreatedAt" DESC NULLS LAST;
```

### 14.4 User + số đơn + số review + số wishlist

```sql
SELECT
  c."CustomerID",
  c."CustomerName",
  c."CustomerEmail",
  COUNT(DISTINCT o."OrderID") AS total_orders,
  COUNT(DISTINCT r."ReviewID") AS total_reviews,
  COUNT(DISTINCT w."WishlistID") AS total_wishlist_items
FROM customers c
LEFT JOIN orders o ON c."CustomerID" = o."CustomerID"
LEFT JOIN reviews r ON c."CustomerID" = r."CustomerID"
LEFT JOIN wishlists w ON c."CustomerID" = w."CustomerID"
GROUP BY c."CustomerID", c."CustomerName", c."CustomerEmail"
ORDER BY total_orders DESC, total_reviews DESC;
```

## 15. Kiểm tra chất lượng dữ liệu

### 15.1 User không có email

```sql
SELECT *
FROM customers
WHERE "CustomerEmail" IS NULL OR TRIM("CustomerEmail") = '';
```

### 15.2 Product không có tên

```sql
SELECT *
FROM products
WHERE "ProductName" IS NULL OR TRIM("ProductName") = '';
```

### 15.3 Order không có item

```sql
SELECT o.*
FROM orders o
LEFT JOIN orderitems oi ON o."OrderID" = oi."OrderID"
WHERE oi."OrderID" IS NULL;
```

### 15.4 Review không có comment

```sql
SELECT *
FROM reviews
WHERE "Comment" IS NULL OR TRIM("Comment") = '';
```

## 16. Gợi ý kiểm tra nhanh theo tình huống

### Muốn tìm user

```sql
SELECT *
FROM customers
WHERE "CustomerName" ILIKE '%tam%'
   OR "CustomerEmail" ILIKE '%tam%'
   OR "PhoneNumber" ILIKE '%tam%';
```

### Muốn tìm sản phẩm

```sql
SELECT *
FROM products
WHERE "ProductName" ILIKE '%laptop%';
```

### Muốn tìm đơn theo mã đơn

```sql
SELECT *
FROM orders
WHERE "OrderID" = 'ORDER_ID_HERE';
```

### Muốn tìm review của một sản phẩm

```sql
SELECT *
FROM reviews
WHERE "ProductID" = 'PRODUCT_ID_HERE';
```

### Muốn tìm wishlist của một user

```sql
SELECT *
FROM wishlists
WHERE "CustomerID" = 'CUSTOMER_ID_HERE';
```

## 17. Lưu ý quan trọng

- Bảng user của dự án là `customers`
- Không có bảng `users`
- Tài khoản admin hiện tại đang cấu hình bằng biến môi trường, không nằm trong bảng DB riêng
- Nếu chỉ muốn xem nhanh dữ liệu, ưu tiên `SELECT * FROM ten_bang LIMIT 20;`
- Nếu cần biết chính xác cột nào đang có trong bảng, dùng `\d ten_bang`

