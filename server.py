import json, hashlib, os, re, time, asyncio, logging
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, Response, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
import tts

BASE = "/workspace/math-island"
LLM = os.environ.get("LLM_URL", "http://127.0.0.1:8081")
log = logging.getLogger("mi"); logging.basicConfig(level=logging.INFO)
app = FastAPI()

SYSTEM = """你是「小派」，数学探险岛上的AI小向导，一个耐心、温柔、爱鼓励人的小学数学辅导老师，正在和一位6到12岁的中国小学生聊天。
规则：
1. 只用简单、口语化的中文，像跟小朋友说话一样。每次回答不超过3到4句话，不要用Markdown、列表或公式符号堆砌。
2. 多用启发式提问，引导孩子自己想出答案：先问一个小问题或给一个生活中的例子（比如课本的角、披萨、钟表），不要一上来就直接给出练习题的最终答案。孩子明确说试过还是不会时，再一步一步讲清楚。
3. 讲概念时必须准确，严格依照下面的「小派知识卡」和小学课本（人教版）的说法，不要自己编造。
4. 只聊数学和学习。孩子问别的话题，就友好地把话题拉回数学。
5. 内容必须适合儿童：不说任何吓人、暴力、不礼貌的话，不索要孩子的姓名、地址、电话等个人信息。
6. 多夸奖、多鼓励。
7. 如果【当前情况】里有孩子正在做的题目，孩子问“怎么做”时，就根据那道题和解题思路提示，先引导第一步，问孩子一个具体的小问题，但不要说出最终答案。
8. 孩子聊游戏、动画等别的事时，用一句话友好回应，然后马上出一个和数学有关的小问题，把话题拉回数学。

小派知识卡（一定要以这些为准）：
- 度：把一个圆（周角）平均分成360份，每一份的角是1度。周角360°，平角180°（两条边成一条直线），直角是周角的四分之一，所以是90°。这是古人定下的规定，360很好分。
- 直角：两条边互相垂直，像课本、黑板的角，正好90°，用小正方形标记。锐角：大于0°小于90°。钝角：大于90°小于180°。角的大小只看两边张开多大，和边长无关。
- 凑十法：8+5，先8+2=10，再10+3=13。破十法：15−7，先10−7=3，再3+5=8。
- 乘法：3×4表示3个4相加。交换两个乘数，积不变。除法是乘法的逆运算。
- 分数：把一个整体平均分成几份，分母是平均分的份数，分子是取的份数。分母相同，分子大的分数大；分子相同，分母小的分数大。
- 长方形周长=(长+宽)×2，单位厘米；面积=长×宽，单位平方厘米。周长是一圈线，面积是一个面。
- 三角形内角和是180°；直角三角形两个锐角和是90°；等腰三角形两个底角相等。
- 圆：直径d=2r；周长C=πd=2πr；面积S=πr²；π≈3.14，叫圆周率。
- 勾股定理（初中八年级内容）：直角三角形两条直角边的平方和等于斜边的平方，如3²+4²=5²。"""

FEWSHOT = [
    {"role": "user", "content": "什么是锐角？"},
    {"role": "assistant", "content": "你问得真好！先想一想：课本的角是直角，有90度。如果一个角张开得比课本的角还小，你觉得它是多少度呢？比90度小的角，就叫锐角哦！"},
    {"role": "user", "content": "你喜欢看动画片吗？"},
    {"role": "assistant", "content": "动画片很好看呀！不过小派最爱数学啦。考考你：一集动画片里出现了3只小猫，每只有4条腿，一共有几条腿呢？"},
]

@app.post("/api/chat")
async def chat(req: Request):
    body = await req.json()
    ctx = str(body.get("context", ""))[:800]
    msgs = []
    for m in (body.get("messages") or [])[-8:]:
        if m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str):
            msgs.append({"role": m["role"], "content": m["content"][:400]})
    if not msgs or msgs[-1]["role"] != "user":
        return JSONResponse({"error": "no question"}, status_code=400)
    if ctx:
        msgs[-1] = {"role": "user", "content": f"【当前情况：{ctx}】\n孩子的问题：{msgs[-1]['content']}"}
    payload = {"messages": [{"role": "system", "content": SYSTEM}] + FEWSHOT + msgs, "stream": True,
               "max_tokens": 220, "temperature": 0.3, "top_p": 0.9, "repeat_penalty": 1.1, "cache_prompt": True}

    async def gen():
        t0 = time.time(); n = 0
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120, connect=5)) as c:
                async with c.stream("POST", f"{LLM}/v1/chat/completions", json=payload) as r:
                    async for line in r.aiter_lines():
                        if not line.startswith("data: "): continue
                        d = line[6:].strip()
                        if d == "[DONE]": break
                        try:
                            delta = json.loads(d)["choices"][0]["delta"].get("content") or ""
                        except Exception:
                            continue
                        if delta:
                            n += 1; yield delta
        except Exception as e:
            log.exception("chat failed")
            yield "（小派现在有点忙，请稍后再问一次～）"
        log.info("chat: %d chunks in %.1fs", n, time.time() - t0)
    return StreamingResponse(gen(), media_type="text/plain; charset=utf-8", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

CACHE = f"{BASE}/tts_cache"; os.makedirs(CACHE, exist_ok=True)

@app.post("/api/tts")
async def synth(req: Request):
    b = await req.json()
    text = str(b.get("text", ""))[:500].strip()
    role = "teacher" if b.get("role") == "teacher" else "pai"
    eng = "edge" if b.get("engine") == "edge" else "kokoro"
    if not text: return JSONResponse({"error": "empty"}, status_code=400)
    key = hashlib.sha1(f"{eng}|{role}|{text}".encode()).hexdigest()
    p = f"{CACHE}/{key}.mp3"
    if not os.path.exists(p):
        t0 = time.time(); data = None
        if eng == "edge":
            try: data = await asyncio.wait_for(tts.edge_mp3(text, role), 15)
            except Exception: log.warning("edge-tts failed, falling back to kokoro")
        if not data:
            data = await run_in_threadpool(tts.kokoro_mp3, text, role)
        open(p, "wb").write(data)
        log.info("tts %s %s %d chars in %.2fs", eng, role, len(text), time.time() - t0)
    return FileResponse(p, media_type="audio/mpeg")

@app.get("/api/health")
async def health():
    ok = False
    try:
        async with httpx.AsyncClient(timeout=3) as c: ok = (await c.get(f"{LLM}/health")).status_code == 200
    except Exception: pass
    return {"ok": True, "llm": ok}

app.mount("/audio", StaticFiles(directory=f"{BASE}/audio"), name="audio")
app.mount("/", StaticFiles(directory=f"{BASE}/web/dist", html=True), name="web")

@app.on_event("startup")
async def warm():
    asyncio.get_event_loop().run_in_executor(None, tts._load)
