<p align="center"><img src="icon.png" width="120" alt="Значок LightCraft Bridge"></p>

<h1 align="center">LightCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <b>Русский</b> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Позвольте Claude проявлять ваши фото и RAW-файлы в <b>LightCraft</b>, установленном на вашем компьютере, — <b>Windows, macOS и Linux</b>:<br>
  автотон, баланс белого, пресеты, маски, точечное восстановление, HDR и панорамы, отбор и экспорт в JPEG, TIFF, WebP, AVIF и DNG.
</p>

---

## Зачем

[LightCraft](https://github.com/storytold/lightcraft) — фотобиблиотека и RAW-конвертер с открытым исходным кодом уровня Lightroom, написанный на Rust, с консольным инструментом без интерфейса (`lightcraft-cli`), 240 командами, 114 ползунками проявки и режимом MCP. Этот сервер [Model Context Protocol](https://modelcontextprotocol.io) превращает движок в **инструменты «файл → файл»** для Claude, и можно просить, например:

> *«Прояви все RAW из `D:\Свадьба\церемония` с автотоном, балансом „дневной свет“ и чёткостью +15 и экспортируй JPEG 2048 px с моим водяным знаком».*
> *«Примени мой пресет Lightroom `Moody.xmp` к этим фото и сохрани их как 16-битные TIFF в Adobe RGB».*
> *«Затемни небо на `озеро.dng` градиентным фильтром и осветли объект радиальной маской».*
> *«Собери эти 3 брекетинга в HDR DNG, а эту папку — в панораму».*
> *«Из этой серии оставь только самые резкие кадры и скопируй их в `D:\Отбор`».*

Родственные проекты: [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) и [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Платформы

| Система | Какой пакет LightCraft установить | Где сервер его находит (без настройки) | Статус |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI или портативный zip | `C:\Program Files\LightCraft`, `%LOCALAPPDATA%\Programs\LightCraft`, `PATH` | ✅ Проверено (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` или `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/lightcraft/bin`, `~/.local/bin`, `PATH` | ✅ Проверено (Debian 12, без графики) |
| **macOS** 11+ (Apple silicon и Intel) | `.dmg` (приложение) **и** `lightcraft-cli-<версия>-macos-universal.zip` | `/Applications/LightCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Поддерживается, на Mac ещё не проверено |

Загрузки: [релизы LightCraft](https://github.com/storytold/lightcraft/releases) (есть и tar.gz для FreeBSD — укажите его в `LIGHTCRAFT_DIR`). Если установлено в другом месте, задайте `LIGHTCRAFT_DIR` (папка, корень `.tar.gz` или `LightCraft.app`) или `LIGHTCRAFT_CLI`.

- **macOS:** в DMG только приложение. Распакуйте отдельный zip с `lightcraft-cli` и переместите `lightcraft-cli` в `/usr/local/bin` (или укажите путь в `LIGHTCRAFT_CLI`). При первом запуске нотаризация Apple проверяется онлайн.
- **Linux:** AppImage и Flatpak содержат только приложение, без `lightcraft-cli`; используйте deb, rpm или tar.gz. Если приложение — AppImage, задайте `LIGHTCRAFT_APP`, чтобы `open_in_lightcraft` мог его запустить. На сервере без GPU в проверенной конфигурации использовались `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Как это работает

| Часть | Что это |
| --- | --- |
| **Движок LightCraft** (`lightcraft-cli mcp`) | Собственный движок LightCraft: RAW-декодеры, проявка, маски, восстановление, склейка фото и экспорт. Для каждой задачи запускается заново, **без интерфейса** и с **одноразовой библиотекой**, поэтому никогда не трогает вашу библиотеку LightCraft и открытое окно. |
| **MCP-сервер** (Node.js) | 10 высокоуровневых инструментов. Импортирует фото по ссылке (они только читаются; XMP рядом не пишутся), применяет настройки и экспортирует туда, куда вы просили. Склейки работают с приватными копиями, поэтому рядом с оригиналами ничего не появляется. Проверяет пути и никогда ничего не перезаписывает. |
| **Живое приложение** (необязательно) | `open_in_lightcraft control=true` запускает приложение с локальным каналом управления (порт 7980), а `run_lightcraft_commands live=true` управляет им и его библиотекой. |

## Инструменты

| Инструмент | Что делает |
| --- | --- |
| `develop_photos` | Автотон, баланс белого (пресеты, Кельвины, пипетка), любой из 114 ползунков, пресеты (в том числе `.xmp` / `.lrtemplate` из Lightroom) и профили, чёрно-белое, тоновая кривая, кадрирование / пропорции / выравнивание / Upright, поворот / отражение, точечное восстановление, удаление пыли и красных глаз, маски (градиент, радиальная, яркость, цвет, кисть, объект, небо, фон) с локальными настройками, любая команда движка; одно фото, список или папка; экспорт с размером, качеством, лимитом объёма, цветовым пространством, разрядностью, резкостью, метаданными и водяным знаком |
| `convert_photos` | RAW и фото в JPEG, PNG, TIFF, WebP, AVIF или DNG как есть, с уменьшением, пакетно |
| `render_preview` | Фото так, как его видит Claude, при желании с пробной обработкой (ничего не пишется без запроса) |
| `get_photo_info` | Камера, объектив, экспозиция, время съёмки, GPS, размер, RAW или нет, и все теги EXIF / XMP |
| `merge_photos` | HDR из брекетинга, панорама, HDR-панорама — в редактируемый DNG и при желании проявленный JPEG / TIFF |
| `analyze_photos` | Отбор: оценки резкости и пересветов, серии сгруппированы, самый резкий кадр каждой копируется в папку |
| `list_lightcraft_catalog` | Ползунки проявки с диапазонами, пресеты, профили, кривые, пресеты экспорта, 240 команд, форматы |
| `run_lightcraft_commands` | Любые команды движка в одной сессии (ссылки `$steps[N].поле`), без интерфейса или в живом приложении |
| `open_in_lightcraft` | Открывает фото в приложении LightCraft (по желанию с каналом управления) |
| `get_lightcraft_status` | Платформа, установка, версия, команды, ползунки, приложение / порт управления |

| | |
| --- | --- |
| **Читает** | RAW: DNG, CR2, CR3, ARW, NEF, RAF (Bayer и X-Trans), RW2 / RWL, PEF, ORF, SRW · JPEG, PNG, TIFF, WebP, PSD (композит), JPEG XL |
| **Пишет** | JPEG, PNG (8/16 бит), TIFF (8/16/32 бит), WebP, AVIF (8/10 бит), DNG (из RAW, настройки встроены), оригинал + XMP |
| **Цветовые пространства** | sRGB, Display P3, Adobe RGB, ProPhoto RGB, Rec. 2020 |

Положения (рамки кадрирования, точки масок, пятна) — **нормализованные 0..1 от левого верхнего угла**. Маски объекта / неба / фона используют классические эвристики LightCraft 0.4 (модель ИИ не нужна).

## Пример

```json
{
  "input_dir": "D:\\Фото\\Поездка",
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
  "watermark": "© Моё Имя",
  "output_dir": "D:\\Фото\\Поездка\\export"
}
```

## Требования

- **LightCraft** с `lightcraft-cli` (проверено на **0.4.0**); см. [Платформы](#платформы)
- Node.js ≥ 20 (входит в Claude Desktop при установке `.mcpb`)

## Установка

### Claude Desktop (рекомендуется, все платформы)

1. Скачайте `lightcraft-mcp-server.mcpb` из [последнего релиза](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest).
2. Дважды щёлкните по нему (или перетащите в Claude Desktop → *Настройки → Расширения*) и нажмите **Установить**.
3. Необязательно: если LightCraft установлен не в стандартное место, укажите его папку или путь к `lightcraft-cli` в настройках расширения.

### Codex (OpenAI)

**Рекомендуется — маркетплейс (получает обновления):** *Плагины → Добавить → Добавить маркетплейс*, источник `jhonsu01/craft-marketplace`, ссылка `main`, затем установите **LightCraft Bridge** из **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Новые версии приходят при обновлении маркетплейса. Или загрузите zip (Codex сохранит его в вашей учётной записи и отклонит более новый zip с тем же именем):

1. Скачайте `lightcraft-mcp-server-<версия>-codex.zip` из [последнего релиза](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest).
2. В Codex: *Плагины → Добавить → Новый плагин*, выберите zip и нажмите **Добавить плагин**.
3. Codex запускает сервер через `node`, поэтому Node.js ≥ 20 должен быть в `PATH`. Если LightCraft установлен не в стандартное место, задайте `LIGHTCRAFT_DIR` или `LIGHTCRAFT_CLI` как системные переменные окружения (у Codex нет формы настроек для локальных плагинов).

### Claude Code / другие MCP-клиенты

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

## Настройка

| Переменная | Значение |
| --- | --- |
| `LIGHTCRAFT_DIR` | Папка LightCraft, один из его исполняемых файлов, корень `.tar.gz` (с `bin/`) или `LightCraft.app`. По умолчанию: автоопределение |
| `LIGHTCRAFT_CLI` | Путь к `lightcraft-cli` / `lightcraft-cli.exe` (важнее, чем `LIGHTCRAFT_DIR`) |
| `LIGHTCRAFT_APP` | Путь к настольному приложению, если оно в другом месте (например, AppImage в Linux) |
| `LIGHTCRAFT_CONTROL_PORT` | Порт управления настольным приложением (по умолчанию 7980) |
| `LIGHTCRAFT_MCP_TIMEOUT` | Максимум секунд на один вызов движка (по умолчанию 3600) |

## Безопасность

- Файлы **никогда не перезаписываются** без `overwrite: true`: в папке выбирается свободное имя (`_2`), существующий `output_path` — ошибка. Оригиналы только читаются; XMP рядом с ними не пишутся.
- Все пути должны быть абсолютными. Движок работает без интерфейса с одноразовой библиотекой и не трогает вашу библиотеку и приложение LightCraft, кроме случая `live: true` (или `open_in_lightcraft`, который импортирует фото в библиотеку приложения, как любой импорт).
- Всё работает локально, без доступа к сети. Каждая задача использует отдельный движок во временной папке, которая затем удаляется.

## Разработка

```bash
npm run build       # TypeScript + бандл в один файл (dist/bundle.cjs)
npm test            # модульные тесты (логика путей Windows, macOS и Linux)
npm run test:e2e    # 24 сквозные проверки через реальный MCP stdio (синтетические изображения и DNG)
npm run pack:mcpb   # lightcraft-mcp-server.mcpb
npm run pack:codex  # zip-плагин для Codex
```

Проверка Linux в Docker (сначала распакуйте `lightcraft-<версия>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/путь/к/lightcraft-0.4.0-linux-x86_64:/opt/lightcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Лицензия

Apache-2.0. LightCraft © его авторы (Storytold), MIT или Apache-2.0.
Проект не связан с LightCraft и Storytold и не одобрен ими. Lightroom — товарный знак Adobe.
