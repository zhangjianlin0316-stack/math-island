# 数学探险岛（王老师讲解 + 小派 AI 答疑）

- 启动/守护：`setsid nohup ./run.sh >/dev/null 2>&1 &`（自动拉起 llama-server:8081、网页服务:8090，挂了会重启）
- 停止：`./stop.sh`
- 尝试公网隧道：`TUNNEL=1 setsid nohup ./run.sh ...`（本机网络目前拦截了 cloudflared，见日志 logs/tunnel.log）
- 改了前端后：`./build.sh`（同时生成 offline/math-island-offline.html 离线单文件版）
- 重新生成老师语音：删掉 audio/<engine>/ 下的文件后 `./venv/bin/python gen_audio.py`（讲解词在 web/src/narration.json）
- 模型：models/qwen3b.gguf（内存够时）或 qwen1.5b.gguf；可用 `MODEL=models/qwen1.5b.gguf` 强制
- 语音：Kokoro-82M v1.1-zh（本地开源，默认）；edge-tts 微软神经语音（在线免费，可在页面切换）

## 竞赛挑战 + 奖励系统（2026-11-14 新增）
- 题库源：comp/problems.py（75 道原创题，运行它会逐题用脚本验算答案，全部通过才写出 web/src/comp.json）
- 讲题语音：gen_comp_audio.py → audio/{kokoro,edge}/comp_cNNN.mp3
- 形象美术：assets/skins-full/（原图 jpg、4× 超分 *_4x.webp、透明抠图 *_cutout.png），assets/process_skins.py 生成 web/dist/skins/*.webp 展示图
- 奖励逻辑：web/src/rewards.ts；界面：web/src/game.tsx；进度存 localStorage 键 mi_save_v1
