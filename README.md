# HTML Paste Host (粘贴即发布)

一个极简但现代的在线 HTML 托管平台：在网页里粘贴 HTML、命名，点击发布，即可通过 `/<slug>` 访问。  
- 首页卡片式展示  
- `/new` 页面带实时预览（iframe srcdoc，防抖 400ms）  
- Docker 一键部署，pages 目录持久化

## 快速开始

```bash
# 服务器上
git clone <your-repo-or-copy-files> html-paste-host
cd html-paste-host

# 构建并启动（推荐）
docker compose up -d --build
# 或者
docker build -t html-paste-host .
docker run -d -p 80:3000 -v $(pwd)/pages:/app/pages --name html-paste-host html-paste-host
