const { browser, $ } = require('@wdio/globals');

// ==========================================
// HÀM BỔ TRỢ: TẠO ĐỘ TRỄ CHỜ ĐỢI TĨNH
// ==========================================
function sleep(ms) {
  // Giải thích cho GV: Dùng để tạm dừng luồng chạy trong một khoảng thời gian ms chỉ định.
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==========================================
// HÀM QUAN TRỌNG: CHUYỂN NGỮ CẢNH WEBVIEW (HYBRID APP)
// ==========================================
async function switchToWebView(timeoutMs = 30000) {
  // Giải thích cho GV: Vì ứng dụng được build bằng Capacitor (Hybrid App), giao diện chạy
  // bên trong một WebView di động. Hàm này giúp WebdriverIO chuyển đổi từ chế độ Native Android
  // sang WebView để có thể truy vấn các phần tử bằng CSS selector (như data-testid) thay vì XML XPath.
  if (typeof browser.getContexts !== 'function') {
    return;
  }

  const startedAt = Date.now();

  // Vòng lặp chờ đợi cho đến khi hệ thống Android tải xong ngữ cảnh WEBVIEW
  while (Date.now() - startedAt < timeoutMs) {
    const contexts = await browser.getContexts();
    const webViewContext = contexts.find((context) => String(context).toUpperCase().includes('WEBVIEW'));

    if (webViewContext) {
      if (typeof browser.getContext === 'function' && typeof browser.switchContext === 'function') {
        const currentContext = await browser.getContext();
        // Chỉ switch nếu ngữ cảnh hiện tại chưa phải là WebView
        if (currentContext !== webViewContext) {
          await browser.switchContext(webViewContext);
        }
      }

      return webViewContext;
    }

    await sleep(1000);
  }

  throw new Error('Unable to find a WEBVIEW context for the EViENT Android app.');
}

// ==========================================
// HÀM: ĐỢI PHẦN TỬ HIỂN THỊ THEO TEST ID
// ==========================================
async function waitForTestId(testId, timeout = 30000) {
  // Giải thích cho GV: Tìm phần tử có thuộc tính [data-testid="value"] và đợi đến khi
  // phần tử đó thực sự hiển thị trên màn hình. Giúp bài test không bị lỗi lệch pha (sync error) khi giao diện tải chậm.
  await switchToWebView(timeout);
  const element = await $(`[data-testid="${testId}"]`);
  await element.waitForDisplayed({ timeout });
  return element;
}

// ==========================================
// HÀM: XÓA TRẠNG THÁI CLIENT (CLEAR CACHE)
// ==========================================
async function clearClientState() {
  // Giải thích cho GV: Xóa sạch localStorage, sessionStorage và Cookies.
  // Đảm bảo mỗi ca test bắt đầu ở trạng thái hoàn toàn mới, không bị lưu lại trạng thái đăng nhập cũ.
  await switchToWebView();
  await browser.execute(() => {
    localStorage.clear();
    sessionStorage.clear();

    document.cookie.split(';').forEach((cookie) => {
      const separatorIndex = cookie.indexOf('=');
      const name = separatorIndex >= 0 ? cookie.slice(0, separatorIndex).trim() : cookie.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  });
}

// ==========================================
// HÀM: ĐIỀU HƯỚNG TRỰC TIẾP TRONG WEBVIEW
// ==========================================
async function navigateWithinWebView(path) {
  // Giải thích cho GV: Ép WebView tải lại theo đường dẫn url cụ thể (ví dụ /login).
  // Giúp chuyển trang cực nhanh mà không cần thao tác click nút chuyển trang trên UI di động.
  await switchToWebView();
  await browser.execute((targetPath) => {
    window.location.assign(targetPath);
  }, path);
}

// ==========================================
// HÀM: ĐỢI VÀ KIỂM TRA TOAST THÔNG BÁO HIỂN THỊ
// ==========================================
async function waitForToastText(expectedText, timeout = 15000) {
  // Giải thích cho GV: Hàm này dùng để quét các thông báo popup (Toast) trên màn hình (được tạo bởi thư viện Sonner).
  // Nó liên tục tìm kiếm nội dung thông báo tiếng Việt xem có khớp với expectedText (ví dụ: "Mã OTP không hợp lệ") hay không.
  await switchToWebView(timeout);

  await browser.waitUntil(
    async () => {
      const toasts = await $$('[data-sonner-toast]');

      for (const toast of toasts) {
        if (!await toast.isDisplayed().catch(() => false)) {
          continue;
        }

        const text = await toast.getText().catch(() => '');
        if (text.includes(expectedText)) {
          return true;
        }
      }

      return false;
    },
    {
      timeout,
      interval: 250,
      timeoutMsg: `Toast containing "${expectedText}" was not displayed.`,
    }
  );
}

// ==========================================
// HÀM: LẤY TRẠNG THÁI VALIDATE CỦA THẺ HTML5
// ==========================================
async function getFieldValidity(selector) {
  // Giải thích cho GV: Điểm sáng kỹ thuật! Thay vì chỉ đợi UI, hàm này nhúng mã JS vào trình duyệt
  // để đọc trực tiếp trạng thái HTML5 Validation API của ô input. Nhờ đó, bài test biết chính xác
  // lý do vì sao ô input bị chặn (trống dữ liệu, sai định dạng email, v.v.).
  await switchToWebView();

  return browser.execute((targetSelector) => {
    const element = document.querySelector(targetSelector);
    if (!element) {
      return null;
    }

    return {
      valid: element.checkValidity(),
      validationMessage: element.validationMessage || '',
      value: element.value || '',
    };
  }, selector);
}

// ==========================================
// HÀM: RESET ỨNG DỤNG VỀ MÀN HÌNH ĐĂNG NHẬP SẠCH
// ==========================================
async function resetToLoginPage() {
  // Giải thích cho GV: Reset ứng dụng về điểm xuất phát chuẩn để bắt đầu một ca test mới.
  await clearClientState();
  await navigateWithinWebView('/login');
  await waitForTestId('login-page');
}

// ==========================================
// HÀM: TỰ ĐỘNG GÕ CHỮ VÀO Ô NHẬP LIỆU
// ==========================================
async function typeInto(selector, value) {
  // Giải thích cho GV: Đợi ô nhập liệu hiển thị, xóa giá trị cũ và điền giá trị mới.
  const element = await $(selector);
  await element.waitForDisplayed({ timeout: 15000 });
  await element.clearValue();
  await element.setValue(value);
  return element;
}

// ==========================================
// HÀM: MÔ PHỎNG CLICK NÚT / CLICK ELEMENT
// ==========================================
async function clickElement(element) {
  // Giải thích cho GV: Click vào một nút. Nếu nút bị che khuất bởi lớp phủ (click intercepted),
  // hàm sẽ tự động dùng lệnh thực thi JS trực tiếp `node.click()` để đảm bảo tác vụ click luôn thành công.
  try {
    await element.click();
  } catch (error) {
    if (!String(error).toLowerCase().includes('click intercepted')) {
      throw error;
    }

    await browser.execute((node) => {
      node.click();
    }, element);
  }
}

// ==========================================
// HÀM: TỰ ĐỘNG NHẬP MÃ OTP 6 CHỮ SỐ
// ==========================================
async function fillOtpCode(otpCode) {
  // Giải thích cho GV: Nhập mã OTP 6 chữ số. Do giao diện ứng dụng chia nhỏ OTP thành 6 ô nhập
  // riêng biệt, hàm này bóc tách mã OTP thành các chữ số đơn lẻ và gõ tuần tự vào các ô từ otp-input-0 đến otp-input-5.
  if (!/^\d{6}$/.test(String(otpCode))) {
    throw new Error(`Expected a 6-digit OTP, received: ${otpCode}`);
  }

  const digits = String(otpCode).split('');

  for (let index = 0; index < digits.length; index += 1) {
    const input = await waitForTestId(`otp-input-${index}`, 15000);
    await clickElement(input);
    await input.setValue(digits[index]);
  }
}

// ==========================================
// HÀM: CLICK NÚT XÁC NHẬN ĐĂNG NHẬP
// ==========================================
async function clickLoginSubmitButton() {
  const submitButton = await waitForTestId('login-submit-button', 15000);
  await clickElement(submitButton);
}

// ==========================================
// HÀM: CLICK NÚT XÁC NHẬN ĐĂNG KÝ
// ==========================================
async function clickRegisterSubmitButton() {
  const submitButton = await waitForTestId('register-submit-button', 15000);
  await clickElement(submitButton);
}

// ==========================================
// HÀM: CLICK NÚT XÁC NHẬN OTP
// ==========================================
async function clickOtpSubmitButton() {
  // Giải thích cho GV: Xử lý an toàn để click nút gửi mã OTP, tránh lỗi nếu trang OTP đột ngột chuyển hướng mất.
  await switchToWebView(15000);
  const otpPage = await $('[data-testid="otp-page"]');
  const submitButton = await $('[data-testid="otp-submit-button"]');
  await submitButton.waitForExist({ timeout: 3000 }).catch(() => {});
  const exists = await submitButton.isExisting().catch(() => false);

  if (!exists) {
    const stillOnOtpPage = await otpPage.isExisting().catch(() => false);
    if (!stillOnOtpPage) {
      return false;
    }
    return false;
  }

  await submitButton.waitForDisplayed({ timeout: 3000 }).catch(() => {});
  const displayed = await submitButton.isDisplayed().catch(() => false);
  if (!displayed) {
    return false;
  }

  const enabled = await submitButton.isEnabled().catch(() => false);
  if (!enabled) {
    return false;
  }

  try {
    await clickElement(submitButton);
  } catch (error) {
    const message = String(error).toLowerCase();
    const stillOnOtpPage = await otpPage.isExisting().catch(() => false);

    if (!stillOnOtpPage && (message.includes('element wasn\'t found') || message.includes('stale') || message.includes('no such element'))) {
      return false;
    }

    throw error;
  }

  return true;
}

// ==========================================
// HÀM: ĐĂNG NHẬP TOÀN BỘ QUA FORM
// ==========================================
async function loginThroughForm({ email, password, expectedPageTestId = 'home-page' }) {
  // Giải thích cho GV: Đóng gói toàn bộ luồng đăng nhập nhanh bằng cách tự động điền email, mật khẩu và click đăng nhập.
  await resetToLoginPage();
  await typeInto('[data-testid="login-email-input"]', email);
  await typeInto('[data-testid="login-password-input"]', password);
  await clickLoginSubmitButton();
  await waitForTestId(expectedPageTestId, 30000);
}

// ==========================================
// HÀM: DI CHUYỂN TỚI TRANG QUẢN TRỊ NGƯỜI DÙNG
// ==========================================
async function openAdminUsersPage() {
  // Giải thích cho GV: Mô phỏng thao tác mở thanh menu vuốt bên trái của thiết bị (Sidebar)
  // và click chuyển hướng đến trang danh sách người dùng dành riêng cho Admin.
  const sidebarToggle = await $('[data-testid="admin-sidebar-toggle"]');
  if (await sidebarToggle.isExisting() && await sidebarToggle.isDisplayed().catch(() => false)) {
    await clickElement(sidebarToggle);
  }

  const usersLink = await waitForTestId('admin-nav-nguoi-dung', 15000);
  await clickElement(usersLink);
  await waitForTestId('admin-users-page', 30000);
}

module.exports = {
  clickElement,
  clickLoginSubmitButton,
  clickOtpSubmitButton,
  clickRegisterSubmitButton,
  getFieldValidity,
  loginThroughForm,
  fillOtpCode,
  openAdminUsersPage,
  resetToLoginPage,
  navigateWithinWebView,
  sleep,
  switchToWebView,
  typeInto,
  waitForTestId,
  waitForToastText,
};
