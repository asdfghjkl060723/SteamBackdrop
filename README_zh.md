<h1 align="center">SteamBackdrop</h1>

<p align="center">给 Steam 客户端窗口换上自定义壁纸的 Millennium 插件</p>

<p align="center"><b><a href="README.md">English</a> | <a href="README_zh.md">简体中文</a> | <a href="README_tw.md">繁體中文</a></b></p>

---

### 功能

- **自动扫描 Wallpaper Engine 壁纸**：枚举所有 Steam 库（`libraryfolders.vdf`），扫描工坊订阅目录（`steamapps/workshop/content/431960`）和 WE 本地项目目录（`projects/defaultprojects`、`projects/myprojects`），直接应用原始高清视频/图片文件，不使用预览图
- **自定义壁纸**：把任意图片/视频放进插件的 `media` 文件夹即可使用
- **壁纸透明度滑条**：0%～100% 实时调节，显示百分比
- **生效范围**：库主页（始终生效）+ 可选游戏详情页（封面下方区域）+ 可选其他页面（商店/社区/下载等网页背景透出壁纸）
- **界面语言跟随 Steam**：简体中文/繁体中文显示中文，其他语言显示英文

### 前置要求

- Windows 版 Steam 客户端
- 已安装 **[Millennium](https://github.com/SteamClientHomebrew/Millennium)**（本插件是 Millennium 插件，没有它无法运行）
- Wallpaper Engine **可选**——只有需要扫描 WE 壁纸时才需要安装；纯自定义壁纸不需要

### 安装

1. 从 [Releases](../../releases) 下载 `SteamBackdrop-vX.Y.Z.zip`
2. 解压，把 `steambackdrop` 文件夹放进 Steam 的 Millennium 插件目录：
   ```
   <Steam 安装目录>\millennium\plugins\steambackdrop
   ```
3. 重启 Steam
4. 打开 Millennium 设置 → 插件 → **SteamBackdrop**，选择壁纸即可

### 自定义壁纸

把文件放进插件目录的 `media` 文件夹，重启 Steam 后在下拉列表中选择。

**支持的格式**

| 类型 | 格式 |
|---|---|
| 视频 | `.mp4` `.webm` `.m4v` `.mov` |
| 图片 | `.png` `.jpg` `.jpeg` `.webp` `.bmp` `.gif` |

> **已知限制**
>
> Wallpaper Engine 中部分随时间变化（如昼夜切换）的壁纸包含**多个视频文件**，本插件只识别单个视频文件，无法识别这类多视频结构。
>
> 推荐用 [WeRePkg](https://github.com/ilgnefz/we_repkg) 把这类壁纸下载/提取后，将需要的视频文件放入 `media` 文件夹使用。

### 从源码构建

需要 Node.js。

```bash
npm install
npx starlight pack -o out                      # 编译前端
python scripts/extract_bundle.py out/steambackdrop.star dist-index.js   # 从 .star 提取 bundle
```

然后把产物部署为插件目录（`webkit.js` 无构建步骤，直接复制）：

```
steambackdrop/
├── plugin.json
├── millennium.toml
├── backend/main.lua
├── frontend/index.tsx          # 源码
├── webkit.js
└── .millennium/Dist/
    ├── index.js                # = dist-index.js
    └── webkit.js
```

### 致谢

灵感来自 [mayflyTheme](https://github.com/aojiangfuyou1/mayflyTheme) 与 [WeRePkg](https://github.com/ilgnefz/we_repkg)。本插件为独立实现，未使用上述项目的代码。

### 许可证

[MIT](LICENSE)
