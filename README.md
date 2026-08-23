# Clash Nexus

一个轻量级的 Clash 订阅管理服务，支持多 Profile 配置、YAML 内容管理、外部 Proxy Provider 集中管理与强制刷新。

## 功能特性

- 🔄 **多 Profile 支持**：根据不同场景（home/office 等）返回不同配置
- 📦 **节点源管理 (Proxy Provider)**：可视化独立管理外部机场/订阅源，与 YAML 解耦，在策略组中通过 `use: [节点源名称]` 直接引用
- ⚡ **强制刷新能力**：支持在订阅链接上附加 `?refresh=1` 参数实时跳过缓存拉取最新节点，支持管理后台一键触发刷新
- ✏️ **YAML 配置管理**：Web 界面编辑，支持语法高亮
- 🔗 **订阅导入与解耦**：服务端自动拉取并展开 Provider 节点至策略组，移除客户端外部依赖
- 🐳 **Docker 部署**：轻量化容器运行

## 快速开始

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 启动带热重载的开发服务器 (Node.js 18+)
npm run dev:watch

# 运行测试
npm test
```

访问 `http://localhost:5173` (前端) 和 `http://localhost:3000` (后端)。

### Docker 部署

```bash
# 1. 启动服务
docker compose up -d

# 2. 查看日志
docker compose logs -f

# 3. 停止服务
docker compose down
```

服务启动后，访问 `http://your-server:3000` 进入管理界面。

- **默认用户名:** `admin`
- **默认密码:** `changeit`

> [!IMPORTANT]
> 首次登录后，请务必前往 **“系统设置”** 修改用户名和密码。

## 使用方法

### 订阅地址

在 Clash 客户端中添加订阅：

```
http://your-server:3000/api/subscribe/:token?profile=home
```

如需强制跳过本地缓存实时拉取最新节点源：

```
http://your-server:3000/api/subscribe/:token?profile=home&refresh=1
```

### 管理后台

访问 `http://your-server:3000` 进入管理界面：
- **📝 配置管理**：编辑 Clash 基础规则与策略组
- **📦 节点源管理**：维护外部订阅源 URL 与更新周期，支持后台手动刷新
- **📡 订阅链接**：生成与复制指定 Profile 的订阅链接（支持勾选强制刷新）
- **⚙️ 系统设置**：修改管理员用户名和密码

## 节点源引用与场景标记语法

### 1. 节点源引用语法

在「节点源管理」中添加节点源（如名称为 `my-airport`）后，直接在 YAML 的 `proxy-groups` 中通过 `use` 字段引用：

```yaml
proxy-groups:
  - name: 节点选择
    type: select
    proxies:
      - DIRECT
    use:
      - my-airport # 引用托管的节点源名称

  - name: 自动选择
    type: url-test
    url: "http://www.gstatic.com/generate_204"
    interval: 300
    use:
      - my-airport
```

### 2. 场景标记语法

在 YAML 配置中使用注释标记不同 Profile 的内容：

```yaml
rules:
  # 公共规则（无标记）
  - DOMAIN-SUFFIX,google.com,PROXY

  # 单行标记
  - DOMAIN-SUFFIX,netflix.com,PROXY  # @profile: home

  # 块级标记
  # @profile: office {
  - DOMAIN-SUFFIX,company.com,DIRECT
  - DOMAIN-SUFFIX,internal.com,DIRECT
  # }
```

## 项目结构

```
clash-nexus/
├── server/           # Express 后端
│   ├── index.js      # 入口文件
│   ├── routes/       # API 路由 (auth, config, provider, subscribe)
│   ├── services/     # 业务逻辑 (authService, configService, providerService, subscribeService)
│   └── middleware/   # 中间件
├── web/              # Vue 3 前端
│   ├── src/views/    # 页面组件 (ConfigEditor, ProviderManager, Subscribe, Settings, Login)
│   └── src/api/      # API 客户端封装
├── data/             # 数据存储 (configs.json, providers.json, settings.json, cache/)
├── test/             # 自动化与集成测试
└── docker-compose.yml
```

## GitHub Actions

项目包含自动化发布工作流 `.github/workflows/docker-publish.yml`：
- **触发条件**：推送 `v*` 标签或手动触发。
- **发布目标**：GitHub Container Registry (GHCR)。
- **注意**：请确保仓库 Settings -> Actions -> General 中的权限设置为 "Read and write permissions"。

## 环境变量

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `PORT` | 服务端口 | `3000` |
| `DATA_DIR` | 数据存储目录 | `./data` |
| `NODE_ENV` | 运行环境 | `development` |

## License

MIT
