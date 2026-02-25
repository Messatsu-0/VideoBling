# CloudBase Run 部署（中国大陆访问优先）

目标：使用腾讯云 CloudBase Run 将项目部署到中国大陆地域，提升大陆用户访问速度。

## 架构

- `backend` 服务：同容器内运行 API + Huey Worker。
- `web` 服务：React 生产静态站点（Caddy）+ `/api` 反向代理到 `backend`。
- 仅 `web` 暴露公网；`backend` 仅开内网访问。

## 0. 前置准备

1. 已有腾讯云账号并开通 CloudBase。
2. 仓库已推送到 GitHub：`Messatsu-0/VideoBling`。
3. CloudBase 环境建议选中国大陆地域（优先上海/华东）。

## 1. 创建 backend 服务

在 CloudBase Run 新建服务，选择 Git 仓库部署：

- 代码仓库：`Messatsu-0/VideoBling`
- 构建方式：`Dockerfile`
- 构建目录（Build Directory）：`/`
- Dockerfile 路径：`backend/Dockerfile`
- 启动命令：`sh /app/backend/scripts/start_api_worker.sh`
- 监听端口：`8000`

环境变量：

- 参考 `deploy/cloudbase/backend.env.example`
- 至少设置：
  - `PORT=8000`
  - `PYTHONPATH=/app/backend`
  - `HUEY_WORKERS=1`

网络设置：

- 公网访问：关闭
- 内网访问：开启（后续 `web` 通过内网域名访问）

伸缩设置（非常重要）：

- 固定为单实例运行（最小实例=1，最大实例=1）
- 原因：当前项目使用本地 SQLite 与本地任务目录，不适合多实例并发写入

## 2. 创建 web 服务

同样选择 Git 仓库部署：

- 代码仓库：`Messatsu-0/VideoBling`
- 构建方式：`Dockerfile`
- 构建目录（Build Directory）：`/`
- Dockerfile 路径：`web/Dockerfile`
- 启动命令：留空（使用 Dockerfile 默认命令）
- 监听端口：`5173`

环境变量：

- 参考 `deploy/cloudbase/web.env.example`
- 先设置：
  - `PORT=5173`
  - `API_PROXY_TARGET=http://<backend-inner-domain>:8000`

其中 `<backend-inner-domain>` 取自 backend 服务详情页的“内网访问域名”。

网络设置：

- 公网访问：开启（外部用户访问这个地址）
- 自定义域名：按需配置（商用建议）

## 3. 回填 API_PROXY_TARGET

1. 部署 backend 成功后，进入 backend 服务详情页，复制“内网访问域名”。
2. 回到 web 服务变量，把 `API_PROXY_TARGET` 改成：
   - `http://<复制到的内网域名>:8000`
3. 重新部署 web。

## 4. 验收

1. 打开 web 公网地址，页面可访问。
2. 访问 `https://<web-domain>/api/health` 返回 200。
3. 上传一个视频，任务可从 pending/running 到 finished。
4. 可下载 `final_video` 产物。

## 5. 当前版本限制（必须知晓）

1. 目前是“单机状态”架构：`runtime/*.sqlite` + 本地文件产物。
2. 若 backend 重建/迁移实例，本地数据可能丢失。
3. 生产化建议后续改造：
   - 队列和业务库迁移到托管数据库
   - 视频与中间产物迁移到对象存储
   - 再开启多实例伸缩

## 参考文档

- CloudBase Run Git 仓库部署（支持 Build Directory / Dockerfile 路径）：https://docs.cloudbase.net/run/deploy/deploy/deploying-git
- CloudBase Run 内网访问：https://docs.cloudbase.net/run/networking/internal-access
- CloudBase Run 公网访问：https://docs.cloudbase.net/run/networking/internet-access
- CloudBase Run 服务设置（内网域名、服务配置）：https://docs.cloudbase.net/run/deploy/configuring/service
