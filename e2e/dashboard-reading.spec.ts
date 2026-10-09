import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';

test.beforeEach(async({page})=>{await mockRoasApi(page)});

test('dashboard separa resultados, operação e financeiro e explica o recebimento',async({page})=>{
 const errors=captureBrowserErrors(page);
 await page.goto('/dashboard');
 for(const group of ['Resultados','Operação','Financeiro']){
  const section=page.locator('.dashboardKpiGroup').filter({has:page.getByRole('heading',{name:group,exact:true})});
  await expect(section.locator('article')).toHaveCount(2);
 }
 const received=page.locator('.dashboardKpis article').filter({hasText:'Receita recebida'});
 await expect(received.getByText('Neste período',{exact:true})).toBeVisible();
 const current=page.locator('.dashboardKpis article').filter({hasText:'Receita recorrente'});
 await expect(current.getByText('Estado atual',{exact:true})).toBeVisible();
 const value=await current.locator('strong').innerText();
 await page.locator('.dashboardToolbar select').selectOption('month');
 await expect(current.locator('strong')).toHaveText(value);
 const help=received.getByRole('button',{name:'Sobre Receita recebida'});
 await help.hover();
 await expect(page.getByRole('tooltip')).toContainText('receivedAt');
 await page.mouse.move(0,0);
 await help.focus();
 await expect(page.getByRole('tooltip')).toBeVisible();
 await help.press('Escape');
 await expect(page.getByRole('tooltip')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('dashboard se adapta ao desktop e celular sem cortar cartões',async({page},testInfo)=>{
 await page.goto('/dashboard');
 await expect(page.locator('.dashboardMetricGroups')).toBeVisible();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('.dashboardMetricGroups').screenshot({path:testInfo.outputPath(`dashboard-${width}.png`)});
 }
});

test('marketing identifica categorias, período sincronizado e métricas explicadas',async({page})=>{
 const errors=captureBrowserErrors(page);
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,
  client_marketing_integrations:[{id:'integration-1',clientId:'client-1',provider:'meta_ads',status:'connected',resourceId:'act_123',resourceName:'Conta Teste'}],
  marketing_metrics:[{id:'snapshot-1',integrationId:'integration-1',clientId:'client-1',provider:'meta_ads',periodFrom:'2026-09-01',periodTo:'2026-09-14',syncedAt:'2026-09-14T12:00:00Z',impressions:10000,reach:8000,clicks:400,spend:1000,results:20,conversions:20,conversionValue:4000,roas:4,topAds:[],performanceRows:[]}]
 }}}));
 await page.goto('/marketing/dashboard');
 const cards=page.locator('.marketingSelectableMetrics article');
 await expect(cards.first()).toBeVisible();
 await expect(cards.first().getByText('Neste período',{exact:true})).toBeVisible();
 await expect(cards.first().locator('.marketingMetricContext')).toContainText(/Financeiro|Resultados|Operação/);
 await cards.first().getByRole('button').hover();
 await expect(page.getByRole('tooltip')).toContainText('Período dos dados sincronizados');
 await page.getByLabel('Período do dashboard de marketing',{exact:true}).selectOption('yesterday');
 await expect(page.locator('.marketingPeriodNotice')).toContainText('ainda não foi aplicado');
 expect(errors).toEqual([]);
});
