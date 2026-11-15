import asyncio, re
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 390, "height": 844})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("file:///workspace/math-island/offline/math-island-offline.html"); await pg.wait_for_timeout(500)
        await pg.get_by_text("20以内加减法").first.click(); await pg.get_by_text("我看懂了，开始挑战").click(); await pg.wait_for_timeout(300)
        for k in range(5):
            t = await pg.locator("text=/^\\d+ [+−] \\d+ = \\?$/").first.inner_text()
            a, op, c = re.match(r"(\d+) ([+−]) (\d+)", t).groups(); ans = int(a)+int(c) if op == "+" else int(a)-int(c)
            for ch in str(ans): await pg.get_by_role("button", name=ch, exact=True).click()
            await pg.get_by_role("button", name="确定", exact=True).click(); await pg.wait_for_timeout(300)
            if k < 4: await pg.get_by_text("下一题 →").click(); await pg.wait_for_timeout(200)
        s = await pg.evaluate("JSON.parse(localStorage.getItem('mi_save_v1'))")
        print("coins", s["coins"], "xp", s["xp"], "mastered", s["mastered"], "chests", s["chests"], "prog add mastered", s["prog"].get("add", {}).get("mastered"), errs)
        await b.close()
asyncio.run(main())
