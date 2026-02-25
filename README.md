# VideoBling Local (MVP)

本项目实现本机可运行的完整链路：

1. 上传完整原视频
2. 截取前 N 秒做 ASR（豆包 ASR 2.0）
3. 用 Seed-2.0-Pro 做 ASR 文本纠错（可开关）
4. 用 Seed-2.0-Pro 生成荒诞吸睛前贴脚本（结构化 JSON）
5. 调用 Seedance 1.5 Pro 生成 5 秒前贴
6. 将前贴标准化后拼接到原始完整视频最前
7. 输出成片

## 目录

- `backend/` FastAPI + SQLAlchemy + Huey + ffmpeg pipeline
- `web/` React + Vite + Tailwind + Framer Motion + GSAP
- `runtime/` 本地运行数据（配置、队列、任务产物）
- `deploy/cloudbase/` CloudBase Run（中国大陆优先）部署文档
- `deploy/railway/` Railway 公网部署文档
- `tests/` 单测/集成/e2e

## 已实现接口

- `GET /api/health`
- `GET /api/config`
- `PUT /api/config`
- `GET /api/config/presets`
- `GET /api/config/presets/{preset_name}`
- `PUT /api/config/presets/{preset_name}`
- `DELETE /api/config/presets/{preset_name}`
- `POST /api/jobs` (multipart/form-data)
- `POST /api/jobs/{job_id}/rerun` (JSON: `start_stage`, `project_name?`)
- `GET /api/jobs`
- `GET /api/jobs/{job_id}`
- `DELETE /api/jobs/{job_id}` (`force=true` 可删除非终态任务)
- `GET /api/jobs/{job_id}/events` (SSE)
- `GET /api/jobs/{job_id}/artifacts/{kind}`
- `POST /api/jobs/cleanup`

支持的 artifact kind:

- `source_video`
- `asr_clip_audio`
- `transcript_raw`
- `transcript_polished`
- `hook_script_json`
- `hook_video_raw`
- `hook_video_norm`
- `final_video`

## 公网访问（合规）

不购买云服务器、且不使用任何内网穿透时：

- 中国大陆用户优先：`deploy/cloudbase/README.md`
- 海外/国际访问优先：`deploy/railway/README.md`

两种方案均为 `backend(API+worker)` + `web` 两服务，且仅 `web` 暴露公网。

## Docker 本地一键运行

前置：Docker Desktop（或 Docker Engine + Compose）

启动：

```bash
cd /Users/bytedance/Documents/VideoBling_local_0225
./scripts/start_docker.sh
```

打开：

- Web: `http://localhost:5173`
- API Health: `http://localhost:18000/api/health`

停止：

```bash
cd /Users/bytedance/Documents/VideoBling_local_0225
./scripts/stop_docker.sh
```

容器说明：

- `backend`：FastAPI API 服务（内置 ffmpeg/ffprobe）
- `worker`：Huey 异步任务执行器
- `web`：React 生产静态站点（Caddy 托管 + `/api` 反向代理）
- 运行数据持久化到宿主机 `runtime/`

## 本机直接运行（非 Docker）

以下方式适合本机调试 Python/Node 代码。

### 本机前置依赖

1) Python 3.9+

```bash
python3 --version
```

2) Node.js 20+

```bash
node -v
npm -v
```

3) ffmpeg / ffprobe

```bash
ffmpeg -version
ffprobe -version
```

### 启动步骤

1) 安装后端依赖

```bash
cd /Users/bytedance/Documents/VideoBling_local_0225
./scripts/setup_backend.sh
```

2) 启动 API

```bash
cd /Users/bytedance/Documents/VideoBling_local_0225
./scripts/start_api.sh
```

3) 启动 Worker（新终端）

```bash
cd /Users/bytedance/Documents/VideoBling_local_0225
./scripts/start_worker.sh
```

4) 启动前端（新终端）

```bash
cd /Users/bytedance/Documents/VideoBling_local_0225
./scripts/start_web.sh
```

打开页面：`http://localhost:5173`

## 配置说明

配置保存在：

- `/Users/bytedance/Documents/VideoBling_local_0225/runtime/config.json`
- `/Users/bytedance/Documents/VideoBling_local_0225/runtime/config_presets.json`

前端支持将“模型与 Prompt 控制台”保存为预设，并在页面内一键切换到指定预设（切换后会同步写入当前生效配置）。
前端 Pipeline 区域提供“启用 ASR 文本纠错”开关，关闭后将跳过纠错调用以降低耗时与成本。
队列详情弹窗支持“从任意阶段重跑”，会创建新任务并复用该阶段之前的中间产物。

## 任务与产物

- 任务目录：`/Users/bytedance/Documents/VideoBling_local_0225/runtime/jobs/{job_id}/`
- 队列 SQLite：`/Users/bytedance/Documents/VideoBling_local_0225/runtime/queue.sqlite`
- 应用 SQLite：`/Users/bytedance/Documents/VideoBling_local_0225/runtime/app.sqlite3`

## 测试

```bash
cd /Users/bytedance/Documents/VideoBling_local_0225
source .venv/bin/activate
export PYTHONPATH=/Users/bytedance/Documents/VideoBling_local_0225/backend
pytest -q
```

E2E 默认跳过。需要真实环境时：

```bash
RUN_E2E=1 pytest tests/e2e -q
```

## 注意事项

1. Seedance 提交/轮询字段在不同版本可能有差异，当前适配器做了多字段兜底解析。
2. 当前默认无鉴权，公网演示请仅共享给目标用户。
3. 如果 Seedance 返回无音轨，系统会自动补静音继续拼接。
4. ASR 适配器会先尝试极速版 `recognize/flash`，失败后自动回退到标准版 `submit/query`。如仍报 `requested grant not found` / `resourceId ... is not allowed` / `requested resource not granted`，请在前端 ASR 配置里确认 `Resource ID` 与火山语音控制台授予值一致（常见值：`volc.bigasr.auc_turbo`、`volc.bigasr.auc`、`volc.seedasr.auc`）。
5. LLM 的 `model` 需要填写方舟可访问的模型/端点 ID（例如 `doubao-seed-2-0-pro-260215`），不要只写简写名（如 `seed-2.0-pro`），否则会报 `InvalidEndpointOrModel.NotFound`。
6. Pipeline 支持 `enable_asr_polish` 开关。关闭后会跳过“ASR 文本纠错”大模型调用，直接使用 ASR 原始转写进入脚本生成。
