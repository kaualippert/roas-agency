import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';
import {emptyMarketingMetrics} from '../apps/web/src/marketing-metrics';
import {marketingPeriodRange} from '../apps/web/src/marketing-period';

for(const {width,theme} of [{width:1440,theme:'light'},{width:1024,theme:'dark'},{width:390,theme:'all-black'}]){
 test(`dashboard legível em ${width}px no tema ${theme}`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:950});
  await page.addInitScript(theme=>localStorage.setItem('roas_theme',theme),theme);
  await mockRoasApi(page);
  await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,
   client_marketing_integrations:[{id:'meta-1',clientId:'client-1',provider:'meta_ads',status:'connected',agencyConnectionId:'oauth-meta',resourceId:'act_1',primaryId:'bm-1',resourceName:'Conta Meta Teste',autoSync:true}],
   marketing_dashboard_preferences:[{clientId:'client-1',metricIds:['spend','results','costPerResult','reach','clicks','roas'],widgets:[]}],
  }}}));
  const current=marketingPeriodRange('this_month');
  await page.route('**/api/marketing/sync/*',route=>{
   const {from,to}=route.request().postDataJSON(),isCurrent=from===current.from;
   const metrics={...emptyMarketingMetrics,spend:isCurrent?2450.52:2200,results:isCurrent?84:61,reach:isCurrent?28423:23000,impressions:46832,clicks:1204,conversions:68,conversionValue:8000};
   return route.fulfill({json:{period:{from,to},metrics,topAds:[],performanceRows:[{...metrics,id:'ad-1',name:'Criativo de demonstração',campaignName:'Campanha de aquisição',adSetName:'Público aberto',level:'ad'}],syncedAt:new Date().toISOString()}});
  });
  const errors=captureBrowserErrors(page);
  await page.goto('/marketing/dashboard');
  const cards=page.getByRole('region',{name:'Métricas selecionadas do cliente'});
  await expect(cards.locator('[data-metric="results"] strong')).toHaveText('84');
  const compare=page.getByRole('button',{name:'Comparar com mês anterior'});
  await compare.click();
  await expect(cards.locator('[data-metric="results"] .marketingMetricDelta')).toHaveText('+37,7%');
  await expect(page.getByRole('button',{name:'Todas as plataformas',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('link',{name:'Criar relatório deste cliente'})).toHaveAttribute('href','/marketing/reports?client=client-1&create=1');
  await expect(page.getByText('Criativo de demonstração',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.locator('.marketingOverviewFilters').evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('marketing-overview.png'),fullPage:true,animations:'disabled'});
 });
}
