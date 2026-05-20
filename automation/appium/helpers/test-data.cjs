const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { existsSync } = require('fs');
const { MongoClient } = require('mongodb');

// ==========================================
// CẤU HÌNH BIẾN MÔI TRƯỜNG (.env)
// ==========================================
// Giải thích cho GV: Tìm kiếm file `.env` ở các thư mục ứng cử viên xung quanh dự án để đọc cấu hình kết nối DB
const envCandidates = [
  process.env.EVIENT_ENV_PATH,
  path.resolve(__dirname, '../../../.env'),
  process.env.EVIENT_ROOT ? path.join(process.env.EVIENT_ROOT, '.env') : null,
  path.resolve(__dirname, '../../../../EViENT/.env'),
].filter(Boolean);

const envPath = envCandidates.find((candidate) => existsSync(candidate));
dotenv.config(envPath ? { path: envPath } : undefined);

const baseMongoUri = process.env.MONGODB_URI;
const authDbName = process.env.MONGODB_AUTH_DB || 'evient_auth';
const bcryptRounds = Number(process.env.BCRYPT_ROUNDS) || 10;

let clientPromise;

// ==========================================
// HÀM BỔ TRỢ: CHUẨN HÓA ĐƯỜNG DẪN MONGODB URI
// ==========================================
function buildMongoUri(baseUri, dbName) {
  // Giải thích cho GV: Lấy chuỗi kết nối gốc MONGODB_URI và ghép thêm tên database cụ thể
  // (ví dụ 'evient_auth') để trỏ đúng cơ sở dữ liệu cần thao tác.
  const [rawPath, rawQuery] = baseUri.trim().split('?');
  const pathWithoutTrailingSlash = rawPath.replace(/\/+$/, '');
  const authorityMatch = pathWithoutTrailingSlash.match(/^mongodb(?:\+srv)?:\/\/[^/]+/i);
  const normalizedBase = authorityMatch ? authorityMatch[0] : pathWithoutTrailingSlash;
  const nextUri = `${normalizedBase}/${dbName}`;
  return rawQuery ? `${nextUri}?${rawQuery}` : nextUri;
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

// ==========================================
// HÀM: TẠO EMAIL DUY NHẤT CHO MỖI LẦN CHẠY TEST
// ==========================================
function createUniqueEmail(prefix = 'automation.mobile') {
  // Giải thích cho GV: Hàm tạo email ngẫu nhiên dạng 'prefix.timestamp.random@evient.test'
  // Nhằm đảm bảo mỗi khi chạy test đăng ký, hệ thống không bị lỗi trùng email trong DB.
  const normalizedPrefix = prefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

  return `${normalizedPrefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@evient.test`;
}

// ==========================================
// HÀM: KHỞI TẠO VÀ KẾT NỐI MONGODB CLIENT
// ==========================================
async function getAuthDb() {
  // Giải thích cho GV: Thiết lập kết nối Singleton tới MongoDB Atlas bằng thư viện 'mongodb' chính hãng.
  if (!baseMongoUri) {
    throw new Error(`MONGODB_URI is missing. Checked env paths: ${envCandidates.join(', ')}`);
  }

  if (!clientPromise) {
    const client = new MongoClient(buildMongoUri(baseMongoUri, authDbName));
    clientPromise = client.connect().then(() => client);
  }

  const client = await clientPromise;
  return client.db(authDbName);
}

// ==========================================
// HÀM: DỌN DẸP DỮ LIỆU NGƯỜI DÙNG SAU KHI TEST
// ==========================================
async function cleanupUser(email) {
  // Giải thích cho GV: Xóa sạch dữ liệu của user và các mã OTP liên quan tới email đó trong DB.
  // Giữ cơ sở dữ liệu dự án luôn sạch sẽ và giải phóng tài nguyên.
  const normalizedEmail = normalizeEmail(email);
  const db = await getAuthDb();

  await Promise.all([
    db.collection('users').deleteMany({ email: normalizedEmail }),
    db.collection('otpcodes').deleteMany({ email: normalizedEmail }),
  ]);
}

// ==========================================
// HÀM: NẠP SẴN NGƯỜI DÙNG MẪU (DATABASE SEEDING)
// ==========================================
async function upsertUser({ email, fullName, password, role = 'user', isActive = true }) {
  // Giải thích cho GV: Đăng ký sẵn một người dùng trực tiếp vào DB để phục vụ kiểm thử đăng nhập.
  // Để mật khẩu tương thích với Backend, chúng em mã hóa mật khẩu bằng thư viện 'bcryptjs' chuẩn.
  // Lệnh 'updateOne' với '{ upsert: true }' giúp tạo mới nếu chưa có, hoặc cập nhật nếu đã tồn tại.
  const normalizedEmail = normalizeEmail(email);
  const db = await getAuthDb();
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, bcryptRounds);

  await db.collection('users').updateOne(
    { email: normalizedEmail },
    {
      $set: {
        email: normalizedEmail,
        fullName,
        passwordHash,
        role,
        isActive,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
        passwordHistory: [{ changedAt: now, reason: 'register' }],
      },
    },
    { upsert: true }
  );

  // Xóa sạch các mã OTP cũ của email này để tránh xung đột
  await db.collection('otpcodes').deleteMany({ email: normalizedEmail });
}

// ==========================================
// HÀM: ĐỢI VÀ TRUY VẤN MÃ OTP MỚI NHẤT (REAL OTP RETRIEVAL)
// ==========================================
async function waitForLatestOtp({ email, type, timeoutMs = 30000, pollIntervalMs = 500 }) {
  // Giải thích cho GV: Cơ chế HOÀN TOÀN TỰ ĐỘNG vượt qua màn OTP.
  // Khi ứng dụng gửi lệnh Đăng ký, hệ thống gửi OTP mới vào DB. Hàm này sẽ chạy vòng lặp (Polling)
  // cứ mỗi 500ms để tìm mã OTP mới nhất, chưa được sử dụng (isUsed = false) và còn hạn.
  // Trả về mã OTP này để script kiểm thử tự động điền vào màn hình di động.
  const normalizedEmail = normalizeEmail(email);
  const db = await getAuthDb();
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const otpCode = await db.collection('otpcodes')
      .find({
        email: normalizedEmail,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(1)
      .next();

    if (otpCode?.code) {
      return String(otpCode.code);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timed out waiting for ${type} OTP for ${normalizedEmail}.`);
}

// ==========================================
// HÀM: ĐÓNG KẾT NỐI MONGODB
// ==========================================
async function closeMongo() {
  // Giải thích cho GV: Giải phóng kết nối database sau khi chạy xong toàn bộ bộ test.
  if (!clientPromise) {
    return;
  }

  const client = await clientPromise;
  clientPromise = null;
  await client.close();
}

module.exports = {
  cleanupUser,
  closeMongo,
  createUniqueEmail,
  upsertUser,
  waitForLatestOtp,
};
