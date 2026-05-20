const { $, expect } = require('@wdio/globals');
const {
  cleanupUser,
  closeMongo,
  createUniqueEmail,
  upsertUser,
  waitForLatestOtp,
} = require('../helpers/test-data.cjs');
const {
  clickElement,
  clickLoginSubmitButton,
  clickOtpSubmitButton,
  clickRegisterSubmitButton,
  fillOtpCode,
  getFieldValidity,
  loginThroughForm,
  resetToLoginPage,
  typeInto,
  waitForTestId,
  waitForToastText,
} = require('../helpers/app.cjs');

const testPassword = 'Automation!123';
const seededUser = {
  email: 'automation.mobile.user@evient.test',
  fullName: 'Automation Mobile User',
  password: testPassword,
};

function buildWrongOtp(actualOtp) {
  const digits = String(actualOtp).split('');
  const firstDigit = digits[0] === '9' ? '8' : '9';
  digits[0] = firstDigit;
  return digits.join('');
}

describe('EViENT mobile auth flow', () => {
  let registeredEmail = null;

  // GIẢI THÍCH: Trước khi chạy toàn bộ test suite, nạp sẵn user mẫu vào database.
  before(async () => {
    await upsertUser(seededUser);
  });

  // GIẢI THÍCH: Sau khi hoàn thành tất cả ca test, dọn dẹp các tài khoản mẫu để giữ database sạch sẽ.
  after(async () => {
    if (registeredEmail) {
      await cleanupUser(registeredEmail);
    }

    await cleanupUser(seededUser.email);
    await closeMongo();
  });

  // GIẢI THÍCH: Trước mỗi ca test đơn lẻ, reset ứng dụng về màn hình đăng nhập sạch sẽ.
  beforeEach(async () => {
    await resetToLoginPage();
  });

  // ==========================================
  // CA KIỂM THỬ AUTH-01: CHẶN ĐĂNG NHẬP KHI KHÔNG NHẬP EMAIL
  // ==========================================
  it('AUTH-01 blocks login when the email field is empty', async () => {
    // 1. Nhập mật khẩu hợp lệ nhưng bỏ trống email
    await typeInto('[data-testid="login-password-input"]', testPassword);

    // 2. Nhấp chọn gửi Form đăng nhập
    await clickLoginSubmitButton();

    // 3. Sử dụng HTML5 Validation API để lấy tính hợp lệ của trường Email
    const emailValidity = await getFieldValidity('[data-testid="login-email-input"]');
    expect(emailValidity).not.toBeNull();
    // Khẳng định: Trường Email phải báo lỗi không hợp lệ (valid = false) và có tin nhắn báo lỗi
    expect(emailValidity.valid).toBe(false);
    expect(emailValidity.validationMessage.length).toBeGreaterThan(0);
    // Vẫn phải hiển thị ở trang đăng nhập
    await expect(await $('[data-testid="login-page"]')).toBeDisplayed();
  });

  // ==========================================
  // CA KIỂM THỬ AUTH-02: CHẶN ĐĂNG NHẬP KHI KHÔNG NHẬP MẬT KHẨU
  // ==========================================
  it('AUTH-02 blocks login when the password field is empty', async () => {
    // 1. Nhập email hợp lệ nhưng bỏ trống mật khẩu
    await typeInto('[data-testid="login-email-input"]', seededUser.email);

    // 2. Nhấp chọn gửi Form đăng nhập
    await clickLoginSubmitButton();

    // 3. Lấy tính hợp lệ của trường Mật khẩu
    const passwordValidity = await getFieldValidity('[data-testid="login-password-input"]');
    expect(passwordValidity).not.toBeNull();
    // Khẳng định: Trường Mật khẩu phải báo lỗi không hợp lệ
    expect(passwordValidity.valid).toBe(false);
    expect(passwordValidity.validationMessage.length).toBeGreaterThan(0);
    await expect(await $('[data-testid="login-page"]')).toBeDisplayed();
  });

  // ==========================================
  // CA KIỂM THỬ AUTH-03: HIỂN THỊ LỖI KHI ĐĂNG NHẬP SAI MẬT KHẨU
  // ==========================================
  it('AUTH-03 shows an error when login uses a wrong password', async () => {
    // 1. Nhập email đúng nhưng điền sai mật khẩu
    await typeInto('[data-testid="login-email-input"]', seededUser.email);
    await typeInto('[data-testid="login-password-input"]', 'WrongPassword!123');

    // 2. Click gửi Form
    await clickLoginSubmitButton();

    // 3. Đợi thông báo Toast lỗi xuất hiện dạng tiếng Việt
    await waitForToastText('Email hoặc mật khẩu không đúng', 15000);
    await expect(await $('[data-testid="login-page"]')).toBeDisplayed();
  });

  // ==========================================
  // CA KIỂM THỬ AUTH-04: CHẶN ĐĂNG KÝ KHI THIẾU HỌ TÊN
  // ==========================================
  it('AUTH-04 blocks register when the full name is empty', async () => {
    // 1. Chuyển sang màn hình Đăng ký
    const switchToRegisterButton = await waitForTestId('auth-switch-register', 15000);
    await clickElement(switchToRegisterButton);

    // 2. Điền email mới ngẫu nhiên và mật khẩu nhưng bỏ trống Họ tên
    await typeInto('[data-testid="login-email-input"]', createUniqueEmail('automation.mobile.empty-name'));
    await typeInto('[data-testid="login-password-input"]', testPassword);

    // 3. Click nút Đăng ký
    await clickRegisterSubmitButton();

    // 4. Lấy trạng thái của trường Họ tên
    const fullNameValidity = await getFieldValidity('[data-testid="register-full-name-input"]');
    expect(fullNameValidity).not.toBeNull();
    // Khẳng định: Trường Họ tên báo lỗi trống dữ liệu
    expect(fullNameValidity.valid).toBe(false);
    expect(fullNameValidity.validationMessage.length).toBeGreaterThan(0);
    await expect(await $('[data-testid="login-page"]')).toBeDisplayed();
  });

  // ==========================================
  // CA KIỂM THỬ AUTH-05: BÁO LỖI KHI ĐĂNG KÝ EMAIL TRÙNG LẶP
  // ==========================================
  it('AUTH-05 shows an error when register uses an existing email', async () => {
    // 1. Chuyển sang màn Đăng ký
    const switchToRegisterButton = await waitForTestId('auth-switch-register', 15000);
    await clickElement(switchToRegisterButton);

    // 2. Nhập họ tên và nhập Email đã tồn tại (email mẫu đã seeded từ trước)
    await typeInto('[data-testid="register-full-name-input"]', 'Duplicate Email User');
    await typeInto('[data-testid="login-email-input"]', seededUser.email);
    await typeInto('[data-testid="login-password-input"]', testPassword);

    // 3. Click Đăng ký
    await clickRegisterSubmitButton();

    // 4. Đợi Toast báo lỗi trùng email tiếng Việt xuất hiện
    await waitForToastText('Email đã được đăng ký', 15000);
    await expect(await $('[data-testid="login-page"]')).toBeDisplayed();
  });

  // ==========================================
  // CA KIỂM THỬ AUTH-06: BÁO LỖI KHI NHẬP SAI MÃ OTP
  // ==========================================
  it('AUTH-06 shows an error when register uses a wrong OTP', async () => {
    registeredEmail = createUniqueEmail('automation.mobile.register');
    await cleanupUser(registeredEmail);

    // 1. Chuyển sang màn Đăng ký
    const switchToRegisterButton = await waitForTestId('auth-switch-register', 15000);
    await clickElement(switchToRegisterButton);

    // 2. Nhập thông tin đăng ký hợp lệ
    await typeInto('[data-testid="register-full-name-input"]', 'Automation Register User');
    await typeInto('[data-testid="login-email-input"]', registeredEmail);
    await typeInto('[data-testid="login-password-input"]', testPassword);

    // 3. Gửi đăng ký
    await clickRegisterSubmitButton();

    // 4. Đợi màn hình nhập OTP hiển thị
    await waitForTestId('otp-page', 15000);
    // 5. Quét DB lấy OTP thật được gửi đi
    const latestOtp = await waitForLatestOtp({
      email: registeredEmail,
      type: 'register',
    });

    // 6. Điền mã OTP đã bị làm sai đi (buildWrongOtp)
    const wrongOtp = buildWrongOtp(latestOtp);
    await fillOtpCode(wrongOtp);
    await clickOtpSubmitButton();

    // 7. Khẳng định: Hiển thị Toast báo sai OTP tiếng Việt và vẫn giữ nguyên ở màn hình OTP
    await waitForToastText('Mã OTP không hợp lệ hoặc đã hết hạn', 15000);
    await expect(await $('[data-testid="otp-page"]')).toBeDisplayed();
  });

  // ==========================================
  // CA KIỂM THỬ AUTH-07: ĐĂNG KÝ THÀNH CÔNG VỚI OTP THẬT TỪ DB
  // ==========================================
  it('AUTH-07 registers a new mobile user with OTP from Atlas', async () => {
    registeredEmail = createUniqueEmail('automation.mobile.register');
    await cleanupUser(registeredEmail);

    // 1. Chuyển sang màn Đăng ký
    const switchToRegisterButton = await waitForTestId('auth-switch-register', 15000);
    await clickElement(switchToRegisterButton);

    // 2. Nhập thông tin chuẩn
    await typeInto('[data-testid="register-full-name-input"]', 'Automation Register User');
    await typeInto('[data-testid="login-email-input"]', registeredEmail);
    await typeInto('[data-testid="login-password-input"]', testPassword);

    // 3. Gửi Đăng ký
    await clickRegisterSubmitButton();

    // 4. Chờ màn hình nhập OTP hiển thị
    await waitForTestId('otp-page', 15000);
    // 5. Quét cơ sở dữ liệu MongoDB Atlas lấy OTP thật tức thì
    const latestOtp = await waitForLatestOtp({
      email: registeredEmail,
      type: 'register',
    });

    // 6. Điền OTP thật và click xác nhận
    await fillOtpCode(latestOtp);
    await clickOtpSubmitButton();

    // 7. Khẳng định: Đăng ký thành công và chuyển hướng đến trang chủ (home-page)
    const homePage = await waitForTestId('home-page', 30000);
    await expect(homePage).toBeDisplayed();
  });

  // ==========================================
  // CA KIỂM THỬ AUTH-08: ĐĂNG NHẬP Ở CHẾ ĐỘ PHÁT TRIỂN (BỎ QUA OTP)
  // ==========================================
  it('AUTH-08 logs in an existing mobile user in dev OTP-skip mode', async () => {
    // 1. Sử dụng hàm loginThroughForm để đăng nhập nhanh
    await loginThroughForm({
      email: seededUser.email,
      password: seededUser.password,
      expectedPageTestId: 'home-page',
    });

    // 2. Khẳng định: Đăng nhập thành công thẳng vào home-page
    const homeTitle = await waitForTestId('home-title', 15000);
    await expect(homeTitle).toBeDisplayed();
    await expect(await $('[data-testid="home-page"]')).toBeDisplayed();
  });
});
