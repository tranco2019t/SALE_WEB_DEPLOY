# SLIDE 1 — TIÊU ĐỀ ĐỀ TÀI

## XÂY DỰNG WEBSITE BÁN HÀNG CÔNG NGHỆ TÍCH HỢP AI CHATBOT TƯ VẤN TRỰC TUYẾN
### Đồ án tốt nghiệp / Đồ án môn học: Phát triển ứng dụng Web

* **Giảng viên hướng dẫn:** [Tên Giảng Viên]
* **Nhóm thực hiện:** [Tên Nhóm / Nhóm số ...]
* **Thành viên nhóm:**
  * **Sinh viên A (MSSV: ...):** Phụ trách lập trình giao diện Frontend & Tối ưu hóa UX/UI.
  * **Sinh viên B (MSSV: ...):** Phụ trách phát triển API Backend & Phân quyền ứng dụng.
  * **Sinh viên C (MSSV: ...):** Phụ trách Thiết kế CSDL PostgreSQL, alembic migrations & cấu hình Docker.
  * **Sinh viên D (MSSV: ...):** Phụ trách Tích hợp AI Chatbot qua OpenRouter & Viết bộ kịch bản kiểm thử (tests).

---

### 🎨 LAYOUT & HÌNH ẢNH MINH HỌA ĐỀ XUẤT:
* **Background:** Tông màu tối hiện đại (Dark Mode) với hiệu ứng chuyển màu gradient xanh dương - tím neon công nghệ (Cyberpunk/Futuristic style).
* **Hình ảnh trung tâm:** Logo dự án hoặc mô hình thiết kế tối giản thể hiện sự kết hợp giữa **E-Commerce (Giỏ hàng)** và **Artificial Intelligence (Trí tuệ nhân tạo)**.

### 🎤 LỜI THUYẾT TRÌNH CHI TIẾT (PRESENTER NOTES):
> *"Kính chào thầy cô và các bạn sinh viên đã đến với buổi báo cáo đồ án môn học Phát triển ứng dụng Web ngày hôm nay. Nhóm chúng em gồm 4 thành viên, đã cùng nhau nghiên cứu và xây dựng đề tài: 'Xây dựng website bán hàng công nghệ tích hợp AI Chatbot tư vấn trực tuyến'. Đề tài này được thực hiện dưới sự hướng dẫn khoa học của giảng viên [Tên Giảng Viên]. Sau đây, chúng em xin phép được bắt đầu phần trình bày của nhóm."*

---

# SLIDE 2 — GIỚI THIỆU BÀI TOÁN & THỰC TRẠNG

## 1. Bối cảnh thị trường
* Sự bùng nổ của thương mại điện tử (E-Commerce) mảng thiết bị công nghệ.
* Khách hàng ngày càng thiếu kiên nhẫn, yêu cầu tốc độ phản hồi thông tin cấu hình sản phẩm tức thì.

## 2. Thực trạng & Hạn chế của các hệ thống cũ
* **Chatbot thế hệ cũ (Rule-based):** 
  * Chỉ trả lời theo kịch bản soạn sẵn, cứng nhắc.
  * Không thể kiểm tra thời gian thực xem sản phẩm còn hay hết hàng, giá bán có đang được ưu đãi hay không.
  * Gây ức chế cho người dùng khi hỏi ngoài phạm vi kịch bản.
* **Quản trị viên (Admin):** 
  * Phải vận hành thủ công nhiều khâu, thiếu hệ thống dashboard trực quan để theo dõi biến động doanh thu và trạng thái đơn hàng nhanh chóng.

## 3. Giải pháp đề xuất
* Xây dựng hệ thống Website bán hàng công nghệ hoàn chỉnh từ Frontend đến Backend, tích hợp trực tiếp **AI Chatbot thế hệ mới** có khả năng tự động đọc cơ sở dữ liệu thật của cửa hàng để đưa ra câu trả lời tư vấn chính xác nhất.

---

### 🎨 LAYOUT & HÌNH ẢNH MINH HỌA ĐỀ XUẤT:
* **Layout:** Chia làm 2 cột: Cột bên trái chỉ ra 3 điểm nghẽn chính của chatbot cũ (icon dấu X đỏ). Cột bên phải đưa ra giải pháp mới tích hợp AI thông minh (icon dấu check xanh lá).
* **Hình ảnh:** Hình ảnh minh họa một khách hàng sử dụng điện thoại và nhận được thông báo lỗi từ một hệ thống chatbot cũ không hiểu ngữ cảnh.

### 🎤 LỜI THUYẾT TRÌNH CHI TIẾT (PRESENTER NOTES):
> *"Trong thực tế kinh doanh trực tuyến, mảng thiết bị công nghệ như điện thoại, laptop đòi hỏi sự tư vấn cấu hình rất chi tiết. Người mua thường phân vân giữa các thông số và tình trạng kho hàng thực tế trước khi bấm mua. Tuy nhiên, các hệ thống chatbot hiện nay phần lớn là chatbot dựa trên tập luật định sẵn. Khi khách hàng hỏi những câu phức tạp hoặc hỏi về lượng hàng còn trong kho, chatbot cũ hoàn toàn bất lực. Đó là lý do nhóm chúng em đề xuất giải pháp xây dựng một website bán hàng công nghệ toàn diện và tích hợp một chatbot AI có thể truy cập thẳng vào cơ sở dữ liệu thời gian thực để trả lời thông tin cho khách."*

---

# SLIDE 3 — MỤC TIÊU HỆ THỐNG & CÔNG NGHỆ LỰA CHỌN

## 1. Giao diện người dùng (Frontend)
* **Công nghệ:** HTML5, CSS3, JavaScript thuần (Vanilla JS).
* **Tiêu chí:** Tối ưu hóa hiệu năng, giảm dung lượng tải trang, giao diện mượt mà theo phong cách **Glassmorphism** sang trọng.

## 2. Hệ thống Máy chủ & API (Backend)
* **Công nghệ:** **FastAPI** (Python 3.11) + Uvicorn.
* **Tiêu chí:** Xử lý bất đồng bộ (Async/Await) đem lại tốc độ phản hồi cực nhanh, tự động tạo Swagger UI để kiểm thử API.

## 3. Cơ sở dữ liệu (Database)
* **Công nghệ:** **PostgreSQL** + SQLAlchemy ORM + Alembic Migrations.
* **Tiêu chí:** Đảm bảo toàn vẹn dữ liệu quan hệ, dễ dàng truy vấn phức tạp và quản lý phiên bản database đồng bộ.

## 4. Trí tuệ nhân tạo (AI Integration)
* **Công nghệ:** **OpenRouter API** (gọi mô hình Gemini 1.5 Flash) kết hợp **Kỹ thuật nạp Context thời gian thực**.

## 5. Đóng gói & Triển khai (DevOps)
* **Công nghệ:** **Docker & Docker Compose**.
* **Tiêu chí:** Chạy toàn bộ dự án (Database, Backend, Frontend, Chatbot) đồng bộ chỉ với 1 dòng lệnh.

---

### 🎨 LAYOUT & HÌNH ẢNH MINH HỌA ĐỀ XUẤT:
* **Layout:** Dạng lưới (Grid 5 cột) thể hiện rõ logo các công nghệ: HTML/CSS/JS, FastAPI, PostgreSQL, Docker, OpenRouter (Gemini).
* **Hình ảnh:** Sơ đồ liên kết công nghệ, biểu diễn các mũi tên tương tác giữa các thành phần từ Client tới các server Docker.

### 🎤 LỜI THUYẾT TRÌNH CHI TIẾT (PRESENTER NOTES):
> *"Để giải quyết bài toán trên một cách tối ưu, nhóm chúng em đã lựa chọn một hệ stack công nghệ hiện đại. Về Frontend, thay vì chọn các framework nặng nề, nhóm quyết định tối ưu hiệu năng bằng HTML/CSS và Vanilla JS. Về Backend, FastAPI được lựa chọn nhờ tốc độ xử lý vượt trội và khả năng tự sinh tài liệu API. Cơ sở dữ liệu chính của dự án là PostgreSQL. Chatbot standalone kết nối với mô hình Gemini thông qua OpenRouter API. Toàn bộ hệ thống này được đóng gói đồng bộ bằng các container Docker giúp việc triển khai trở nên cực kỳ đơn giản và nhất quán."*

---

# SLIDE 4 — SƠ ĐỒ CHỨC NĂNG & PHÂN QUYỀN (USE CASE)

```
                       ┌──────────────────────────────┐
                       │      SALE WEB PROJECT        │
                       └──────────────┬───────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│    GUEST ACTOR   │         │  CUSTOMER ACTOR  │         │    ADMIN ACTOR   │
├──────────────────┤         ├──────────────────┤         ├──────────────────┤
│ - Xem sản phẩm   │         │ - Đăng ký OTP    │         │ - Dashboard      │
│ - Lọc danh mục   │         │ - Google Login   │         │ - CRUD Sản phẩm  │
│ - Tìm kiếm       │         │ - Quản lý Giỏ    │         │ - Quản lý Đơn    │
│ - Đăng nhập      │         │ - Đặt hàng & Mã  │         │ - Cấu hình Mã KM │
│                  │         │ - Viết Review    │         │ - Xem System Logs│
│                  │         │ - Chat tư vấn AI │         │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

* **Cơ chế Bảo mật & Phân quyền:**
  * Khách hàng giao tiếp qua **Token JWT** được lưu ở LocalStorage.
  * Các API chỉnh sửa thông tin cá nhân và đặt hàng bắt buộc phải xác thực Token và kiểm tra chính chủ.
  * Trang Admin được bảo vệ bởi middleware bảo mật riêng, chỉ tài khoản quản trị mới có quyền truy cập các endpoints đặc quyền.

---

### 🎨 LAYOUT & HÌNH ẢNH MINH HỌA ĐỀ XUẤT:
* **Layout:** Biểu đồ cây phân rã chức năng (như sơ đồ khối ở trên) được thiết kế sạch sẽ, rõ ràng với các khối màu đại diện cho 3 nhóm đối tượng.
* **Hình ảnh:** Icon người dùng cho Guest/Customer và icon hình chiếc khiên bảo mật cho Admin.

### 🎤 LỜI THUYẾT TRÌNH CHI TIẾT (PRESENTER NOTES):
> *"Hệ thống của chúng em phân chia chức năng rõ ràng cho ba nhóm tác nhân. Guest có thể duyệt xem sản phẩm và tìm kiếm tự do. Khi nâng cấp lên tài khoản Customer (thông qua xác thực đăng ký OTP Email hoặc Google Login), người dùng sẽ được cấp token JWT để thực hiện các chức năng như quản lý địa chỉ, giỏ hàng, đánh giá sản phẩm và đặt mua. Cuối cùng, tác nhân Admin được cung cấp một hệ quản trị riêng biệt để theo dõi doanh thu, cập nhật trạng thái đơn hàng và kiểm soát toàn bộ cơ sở dữ liệu."*

---

# SLIDE 5 — KIẾN TRÚC VẬN HÀNH DOCKER & LUỒNG DỮ LIỆU

* **Sự đồng bộ của 4 Docker Containers:**
  * **sale_web_project-db-1 (PostgreSQL):** Lưu trữ toàn bộ dữ liệu hệ thống. Chỉ mở cổng kết nối nội bộ để tránh rò rỉ dữ liệu ra bên ngoài.
  * **sale_web_project-backend-1 (FastAPI):** API Server kết nối trực tiếp với DB. Lắng nghe tại port `8000`. Cung cấp dữ liệu cho cả frontend và chatbot.
  * **sale_web_project-frontend-1 (Nginx):** Máy chủ phục vụ giao diện tĩnh tại port `5500`. Chuyển tiếp các yêu cầu của người dùng về trang chủ thông qua tệp cấu hình Nginx riêng.
  * **sale_web_project-chatbot-1 (Chatbot standalone):** Lắng nghe ở port `8001`. Lấy dữ liệu từ Database, giao tiếp với OpenRouter LLM API để phản hồi khách hàng.

* **Luồng dữ liệu CORS an toàn:**
  * Backend API cấu hình chính xác chính sách CORS cho phép các nguồn truy cập an toàn từ cả IPv4 (`http://127.0.0.1:5500`), IPv6 loopback (`http://[::1]:5500`) và tên miền máy chủ cục bộ (`http://localhost:5500`).

---

### 🎨 LAYOUT & HÌNH ẢNH MINH HỌA ĐỀ XUẤT:
* **Layout:** Một sơ đồ khối động (Mermaid diagram/Architecture diagram) hiển thị mối liên kết giữa các container Docker.
* **Hình ảnh:** Hình ảnh bảng điều khiển Docker Desktop hiển thị 4 container đang chạy ở trạng thái màu xanh lá (Running/Healthy).

### 🎤 LỜI THUYẾT TRÌNH CHI TIẾT (PRESENTER NOTES):
> *"Để ứng dụng hoạt động ổn định và dễ cài đặt, nhóm chúng em đóng gói hệ thống dưới dạng Container hóa. Khi khởi chạy Docker Compose, 4 container sẽ tự động được tạo ra. Dịch vụ Frontend chạy bằng Nginx ở cổng 5500 sẽ tải mã nguồn HTML/JS xuống trình duyệt của khách hàng. Từ đó, trình duyệt gửi các request REST API đến Backend FastAPI ở cổng 8000. Dữ liệu được truy xuất trực tiếp từ DB Postgres nằm trong mạng nội bộ. Đồng thời, CORS Middleware được cấu hình chặt chẽ để chấp nhận yêu cầu từ cả địa chỉ IPv4 lẫn địa chỉ IPv6 loopback của máy chủ."*

---

# SLIDE 6 — KỊCH BẢN DEMO HỆ THỐNG THỰC TẾ

## Kịch bản Demo gồm 3 luồng chính:

### Luồng 1: Trải nghiệm mua sắm & Đặt hàng của Khách hàng
* Người dùng đăng ký tài khoản mới, nhận OTP từ Gmail để kích hoạt.
* Người dùng tìm kiếm từ khóa `"Tai nghe"`, hệ thống hiển thị danh sách sản phẩm.
* Thêm sản phẩm vào giỏ hàng. Tại trang checkout, người dùng nhập mã giảm giá `GIAM20` (giảm 20%), hệ thống tự trừ tiền và cập nhật tổng tiền thanh toán. Tiến hành bấm Đặt hàng.

### Luồng 2: Hỏi đáp tư vấn với AI Chatbot thông minh
* Khách hàng mở khung chat nổi và nhập: *"Shop có mẫu bàn phím nào dưới 500k còn hàng trong kho không?"*
* AI Chatbot phân tích, tự tìm kiếm trong DB các bàn phím thỏa mãn điều kiện giá < 500.000đ và `stock_quantity > 0` và trả về danh sách chi tiết kèm mô tả sinh động.

### Luồng 3: Quản trị cửa hàng từ phía Admin
* Đăng nhập tài khoản admin. Hệ thống hiển thị biểu đồ thống kê trực quan doanh thu tháng hiện tại.
* Quản lý đơn hàng: Tìm đơn hàng vừa tạo ở Luồng 1 và cập nhật trạng thái đơn hàng sang `Shipped` (Đang giao hàng).

---

### 🎨 LAYOUT & HÌNH ẢNH MINH HỌA ĐỀ XUẤT:
* **Layout:** Chia làm 3 phần dọc tương ứng với 3 luồng demo. Mỗi phần chứa các gạch đầu dòng ngắn gọn để người thuyết trình dễ theo dõi tiến trình demo trực tiếp.
* **Hình ảnh:** Ảnh chụp màn hình trang chủ thực tế của website, khung chat của chatbot AI đang trả lời danh sách sản phẩm thật, và biểu đồ thống kê doanh thu trong trang admin.

### 🎤 LỜI THUYẾT TRÌNH CHI TIẾT (PRESENTER NOTES):
> *"Sau đây, chúng em xin phép được trình diễn trực quan hệ thống qua 3 kịch bản thực tế. Đầu tiên, chúng em sẽ đóng vai khách hàng để thực hiện các thao tác mua sắm, áp dụng mã giảm giá và đặt hàng. Tiếp theo, chúng em sẽ thử thách Chatbot AI bằng cách hỏi về các sản phẩm cụ thể. Mọi người sẽ thấy AI trả lời rất thông minh nhờ dữ liệu thật trong kho. Cuối cùng, chúng em sẽ đăng nhập vào giao diện Admin để kiểm tra đơn hàng vừa đặt, chuyển trạng thái đơn hàng và theo dõi sự thay đổi trên biểu đồ thống kê doanh thu."*

---

# SLIDE 7 — TÍCH HỢP TRÍ TUỆ NHÂN TẠO & HỖ TRỢ PHÁT TRIỂN (AI)

## 1. Cơ chế hoạt động của AI Chatbot (RAG tối giản)
* Nhận câu hỏi khách hàng -> Trích xuất ý định (Intent) và thực thể (Entity).
* Thực hiện truy vấn SQL lấy dữ liệu trực tiếp từ Postgres.
* Nạp kết quả SQL vào Prompt ngữ cảnh gửi đến mô hình LLM thông qua OpenRouter API.
* Mô hình AI trả về câu trả lời tự nhiên dựa trên dữ liệu chuẩn xác, loại bỏ hoàn toàn lỗi "ảo tưởng thông tin".

## 2. Ứng dụng AI trong quá trình Lập trình và Giao tiếp
* Sử dụng AI để sinh nhanh cấu trúc Schema Pydantic và boilerplate FastAPI.
* **Giải quyết bài toán Debug thực tế:**
  * **Lỗi CORS IPv6 (`[::1]`):** Khi chạy docker, website truy cập qua `http://[::1]:5500` bị chặn API sản phẩm. AI đã phát hiện thiếu IP loopback IPv6 này trong backend `allow_origins` và hướng dẫn sửa đổi kịp thời.
  * **Lỗi validation tham số:** Frontend gọi `limit=500` trên trang chủ làm sập API sản phẩm do backend giới hạn tối đa `100` (`le=100`). AI đã chỉ ra sự bất tương thích này để nhóm điều chỉnh đồng bộ tham số ở frontend thành `100`.

---

### 🎨 LAYOUT & HÌNH ẢNH MINH HỌA ĐỀ XUẤT:
* **Layout:** Một sơ đồ thể hiện luồng xử lý của Chatbot: [Câu hỏi] -> [Truy vấn SQL DB] -> [Gộp Context + Prompt] -> [Mô hình LLM] -> [Câu trả lời].
* **Hình ảnh:** Ảnh chụp các đoạn code cấu hình CORS trong `main.py` và tham số giới hạn `le=100` trong `product_router.py`.

### 🎤 LỜI THUYẾT TRÌNH CHI TIẾT (PRESENTER NOTES):
> *"Điểm đặc sắc nhất của đồ án chính là sự kết hợp của Trí tuệ nhân tạo. Để chatbot AI có thể trả lời đúng cấu hình và số lượng tồn kho của thiết bị, chúng em đã áp dụng phương pháp nạp ngữ cảnh động từ database. Nhờ thế, chatbot luôn đưa ra thông số thực tế thay vì tự bịa ra thông tin. Ngoài ra, trong quá trình phát triển, các công cụ AI cũng đóng vai trò là một trợ lý lập trình đắc lực giúp nhóm nhanh chóng định vị các lỗi cấu hình mạng phức tạp như lỗi chặn CORS ở IPv6 và lỗi lệch tham số validation dữ liệu."*

---

# SLIDE 8 — KẾT LUẬN & HƯỚNG PHÁT TRIỂN DỰ ÁN

## 1. Kết quả đạt được
* Xây dựng thành công website thương mại điện tử công nghệ mượt mà, tối ưu hóa giao diện UX/UI tốt.
* Hệ thống backend FastAPI vận hành ổn định, bảo mật chặt chẽ bằng cơ chế JWT và phân quyền chi tiết.
* AI Chatbot hoạt động hoàn hảo, tư vấn thông tin sản phẩm chuẩn xác theo thời gian thực.
* Đóng gói Docker hoàn chỉnh, dễ cài đặt và bảo trì.

## 2. Hướng phát triển trong tương lai
* **Thanh toán trực tuyến:** Tích hợp các cổng thanh toán ví điện tử Momo, ZaloPay, hoặc VNPAY qua mã QR code động để thực hiện giao dịch thực tế.
* **Nâng cấp AI Chatbot:** Cải tiến Chatbot hỗ trợ tính năng tự tạo đơn hàng nháp (draft order) cho khách hàng ngay trong cuộc hội thoại chat.
* **Tối ưu SEO & CDN:** Áp dụng kỹ thuật tối ưu hóa công cụ tìm kiếm (SEO) cho từng sản phẩm và sử dụng CDN để lưu trữ hình ảnh sản phẩm giúp tăng tốc độ tải trang trên môi trường Internet.

---

### 🎨 LAYOUT & HÌNH ẢNH MINH HỌA ĐỀ XUẤT:
* **Layout:** Thiết kế tối giản, tập trung vào 4 ô vuông lớn tóm tắt 4 kết quả đạt được, bên dưới là danh sách dạng thẻ (cards) mô tả 3 hướng phát triển tương lai.
* **Hình ảnh:** Hình ảnh mockup giao diện website trên máy tính và điện thoại thể hiện tính năng responsive tốt.

### 🎤 LỜI THUYẾT TRÌNH CHI TIẾT (PRESENTER NOTES):
> *"Để tổng kết đồ án, nhóm chúng em đã xây dựng thành công website bán hàng công nghệ tích hợp chatbot AI. Hệ thống vận hành ổn định dưới sự điều phối của Docker. Trải nghiệm người dùng và tính năng bảo mật của trang quản trị được hoàn thiện tốt. Trong tương lai, nhóm dự định sẽ phát triển tiếp bằng cách liên kết các cổng thanh toán QR của Momo, VNPAY, nâng cấp AI chatbot để có khả năng tạo đơn nháp trực tiếp từ lời nói của khách hàng, và tối ưu hóa SEO để ứng dụng có thể đưa vào vận hành thương mại thực tế. Chúng em xin chân thành cảm ơn thầy cô đã chú ý lắng nghe. Nhóm rất mong nhận được những câu hỏi và ý kiến đóng góp từ thầy cô."*
