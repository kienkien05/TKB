const { browser, $, expect } = require('@wdio/globals');
const {
  cleanupUser,
  closeMongo,
  upsertUser,
} = require('../helpers/test-data.cjs');
const {
  loginThroughForm,
  openAdminUsersPage,
  resetToLoginPage,
  waitForTestId,
} = require('../helpers/app.cjs');

const adminUser = {
  email: 'automation.mobile.admin@evient.test',
  fullName: 'Automation Mobile Admin',
  password: 'Automation!123',
  role: 'admin',
};

describe('EViENT mobile admin flow', () => {
  // GIẢI THÍCH: Trước khi chạy test admin, nạp sẵn một tài khoản Admin vào DB
  before(async () => {
    await upsertUser(adminUser);
  });

  // GIẢI THÍCH: Sau khi test xong, xóa sạch tài khoản Admin mẫu để bảo mật và đóng DB
  after(async () => {
    await cleanupUser(adminUser.email);
    await closeMongo();
  });

  // GIẢI THÍCH: Trước mỗi ca test, đưa thiết bị giả lập về trang đăng nhập sạch
  beforeEach(async () => {
    await resetToLoginPage();
  });

  // ==========================================
  // CA KIỂM THỬ: ĐĂNG NHẬP ADMIN VÀ VÀO DASHBOARD QUẢN TRỊ
  // ==========================================
  it('logs in as admin and lands on the dashboard', async () => {
    // 1. Thực hiện điền form đăng nhập với tài khoản Admin
    await loginThroughForm({
      email: adminUser.email,
      password: adminUser.password,
      expectedPageTestId: 'admin-dashboard-page',
    });

    // 2. Chờ màn hình Dashboard quản trị của Admin hiển thị
    const dashboardPage = await waitForTestId('admin-dashboard-page', 30000);
    // Khẳng định: Giao diện Dashboard phải hiển thị đầy đủ
    await expect(dashboardPage).toBeDisplayed();
  });

  // ==========================================
  // CA KIỂM THỬ: MỞ TRANG QUẢN LÝ NGƯỜI DÙNG TỪ SIDEBAR VÀ TÌM KIẾM
  // ==========================================
  it('opens the admin users screen from the mobile sidebar', async () => {
    // 1. Đăng nhập với quyền Admin
    await loginThroughForm({
      email: adminUser.email,
      password: adminUser.password,
      expectedPageTestId: 'admin-dashboard-page',
    });

    // 2. Click mở Sidebar di động và nhấp liên kết quản trị người dùng
    await openAdminUsersPage();

    // 3. Đợi ô tìm kiếm người dùng hiển thị
    const searchInput = await waitForTestId('admin-users-search-input', 30000);
    await expect(searchInput).toBeDisplayed();

    // 4. Nhập email của Admin vừa seeded vào ô tìm kiếm
    await searchInput.setValue(adminUser.email);
    
    // 5. Chờ thông minh: Sử dụng waitUntil để đợi văn bản của email hiển thị trên body màn hình WebView
    await browser.waitUntil(
      async () => (await $('body').getText()).includes(adminUser.email),
      {
        timeout: 20000,
        interval: 500,
        timeoutMsg: 'Admin users page did not show the seeded admin account after searching.',
      }
    );
  });
});
