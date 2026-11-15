import httpx,time,sys,json
port=sys.argv[1]
sysmsg="你是小派，一个耐心的小学数学辅导老师。用简单中文，回答简短（3句以内），多用提问引导孩子思考。"
t=time.time()
r=httpx.post(f"http://127.0.0.1:{port}/v1/chat/completions",json={"messages":[{"role":"system","content":sysmsg},{"role":"user","content":"为什么直角是90度？"}],"max_tokens":200,"temperature":0.6},timeout=300).json()
print(time.time()-t); print(r["choices"][0]["message"]["content"]); print(r.get("timings"))
