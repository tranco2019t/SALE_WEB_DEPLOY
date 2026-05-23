# Hướng dẫn chạy dự án với Docker

Dự án đã được cấu hình Docker hóa toàn bộ (Full-stack Dockerization), bao gồm cơ sở dữ liệu Postgres, Backend API, Chatbot và Frontend (Nginx). Bạn chỉ cần khởi chạy Docker là toàn bộ hệ thống sẽ hoạt động đồng bộ.

---

## 🛠️ Yêu cầu hệ thống
* Đã cài đặt **Docker** và **Docker Compose (v2)**.

---

## ⚙️ Cấu hình biến môi trường (Environment Variables)

Trước khi khởi chạy dự án lần đầu, bạn cần tạo hoặc kiểm tra cấu hình biến môi trường của backend.

Hãy tạo tệp tin **`.env`** nằm trong thư mục **`backend/`** (đường dẫn: `backend/.env`) với nội dung mẫu bên dưới:

```env
# URL kết nối cơ sở dữ liệu (sử dụng trong môi trường local ngoài docker)
DATABASE_URL=postgresql://postgres:123456@localhost:5432/retail_db

# Khóa bí mật JWT bảo mật
SECRET_KEY='bZ#9vK!mQ2$pX7ZsR%1wY9@Lp6*tN4vC'

# Cấu hình Google Client ID cho đăng nhập Google OAuth
GOOGLE_CLIENT_ID=27435447565-fk6hsgmd17rqjuqegeqvq1monbo632gr.apps.googleusercontent.com

# Cấu hình gửi Mail OTP qua SMTP Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=dopdata23@gmail.com
SMTP_PASSWORD=ilnooewkdjnblvzu
SMTP_FROM_EMAIL=dopdata23@gmail.com
SMTP_USE_TLS=true

# Cấu hình tài khoản quản trị Admin mặc định
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123cls

# Cấu hình gửi mã OTP qua Email
EMAIL_OTP_TTL_MINUTES=10
EMAIL_OTP_MAX_ATTEMPTS=5
EMAIL_OTP_RESEND_COOLDOWN_SECONDS=60

# Khóa API để kết nối với dịch vụ AI Chatbot (OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-1d225bf814f140cdf3842ee9a7432354627831150e13be62ee4ff3036563
```

> [!NOTE]
> Khi chạy bằng Docker Compose, biến `DATABASE_URL` sẽ được tự động cấu hình lại trong file `docker-compose.yml` để trỏ tới dịch vụ Postgres trong mạng nội bộ Docker. Bạn không cần đổi thông số kết nối DB của `.env` khi chạy Docker.

---

## 🚀 Hướng dẫn khởi chạy dự án (How to Run)

Mở terminal tại thư mục root của dự án (`Sale_Web_Project`) và thực hiện các bước sau:

### 1. Khởi động tất cả dịch vụ
```bash
docker compose up --build -d
```
*Lệnh này sẽ xây dựng lại các Docker image (nếu có thay đổi) và khởi chạy toàn bộ hệ thống dưới dạng nền (`-d`).*

### 2. Kiểm tra log và trạng thái hoạt động
```bash
# Xem log của hệ thống
docker compose logs -f

# Kiểm tra trạng thái các container đang chạy
docker compose ps
```
Khi thấy trạng thái các dịch vụ `backend` và `chatbot` hiển thị là **(healthy)**, hệ thống đã sẵn sàng hoạt động.

### 3. Dừng và xóa cơ sở dữ liệu (khi cần làm sạch hệ thống)
```bash
docker compose down -v
```
*Lệnh này sẽ dừng các container và xóa các volume dữ liệu đi kèm.*

---

## 🌐 Các dịch vụ và cổng truy cập (Services & Ports)

Sau khi hệ thống khởi động thành công, bạn có thể truy cập qua trình duyệt:

| Dịch vụ | Địa chỉ truy cập | Mô tả |
| :--- | :--- | :--- |
| **Giao diện người dùng (Frontend)** | **[http://localhost:5500](http://localhost:5500)** | Tự động chuyển hướng đến trang chủ (`/html/core/landing.html`). |
| **Cổng API (Backend FastAPI)** | **[http://localhost:8000](http://localhost:8000)** | Phục vụ API và tài liệu OpenAPI (Swagger UI có tại `/docs`). |
| **Dịch vụ Chatbot** | **[http://localhost:8001/health](http://localhost:8001/health)** | Kiểm tra sức khỏe của chatbot standalone. |

---

## 🔑 Thông tin đăng nhập quản trị (Admin Credentials)

Sử dụng tài khoản sau để đăng nhập vào trang quản lý admin (`/html/admin/admin.html`):
* **Tên đăng nhập (Username/Email):** `admin` hoặc `admin@tamtai.vn`
* **Mật khẩu (Password):** `admin123cls`

---

## 🧪 Chạy Kiểm thử (Integration Tests)

Sau khi các dịch vụ đã sẵn sàng hoạt động, bạn có thể chạy bộ kiểm thử tích hợp tự động bằng lệnh:

```bash
docker compose run --rm tests
```
*Hệ thống sẽ tự động khởi chạy và thực thi bộ kiểm thử `pytest` trong thư mục `tests/`.*
docker compose exec db psql -U postgres -d saleweb



http://127.0.0.1:5500/html/products/products.html