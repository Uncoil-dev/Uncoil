import { expect, test } from "@playwright/test";

// The trace board on the homepage must sit inside the page padding on every phone width, in both
// tabs and for every example run: nothing in it may reach past the screen's right edge, unless a
// scrolling or clipping box of its own contains it.
for (const width of [320, 360, 390, 430]) {
  for (const id of ["empty", "timeout"]) {
    test(`trace board fits a ${width}px screen (${id})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/?case=${id}`);
      for (const tab of ["Uncoil", "Your logs"]) {
        await page.locator("#trace").scrollIntoViewIfNeeded();
        await page.getByRole("tab", { name: tab }).click();
        const over = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const section = document.getElementById("trace")!;
          const pad = parseFloat(getComputedStyle(section).paddingLeft);
          const out: string[] = [];
          const board = section.querySelector("[role=tablist]")!.parentElement!.getBoundingClientRect();
          if (board.left < pad - 0.5 || board.right > vw - pad + 0.5) out.push(`board ${board.left}..${board.right}`);
          for (const el of section.querySelectorAll("*")) {
            if (el.closest("canvas,[aria-hidden=true],.invisible,.sr-only") || el.tagName === "STYLE") continue;
            const r = el.getBoundingClientRect();
            if (!r.width) continue;
            let clip: DOMRect | null = null;
            for (let a = el.parentElement; a && a !== section; a = a.parentElement) {
              if (getComputedStyle(a).overflowX !== "visible") {
                clip = a.getBoundingClientRect();
                break;
              }
            }
            const right = clip ? Math.min(r.right, clip.right) : r.right;
            if (right > vw - pad + 0.5 || r.left < -0.5) out.push(`${el.tagName} ${r.left}..${r.right}`);
          }
          if (document.documentElement.scrollWidth > vw) out.push("the page scrolls sideways");
          return out;
        });
        expect(over, `${tab} tab`).toEqual([]);
      }
    });
  }
}
