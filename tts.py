"""TTS helpers: Kokoro-82M v1.1-zh (local, open-source) and edge-tts (free online Microsoft neural voices)."""
import io, re, threading, asyncio
import numpy as np, soundfile as sf

BASE = "/workspace/math-island"
VOICES = {
    "kokoro": {"teacher": ("zf_001", 1.0), "pai": ("zf_003", 1.08)},
    "edge": {"teacher": ("zh-CN-XiaoxiaoNeural", "+0%"), "pai": ("zh-CN-XiaoyiNeural", "+5%")},
}
_k = None; _g2p = None; _lock = threading.Lock()

def _load():
    global _k, _g2p
    if _k is None:
        from kokoro_onnx import Kokoro
        from misaki import zh
        _k = Kokoro(f"{BASE}/models/kokoro-v1.1-zh.onnx", f"{BASE}/models/voices-v1.1-zh.bin", vocab_config=f"{BASE}/models/config-zh.json")
        _g2p = zh.ZHG2P(version="1.1")

CN = "零一二三四五六七八九"
def num2cn(s: str) -> str:
    if "." in s:
        a, b = s.split(".", 1)
        return num2cn(a or "0") + "点" + "".join(CN[int(c)] for c in b if c.isdigit())
    n = int(s)
    if n < 10: return CN[n]
    if n < 20: return "十" + (CN[n % 10] if n % 10 else "")
    if n < 100: return CN[n // 10] + "十" + (CN[n % 10] if n % 10 else "")
    if n < 1000:
        r = n % 100
        return CN[n // 100] + "百" + ("" if r == 0 else ("零" + CN[r] if r < 10 else ("一" + num2cn(str(r)) if r < 20 else num2cn(str(r)))))
    return "".join(CN[int(c)] for c in s)

def normalize(t: str) -> str:
    t = re.sub(r"[*#`>_~]", "", t)  # markdown
    t = re.sub(r"(\d+)\s*/\s*(\d+)", lambda m: f"{m.group(2)}分之{m.group(1)}", t)
    t = re.sub(r"([a-zA-Z\d]+)²", r"\1的平方", t)
    rep = {"×": "乘", "÷": "除以", "+": "加", "−": "减", "=": "等于", "≈": "约等于", "°": "度", "π": "派", "²": "的平方",
           "<": "小于", ">": "大于", "∠": "角", "%": "百分之", "（": "，", "）": "，", "(": "，", ")": "，", "…": "，", "～": "", "~": ""}
    for a, b in rep.items(): t = t.replace(a, b)
    t = re.sub(r"(?<=[\d\s])-(?=[\s\d])", "减", t)
    t = re.sub(r"\d+(\.\d+)?", lambda m: num2cn(m.group(0)), t)
    t = re.sub(r"[\U0001F000-\U0001FFFF\u2600-\u27BF]", "", t)  # emoji
    t = re.sub(r"\s+", " ", t).strip()
    return t

def kokoro_wav(text: str, role: str = "teacher") -> tuple[np.ndarray, int]:
    _load()
    voice, speed = VOICES["kokoro"][role]
    text = normalize(text)
    with _lock:
        parts, sr = [], 24000
        for sent in [s for s in re.split(r"(?<=[。！？!?；;])", text) if s.strip()]:
            ph = _g2p(sent)[0]
            if not ph.strip(): continue
            s, sr = _k.create(ph, voice=voice, speed=speed, is_phonemes=True)
            parts.append(s); parts.append(np.zeros(int(sr * 0.12), dtype=s.dtype))
    return (np.concatenate(parts) if parts else np.zeros(2400, dtype=np.float32)), sr

def kokoro_mp3(text: str, role: str = "teacher") -> bytes:
    s, sr = kokoro_wav(text, role)
    b = io.BytesIO(); sf.write(b, s, sr, format="MP3"); return b.getvalue()

async def edge_mp3(text: str, role: str = "teacher") -> bytes:
    import edge_tts
    voice, rate = VOICES["edge"][role]
    c = edge_tts.Communicate(normalize(text), voice, rate=rate)
    out = bytearray()
    async for ch in c.stream():
        if ch["type"] == "audio": out += ch["data"]
    return bytes(out)
