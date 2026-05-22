(function () {
    const LOADER_FLAG = "__saleWebChatbotLoaderReady";
    const WIDGET_SCRIPT_ID = "chatbot-widget-script";

    function compactConfig(value) {
        const source = value && typeof value === "object" ? value : {};
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

    function directoryFromUrl(url) {
        const input = String(url || "").trim();
        if (!input) return "";
        const lastSlash = input.lastIndexOf("/");
        return lastSlash >= 0 ? input.slice(0, lastSlash) : "";
    }

    function findCurrentScript() {
        if (document.currentScript) return document.currentScript;
        const scripts = Array.from(document.getElementsByTagName("script"));
        return scripts.reverse().find((scriptEl) => String(scriptEl.src || "").includes("chatbot-loader.js")) || null;
    }

    function mergeConfig(scriptEl) {
        const existing = compactConfig(window.SaleWebChatbotConfig);
        const dataset = scriptEl && scriptEl.dataset ? scriptEl.dataset : {};
        const assetBase = trimTrailingSlash(existing.assetBase || dataset.assetBase || directoryFromUrl(scriptEl && scriptEl.src));
        return compactConfig(Object.assign({}, existing, {
            apiBase: existing.apiBase || dataset.apiBase || "",
            assetBase,
            cssUrl: existing.cssUrl || dataset.cssUrl || (assetBase ? `${assetBase}/chatbot-widget.css` : ""),
            title: existing.title || dataset.title || "",
            greeting: existing.greeting || dataset.greeting || "",
            inputPlaceholder: existing.inputPlaceholder || dataset.inputPlaceholder || "",
            loadingText: existing.loadingText || dataset.loadingText || "",
            errorText: existing.errorText || dataset.errorText || "",
            emptyResponseText: existing.emptyResponseText || dataset.emptyResponseText || "",
            toggleText: existing.toggleText || dataset.toggleText || "",
            openLabel: existing.openLabel || dataset.openLabel || "",
            closeLabel: existing.closeLabel || dataset.closeLabel || "",
            closeButtonLabel: existing.closeButtonLabel || dataset.closeButtonLabel || "",
            sendButtonText: existing.sendButtonText || dataset.sendButtonText || "",
            autoOpen: existing.autoOpen !== undefined ? existing.autoOpen : dataset.autoOpen,
            zIndex: existing.zIndex !== undefined ? existing.zIndex : dataset.zIndex,
        }));
    }

    function injectWidgetScript(config) {
        if (window.SaleWebChatbot && typeof window.SaleWebChatbot.init === "function") {
            window.SaleWebChatbot.init(config);
            return;
        }

        if (document.getElementById(WIDGET_SCRIPT_ID)) return;
        const script = document.createElement("script");
        script.id = WIDGET_SCRIPT_ID;
        script.async = true;
        script.src = config.assetBase ? `${config.assetBase}/chatbot-widget.js` : "chatbot-widget.js";
        script.dataset.apiBase = config.apiBase || "";
        script.dataset.assetBase = config.assetBase || "";
        script.dataset.cssUrl = config.cssUrl || "";
        if (config.title) script.dataset.title = config.title;
        if (config.greeting) script.dataset.greeting = config.greeting;
        if (config.inputPlaceholder) script.dataset.inputPlaceholder = config.inputPlaceholder;
        if (config.loadingText) script.dataset.loadingText = config.loadingText;
        if (config.errorText) script.dataset.errorText = config.errorText;
        if (config.emptyResponseText) script.dataset.emptyResponseText = config.emptyResponseText;
        if (config.toggleText) script.dataset.toggleText = config.toggleText;
        if (config.openLabel) script.dataset.openLabel = config.openLabel;
        if (config.closeLabel) script.dataset.closeLabel = config.closeLabel;
        if (config.closeButtonLabel) script.dataset.closeButtonLabel = config.closeButtonLabel;
        if (config.sendButtonText) script.dataset.sendButtonText = config.sendButtonText;
        if (config.autoOpen !== undefined) script.dataset.autoOpen = String(config.autoOpen);
        if (config.zIndex !== undefined) script.dataset.zIndex = String(config.zIndex);
        document.head.appendChild(script);
    }

    const currentScript = findCurrentScript();
    const config = mergeConfig(currentScript);
    window.SaleWebChatbotConfig = config;

    if (window[LOADER_FLAG] && window.SaleWebChatbot && typeof window.SaleWebChatbot.init === "function") {
        window.SaleWebChatbot.init(config);
        return;
    }

    window[LOADER_FLAG] = true;
    injectWidgetScript(config);
})();
