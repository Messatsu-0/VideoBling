# Railway 部署（最简合规公网访问）

目标：不购买云服务器、不使用内网穿透，让远程用户通过公网 URL 访问 VideoBling。

## 架构

- `backend` 服务：同一个容器内同时运行 API + Huey Worker（共享 `/app/runtime`）。
- `web` 服务：Vite 前端，仅对外暴露此服务的公网域名。
- `backend` 不开公网，仅通过 Railway 内网域名供 `web` 访问。

## 1. 创建 Railway 项目

1. 打开 Railway，新建项目并连接当前仓库。
2. 在项目内创建两个服务：`backend` 和 `web`。

## 2. 配置 backend 服务

### 基础设置

- Source Repo：当前仓库
- Builder：Dockerfile
- Dockerfile Path：`backend/Dockerfile`
- Start Command：`sh backend/scripts/start_api_worker.sh`

### 环境变量

- `PORT=8000`
- `PYTHONPATH=/app/backend`
- `HUEY_WORKERS=1`（可选，默认就是 1）
- 可直接参考：`deploy/railway/backend.env.example`

### 存储与健康检查

- 挂载 Volume 到：`/app/runtime`
- Healthcheck Path：`/api/health`

## 3. 配置 web 服务

### 基础设置

- Source Repo：当前仓库
- Builder：Dockerfile
- Dockerfile Path：`web/Dockerfile`
- Start Command：保持默认（Dockerfile 内 `npm run dev`）

### 环境变量

- `API_PROXY_TARGET=http://backend.railway.internal:8000`
- 可直接参考：`deploy/railway/web.env.example`

如果你的 backend 服务名不是 `backend`，替换为实际服务名：

- `API_PROXY_TARGET=http://<your-backend-service>.railway.internal:8000`

## 4. 暴露公网入口

1. 只给 `web` 服务生成公网域名（`*.up.railway.app`）。
2. 不给 `backend` 服务生成公网域名。
3. 对外只分享 `web` 服务 URL。

## 5. 成本与风险控制

1. 在 Railway 项目中设置月预算告警（例如 `$5`）。
2. 演示结束后可暂停服务，避免空转费用。
3. 当前默认无登录鉴权，URL 仅分享给目标用户。

## 6. 验收清单

1. 打开 `https://<web-domain>/` 能进入页面。
2. 页面侧 `/api/health` 返回正常。
3. 上传视频并创建任务成功。
4. 任务状态可从 pending/running 到 finished。
5. 能下载 `final_video`。
6. 连续跑 3 个任务，worker 不丢失（若异常，查看 backend logs）。

## 参考文档

- Railway Public Networking: https://docs.railway.com/reference/public-networking
- Railway Domains: https://docs.railway.com/networking/domains
- Railway Dockerfiles: https://docs.railway.com/builds/dockerfiles
- Railway Volumes: https://docs.railway.com/volumes/reference
- Railway Pricing: https://railway.com/pricing
