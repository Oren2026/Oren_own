#!/usr/bin/env python3
"""
Hermes Chat App - 本地 AI 聊天介面
三欄：左(agent/session) / 中(聊天室) / 右(任務輸出)
三層記憶：Ephemeral(單次) / Working Memory(resume累積) / Selective Memory(書籤)
"""
import os, json, subprocess, re, time
from pathlib import Path
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'hermes-chat-local-dev'
socketio = SocketIO(app, cors_allowed_origins="*")

# ─── Agent 設定 ────────────────────────────────────────────
AGENTS = {
    "Hermes Coder":   {"color": "#3b82f6", "emoji": "🔵", "session_prefix": "coder"},
    "Hermes Research": {"color": "#8b5cf6", "emoji": "🟣", "session_prefix": "research"},
    "Hermes Creative": {"color": "#ec4899", "emoji": "🩷", "session_prefix": "creative"},
}

# ─── 核心資料結構 ─────────────────────────────────────────
# ACTIVE_SESSIONS: {
#   "sess_xxx": {
#     "agent": str,
#     "mode": "accumulating" | "ephemeral" | "selective",
#     "hermes_sid": str | None,   # Hermes CLI session ID (for accumulating/selective)
#     "history": [],               # UI 顯示用
#     "created_at": str,
#   }
# }
ACTIVE_SESSIONS = {}

# SELECTIVE_MEMORIES: [
#   { "id": str, "agent": str, "content": str, "ts": str, "tags": [] }
# ]
SELECTIVE_MEMORIES = []

MODE_LABELS = {"accumulating": "累積", "ephemeral": "單次", "selective": "書籤"}

# ─── 工具函式 ──────────────────────────────────────────────

def strip_ansi(text):
    import re
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

def clean_hermes_output(text):
    """清理 Hermes CLI 輸出：只留回覆本體"""
    text = strip_ansi(text)
    last_u = text.rfind('╭')
    last_L = text.rfind('╰')
    if last_u != -1 and last_L != -1 and last_L > last_u:
        block = text[last_u:last_L+1]
        lines = block.splitlines()
        content = '\n'.join(
            l for l in lines
            if l.strip() and '─' not in l and not l.strip().startswith('╭') and not l.strip().startswith('╰')
        ).strip()
        if content:
            return content
    # fallback
    if "Query:" in text:
        qidx = text.rfind("Query:")
        snippet = text[qidx:]
        if "Resume" in snippet:
            snippet = snippet[:snippet.find("Resume")]
        return snippet.strip()
    return text.strip()

def stream_output(stream_type, content):
    socketio.emit('output', {
        "type": stream_type,
        "content": content,
        "timestamp": datetime.now().isoformat(),
    })

HERMES_BIN = "/Users/oren/.local/bin/hermes"

def call_hermes(agent_key, message, history=None, hermes_sid=None, mode="accumulating"):
    """
    叫用 Hermes CLI。
    - ephemeral: 純單次，無歷史
    - accumulating/selective: 將 history prepend 成 context
    - hermes_sid: 追蹤用，不傳給 CLI
    返回 (response_text, hermes_sid)
    """
    is_acc = mode in ("accumulating", "selective")

    # 組合 prompt：歷史 context + 當前訊息
    if is_acc and history:
        context_lines = []
        for m in history[-20:]:
            role = "User" if m["role"] == "user" else "Assistant"
            context_lines.append(f"{role}: {m['content']}")
        context = "\n".join(context_lines)
        full_prompt = f"[對話歷史]\n{context}\n\n[本次訊息]\nUser: {message}\nAssistant:"
    else:
        full_prompt = message

    cmd = [HERMES_BIN, "chat", "-q", full_prompt, "-Q"]

    stream_output("status", f"🤖 {agent_key} [{MODE_LABELS.get(mode, mode)}] 處理中...")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            env={**os.environ, "HOME": str(Path.home())},
        )

        stdout = result.stdout
        stderr = result.stderr

        if stdout:
            stream_output("stdout", stdout)
        if stderr:
            stream_output("stderr", stderr)

        raw = stdout if stdout else stderr
        if not raw:
            return "[無回應]", hermes_sid

        # 解析 session_id（-Q 模式下：{"session_id": "..."}\nresponse）
        sid = hermes_sid
        sid_m = re.search(r'"session_id":\s*"([^"]+)"', raw)
        if sid_m:
            sid = sid_m.group(1)

        response = clean_hermes_output(raw)
        return response if response else "[無回應]", sid

    except subprocess.TimeoutExpired:
        stream_output("stderr", "⏱️  回應逾時（120秒）")
        return "抱歉，回應時間過長（120秒）。", hermes_sid
    except Exception as e:
        stream_output("stderr", f"❌ 錯誤：{str(e)}")
        return f"執行錯誤：{str(e)}", hermes_sid

# ─── API 路由 ─────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html", agents=list(AGENTS.keys()))

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    agent_key = data.get("agent", "Hermes Coder")
    message = data.get("message", "").strip()
    sess_id = data.get("session_id", "").strip()
    mode = data.get("mode", "accumulating")

    if not message:
        return jsonify({"error": "空訊息"}), 400

    # 初始化或更新 session
    if sess_id not in ACTIVE_SESSIONS:
        ACTIVE_SESSIONS[sess_id] = {
            "agent": agent_key,
            "mode": mode,
            "hermes_sid": None,
            "history": [],
            "created_at": datetime.now().isoformat(),
        }
    else:
        ACTIVE_SESSIONS[sess_id]["mode"] = mode

    sess = ACTIVE_SESSIONS[sess_id]
    hermes_sid = sess["hermes_sid"]

    if mode == "ephemeral":
        # 單次：不留歷史、不追 session
        response, new_sid = call_hermes(agent_key, message, history=None, hermes_sid=None, mode="ephemeral")
        return jsonify({
            "response": response,
            "agent": agent_key,
            "session_id": sess_id,
            "mode": "ephemeral",
            "hermes_sid": None,
            "timestamp": datetime.now().isoformat(),
        })
    else:
        # 累積 / 書籤：帶歷史 context
        response, new_sid = call_hermes(
            agent_key, message,
            history=sess["history"],
            hermes_sid=hermes_sid,
            mode=mode,
        )
        sess["hermes_sid"] = new_sid
        sess["history"].append({"role": "user", "content": message})
        sess["history"].append({"role": "assistant", "content": response})

        return jsonify({
            "response": response,
            "agent": agent_key,
            "session_id": sess_id,
            "mode": mode,
            "hermes_sid": new_sid,
            "timestamp": datetime.now().isoformat(),
        })

@app.route("/api/sessions", methods=["GET"])
def list_sessions():
    return jsonify({
        "sessions": [
            {
                "id": sid,
                "agent": s["agent"],
                "mode": s["mode"],
                "hermes_sid": s["hermes_sid"],
                "history_len": len(s["history"]),
                "created_at": s["created_at"],
            }
            for sid, s in ACTIVE_SESSIONS.items()
        ]
    })

@app.route("/api/sessions/<sess_id>", methods=["DELETE"])
def delete_session(sess_id):
    if sess_id in ACTIVE_SESSIONS:
        del ACTIVE_SESSIONS[sess_id]
    return jsonify({"ok": True})

@app.route("/api/sessions/<sess_id>", methods=["PATCH"])
def update_session(sess_id):
    """更新 session 模式"""
    if sess_id not in ACTIVE_SESSIONS:
        return jsonify({"error": "session 不存在"}), 404
    data = request.json
    if "mode" in data:
        ACTIVE_SESSIONS[sess_id]["mode"] = data["mode"]
    return jsonify({"ok": True, "session": ACTIVE_SESSIONS[sess_id]})

@app.route("/api/memories", methods=["GET"])
def list_memories():
    return jsonify({"memories": SELECTIVE_MEMORIES})

@app.route("/api/memories", methods=["POST"])
def add_memory():
    data = request.json
    memory = {
        "id": f"mem_{int(time.time()*1000)}",
        "agent": data.get("agent", ""),
        "content": data.get("content", ""),
        "tags": data.get("tags", []),
        "ts": datetime.now().isoformat(),
    }
    SELECTIVE_MEMORIES.append(memory)
    return jsonify({"ok": True, "memory": memory})

@app.route("/api/memories/<mem_id>", methods=["DELETE"])
def delete_memory(mem_id):
    global SELECTIVE_MEMORIES
    SELECTIVE_MEMORIES = [m for m in SELECTIVE_MEMORIES if m["id"] != mem_id]
    return jsonify({"ok": True})

@app.route("/api/file", methods=["GET"])
def read_file_api():
    """讀取指定檔案內容（供右側預覽用）"""
    path = request.args.get("path", "")
    if not path:
        return jsonify({"error": "缺少 path"}), 400
    # 安全：只允許讀取允許的目錄
    allowed = [str(Path.home() / "Desktop" / "Oren_own")]
    if not any(Path(path).is_relative_to(Path(a)) for a in allowed):
        return jsonify({"error": "路徑不安全"}), 403
    try:
        content = Path(path).read_text()
        return jsonify({"content": content, "path": path})
    except Exception as e:
        return jsonify({"error": str(e)}), 404

# ─── WebSocket ─────────────────────────────────────────────

@socketio.on("connect")
def on_connect():
    emit("connected", {"status": "ok"})

@socketio.on("disconnect")
def on_disconnect():
    pass

# ─── 啟動 ──────────────────────────────────────────────────

if __name__ == "__main__":
    print("🚀 Hermes Chat App — 三層記憶系統")
    print("   http://localhost:5177")
    socketio.run(app, host="0.0.0.0", port=5177, debug=True, allow_unsafe_werkzeug=True)
