<p align="center"><img src="icon.png" width="120" alt="LightCraft Bridge アイコン"></p>

<h1 align="center">LightCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <b>日本語</b> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  お使いのコンピューターにインストールされた <b>LightCraft</b> で、Claude に写真や RAW を現像させましょう — <b>Windows、macOS、Linux</b> 対応：<br>
  自動補正、ホワイトバランス、プリセット、マスク、スポット修正、HDR とパノラマ、選別、JPEG・TIFF・WebP・AVIF・DNG への書き出し。
</p>

---

## 概要

[LightCraft](https://github.com/storytold/lightcraft) は Rust で書かれた Lightroom クラスのオープンソース写真ライブラリ兼 RAW 現像ソフトで、画面を持たない CLI（`lightcraft-cli`）、240 のコマンド、114 の現像コントロール、MCP モードを備えています。この [Model Context Protocol](https://modelcontextprotocol.io) サーバーはそのエンジンを Claude 用の **「ファイルを入れてファイルを出す」ツール** に変えます。たとえば次のように頼めます：

> *「`D:\結婚式\挙式` の RAW をすべて自動補正、昼光のホワイトバランス、明瞭度 +15 で現像して、私の透かし入りで 2048 px の JPEG に書き出して。」*
> *「Lightroom のプリセット `Moody.xmp` をこれらの写真に適用して、Adobe RGB の 16 ビット TIFF で保存して。」*
> *「`湖.dng` の空を段階フィルターで暗くして、被写体を円形マスクで明るくして。」*
> *「この 3 枚のブラケットを HDR の DNG に合成して、このフォルダーはパノラマにして。」*
> *「この連写から一番シャープな写真だけを残して `D:\セレクト` にコピーして。」*

関連プロジェクト：[photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server)、[vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server)、[filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server)、[pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server)、[audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server)。

## プラットフォーム

| OS | インストールする LightCraft パッケージ | サーバーが自動で探す場所（設定不要） | 状態 |
| --- | --- | --- | --- |
| **Windows** 10/11（x64、x86、arm64） | MSI またはポータブル zip | `C:\Program Files\LightCraft`、`%LOCALAPPDATA%\Programs\LightCraft`、`PATH` | ✅ 検証済み（Windows 11） |
| **Linux**（x86_64、aarch64） | `.deb`、`.rpm` または `.tar.gz` | `/usr/bin`、`/usr/local/bin`、`/opt/lightcraft/bin`、`~/.local/bin`、`PATH` | ✅ 検証済み（Debian 12、画面なし） |
| **macOS** 11+（Apple シリコンと Intel） | `.dmg`（アプリ）**と** `lightcraft-cli-<バージョン>-macos-universal.zip` | `/Applications/LightCraft.app`、`/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin`、`PATH` | 🟡 対応済み、Mac では未検証 |

ダウンロード：[LightCraft のリリース](https://github.com/storytold/lightcraft/releases)（FreeBSD 用の tar.gz もあります。`LIGHTCRAFT_DIR` で指定してください）。それ以外の場所にある場合は `LIGHTCRAFT_DIR`（フォルダー、`.tar.gz` のルート、`LightCraft.app`）または `LIGHTCRAFT_CLI` を設定します。

- **macOS：** DMG にはアプリだけが入っています。別配布の `lightcraft-cli` zip を展開し、`lightcraft-cli` を `/usr/local/bin` に移動してください（または `LIGHTCRAFT_CLI` で指定）。初回実行時に Apple の公証がオンラインで確認されます。
- **Linux：** AppImage と Flatpak にはアプリだけが入っており、`lightcraft-cli` は含まれません。deb、rpm、tar.gz を使ってください。アプリが AppImage の場合は、`open_in_lightcraft` が起動できるよう `LIGHTCRAFT_APP` を設定します。GPU のないサーバーでの検証環境では `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig` を使用しました。

## しくみ

| 構成要素 | 内容 |
| --- | --- |
| **LightCraft エンジン**（`lightcraft-cli mcp`） | LightCraft 自身のエンジン：RAW デコーダー、現像パイプライン、マスク、修復、写真の結合、書き出し。ジョブごとに **画面なし** で、**使い捨てのライブラリ** とともに新しく起動するため、お使いの LightCraft ライブラリや開いているウィンドウに触れることはありません。 |
| **MCP サーバー**（Node.js） | 10 個の高レベルツール。写真を参照として読み込み（読み取るだけで、隣に XMP は書きません）、補正を適用し、指定の場所に書き出します。合成は専用のコピーで行うため、元のファイルの隣には何も作られません。パスを検証し、決して上書きしません。 |
| **ライブアプリ**（任意） | `open_in_lightcraft control=true` はローカル専用のコントロールチャネル（ポート 7980）付きでアプリを起動し、`run_lightcraft_commands live=true` がアプリとそのライブラリを操作します。 |

## ツール

| ツール | 機能 |
| --- | --- |
| `develop_photos` | 自動補正、ホワイトバランス（プリセット、ケルビン、スポイト）、114 のスライダーのいずれか、プリセット（Lightroom の `.xmp` / `.lrtemplate` も可）とプロファイル、白黒、トーンカーブ、切り抜き / 縦横比 / 角度補正 / Upright、回転 / 反転、スポット修正、ほこりと赤目の除去、マスク（段階、円形、輝度、カラー、ブラシ、被写体、空、背景）と部分補正、任意のエンジンコマンド。1 枚、リスト、フォルダー全体に対応。サイズ、画質、ファイルサイズ上限、カラースペース、ビット数、出力シャープ、メタデータ、透かしを指定して書き出し |
| `convert_photos` | RAW や写真をそのまま JPEG、PNG、TIFF、WebP、AVIF、DNG に。縮小や一括処理も可能 |
| `render_preview` | Claude が見られる形で写真を表示。試しの補正を適用することも可能（指定しない限り何も書き込みません） |
| `get_photo_info` | カメラ、レンズ、露出、撮影日時、GPS、サイズ、RAW かどうか、すべての EXIF / XMP タグ |
| `merge_photos` | ブラケットからの HDR、パノラマ、HDR パノラマ — 編集可能な DNG と、必要なら現像済みの JPEG / TIFF |
| `analyze_photos` | 選別：シャープネスと白飛び・黒つぶれのスコア、連写のグループ化、各グループで最もシャープな 1 枚をフォルダーへコピー |
| `list_lightcraft_catalog` | 範囲付きの現像コントロール、プリセット、プロファイル、カーブ、書き出しプリセット、240 のコマンド、形式 |
| `run_lightcraft_commands` | 1 つのセッションで任意のエンジンコマンドを実行（`$steps[N].フィールド` 参照可）、画面なしまたはライブアプリで |
| `open_in_lightcraft` | LightCraft アプリで写真を開く（コントロールチャネル付きも可） |
| `get_lightcraft_status` | プラットフォーム、インストール、バージョン、コマンド数、コントロール数、アプリ / コントロールポート |

| | |
| --- | --- |
| **読み込み** | RAW：DNG、CR2、CR3、ARW、NEF、RAF（Bayer と X-Trans）、RW2 / RWL、PEF、ORF、SRW · JPEG、PNG、TIFF、WebP、PSD（統合画像）、JPEG XL |
| **書き出し** | JPEG、PNG（8/16 ビット）、TIFF（8/16/32 ビット）、WebP、AVIF（8/10 ビット）、DNG（RAW 入力、補正を埋め込み）、元ファイル + XMP |
| **カラースペース** | sRGB、Display P3、Adobe RGB、ProPhoto RGB、Rec. 2020 |

位置（切り抜き範囲、マスクの点、スポット）は **左上隅を原点に 0..1 で正規化** した座標です。被写体 / 空 / 背景マスクは LightCraft 0.4 の従来型アルゴリズムを使います（AI モデルは不要）。

## 例

```json
{
  "input_dir": "D:\\写真\\旅行",
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
  "watermark": "© 私の名前",
  "output_dir": "D:\\写真\\旅行\\export"
}
```

## 必要なもの

- `lightcraft-cli` 付きの **LightCraft**（**0.4.0** で検証）。[プラットフォーム](#プラットフォーム) を参照
- Node.js ≥ 20（`.mcpb` でインストールする場合は Claude Desktop に同梱）

## インストール

### Claude Desktop（推奨、全プラットフォーム）

1. [最新リリース](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest) から `lightcraft-mcp-server.mcpb` をダウンロードします。
2. ダブルクリック（または Claude Desktop → *設定 → 拡張機能* にドラッグ）して **インストール** をクリックします。
3. 任意：LightCraft が標準の場所にない場合は、拡張機能の設定でそのフォルダーまたは `lightcraft-cli` のパスを入力します。

### Codex（OpenAI）

**推奨 — マーケットプレイス（更新を受け取れます）：** *プラグイン → 追加 → マーケットプレイスを追加* で、ソースに `jhonsu01/craft-marketplace`、参照に `main` を指定し、**Craft Bridges** から **LightCraft Bridge** をインストールします（[craft-marketplace](https://github.com/jhonsu01/craft-marketplace)）。新しいバージョンはマーケットプレイスの更新で届きます。または zip をアップロードします（Codex はアカウントに保存し、同じ名前の新しい zip を拒否します）：

1. [最新リリース](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest)から `lightcraft-mcp-server-<バージョン>-codex.zip` をダウンロードします。
2. Codex で *プラグイン → 追加 → 新しいプラグイン* を開き、zip を選んで **プラグインを追加** をクリックします。
3. Codex はサーバーを `node` で起動するため、`PATH` に Node.js ≥ 20 が必要です。LightCraft が標準の場所にない場合は、`LIGHTCRAFT_DIR` または `LIGHTCRAFT_CLI` をシステムの環境変数として設定してください（Codex にはローカルプラグイン用の設定画面がありません）。

### DeepSeek Harness

1. *Plugins → Add plugin* で `github:jhonsu01/craft-marketplace#path:/plugins/lightcraft-mcp-server` を入力し、**Install**、続けて **Enable now** をクリックします。
2. Harness は独自の MCP クライアントと `node`（`PATH` に Node.js ≥ 20 が必要）でサーバーを起動します。ツールは `mcp__lightcraft__<ツール>` として表示され、出力ファイルは Harness で開けるカードになります。
3. Harness はまだプラグインを自動更新しません。更新するには、プラグインをアンインストールして同じアドレスで再インストールしてください。

### Claude Code / その他の MCP クライアント

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

## 設定

| 変数 | 意味 |
| --- | --- |
| `LIGHTCRAFT_DIR` | LightCraft のフォルダー、その実行ファイルのいずれか、`.tar.gz` のルート（`bin/` を含む）または `LightCraft.app`。既定：自動検出 |
| `LIGHTCRAFT_CLI` | `lightcraft-cli` / `lightcraft-cli.exe` のパス（`LIGHTCRAFT_DIR` より優先） |
| `LIGHTCRAFT_APP` | デスクトップアプリが別の場所にある場合のパス（例：Linux の AppImage） |
| `LIGHTCRAFT_CONTROL_PORT` | デスクトップアプリのコントロールポート（既定 7980） |
| `LIGHTCRAFT_MCP_TIMEOUT` | エンジン呼び出し 1 回あたりの最大秒数（既定 3600） |

## 安全性

- `overwrite: true` を指定しない限り、ファイルは **決して上書きされません**：フォルダー内では空いている名前（`_2`）を使い、既存の `output_path` はエラーになります。元のファイルは読み取るだけで、隣に XMP は書きません。
- パスはすべて絶対パスで指定します。エンジンは画面なし・使い捨てのライブラリで動作し、`live: true`（または写真をアプリのライブラリに通常どおり読み込む `open_in_lightcraft`）でない限り、お使いの LightCraft ライブラリやアプリに触れません。
- すべてローカルで実行され、ネットワークにはアクセスしません。各ジョブは一時フォルダー内の専用エンジンを使い、終了時にフォルダーは削除されます。

## 開発

```bash
npm run build       # TypeScript + 単一ファイルのバンドル（dist/bundle.cjs）
npm test            # ユニットテスト（Windows、macOS、Linux のパス処理）
npm run test:e2e    # 実際の MCP stdio による 24 項目のエンドツーエンド検証（合成画像と DNG）
npm run pack:mcpb   # lightcraft-mcp-server.mcpb
npm run pack:codex  # Codex 用プラグイン zip
```

Docker での Linux テスト（先に `lightcraft-<バージョン>-linux-x86_64.tar.gz` を展開）：

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/lightcraft-0.4.0-linux-x86_64:/opt/lightcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## ライセンス

Apache-2.0。LightCraft の著作権はその作者（Storytold）に帰属し、MIT または Apache-2.0 でライセンスされています。
本プロジェクトは LightCraft および Storytold とは無関係であり、承認も受けていません。Lightroom は Adobe の商標です。
