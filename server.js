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

// 默认缩略图集合
const DEFAULT_THUMBNAILS = [
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1523800503107-5bc3ba2a6f81?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&h=300&fit=crop"
];

function getRandomThumbnail() {
  return DEFAULT_THUMBNAILS[Math.floor(Math.random() * DEFAULT_THUMBNAILS.length)];
}

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
  res.render("new", { page: null, isEdit: false });
});

// 统计数据 API
app.get("/api/stats", (req, res) => {
  const pages = loadPages();
  const totalPages = pages.length;
  const totalViews = pages.reduce((sum, page) => sum + (page.views || 0), 0);
  const recentlyCreated = pages.filter(page => 
    Date.now() - page.time < 7 * 24 * 60 * 60 * 1000
  ).length; // 一周内创建的页面数
  
  const mostViewed = pages
    .filter(page => page.views > 0)
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5)
    .map(page => ({
      name: page.name,
      slug: page.slug,
      views: page.views || 0
    }));
  
  // 计算总标签数（从客户端本地存储获取，这里先返回0）
  const totalTags = 0;
  
  res.json({
    totalPages,
    totalViews,
    recentlyCreated,
    mostViewed,
    totalTags,
    avgViewsPerPage: totalPages > 0 ? Math.round(totalViews / totalPages * 100) / 100 : 0,
    lastWeekViews: pages.filter(page => 
      page.lastViewed && Date.now() - page.lastViewed < 7 * 24 * 60 * 60 * 1000
    ).reduce((sum, page) => sum + (page.views || 0), 0)
  });
});

// 页面标签管理 API（简化版，使用 localStorage）
app.get("/api/pages/:slug/tags", (req, res) => {
  // 由于标签存储在客户端，返回空数组
  res.json([]);
});

app.put("/api/pages/:slug/tags", (req, res) => {
  // 标签管理在客户端处理，这里只返回成功状态
  res.json({ success: true, message: "标签已更新" });
});

// 页面搜索 API
app.get("/api/search", (req, res) => {
  const { q, tag, sort } = req.query;
  let pages = loadPages();
  
  // 搜索过滤
  if (q) {
    const searchTerm = q.toLowerCase();
    pages = pages.filter(page => 
      page.name.toLowerCase().includes(searchTerm) || 
      page.slug.toLowerCase().includes(searchTerm)
    );
  }
  
  // 标签过滤（这里简化处理）
  if (tag) {
    // 由于标签存储在客户端，这里不做过滤
  }
  
  // 排序
  switch(sort) {
    case 'time-desc':
      pages.sort((a, b) => b.time - a.time);
      break;
    case 'time-asc':
      pages.sort((a, b) => a.time - b.time);
      break;
    case 'views-desc':
      pages.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case 'name-asc':
      pages.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      pages.sort((a, b) => b.name.localeCompare(a.name));
      break;
    default:
      pages.sort((a, b) => b.time - a.time);
  }
  
  res.json({
    pages,
    total: pages.length
  });
});

// 批量导出 API
app.get("/api/export", (req, res) => {
  const pages = loadPages();
  const exportData = {
    pages,
    exportDate: new Date().toISOString(),
    version: "1.3.0",
    totalPages: pages.length,
    totalViews: pages.reduce((sum, page) => sum + (page.views || 0), 0)
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=html-paste-host-export-${new Date().toISOString().split('T')[0]}.json`);
  res.json(exportData);
});

// 健康检查 API
app.get("/api/health", (req, res) => {
  const pages = loadPages();
  const stats = {
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pages: pages.length,
    version: "1.3.0"
  };
  res.json(stats);
});

// 编辑页面路由
app.get("/edit/:slug", (req, res) => {
  const slug = req.params.slug;
  const pages = loadPages();
  const page = pages.find(p => p.slug === slug);
  
  if (!page) {
    return res.status(404).send("页面不存在");
  }
  
  const filePath = path.join(pagesDir, `${slug}.html`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("页面文件不存在");
  }
  
  const code = fs.readFileSync(filePath, "utf8");
  page.code = code;
  
  res.render("new", { page, isEdit: true });
});

app.post("/create", upload.single("thumbnailFile"), (req, res) => {
  const { name, code, thumbnailUrl, thumbnailOption } = req.body;
  if (!name || !code) return res.send("请输入名称和代码！");

  const slug = name.replace(/\s+/g, "-").toLowerCase();
  const filePath = path.join(pagesDir, `${slug}.html`);

  fs.writeFileSync(filePath, code, "utf8");

  let thumbnail = "";
  
  // 处理缩略图选项
  if (thumbnailOption === "file" && req.file) {
    thumbnail = `/uploads/${req.file.filename}`;
  } else if (thumbnailOption === "url" && thumbnailUrl) {
    thumbnail = thumbnailUrl;
  } else if (thumbnailOption === "random" || !thumbnailOption) {
    thumbnail = getRandomThumbnail();
  }

  const pages = loadPages();
  pages.push({ name, slug, time: Date.now(), thumbnail });
  savePages(pages);

  res.redirect("/");
});

// 更新页面路由
app.post("/update/:slug", upload.single("thumbnailFile"), (req, res) => {
  const slug = req.params.slug;
  const { name, code, thumbnailUrl, thumbnailOption } = req.body;
  
  if (!name || !code) return res.send("请输入名称和代码！");

  const pages = loadPages();
  const pageIndex = pages.findIndex(p => p.slug === slug);
  
  if (pageIndex === -1) {
    return res.status(404).send("页面不存在");
  }

  // 更新HTML文件
  const filePath = path.join(pagesDir, `${slug}.html`);
  fs.writeFileSync(filePath, code, "utf8");

  // 处理缩略图
  let thumbnail = pages[pageIndex].thumbnail; // 保持原有缩略图
  
  if (thumbnailOption === "file" && req.file) {
    thumbnail = `/uploads/${req.file.filename}`;
  } else if (thumbnailOption === "url" && thumbnailUrl) {
    thumbnail = thumbnailUrl;
  } else if (thumbnailOption === "random") {
    thumbnail = getRandomThumbnail();
  } else if (thumbnailOption === "keep") {
    // 保持原有缩略图，不做修改
  }

  // 更新页面信息
  pages[pageIndex] = {
    ...pages[pageIndex],
    name,
    thumbnail,
    updatedAt: Date.now()
  };
  
  savePages(pages);
  res.redirect("/");
});

// 删除页面路由
app.post("/delete/:slug", (req, res) => {
  const slug = req.params.slug;
  const pages = loadPages();
  const pageIndex = pages.findIndex(p => p.slug === slug);
  
  if (pageIndex === -1) {
    return res.status(404).send("页面不存在");
  }
  
  // 删除HTML文件
  const filePath = path.join(pagesDir, `${slug}.html`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  
  // 从索引中移除
  pages.splice(pageIndex, 1);
  savePages(pages);
  
  res.redirect("/");
});

app.get("/:slug", (req, res) => {
  const slug = req.params.slug;
  const filePath = path.join(pagesDir, `${slug}.html`);
  if (fs.existsSync(filePath)) {
    // 增加访问计数
    const pages = loadPages();
    const pageIndex = pages.findIndex(p => p.slug === slug);
    if (pageIndex !== -1) {
      pages[pageIndex].views = (pages[pageIndex].views || 0) + 1;
      pages[pageIndex].lastViewed = Date.now();
      savePages(pages);
    }
    
    res.sendFile(filePath);
  } else {
    res.status(404).send("页面不存在");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
