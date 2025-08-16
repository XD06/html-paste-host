#!/usr/bin/env bash
set -euo pipefail

# ========= 配置（必要时修改） =========
# 是否自动清理悬空镜像（dangling）: true/false
PRUNE_DANGLING=true

# 是否在 down 时一并删除本地由 compose 构建的镜像（--rmi local）: true/false
REMOVE_LOCAL_IMAGES=true
# ======================================


# ensure we're in project dir (has docker-compose.yml or docker-compose.yaml)
if [[ ! -f "docker-compose.yml" && ! -f "docker-compose.yaml" ]]; then
  echo "错误：当前目录无 docker-compose.yml/yaml，请在项目根目录运行此脚本。"
  exit 1
fi

# get current git branch
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")"
echo "🔀 当前 git 分支: $BRANCH"

echo "🔁 获取远端更新..."
git fetch origin --prune

# try fast-forward pull to avoid merge commits; fallback to git pull if ff-only fails
if git rev-parse --verify --quiet "@{u}" >/dev/null 2>&1; then
  if git pull --ff-only origin "$BRANCH"; then
    echo "✅ git pull --ff-only 成功"
  else
    echo "⚠️ 无法快进合并（可能本地有改动或远端有冲突），改为普通 git pull ..."
    git pull || { echo "❌ git pull 失败，请手动解决冲突并重试"; exit 1; }
  fi
else
  echo "⚠️ 当前分支没有上游分支，执行普通 git pull ..."
  git pull || true
fi

# stop & remove existing containers & networks (and optionally local images)
DOWN_CMD=("$DCMD" "down" "--remove-orphans")
if [[ "$REMOVE_LOCAL_IMAGES" == "true" ]]; then
  DOWN_CMD+=("--rmi" "local")
fi

echo "🛑 停止并移除旧容器/网络（并移除本地构建镜像: ${REMOVE_LOCAL_IMAGES})..."
"${DOWN_CMD[@]}"

# optionally remove a previously named standalone container (if you used docker run)
# (uncomment if you want to forcibly remove container named html-paste-host)
# if docker ps -a --format '{{.Names}}' | grep -q '^html-paste-host$'; then
#   docker rm -f html-paste-host || true
# fi

echo "🛠️ 开始重建镜像（--no-cache）..."
$DCMD build --no-cache

echo "🚀 启动并后台运行（强制重建容器，移除孤立容器）..."
$DCMD up -d --force-recreate --remove-orphans

if [[ "$PRUNE_DANGLING" == "true" ]]; then
  echo "🧹 清理悬空镜像以释放空间..."
  docker image prune -f || true
fi

echo "✅ 更新完成！服务已用最新镜像启动。"
echo "提示：若需查看日志： $DCMD logs -f"
