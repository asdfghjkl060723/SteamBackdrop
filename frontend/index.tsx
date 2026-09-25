import { definePlugin } from 'millennium';
import { useEffect, useState } from 'react';

/*
 * SteamBackdrop (steambackdrop) — 前端 (v1.0.0)
 *
 * RPC 注意：
 * 1. 必须用 window.Millennium.callServerMethod(pluginName, method, args)，
 *    不能用导入的 Millennium.callServerMethod —— starlight 编译器会给导入形式的
 *    调用自动注入 pluginName 参数，导致参数错位。
 * 2. Millennium v3 的 callServerMethod 直接把 Lua 返回值 resolve 出来（内部字段叫
 *    returnJson），外层没有 {success, value} 信封；Lua 报错时 Promise 直接 reject。
 * 3. 参数形式：数组 [a, b] 会展开成多个 Lua 参数；对象 {k: v} 会变成一张 Lua 表
 *    作为单个参数传入（后端 GetImageData 已兼容取 .name）。
 */

const PLUGIN = 'steambackdrop';
const LIB_CONTENT = '_2gSXCB6PbOlMxslr8hm6dm';

/* ---------------- 语言 ----------------
 * Steam 在 SharedJSContext 的 URL 上带 LANGUAGE 参数（schinese/tchinese/english…）。
 * 简中/繁中显示中文，其余一律英文。 */
const IS_ZH = (() => {
	try {
		const v = (new URLSearchParams(window.location.search).get('LANGUAGE') || '').toLowerCase();
		return v === 'schinese' || v === 'tchinese';
	} catch (e) {
		return false;
	}
})();

const STR = IS_ZH
	? {
			toast: '壁纸加载需要些许时间，请耐心等待',
			connecting: '正在连接后端…',
			scanning: '正在扫描…',
			mediaCount: (n: number) => `media ${n} 张`,
			mediaFail: (e: string) => `media 扫描失败：${e}`,
			weCount: (n: number) => `Wallpaper Engine ${n} 张`,
			weFail: (e: string) => `WE 扫描失败：${e}`,
			unknownErr: '未知错误',
			found: (p: string) => `发现 ${p}`,
			readFail: (e: string) => `读取设置失败：${e}`,
			saveFail: (e: string) => `保存失败：${e}`,
			saved: '已保存',
			bgOff: '已关闭背景',
			loading: (n: string) => `正在加载「${n}」…`,
			applied: (n: string) => `已应用：${n}`,
			loadFail: (e: string) => `加载失败：${e}`,
			noMedia: '无法读取媒体文件',
			header: '已自动扫描本插件 media 目录 + Wallpaper Engine 视频/静态壁纸（应用原始高清文件，非预览图）',
			previewPlaceholder: '壁纸预览区 — 选择壁纸后在此显示',
			wallpaper: '壁纸：',
			none: '（无背景）',
			grpMedia: '本插件 media 目录',
			grpWe: 'Wallpaper Engine（仅视频/静态类，交互式已隐藏）',
			opacity: '壁纸透明度：',
			coversWindow: '壁纸覆盖整个窗口（含顶部工具栏与左侧游戏列表）',
			enable: '启用壁纸功能',
			scope: '生效范围：',
			scopeHome: '库主页',
			scopeDetails: '游戏详情页',
			scopeOther: '其他页面',
			scopeHint: '游戏详情页：壁纸显示在游戏封面下方区域；其他页面：商店/社区/下载等页面背景也应用壁纸',
			mediaDirLabel: 'media 目录：',
		}
	: {
			toast: 'Wallpaper is loading, please be patient…',
			connecting: 'Connecting to backend…',
			scanning: 'Scanning…',
			mediaCount: (n: number) => `media: ${n} file(s)`,
			mediaFail: (e: string) => `media scan failed: ${e}`,
			weCount: (n: number) => `Wallpaper Engine: ${n} wallpaper(s)`,
			weFail: (e: string) => `WE scan failed: ${e}`,
			unknownErr: 'Unknown error',
			found: (p: string) => `Found ${p}`,
			readFail: (e: string) => `Failed to read settings: ${e}`,
			saveFail: (e: string) => `Failed to save: ${e}`,
			saved: 'Saved',
			bgOff: 'Wallpaper turned off',
			loading: (n: string) => `Loading "${n}"…`,
			applied: (n: string) => `Applied: ${n}`,
			loadFail: (e: string) => `Failed to load: ${e}`,
			noMedia: 'Cannot read media file',
			header: 'Auto-scans this plugin\'s media folder + Wallpaper Engine video/static wallpapers (applies the original HD files, not preview images)',
			previewPlaceholder: 'Wallpaper preview — select a wallpaper to display it here',
			wallpaper: 'Wallpaper:',
			none: '(none)',
			grpMedia: 'This plugin\'s media folder',
			grpWe: 'Wallpaper Engine (video/static only, interactive ones hidden)',
			opacity: 'Wallpaper opacity:',
			coversWindow: 'The wallpaper covers the entire window (including the top toolbar and left game list)',
			enable: 'Enable wallpaper',
			scope: 'Apply to:',
			scopeHome: 'Library home',
			scopeDetails: 'Game details page',
			scopeOther: 'Other pages',
			scopeHint: 'Game details page: the wallpaper shows below the game cover; Other pages: store/community/downloads pages get the wallpaper too',
			mediaDirLabel: 'media folder: ',
		};

interface Settings {
	name: string;
	dim: string;
	enabled: boolean;
	/** 游戏详情页（封面下方区域）也显示壁纸 */
	details?: boolean;
	/** 其他页面（商店/社区/下载等）也显示壁纸 */
	other?: boolean;
}

interface MediaFile {
	token: string;
	name: string;
	size: number;
	kind?: string;
	mime?: string;
}

interface WeWallpaper {
	token: string;
	title: string;
	folder: string;
	kind?: string;
	size?: number;
}

interface MediaInfo {
	ok: boolean;
	kind?: string;
	mime?: string;
	size?: number;
	error?: string;
}

interface RpcResp {
	success: boolean;
	error?: string;
	value?: string;
}

/** 调用后端 RPC。Millennium v3 直接 resolve Lua 返回值（我们的后端返回 JSON 字符串）；失败抛错 */
async function rpc<T>(method: string, args?: any): Promise<T | null> {
	const w = window as any;
	if (!w.Millennium || typeof w.Millennium.callServerMethod !== 'function') {
		throw new Error('Millennium FFI unavailable');
	}
	const raw: any = await w.Millennium.callServerMethod(PLUGIN, method, args);
	if (raw === null || raw === undefined || raw === '') return null;
	if (typeof raw === 'string') return JSON.parse(raw) as T;
	return raw as T;
}

/* ---------------- 壁纸引擎 ----------------
 * 插件前端只运行在 SharedJSContext，库页面在主窗口文档里——
 * 必须通过 g_PopupManager / MainWindowBrowserManager / 窗口钩子拿主窗口 document
 * （机制参考 what-to-play-today 插件，三道机制 + 轮询兜底） */
const DEFAULTS: Settings = { name: '', dim: '0', enabled: true, details: true, other: false };
let current: Settings = { ...DEFAULTS };
let mediaUrlCache = '';
let mediaUrlCacheName = '';
let mediaKind: 'video' | 'image' | '' = '';
let assembling = false;
let engineStarted = false;
let mainDoc: Document | null = null;

const DESKTOP_WINDOW_NAMES = ['SP Desktop_uid0', 'SP Desktop_uid1', 'SP Desktop_uid2', 'SP Desktop_uid3'];

/* 整窗覆盖：把 Steam 所有不透明底（根包装/顶栏/底栏/侧栏/主面板/详情页容器）全部透明，
 * 壁纸层 fixed 铺在最底下，效果 = 整个窗口都是壁纸（同 mayflyTheme） */
const LAYER_CSS = `
html, body { background: transparent !important; }
.ForceOpaqueBackground { background: transparent !important; }
[class*="TopBar"], [class*="BottomBar"] { background: transparent !important; }
._3Z7VQ1IMk4E3HsHvrkLNgo, ._3x1HklzyDs4TEjACrRO2tB, ._3BFcmjAaMyP6GTPwc0VyWi, ._2Dd4T78PcCTUVgOtDGFY5j,
._3Sb2o_mQ30IDRh0C72QUUu, ._2gSXCB6PbOlMxslr8hm6dm { background: transparent !important; }
/* 游戏详情页：封面下方主体滚动区 + 开始游戏栏透明，壁纸透到封面下方 */
[class*=AppDetailsMain] [class*=ScrollContainer],
[class*=AppDetailsMain] [class*=PlayBar] { background: transparent !important; }
/* 商店/社区等网页页：地址栏透明，壁纸透出到 Steam 边框区（网页内容区域由页面自身绘制，无法覆盖） */
[class*=BrowserWrapper] [class*=URLBar] { background: transparent !important; }
`;

function getPopupManager(): any {
	return Reflect.get(globalThis, 'g_PopupManager') || null;
}

function docFromPopup(p: any): Document | null {
	const win = p && (p.window || p.m_popup);
	return win && win.document && win.document.body ? win.document : null;
}

function getMainWindowDocument(): Document | null {
	const pm = getPopupManager();
	for (const name of DESKTOP_WINDOW_NAMES) {
		try {
			const d = docFromPopup(pm && pm.GetExistingPopup && pm.GetExistingPopup(name));
			if (d) return d;
		} catch (e) {
			/* 尝试下一个 */
		}
	}
	try {
		const manager = Reflect.get(globalThis, 'MainWindowBrowserManager');
		const d = docFromPopup(manager && manager.m_browser);
		if (d) return d;
	} catch (e) {
		/* ignore */
	}
	return null;
}

/** 获取（并缓存）主窗口文档；拿不到时返回上次缓存 */
function activeDoc(): Document | null {
	const d = getMainWindowDocument();
	if (d) mainDoc = d;
	return mainDoc;
}

function injectCss(doc: Document): void {
	if (doc.getElementById('we-wallpaper-css')) return;
	const style = doc.createElement('style');
	style.id = 'we-wallpaper-css';
	style.textContent = LAYER_CSS;
	doc.documentElement.appendChild(style);
}

function removeCss(doc: Document): void {
	const el = doc.getElementById('we-wallpaper-css');
	if (el && el.parentElement) el.parentElement.removeChild(el);
}

/** 识别主窗口当前页面：库主页 / 游戏详情页 / 其他页面 */
type PageKind = 'home' | 'details' | 'other';
function detectPage(doc: Document): PageKind {
	try {
		// 商店/社区等网页覆盖层（含可见地址栏的浏览器包装器；关闭后元素会残留但不可见）
		const bar = doc.querySelector('[class*=BrowserWrapper] [class*=URLBar]');
		if (bar) {
			const r = bar.getBoundingClientRect();
			if (r.width > 0 && r.height > 0) return 'other';
		}
		if (doc.querySelector('[class*=AppDetailsMain] [class*=PlayBar]')) return 'details';
		if (doc.querySelector('[class*=LibraryHome]')) return 'home';
	} catch (e) {
		/* ignore */
	}
	return 'other';
}

/** 加载提示 toast（主窗口底部居中） */
function showToast(doc: Document): void {
	let t = doc.getElementById('we-wallpaper-toast') as HTMLElement | null;
	if (!t) {
		t = doc.createElement('div');
		t.id = 'we-wallpaper-toast';
		t.style.cssText =
			'position:fixed;left:50%;bottom:52px;transform:translateX(-50%);z-index:999999;' +
			'padding:10px 22px;border-radius:8px;background:rgba(20,22,28,.92);color:#fff;' +
			'font-size:13px;letter-spacing:.3px;box-shadow:0 4px 16px rgba(0,0,0,.5);pointer-events:none;';
		t.textContent = STR.toast;
		doc.body.appendChild(t);
	}
	t.style.display = 'block';
}

function hideToast(doc: Document): void {
	const t = doc.getElementById('we-wallpaper-toast') as HTMLElement | null;
	if (t) t.style.display = 'none';
}

/** 清理旧版留在库容器上的内联背景 */
function clearLegacy(doc: Document): void {
	const el = doc.querySelector('.' + LIB_CONTENT);
	if (el) {
		(el as HTMLElement).style.removeProperty('background-image');
		(el as HTMLElement).style.removeProperty('box-shadow');
	}
}

function base64ToBytes(b64: string): Uint8Array {
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

/** 分块拉取媒体并拼 Blob URL（视频/大图都走这条路，blob: 同源跨文档可用） */
async function assembleMedia(name: string): Promise<boolean> {
	if (mediaUrlCacheName === name && mediaUrlCache) return true;
	if (assembling) return false;
	assembling = true;
	const doc = activeDoc();
	if (doc) showToast(doc);
	try {
		const info = await rpc<MediaInfo>('GetMediaInfo', { name });
		if (!info || !info.ok || !info.mime || !info.size) return false;
		const total = info.size;
		const parts: BlobPart[] = [];
		const CHUNK = 1024 * 1024;
		for (let off = 0; off < total; off += CHUNK) {
			// 注意：必须用数组参数。对象形式经 Millennium FFI 传给 Lua 会丢字段（实测报 bad name）
			const c = await rpc<{ ok: boolean; b64?: string; error?: string }>('GetMediaChunk', [name, off, CHUNK]);
			if (!c || !c.ok || !c.b64) return false;
			parts.push(base64ToBytes(c.b64).buffer as ArrayBuffer);
		}
		const blob = new Blob(parts, { type: info.mime });
		if (mediaUrlCache) URL.revokeObjectURL(mediaUrlCache);
		mediaUrlCache = URL.createObjectURL(blob);
		mediaUrlCacheName = name;
		mediaKind = info.kind === 'video' ? 'video' : 'image';
		return true;
	} finally {
		assembling = false;
		if (doc) hideToast(doc);
	}
}

function resetMedia(): void {
	if (mediaUrlCache) URL.revokeObjectURL(mediaUrlCache);
	mediaUrlCache = '';
	mediaUrlCacheName = '';
	mediaKind = '';
}

interface LayerParts {
	layer: HTMLElement;
	mediaHost: HTMLElement;
	dim: HTMLElement;
}

/** 在主窗口文档里建/取整窗壁纸层 */
function ensureLayer(doc: Document): LayerParts | null {
	let layer = doc.getElementById('we-wallpaper-layer') as HTMLElement | null;
	if (layer) {
		return {
			layer,
			mediaHost: layer.querySelector('.we-wallpaper-media') as HTMLElement,
			dim: layer.querySelector('.we-wallpaper-dim') as HTMLElement,
		};
	}
	try {
		layer = doc.createElement('div');
		layer.id = 'we-wallpaper-layer';
		layer.style.cssText =
			'position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:transparent;';
		const mediaHost = doc.createElement('div');
		mediaHost.className = 'we-wallpaper-media';
		mediaHost.style.cssText = 'position:absolute;inset:0;';
		const dim = doc.createElement('div');
		dim.className = 'we-wallpaper-dim';
		dim.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
		layer.appendChild(mediaHost);
		layer.appendChild(dim);
		doc.body.appendChild(layer);
		return { layer, mediaHost, dim };
	} catch (e) {
		return null;
	}
}

function removeLayer(doc: Document): void {
	const layer = doc.getElementById('we-wallpaper-layer');
	if (layer && layer.parentElement) layer.parentElement.removeChild(layer);
}

function renderLayer(): void {
	const doc = activeDoc();
	if (!doc) return;
	clearLegacy(doc);
	const dim = parseFloat(current.dim || '0') || 0;
	// 生效范围：库主页始终生效；详情页/其他页面按勾选
	const page = detectPage(doc);
	const scoped =
		page === 'home' || (page === 'details' && current.details !== false) || (page === 'other' && current.other === true);
	if (!current.enabled || !current.name || !mediaUrlCache || !scoped) {
		removeLayer(doc);
		removeCss(doc);
		return;
	}
	injectCss(doc);
	const parts = ensureLayer(doc);
	if (!parts) return;
	parts.dim.style.background = dim > 0 ? 'rgba(0,0,0,' + dim + ')' : 'transparent';
	// 媒体元素按类型切换（video 自动静音循环播放）
	const wantTag = mediaKind === 'video' ? 'VIDEO' : 'IMG';
	let el = parts.mediaHost.firstElementChild as HTMLElement | null;
	if (!el || el.tagName !== wantTag) {
		while (parts.mediaHost.firstChild) parts.mediaHost.removeChild(parts.mediaHost.firstChild);
		el = doc.createElement(mediaKind === 'video' ? 'video' : 'img') as HTMLElement;
		el.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
		if (mediaKind === 'video') {
			const v = el as HTMLVideoElement;
			v.autoplay = true;
			v.loop = true;
			v.muted = true;
			v.playsInline = true;
		}
		parts.mediaHost.appendChild(el);
	}
	if (mediaKind === 'video') {
		const v = el as HTMLVideoElement;
		if (v.src !== mediaUrlCache) v.src = mediaUrlCache;
		v.play().catch(() => {});
	} else {
		(el as HTMLImageElement).src = mediaUrlCache;
	}
}

async function engineTick(): Promise<void> {
	try {
		const s = await rpc<Settings>('GetSettings');
		if (s) current = { ...DEFAULTS, ...s };
		if (current.enabled && current.name && mediaUrlCacheName !== current.name) {
			await assembleMedia(current.name);
		}
		if (!current.name) resetMedia();
		renderLayer();
	} catch (e) {
		/* 后端还没就绪时下个周期再试 */
	}
}

/* 商店/社区等网页浏览器视图由 webkit.js（.millennium/Dist/webkit.js）负责透明化，
 * Millennium 不会把本前端包加载进网页上下文。 */

function hookMainWindows(): void {
	const onCtx = (ctx: any) => {
		try {
			const name = String((ctx && ctx.m_strName) || (ctx && ctx.window && ctx.window.name) || '');
			const d = docFromPopup(ctx && (ctx.m_popup || ctx.window));
			if (name.indexOf('SP Desktop_') === 0 && d) {
				mainDoc = d;
				applyBackground();
			}
		} catch (e) {
			/* ignore */
		}
	};
	try {
		const pm = getPopupManager();
		if (pm && typeof pm.AddPopupCreatedCallback === 'function') pm.AddPopupCreatedCallback(onCtx);
	} catch (e) {
		/* ignore */
	}
	try {
		const w = window as any;
		if (w.Millennium && typeof w.Millennium.AddWindowCreateHook === 'function') w.Millennium.AddWindowCreateHook(onCtx);
	} catch (e) {
		/* ignore */
	}
}

function startEngine(): void {
	if (engineStarted) return;
	engineStarted = true;
	hookMainWindows();
	setInterval(() => {
		engineTick().catch(() => {});
	}, 2000);
	engineTick().catch(() => {});
}

/* ---------------- 设置面板 ---------------- */
const rowStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: '8px',
	flexWrap: 'wrap',
	marginBottom: '10px',
};
const selectStyle: React.CSSProperties = {
	padding: '4px 6px',
	fontSize: '13px',
	background: '#111',
	color: 'inherit',
	border: '1px solid rgba(128,128,128,.4)',
	borderRadius: '4px',
	maxWidth: '340px',
};
const previewBoxStyle: React.CSSProperties = {
	width: '100%',
	height: '180px',
	borderRadius: '6px',
	background: '#000',
	objectFit: 'cover',
	display: 'block',
};

const Icon = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 16 16"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		style={{ marginRight: '5px' }}
	>
		<rect x="1.25" y="2" width="13.5" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
		<circle cx="5.4" cy="6.6" r="1.4" fill="currentColor" />
		<path d="M2.5 12.2l3.6-3.6 2.8 2.8 2.3-2.3 2.4 2.4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
	</svg>
);

const SettingsContent = () => {
	const [settings, setSettings] = useState<Settings>({ ...DEFAULTS });
	const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
	const [weWallpapers, setWeWallpapers] = useState<WeWallpaper[]>([]);
	const [mediaDir, setMediaDir] = useState('');
	const [status, setStatus] = useState(STR.connecting);
	const [preview, setPreview] = useState('');

	const refresh = async () => {
		setStatus(STR.scanning);
		const parts: string[] = [];
		try {
			const r = await rpc<{ ok: boolean; files?: MediaFile[]; mediaDir?: string; error?: string }>('ScanWallpapers');
			if (r && r.ok) {
				setMediaFiles(r.files || []);
				setMediaDir(r.mediaDir || '');
				parts.push(STR.mediaCount(r.files ? r.files.length : 0));
			} else {
				parts.push(STR.mediaFail((r && r.error) || STR.unknownErr));
			}
		} catch (e) {
			parts.push(STR.mediaFail(String(e)));
		}
		try {
			const w = await rpc<{ ok: boolean; wallpapers?: WeWallpaper[]; error?: string }>('ScanWallpaperEngine');
			if (w && w.ok) {
				setWeWallpapers(w.wallpapers || []);
				parts.push(STR.weCount(w.wallpapers ? w.wallpapers.length : 0));
			} else {
				parts.push(STR.weFail((w && w.error) || STR.unknownErr));
			}
		} catch (e) {
			parts.push(STR.weFail(String(e)));
		}
		setStatus(STR.found(parts.join(' + ')));
	};

	useEffect(() => {
		(async () => {
			try {
				const s = await rpc<Settings>('GetSettings');
				if (s) {
					const merged = { ...DEFAULTS, ...s };
					setSettings(merged);
					current = merged;
					setStatus('');
				}
			} catch (e) {
				setStatus(STR.readFail(String(e)));
			}
			refresh().catch(() => {});
		})().catch(() => {});
	}, []);

	const save = async (patch: Partial<Settings>, okText: string) => {
		const next = { ...settings, ...patch };
		setSettings(next);
		current = next;
		renderLayer();
		try {
			const r = await rpc<{ ok: boolean; error?: string }>('SaveSettings', [JSON.stringify(next)]);
			if (r && r.ok) {
				setStatus(okText);
			} else {
				setStatus(STR.saveFail((r && r.error) || STR.unknownErr));
			}
		} catch (e) {
			setStatus(STR.saveFail(String(e)));
		}
	};

	const labelOf = (ref: string): string => {
		if (!ref) return '';
		const we = weWallpapers.find((w) => w.token === ref);
		if (we) return we.title;
		const m = mediaFiles.find((f) => f.token === ref);
		return m ? m.name : ref;
	};

	const onSelectWallpaper = async (ref: string) => {
		if (!ref) {
			setPreview('');
			resetMedia();
			renderLayer();
			await save({ name: '' }, STR.bgOff);
			return;
		}
		setStatus(STR.loading(labelOf(ref)));
		try {
			const ok = await assembleMedia(ref);
			if (ok) {
				setPreview(mediaUrlCache);
				renderLayer();
				await save({ name: ref }, STR.applied(labelOf(ref)));
			} else {
				const info = await rpc<MediaInfo>('GetMediaInfo', { name: ref });
				setStatus(STR.loadFail((info && info.error) || STR.noMedia));
			}
		} catch (e) {
			setStatus(STR.loadFail(String(e)));
		}
	};

	return (
		<div style={{ padding: '4px 0', maxWidth: '560px', fontSize: '13px', lineHeight: 1.6 }}>
			<div style={{ ...rowStyle, marginBottom: '6px' }}>
				<span style={{ fontSize: '12px', opacity: 0.6 }}>{STR.header}</span>
			</div>
			<div style={{ ...previewBoxStyle, position: 'relative', overflow: 'hidden', marginBottom: '10px' }}>
				{preview ? (
					mediaKind === 'video' ? (
						<video
							src={preview}
							autoPlay
							muted
							loop
							playsInline
							style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
						/>
					) : (
						<img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
					)
				) : (
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							height: '100%',
							color: 'rgba(255,255,255,.35)',
							fontSize: '12px',
						}}
					>
						{STR.previewPlaceholder}
					</div>
				)}
			</div>
			<div style={rowStyle}>
				<span>{STR.wallpaper}</span>
				<select
					style={selectStyle}
					value={settings.name}
					onChange={(e) => onSelectWallpaper(e.target.value).catch(() => {})}
				>
					<option value="">{STR.none}</option>
					{mediaFiles.length > 0 ? (
						<optgroup label={STR.grpMedia}>
							{mediaFiles.map((f) => (
								<option key={f.token} value={f.token}>
									{f.kind === 'video' ? '▶ ' : ''}
									{f.name}
								</option>
							))}
						</optgroup>
					) : null}
					{weWallpapers.length > 0 ? (
						<optgroup label={STR.grpWe}>
							{weWallpapers.map((w) => (
								<option key={w.token} value={w.token}>
									{w.kind === 'video' ? '▶ ' : ''}
									{w.title}
								</option>
							))}
						</optgroup>
					) : null}
				</select>
			</div>
			<div style={rowStyle}>
				<span>{STR.opacity}</span>
				<input
					type="range"
					min={0}
					max={100}
					step={1}
					style={{ flex: 1, maxWidth: '200px' }}
					value={Math.round((1 - (parseFloat(settings.dim) || 0)) * 100)}
					onChange={(e) => {
						const opacity = Number(e.target.value);
						const next = { ...settings, dim: ((100 - opacity) / 100).toFixed(2) };
						setSettings(next);
						current = next;
						renderLayer();
					}}
					onPointerUp={() => save({ dim: settings.dim }, STR.saved).catch(() => {})}
					onKeyUp={() => save({ dim: settings.dim }, STR.saved).catch(() => {})}
				/>
				<span style={{ minWidth: '42px', textAlign: 'right' }}>
					{Math.round((1 - (parseFloat(settings.dim) || 0)) * 100)}%
				</span>
				<span style={{ fontSize: '12px', opacity: 0.6 }}>{STR.coversWindow}</span>
			</div>
			<div style={rowStyle}>
				<input
					id="we-wallpaper-enabled"
					type="checkbox"
					checked={settings.enabled}
					onChange={(e) => save({ enabled: e.target.checked }, STR.saved).catch(() => {})}
				/>
				<label htmlFor="we-wallpaper-enabled">{STR.enable}</label>
				<span style={{ fontSize: '12px', opacity: 0.6 }}>{status}</span>
			</div>
			<div style={rowStyle}>
				<span style={{ marginRight: '4px' }}>{STR.scope}</span>
				<label style={{ marginRight: '14px', opacity: 0.9 }}>
					<input type="checkbox" checked disabled style={{ marginRight: '4px' }} />
					{STR.scopeHome}
				</label>
				<label style={{ marginRight: '14px' }}>
					<input
						id="we-wallpaper-details"
						type="checkbox"
						checked={settings.details !== false}
						onChange={(e) => save({ details: e.target.checked }, STR.saved).catch(() => {})}
						style={{ marginRight: '4px' }}
					/>
					{STR.scopeDetails}
				</label>
				<label>
					<input
						id="we-wallpaper-other"
						type="checkbox"
						checked={settings.other === true}
						onChange={(e) => save({ other: e.target.checked }, STR.saved).catch(() => {})}
						style={{ marginRight: '4px' }}
					/>
					{STR.scopeOther}
				</label>
			</div>
			<div style={{ fontSize: '12px', opacity: 0.55, margin: '-4px 0 8px 0' }}>{STR.scopeHint}</div>
			{mediaDir ? (
				<div style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px', wordBreak: 'break-all' }}>{STR.mediaDirLabel}{mediaDir}</div>
			) : null}
		</div>
	);
};

export default definePlugin(() => {
	startEngine();

	return {
		title: 'SteamBackdrop',
		icon: <Icon />,
		content: <SettingsContent />,
	};
});
