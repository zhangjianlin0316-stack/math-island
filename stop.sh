#!/bin/bash
cd /workspace/math-island
for p in supervisor llama app tunnel; do [ -f logs/$p.pid ] && kill "$(cat logs/$p.pid)" 2>/dev/null; done
echo stopped
