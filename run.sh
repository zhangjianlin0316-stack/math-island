#!/bin/bash
# Supervisor for 数学探险岛: llama.cpp server + FastAPI app + Cloudflare quick tunnel. Restarts anything that dies.
cd /workspace/math-island
mkdir -p logs
echo $$ > logs/supervisor.pid
pick_model() {
  if [ -n "$MODEL" ]; then echo "$MODEL"; return; fi
  avail=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
  if [ "$avail" -gt 3300 ]; then echo models/qwen3b.gguf; else echo models/qwen1.5b.gguf; fi
}
start_llm() {
  m=$(pick_model); echo "$(date) starting llama-server with $m" >> logs/supervisor.log
  nohup ./llama/llama-server -m "$m" --host 127.0.0.1 --port 8081 -c 3072 -t 8 --parallel 1 >> logs/llama.log 2>&1 &
  echo $! > logs/llama.pid
}
start_app() {
  nohup ./venv/bin/uvicorn server:app --host 127.0.0.1 --port 8090 >> logs/app.log 2>&1 &
  echo $! > logs/app.pid
}
start_tunnel() {
  : > logs/tunnel.log
  nohup ./bin/cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8090 >> logs/tunnel.log 2>&1 &
  echo $! > logs/tunnel.pid
  for i in $(seq 1 30); do
    u=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' logs/tunnel.log | head -1)
    if [ -n "$u" ]; then echo "$u" > tunnel_url.txt; echo "$(date) tunnel $u" >> logs/supervisor.log; break; fi
    sleep 1
  done
}
alive() { [ -f "logs/$1.pid" ] && kill -0 "$(cat logs/$1.pid)" 2>/dev/null; }
while true; do
  alive llama || start_llm
  alive app || start_app
  if [ "$TUNNEL" = "1" ]; then alive tunnel || start_tunnel; fi
  sleep 10
done
