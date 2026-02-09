# Clash Nexus

一个轻量级的 Clash 订阅管理服务，支持多 Profile 配置、YAML 内容管理和订阅链接导入。

## 功能特性

- 🔄 **多 Profile 支持**：根据不同场景（home/office 等）返回不同配置
- ✏️ **YAML 配置管理**：Web 界面编辑，支持语法高亮
- 🔗 **订阅导入**：支持从第三方订阅链接导入代理节点
- 🐳 **Docker 部署**：支持一键容器化运行与自动化发布

## 快速开始

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 启动带热重载的开发服务器 (Node.js 18+)
npm run dev:watch
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
http://your-server:3000/subscribe?profile=home&token=your-subscribe-token
```

### 场景标记语法

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
├── web/              # Vue 3 前端
├── data/             # 数据存储（持久化卷）
├── .github/          # GitHub Actions 工作流
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
