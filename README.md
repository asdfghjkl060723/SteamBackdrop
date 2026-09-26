<h1 align="center">SteamBackdrop</h1>

<p align="center">A <a href="https://github.com/SteamClientHomebrew/Millennium">Millennium</a> plugin that puts a custom wallpaper behind the entire Steam client window.</p>

<p align="center"><b><a href="README.md">English</a> | <a href="README_zh.md">简体中文</a> | <a href="README_tw.md">繁體中文</a></b></p>

---

### Features

- **Auto-scans Wallpaper Engine wallpapers** across *all* Steam libraries (`libraryfolders.vdf`): workshop subscriptions (`steamapps/workshop/content/431960`) and WE local projects (`projects/defaultprojects`, `projects/myprojects`) — applies the original HD video/image files, not preview images
- **Custom wallpapers**: drop any image/video into the plugin's `media` folder
- **Opacity slider** with live percentage (0%–100%)
- **Scope**: library home (always) + optional game details page (below the cover) + optional other pages (store/community/downloads pages show the wallpaper through a transparent page background)
- **UI language follows Steam**: Simplified/Traditional Chinese → Chinese, any other language → English

### Requirements

- Windows Steam client
- **[Millennium](https://github.com/SteamClientHomebrew/Millennium) installed** — this plugin cannot run without it
- Wallpaper Engine is **optional** — only needed for the WE wallpaper scan; custom media-folder wallpapers work without it

### Installation

1. Download `SteamBackdrop-vX.Y.Z.zip` from [Releases](../../releases)
2. Extract and place the `steambackdrop` folder into Millennium's plugin directory:
   ```
   <Steam install dir>\millennium\plugins\steambackdrop
   ```
3. Restart Steam
4. Open Millennium Settings → Plugins → **SteamBackdrop** and pick a wallpaper

### Custom Wallpapers

Drop files into the plugin's `media` folder and restart Steam; they appear in the wallpaper dropdown.

**Supported formats**

| Type | Formats |
|---|---|
| Video | `.mp4` `.webm` `.m4v` `.mov` |
| Image | `.png` `.jpg` `.jpeg` `.webp` `.bmp` `.gif` |

> **Known limitation**
>
> Some time-based (e.g. day/night) Wallpaper Engine wallpapers contain **multiple video files**. This plugin only recognizes a single video file and cannot handle such multi-video structures.
>
> For those wallpapers, use [WeRePkg](https://github.com/ilgnefz/we_repkg) to download/extract them, then put the video file you want into the `media` folder.

### Building from Source

Requires Node.js.

```bash
npm install
npx starlight pack -o out                      # build frontend
python scripts/extract_bundle.py out/steambackdrop.star dist-index.js   # extract bundle from .star
```

Deploy the artifacts as the plugin directory (`webkit.js` is hand-written, just copy it):

```
steambackdrop/
├── plugin.json
├── millennium.toml
├── backend/main.lua
├── frontend/index.tsx          # source
├── webkit.js
└── .millennium/Dist/
    ├── index.js                # = dist-index.js
    └── webkit.js
```

### Credits

Inspired by [mayflyTheme](https://github.com/aojiangfuyou1/mayflyTheme) and [WeRePkg](https://github.com/ilgnefz/we_repkg). This plugin is an independent implementation and contains no code from those projects.

### License

[MIT](LICENSE)
