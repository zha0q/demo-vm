# 第一阶段：构建产物
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建项目
RUN npm run build

# 第二阶段：运行时环境
FROM nginx:alpine

# 删除 Nginx 默认配置
RUN rm -rf /etc/nginx/conf.d/*

# 创建 Nginx 配置
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    # 启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json;
    gzip_vary on;
    gzip_comp_level 6;
    
    # 设置根目录
    root /usr/share/nginx/html;
    index index.html index.htm;
    
    # SPA 路由配置：所有非文件请求都指向 index.html
    location / {
        try_files $uri $uri/ /index.html;
        
        # 禁用缓存 HTML
        if ($request_filename ~* \.html?$) {
            add_header Cache-Control "public, must-revalidate, proxy-revalidate, max-age=0";
        }
    }
    
    # 静态资源配置：启用长期缓存
    location ~* ^/assets/.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    
    # 健康检查端点
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# 从构建阶段复制产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
