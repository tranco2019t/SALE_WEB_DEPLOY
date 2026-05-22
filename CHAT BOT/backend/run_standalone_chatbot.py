import os

import uvicorn


if __name__ == "__main__":
    uvicorn.run(
        "standalone_app:app",
        host=os.getenv("CHATBOT_HOST", "127.0.0.1"),
        port=int(os.getenv("CHATBOT_PORT", "8010")),
        reload=False,
    )
