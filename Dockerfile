# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .

# 数据目录（持久化）
VOLUME ["/app/pages"]

EXPOSE 3000
CMD ["node", "server.js"]
