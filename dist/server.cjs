var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express2 = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_ws2 = require("ws");
var import_url2 = require("url");

// api/index.ts
var import_express = __toESM(require("express"), 1);
var import_promise = __toESM(require("mysql2/promise"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_ws = require("ws");
var import_url = require("url");
var import_meta = {};
var __dirname;
try {
  __dirname = import_path.default.dirname((0, import_url.fileURLToPath)(import_meta.url));
} catch {
  __dirname = process.cwd();
}
var getPersistentRootDir = () => {
  let currDir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const hasConfig = import_fs.default.existsSync(import_path.default.join(currDir, "config"));
    const hasVersions = import_fs.default.existsSync(import_path.default.join(currDir, "versions"));
    const hasHbuilds = currDir.endsWith("hbuilds") || currDir.includes("hbuilds");
    if (hasConfig || hasVersions || hasHbuilds) {
      return currDir;
    }
    const parentDir = import_path.default.dirname(currDir);
    if (parentDir === currDir) break;
    currDir = parentDir;
  }
  try {
    const up3 = import_path.default.resolve(process.cwd(), "../../../");
    if (import_fs.default.existsSync(import_path.default.join(up3, "config")) || import_fs.default.existsSync(import_path.default.join(up3, "versions")) || up3.includes("hbuilds")) {
      return up3;
    }
    const up4 = import_path.default.resolve(process.cwd(), "../../../../");
    if (up4.includes("hbuilds")) {
      return up4;
    }
  } catch (e) {
  }
  return process.cwd();
};
var findAndLoadEnv = () => {
  const root = getPersistentRootDir();
  const envPathRoot = import_path.default.join(root, ".env");
  if (import_fs.default.existsSync(envPathRoot)) {
    import_dotenv.default.config({ path: envPathRoot });
  }
  let currDir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const envPath = import_path.default.join(currDir, ".env");
    if (import_fs.default.existsSync(envPath)) {
      import_dotenv.default.config({ path: envPath });
    }
    const parentDir = import_path.default.dirname(currDir);
    if (parentDir === currDir) break;
    currDir = parentDir;
  }
  import_dotenv.default.config();
};
findAndLoadEnv();
var app = (0, import_express.default)();
var wssInstance = null;
function setWssInstance(wss) {
  wssInstance = wss;
}
function broadcastWebSocketMessage(payload) {
  if (!wssInstance) return;
  const msgStr = JSON.stringify(payload);
  wssInstance.clients.forEach((client) => {
    if (client.readyState === import_ws.WebSocket.OPEN) {
      client.send(msgStr);
    }
  });
}
app.use((req, res, next) => {
  if (req.url.includes("/api/")) {
    const apiIndex = req.url.indexOf("/api/");
    req.url = req.url.substring(apiIndex);
  }
  next();
});
app.use(import_express.default.json({ limit: "10mb" }));
var getUploadDir = () => {
  if (process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim() !== "") {
    return process.env.UPLOAD_DIR;
  }
  const hostingerPath = "/home/u648273511/domains/attaroqqy.com/storage/uploads";
  try {
    if (!import_fs.default.existsSync(hostingerPath)) {
      import_fs.default.mkdirSync(hostingerPath, { recursive: true });
    }
    return hostingerPath;
  } catch (e) {
    try {
      return import_path.default.join(__dirname, "public", "uploads");
    } catch (err) {
      return import_path.default.join(process.cwd(), "public", "uploads");
    }
  }
};
console.log(">>> UPLOAD_DIR terdeteksi sebagai:", getUploadDir());
var uploadDirStatic = getUploadDir();
if (!import_fs.default.existsSync(uploadDirStatic)) {
  try {
    import_fs.default.mkdirSync(uploadDirStatic, { recursive: true });
  } catch (e) {
  }
}
app.use("/uploads", import_express.default.static(uploadDirStatic));
app.use("/api/uploads", import_express.default.static(uploadDirStatic));
app.use("/uploads", import_express.default.static(import_path.default.join(process.cwd(), "dist", "uploads")));
app.use("/api/uploads", import_express.default.static(import_path.default.join(process.cwd(), "dist", "uploads")));
var mysqlPool = null;
var memoryStore = /* @__PURE__ */ new Map();
function getMySQLPool() {
  const host = process.env.MYSQL_HOST || process.env.DB_HOST || "localhost";
  const user = process.env.MYSQL_USER || process.env.DB_USER;
  const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || process.env.DB_PASS || "";
  const database = process.env.MYSQL_DATABASE || process.env.DB_NAME || process.env.DB_DATABASE;
  const port = Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306);
  if (!user || !database) {
    return null;
  }
  if (!mysqlPool) {
    try {
      mysqlPool = import_promise.default.createPool({
        host,
        user,
        password,
        database,
        port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        dateStrings: true
      });
    } catch (err) {
      console.error("Gagal membuat koneksi MySQL Pool:", err.message);
      return null;
    }
  }
  return mysqlPool;
}
var VALID_TABLES = /* @__PURE__ */ new Set([
  "santri",
  "lembaga",
  "kelas",
  "kompleks",
  "kamar",
  "kategori_rombel",
  "kelompok_rombel",
  "rombel_assignment",
  "surat",
  "bendahara",
  "keamanan",
  "periode",
  "perizinan",
  "katalog_pelanggaran",
  "app_credentials",
  "pesantren_profile",
  "feedback",
  "permissions",
  "roles",
  "role_has_permissions",
  "document_generation_logs",
  "document_templates",
  "admin_chat",
  "tasks",
  "tugas"
]);
app.get("/api/db-status", async (req, res) => {
  const pool = getMySQLPool();
  if (pool) {
    try {
      await pool.query("SELECT 1");
      return res.json({
        connected: true,
        type: "mysql",
        host: process.env.MYSQL_HOST || process.env.DB_HOST || "localhost",
        database: process.env.MYSQL_DATABASE || process.env.DB_NAME || process.env.DB_DATABASE,
        reason: "connected"
      });
    } catch (err) {
      console.warn("MySQL ping failed:", err.message);
    }
  }
  res.json({
    connected: true,
    type: "memory",
    reason: "memory_store_active"
  });
});
app.get("/api/download-sql-mysql", (req, res) => {
  const filePath = import_path.default.join(process.cwd(), "hostinger_mysql_setup.sql");
  res.download(filePath, "hostinger_mysql_setup.sql", (err) => {
    if (err) {
      res.status(500).send("Gagal mengunduh skema SQL MySQL Hostinger");
    }
  });
});
app.get("/api/storage-stats", async (req, res) => {
  const pool = getMySQLPool();
  if (pool) {
    try {
      const dbName = process.env.MYSQL_DATABASE || process.env.DB_NAME || process.env.DB_DATABASE;
      const [rows] = await pool.query(
        "SELECT SUM(data_length + index_length) AS db_size FROM information_schema.TABLES WHERE table_schema = ?",
        [dbName]
      );
      const dbSize = rows?.[0]?.db_size ? Number(rows[0].db_size) : 125e4;
      return res.json({
        success: true,
        databaseSize: dbSize,
        bucketSize: 24e5,
        isFallback: false
      });
    } catch (err) {
    }
  }
  res.json({
    success: true,
    databaseSize: 125e4,
    bucketSize: 24e5,
    isFallback: true
  });
});
function stripPassword(table, data) {
  if (table !== "app_credentials" || !data) return data;
  if (Array.isArray(data)) {
    return data.map((item) => {
      const { password: password2, ...rest2 } = item;
      return rest2;
    });
  }
  const { password, ...rest } = data;
  return rest;
}
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const emailLower = (username || "").trim().toLowerCase();
  const defaultUser = "superadmin@attaroqqy.com";
  const defaultPass = "1234";
  const pool = getMySQLPool();
  if (pool) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM `app_credentials` WHERE LOWER(`username`) = ? LIMIT 1",
        [emailLower]
      );
      let matchedUser2 = rows?.[0];
      if (!matchedUser2 && emailLower === defaultUser && password === defaultPass) {
        const newId = "superadmin";
        await pool.query(
          "INSERT INTO `app_credentials` (`id`, `username`, `password`, `role`, `status`) VALUES (?, ?, ?, 'superadmin', 'approved') ON DUPLICATE KEY UPDATE `id`=`id`",
          [newId, defaultUser, defaultPass]
        );
        return res.json({
          success: true,
          user: {
            id: newId,
            username: defaultUser,
            role: "superadmin",
            status: "approved"
          }
        });
      }
      if (!matchedUser2) {
        return res.status(401).json({ success: false, error: "Email atau Kata Sandi salah atau akun Anda tidak terdaftar." });
      }
      if (matchedUser2.password !== password) {
        return res.status(401).json({ success: false, error: "Email atau Kata Sandi salah." });
      }
      if (matchedUser2.status === "pending") {
        return res.status(403).json({ success: false, error: "Sesi Tertunda: Pendaftaran akun Anda masih menunggu persetujuan (approval) dari Superadmin." });
      } else if (matchedUser2.status === "rejected") {
        return res.status(403).json({ success: false, error: "Akses Ditolak: Pendaftaran akun Anda ditolak oleh Superadmin." });
      }
      return res.json({
        success: true,
        needsCancelReset: matchedUser2.status === "minta_reset",
        user: {
          id: matchedUser2.id,
          username: matchedUser2.username,
          role: matchedUser2.role,
          status: matchedUser2.status,
          displayName: matchedUser2.display_name || matchedUser2.displayName,
          avatarUrl: matchedUser2.avatar_url || matchedUser2.avatarUrl
        }
      });
    } catch (err) {
      console.error("MySQL Auth login error:", err);
    }
  }
  const list = memoryStore.get("app_credentials") || [];
  let matchedUser = list.find((u) => (u.username || "").toLowerCase() === emailLower);
  if (!matchedUser && emailLower === defaultUser && password === defaultPass) {
    matchedUser = {
      id: "superadmin",
      username: defaultUser,
      password: defaultPass,
      role: "superadmin",
      status: "approved"
    };
    list.push(matchedUser);
    memoryStore.set("app_credentials", list);
  }
  if (!matchedUser) {
    return res.status(401).json({ success: false, error: "Email atau Kata Sandi salah atau akun Anda tidak terdaftar." });
  }
  if (matchedUser.password !== password) {
    return res.status(401).json({ success: false, error: "Email atau Kata Sandi salah." });
  }
  if (matchedUser.status === "pending") {
    return res.status(403).json({ success: false, error: "Sesi Tertunda: Pendaftaran akun Anda masih menunggu persetujuan (approval) dari Superadmin." });
  } else if (matchedUser.status === "rejected") {
    return res.status(403).json({ success: false, error: "Akses Ditolak: Pendaftaran akun Anda ditolak oleh Superadmin." });
  }
  return res.json({
    success: true,
    needsCancelReset: matchedUser.status === "minta_reset",
    user: {
      id: matchedUser.id,
      username: matchedUser.username,
      role: matchedUser.role,
      status: matchedUser.status,
      displayName: matchedUser.display_name || matchedUser.displayName,
      avatarUrl: matchedUser.avatar_url || matchedUser.avatarUrl
    }
  });
});
app.post("/api/upload", async (req, res) => {
  try {
    const { fileName, fileBase64, category } = req.body;
    if (!fileName || !fileBase64) {
      return res.status(400).json({ success: false, error: "fileName and fileBase64 are required" });
    }
    const subFolder = (category || "dokumen").replace(/[^a-zA-Z0-9_-]/g, "_");
    const buffer = Buffer.from(fileBase64, "base64");
    const uploadBase = getUploadDir();
    const targetDir = import_path.default.join(uploadBase, subFolder);
    if (!import_fs.default.existsSync(targetDir)) {
      import_fs.default.mkdirSync(targetDir, { recursive: true });
    }
    const targetFilePath = import_path.default.join(targetDir, fileName);
    import_fs.default.writeFileSync(targetFilePath, buffer);
    const publicUrl = `/api/uploads/${subFolder}/${fileName}`;
    res.json({
      success: true,
      path: publicUrl,
      publicUrl
    });
  } catch (err) {
    console.error("Storage upload handler error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/uploads/:category/:fileName", (req, res) => {
  try {
    const { category, fileName } = req.params;
    const safeCategory = (category || "dokumen").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeFileName = (fileName || "").replace(/[^a-zA-Z0-9_.-]/g, "_");
    const uploadBase = getUploadDir();
    const targetFilePath = import_path.default.join(uploadBase, safeCategory, safeFileName);
    if (import_fs.default.existsSync(targetFilePath)) {
      return res.sendFile(targetFilePath);
    }
    res.status(404).json({ error: "File not found" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
function deleteFileByUrlOrPath(fileUrlOrPath) {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== "string") return;
  try {
    let cleanPath = fileUrlOrPath.trim();
    if (cleanPath.startsWith("/api/uploads/")) {
      cleanPath = cleanPath.replace("/api/uploads/", "");
    } else if (cleanPath.startsWith("/uploads/")) {
      cleanPath = cleanPath.replace("/uploads/", "");
    } else if (cleanPath.includes("/uploads/")) {
      const idx = cleanPath.indexOf("/uploads/");
      cleanPath = cleanPath.substring(idx + 9);
    }
    const uploadBase = getUploadDir();
    const fullPath = import_path.default.join(uploadBase, cleanPath);
    const resolvedUploadBase = import_path.default.resolve(uploadBase);
    const resolvedFullPath = import_path.default.resolve(fullPath);
    if (resolvedFullPath.startsWith(resolvedUploadBase) && import_fs.default.existsSync(resolvedFullPath)) {
      import_fs.default.unlinkSync(resolvedFullPath);
      console.log(">>> Berhasil auto-delete file dari storage:", resolvedFullPath);
    }
  } catch (err) {
    console.warn("Gagal auto-delete file dari storage:", err.message);
  }
}
function collectFileUrls(obj, urls = /* @__PURE__ */ new Set()) {
  if (!obj) return urls;
  if (typeof obj === "string") {
    let s = obj.trim();
    if (s.includes("/uploads/") || s.includes("/api/uploads/")) {
      urls.add(s);
    }
    if (s.startsWith("{") && s.endsWith("}") || s.startsWith("[") && s.endsWith("]")) {
      try {
        const parsed = JSON.parse(s);
        collectFileUrls(parsed, urls);
      } catch (e) {
      }
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      collectFileUrls(item, urls);
    }
  } else if (typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      collectFileUrls(obj[key], urls);
    }
  }
  return urls;
}
function extractAndCleanFilesFromRecord(record) {
  if (!record || typeof record !== "object") return;
  const urls = collectFileUrls(record);
  for (const url of urls) {
    deleteFileByUrlOrPath(url);
  }
}
function cleanupReplacedFiles(oldRecord, newRecord) {
  if (!oldRecord || !newRecord) return;
  const oldUrls = collectFileUrls(oldRecord);
  const newUrls = collectFileUrls(newRecord);
  for (const url of oldUrls) {
    if (!newUrls.has(url)) {
      deleteFileByUrlOrPath(url);
    }
  }
}
app.post("/api/delete-file", async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) {
      return res.status(400).json({ success: false, error: "fileUrl is required" });
    }
    deleteFileByUrlOrPath(fileUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
function packPendidikanFormal(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (Array.isArray(payload)) return payload.map(packPendidikanFormal);
  const copy = { ...payload };
  const pfVal = String(copy.pendidikan_formal ?? copy.pendidikanFormal ?? "").trim();
  if (pfVal && pfVal.toLowerCase() !== "tanpa kelas" && pfVal.toLowerCase() !== "tidak terdaftar" && pfVal.toLowerCase() !== "tidak sekolah") {
    let existingNotes = (copy.catatan || "").replace(/\[PF:.*?\]\s*/g, "").trim();
    copy.catatan = `[PF:${pfVal}] ${existingNotes}`.trim();
    copy.pendidikan_formal = pfVal;
    copy.pendidikanFormal = pfVal;
  } else {
    if (copy.catatan && typeof copy.catatan === "string") {
      copy.catatan = copy.catatan.replace(/\[PF:.*?\]\s*/g, "").trim() || null;
    }
    copy.pendidikan_formal = null;
    copy.pendidikanFormal = null;
  }
  return copy;
}
function unpackPendidikanFormal(data) {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(unpackPendidikanFormal);
  if (typeof data === "object") {
    const copy = { ...data };
    if (copy.catatan && typeof copy.catatan === "string" && copy.catatan.includes("[PF:")) {
      const match = copy.catatan.match(/\[PF:(.*?)\]/);
      if (match && match[1]) {
        copy.pendidikan_formal = match[1];
        copy.pendidikanFormal = match[1];
        copy.catatan = copy.catatan.replace(/\[PF:.*?\]\s*/g, "").trim() || null;
      }
    } else {
      const val = copy.pendidikan_formal || copy.pendidikanFormal || null;
      copy.pendidikan_formal = val;
      copy.pendidikanFormal = val;
    }
    return copy;
  }
  return data;
}
function sanitizePayload(payload) {
  if (!payload) return payload;
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item));
  }
  if (typeof payload === "object") {
    const cleaned = { ...payload };
    for (const key of Object.keys(cleaned)) {
      if (cleaned[key] === "") {
        cleaned[key] = null;
      } else if (typeof cleaned[key] === "object" && cleaned[key] !== null) {
        cleaned[key] = sanitizePayload(cleaned[key]);
      }
    }
    return cleaned;
  }
  return payload;
}
async function ensureTableExists(table, pool) {
  if (table === "admin_chat") {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`admin_chat\` (
          \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
          \`sender_username\` VARCHAR(100) NULL,
          \`sender_name\` VARCHAR(100) NULL,
          \`sender_role\` VARCHAR(50) NULL,
          \`recipient_role\` VARCHAR(50) NULL,
          \`message\` LONGTEXT NULL,
          \`sender\` VARCHAR(100) NULL,
          \`senderRole\` VARCHAR(50) NULL,
          \`senderAvatar\` TEXT NULL,
          \`text\` LONGTEXT NULL,
          \`timestamp\` VARCHAR(100) NULL,
          \`channel\` VARCHAR(50) DEFAULT 'semua',
          \`mentions\` LONGTEXT NULL,
          \`attachment\` LONGTEXT NULL,
          \`reply_to\` LONGTEXT NULL,
          \`replyTo\` LONGTEXT NULL,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      const columnsToEnsure = ["sender_username", "sender_name", "sender_role", "sender_avatar", "recipient_role", "message", "text", "timestamp", "sender", "senderRole", "reply_to"];
      for (const col of columnsToEnsure) {
        try {
          await pool.query(`ALTER TABLE \`admin_chat\` ADD COLUMN \`${col}\` LONGTEXT NULL`);
        } catch (e) {
        }
      }
    } catch (e) {
      console.warn("Could not auto-create admin_chat table:", e);
    }
  } else if (table === "lembaga") {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`lembaga\` (
          \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,
          \`nama\` VARCHAR(100) NOT NULL,
          \`kode\` VARCHAR(20) NOT NULL,
          \`deskripsi\` LONGTEXT NULL,
          \`gender\` VARCHAR(10) DEFAULT 'Putra',
          \`jenis\` VARCHAR(20) DEFAULT 'Internal',
          \`logo\` LONGTEXT NULL,
          \`ta_mulai_tanggal\` INT DEFAULT 1,
          \`ta_mulai_bulan\` INT DEFAULT 7,
          \`ta_selesai_tanggal\` INT DEFAULT 30,
          \`ta_selesai_bulan\` INT DEFAULT 6,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      const cols = ["logo", "deskripsi", "kode", "gender", "jenis", "ta_mulai_tanggal", "ta_mulai_bulan", "ta_selesai_tanggal", "ta_selesai_bulan"];
      for (const col of cols) {
        try {
          await pool.query(`ALTER TABLE \`lembaga\` ADD COLUMN \`${col}\` LONGTEXT NULL`);
        } catch (e) {
        }
      }
    } catch (e) {
      console.warn("Could not auto-create lembaga table:", e);
    }
  } else if (table === "tugas" || table === "tasks") {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`tugas\` (
          \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
          \`user_id\` VARCHAR(100) NULL,
          \`username\` VARCHAR(100) NULL,
          \`text\` LONGTEXT NULL,
          \`judul\` VARCHAR(255) NULL,
          \`description\` LONGTEXT NULL,
          \`deskripsi\` LONGTEXT NULL,
          \`status\` VARCHAR(50) DEFAULT 'pending',
          \`deadline_timestamp\` BIGINT NULL,
          \`deadlineTimestamp\` BIGINT NULL,
          \`color\` VARCHAR(50) DEFAULT 'yellow',
          \`prioritas\` VARCHAR(20) DEFAULT 'Sedang',
          \`tenggat_waktu\` DATE NULL,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`createdAt\` BIGINT NULL,
          \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`tasks\` (
          \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
          \`user_id\` VARCHAR(100) NULL,
          \`username\` VARCHAR(100) NULL,
          \`text\` LONGTEXT NULL,
          \`title\` VARCHAR(255) NULL,
          \`description\` LONGTEXT NULL,
          \`status\` VARCHAR(50) DEFAULT 'pending',
          \`deadline_timestamp\` BIGINT NULL,
          \`color\` VARCHAR(50) DEFAULT 'yellow',
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      const tugasCols = ["text", "description", "deadline_timestamp", "deadlineTimestamp", "color", "createdAt", "user_id", "username", "judul", "deskripsi", "status", "prioritas", "tenggat_waktu"];
      for (const col of tugasCols) {
        try {
          await pool.query(`ALTER TABLE \`tugas\` ADD COLUMN \`${col}\` LONGTEXT NULL`);
        } catch (e) {
        }
        try {
          await pool.query(`ALTER TABLE \`tasks\` ADD COLUMN \`${col}\` LONGTEXT NULL`);
        } catch (e) {
        }
      }
    } catch (e) {
      console.warn("Could not auto-create tasks/tugas table:", e);
    }
  }
}
async function getTableColumns(table, pool) {
  try {
    const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
    if (Array.isArray(rows)) {
      return new Set(rows.map((r) => r.Field));
    }
  } catch (err) {
    console.warn(`Could not get columns for ${table}:`, err);
  }
  return null;
}
async function tryMySQLQuery(sql, params = []) {
  const pool = getMySQLPool();
  if (!pool) return { success: false, error: "NO_MYSQL" };
  try {
    const [rows] = await pool.query(sql, params);
    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err };
  }
}
app.get("/api/db/:table", async (req, res) => {
  const { table } = req.params;
  if (!VALID_TABLES.has(table)) {
    return res.status(400).json({ success: false, error: `Tabel '${table}' tidak valid` });
  }
  const pool = getMySQLPool();
  if (pool) {
    await ensureTableExists(table, pool);
  }
  const mysqlRes = await tryMySQLQuery(`SELECT * FROM \`${table}\``);
  if (mysqlRes.success) {
    let finalData2 = stripPassword(table, mysqlRes.rows || []);
    if (table === "santri") {
      finalData2 = unpackPendidikanFormal(finalData2);
    }
    return res.json({ success: true, data: finalData2 });
  }
  let data = memoryStore.get(table) || [];
  let finalData = stripPassword(table, data);
  if (table === "santri") {
    finalData = unpackPendidikanFormal(finalData);
  }
  res.json({ success: true, data: finalData });
});
app.post("/api/db/:table", async (req, res) => {
  const { table } = req.params;
  if (!VALID_TABLES.has(table)) {
    return res.status(400).json({ success: false, error: `Tabel '${table}' tidak valid` });
  }
  let sanitizedBody = sanitizePayload(req.body);
  if (table === "kelas") {
    delete sanitizedBody.tingkatan;
    delete sanitizedBody.kapasitas;
    delete sanitizedBody.tingkatan_kelas;
    delete sanitizedBody.kapasitas_kelas;
  } else if (table === "santri") {
    sanitizedBody = packPendidikanFormal(sanitizedBody);
  }
  const rowsToInsert = Array.isArray(sanitizedBody) ? sanitizedBody : [sanitizedBody];
  const insertedResults = [];
  const pool = getMySQLPool();
  if (pool) {
    await ensureTableExists(table, pool);
    const existingColumns = await getTableColumns(table, pool);
    try {
      for (const row of rowsToInsert) {
        if (!row.id) {
          row.id = String(Date.now()) + Math.random().toString(36).substring(2, 7);
        }
        let existingRow = null;
        try {
          const [eRows] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`id\` = ? LIMIT 1`, [row.id]);
          if (eRows?.[0]) existingRow = eRows[0];
        } catch (e) {
        }
        if (!existingRow) {
          const list2 = memoryStore.get(table) || [];
          existingRow = list2.find((item) => item.id === row.id);
        }
        if (existingRow) {
          cleanupReplacedFiles(existingRow, row);
        }
        let keys = Object.keys(row);
        if (existingColumns) {
          keys = keys.filter((k) => existingColumns.has(k));
        }
        if (keys.length === 0) continue;
        const columns = keys.map((k) => `\`${k}\``).join(", ");
        const placeholders = keys.map(() => "?").join(", ");
        const values = keys.map((k) => typeof row[k] === "object" && row[k] !== null ? JSON.stringify(row[k]) : row[k]);
        const updateClause = keys.map((k) => `\`${k}\` = VALUES(\`${k}\`)`).join(", ");
        const sql = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;
        await pool.query(sql, values);
        insertedResults.push(row);
      }
    } catch (err) {
      console.warn(`MySQL POST /api/db/${table} error:`, err.message);
    }
  }
  let list = memoryStore.get(table) || [];
  for (const row of rowsToInsert) {
    if (!row.id) {
      row.id = String(Date.now()) + Math.random().toString(36).substring(2, 7);
    }
    const idx = list.findIndex((item) => item.id === row.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...row };
    } else {
      list.push(row);
    }
    if (insertedResults.length === 0) {
      insertedResults.push(row);
    }
  }
  memoryStore.set(table, list);
  let resultData = stripPassword(table, Array.isArray(sanitizedBody) ? insertedResults : insertedResults[0]);
  if (table === "santri") {
    resultData = unpackPendidikanFormal(resultData);
  }
  broadcastWebSocketMessage({
    event: "db_change",
    table,
    action: "insert",
    data: resultData
  });
  return res.json({ success: true, data: resultData });
});
app.put("/api/db/:table/:id", async (req, res) => {
  const { table, id } = req.params;
  if (!VALID_TABLES.has(table)) {
    return res.status(400).json({ success: false, error: `Tabel '${table}' tidak valid` });
  }
  let sanitizedBody = sanitizePayload(req.body);
  if (table === "kelas") {
    delete sanitizedBody.tingkatan;
    delete sanitizedBody.kapasitas;
    delete sanitizedBody.tingkatan_kelas;
    delete sanitizedBody.kapasitas_kelas;
  } else if (table === "santri") {
    sanitizedBody = packPendidikanFormal(sanitizedBody);
  }
  let updatedResult = { id, ...sanitizedBody };
  const pool = getMySQLPool();
  let existingOldRecord = null;
  if (pool) {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`id\` = ? LIMIT 1`, [id]);
      if (rows?.[0]) existingOldRecord = rows[0];
    } catch (e) {
    }
  }
  if (!existingOldRecord) {
    const list2 = memoryStore.get(table) || [];
    existingOldRecord = list2.find((item) => item.id === id);
  }
  if (existingOldRecord) {
    cleanupReplacedFiles(existingOldRecord, { id, ...sanitizedBody });
  }
  if (pool) {
    try {
      const existingColumns = await getTableColumns(table, pool);
      const updateData = { ...sanitizedBody };
      delete updateData.id;
      let keys = Object.keys(updateData);
      if (existingColumns) {
        keys = keys.filter((k) => existingColumns.has(k));
      }
      if (keys.length > 0) {
        const setClause = keys.map((k) => `\`${k}\` = ?`).join(", ");
        const values = keys.map((k) => typeof updateData[k] === "object" && updateData[k] !== null ? JSON.stringify(updateData[k]) : updateData[k]);
        values.push(id);
        const sql = `UPDATE \`${table}\` SET ${setClause} WHERE \`id\` = ?`;
        await pool.query(sql, values);
      }
      const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`id\` = ? LIMIT 1`, [id]);
      if (rows?.[0]) updatedResult = rows[0];
    } catch (err) {
      console.warn(`MySQL PUT /api/db/${table}/${id} error:`, err.message);
    }
  }
  let list = memoryStore.get(table) || [];
  const idx = list.findIndex((item) => item.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...sanitizedBody, id };
  } else {
    list.push({ id, ...sanitizedBody });
  }
  memoryStore.set(table, list);
  let resultData = stripPassword(table, updatedResult);
  if (table === "santri") {
    resultData = unpackPendidikanFormal(resultData);
  }
  broadcastWebSocketMessage({
    event: "db_change",
    table,
    action: "update",
    id,
    data: resultData
  });
  return res.json({ success: true, data: resultData });
});
app.delete("/api/db/:table/:id", async (req, res) => {
  const { table, id } = req.params;
  if (!VALID_TABLES.has(table)) {
    return res.status(400).json({ success: false, error: `Tabel '${table}' tidak valid` });
  }
  const pool = getMySQLPool();
  let existingRecordToDelete = null;
  if (pool) {
    try {
      if (table === "santri") {
        const [sRows] = await pool.query("SELECT * FROM `santri` WHERE `id` = ? LIMIT 1", [id]);
        if (sRows?.[0]) existingRecordToDelete = sRows[0];
        const santriNama = existingRecordToDelete?.nama;
        await pool.query("DELETE FROM `rombel_assignment` WHERE `santri_id` = ?", [id]);
        if (santriNama) {
          await pool.query("DELETE FROM `perizinan` WHERE `santri_id` = ? OR `nama_santri` = ?", [id, santriNama]);
          await pool.query("DELETE FROM `keamanan` WHERE `santri_id` = ? OR `nama_santri` = ?", [id, santriNama]);
          await pool.query("DELETE FROM `bendahara` WHERE `nama_santri` = ?", [santriNama]);
        } else {
          await pool.query("DELETE FROM `perizinan` WHERE `santri_id` = ?", [id]);
          await pool.query("DELETE FROM `keamanan` WHERE `santri_id` = ?", [id]);
        }
      } else {
        const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`id\` = ? LIMIT 1`, [id]);
        if (rows?.[0]) existingRecordToDelete = rows[0];
      }
    } catch (e) {
    }
  }
  if (!existingRecordToDelete) {
    const list2 = memoryStore.get(table) || [];
    existingRecordToDelete = list2.find((item) => item.id === id);
  }
  if (existingRecordToDelete) {
    extractAndCleanFilesFromRecord(existingRecordToDelete);
  }
  if (pool) {
    try {
      await pool.query(`DELETE FROM \`${table}\` WHERE \`id\` = ?`, [id]);
    } catch (err) {
      console.warn(`MySQL DELETE /api/db/${table}/${id} error:`, err.message);
    }
  }
  let list = memoryStore.get(table) || [];
  memoryStore.set(table, list.filter((item) => item.id !== id));
  broadcastWebSocketMessage({
    event: "db_change",
    table,
    action: "delete",
    id
  });
  return res.json({ success: true });
});
app.post("/api/sync-role-permissions", async (req, res) => {
  const { roleName, permissions } = req.body;
  const pool = getMySQLPool();
  if (pool) {
    try {
      const [rRows] = await pool.query("SELECT `id` FROM `roles` WHERE `name` = ? LIMIT 1", [roleName]);
      if (rRows && rRows.length > 0) {
        const roleId = rRows[0].id;
        const [pRows] = await pool.query("SELECT `id`, `name` FROM `permissions`");
        const enabledPermIds = (pRows || []).filter((p) => permissions.includes(p.name)).map((p) => p.id);
        await pool.query("DELETE FROM `role_has_permissions` WHERE `role_id` = ?", [roleId]);
        for (const pid of enabledPermIds) {
          await pool.query("INSERT INTO `role_has_permissions` (`role_id`, `permission_id`) VALUES (?, ?)", [roleId, pid]);
        }
      }
    } catch (err) {
      console.warn("Error sync role permissions MySQL:", err.message);
    }
  }
  broadcastWebSocketMessage({
    event: "db_change",
    table: "role_has_permissions",
    action: "update"
  });
  return res.json({ success: true });
});
app.post("/api/db-truncate-all", async (req, res) => {
  const tables = [
    "rombel_assignment",
    "keamanan",
    "bendahara",
    "perizinan",
    "document_generation_logs",
    "document_templates",
    "santri",
    "kamar",
    "kompleks",
    "kelompok_rombel",
    "kategori_rombel",
    "kelas",
    "lembaga",
    "surat",
    "periode",
    "katalog_pelanggaran",
    "feedback",
    "app_credentials",
    "pesantren_profile"
  ];
  const pool = getMySQLPool();
  if (pool) {
    try {
      await pool.query("SET FOREIGN_KEY_CHECKS = 0");
    } catch (e) {
      console.warn("Could not disable FK checks:", e);
    }
    try {
      for (const table of tables) {
        try {
          if (table === "app_credentials") {
            await pool.query("DELETE FROM `app_credentials` WHERE `id` != 'superadmin'");
          } else if (table === "periode") {
            await pool.query("DELETE FROM `periode` WHERE `id` != 'Semua'");
          } else if (table === "pesantren_profile") {
            await pool.query(
              "UPDATE `pesantren_profile` SET `nama_pesantren` = 'Pondok Pesantren Darussalam Al-Azhar', `nama_yayasan` = 'Yayasan Pendidikan Islam Darussalam' WHERE `id` = 'main'"
            );
          } else {
            await pool.query(`DELETE FROM \`${table}\``);
          }
        } catch (tableErr) {
          console.warn(`Error clearing table '${table}':`, tableErr.message);
        }
      }
    } finally {
      try {
        await pool.query("SET FOREIGN_KEY_CHECKS = 1");
      } catch (e) {
      }
    }
  }
  memoryStore.clear();
  broadcastWebSocketMessage({
    event: "db_change",
    action: "truncate_all"
  });
  return res.json({ success: true, message: "Seluruh data telah berhasil dikosongkan." });
});
var api_default = app;

// server.ts
var import_meta2 = {};
var __dirname2;
try {
  __dirname2 = import_path2.default.dirname((0, import_url2.fileURLToPath)(import_meta2.url));
} catch {
  __dirname2 = process.cwd();
}
import_dotenv2.default.config();
var PORT = 3e3;
async function startServer() {
  const httpServer = import_http.default.createServer(api_default);
  const wss = new import_ws2.WebSocketServer({ server: httpServer });
  setWssInstance(wss);
  const onlineUsers = /* @__PURE__ */ new Map();
  wss.on("connection", (ws) => {
    let connectedUserId = null;
    ws.send(JSON.stringify({ type: "connected", timestamp: Date.now() }));
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        } else if (msg.type === "presence_join" && msg.user) {
          connectedUserId = msg.user.id || Math.random().toString(36).substring(2);
          onlineUsers.set(connectedUserId, { ...msg.user, id: connectedUserId, lastSeen: Date.now() });
          broadcastWebSocketMessage({ type: "online_users", users: Array.from(onlineUsers.values()) });
        } else {
          broadcastWebSocketMessage(msg);
        }
      } catch (err) {
        console.error("Error handling WebSocket message:", err);
      }
    });
    ws.on("close", () => {
      if (connectedUserId && onlineUsers.has(connectedUserId)) {
        onlineUsers.delete(connectedUserId);
        broadcastWebSocketMessage({ type: "online_users", users: Array.from(onlineUsers.values()) });
      }
    });
    ws.on("error", (err) => {
      console.warn("WebSocket client error:", err.message);
    });
  });
  const uploadDir = process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim() !== "" ? process.env.UPLOAD_DIR : import_path2.default.join(__dirname2, "public", "uploads");
  const distUploadsPath = import_path2.default.join(process.cwd(), "dist", "uploads");
  if (!import_fs2.default.existsSync(uploadDir)) {
    try {
      import_fs2.default.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
    }
  }
  if (!import_fs2.default.existsSync(distUploadsPath)) {
    try {
      import_fs2.default.mkdirSync(distUploadsPath, { recursive: true });
    } catch (e) {
    }
  }
  api_default.use("/uploads", import_express2.default.static(uploadDir));
  api_default.use("/api/uploads", import_express2.default.static(uploadDir));
  api_default.use("/uploads", import_express2.default.static(distUploadsPath));
  api_default.use("/api/uploads", import_express2.default.static(distUploadsPath));
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    api_default.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    api_default.use(import_express2.default.static(distPath));
    api_default.use("/attaroqqy", import_express2.default.static(distPath));
    api_default.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running with Realtime WebSockets on http://localhost:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer();
}
var server_default = api_default;
//# sourceMappingURL=server.cjs.map
