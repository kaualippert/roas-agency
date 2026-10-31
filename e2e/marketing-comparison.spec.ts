import {test,expect,type Page} from '@playwright/test';
import {mockRoasApi,testState} from './fixtures';
import {emptyMarketingMetrics} from '../apps/web/src/marketing-metrics';
import {marketingPeriodRange} from '../apps/web/src/marketing-period';
import {previousMarketingRange,marketingComparisonRange} from '../apps/web/src/marketing-comparison';
const meta={id:'meta-1',clientId:'client-1',provider:'meta_ads',status:'connected',agencyConnectionId:'oauth-meta',resourceId:'act_1',primaryId:'bm-1',autoSync:true};
const range=marketingPeriodRange('last_7'),previous=previousMarketingRange(range);
const cards=(page:Page)=>page.locator('.marketingSelectableMetrics');
const delta=(page:Page,id:string)=>cards(page).locator(`[data-metric="${id}"] .marketingMetricDelta`);
const toggle=(page:Page)=>page.getByRole('button',{name:/^Comparar com/});
type Request={from:string;to:string;resourceId:string};
function response(input:Request,spend:number,results:number){return {period:{from:input.from,to:input.to},metrics:{...emptyMarketingMetrics,spend,results,reach:results*10},topAds:[],performanceRows:[],syncedAt:new Date().toISOString()}}
async function setup(page:Page){
 await mockRoasApi(page);
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,clients:[...testState.clients,{...testState.clients[0],id:'client-2',companyName:'Outro cliente'}],client_marketing_integrations:[meta,{...meta,id:'meta-2',clientId:'client-2',resourceId:'act_2'}],marketing_dashboard_preferences:[{clientId:'client-1',metricIds:['spend','results','costPerResult','reach'],widgets:[]}]}}}));
}
async function open(page:Page){await page.goto('/marketing/dashboard');await page.getByLabel('Período do dashboard de marketing').selectOption('last_7');await expect(cards(page).locator('article').first().locator('strong')).not.toHaveText('—')}

test('comparativo fica nos cartões existentes sem textos redundantes ou painel extra',async({page},testInfo)=>{
 await setup(page);const requests:Request[]=[];
 await page.route('**/api/marketing/sync/*',route=>{const input=route.request().postDataJSON();requests.push(input);return route.fulfill({json:response(input,input.from===previous.from?200:400,input.from===previous.from?10:40)})});
 await open(page);await expect(cards(page).locator('.marketingMetricDelta')).toHaveCount(0);
 await toggle(page).click();
 await expect(delta(page,'spend')).toHaveText('+100%');
 await expect(delta(page,'results')).toHaveText('+300%');
 await expect(delta(page,'costPerResult')).toHaveText('−50%');
 await expect(delta(page,'costPerResult')).toHaveClass(/better/);
 await expect(delta(page,'reach')).toHaveText('+300%');
 expect(requests.some(item=>item.from===previous.from&&item.to===previous.to&&item.resourceId==='act_1')).toBe(true);
 await expect(cards(page)).toContainText('400,00');
 await expect(cards(page).locator('article')).toHaveCount(4);
 await expect(cards(page)).not.toContainText(/Pessoas alcançadas|Operação da mídia|Neste período/);
 await expect(page.locator('.marketingComparisonCards,.marketingComparison,.marketingMetricContext')).toHaveCount(0);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await cards(page).scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  await cards(page).screenshot({path:testInfo.outputPath(`inline-comparison-${width}.png`)});
 }
 await page.reload();await expect(toggle(page)).toHaveAttribute('aria-pressed','true');
 await toggle(page).click();await expect(cards(page).locator('.marketingMetricDelta')).toHaveCount(0);
});

test('base zero e ausência de resultados mostram traço em vez de percentual enganoso',async({page})=>{
 await setup(page);
 await page.route('**/api/marketing/sync/*',route=>{const input=route.request().postDataJSON();return route.fulfill({json:response(input,input.from===previous.from?0:400,input.from===previous.from?0:40)})});
 await open(page);await toggle(page).click();
 await expect(delta(page,'spend')).toHaveText('—');
 await expect(delta(page,'spend')).toHaveAttribute('title',/sem base comparável.*Anterior.*0,00/);
 await expect(delta(page,'costPerResult')).toHaveAttribute('title',/Anterior.*indisponível/);
 await expect(cards(page)).not.toContainText(/Infinity|NaN/);
});

test('falha anterior permite tentar novamente sem apagar os dados atuais',async({page})=>{
 await setup(page);let fail=true;
 await page.route('**/api/marketing/sync/*',route=>{const input=route.request().postDataJSON();return input.from===previous.from&&fail?route.fulfill({status:503,json:{error:'Falha anterior'}}):route.fulfill({json:response(input,input.from===previous.from?200:400,20)})});
 await open(page);await toggle(page).click();
 const retry=page.getByRole('button',{name:'Tentar comparação novamente'});
 await expect(retry).toBeVisible();await expect(cards(page)).toContainText('400,00');
 await expect(delta(page,'spend')).toHaveText('—');
 fail=false;await retry.click();await expect(delta(page,'spend')).toHaveText('+100%');
});

test('trocar cliente ignora respostas atrasadas e Máximo desativa o comparativo',async({page})=>{
 await setup(page);let release=()=>{};const held=new Promise<void>(resolve=>{release=resolve});let started=false,maxPrevious=0;
 await page.route('**/api/marketing/sync/*',async route=>{
  const input=route.request().postDataJSON();if(input.from<'2010-01-01')maxPrevious++;
  if(input.resourceId==='act_1'&&input.from===previous.from){started=true;await held}
  await route.fulfill({json:response(input,input.resourceId==='act_2'?900:100,30)}).catch(()=>{});
 });
 await open(page);await toggle(page).click();await expect.poll(()=>started).toBe(true);
 await page.getByLabel('Cliente do dashboard',{exact:true}).selectOption('client-2');release();
 await expect(delta(page,'spend')).toHaveText('0%');await expect(cards(page)).toContainText('900,00');
 await page.getByLabel('Período do dashboard de marketing').selectOption('maximum');
 await expect(toggle(page)).toBeDisabled();await expect(cards(page).locator('.marketingMetricDelta')).toHaveCount(0);expect(maxPrevious).toBe(0);
});

test('Este mês compara os mesmos dias do mês anterior',async({page})=>{
 await setup(page);const previousMonth=marketingComparisonRange(marketingPeriodRange('this_month'),'this_month'),requests:Request[]=[];
 await page.route('**/api/marketing/sync/*',route=>{const input=route.request().postDataJSON();requests.push(input);return route.fulfill({json:response(input,input.from===previousMonth.from&&input.to===previousMonth.to?200:400,20)})});
 await page.goto('/marketing/dashboard');await toggle(page).click();
 await expect(delta(page,'spend')).toHaveText('+100%');
 expect(requests.some(item=>item.from===previousMonth.from&&item.to===previousMonth.to)).toBe(true);
 await expect(toggle(page)).toHaveAttribute('aria-label','Comparar com mês anterior');
});
