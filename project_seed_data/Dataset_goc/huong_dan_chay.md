# Hướng Dẫn Chạy Dự Án E-Commerce

## 📋 Yêu Cầu Tiên Quyết
- Python 3.8+ 
- PostgreSQL (hoặc SQLite cho testing)
- Node.js 14+ (tùy chọn, nếu dùng build tools)

---

## 🔧 PHẦN 1: SETUP BACKEND

### Bước 1: Chuẩn Bị Database & Môi Trường

1. **Tạo file `.env` trong thư mục `backend/`:**
```
DATABASE_URL=postgresql://username:password@localhost:5432/sale_web_db
SECRET_KEY=your-secret-key-here-change-this
GOOGLE_CLIENT_ID=your-google-client-id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_USE_TLS=true
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

2. **Tạo database PostgreSQL:**
```sql
CREATE DATABASE sale_web_db;
```

*Hoặc sử dụng SQLite (default nếu DATABASE_URL không tìm thấy):*
```
DATABASE_URL=sqlite:///./sale_web.db
```

### Bước 2: Cài Đặt Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Bước 3: Chạy Migrations (Tạo Schema Database)

```bash
cd backend
alembic upgrade head
```

### Bước 4: Seed Dữ Liệu (Tùy Chọn)

```bash
cd backend/scripts
python sync_seed_catalog.py
```

### Bước 5: Chạy Backend Server

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend chạy tại: **http://localhost:8000**  
📚 API Documentation: **http://localhost:8000/docs**

---

## 🎨 PHẦN 2: CHẠY FRONTEND

### Tùy Chọn A: Dùng Live Server (Đơn Giản Nhất)

1. Mở VS Code
2. Chuỗi cổng frontend: `frontend/html/`
3. **Cài extension**: "Live Server" (by Ritwick Dey)
4. **Click**: "Go Live" ở thanh status bar
5. Browser mở tại: **http://127.0.0.1:5500**

### Tùy Chọn B: Dùng Python HTTP Server

```bash
cd frontend
python -m http.server 5500
```

Truy cập: **http://localhost:5500/html/**

### Tùy Chọn C: Dùng Node.js HTTP Server

```bash
npm install -g http-server
cd frontend
http-server -p 5500
```

---

## ✅ KIỂM TRA KẾT NỐI

1. **Backend chạy**: http://localhost:8000/docs
2. **Frontend chạy**: http://127.0.0.1:5500/html/
3. **Test API**:
   - Mở http://localhost:8000/docs
   - Test endpoint: `POST /customers/login`
   - Hoặc dùng curl:
   ```bash
   curl -X POST "http://localhost:8000/customers/login" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

---

## 📝 CÁC CHỨC NĂNG CHÍNH

### Backend Endpoints
- **Khách hàng**: `/customers` (register, login, profile)
- **Sản phẩm**: `/products` (list, detail)
- **Danh mục**: `/categories`
- **Đơn hàng**: `/orders` (create, list, detail)
- **Địa chỉ**: `/addresses`
- **Đánh giá**: `/reviews`
- **Admin**: `/admin` (login, manage products/orders)
- **Chatbot**: `/chatbot` (integration)

### Frontend Pages
- `/html/auth/login.html` - Đăng nhập
- `/html/auth/register.html` - Đăng ký
- `/html/products/products.html` - Danh sách sản phẩm
- `/html/products/product-detail.html` - Chi tiết sản phẩm
- `/html/cart/cart.html` - Giỏ hàng
- `/html/order/order.html` - Quản lý đơn hàng
- `/html/user/profile.html` - Hồ sơ người dùng
- `/html/admin/dashboard.html` - Admin dashboard

---

## 🛑 GỠI RỐI THƯỜNG GẶP

| Lỗi | Giải Pháp |
|-----|----------|
| `ModuleNotFoundError` | Chạy `pip install -r requirements.txt` |
| `DATABASE_URL not found` | Tạo file `.env` trong `backend/` |
| `CORS error` | Backend đã cấu hình CORS cho port 5500 |
| Frontend không load được | Kiểm tra path các file JS/CSS trong HTML |
| Chatbot không hoạt động | Cài `google-genai` trong backend requirements |

---

## 🚀 CHẠY TOÀN BỘ (Terminal Riêng Biệt)

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
python -m http.server 5500
```

**Terminal 3 - Chatbot (Tùy Chọn):**
```bash
cd "CHAT BOT/backend"
python run_standalone_chatbot.py
```

---

## 📚 TÀI LIỆU THÊM
- Backend API Plan: [FRONTEND_BACKEND_PLAN.md](frontend/FRONTEND_BACKEND_PLAN.md)
- Frontend Setup: [Các bước làm frontend/](./Các%20bước%20làm%20frontend/)
- Seed Data: `project_seed_data/Dataset_goc/`

**Bắt đầu nào! 🎉**






# PostgreSQL Client Authentication Configuration File
# ===================================================
#
# Refer to the "Client Authentication" section in the PostgreSQL
# documentation for a complete description of this file.  A short
# synopsis follows.
#
# ----------------------
# Authentication Records
# ----------------------
#
# This file controls: which hosts are allowed to connect, how clients
# are authenticated, which PostgreSQL user names they can use, which
# databases they can access.  Records take one of these forms:
#
# local         DATABASE  USER  METHOD  [OPTIONS]
# host          DATABASE  USER  ADDRESS  METHOD  [OPTIONS]
# hostssl       DATABASE  USER  ADDRESS  METHOD  [OPTIONS]
# hostnossl     DATABASE  USER  ADDRESS  METHOD  [OPTIONS]
# hostgssenc    DATABASE  USER  ADDRESS  METHOD  [OPTIONS]
# hostnogssenc  DATABASE  USER  ADDRESS  METHOD  [OPTIONS]
#
# (The uppercase items must be replaced by actual values.)
#
# The first field is the connection type:
# - "local" is a Unix-domain socket
# - "host" is a TCP/IP socket (encrypted or not)
# - "hostssl" is a TCP/IP socket that is SSL-encrypted
# - "hostnossl" is a TCP/IP socket that is not SSL-encrypted
# - "hostgssenc" is a TCP/IP socket that is GSSAPI-encrypted
# - "hostnogssenc" is a TCP/IP socket that is not GSSAPI-encrypted
#
# DATABASE can be "all", "sameuser", "samerole", "replication", a
# database name, a regular expression (if it starts with a slash (/))
# or a comma-separated list thereof.  The "all" keyword does not match
# "replication".  Access to replication must be enabled in a separate
# record (see example below).
#
# USER can be "all", a user name, a group name prefixed with "+", a
# regular expression (if it starts with a slash (/)) or a comma-separated
# list thereof.  In both the DATABASE and USER fields you can also write
# a file name prefixed with "@" to include names from a separate file.
#
# ADDRESS specifies the set of hosts the record matches.  It can be a
# host name, or it is made up of an IP address and a CIDR mask that is
# an integer (between 0 and 32 (IPv4) or 128 (IPv6) inclusive) that
# specifies the number of significant bits in the mask.  A host name
# that starts with a dot (.) matches a suffix of the actual host name.
# Alternatively, you can write an IP address and netmask in separate
# columns to specify the set of hosts.  Instead of a CIDR-address, you
# can write "samehost" to match any of the server's own IP addresses,
# or "samenet" to match any address in any subnet that the server is
# directly connected to.
#
# METHOD can be "trust", "reject", "md5", "password", "scram-sha-256",
# "gss", "sspi", "ident", "peer", "pam", "ldap", "radius" or "cert".
# Note that "password" sends passwords in clear text; "md5" or
# "scram-sha-256" are preferred since they send encrypted passwords.
#
# OPTIONS are a set of options for the authentication in the format
# NAME=VALUE.  The available options depend on the different
# authentication methods -- refer to the "Client Authentication"
# section in the documentation for a list of which options are
# available for which authentication methods.
#
# Database and user names containing spaces, commas, quotes and other
# special characters must be quoted.  Quoting one of the keywords
# "all", "sameuser", "samerole" or "replication" makes the name lose
# its special character, and just match a database or username with
# that name.
#
# ---------------
# Include Records
# ---------------
#
# This file allows the inclusion of external files or directories holding
# more records, using the following keywords:
#
# include           FILE
# include_if_exists FILE
# include_dir       DIRECTORY
#
# FILE is the file name to include, and DIR is the directory name containing
# the file(s) to include.  Any file in a directory will be loaded if suffixed
# with ".conf".  The files of a directory are ordered by name.
# include_if_exists ignores missing files.  FILE and DIRECTORY can be
# specified as a relative or an absolute path, and can be double-quoted if
# they contain spaces.
#
# -------------
# Miscellaneous
# -------------
#
# This file is read on server startup and when the server receives a
# SIGHUP signal.  If you edit the file on a running system, you have to
# SIGHUP the server for the changes to take effect, run "pg_ctl reload",
# or execute "SELECT pg_reload_conf()".
#
# ----------------------------------
# Put your actual configuration here
# ----------------------------------
#
# If you want to allow non-local connections, you need to add more
# "host" records.  In that case you will also need to make PostgreSQL
# listen on a non-local interface via the listen_addresses
# configuration parameter, or via the -i or -h command line switches.



# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     scram-sha-256
# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256
# IPv6 local connections:
host    all             all             ::1/128                 scram-sha-256
# Allow replication connections from localhost, by a user with the
# replication privilege.
local   replication     all                                     scram-sha-256
host    replication     all             127.0.0.1/32            scram-sha-256
host    replication     all             ::1/128                 scram-sha-256

