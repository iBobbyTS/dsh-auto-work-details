window.__ModuleLoader__.load({
	id: "@local/dsh-auto-work-details",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		// \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		let react = require("react");
		react = __toESM(react, 1);
		// src/client.ts
		const h = react.createElement;
		/** Preference key written by versions that still shipped a Settings switch. */
		const STORAGE_KEY = "dsh-auto-work-details.enabled";
		/**
		* Bind the observer to its exact Conversation occurrence, including an
		* embedded child chat. Never enlarge an unresolved scope to the page.
		*/
		function findConversationScope(host, sessionId) {
			const scope = host.closest("[data-conversation-content]");
			return scope !== null && scope.getAttribute("data-conversation-session") === sessionId ? scope : null;
		}
		function isRendered(element) {
			if (element.closest("[hidden]") !== null) return false;
			return element.getClientRects().length > 0;
		}
		/**
		* Toggle a group header without letting its onClick focus steal the caret
		* from the composer. The handler calls currentTarget.focus(); an own-property
		* no-op shadows that call for exactly this synthetic click.
		*/
		function clickHeader(button) {
			const hadOwnFocus = Object.prototype.hasOwnProperty.call(button, "focus");
			const previousFocus = button.focus;
			button.focus = () => {};
			try {
				button.click();
			} finally {
				if (hadOwnFocus) button.focus = previousFocus;
				else Reflect.deleteProperty(button, "focus");
			}
		}
		/**
		* Watch only the active conversation. A new group starts collapsed, so the
		* first running observation opens it; the first non-running observation
		* after that collapses it. Later user toggles during the same segment are
		* not fought because the state machine only reacts to phase transitions.
		*/
		function AutoWorkDetailsObserver(props) {
			const sessionId = props.sessionId;
			const hostRef = react.useRef(null);
			react.useEffect(() => {
				if (sessionId === void 0) return;
				const host = hostRef.current;
				if (host === null) return;
				const doc = host.ownerDocument;
				const win = doc.defaultView;
				const scope = findConversationScope(host, sessionId);
				if (scope === null) return;
				const phases = /* @__PURE__ */ new Map();
				let frame = 0;
				let stopped = false;
				const scan = () => {
					if (stopped) return;
					const alive = /* @__PURE__ */ new Set();
					for (const group of scope.querySelectorAll("[data-step-process]")) {
						if (group.closest("[data-conversation-content]") !== scope) continue;
						if (!isRendered(group)) continue;
						if (group.closest("[data-chat-motion=\"collapse\"]") !== null) continue;
						const header = group.querySelector(":scope > div > button[aria-expanded]");
						if (header === null || !isRendered(header)) continue;
						const key = group.getAttribute("data-chat-group-key");
						if (key === null) continue;
						alive.add(key);
						const running = header.querySelector("[data-shimmer]") !== null;
						const open = header.getAttribute("aria-expanded") === "true";
						let phase = phases.get(key);
						if (phase === void 0) {
							phase = { running: false };
							phases.set(key, phase);
						}
						if (running && !phase.running) {
							phase.running = true;
							if (!open) clickHeader(header);
						} else if (!running && phase.running) {
							phase.running = false;
							if (open) clickHeader(header);
						}
					}
					for (const key of [...phases.keys()]) if (!alive.has(key)) phases.delete(key);
				};
				const schedule = () => {
					if (stopped || frame !== 0) return;
					frame = win.requestAnimationFrame(() => {
						frame = 0;
						scan();
					});
				};
				const observer = new win.MutationObserver(schedule);
				observer.observe(scope, {
					subtree: true,
					childList: true,
					attributes: true,
					attributeFilter: [
						"data-shimmer",
						"aria-expanded",
						"hidden",
						"data-chat-motion"
					]
				});
				const onVisible = () => {
					if (doc.visibilityState === "visible") schedule();
				};
				win.addEventListener("focus", schedule);
				doc.addEventListener("visibilitychange", onVisible);
				schedule();
				return () => {
					stopped = true;
					observer.disconnect();
					win.removeEventListener("focus", schedule);
					doc.removeEventListener("visibilitychange", onVisible);
					if (frame !== 0) win.cancelAnimationFrame(frame);
				};
			}, [sessionId]);
			return h("div", {
				ref: hostRef,
				"data-dawd-observer": "",
				"aria-hidden": "true",
				style: { display: "none" }
			});
		}
		function apply(ctx) {
			try {
				window.localStorage.removeItem(STORAGE_KEY);
			} catch {}
			ctx.effect(() => ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "auto-work-details",
				order: 100
			}, AutoWorkDetailsObserver)), "dsh-auto-work-details: chat observer");
		}
		const inject = ["slots"];
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map