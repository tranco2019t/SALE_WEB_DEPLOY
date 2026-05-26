(function () {
  // ====== Dữ liệu mẫu tĩnh cho đơn hàng (fallback khi không có API) ======
  var defaultImage = "../../images/acer-refurbished-laptop-500x500.webp";

  // Danh sách sản phẩm mẫu
  var catalog = {
    nitro5: {
      name: "Laptop Acer Nitro 5",
      description: "Màn 15.6 inch, RTX 3050, RAM 16GB, SSD 512GB.",
      image: defaultImage
    },
    aspire7: {
      name: "Laptop Acer Aspire 7",
      description: "Thiết kế gọn nhẹ, Ryzen 7, pin bền cho làm việc cả ngày.",
      image: defaultImage
    },
    predator: {
      name: "Laptop Acer Predator Helios",
      description: "Hiệu năng cao cho gaming và dựng video, tản nhiệt tốt.",
      image: defaultImage
    },
    mouse: {
      name: "Chuột Gaming RGB",
      description: "Cảm biến 7200 DPI, dây bọc dù, LED RGB 7 màu.",
      image: defaultImage
    },
    keyboard: {
      name: "Bàn phím cơ TKL",
      description: "Switch Blue, layout gọn, keycap PBT bền màu.",
      image: defaultImage
    },
    headset: {
      name: "Tai nghe chụp tai Pro",
      description: "Âm thanh giả lập 7.1, mic khử nhiễu, đệm tai mềm.",
      image: defaultImage
    }
  };

  // Định nghĩa các trạng thái đơn hàng (key, nhãn, class CSS)
  var STATUS_META = {
    pending: { label: "Chờ xác nhận", className: "pending" },
    shipping: { label: "Đang giao", className: "shipping" },
    delivered: { label: "Đã giao", className: "delivered" },
    cancelled: { label: "Đã hủy", className: "cancelled" }
  };

  // Tạo một item sản phẩm trong đơn hàng
  function item(key, quantity, status, unitPrice) {
    var product = catalog[key];
    return {
      name: product.name,
      description: product.description,
      image: product.image,
      quantity: quantity,
      status: status,
      unitPrice: unitPrice
    };
  }

  // Định dạng tiền tệ VNĐ
  function formatCurrency(value) {
    return Number(value).toLocaleString("vi-VN") + "đ";
  }

  /* === Dữ liệu đơn hàng mẫu === */
  var orders = [
    {
      id: "RDR1001",
      date: "20/10/2025",
      status: "delivered",
      items: [item("nitro5", 1, "delivered", 9580000), item("mouse", 1, "delivered", 503000)],
      total: 10083000
    },
    {
      id: "RDR1102",
      date: "10/09/2025",
      status: "delivered",
      items: [item("predator", 1, "delivered", 13055000)],
      total: 13055000
    },
    {
      id: "RDK1902",
      date: "10/08/2025",
      status: "pending",
      items: [item("aspire7", 1, "pending", 6035000)],
      total: 6035000
    },
    {
      id: "RDK1904",
      date: "09/06/2025",
      status: "shipping",
      items: [item("predator", 1, "shipping", 68990000), item("keyboard", 1, "shipping", 1493000), item("headset", 1, "shipping", 2600000)],
      total: 73083000
    },
    {
      id: "RDK1910",
      date: "05/06/2025",
      status: "shipping",
      items: [item("nitro5", 1, "shipping", 16290000), item("mouse", 1, "shipping", 690000)],
      total: 16980000
    },
    {
      id: "RDK1914",
      date: "29/05/2025",
      status: "cancelled",
      items: [item("aspire7", 1, "cancelled", 14550000)],
      total: 14550000
    },
    {
      id: "RDK1920",
      date: "22/05/2025",
      status: "delivered",
      items: [item("keyboard", 2, "delivered", 890000), item("mouse", 1, "delivered", 420000)],
      total: 2200000
    },
    {
      id: "RDK1928",
      date: "16/05/2025",
      status: "pending",
      items: [item("nitro5", 1, "pending", 17890000)],
      total: 17890000
    },
    {
      id: "RDK1931",
      date: "11/05/2025",
      status: "shipping",
      items: [item("headset", 1, "shipping", 1350000), item("mouse", 1, "shipping", 450000)],
      total: 1800000
    },
    {
      id: "RDK1939",
      date: "03/05/2025",
      status: "delivered",
      items: [item("predator", 1, "delivered", 26990000)],
      total: 26990000
    },
    {
      id: "RDK1943",
      date: "29/04/2025",
      status: "delivered",
      items: [item("aspire7", 1, "delivered", 12990000), item("keyboard", 1, "delivered", 1290000)],
      total: 14280000
    },
    {
      id: "RDK1949",
      date: "20/04/2025",
      status: "shipping",
      items: [item("mouse", 2, "shipping", 390000), item("headset", 1, "shipping", 980000)],
      total: 1760000
    },
    {
      id: "RDK1953",
      date: "14/04/2025",
      status: "pending",
      items: [item("nitro5", 1, "pending", 18990000), item("keyboard", 1, "pending", 990000)],
      total: 19980000
    },
    {
      id: "RDK1958",
      date: "08/04/2025",
      status: "cancelled",
      items: [item("predator", 1, "cancelled", 24990000)],
      total: 24990000
    },
    {
      id: "RDK1961",
      date: "01/04/2025",
      status: "delivered",
      items: [item("aspire7", 1, "delivered", 15990000), item("headset", 1, "delivered", 1200000)],
      total: 17190000
    },
    {
      id: "RDK1968",
      date: "28/03/2025",
      status: "shipping",
      items: [item("keyboard", 1, "shipping", 1100000), item("mouse", 1, "shipping", 350000)],
      total: 1450000
    },
    {
      id: "RDK1972",
      date: "20/03/2025",
      status: "delivered",
      items: [item("nitro5", 1, "delivered", 17200000), item("headset", 1, "delivered", 1000000)],
      total: 18200000
    },
    {
      id: "RDK1979",
      date: "12/03/2025",
      status: "pending",
      items: [item("aspire7", 1, "pending", 13590000)],
      total: 13590000
    },
    {
      id: "RDK1984",
      date: "06/03/2025",
      status: "cancelled",
      items: [item("mouse", 1, "cancelled", 499000)],
      total: 499000
    },
    {
      id: "RDK1989",
      date: "01/03/2025",
      status: "delivered",
      items: [item("predator", 1, "delivered", 28990000)],
      total: 28990000
    }
  ];

  // Tính tổng số lượng sản phẩm cho từng đơn
  orders.forEach(function (order) {
    var itemCount = 0;
    order.items.forEach(function (product) {
      itemCount += product.quantity;
    });
    order.itemCount = itemCount;
  });

  window.TamTaiOrdersData = {
    orders: orders,
    statusMeta: STATUS_META,
    defaultPageSize: 10,
    formatCurrency: formatCurrency
  };
})();
