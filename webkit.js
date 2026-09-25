/* steambackdrop webkit 入口（手写，无构建步骤）
 * Millennium 会把本文件加载进商店/社区等网页浏览器视图（WebKit）。
 * 这些网页在独立 CEF 视图里渲染并盖住主窗口壁纸层，但视图背景支持透明——
 * 把页面 html/body 背景透明化，主窗口壁纸即可透出。
 * 仅在勾选「其他页面」且启用壁纸时应用；每 2 秒轮询设置，可随时切换。
 * 部署：复制到 .millennium/Dist/webkit.js（与 index.js 同级）。
 */
const MILLENNIUM_IS_CLIENT_MODULE = !1, pluginName = "steambackdrop";
(window.PLUGIN_LIST ||= {})[pluginName] ||= {};
let PluginEntryPointMain = function () {
	"use strict";
	return {
		default: function () {
			const w = window;
			if (w.__weWpInstalled) return;
			w.__weWpInstalled = true;

			const apply = () => {
				try {
					const d = document;
					if (!d.documentElement) return;
					d.documentElement.style.setProperty("background", "transparent", "important");
					if (d.body) d.body.style.setProperty("background", "transparent", "important");
					if (!d.getElementById("we-wallpaper-webcss")) {
						const st = d.createElement("style");
						st.id = "we-wallpaper-webcss";
						st.textContent = "html, body { background: transparent !important; }";
						d.documentElement.appendChild(st);
					}
				} catch (e) { /* ignore */ }
			};
			const revoke = () => {
				try {
					const d = document;
					const st = d.getElementById("we-wallpaper-webcss");
					if (st && st.parentElement) st.parentElement.removeChild(st);
					d.documentElement.style.removeProperty("background");
					if (d.body) d.body.style.removeProperty("background");
				} catch (e) { /* ignore */ }
			};
			const tick = async () => {
				try {
					const href = location.href;
					if (!/^https?:/.test(href) || href.indexOf("steamloopback.host") !== -1) return;
					const m = w.Millennium;
					if (!m || typeof m.callServerMethod !== "function") return;
					const raw = await m.callServerMethod(pluginName, "GetSettings", []);
					if (raw === null || raw === undefined || raw === "") return;
					const s = typeof raw === "string" ? JSON.parse(raw) : raw;
					const on = !!(s && s.enabled && s.name && s.other === true);
					if (on) apply();
					else revoke();
				} catch (e) { /* 后端未就绪，下轮再试 */ }
			};
			setInterval(() => { tick().catch(() => {}); }, 2000);
			tick().catch(() => {});
		},
	};
};
(() => {
	const e = PluginEntryPointMain();
	Object.assign(window.PLUGIN_LIST[pluginName], {
		...e,
		__millennium_internal_plugin_name_do_not_use_or_change__: pluginName,
	});
	const t = e.default();
	t && void 0 !== t.title && void 0 !== t.icon && void 0 !== t.content &&
		(window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS ||= {}, window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS[pluginName] = t);
})();
