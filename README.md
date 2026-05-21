# Kịch Bản Thuyết Trình Kiểm Thử Dự Án EViENT Mobile

## 1. Giới Thiệu Tổng Quan

Trong dự án EViENT Mobile, nhóm em kiểm thử ứng dụng Android được đóng gói bằng Capacitor. Ứng dụng mobile thực chất là một WebView chạy frontend React, còn backend là hệ thống microservices sử dụng API Gateway, Auth Service, Event Service, Order Service, Notification Service và MongoDB.

Vì vậy, phần kiểm thử quan trọng nhất của dự án là kiểm thử tự động end-to-end bằng Appium và WebdriverIO. Appium giúp mô phỏng thao tác thật của người dùng trên Android Emulator, còn WebdriverIO tổ chức và thực thi các test case theo từng kịch bản.

Phần automation của dự án nằm trong thư mục:

```text
automation/
├── wdio.appium.conf.cjs
├── automation-agent.mjs
├── appium/
│   ├── helpers/
│   │   ├── app.cjs
│   │   └── test-data.cjs
│   └── specs/
│       ├── auth.e2e.spec.cjs
│       └── admin.e2e.spec.cjs
└── scripts/
    └── ensure-appium-driver.cjs
```

Khi thuyết trình, có thể mở đầu như sau:

> Trong phần kiểm thử, nhóm em tập trung vào kiểm thử tự động cho ứng dụng mobile. Ứng dụng được build thành APK Android thông qua Capacitor, sau đó Appium sẽ cài và chạy APK này trên emulator để kiểm thử các luồng nghiệp vụ chính như đăng nhập, đăng ký OTP và chức năng admin.

---

## 2. Quy Trình Kiểm Thử Tổng Thể

Quy trình kiểm thử của dự án được chia thành 5 giai đoạn chính:

1. Thiết kế test case.
2. Unit testing.
3. Integration testing.
4. System testing.
5. UAT - User Acceptance Testing.

Trong đó, phần automation Appium đóng vai trò quan trọng nhất ở tầng Integration Testing, System Testing và hỗ trợ UAT.

---

## 3. Thiết Kế Test Case

### 3.1. Mục Tiêu

Mục tiêu của bước thiết kế test case là xác định các luồng nghiệp vụ quan trọng cần kiểm thử, bao gồm:

- Đăng nhập.
- Đăng ký tài khoản.
- Xác thực OTP.
- Xử lý lỗi validation.
- Đăng nhập quyền admin.
- Truy cập dashboard admin.
- Quản lý và tìm kiếm người dùng.

Các test case này được hiện thực trong:

- `automation/appium/specs/auth.e2e.spec.cjs`
- `automation/appium/specs/admin.e2e.spec.cjs`

### 3.2. Bảng Test Case Chính

| Mã test | Nhóm chức năng | Mục tiêu kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi |
|---|---|---|---|---|
| AUTH-01 | Đăng nhập | Kiểm tra bỏ trống email | Chỉ nhập mật khẩu | Form chặn submit, email invalid |
| AUTH-02 | Đăng nhập | Kiểm tra bỏ trống mật khẩu | Chỉ nhập email | Form chặn submit, password invalid |
| AUTH-03 | Đăng nhập | Kiểm tra sai mật khẩu | Email đúng, mật khẩu sai | Hiển thị toast: "Email hoặc mật khẩu không đúng" |
| AUTH-04 | Đăng ký | Kiểm tra bỏ trống họ tên | Email và mật khẩu hợp lệ, thiếu họ tên | Form chặn submit |
| AUTH-05 | Đăng ký | Kiểm tra email đã tồn tại | Email đã được seed trong DB | Hiển thị toast: "Email đã được đăng ký" |
| AUTH-06 | OTP | Kiểm tra nhập sai OTP | OTP sai được tạo từ OTP thật | Hiển thị toast: "Mã OTP không hợp lệ hoặc đã hết hạn" |
| AUTH-07 | Đăng ký OTP | Đăng ký thành công bằng OTP thật | Email mới, OTP lấy từ MongoDB | Chuyển đến home page |
| AUTH-08 | Đăng nhập | Đăng nhập user đã tồn tại | User được seed trước | Chuyển đến home page |
| ADMIN-01 | Admin | Đăng nhập admin | Admin được seed trước | Chuyển đến admin dashboard |
| ADMIN-02 | Admin | Mở trang quản lý người dùng | Tài khoản admin | Search thấy user admin |

### 3.3. Script Thuyết Trình

> Trước khi viết automation, nhóm em thiết kế test case dựa trên các luồng nghiệp vụ quan trọng nhất của hệ thống. Với người dùng thông thường, nhóm em kiểm thử đăng nhập, đăng ký, OTP và các lỗi validation. Với admin, nhóm em kiểm thử đăng nhập vào dashboard và truy cập trang quản lý người dùng.

> Các test case được đặt mã rõ ràng như AUTH-01, AUTH-02 đến AUTH-08 để dễ quản lý, dễ trình bày và dễ chạy riêng từng case khi cần debug.

---

## 4. Unit Testing

### 4.1. Mục Tiêu

Unit testing dùng để kiểm tra các hàm xử lý nhỏ, độc lập, chưa cần chạy toàn bộ ứng dụng mobile.

Trong dự án này, phần automation chưa tách riêng thành một bộ unit test độc lập, nhưng các helper đã được thiết kế thành các hàm nhỏ để có thể kiểm thử riêng nếu cần.

Các nhóm hàm phù hợp cho unit testing:

- Sinh email test duy nhất.
- Chuẩn hóa email.
- Tạo OTP sai từ OTP thật.
- Build MongoDB URI.
- Kiểm tra định dạng OTP 6 chữ số.

### 4.2. Ví Dụ Các Hàm Có Thể Unit Test

Trong `automation/appium/helpers/test-data.cjs`:

```javascript
function createUniqueEmail(prefix = 'automation.mobile') {
  const normalizedPrefix = prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

  return `${normalizedPrefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@evient.test`;
}
```

Hàm này dùng để sinh email mới cho mỗi lần chạy test, tránh trùng dữ liệu trong MongoDB.

Trong `automation/appium/specs/auth.e2e.spec.cjs`:

```javascript
function buildWrongOtp(actualOtp) {
  const digits = String(actualOtp).split('');
  const firstDigit = digits[0] === '9' ? '8' : '9';
  digits[0] = firstDigit;
  return digits.join('');
}
```

Hàm này nhận OTP thật, thay đổi chữ số đầu tiên để tạo OTP sai, phục vụ test case AUTH-06.

### 4.3. Script Thuyết Trình

> Ở tầng unit testing, nhóm em tập trung vào các hàm xử lý nhỏ trong automation helper. Ví dụ, hàm tạo email test duy nhất giúp tránh trùng dữ liệu khi test nhiều lần. Hàm tạo OTP sai giúp kiểm thử trường hợp người dùng nhập sai mã xác minh.

> Tuy các hàm này nhỏ, nhưng nếu chúng hoạt động sai thì toàn bộ kịch bản end-to-end phía sau có thể bị lỗi. Vì vậy việc tách helper rõ ràng giúp automation dễ bảo trì và dễ kiểm thử hơn.

---

## 5. Integration Testing

### 5.1. Mục Tiêu

Integration testing kiểm tra sự phối hợp giữa nhiều thành phần trong hệ thống:

- Ứng dụng Android.
- Capacitor WebView.
- Frontend React.
- API Gateway.
- Auth Service.
- MongoDB.
- Appium automation.

Điểm nổi bật của dự án là automation không chỉ thao tác trên giao diện, mà còn kết nối trực tiếp MongoDB để chuẩn bị dữ liệu test và lấy OTP thật.

### 5.2. Helper Dữ Liệu Kiểm Thử

File chính:

```text
automation/appium/helpers/test-data.cjs
```

Các hàm quan trọng:

| Hàm | Vai trò |
|---|---|
| `upsertUser()` | Seed user hoặc admin vào MongoDB trước khi chạy test |
| `cleanupUser()` | Xóa user và OTP sau khi test |
| `waitForLatestOtp()` | Polling MongoDB để lấy OTP mới nhất |
| `closeMongo()` | Đóng kết nối MongoDB sau khi test |

Ví dụ luồng integration của đăng ký OTP:

```text
Appium nhập form đăng ký
        ↓
Frontend gọi API register
        ↓
Auth Service tạo OTP
        ↓
MongoDB lưu OTP
        ↓
Automation đọc OTP từ MongoDB
        ↓
Appium nhập OTP vào app
        ↓
Hệ thống xác thực và chuyển đến home page
```

### 5.3. Script Thuyết Trình

> Ở tầng integration testing, nhóm em kiểm tra sự phối hợp giữa giao diện mobile, backend và database. Ví dụ trong luồng đăng ký, Appium nhập thông tin trên app Android, backend tạo OTP và lưu vào MongoDB, sau đó automation truy vấn MongoDB để lấy OTP mới nhất rồi nhập lại vào màn hình OTP.

> Cách làm này giúp kiểm thử đúng luồng thực tế của hệ thống, không cần nhập OTP thủ công và không phụ thuộc vào việc đọc email thật.

---

## 6. System Testing

### 6.1. Mục Tiêu

System testing kiểm thử toàn bộ hệ thống như một người dùng thật.

Trong dự án này, system testing được thực hiện bằng Appium và WebdriverIO. Automation sẽ:

1. Mở APK trên Android Emulator.
2. Chuyển vào WebView của ứng dụng Capacitor.
3. Tìm element bằng `data-testid`.
4. Nhập dữ liệu, click button, chờ toast hoặc màn hình kết quả.
5. Kiểm tra kết quả bằng assertion.

### 6.2. Cấu Hình Appium

File cấu hình:

```text
automation/wdio.appium.conf.cjs
```

Các cấu hình quan trọng:

```javascript
capabilities: [{
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': process.env.EVIENT_ANDROID_DEVICE || 'Android Emulator',
  'appium:app': apkPath,
  'appium:autoWebview': true,
  'appium:autoWebviewTimeout': 20000,
  'appium:chromedriverAutodownload': true,
}]
```

Ý nghĩa:

- `UiAutomator2`: driver dùng để điều khiển Android.
- `app`: đường dẫn APK debug cần test.
- `autoWebview`: tự động chuyển vào WebView của ứng dụng hybrid.
- `chromedriverAutodownload`: tự tải ChromeDriver phù hợp với WebView.

### 6.3. Helper Giao Diện

File chính:

```text
automation/appium/helpers/app.cjs
```

Các hàm quan trọng:

| Hàm | Vai trò |
|---|---|
| `switchToWebView()` | Chuyển Appium từ native context sang WebView context |
| `waitForTestId()` | Chờ element theo `data-testid` |
| `typeInto()` | Nhập dữ liệu vào input |
| `clickElement()` | Click element, có fallback khi click bị chặn |
| `waitForToastText()` | Chờ toast thông báo lỗi |
| `fillOtpCode()` | Nhập từng chữ số OTP vào 6 ô input |
| `loginThroughForm()` | Đăng nhập bằng form |
| `openAdminUsersPage()` | Mở trang quản lý người dùng trong admin |

### 6.4. Lệnh Chạy System Test

Chạy kiểm tra môi trường:

```powershell
npm run doctor
```

Build frontend, sync Capacitor và build APK:

```powershell
npm run build
```

Chạy bộ test auth:

```powershell
npm run appium
```

Chạy bộ test admin:

```powershell
npm run appium:admin
```

Chạy toàn bộ test:

```powershell
npm run appium:all
```

Chạy trực tiếp trong thư mục automation:

```powershell
cd automation
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
