<p align="center"><img src="icon.png" width="120" alt="LightCraft Bridge 아이콘"></p>

<h1 align="center">LightCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <b>한국어</b>
</p>

<p align="center">
  컴퓨터에 설치된 <b>LightCraft</b>로 Claude가 사진과 RAW 파일을 현상하게 하세요 — <b>Windows, macOS, Linux</b> 지원:<br>
  자동 톤, 화이트 밸런스, 사전 설정, 마스크, 잡티 제거, HDR과 파노라마, 선별, JPEG·TIFF·WebP·AVIF·DNG 내보내기.
</p>

---

## 왜 필요한가

[LightCraft](https://github.com/storytold/lightcraft)는 Rust로 작성된 Lightroom급 오픈 소스 사진 라이브러리이자 RAW 현상 프로그램으로, 화면 없는 CLI(`lightcraft-cli`), 240개의 명령, 114개의 현상 컨트롤, MCP 모드를 갖추고 있습니다. 이 [Model Context Protocol](https://modelcontextprotocol.io) 서버는 그 엔진을 Claude용 **"파일 입력 → 파일 출력" 도구**로 바꿔 줍니다. 예를 들어 이렇게 요청할 수 있습니다:

> *"`D:\결혼식\예식`의 모든 RAW를 자동 톤, 주광 화이트 밸런스, 부분 대비 +15로 현상하고 내 워터마크를 넣어 2048 px JPEG로 내보내 줘."*
> *"내 Lightroom 사전 설정 `Moody.xmp`를 이 사진들에 적용하고 Adobe RGB 16비트 TIFF로 저장해 줘."*
> *"`호수.dng`의 하늘을 선형 그라디언트로 어둡게 하고 피사체를 원형 마스크로 밝게 해 줘."*
> *"이 3장의 브라케팅을 HDR DNG로 병합하고, 이 폴더는 파노라마로 이어 붙여 줘."*
> *"이 연사에서 가장 선명한 사진만 남겨 `D:\셀렉트`로 복사해 줘."*

같은 시리즈: [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server), [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## 플랫폼

| OS | 설치할 LightCraft 패키지 | 서버가 자동으로 찾는 위치(설정 불필요) | 상태 |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI 또는 포터블 zip | `C:\Program Files\LightCraft`, `%LOCALAPPDATA%\Programs\LightCraft`, `PATH` | ✅ 검증됨 (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` 또는 `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/lightcraft/bin`, `~/.local/bin`, `PATH` | ✅ 검증됨 (Debian 12, 화면 없음) |
| **macOS** 11+ (Apple 실리콘 및 Intel) | `.dmg`(앱) **와** `lightcraft-cli-<버전>-macos-universal.zip` | `/Applications/LightCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 지원, 아직 Mac에서 테스트하지 않음 |

다운로드: [LightCraft 릴리스](https://github.com/storytold/lightcraft/releases) (FreeBSD용 tar.gz도 있습니다. `LIGHTCRAFT_DIR`로 지정하세요). 다른 위치에 있다면 `LIGHTCRAFT_DIR`(폴더, `.tar.gz` 루트 또는 `LightCraft.app`)나 `LIGHTCRAFT_CLI`를 설정하세요.

- **macOS:** DMG에는 앱만 들어 있습니다. 별도로 제공되는 `lightcraft-cli` zip을 풀고 `lightcraft-cli`를 `/usr/local/bin`으로 옮기세요(또는 `LIGHTCRAFT_CLI`로 지정). 처음 실행할 때 Apple 공증을 온라인으로 확인합니다.
- **Linux:** AppImage와 Flatpak에는 앱만 있고 `lightcraft-cli`는 없습니다. deb, rpm 또는 tar.gz를 사용하세요. 앱이 AppImage라면 `open_in_lightcraft`가 실행할 수 있도록 `LIGHTCRAFT_APP`을 설정하세요. GPU가 없는 서버에서 검증된 환경은 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`를 사용했습니다.

## 작동 방식

| 구성 요소 | 설명 |
| --- | --- |
| **LightCraft 엔진** (`lightcraft-cli mcp`) | LightCraft 자체 엔진: RAW 디코더, 현상 파이프라인, 마스크, 복구, 사진 병합, 내보내기. 작업마다 **화면 없이**, **일회용 라이브러리**와 함께 새로 시작하므로 LightCraft 라이브러리나 열려 있는 창을 절대 건드리지 않습니다. |
| **MCP 서버** (Node.js) | 10개의 상위 수준 도구. 사진을 참조로 가져와(읽기만 하며 옆에 XMP를 쓰지 않음) 보정을 적용하고 요청한 위치로 내보냅니다. 병합은 전용 사본에서 실행되므로 원본 옆에는 아무것도 생기지 않습니다. 경로를 검증하고 절대 덮어쓰지 않습니다. |
| **라이브 앱** (선택) | `open_in_lightcraft control=true`는 로컬 전용 제어 채널(포트 7980)로 앱을 시작하고, `run_lightcraft_commands live=true`가 앱과 그 라이브러리를 조작합니다. |

## 도구

| 도구 | 기능 |
| --- | --- |
| `develop_photos` | 자동 톤, 화이트 밸런스(사전 설정, 켈빈, 스포이트), 114개 슬라이더 중 무엇이든, 사전 설정(Lightroom `.xmp` / `.lrtemplate` 포함)과 프로필, 흑백, 톤 곡선, 자르기 / 비율 / 수평 맞추기 / Upright, 회전 / 뒤집기, 잡티 제거, 먼지·적목 제거, 마스크(선형, 원형, 휘도, 색상, 브러시, 피사체, 하늘, 배경)와 부분 보정, 모든 엔진 명령; 사진 한 장, 목록 또는 폴더; 크기, 품질, 파일 크기 제한, 색 공간, 비트 수, 출력 선명도, 메타데이터, 워터마크를 지정해 내보내기 |
| `convert_photos` | RAW와 사진을 그대로 JPEG, PNG, TIFF, WebP, AVIF 또는 DNG로, 크기 조정과 일괄 처리 가능 |
| `render_preview` | Claude가 볼 수 있게 사진을 렌더링, 시험 보정 적용 가능(요청하지 않으면 아무것도 쓰지 않음) |
| `get_photo_info` | 카메라, 렌즈, 노출, 촬영 시각, GPS, 크기, RAW 여부, 모든 EXIF / XMP 태그 |
| `merge_photos` | 브라케팅 HDR, 파노라마, HDR 파노라마 — 편집 가능한 DNG와 선택적으로 현상된 JPEG / TIFF |
| `analyze_photos` | 선별: 선명도와 클리핑 점수, 연사 그룹화, 그룹마다 가장 선명한 사진을 폴더로 복사 |
| `list_lightcraft_catalog` | 범위가 포함된 현상 컨트롤, 사전 설정, 프로필, 곡선, 내보내기 사전 설정, 240개 명령, 형식 |
| `run_lightcraft_commands` | 한 세션에서 모든 엔진 명령 실행(`$steps[N].필드` 참조), 화면 없이 또는 라이브 앱에서 |
| `open_in_lightcraft` | LightCraft 앱에서 사진 열기(제어 채널 선택 가능) |
| `get_lightcraft_status` | 플랫폼, 설치, 버전, 명령 수, 컨트롤 수, 앱 / 제어 포트 |

| | |
| --- | --- |
| **읽기** | RAW: DNG, CR2, CR3, ARW, NEF, RAF(Bayer 및 X-Trans), RW2 / RWL, PEF, ORF, SRW · JPEG, PNG, TIFF, WebP, PSD(합성 이미지), JPEG XL |
| **쓰기** | JPEG, PNG(8/16비트), TIFF(8/16/32비트), WebP, AVIF(8/10비트), DNG(RAW 입력, 보정 포함), 원본 + XMP |
| **색 공간** | sRGB, Display P3, Adobe RGB, ProPhoto RGB, Rec. 2020 |

위치(자르기 사각형, 마스크 점, 잡티)는 **왼쪽 위 모서리 기준 0..1로 정규화된** 좌표입니다. 피사체 / 하늘 / 배경 마스크는 LightCraft 0.4의 기존 휴리스틱을 사용합니다(AI 모델 불필요).

## 예시

```json
{
  "input_dir": "D:\\사진\\여행",
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
  "watermark": "© 내 이름",
  "output_dir": "D:\\사진\\여행\\export"
}
```

## 요구 사항

- `lightcraft-cli`가 포함된 **LightCraft**(**0.4.0**에서 테스트), [플랫폼](#플랫폼) 참조
- Node.js ≥ 20(`.mcpb`로 설치할 때는 Claude Desktop에 포함)

## 설치

### Claude Desktop (권장, 모든 플랫폼)

1. [최신 릴리스](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest)에서 `lightcraft-mcp-server.mcpb`를 내려받습니다.
2. 더블클릭(또는 Claude Desktop → *설정 → 확장 프로그램*으로 끌어다 놓기)한 뒤 **설치**를 클릭합니다.
3. 선택: LightCraft가 표준 위치에 없다면 확장 프로그램 설정에서 해당 폴더나 `lightcraft-cli` 경로를 입력합니다.

### Codex (OpenAI)

**권장 — 마켓플레이스(업데이트 받음):** *플러그인 → 추가 → 마켓플레이스 추가*에서 소스 `jhonsu01/craft-marketplace`, 참조 `main`을 지정한 뒤 **Craft Bridges**에서 **LightCraft Bridge**를 설치합니다([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). 마켓플레이스를 새로 고치면 새 버전이 설치됩니다. 또는 zip을 업로드합니다(Codex는 계정에 저장하고 같은 이름의 새 zip은 거부합니다):

1. [최신 릴리스](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest)에서 `lightcraft-mcp-server-<버전>-codex.zip`을 내려받습니다.
2. Codex에서 *플러그인 → 추가 → 새 플러그인*을 열고 zip을 선택한 뒤 **플러그인 추가**를 누릅니다.
3. Codex는 `node`로 서버를 시작하므로 `PATH`에 Node.js ≥ 20이 있어야 합니다. LightCraft가 표준 위치에 없다면 `LIGHTCRAFT_DIR` 또는 `LIGHTCRAFT_CLI`를 시스템 환경 변수로 설정하세요(Codex에는 로컬 플러그인용 설정 화면이 없습니다).

### DeepSeek Harness

1. *Plugins → Add plugin*에서 `github:jhonsu01/craft-marketplace#path:/plugins/lightcraft-mcp-server`를 입력하고 **Install**, 이어서 **Enable now**를 누릅니다.
2. Harness는 자체 MCP 클라이언트와 `node`(`PATH`에 Node.js ≥ 20 필요)로 서버를 시작합니다. 도구는 `mcp__lightcraft__<도구>`로 표시되고, 출력 파일은 Harness에서 열리는 카드로 표시됩니다.
3. Harness는 아직 플러그인을 자동으로 업데이트하지 않습니다. 업데이트하려면 플러그인을 제거한 뒤 같은 주소로 다시 설치하세요.

### Claude Code / 기타 MCP 클라이언트

```bash
git clone https://github.com/jhonsu01/lightcraft-mcp-server.git
cd lightcraft-mcp-server
npm install
npm run build
```

Windows:

```bash
claude mcp add lightcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux:

```bash
claude mcp add lightcraft -- node "$PWD/dist/bundle.cjs"
```

## 설정

| 변수 | 의미 |
| --- | --- |
| `LIGHTCRAFT_DIR` | LightCraft 폴더, 그 안의 실행 파일, `.tar.gz` 루트(`bin/` 포함) 또는 `LightCraft.app`. 기본값: 자동 감지 |
| `LIGHTCRAFT_CLI` | `lightcraft-cli` / `lightcraft-cli.exe` 경로(`LIGHTCRAFT_DIR`보다 우선) |
| `LIGHTCRAFT_APP` | 데스크톱 앱이 다른 곳에 있을 때의 경로(예: Linux의 AppImage) |
| `LIGHTCRAFT_CONTROL_PORT` | 데스크톱 앱의 제어 포트(기본 7980) |
| `LIGHTCRAFT_MCP_TIMEOUT` | 엔진 호출 1회당 최대 초(기본 3600) |

## 안전

- `overwrite: true`가 아니면 파일을 **절대 덮어쓰지 않습니다**: 폴더에서는 빈 이름(`_2`)을 사용하고, 이미 있는 `output_path`는 오류가 됩니다. 원본은 읽기만 하며 옆에 XMP를 쓰지 않습니다.
- 모든 경로는 절대 경로여야 합니다. 엔진은 화면 없이 일회용 라이브러리로 실행되며, `live: true`(또는 일반 가져오기처럼 사진을 앱 라이브러리에 가져오는 `open_in_lightcraft`)가 아니면 LightCraft 라이브러리나 앱을 건드리지 않습니다.
- 모든 작업은 네트워크 접근 없이 로컬에서 실행됩니다. 각 작업은 임시 폴더의 전용 엔진을 사용하며, 끝나면 폴더가 삭제됩니다.

## 개발

```bash
npm run build       # TypeScript + 단일 파일 번들(dist/bundle.cjs)
npm test            # 단위 테스트(Windows, macOS, Linux 경로 로직)
npm run test:e2e    # 실제 MCP stdio를 통한 24개 엔드투엔드 검사(합성 이미지와 DNG)
npm run pack:mcpb   # lightcraft-mcp-server.mcpb
npm run pack:codex  # Codex 플러그인 zip
```

Docker에서 Linux 테스트(먼저 `lightcraft-<버전>-linux-x86_64.tar.gz` 압축 해제):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/lightcraft-0.4.0-linux-x86_64:/opt/lightcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## 라이선스

Apache-2.0. LightCraft의 저작권은 저자(Storytold)에게 있으며 MIT 또는 Apache-2.0으로 배포됩니다.
이 프로젝트는 LightCraft 및 Storytold와 관련이 없으며 이들의 승인을 받지 않았습니다. Lightroom은 Adobe의 상표입니다.
