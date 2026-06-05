const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "2008";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "c0825daebe8e392a8d3e9285c12f4e9e";
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || ROOT;
const DATA_FILE = path.join(DATA_DIR, "data.json");

const sessions = new Map();

function defaultBank() {
  return {
    owner: "HOANG",
    bankName: "Ngân hàng của bạn",
    bankCode: "MB",
    accountNumber: "0000000000",
    transferNote: "HP-{MA_HOC_VIEN}-{THANG}",
  };
}

function defaultTeacherSettings(displayName, existing = {}) {
  return {
    schoolName: existing.schoolName || `Lớp học của ${displayName || "giáo viên"}`,
    schedule: existing.schedule || "Chưa cập nhật lịch học",
    bank: {
      ...defaultBank(),
      ...(existing.bank || {}),
    },
  };
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;

  const testHash = crypto.scryptSync(String(password), salt, 64);
  const savedHash = Buffer.from(hash, "hex");
  return savedHash.length === testHash.length && crypto.timingSafeEqual(savedHash, testHash);
}

function defaultAdminUsers() {
  return [
    {
      id: crypto.randomUUID(),
      username: "admin",
      displayName: "Chủ quản trị",
      passwordHash: createPasswordHash("2008"),
      settings: defaultTeacherSettings("VỸ", {
        schoolName: "Lớp học của VỸ",
      }),
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      username: "cohuy",
      displayName: "Cô Huy",
      passwordHash: createPasswordHash("2008"),
      settings: defaultTeacherSettings("Cô Huy"),
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      username: "codieu",
      displayName: "Cô Diệu",
      passwordHash: createPasswordHash("2008"),
      settings: defaultTeacherSettings("Cô Diệu"),
      createdAt: new Date().toISOString(),
    },
  ];
}

function ensureAdminUsers(data) {
  let changed = false;

  if (!data.adminPasswordHash) {
    data.adminPasswordHash = createPasswordHash(ADMIN_PASSWORD);
    changed = true;
  }

  if (!data.schedule) {
    data.schedule = "Chưa cập nhật lịch học";
    changed = true;
  }

  if (!Array.isArray(data.adminUsers)) {
    data.adminUsers = defaultAdminUsers();
    changed = true;
  }

  for (const user of data.adminUsers) {
    user.username = normalizeUsername(user.username);
    if (!user.settings) {
      user.settings = defaultTeacherSettings(user.displayName, user.username === "admin" ? {
        schoolName: data.schoolName,
        bank: data.bank,
      } : {});
      changed = true;
    }
  }

  if (!data.adminUsers.some((user) => user.username === "admin")) {
    data.adminUsers.unshift({
      id: crypto.randomUUID(),
      username: "admin",
      displayName: "Chủ quản trị",
      passwordHash: createPasswordHash("2008"),
      settings: defaultTeacherSettings("VỸ", {
        schoolName: data.schoolName || "Lớp học của VỸ",
        bank: data.bank,
      }),
      createdAt: new Date().toISOString(),
    });
    changed = true;
  }

  if (Array.isArray(data.students)) {
    for (const student of data.students) {
      if (!student.className) {
        student.className = "Lớp chính";
        changed = true;
      }
      if (!student.owner) {
        student.owner = "admin";
        changed = true;
      }
    }
  }

  return changed;
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function createInitialData() {
  const month = currentMonthValue();
  const now = new Date().toISOString();
  return {
    schoolName: "Lớp học của cô/thầy",
    schedule: "Chưa cập nhật lịch học",
    bank: defaultBank(),
    adminPasswordHash: createPasswordHash(ADMIN_PASSWORD),
    students: [
      {
        id: crypto.randomUUID(),
        code: "AN001",
        month,
        name: "Nguyễn Văn An",
        amount: 1500000,
        paid: true,
        paidAt: now,
        updatedAt: now,
        note: "Đã chuyển khoản",
        className: "Lớp chính",
      },
      {
        id: crypto.randomUUID(),
        code: "CHAU002",
        month,
        name: "Trần Minh Châu",
        amount: 1500000,
        paid: false,
        paidAt: "",
        updatedAt: now,
        note: "Chưa nhận giao dịch",
        className: "Lớp chính",
      },
      {
        id: crypto.randomUUID(),
        code: "NAM003",
        month,
        name: "Lê Hoàng Nam",
        amount: 1200000,
        paid: true,
        paidAt: now,
        updatedAt: now,
        note: "Đóng tiền mặt",
        className: "Lớp chính",
      },
    ],
    adminUsers: defaultAdminUsers(),
  };
}

function findAdminUser(data, username) {
  const normalized = normalizeUsername(username || "admin");
  return data.adminUsers.find((user) => user.username === normalized) || data.adminUsers.find((user) => user.username === "admin");
}

function teacherSettings(data, username) {
  const user = findAdminUser(data, username);
  if (!user.settings) {
    user.settings = defaultTeacherSettings(user.displayName);
  }
  return user.settings;
}

function readData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initial = createInitialData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (ensureAdminUsers(data)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }
  return data;
}

function writeData(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request quá lớn"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON không hợp lệ"));
      }
    });
  });
}

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || "";
  header.split(";").forEach((pair) => {
    const [key, ...value] = pair.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(value.join("="));
  });
  return cookies;
}

function isAdmin(req) {
  const token = parseCookies(req).admin_token;
  return Boolean(token && sessions.has(token));
}

function currentSession(req) {
  const token = parseCookies(req).admin_token;
  return token ? sessions.get(token) : null;
}

function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  sendJson(res, 401, { error: "Bạn cần đăng nhập quản trị." });
  return false;
}

function publicData(data) {
  return {
    schoolName: data.schoolName,
    schedule: data.schedule || "Chưa cập nhật lịch học",
    bank: data.bank,
    students: data.students
      .map((student) => ({
        id: student.id,
        code: student.code,
        className: student.className || "Lớp chính",
        month: student.month,
        name: student.name,
        amount: student.amount,
        paid: student.paid,
        paidAt: student.paidAt,
        updatedAt: student.updatedAt,
      })),
  };
}

function adminData(data) {
  return {
    schoolName: data.schoolName,
    schedule: data.schedule || "Chưa cập nhật lịch học",
    bank: data.bank,
    students: data.students,
    currentUser: { username: "admin", displayName: "Chủ quản trị" },
  };
}

function normalizeStudent(input, existing = {}) {
  const now = new Date().toISOString();
  const name = String(input.name || "").trim();
  const code = String(input.code || existing.code || "").trim().toUpperCase();
  const className = String(input.className || existing.className || "Lớp chính").trim();
  const month = String(input.month || currentMonthValue()).trim();
  const amount = Number(input.amount);
  const paid = Boolean(input.paid);

  if (!name) throw new Error("Thiếu tên học viên.");
  if (!code) throw new Error("Thiếu mã học viên.");
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Tháng không hợp lệ.");
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Số tiền không hợp lệ.");

  return {
    id: existing.id || crypto.randomUUID(),
    code,
    month,
    className: className || "Lớp chính",
    name,
    amount,
    paid,
    paidAt: paid ? input.paidAt || existing.paidAt || now : "",
    updatedAt: now,
    note: String(input.note || "").trim(),
    owner: "admin",
  };
}

function previousMonthValue(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthTokens(monthValue) {
  const [year, month] = monthValue.split("-");
  const monthNumber = String(Number(month));
  return [`${year}${month}`, `${year}-${month}`, `${month}-${year}`, `T${monthNumber}-${year}`, `T${monthNumber}${year}`];
}

function webhookAuthorized(req, url) {
  const headerSecret = req.headers["x-webhook-secret"];
  const querySecret = url.searchParams.get("secret");
  return headerSecret === WEBHOOK_SECRET || querySecret === WEBHOOK_SECRET;
}

function normalizeWebhookTransactions(body) {
  const transactionFrom = (transaction) => ({
    content: String(
      transaction.description ||
        transaction.transferContent ||
        transaction.content ||
        transaction.addInfo ||
        transaction.note ||
        transaction.orderCode ||
        "",
    ).toUpperCase(),
    amount: transaction.amount || transaction.transferAmount || transaction.money || transaction.value,
    paidAt:
      transaction.transactionDateTime ||
      transaction.transactionDatetime ||
      transaction.transactionDate ||
      transaction.paidAt ||
      "",
    reference: transaction.reference || transaction.transactionCode || transaction.id || transaction.paymentLinkId || "",
  });

  if (body.transaction) {
    return [transactionFrom(body.transaction)];
  }

  if (Array.isArray(body.data)) {
    return body.data.map(transactionFrom);
  }

  if (body.data?.records && Array.isArray(body.data.records)) {
    return body.data.records.map(transactionFrom);
  }

  if (body.data && typeof body.data === "object") {
    return [transactionFrom(body.data)];
  }

  return [
    transactionFrom(body),
  ];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function codeAliases(code) {
  const normalized = code.toUpperCase().trim();
  return Array.from(new Set([normalized, normalized.replace(/[^A-Z0-9]/g, "")])).filter(Boolean);
}

function contentHasStudentCode(content, student) {
  return codeAliases(student.code).some((alias) => {
    const code = escapeRegExp(alias);
    const exactCodePattern = new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`);
    const tuitionCodePattern = new RegExp(`HP[-_\\s]*${code}([^A-Z0-9]|$)`);
    return exactCodePattern.test(content) || tuitionCodePattern.test(content);
  });
}

function contentHasStudentMonth(content, student) {
  return codeAliases(student.code).some((alias) => {
    return monthTokens(student.month).some((token) => {
      const code = escapeRegExp(alias);
      const month = escapeRegExp(token.toUpperCase());
      const compactPattern = new RegExp(`HP[-_\\s]*${code}[-_\\s]*${month}([^A-Z0-9]|$)`);
      const looseMonthPattern = new RegExp(`(^|[^A-Z0-9])${month}([^A-Z0-9]|$)`);
      return compactPattern.test(content) || (contentHasStudentCode(content, student) && looseMonthPattern.test(content));
    });
  });
}

function findStudentForTransaction(students, month, content) {
  const sortedStudents = [...students].sort((a, b) => b.code.length - a.code.length);
  const monthMatchedStudent = sortedStudents.find((student) => contentHasStudentMonth(content, student));

  if (monthMatchedStudent) return monthMatchedStudent;

  const matchingStudents = sortedStudents
    .filter((student) => contentHasStudentCode(content, student))
    .sort((a, b) => b.code.length - a.code.length);

  const unpaidStudent = matchingStudents
    .filter((student) => !student.paid)
    .sort((a, b) => a.month.localeCompare(b.month))[0];

  if (unpaidStudent) return unpaidStudent;

  return matchingStudents.find((student) => student.month === month);
}

function displayMonth(monthValue) {
  const [year, month] = monthValue.split("-");
  return `${month}/${year}`;
}

function displayDate(dateValue) {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function serveFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fileName = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  if (fileName === "data.json" || fileName.startsWith(".") || fileName.includes("/.")) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Không tìm thấy trang.");
    return;
  }

  const safePath = path.normalize(fileName).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Không tìm thấy trang.");
    return;
  }

  const ext = path.extname(filePath);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const data = readData();

  try {
    if (req.method === "GET" && url.pathname === "/api/public") {
      sendJson(res, 200, publicData(data));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/admin") {
      if (!requireAdmin(req, res)) return;
      sendJson(res, 200, adminData(data));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/login") {
      const body = await getBody(req);
      const password = String(body.password || "");

      if (!verifyPassword(password, data.adminPasswordHash)) {
        sendJson(res, 401, { error: "Mật khẩu không đúng." });
        return;
      }

      const token = crypto.randomBytes(24).toString("hex");
      sessions.set(token, { username: "admin", displayName: "Chủ quản trị" });
      res.setHeader("Set-Cookie", `admin_token=${token}; HttpOnly; SameSite=Lax; Path=/`);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/register") {
      sendJson(res, 410, { error: "Đã tắt đăng ký tài khoản. Trang này chỉ dùng một mật khẩu quản trị." });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/logout") {
      const token = parseCookies(req).admin_token;
      if (token) sessions.delete(token);
      res.setHeader("Set-Cookie", "admin_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "PUT" && url.pathname === "/api/password") {
      if (!requireAdmin(req, res)) return;
      const body = await getBody(req);
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");

      if (!verifyPassword(currentPassword, data.adminPasswordHash)) {
        sendJson(res, 401, { error: "Mật khẩu hiện tại không đúng." });
        return;
      }

      if (newPassword.length < 4) {
        sendJson(res, 400, { error: "Mật khẩu mới cần ít nhất 4 ký tự." });
        return;
      }

      data.adminPasswordHash = createPasswordHash(newPassword);
      writeData(data);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "PUT" && url.pathname === "/api/settings") {
      if (!requireAdmin(req, res)) return;
      const body = await getBody(req);
      data.schoolName = String(body.schoolName || data.schoolName || "Lớp học").trim();
      data.schedule = String(body.schedule || "").trim() || "Chưa cập nhật lịch học";
      data.bank = {
        owner: String(body.bank?.owner || "").trim(),
        bankName: String(body.bank?.bankName || "").trim(),
        bankCode: String(body.bank?.bankCode || "MB").trim().toUpperCase(),
        accountNumber: String(body.bank?.accountNumber || "").trim(),
        transferNote: String(body.bank?.transferNote || "HP-{MA_HOC_VIEN}-{THANG}").trim(),
      };
      writeData(data);
      sendJson(res, 200, adminData(data));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/students") {
      if (!requireAdmin(req, res)) return;
      const student = normalizeStudent(await getBody(req));
      data.students.push(student);
      writeData(data);
      sendJson(res, 201, student);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/rollover-students") {
      if (!requireAdmin(req, res)) return;
      const body = await getBody(req);
      const targetMonth = String(body.targetMonth || currentMonthValue()).trim();
      const sourceMonth = String(body.sourceMonth || previousMonthValue(targetMonth)).trim();

      if (!/^\d{4}-\d{2}$/.test(targetMonth) || !/^\d{4}-\d{2}$/.test(sourceMonth)) {
        sendJson(res, 400, { error: "Tháng không hợp lệ." });
        return;
      }

      const existingCodes = new Set(
        data.students
          .filter((student) => student.month === targetMonth)
          .map((student) => student.code),
      );
      const sourceStudents = data.students.filter((student) => student.month === sourceMonth);
      const now = new Date().toISOString();
      const created = [];

      sourceStudents.forEach((student) => {
        if (existingCodes.has(student.code)) return;

        const nextStudent = {
          id: crypto.randomUUID(),
          code: student.code,
          month: targetMonth,
          className: student.className || "Lớp chính",
          name: student.name,
          amount: student.amount,
          paid: false,
          paidAt: "",
          updatedAt: now,
          note: `Chưa thanh toán tháng ${displayMonth(targetMonth)} - tạo ngày ${displayDate(now)}`,
          owner: "admin",
        };
        data.students.push(nextStudent);
        created.push(nextStudent);
        existingCodes.add(student.code);
      });

      if (created.length > 0) {
        writeData(data);
      }

      sendJson(res, 200, { ok: true, sourceMonth, targetMonth, created });
      return;
    }

    const studentMatch = url.pathname.match(/^\/api\/students\/([^/]+)$/);
    if (studentMatch && req.method === "PUT") {
      if (!requireAdmin(req, res)) return;
      const id = studentMatch[1];
      const index = data.students.findIndex((student) => student.id === id);
      if (index < 0) {
        sendJson(res, 404, { error: "Không tìm thấy học viên." });
        return;
      }

      data.students[index] = normalizeStudent(await getBody(req), data.students[index]);
      writeData(data);
      sendJson(res, 200, data.students[index]);
      return;
    }

    if (studentMatch && req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      const id = studentMatch[1];
      data.students = data.students.filter((student) => student.id !== id);
      writeData(data);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/payment-webhook") {
      if (!webhookAuthorized(req, url)) {
        sendJson(res, 401, { error: "Webhook secret không hợp lệ." });
        return;
      }

      const body = await getBody(req);
      const month = String(body.month || currentMonthValue()).trim();
      const now = new Date().toISOString();
      const transactions = normalizeWebhookTransactions(body);
      const matched = [];
      const unmatched = [];

      transactions.forEach((transaction) => {
        const student = findStudentForTransaction(data.students, month, transaction.content);

        if (!student) {
          unmatched.push(transaction.content);
          return;
        }

        student.paid = true;
        student.paidAt = transaction.paidAt || now;
        student.updatedAt = now;
        student.note = `Đã thanh toán tháng ${displayMonth(student.month)} - ngày ${displayDate(student.paidAt)}${
          transaction.amount ? ` - ${transaction.amount}` : ""
        }`;
        matched.push({ id: student.id, code: student.code, name: student.name, reference: transaction.reference });
      });

      if (matched.length > 0) {
        writeData(data);
      }

      sendJson(res, 200, { ok: true, matched, unmatched });
      return;
    }

    sendJson(res, 404, { error: "API không tồn tại." });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }

  serveFile(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Website học phí đang chạy tại http://${HOST}:${PORT}`);
  console.log(`Mật khẩu quản trị mặc định: ${ADMIN_PASSWORD}`);
  console.log(`Webhook secret mặc định: ${WEBHOOK_SECRET}`);
});
