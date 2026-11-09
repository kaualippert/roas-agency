import {expect,test} from '@playwright/test';
import {mockRoasApi,testState} from './fixtures';
import {marketingPeriodRange} from '../apps/web/src/marketing-period';

test('fixa dois indicadores do mesmo recorte, atualiza o período e remove um cartão salvo',async({page})=>{
 await mockRoasApi(page);
 const account={id:'meta-1',clientId:'client-1',provider:'meta_ads',status:'connected',agencyConnectionId:'oauth-meta',resourceId:'act_123',primaryId:'bm-1'};
 let preferences:unknown=[];
 const fromLast7=marketingPeriodRange('last_7').from;
 let last7Requests=0;
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_marketing_integrations:[account],marketing_dashboard_preferences:preferences}}}));
 await page.route('**/api/state/marketing_dashboard_preferences',route=>{preferences=route.request().postDataJSON().value;return route.fulfill({json:{value:preferences}})});
 await page.route('**/api/marketing/breakdowns/meta_ads',route=>{
  const {integrationId,clientId,dimension,from,to}=route.request().postDataJSON();
  expect({integrationId,clientId,dimension}).toEqual({integrationId:account.id,clientId:account.clientId,dimension:'age'});
  if(from===fromLast7)last7Requests++;
  return route.fulfill({json:{integrationId,dimension,period:{from,to},truncated:false,rows:[{id:'25-34',values:['25-34'],impressions:from===fromLast7?1240:3400,spend:100,currency:'BRL',leads:10}]}});
 });
 await page.goto('/marketing/dashboard');
 await page.getByRole('button',{name:'Detalhamento Meta Ads',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Detalhamento Meta Ads'});
 await dialog.getByRole('button',{name:'Adicionar ao dashboard',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Adicionado ao dashboard',exact:true})).toBeDisabled();
 await dialog.getByLabel('Métrica do cartão').selectOption('costPerLead');
 const saved=page.waitForResponse(response=>response.url().endsWith('/state/marketing_dashboard_preferences')&&response.request().method()==='PUT'&&response.request().postDataJSON().value[0].pinnedBreakdowns.length===2);
 await dialog.getByRole('button',{name:'Adicionar ao dashboard',exact:true}).click();await saved;
 await dialog.getByRole('button',{name:'Fechar detalhamento'}).click();
 const impressions=page.getByRole('article',{name:'Impressões · 25-34'}),cost=page.getByRole('article',{name:'Custo por lead · 25-34'});
 await expect(impressions.locator('strong')).toHaveText('3.400');await expect(cost.locator('strong')).toContainText('10,00');
 await page.getByLabel('Período do dashboard de marketing').selectOption('last_7');
 await expect(impressions.locator('strong')).toHaveText('1.240');expect(last7Requests).toBe(1);
 await page.reload();await expect(impressions.locator('strong')).toHaveText('1.240');
 const removed=page.waitForResponse(response=>response.url().endsWith('/state/marketing_dashboard_preferences')&&response.request().method()==='PUT');
 await impressions.getByRole('button',{name:'Remover Impressões · 25-34'}).click();await removed;
 await expect(impressions).toHaveCount(0);await expect(cost).toBeVisible();
});
