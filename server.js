// server.js
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const DATA_DIR = path.join(__dirname, "pages");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(INDEX_FILE)) fs.writeFileSync(INDEX_FILE, "[]", "utf-8");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true, limit: "2mb" })); // 适度放宽
app.use(express.static(path.join(__dirname, "public")));

// 工具：slugify
function slugify(input) {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// 工具：读取索引
function readIndex() {
  try {
    const raw = fs.readFileSync(INDEX_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

// 工具：写入索引
function writeIndex(list) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(list, null, 2), "utf-8");
}

// 首页：列表 + 搜索（前端完成）
app.get("/", (req, res) => {
  const pages = readIndex().sort((a, b) => new Date(b.time) - new Date(a.time));
  res.render("index", { pages });
});

// 新建页面
app.get("/new", (req, res) => {
  res.render("new");
});

// 创建
app.post("/create", (req, res) => {
  let { name, code } = req.body;

  if (!name || !code) {
    return res.status(400).send("缺少 name 或 code");
  }

  let base = slugify(name);
  if (!base) base = "page";

  // 避免重名：page, page-2, page-3 ...
  let slug = base;
  let n = 2;
  while (fs.existsSync(path.join(DATA_DIR, `${slug}.html`))) {
    slug = `${base}-${n++}`;
  }

  // 写入文件
  const filePath = path.join(DATA_DIR, `${slug}.html`);
  fs.writeFileSync(filePath, code, "utf-8");

  // 更新索引
  const list = readIndex();
  list.push({
    name: name.trim(),
    slug,
    time: new Date().toISOString()
  });
  writeIndex(list);

  // 返回首页
  res.redirect("/");
});

// 静态访问页面（放在最后，避免覆盖 /new /create 等路由）
app.get("/:slug", (req, res) => {
  const slug = slugify(req.params.slug);
  const filePath = path.join(DATA_DIR, `${slug}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("页面不存在");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
