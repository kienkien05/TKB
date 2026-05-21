npm run test:auth
npm run test:admin
npm run test:appium
```

Chạy từng test case riêng:

```powershell
cd automation
npm run test:auth:empty-email
npm run test:auth:empty-password
npm run test:auth:wrong-password
npm run test:auth:empty-full-name
npm run test:auth:duplicate-email
npm run test:auth:wrong-otp
npm run test:auth:register-success
npm run test:auth:login-success
```

### 6.5. Script Thuyết Trình

> Ở tầng system testing, nhóm em chạy kiểm thử trên APK thật của ứng dụng. Appium sẽ cài app lên Android Emulator, mở app và thao tác như người dùng thật. Vì EViENT Mobile là ứng dụng hybrid, Appium cần chuyển vào WebView để thao tác với DOM của frontend.

> Các element trên giao diện được tìm bằng `data-testid`, ví dụ `login-email-input`, `login-submit-button`, `otp-input-0`, `home-page`. Cách đặt test id này giúp test ổn định hơn so với XPath hoặc selector phụ thuộc giao diện.

> Khi test chạy thành công, có nghĩa là toàn bộ hệ thống từ mobile app, frontend, backend đến database đều phối hợp đúng theo nghiệp vụ.

---

## 7. UAT - User Acceptance Testing

### 7.1. Mục Tiêu

UAT là kiểm thử chấp nhận người dùng. Mục tiêu là xác nhận hệ thống đáp ứng đúng nhu cầu nghiệp vụ thực tế.

Trong dự án EViENT Mobile, UAT có thể dựa trên các kịch bản automation đã có, vì các test này mô phỏng trực tiếp hành vi người dùng cuối và admin.

### 7.2. Kịch Bản UAT Cho Người Dùng

```text
1. Người dùng mở app EViENT trên Android.
2. Người dùng chuyển sang màn hình đăng ký.
3. Người dùng nhập họ tên, email và mật khẩu.
4. Hệ thống sinh OTP.
5. Người dùng nhập OTP.
6. Hệ thống xác thực thành công.
7. Người dùng được chuyển đến trang chủ.
```

Automation tương ứng:

```text
AUTH-07 registers a new mobile user with OTP from Atlas
```

### 7.3. Kịch Bản UAT Cho Admin

```text
1. Admin mở app EViENT trên Android.
2. Admin đăng nhập bằng tài khoản quyền quản trị.
3. Hệ thống chuyển đến dashboard admin.
4. Admin mở sidebar.
5. Admin vào trang quản lý người dùng.
6. Admin tìm kiếm tài khoản.
7. Hệ thống hiển thị đúng người dùng cần tìm.
```

Automation tương ứng:

```text
logs in as admin and lands on the dashboard
opens the admin users screen from the mobile sidebar
```

### 7.4. Script Thuyết Trình

> Ở tầng UAT, nhóm em chọn các luồng gần với nghiệp vụ thật nhất. Với người dùng cuối, đó là đăng ký tài khoản, xác thực OTP và vào trang chủ. Với admin, đó là đăng nhập dashboard và quản lý người dùng.

> Điểm thuận lợi là các kịch bản UAT này đã được tự động hóa bằng Appium, nên khi cần kiểm tra lại sau mỗi lần sửa code, nhóm em chỉ cần chạy lại automation thay vì kiểm thử thủ công toàn bộ.

---

## 8. Điểm Nổi Bật Của Automation

### 8.1. Kiểm Thử Trên APK Thật

Automation không chỉ test trên trình duyệt web mà chạy trực tiếp trên APK Android được build từ Capacitor.

### 8.2. Chuyển Ngữ Cảnh WebView

Vì app là hybrid app, Appium cần chuyển từ native context sang WebView context. Hàm `switchToWebView()` xử lý việc này tự động.

### 8.3. Lấy OTP Thật Từ MongoDB

Automation dùng `waitForLatestOtp()` để lấy OTP thật do backend sinh ra trong MongoDB. Đây là điểm quan trọng vì test không cần nhập OTP thủ công.

### 8.4. Seed Và Cleanup Dữ Liệu Test

Trước khi test, automation seed user/admin vào MongoDB. Sau khi test, automation cleanup dữ liệu để tránh ảnh hưởng lần chạy sau.

### 8.5. Selector Ổn Định Bằng `data-testid`

Các element được tìm bằng `data-testid`, giúp test ít bị hỏng khi giao diện thay đổi style hoặc layout.

### 8.6. Có Thể Chạy Theo Suite Hoặc Theo Case

Dự án hỗ trợ chạy:

- Toàn bộ test.
- Riêng auth suite.
- Riêng admin suite.
- Từng case nhỏ như wrong password, wrong OTP, register success.

---

## 9. Kết Luận

Phần kiểm thử của dự án EViENT Mobile được xây dựng theo hướng tự động hóa end-to-end. Quy trình kiểm thử bắt đầu từ thiết kế test case, sau đó kiểm tra từng helper ở mức unit, kiểm tra phối hợp frontend - backend - database ở mức integration, kiểm thử toàn bộ APK Android ở mức system testing và cuối cùng dùng các kịch bản thực tế để hỗ trợ UAT.

Điểm mạnh nhất của dự án là Appium không chỉ thao tác giao diện, mà còn kết hợp với MongoDB để seed dữ liệu và lấy OTP thật. Nhờ đó, các luồng quan trọng như đăng ký, đăng nhập, xác thực OTP và quản trị viên được kiểm thử tự động, ổn định và gần với thực tế sử dụng.

Khi trình bày với giảng viên, có thể kết luận:

> Dự án không chỉ có kiểm thử thủ công mà đã xây dựng được hệ thống automation test hoàn chỉnh cho mobile. Appium mô phỏng người dùng thật trên Android, WebdriverIO quản lý test case, còn MongoDB helper giúp chuẩn bị dữ liệu và xử lý OTP tự động. Đây là bằng chứng cho thấy hệ thống đã được kiểm thử từ giao diện đến backend và database.
