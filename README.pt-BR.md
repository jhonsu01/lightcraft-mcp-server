<p align="center"><img src="icon.png" width="120" alt="Ícone do LightCraft Bridge"></p>

<h1 align="center">LightCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <b>Português</b> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deixe o Claude revelar suas fotos e arquivos RAW com o <b>LightCraft</b> instalado no seu computador — <b>Windows, macOS e Linux</b>:<br>
  tom automático, balanço de branco, predefinições, máscaras, remoção de manchas, HDR e panoramas, seleção e exportação para JPEG, TIFF, WebP, AVIF e DNG.
</p>

---

## Por quê

O [LightCraft](https://github.com/storytold/lightcraft) é uma fototeca e revelador RAW de código aberto, no nível do Lightroom, escrito em Rust, com uma CLI sem interface (`lightcraft-cli`), 240 comandos, 114 controles de revelação e um modo MCP. Este servidor [Model Context Protocol](https://modelcontextprotocol.io) transforma esse motor em **ferramentas de arquivo para arquivo** para o Claude, para pedir coisas como:

> *"Revele todos os RAW de `D:\Casamento\cerimonia` com tom automático, balanço luz do dia e +15 de claridade, e exporte JPEG em 2048 px com minha marca d'água."*
> *"Aplique minha predefinição do Lightroom `Moody.xmp` a estas fotos e salve como TIFF de 16 bits em Adobe RGB."*
> *"Escureça o céu de `lago.dng` com um filtro graduado e ilumine o assunto com uma máscara radial."*
> *"Junte estes 3 bracketings em um DNG HDR, e monte esta pasta como panorama."*
> *"Desta sequência, fique só com as fotos mais nítidas e copie-as para `D:\Selecao`."*

Irmão do [photocraft-mcp-server](https://github.com/jhonsu01/photocraft-mcp-server), [vectorcraft-mcp-server](https://github.com/jhonsu01/vectorcraft-mcp-server), [filmcraft-mcp-server](https://github.com/jhonsu01/filmcraft-mcp-server), [pdfcraft-mcp-server](https://github.com/jhonsu01/pdfcraft-mcp-server) e [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| Sistema | Pacote do LightCraft a instalar | Onde o servidor o encontra (sem configurar) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86, arm64) | MSI ou zip portátil | `C:\Program Files\LightCraft`, `%LOCALAPPDATA%\Programs\LightCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/lightcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sem interface) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (o app) **mais** `lightcraft-cli-<versão>-macos-universal.zip` | `/Applications/LightCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Suportado, ainda não testado em um Mac |

Downloads: [versões do LightCraft](https://github.com/storytold/lightcraft/releases) (há também um tar.gz para FreeBSD; aponte `LIGHTCRAFT_DIR` para ele). Em qualquer outro local: defina `LIGHTCRAFT_DIR` (pasta, raiz do `.tar.gz` ou `LightCraft.app`) ou `LIGHTCRAFT_CLI`.

- **macOS:** o DMG contém apenas o app. Descompacte o zip separado do `lightcraft-cli` e mova `lightcraft-cli` para `/usr/local/bin` (ou aponte `LIGHTCRAFT_CLI` para ele). A primeira execução verifica a notarização da Apple online.
- **Linux:** o AppImage e o Flatpak contêm apenas o app, sem `lightcraft-cli`; use o deb, o rpm ou o tar.gz. Se o app for um AppImage, defina `LIGHTCRAFT_APP` para que `open_in_lightcraft` consiga iniciá-lo. Em um servidor sem GPU, a configuração verificada usou `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig`.

## Como funciona

| Parte | O que é |
| --- | --- |
| **Motor do LightCraft** (`lightcraft-cli mcp`) | O próprio motor do LightCraft: decodificadores RAW, revelação, máscaras, correção, Mesclagem de fotos e exportadores. Iniciado do zero e **sem interface** para cada tarefa com uma **fototeca descartável**, então nunca toca sua fototeca do LightCraft nem uma janela aberta. |
| **Servidor MCP** (Node.js) | 10 ferramentas de alto nível. Importa suas fotos por referência (elas só são lidas; nenhum XMP é gravado ao lado delas), aplica os ajustes e exporta onde você pediu. As mesclagens rodam em cópias privadas, então nada aparece ao lado dos originais. Valida caminhos e nunca sobrescreve. |
| **App ao vivo** (opcional) | `open_in_lightcraft control=true` inicia o app com seu canal de controle apenas local (porta 7980) e `run_lightcraft_commands live=true` o controla junto com sua fototeca. |

## Ferramentas

| Ferramenta | O que faz |
| --- | --- |
| `develop_photos` | Tom automático, balanço de branco (predefinições, Kelvin, conta-gotas), qualquer um dos 114 controles, predefinições (também `.xmp` / `.lrtemplate` do Lightroom) e perfis, preto e branco, curva de tons, corte / proporção / endireitar / vertical, girar / espelhar, remoção de manchas, poeira e olhos vermelhos, máscaras (graduada, radial, luminância, cor, pincel, assunto, céu, fundo) com ajustes locais, qualquer comando do motor; uma foto, uma lista ou uma pasta; exporta com tamanho, qualidade, limite de tamanho, espaço de cor, profundidade de bits, nitidez, metadados e marca d'água |
| `convert_photos` | RAW e fotos para JPEG, PNG, TIFF, WebP, AVIF ou DNG como estão, redimensionadas, em lote |
| `render_preview` | Uma foto como o Claude a vê, opcionalmente com um ajuste de teste (nada é gravado se não pedir) |
| `get_photo_info` | Câmera, lente, exposição, data de captura, GPS, tamanho, se é RAW, e cada tag EXIF / XMP |
| `merge_photos` | HDR de bracketings, panorama, panorama HDR — como DNG editável e opcionalmente JPEG / TIFF revelado |
| `analyze_photos` | Seleção: notas de nitidez e de recorte, sequências agrupadas e a mais nítida de cada uma copiada para uma pasta |
| `list_lightcraft_catalog` | Controles de revelação com faixas, predefinições, perfis, curvas, predefinições de exportação, 240 comandos, formatos |
| `run_lightcraft_commands` | Quaisquer comandos do motor em uma sessão (referências `$steps[N].campo`), sem interface ou no app ao vivo |
| `open_in_lightcraft` | Abre fotos no app LightCraft (opcionalmente com o canal de controle) |
| `get_lightcraft_status` | Plataforma, instalação, versão, comandos, controles, app / porta de controle |

| | |
| --- | --- |
| **Lê** | RAW: DNG, CR2, CR3, ARW, NEF, RAF (Bayer e X-Trans), RW2 / RWL, PEF, ORF, SRW · JPEG, PNG, TIFF, WebP, PSD (composto), JPEG XL |
| **Grava** | JPEG, PNG (8/16 bits), TIFF (8/16/32 bits), WebP, AVIF (8/10 bits), DNG (entradas RAW, ajustes embutidos), original + XMP |
| **Espaços de cor** | sRGB, Display P3, Adobe RGB, ProPhoto RGB, Rec. 2020 |

As posições (retângulos de corte, pontos de máscara, manchas) são **normalizadas 0..1 a partir do canto superior esquerdo**. As máscaras de assunto / céu / fundo usam as heurísticas clássicas do LightCraft 0.4 (sem modelo de IA).

## Exemplo

```json
{
  "input_dir": "D:\\Fotos\\Viagem",
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
  "watermark": "© Meu Nome",
  "output_dir": "D:\\Fotos\\Viagem\\export"
}
```

## Requisitos

- **LightCraft** com `lightcraft-cli` (testado com **0.4.0**); veja [Plataformas](#plataformas)
- Node.js ≥ 20 (incluído no Claude Desktop para instalações `.mcpb`)

## Instalação

### Claude Desktop (recomendado, todas as plataformas)

1. Baixe `lightcraft-mcp-server.mcpb` da [versão mais recente](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest).
2. Clique duas vezes (ou arraste para o Claude Desktop → *Configurações → Extensões*) e clique em **Instalar**.
3. Opcional: se o LightCraft não estiver em um local padrão, informe a pasta ou o caminho do `lightcraft-cli` nas configurações da extensão.

### Codex (OpenAI)

**Recomendado — o marketplace (recebe atualizações):** *Plugins → Adicionar → Adicionar marketplace*, origem `jhonsu01/craft-marketplace`, referência `main`, e instale o **LightCraft Bridge** em **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). As novas versões chegam ao atualizar o marketplace. Ou envie o zip (o Codex o guarda na sua conta e recusa um zip mais novo com o mesmo nome):

1. Baixe `lightcraft-mcp-server-<versão>-codex.zip` da [versão mais recente](https://github.com/jhonsu01/lightcraft-mcp-server/releases/latest).
2. No Codex: *Plugins → Adicionar → Novo plugin*, escolha o zip e clique em **Adicionar plugin**.
3. O Codex inicia o servidor com `node`, então o Node.js ≥ 20 precisa estar no `PATH`. Se o LightCraft não estiver em um local padrão, defina `LIGHTCRAFT_DIR` ou `LIGHTCRAFT_CLI` como variáveis de ambiente do sistema (o Codex não tem formulário de configuração para plugins locais).

### DeepSeek Harness

1. *Plugins → Add plugin*, digite `github:jhonsu01/craft-marketplace#path:/plugins/lightcraft-mcp-server` e clique em **Install** e depois em **Enable now**.
2. O Harness inicia o servidor com seu próprio cliente MCP e `node` (Node.js ≥ 20 no `PATH`); as ferramentas aparecem como `mcp__lightcraft__<ferramenta>` e os arquivos de saída como cartões que abrem no Harness.
3. O Harness ainda não atualiza plugins sozinho: para atualizar, desinstale o plugin e instale-o de novo com o mesmo endereço.

### Claude Code / outros clientes MCP

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

## Configuração

| Variável | Significado |
| --- | --- |
| `LIGHTCRAFT_DIR` | Pasta do LightCraft, um de seus executáveis, a raiz de um `.tar.gz` (com `bin/`) ou `LightCraft.app`. Padrão: detecção automática |
| `LIGHTCRAFT_CLI` | Caminho do `lightcraft-cli` / `lightcraft-cli.exe` (tem prioridade sobre `LIGHTCRAFT_DIR`) |
| `LIGHTCRAFT_APP` | Caminho do app de desktop quando está em outro lugar (ex.: um AppImage no Linux) |
| `LIGHTCRAFT_CONTROL_PORT` | Porta de controle do app de desktop (padrão 7980) |
| `LIGHTCRAFT_MCP_TIMEOUT` | Máximo de segundos por chamada ao motor (padrão 3600) |

## Segurança

- Os arquivos **nunca são sobrescritos**, exceto com `overwrite: true`: em uma pasta é usado um nome livre (`_2`) e um `output_path` existente dá erro. Os originais só são lidos; nenhum XMP é gravado ao lado deles.
- Todos os caminhos devem ser absolutos. O motor roda sem interface com uma fototeca descartável e nunca toca sua fototeca nem o app do LightCraft, exceto com `live: true` (ou `open_in_lightcraft`, que importa as fotos para a fototeca do app como qualquer importação).
- Tudo roda localmente, sem acesso à rede. Cada tarefa usa um motor privado em uma pasta temporária que é apagada ao final.

## Desenvolvimento

```bash
npm run build       # TypeScript + bundle de arquivo único (dist/bundle.cjs)
npm test            # testes unitários (lógica de caminhos de Windows, macOS e Linux)
npm run test:e2e    # 24 testes de ponta a ponta via MCP stdio real (imagens e DNG sintéticos)
npm run pack:mcpb   # lightcraft-mcp-server.mcpb
npm run pack:codex  # zip de plugin para o Codex
```

Teste de Linux no Docker (descompacte antes `lightcraft-<versão>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/caminho/para/lightcraft-0.4.0-linux-x86_64:/opt/lightcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 fontconfig && node scripts/e2e.mjs"
```

## Licença

Apache-2.0. O LightCraft é © de seus autores (Storytold), MIT ou Apache-2.0.
Este projeto não é afiliado nem endossado pelo LightCraft ou pela Storytold. Lightroom é marca da Adobe.
