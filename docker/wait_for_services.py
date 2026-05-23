import os
import time
import socket
import urllib.request

def wait_http(url, timeout=60):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                if resp.status in (200, 201, 204):
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False


def main():
    backend_url = os.environ.get("BACKEND_HEALTH_URL", "http://backend:8000/")
    chatbot_url = os.environ.get("CHATBOT_HEALTH_URL", "http://chatbot:8001/health")
    print("Waiting for backend at", backend_url)
    if not wait_http(backend_url, timeout=90):
        print("Backend not ready in time")
        raise SystemExit(1)
    print("Backend ready")
    print("Waiting for chatbot at", chatbot_url)
    if not wait_http(chatbot_url, timeout=90):
        print("Chatbot not ready in time")
        raise SystemExit(1)
    print("Chatbot ready")


if __name__ == "__main__":
    main()
