import {test,expect,type Page} from '@playwright/test';
import {mockRoasApi,testState} from './fixtures';
import {emptyMarketingMetrics} from '../apps/web/src/marketing-metrics';
import {marketingPeriodRange} from '../apps/web/src/marketing-period';
import {previousMarketingRange} from '../apps/web/src/marketing-comparison';
const meta={id:'meta-1',clientId:'client-1',provider:'meta_ads',status:'connected',agencyConnectionId:'oauth-meta',resourceId:'act_1',primaryId:'bm-1',autoSync:true};
const range=marketingPeriodRange('last_7'),previous=previousMarketingRange(range);
const panel=(page:Page)=>page.getByRole('region',{name:'Comparativo de marketing',exact:true});
type Request={from:string;to:string;resourceId:string};
function response(input:Request,spend:number,results:number){return {period:{from:input.from,to:input.to},metrics:{...emptyMarketingMetrics,spend,results},topAds:[],performanceRows:[],syncedAt:new Date().toISOString()}}
async function setup(page:Page){
 await mockRoasApi(page);
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,clients:[...testState.clients,{...testState.clients[0],id:'client-2',companyName:'Outro cliente'}],client_marketing_integrations:[meta,{...meta,id:'meta-2',clientId:'client-2',resourceId:'act_2'}]}}}));
}
async function open(page:Page){await page.goto('/marketing/dashboard');await page.getByLabel('Período do dashboard de marketing').selectOption('last_7');await expect(page.locator('.marketingSelectableMetrics article').first().locator('strong')).not.toHaveText('—')}

test('compara os dois intervalos e não substitui os dados atuais',async({page},testInfo)=>{
 await setup(page);const requests:Request[]=[];
 await page.route('**/api/marketing/sync/*',route=>{const input=route.request().postDataJSON();requests.push(input);return route.fulfill({json:response(input,input.from===previous.from?200:400,input.from===previous.from?10:40)})});
 await open(page);
 await panel(page).getByLabel('Comparar períodos').check();
 await expect(panel(page).getByRole('article',{name:'Investimento',exact:true})).toContainText('+100%');
 await expect(panel(page).getByRole('article',{name:'Resultados',exact:true})).toContainText('+300%');
 await expect(panel(page).getByRole('article',{name:'Custo por resultado',exact:true})).toContainText('-50%');
 expect(requests.some(item=>item.from===previous.from&&item.to===previous.to&&item.resourceId==='act_1')).toBe(true);
 await expect(page.locator('.marketingSelectableMetrics')).toContainText('400,00');
 await page.setViewportSize({width:390,height:844});await panel(page).scrollIntoViewIfNeeded();
 expect(await panel(page).evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
 await panel(page).screenshot({path:testInfo.outputPath('marketing-comparison-mobile.png')});
 await page.reload();await expect(panel(page).getByLabel('Comparar períodos')).toBeChecked();
});

test('base zero e ausência de resultados não geram infinito nem custo fictício',async({page})=>{
 await setup(page);
 await page.route('**/api/marketing/sync/*',route=>{const input=route.request().postDataJSON();return route.fulfill({json:response(input,input.from===previous.from?0:400,input.from===previous.from?0:40)})});
 await open(page);await panel(page).getByLabel('Comparar períodos').check();
 await expect(panel(page).getByRole('article',{name:'Investimento',exact:true})).toContainText('Anterior: R$ 0,00');
 await expect(panel(page).getByRole('article',{name:'Investimento',exact:true})).toContainText('Sem base comparável');
 await expect(panel(page).getByRole('article',{name:'Custo por resultado',exact:true})).toContainText('Anterior: —');
 await expect(panel(page)).not.toContainText(/Infinity|NaN/);
});

test('falha anterior permite tentar de novo sem apagar o período atual',async({page})=>{
 await setup(page);let fail=true;
 await page.route('**/api/marketing/sync/*',route=>{const input=route.request().postDataJSON();return input.from===previous.from&&fail?route.fulfill({status:503,json:{error:'Falha anterior'}}):route.fulfill({json:response(input,input.from===previous.from?200:400,20)})});
 await open(page);await panel(page).getByLabel('Comparar períodos').check();
 await expect(panel(page).getByRole('alert')).toContainText('Não foi possível carregar todas as contas');
 await expect(page.locator('.marketingSelectableMetrics')).toContainText('400,00');
 fail=false;await panel(page).getByRole('button',{name:'Tentar comparação novamente'}).click();
 await expect(panel(page).getByRole('article',{name:'Investimento',exact:true})).toContainText('+100%');
});

test('trocar cliente ignora uma resposta anterior atrasada e Máximo não consulta comparação',async({page})=>{
 await setup(page);let release=()=>{};const held=new Promise<void>(resolve=>{release=resolve});let maxPrevious=0;
 await page.route('**/api/marketing/sync/*',async route=>{
  const input=route.request().postDataJSON();if(input.from< '2010-01-01')maxPrevious++;
  if(input.resourceId==='act_1'&&input.from===previous.from)await held;
  await route.fulfill({json:response(input,input.resourceId==='act_2'?900:100,30)}).catch(()=>{});
 });
 await open(page);await panel(page).getByLabel('Comparar períodos').check();
 await expect(panel(page)).toContainText('Carregando o período anterior');
 await page.getByLabel('Cliente do dashboard',{exact:true}).selectOption('client-2');
 release();
 await expect(panel(page).getByRole('article',{name:'Investimento',exact:true})).toContainText('900,00');
 await expect(panel(page).getByRole('article',{name:'Investimento',exact:true})).toContainText('Sem variação');
 await page.getByLabel('Período do dashboard de marketing').selectOption('maximum');
 await expect(panel(page)).toContainText('Selecione um período diferente');expect(maxPrevious).toBe(0);
});
