# Website quản lý học phí

## Cách chạy

```bash
npm start
```

Mở trang học sinh:

```text
http://localhost:4173/
```

Mở trang quản trị:

```text
http://localhost:4173/admin.html
```

Mật khẩu quản trị mặc định là `2008`.

## Đổi mật khẩu khi dùng thật

Vào `/admin.html`, đăng nhập bằng mật khẩu mặc định `2008`, rồi dùng mục **Đổi mật khẩu quản trị**.

## Tự động xác nhận chuyển khoản

Website có sẵn cổng nhận thông báo giao dịch:

```text
POST /api/payment-webhook
```

Header bắt buộc:

```text
x-webhook-secret: ma-bi-mat-webhook
```

Nếu nhà cung cấp webhook không cho thêm header, dùng mã bí mật trên URL:

```text
https://ten-web-cua-ban.com/api/payment-webhook?secret=ma-bi-mat-webhook
```

Dữ liệu mẫu:

```json
{
  "transferContent": "HP-AN001",
  "amount": 1500000,
  "month": "2026-06"
}
```

Khi nội dung chuyển khoản có mã học viên, hệ thống sẽ tự đổi trạng thái thành `Đã thanh toán`.

Với VietQR, đăng ký webhook URL bằng API:

```bash
curl --location 'https://api.vietqr.io/v2/paymentGateway/confirmWebhook' \
  --header 'x-client-id: VIETQR_CLIENT_ID_CUA_BAN' \
  --header 'x-api-key: VIETQR_API_KEY_CUA_BAN' \
  --header 'Content-Type: application/json' \
  --data '{
    "webhook_url": "https://ten-web-cua-ban.com/api/payment-webhook?secret=ma-bi-mat-webhook"
  }'
```

## Đưa lên web bằng Render

1. Đưa thư mục dự án này lên GitHub.
2. Vào Render, tạo Blueprint hoặc Web Service mới từ repo GitHub.
3. Nếu dùng Blueprint, Render sẽ đọc file `render.yaml`.
4. Nhập biến môi trường:
  - `WEBHOOK_SECRET`: mã bí mật cho cổng tự động xác nhận thanh toán.
5. Sau khi deploy xong, Render sẽ cấp một link dạng `https://ten-web.onrender.com`.

Khi có link công khai:

- Học sinh xem tại `/`.
- Bạn quản trị tại `/admin.html`.

## Lưu dữ liệu khi deploy

File `render.yaml` đã cấu hình `DATA_DIR=/var/data` và ổ lưu trữ 1GB để dữ liệu học phí không mất khi website khởi động lại.
