import {expect,test,type Page} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';
import {marketingPeriodRange} from '../apps/web/src/marketing-period';
import {emptyMarketingMetrics} from '../apps/web/src/marketing-metrics';

const meta={id:'meta-1',clientId:'client-1',provider:'meta_ads',status:'connected',agencyConnectionId:'oauth-meta-e2e',primaryId:'bm-1',resourceId:'act_1',resourceName:'Conta 1',autoSync:true};
const google={...meta,id:'google-1',provider:'google_ads',agencyConnectionId:'oauth-google-e2e',resourceId:'google_1'};
const second={...meta,id:'meta-2',clientId:'client-2',resourceId:'act_2'};
type Input={connectionId:string;primaryId:string;resourceId:string;from:string;to:string};
async function setup(page:Page,integrations=[meta]){
 await mockRoasApi(page);
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,clients:[...testState.clients,{...testState.clients[0],id:'client-2',companyName:'Segundo Cliente'}],client_marketing_integrations:integrations}}}));
}
function response(input:Input,spend=200){return {period:{from:input.from,to:input.to},metrics:{...emptyMarketingMetrics,spend,impressions:2000,clicks:100,results:10},topAds:[],performanceRows:[],syncedAt:new Date().toISOString()}}
const spendCard=(page:Page)=>page.locator('.marketingSelectableMetrics article').filter({has:page.locator('small').filter({hasText:/^Investimento$/})}).locator('strong');

test('atualiza na abertura, ao trocar data, plataforma e cliente sem Aplicar',async({page})=>{
 await setup(page,[meta,google,second]);
 const errors=captureBrowserErrors(page),requests:Input[]=[];
 await page.route('**/api/marketing/sync/*',route=>{const input=route.request().postDataJSON();requests.push(input);return route.fulfill({json:response(input,input.resourceId==='act_2'?900:200)})});
 await page.goto('/marketing/dashboard');
 await expect(spendCard(page)).toContainText('400,00');
 expect(requests).toHaveLength(2);
 await page.getByRole('button',{name:'Meta Ads',exact:true}).click();
 await expect(spendCard(page)).toContainText('200,00');
 await page.getByLabel('Período do dashboard de marketing').selectOption('yesterday');
 const yesterday=marketingPeriodRange('yesterday');
 await expect.poll(()=>requests.filter(item=>item.from===yesterday.from&&item.to===yesterday.to).length).toBe(1);
 await expect(page.locator('.marketingPeriodNotice')).toHaveCount(0);
 await page.getByLabel('Cliente do dashboard',{exact:true}).selectOption('client-2');
 await expect(spendCard(page)).toContainText('900,00');
 expect(requests.at(-1)?.resourceId).toBe('act_2');
 expect(requests.at(-1)?.from).toBe(yesterday.from);
 await expect(page.getByRole('button',{name:'Aplicar',exact:true})).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('ignora resposta atrasada de um período anterior e agrupa mudanças rápidas',async({page})=>{
 await setup(page);
 const requests:Input[]=[];
 let release=()=>{};
 const held=new Promise<void>(resolve=>{release=resolve});
 await page.route('**/api/marketing/sync/*',async route=>{
  const input=route.request().postDataJSON();requests.push(input);
  const call=requests.length;
  if(call===1)await held;
  await route.fulfill({json:response(input,call===1?100:700)}).catch(()=>{});
 });
 await page.goto('/marketing/dashboard');
 await expect.poll(()=>requests.length).toBe(1);
 const select=page.getByLabel('Período do dashboard de marketing');
 await select.selectOption('last_7');
 await select.selectOption('last_14');
 await select.selectOption('yesterday');
 await expect(spendCard(page)).toContainText('700,00');
 const final=marketingPeriodRange('yesterday');
 expect(requests).toHaveLength(2);
 expect(requests[1].from).toBe(final.from);
 release();
 await page.getByRole('button',{name:'Atualizar agora',exact:true}).click();
 await expect.poll(()=>requests.length).toBe(3);
 await expect(page.getByRole('button',{name:'Atualizar agora',exact:true})).toBeEnabled();
 await expect(spendCard(page)).toContainText('700,00');
});

test('mostra erro sem exibir dados de outra data e permite tentar novamente',async({page})=>{
 await setup(page);
 let fail=false;
 await page.route('**/api/marketing/sync/*',route=>fail?route.fulfill({status:502,json:{error:'Meta temporariamente indisponível'}}):route.fulfill({json:response(route.request().postDataJSON(),500)}));
 await page.goto('/marketing/dashboard');
 await expect(spendCard(page)).toContainText('500,00');
 fail=true;
 await page.getByLabel('Período do dashboard de marketing').selectOption('yesterday');
 await expect(page.locator('.marketingSyncError')).toContainText('temporariamente indisponível');
 await expect(spendCard(page)).toHaveText('—');
 fail=false;
 await page.getByRole('button',{name:'Atualizar agora',exact:true}).click();
 await expect(spendCard(page)).toContainText('500,00');
 await expect(page.locator('.marketingSyncError')).toHaveCount(0);
});

test('atualiza periodicamente com a aba visível',async({page})=>{
 await page.clock.install();
 await setup(page);
 let calls=0;
 await page.route('**/api/marketing/sync/*',route=>{calls++;return route.fulfill({json:response(route.request().postDataJSON(),calls*100)})});
 await page.goto('/marketing/dashboard');
 await expect(spendCard(page)).toContainText('100,00');
 await page.clock.fastForward(5*60*1000);
 await expect(spendCard(page)).toContainText('200,00');
 expect(calls).toBe(2);
});

test('falha parcial não mistura datas e trocar cliente restaura uma plataforma disponível',async({page})=>{
 await setup(page,[meta,google,second]);
 let failGoogle=false;
 await page.route('**/api/marketing/sync/*',route=>{
  const input=route.request().postDataJSON();
  return failGoogle&&input.resourceId==='google_1'?route.fulfill({status:502,json:{error:'Google indisponível'}}):route.fulfill({json:response(input,200)});
 });
 await page.goto('/marketing/dashboard');
 await expect(spendCard(page)).toContainText('400,00');
 failGoogle=true;
 await page.getByLabel('Período do dashboard de marketing').selectOption('yesterday');
 await expect(page.locator('.marketingSyncError')).toContainText('Google indisponível');
 await expect(spendCard(page)).toContainText('200,00');
 await expect(page.locator('.marketingChannelTable article')).toHaveCount(1);
 await expect(page.locator('.marketingPeriodNotice')).toContainText('apenas as contas atualizadas');
 await page.getByRole('button',{name:'Google Ads',exact:true}).click();
 await page.getByLabel('Cliente do dashboard',{exact:true}).selectOption('client-2');
 await expect(page.getByRole('button',{name:'Todas as plataformas',exact:true})).toHaveClass('active');
 await expect(spendCard(page)).toContainText('200,00');
});
