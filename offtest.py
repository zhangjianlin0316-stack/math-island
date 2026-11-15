import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        pg = await b.new_page(viewport={"width":390,"height":844})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("file:///workspace/math-island/offline/math-island-offline.html"); await pg.wait_for_timeout(800)
        await pg.get_by_text("圆的周长与面积").first.click(); await pg.wait_for_timeout(3000)
        print("teacher speaking:", await pg.get_by_text("⏸ 暂停").count())
        await pg.get_by_text("💬 问小派").click(); await pg.fill("input[placeholder='输入你的问题…']", "π是什么"); await pg.get_by_text("发送").click(); await pg.wait_for_timeout(500)
        print(await pg.locator("text=离线版只能").count(), errs)
        await b.close()
asyncio.run(main())
