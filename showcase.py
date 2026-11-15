import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto("file:///workspace/math-island/offline/math-island-offline.html"); await pg.wait_for_timeout(500)
        await pg.evaluate("""(()=>{const s=JSON.parse(localStorage.getItem('mi_save_v1'));s.owned=s.owned.concat(['char_king','bg_castle','pet_phoenix','frame_rainbow','char_wizard','bg_space','pet_dragon']);s.equip={char:'char_king',bg:'bg_castle',pet:'pet_phoenix',frame:'frame_rainbow'};localStorage.setItem('mi_save_v1',JSON.stringify(s))})()""")
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.get_by_text("👕 我的形象").click(); await pg.wait_for_timeout(1200)
        await pg.locator("div[style*='border-radius: 18px']").first.screenshot(path="/workspace/math-island/assets/showcase_legend.png")
        await pg.get_by_text("🏆 竞赛挑战").click(); await pg.get_by_text("高年级（5–6）", exact=False).click()
        await pg.locator("text=里面画一个最大的圆").first.click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path="/tmp/sq.png")
        print(errs); await b.close()
asyncio.run(main())
