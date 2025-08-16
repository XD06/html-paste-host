import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const pagesDir = path.join(__dirname, "pages");
const indexFile = path.join(pagesDir, "index.json");
const uploadDir = path.join(__dirname, "public/uploads");

if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(indexFile)) fs.writeFileSync(indexFile, "[]");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/pages", express.static(pagesDir));

// 处理缩略图上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

function loadPages() {
  return JSON.parse(fs.readFileSync(indexFile, "utf8"));
}

function savePages(pages) {
  fs.writeFileSync(indexFile, JSON.stringify(pages, null, 2));
}

app.get("/", (req, res) => {
  const pages = loadPages().sort((a, b) => b.time - a.time);
  res.render("index", { pages });
});

app.get("/new", (req, res) => {
  res.render("new");
});

app.post("/create", upload.single("thumbnailFile"), (req, res) => {
  const { name, code, thumbnailUrl } = req.body;
  if (!name || !code) return res.send("请输入名称和代码！");

  const slug = name.replace(/\s+/g, "-").toLowerCase();
  const filePath = path.join(pagesDir, `${slug}.html`);

  fs.writeFileSync(filePath, code, "utf8");

  let thumbnail = "";
  if (req.file) {
    thumbnail = `/uploads/${req.file.filename}`;
  } else if (thumbnailUrl) {
    thumbnail = thumbnailUrl;
  }

  const pages = loadPages();
  pages.push({ name, slug, time: Date.now(), thumbnail });
  savePages(pages);

  res.redirect("/");
});

app.get("/:slug", (req, res) => {
  const slug = req.params.slug;
  const filePath = path.join(pagesDir, `${slug}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("页面不存在");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
