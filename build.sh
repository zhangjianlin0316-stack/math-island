#!/bin/bash
# Build web bundle (served by server.py) and a single-file offline HTML with embedded teacher audio.
set -e
cd /workspace/math-island/web
npx esbuild src/main.tsx --bundle --minify --jsx=automatic --loader:.json=json --outfile=dist/app.js --define:process.env.NODE_ENV='"production"'
cd ..
mkdir -p offline
python3 - <<'PY'
import base64, glob, json, os
A = {}
for f in sorted(glob.glob("audio/*/*.mp3")):
    eng, name = f.split("/")[1], os.path.basename(f)[:-4]
    A[f"{eng}/{name}"] = base64.b64encode(open(f, "rb").read()).decode()
A["silence"] = base64.b64encode(open("audio/silence.mp3", "rb").read()).decode()
IMG = {os.path.basename(f)[:-5]: "data:image/webp;base64," + base64.b64encode(open(f, "rb").read()).decode() for f in sorted(glob.glob("web/dist/skins/*.webp"))}
html = open("web/dist/index.html").read()
js = open("web/dist/app.js").read().replace("</script", "<\\/script")
html = html.replace('<script src="app.js"></script>', "<script>window.__AUDIO=" + json.dumps(A) + ";window.__IMG=" + json.dumps(IMG) + "</script><script>" + js + "</script>")
html = html.replace("<title>数学探险岛 · 王老师和小派</title>", "<title>数学探险岛（离线版）</title>")
open("offline/math-island-offline.html", "w").write(html)
print("offline html", os.path.getsize("offline/math-island-offline.html") // 1024, "KB")
PY
