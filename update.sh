#!/bin/bash
set -e

echo "🔄 拉取最新代码..."
git pull

echo "🛠️ 重建镜像..."
docker-compose build --no-cache

echo "🚀 启动容器..."
docker-compose up -d

echo "✅ 更新完成！"
