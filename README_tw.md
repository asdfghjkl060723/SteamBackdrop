<h1 align="center">SteamBackdrop</h1>

<p align="center">替 Steam 客戶端視窗換上自訂桌布的 Millennium 外掛</p>

<p align="center"><b><a href="README.md">English</a> | <a href="README_zh.md">简体中文</a> | <a href="README_tw.md">繁體中文</a></b></p>

---

### 功能

- **自動掃描 Wallpaper Engine 桌布**：列舉所有 Steam 庫（`libraryfolders.vdf`），掃描工作坊訂閱目錄（`steamapps/workshop/content/431960`）與 WE 本機專案目錄（`projects/defaultprojects`、`projects/myprojects`），直接套用原始高畫質影片/圖片檔案，不使用預覽圖
- **自訂桌布**：把任意圖片/影片放進外掛的 `media` 資料夾即可使用
- **桌布透明度滑桿**：0%～100% 即時調整，顯示百分比
- **生效範圍**：庫主頁（始終生效）+ 可選遊戲詳情頁（封面下方區域）+ 可選其他頁面（商店/社群/下載等網頁背景透出桌布）
- **介面語言跟隨 Steam**：簡體中文/繁體中文顯示中文，其他語言顯示英文

### 前置要求

- Windows 版 Steam 客戶端
- 已安裝 **[Millennium](https://github.com/SteamClientHomebrew/Millennium)**（本外掛是 Millennium 外掛，沒有它無法執行）
- Wallpaper Engine **可選**——只有需要掃描 WE 桌布時才需要安裝；純自訂桌布不需要

### 安裝

1. 從 [Releases](../../releases) 下載 `SteamBackdrop-vX.Y.Z.zip`
2. 解壓縮，把 `steambackdrop` 資料夾放進 Steam 的 Millennium 外掛目錄：
   ```
   <Steam 安裝目錄>\millennium\plugins\steambackdrop
   ```
3. 重新啟動 Steam
4. 開啟 Millennium 設定 → 外掛 → **SteamBackdrop**，選擇桌布即可

### 自訂桌布

把檔案放進外掛目錄的 `media` 資料夾，重新啟動 Steam 後在下拉清單中選擇。

**支援的格式**

| 類型 | 格式 |
|---|---|
| 影片 | `.mp4` `.webm` `.m4v` `.mov` |
| 圖片 | `.png` `.jpg` `.jpeg` `.webp` `.bmp` `.gif` |

> **已知限制**
>
> Wallpaper Engine 中部分隨時間變化（如晝夜切換）的桌布包含**多個影片檔案**，本外掛只識別單個影片檔案，無法識別這類多影片結構。
>
> 推薦用 [WeRePkg](https://github.com/ilgnefz/we_repkg) 把這類桌布下載/提取後，將需要的影片檔案放入 `media` 資料夾使用。

### 從原始碼建置

需要 Node.js。

```bash
npm install
npx starlight pack -o out                      # 編譯前端
python scripts/extract_bundle.py out/steambackdrop.star dist-index.js   # 從 .star 提取 bundle
```

然後把產物部署為外掛目錄（`webkit.js` 無建置步驟，直接複製）：

```
steambackdrop/
├── plugin.json
├── millennium.toml
├── backend/main.lua
├── frontend/index.tsx          # 原始碼
├── webkit.js
└── .millennium/Dist/
    ├── index.js                # = dist-index.js
    └── webkit.js
```

### 致謝

靈感來自 [mayflyTheme](https://github.com/aojiangfuyou1/mayflyTheme) 與 [WeRePkg](https://github.com/ilgnefz/we_repkg)。本外掛為獨立實作，未使用上述專案的程式碼。

### 授權

[MIT](LICENSE)
