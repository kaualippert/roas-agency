import {expect,test} from '@playwright/test';
import {mockRoasApi,testState} from './fixtures';
import {marketingPeriodRange} from '../apps/web/src/marketing-period';

test('adiciona e mantém pizza de idade e gênero, com impressões do período selecionado',async({page})=>{
 await mockRoasApi(page);
 const account={id:'meta-1',clientId:'client-1',provider:'meta_ads',status:'connected',agencyConnectionId:'oauth-meta',resourceId:'act_123',primaryId:'bm-1'};
 let preferences:unknown=[];
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_marketing_integrations:[account],marketing_dashboard_preferences:preferences}}}));
 await page.route('**/api/state/marketing_dashboard_preferences',route=>{
  preferences=route.request().postDataJSON().value;
  return route.fulfill({json:{value:preferences}});
 });
 await page.route('**/api/marketing/breakdowns/meta_ads',route=>{
  const {integrationId,clientId,dimension,from,to}=route.request().postDataJSON();
  expect(integrationId).toBe(account.id);expect(clientId).toBe(account.clientId);
  const groups=dimension==='age'?[['25-34',75],['35-44',25]]:[['female',60],['male',40]];
  return route.fulfill({json:{integrationId,dimension,period:{from,to},truncated:false,rows:groups.map(([group,impressions])=>({id:group,values:[group],impressions}))}});
 });
 await page.goto('/marketing/dashboard');
 await page.getByRole('button',{name:'Adicionar gráfico',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Adicionar gráfico'});
 await dialog.getByText('Pizza de idade e gênero',{exact:true}).click();
 const saved=page.waitForResponse(response=>response.url().endsWith('/state/marketing_dashboard_preferences')&&response.request().method()==='PUT');
 await dialog.getByRole('button',{name:'Salvar visualização'}).click();await saved;
 const chart=page.locator('.marketingWidget').filter({has:page.getByRole('heading',{name:'Idade e gênero',exact:true})});
 await expect(chart).toContainText('25-34');await expect(chart).toContainText('75%');
 await chart.getByRole('button',{name:'Gênero',exact:true}).click();
 await expect(chart).toContainText('Feminino');await expect(chart).toContainText('60%');await expect(chart).not.toContainText('25-34');
 const request=page.waitForRequest(request=>request.url().endsWith('/breakdowns/meta_ads')&&request.postDataJSON().from===marketingPeriodRange('last_7').from);
 await page.getByLabel('Período do dashboard de marketing').selectOption('last_7');
 expect((await request).postDataJSON()).toMatchObject({dimension:'gender',...marketingPeriodRange('last_7')});
 await page.reload();await expect(chart).toContainText('25-34');
});
