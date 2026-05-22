import json
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles

from chatbot_router import router as chatbot_router


CHATBOT_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = CHATBOT_DIR / "frontend"

app = FastAPI(
    title="SALE_WEB Chatbot Standalone",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(chatbot_router)
app.mount("/chatbot-assets", StaticFiles(directory=FRONTEND_DIR), name="chatbot-assets")


def _base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


def _build_embed_script(request: Request) -> str:
    base_url = _base_url(request)
    loader_url = f"{base_url}/chatbot-assets/chatbot-loader.js"
    config_payload = {
        "apiBase": base_url,
        "assetBase": f"{base_url}/chatbot-assets",
        "cssUrl": f"{base_url}/chatbot-assets/chatbot-widget.css",
    }
    return f"""
(function () {{
    window.SaleWebChatbotConfig = Object.assign({{}}, window.SaleWebChatbotConfig || {{}}, {json.dumps(config_payload)});
    if (window.SaleWebChatbot && typeof window.SaleWebChatbot.init === "function") {{
        window.SaleWebChatbot.init(window.SaleWebChatbotConfig);
        return;
    }}
    var existing = document.querySelector('script[data-sale-web-chatbot-embed="true"]');
    if (existing) {{
        return;
    }}
    var script = document.createElement("script");
    script.src = {json.dumps(loader_url)};
    script.async = true;
    script.dataset.saleWebChatbotEmbed = "true";
    document.head.appendChild(script);
}})();
""".strip()


@app.get("/")
def root(request: Request):
    base_url = _base_url(request)
    return {
        "message": "Chatbot standalone is running.",
        "chatbot_api": f"{base_url}/api/chatbot",
        "loader_url": f"{base_url}/chatbot-assets/chatbot-loader.js",
        "embed_url": f"{base_url}/embed/chatbot.js",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/embed/chatbot.js")
def embed_chatbot(request: Request):
    script = _build_embed_script(request)
    return PlainTextResponse(
        content=script,
        media_type="application/javascript; charset=utf-8",
        headers={"Cache-Control": "no-store"},
    )
