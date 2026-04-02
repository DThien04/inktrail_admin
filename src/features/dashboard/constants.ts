export const DASHBOARD_METRICS = [
  {
    label: "Tổng truyện",
    value: "0",
    helper: "Sẽ nối từ `/stories` hoặc endpoint thống kê sau.",
  },
  {
    label: "Chương chờ duyệt",
    value: "0",
    helper: "Hữu ích khi thêm moderation cho tác giả.",
  },
  {
    label: "Tài khoản tác giả",
    value: "0",
    helper: "Có thể lấy từ danh sách user với role `author`.",
  },
  {
    label: "Banner trang chủ",
    value: "0",
    helper: "Dùng cho quản lý carousel hoặc truyện nổi bật.",
  },
];

export const QUICK_LINKS = [
  {
    title: "Tạo khung quản lý truyện",
    description:
      "Bắt đầu từ danh sách truyện, filter theo trạng thái, và drawer chỉnh metadata.",
    badge: "Stories",
  },
  {
    title: "Nối auth admin bằng JWT",
    description:
      "Khung token storage và API client đã sẵn. Bước tiếp theo là gọi login thật và guard role admin.",
    badge: "Auth",
  },
];
