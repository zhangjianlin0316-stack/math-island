import json, asyncio, os, sys, re
sys.path.insert(0, "/workspace/math-island")
import tts
P = json.load(open("/workspace/math-island/web/src/comp.json"))
def text(p):
    s = "我们一起来看这道题。" + "".join(x if x.endswith(("。", "！", "？")) else x + "。" for x in p["sol"])
    s = s.replace("✓", "，对上了").replace("1/(n×(n+1))", "n乘n加一分之一").replace("1/(n+1)", "n加一分之一").replace("1/n", "n分之一")
    return s
async def main():
    for eng in ["kokoro", "edge"]:
        for p in P:
            f = f"audio/{eng}/comp_{p['id']}.mp3"
            if os.path.exists(f): continue
            t = text(p)
            for k in range(3):
                try:
                    data = tts.kokoro_mp3(t, "teacher") if eng == "kokoro" else await tts.edge_mp3(t, "teacher")
                    break
                except Exception as e:
                    print("retry", f, e); await asyncio.sleep(2)
            open(f, "wb").write(data); print(eng, p["id"], len(data), flush=True)
asyncio.run(main())
