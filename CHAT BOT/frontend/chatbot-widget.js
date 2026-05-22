(function () {
    const ROOT_ID = "chatbot-widget";
    const DEFAULT_API_BASE = "http://127.0.0.1:8010";
    const MAX_MESSAGE_LENGTH = 2000;
    const HISTORY_LIMIT = 8;
    const REQUEST_TIMEOUT_MS = 30000;
    const STYLE_ID = "chatbot-widget-css";
    const GLOBAL_STATE_KEY = "__saleWebChatbotState";
    const DEFAULT_CONFIG = {
        apiBase: "",
        assetBase: "",
        cssUrl: "",
        title: "AI tư vấn",
        greeting:
            "Xin chào! Mình có thể tư vấn laptop, điện thoại, tai nghe, bàn phím, chuột và đồng hồ thông minh.\nBạn cứ nói nhu cầu hoặc ngân sách, mình sẽ gợi ý giúp nhé.",
        inputPlaceholder: "Nhập câu hỏi...",
        loadingText: "Mình đang xem giúp bạn...",
        fallbackErrorText: "Xin lỗi, hiện tại chatbot đang gặp lỗi. Bạn thử lại sau giúp mình nhé.",
        emptyResponseText: "Xin lỗi, mình chưa có câu trả lời phù hợp cho trường hợp này.",
        toggleText: "AI",
        openLabel: "Mở chatbot AI tư vấn",
        closeLabel: "Đóng chatbot AI tư vấn",
        closeButtonLabel: "Đóng chatbot",
        sendButtonText: "Gửi",
        autoOpen: false,
        zIndex: 1000,
    };

    function toObject(value) {
        return value && typeof value === "object" ? value : {};
    }

    function compactConfig(value) {
        const source = toObject(value);
        const result = {};
        Object.keys(source).forEach((key) => {
            const current = source[key];
            if (current === undefined || current === null) return;
            if (typeof current === "string" && current.trim() === "") return;
            result[key] = current;
        });
        return result;
    }

    function trimTrailingSlash(value) {
        return String(value || "").replace(/\/+$/, "");
    }

    function parseBoolean(value, fallback) {
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (normalized === "true") return true;
            if (normalized === "false") return false;
        }
        return fallback;
    }

    function parseNumber(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function readScriptDataset(scriptEl) {
        if (!scriptEl || !scriptEl.dataset) return {};
        return compactConfig({
            apiBase: scriptEl.dataset.apiBase || "",
            assetBase: scriptEl.dataset.assetBase || "",
            cssUrl: scriptEl.dataset.cssUrl || "",
            title: scriptEl.dataset.title || "",
            greeting: scriptEl.dataset.greeting || "",
            inputPlaceholder: scriptEl.dataset.inputPlaceholder || "",
            loadingText: scriptEl.dataset.loadingText || "",
            fallbackErrorText: scriptEl.dataset.errorText || "",
            emptyResponseText: scriptEl.dataset.emptyResponseText || "",
            toggleText: scriptEl.dataset.toggleText || "",
            openLabel: scriptEl.dataset.openLabel || "",
            closeLabel: scriptEl.dataset.closeLabel || "",
            closeButtonLabel: scriptEl.dataset.closeButtonLabel || "",
            sendButtonText: scriptEl.dataset.sendButtonText || "",
            autoOpen: scriptEl.dataset.autoOpen,
            zIndex: scriptEl.dataset.zIndex,
        });
    }

    function findCurrentScript() {
        if (document.currentScript) return document.currentScript;
        const scripts = Array.from(document.getElementsByTagName("script"));
        return scripts.reverse().find((scriptEl) => {
            const src = String(scriptEl.src || "");
            return src.includes("chatbot-widget.js") || src.includes("chatbot-loader.js") || src.includes("/embed/chatbot.js");
        }) || null;
    }

    function directoryFromUrl(url) {
        const input = String(url || "").trim();
        if (!input) return "";
        const lastSlash = input.lastIndexOf("/");
        return lastSlash >= 0 ? input.slice(0, lastSlash) : "";
    }

    function queryStringFromUrl(url) {
        const input = String(url || "").trim();
        if (!input) return "";
        const queryIndex = input.indexOf("?");
        return queryIndex >= 0 ? input.slice(queryIndex) : "";
    }

    function resolveAssetBase(config, scriptEl) {
        if (config.assetBase) return trimTrailingSlash(config.assetBase);
        const scriptSrc = scriptEl && scriptEl.src ? scriptEl.src : "";
        return trimTrailingSlash(directoryFromUrl(scriptSrc));
    }

    function resolveApiBase(config) {
        if (config.apiBase) return trimTrailingSlash(config.apiBase);
        if (window.TamTai && window.TamTai.API_BASE_URL) {
            return trimTrailingSlash(window.TamTai.API_BASE_URL);
        }
        if (window.app && typeof window.app.getApiBase === "function") {
            return trimTrailingSlash(window.app.getApiBase());
        }
        if (window.location && /^https?:$/i.test(window.location.protocol)) {
            return trimTrailingSlash(window.location.origin);
        }
        return DEFAULT_API_BASE;
    }

    function normalizeConfig(rawConfig) {
        const scriptEl = findCurrentScript();
        const globalConfig = compactConfig(window.SaleWebChatbotConfig);
        const scriptConfig = readScriptDataset(scriptEl);
        const merged = Object.assign({}, DEFAULT_CONFIG, globalConfig, scriptConfig, compactConfig(rawConfig));
        const scriptQuery = queryStringFromUrl(scriptEl && scriptEl.src);
        merged.autoOpen = parseBoolean(merged.autoOpen, DEFAULT_CONFIG.autoOpen);
        merged.zIndex = parseNumber(merged.zIndex, DEFAULT_CONFIG.zIndex);
        merged.assetBase = resolveAssetBase(merged, scriptEl);
        merged.cssUrl = merged.cssUrl || (merged.assetBase ? `${merged.assetBase}/chatbot-widget.css${scriptQuery}` : "");
        merged.apiBase = resolveApiBase(merged);
        return merged;
    }

    function ensureStylesheet(config) {
        if (!config.cssUrl) return;

        const existingById = document.getElementById(STYLE_ID);
        if (existingById) return;

        const existingLink = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((link) => {
            const href = String(link.getAttribute("href") || "");
            return href.includes("chatbot-widget.css");
        });
        if (existingLink) {
            existingLink.id = STYLE_ID;
            return;
        }

        const link = document.createElement("link");
        link.id = STYLE_ID;
        link.rel = "stylesheet";
        link.href = config.cssUrl;
        document.head.appendChild(link);
    }

    async function sendChatbotMessage(apiBase, message, history) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(`${apiBase}/api/chatbot`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, history }),
                signal: controller.signal,
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error((payload && payload.error) || response.statusText);
            }
            return payload;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    function appendMessage(messagesEl, role, text) {
        const row = document.createElement("div");
        row.className = `chatbot-message chatbot-message-${role}`;

        const bubble = document.createElement("div");
        bubble.className = "chatbot-bubble";
        bubble.textContent = text;

        row.appendChild(bubble);
        messagesEl.appendChild(row);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return bubble;
    }

    function setBusy(formEl, inputEl, buttonEl, busy) {
        formEl.classList.toggle("is-loading", busy);
        inputEl.disabled = busy;
        buttonEl.disabled = busy;
    }

    function getState() {
        const existing = window[GLOBAL_STATE_KEY];
        if (existing) return existing;
        const state = {
            mounted: false,
            history: [],
            config: normalizeConfig(),
        };
        window[GLOBAL_STATE_KEY] = state;
        return state;
    }

    function pushHistory(state, role, content) {
        state.history.push({ role, content });
        if (state.history.length > HISTORY_LIMIT) {
            state.history.splice(0, state.history.length - HISTORY_LIMIT);
        }
    }

    function buildWidget(state) {
        const config = state.config;

        const root = document.createElement("section");
        root.id = ROOT_ID;
        root.className = "chatbot-widget";
        root.setAttribute("aria-label", config.title);
        root.style.zIndex = String(config.zIndex);

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "chatbot-toggle";
        toggle.setAttribute("aria-label", config.openLabel);
        toggle.textContent = config.toggleText;

        const panel = document.createElement("div");
        panel.className = "chatbot-panel";
        panel.hidden = true;

        const header = document.createElement("div");
        header.className = "chatbot-header";

        const title = document.createElement("strong");
        title.textContent = config.title;

        const close = document.createElement("button");
        close.type = "button";
        close.className = "chatbot-close";
        close.setAttribute("aria-label", config.closeButtonLabel);
        close.textContent = "x";

        const messages = document.createElement("div");
        messages.className = "chatbot-messages";
        messages.setAttribute("aria-live", "polite");

        const form = document.createElement("form");
        form.className = "chatbot-form";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "chatbot-input";
        input.placeholder = config.inputPlaceholder;
        input.maxLength = MAX_MESSAGE_LENGTH;
        input.autocomplete = "off";

        const send = document.createElement("button");
        send.type = "submit";
        send.className = "chatbot-send";
        send.textContent = config.sendButtonText;

        header.append(title, close);
        form.append(input, send);
        panel.append(header, messages, form);
        root.append(toggle, panel);
        document.body.appendChild(root);

        appendMessage(messages, "bot", config.greeting);

        function openPanel() {
            panel.hidden = false;
            root.classList.add("chatbot-open");
            toggle.setAttribute("aria-label", config.closeLabel);
            input.focus();
        }

        function closePanel() {
            panel.hidden = true;
            root.classList.remove("chatbot-open");
            toggle.setAttribute("aria-label", config.openLabel);
        }

        toggle.addEventListener("click", () => {
            if (panel.hidden) {
                openPanel();
            } else {
                closePanel();
            }
        });
        close.addEventListener("click", closePanel);

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const message = input.value.trim();
            if (!message || form.classList.contains("is-loading")) return;

            const requestHistory = state.history.slice();
            appendMessage(messages, "user", message);
            pushHistory(state, "user", message);
            input.value = "";

            const loadingBubble = appendMessage(messages, "bot", config.loadingText);
            setBusy(form, input, send, true);

            try {
                const payload = await sendChatbotMessage(config.apiBase, message, requestHistory);
                const reply =
                    payload && typeof payload.response === "string" && payload.response.trim()
                        ? payload.response
                        : config.emptyResponseText;
                loadingBubble.textContent = reply;
                pushHistory(state, "assistant", reply);
            } catch {
                loadingBubble.textContent = config.fallbackErrorText;
                pushHistory(state, "assistant", config.fallbackErrorText);
            } finally {
                setBusy(form, input, send, false);
                input.focus();
            }
        });

        state.root = root;
        state.panel = panel;
        state.input = input;
        state.open = openPanel;
        state.close = closePanel;

        if (config.autoOpen) {
            openPanel();
        }

        return root;
    }

    function mount(rawConfig) {
        const state = getState();
        state.config = normalizeConfig(rawConfig);
        ensureStylesheet(state.config);

        const existingRoot = document.getElementById(ROOT_ID);
        if (existingRoot) {
            state.root = existingRoot;
            state.mounted = true;
            return existingRoot;
        }

        if (!document.body) return null;
        const root = buildWidget(state);
        state.mounted = true;
        return root;
    }

    function destroy() {
        const state = getState();
        if (state.root && state.root.parentNode) {
            state.root.parentNode.removeChild(state.root);
        }
        state.root = null;
        state.panel = null;
        state.input = null;
        state.mounted = false;
        state.history = [];
    }

    function init(rawConfig) {
        const state = getState();
        state.config = normalizeConfig(rawConfig);

        const start = () => {
            if (!state.mounted) {
                mount(state.config);
            }
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", start, { once: true });
            return null;
        }

        return start();
    }

    window.SaleWebChatbot = {
        init,
        mount,
        destroy,
        open() {
            const state = getState();
            if (!state.mounted) {
                init(state.config);
            }
            if (typeof state.open === "function") {
                state.open();
            }
        },
        close() {
            const state = getState();
            if (typeof state.close === "function") {
                state.close();
            }
        },
        getConfig() {
            return Object.assign({}, getState().config);
        },
    };

    init();
})();
