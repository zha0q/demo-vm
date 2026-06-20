# 第一阶段：构建产物
FROM node:20-alpine AS builder

WORKDIR /app

# 确保本地安装的可执行文件在 PATH 中（例如 node_modules/.bin/tsc）
ENV PATH=/app/node_modules/.bin:$PATH

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖（包含 dev 依赖，确保构建工具如 tsc 可用）
RUN npm ci --include=dev

# 复制源代码
COPY . .

# 构建项目
RUN npm run build

# 第二阶段：运行时环境
FROM nginx:alpine

# 复制 Nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
