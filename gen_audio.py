import json, asyncio, os, subprocess, sys
sys.path.insert(0, "/workspace/math-island")
import tts
N = json.load(open("/workspace/math-island/web/src/narration.json"))
OUT = "/workspace/math-island/audio"
def dur(p): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p]).decode().strip())
async def main():
    man = {}
    for eng in ["kokoro", "edge"]:
        os.makedirs(f"{OUT}/{eng}", exist_ok=True); man[eng] = {}
        for lv, d in N.items():
            items = [(f"{lv}_{i}", t) for i, t in enumerate(d["caps"])] + [(f"{lv}_keys", d["keys"])]
            for name, t in items:
                p = f"{OUT}/{eng}/{name}.mp3"
                if not os.path.exists(p):
                    data = tts.kokoro_mp3(t, "teacher") if eng == "kokoro" else await tts.edge_mp3(t, "teacher")
                    open(p, "wb").write(data)
                man[eng][name] = round(dur(p), 2)
                print(eng, name, man[eng][name], os.path.getsize(p), flush=True)
    json.dump(man, open(f"{OUT}/manifest.json", "w"), indent=1)
asyncio.run(main())
