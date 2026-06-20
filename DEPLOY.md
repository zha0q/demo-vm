# 🐳 部署指南

## 快速开始

### 方式一：使用 Docker Compose（推荐）

#### 1. 构建并启动容器

```bash
docker-compose up --build
```

容器启动后，访问 `http://localhost` 即可使用游戏。

#### 2. 查看容器状态

```bash
docker-compose ps
```

#### 3. 停止容器

```bash
docker-compose down
```

#### 4. 查看容器日志

```bash
docker-compose logs -f mahjong-game
```

---

### 方式二：使用 Docker 手动构建

#### 1. 构建镜像

```bash
docker build -t vita-mahjong-game:latest .
```

#### 2. 运行容器

```bash
docker run -d \
  --name vita-mahjong-game \
  -p 80:80 \
  --restart unless-stopped \
  vita-mahjong-game:latest
```

#### 3. 查看容器运行情况

```bash
docker logs -f vita-mahjong-game
```

#### 4. 停止容器

```bash
docker stop vita-mahjong-game
docker rm vita-mahjong-game
```

---

### 方式三：使用 build.sh 本地构建

如果不使用 Docker，可以本地构建：

```bash
chmod +x build.sh
./build.sh
```

构建产物会输出到 `./dist` 目录。

---

## 技术细节

### Dockerfile 多阶段构建

- **阶段 1（Builder）**: 基于 `node:20-alpine`
  - 安装依赖并编译 TypeScript + React 项目
  - 生成优化后的静态文件到 `dist` 目录

- **阶段 2（Runtime）**: 基于 `nginx:alpine`
  - 复制编译产物到 Nginx 服务目录
  - 配置 SPA 路由转发
  - 支持长期缓存和 gzip 压缩

### Nginx 配置特点

✅ **SPA 路由支持**: 所有非文件请求都指向 `index.html`
✅ **缓存策略**: 
  - 静态资源（JS/CSS/图片）: 365 天缓存
  - HTML 文件: 不缓存，每次获取最新

✅ **性能优化**: 
  - 启用 gzip 压缩
  - 支持 HTTP/2
  - 支持缓存验证

✅ **健康检查**: `/health` 端点用于容器健康检查

---

## 端口映射

| 容器内端口 | 宿主机端口 | 用途           |
|-----------|-----------|----------------|
| 80        | 80        | HTTP 网络游戏   |

---

## 环境变量

可通过 `docker-compose.yml` 中的 `environment` 配置：

- `TZ`: 时区（默认 `Asia/Shanghai`）

---

## 性能指标

| 项目 | 指标 |
|------|------|
| 最终镜像大小 | ~20MB（Nginx Alpine 基础镜像约 45MB + 静态产物） |
| 构建时间 | ~2-3 分钟（首次）/ ~1 分钟（缓存） |
| 启动时间 | <5 秒 |

---

## 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker logs vita-mahjong-game

# 查看容器详细信息
docker inspect vita-mahjong-game
```

### 端口被占用

```bash
# 查看占用 80 端口的进程
lsof -i :80

# 改用其他端口运行
docker run -d -p 8080:80 vita-mahjong-game:latest
```

### 内存/CPU 限制

```bash
docker run -d \
  --name vita-mahjong-game \
  -p 80:80 \
  -m 512m \
  --cpus=1 \
  vita-mahjong-game:latest
```

---

## 清理资源

```bash
# 删除容器
docker rm vita-mahjong-game

# 删除镜像
docker rmi vita-mahjong-game:latest

# 清理未使用的 Docker 资源
docker system prune
```

---

## 生产环境建议

1. **使用私有镜像仓库**: 推送镜像到 Docker Hub 或企业私有仓库
2. **配置反向代理**: 在 Nginx 前使用负载均衡（如 HAProxy）
3. **启用 HTTPS**: 使用 Let's Encrypt 证书配置 SSL/TLS
4. **监控告警**: 集成 Prometheus/Grafana 监控容器指标
5. **日志收集**: 使用 ELK/Loki 等收集容器日志
6. **自动部署**: 集成 CI/CD 管道（GitHub Actions/GitLab CI）

---

## 相关文件说明

| 文件 | 说明 |
|------|------|
| `Dockerfile` | 容器镜像定义文件 |
| `docker-compose.yml` | 容器编排配置文件 |
| `build.sh` | 本地构建脚本 |
| `.dockerignore` | Docker 构建时排除的文件 |

