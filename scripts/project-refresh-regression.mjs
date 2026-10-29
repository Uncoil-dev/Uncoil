// Authenticated preview check: no test-time application patches or auth bypasses.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
const base=process.env.PREVIEW_URL, project=process.env.UNCOIL_E2E_PROJECT_ID, state=process.env.PREVIEW_STATE_FILE;
if(!base||!project||!state||!existsSync(state)) throw Error('Run the normal authenticated click suite first and reuse its session');
const out=process.env.OUT_DIR??'/root/uncoil-tools/shots-loading-refresh';mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const context=await browser.newContext({storageState:state,viewport:{width:1440,height:900},extraHTTPHeaders:process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{}});
const page=await context.newPage();let requests=0;page.on('request',r=>{if(new URL(r.url()).pathname===`/api/projects/${project}/traces`)requests++});
for(let n=0;n<12;n++){
 requests=0;await page.goto(`${base}/dashboard/${project}/tracing`,{waitUntil:'domcontentloaded'});
 const heading=page.getByRole('heading',{name:'Tracing',exact:true});await heading.waitFor();
 await page.getByRole('button',{name:/^Columns /}).click();const dialog=page.getByRole('dialog',{name:'Choose columns'});await dialog.waitFor();await dialog.getByLabel('Search columns').fill(`keep-${n}`);
 await page.waitForTimeout(2200);
 if(!await dialog.isVisible()||await dialog.getByLabel('Search columns').inputValue()!==`keep-${n}`)throw Error(`Load ${n+1}: project refresh lost dialog/input`);
 if(await page.getByText('Loading project...',{exact:true}).count())throw Error(`Load ${n+1}: loading flash after authorization`);
 if(requests!==1)throw Error(`Load ${n+1}: expected one initial list request, got ${requests}`);
 console.log(`PASS load ${n+1}: menu/input retained; one initial list request`);
 await page.keyboard.press('Escape');
}
await page.screenshot({path:`${out}/desktop.png`});await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Tracing',exact:true}).waitFor();await page.waitForTimeout(2200);if(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1))throw Error('Phone overflow');await page.screenshot({path:`${out}/phone.png`});console.log('PASS phone and no horizontal overflow');await browser.close();
