import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        pg = await b.new_page(viewport={"width":390,"height":844}, device_scale_factor=2)
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type=="error" and errs.append(m.text))
        await pg.goto("http://127.0.0.1:8090/"); await pg.wait_for_timeout(800)
        await pg.screenshot(path="/tmp/s1.png", full_page=False)
        await pg.get_by_text("认识直角、锐角、钝角").first.click(); await pg.wait_for_timeout(4500)
        print("speaker playing:", await pg.evaluate("document.querySelector('audio')===null"))
        await pg.screenshot(path="/tmp/s2.png", full_page=True)
        await pg.get_by_text("我看懂了，开始挑战").click(); await pg.wait_for_timeout(500)
        await pg.screenshot(path="/tmp/s3.png", full_page=True)
        await pg.get_by_text("💬 问小派").click()
        await pg.fill("input[placeholder='输入你的问题…']", "钝角是什么？")
        await pg.get_by_text("发送").click(); await pg.wait_for_timeout(15000)
        await pg.screenshot(path="/tmp/s4.png")
        print("errors:", errs)
        await b.close()
asyncio.run(main())
