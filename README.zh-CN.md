<p align="center"><img src="icon.png" width="120" alt="LightCraft Bridge 图标"></p>

<h1 align="center">LightCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <b>简体中文</b> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  让 Claude 使用你电脑上安装的 <b>LightCraft</b> 冲印照片和 RAW 文件 —— 支持 <b>Windows、macOS 和 Linux</b>：<br>
  自动色调、白平衡、预设、蒙版、污点修复、HDR 和全景、选片，以及导出 JPEG、TIFF、WebP、AVIF 和 DNG。
</p>

---

## 为什么

[LightCraft](https://github.com/storytold/lightcraft) 是一款用 Rust 编写、对标 Lightroom 的开源照片库和 RAW 冲印软件，自带无界面的命令行工具（`lightcraft-cli`）、240 条命令、114 个冲印控件和 MCP 模式。这个 [Model Context Protocol](https://modelcontextprotocol.io) 服务器把该引擎变成 Claude 可调用的 **"文件进、文件出" 工具**，例如你可以说：

> *"把 `D:\婚礼\仪式` 里的所有 RAW 用自动色调、日光白平衡和 +15 清晰度冲印，导出 2048 像素、带我水印的 JPEG。"*
> *"把我的 Lightroom 预设 `Moody.xmp` 应用到这些照片，保存为 Adobe RGB 的 16 位 TIFF。"*
> *"用渐变滤镜压暗 `湖.dng` 的天空，并用径向蒙版提亮主体。"*
> *"把这 3 张包围曝光合成 HDR DNG，再把这个文件夹拼成全景。"*
> *"从这组连拍里只保留最清晰的照片，复制到 `D:\精选`。"*

同系列项目：[photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server)、[vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server)、[filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server)、[pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) 和 [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server)。

## 平台

| 系统 | 需要安装的 LightCraft 包 | 服务器会自动查找的位置（无需配置） | 状态 |
| --- | --- | --- | --- |
| **Windows** 10/11（x64、x86、arm64） | MSI 或便携版 zip | `C:\Program Files\LightCraft`、`%LOCALAPPDATA%\Programs\LightCraft`、`PATH` | ✅ 已验证（Windows 11） |
| **Linux**（x86_64、aarch64） | `.deb`、`.rpm` 或 `.tar.gz` | `/usr/bin`、`/usr/local/bin`、`/opt/lightcraft/bin`、`~/.local/bin`、`PATH` | ✅ 已验证（Debian 12，无界面） |
| **macOS** 11+（Apple 芯片和 Intel） | `.dmg`（应用）**以及** `lightcraft-cli-<版本>-macos-universal.zip` | `/Applications/LightCraft.app`、`/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin`、`PATH` | 🟡 已支持，尚未在 Mac 上实测 |

下载：[LightCraft 发布页](https://github.com/storytold/lightcraft/releases)（另有 FreeBSD 的 tar.gz，用 `LIGHTCRAFT_DIR` 指向它即可）。若安装在其他位置，请设置 `LIGHTCRAFT_DIR`（文件夹、`.tar.gz` 解压根目录或 `LightCraft.app`）或 `LIGHTCRAFT_CLI`。

- **macOS：** DMG 里只有应用本身。请解压单独提供的 `lightcraft-cli` zip，把 `lightcraft-cli` 移到 `/usr/local/bin`（或用 `LIGHTCRAFT_CLI` 指向它）。首次运行会在线检查 Apple 公证。
- **Linux：** AppImage 和 Flatpak 只包含应用，不含 `lightcraft-cli`，请使用 deb、rpm 或 tar.gz。若应用是 AppImage，请设置 `LIGHTCRAFT_APP`，以便 `open_in_lightcraft` 能启动它。在没有 GPU 的服务器上，经过验证的环境安装了 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`。

## 工作原理

| 组成 | 说明 |
| --- | --- |
| **LightCraft 引擎**（`lightcraft-cli mcp`） | LightCraft 自己的引擎：RAW 解码、冲印流程、蒙版、修复、照片合并和导出。每个任务都 **以无界面方式**、使用 **一次性照片库** 重新启动，因此绝不会触碰你的 LightCraft 照片库或打开着的窗口。 |
| **MCP 服务器**（Node.js） | 10 个高层工具。以引用方式导入照片（只读取，不会在旁边写入 XMP），应用调整，再导出到你指定的位置。合并在私有副本上进行，因此原始文件旁边不会出现任何东西。它校验路径，从不覆盖文件。 |
| **实时应用**（可选） | `open_in_lightcraft control=true` 以仅限本机的控制通道（端口 7980）启动应用，`run_lightcraft_commands live=true` 用它操作应用及其照片库。 |

## 工具

| 工具 | 功能 |
| --- | --- |
| `develop_photos` | 自动色调、白平衡（预设、开尔文、吸管）、114 个控件中的任意一个、预设（也支持 Lightroom 的 `.xmp` / `.lrtemplate`）和配置文件、黑白、色调曲线、裁剪 / 比例 / 拉直 / Upright、旋转 / 翻转、污点修复、除尘和去红眼、蒙版（渐变、径向、明亮度、颜色、画笔、主体、天空、背景）及局部调整、任意引擎命令；单张照片、一组照片或整个文件夹；导出时可设尺寸、质量、文件大小上限、色彩空间、位深度、输出锐化、元数据策略和水印 |
| `convert_photos` | 把 RAW 和照片原样导出为 JPEG、PNG、TIFF、WebP、AVIF 或 DNG，可缩小、可批量 |
| `render_preview` | 以 Claude 可见的方式渲染照片，可先套用试验效果（除非要求，否则不写入任何文件） |
| `get_photo_info` | 相机、镜头、曝光、拍摄时间、GPS、尺寸、是否为 RAW，以及所有 EXIF / XMP 标签 |
| `merge_photos` | 由包围曝光合成 HDR、全景、HDR 全景 —— 输出可编辑的 DNG，可选同时输出冲印好的 JPEG / TIFF |
| `analyze_photos` | 选片：对焦（清晰度）和溢出评分，连拍分组，并把每组最清晰的一张复制到文件夹 |
| `list_lightcraft_catalog` | 带范围的冲印控件、预设、配置文件、曲线、导出预设、240 条命令、格式 |
| `run_lightcraft_commands` | 在一个会话中运行任意引擎命令（支持 `$steps[N].字段` 引用），可无界面或在实时应用中运行 |
| `open_in_lightcraft` | 在 LightCraft 应用中打开照片（可选开启控制通道） |
| `get_lightcraft_status` | 平台、安装、版本、命令数、控件数、应用 / 控制端口 |

| | |
| --- | --- |
| **读取** | RAW：DNG、CR2、CR3、ARW、NEF、RAF（Bayer 和 X-Trans）、RW2 / RWL、PEF、ORF、SRW · JPEG、PNG、TIFF、WebP、PSD（合成图）、JPEG XL |
| **写入** | JPEG、PNG（8/16 位）、TIFF（8/16/32 位）、WebP、AVIF（8/10 位）、DNG（RAW 输入，嵌入调整）、原文件 + XMP |
| **色彩空间** | sRGB、Display P3、Adobe RGB、ProPhoto RGB、Rec. 2020 |

位置（裁剪矩形、蒙版点、污点）是 **从左上角起算、归一化为 0..1 的坐标**。主体 / 天空 / 背景蒙版使用 LightCraft 0.4 的传统算法（无需 AI 模型）。

## 示例

```json
{
  "input_dir": "D:\\照片\\旅行",
  "auto": true,
  "white_balance": { "mode": "daylight" },
  "profile": "lc.vivid",
  "values": { "light.highlights": -40, "light.shadows": 30, "effects.clarity": 15, "vignette.amount": -15 },
  "masks": [
    { "kind": "linear", "start": [0.5, 0], "end": [0.5, 0.45], "adjust": { "exposure": -0.6, "dehaze": 15 } }
  ],
  "formats": ["jpg"],
  "long_edge": 2048,
  "quality": 88,
  "watermark": "© 我的名字",
  "output_dir": "D:\\照片\\旅行\\export"
}
```

## 要求

- 带有 `lightcraft-cli` 的 **LightCraft**（已在 **0.4.0** 上测试），见 [平台](#平台)
- Node.js ≥ 20（通过 `.mcpb` 安装时 Claude Desktop 已自带）

## 安装

### Claude Desktop（推荐，所有平台）

1. 从 [最新发布](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest) 下载 `lightcraft-mcp-server.mcpb`。
2. 双击它（或拖到 Claude Desktop → *设置 → 扩展*），然后点击 **安装**。
3. 可选：如果 LightCraft 不在标准位置，请在扩展设置中填写它的文件夹或 `lightcraft-cli` 的路径。

### Codex（OpenAI）

**推荐 —— 插件市场（可获得更新）：** *插件 → 添加 → 添加插件市场*，来源 `jhonsu01/craft-marketplace`，引用 `main`，然后从 **Craft Bridges** 安装 **LightCraft Bridge**（[craft-marketplace](https://github.com/jhonsu01/craft-marketplace)）。刷新插件市场即可获得新版本。或者上传 zip（Codex 会把它保存在你的账户中，并拒绝同名的新版 zip）：

1. 从[最新发布](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest)下载 `lightcraft-mcp-server-<版本>-codex.zip`。
2. 在 Codex 中：*插件 → 添加 → 新插件*，选择该 zip，然后点击 **添加插件**。
3. Codex 用 `node` 启动服务器，因此 `PATH` 中必须有 Node.js ≥ 20。如果 LightCraft 不在标准位置，请把 `LIGHTCRAFT_DIR` 或 `LIGHTCRAFT_CLI` 设为系统环境变量（Codex 没有本地插件的设置表单）。

### DeepSeek Harness

1. *Plugins → Add plugin*，输入 `github:jhonsu01/craft-marketplace#path:/plugins/lightcraft-mcp-server`，点击 **Install**，再点击 **Enable now**。
2. Harness 用自带的 MCP 客户端和 `node`（`PATH` 中需有 Node.js ≥ 20）启动服务器；工具显示为 `mcp__lightcraft__<工具>`，输出文件显示为可在 Harness 中打开的卡片。
3. Harness 目前不会自动更新插件：要更新，请卸载插件后用同一地址重新安装。

### Claude Code / 其他 MCP 客户端

```bash
git clone https://github.com/jhonsu01/lightcraft-mcp-server.git
cd lightcraft-mcp-server
npm install
npm run build
```

Windows：

```bash
claude mcp add lightcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux：

```bash
claude mcp add lightcraft -- node "$PWD/dist/bundle.cjs"
```

## 配置

| 变量 | 含义 |
| --- | --- |
| `LIGHTCRAFT_DIR` | LightCraft 安装文件夹、其中某个可执行文件、`.tar.gz` 解压根目录（含 `bin/`）或 `LightCraft.app`。默认：自动检测 |
| `LIGHTCRAFT_CLI` | `lightcraft-cli` / `lightcraft-cli.exe` 的路径（优先于 `LIGHTCRAFT_DIR`） |
| `LIGHTCRAFT_APP` | 桌面应用在其他位置时的路径（例如 Linux 的 AppImage） |
| `LIGHTCRAFT_CONTROL_PORT` | 桌面应用的控制端口（默认 7980） |
| `LIGHTCRAFT_MCP_TIMEOUT` | 每次引擎调用的最长秒数（默认 3600） |

## 安全

- 除非设置 `overwrite: true`，否则**绝不覆盖**文件：在文件夹中会使用空闲的名称（`_2`），已存在的 `output_path` 会报错。原始文件只会被读取，旁边不会写入 XMP。
- 所有路径必须是绝对路径。引擎以无界面方式、使用一次性照片库运行，除非 `live: true`（或 `open_in_lightcraft`，它会像普通导入一样把照片导入应用的照片库），否则绝不触碰你的 LightCraft 照片库或应用。
- 一切都在本地运行，不访问网络。每个任务使用独立引擎和临时文件夹，结束后自动删除。

## 开发

```bash
npm run build       # TypeScript + 单文件打包（dist/bundle.cjs）
npm test            # 单元测试（Windows、macOS、Linux 路径逻辑）
npm run test:e2e    # 通过真实 MCP stdio 的 24 项端到端检查（合成图片和 DNG）
npm run pack:mcpb   # lightcraft-mcp-server.mcpb
npm run pack:codex  # Codex 插件 zip
```

在 Docker 中测试 Linux（先解压 `lightcraft-<版本>-linux-x86_64.tar.gz`）：

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/lightcraft-0.4.0-linux-x86_64:/opt/lightcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## 许可证

Apache-2.0。LightCraft 版权归其作者（Storytold）所有，采用 MIT 或 Apache-2.0 许可。
本项目与 LightCraft 和 Storytold 无关，也未获得其认可。Lightroom 是 Adobe 的商标。
