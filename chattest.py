import httpx, time, sys
U="http://127.0.0.1:8090/api/chat"
qs=[("为什么直角是90度？","孩子正在学习：2年级「认识直角、锐角、钝角」。孩子正在看动画讲解。"),
    ("这道题怎么做？","孩子正在学习：1年级「20以内加减法」。孩子正在做的题目：「8 + 6 = ?」。解题思路提示（不要直接说出最终答案）：想一想：先凑成 10 会不会更简单？ 看看小方格里的圆点。"),
    ("你喜欢打游戏吗？","孩子在闯关首页，还没选关卡。")]
for q,c in qs:
    t=time.time(); first=None; out=""
    with httpx.stream("POST",U,json={"messages":[{"role":"user","content":q}],"context":c},timeout=120) as r:
        for ch in r.iter_text():
            if first is None: first=time.time()-t
            out+=ch
    print(f"Q:{q}\n首字 {first:.2f}s 总 {time.time()-t:.2f}s 字数 {len(out)}\nA:{out}\n")
