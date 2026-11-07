import {expect,test} from '@playwright/test';
import {mockRoasApi,testState} from './fixtures';
import {marketingPeriodRange} from '../apps/web/src/marketing-period';

const account={id:'meta-1',clientId:'client-1',provider:'meta_ads',status:'connected',agencyConnectionId:'oauth-meta',resourceId:'act_123',primaryId:'bm-1',resourceName:'Conta de teste'};
test('consulta os recortes sob demanda para a conta e o período do dashboard',async({page})=>{
 await page.setViewportSize({width:390,height:844});await mockRoasApi(page);
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_marketing_integrations:[account]}}}));
 const requested:string[]=[];
 await page.route('**/api/marketing/breakdowns/meta_ads',route=>{
  const {dimension,integrationId,clientId,from,to}=route.request().postDataJSON();
  expect({integrationId,clientId,from,to}).toEqual({integrationId:account.id,clientId:account.clientId,...marketingPeriodRange('last_7')});
  requested.push(dimension);
  const values:Record<string,string[]>={age:['25-34'],gender:['female'],region:['São Paulo'],placement:['instagram','story']};
  return route.fulfill({json:{dimension,integrationId,period:{from,to},truncated:false,rows:[{id:dimension,values:values[dimension],currency:'BRL',spend:200,impressions:3000,reach:2000,clicks:100,leads:20,purchases:null,conversations:5}]}});
 });
 await page.goto('/marketing/dashboard');
 await page.getByLabel('Período do dashboard de marketing').selectOption('last_7');
 const open=page.getByRole('button',{name:'Detalhamento Meta Ads',exact:true});
 await expect(open).toBeVisible();expect(requested).toEqual([]);
 await open.click();
 const dialog=page.getByRole('dialog',{name:'Detalhamento Meta Ads'});
 await expect(dialog.getByRole('rowheader',{name:'25-34'})).toBeVisible();
 await expect(dialog.getByRole('row',{name:/25-34/})).toContainText('10,00');
 for(const [dimension,value] of [['Gênero','Feminino'],['Região','São Paulo'],['Posicionamento','Instagram · Stories']]){
  await dialog.getByRole('button',{name:dimension,exact:true}).click();
  await expect(dialog.getByRole('rowheader',{name:value,exact:true})).toBeVisible();
 }
 await dialog.getByLabel('Ação de resultado').selectOption('conversations');
 await expect(dialog.getByRole('columnheader',{name:'Conversas iniciadas'})).toBeVisible();
 await expect(dialog.getByRole('row',{name:/Instagram/})).toContainText('40,00');
 expect([...new Set(requested)]).toEqual(['age','gender','region','placement']);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(open).toBeFocused();
});

test('mostra falha e oferece nova tentativa sem exibir dados antigos',async({page})=>{
 await mockRoasApi(page);
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_marketing_integrations:[account]}}}));
 let fail=true;
 await page.route('**/api/marketing/breakdowns/meta_ads',route=>{
  const {dimension,integrationId,from,to}=route.request().postDataJSON();
  return fail?route.fulfill({status:502,json:{error:'A Meta não pôde atender a consulta.'}}):route.fulfill({json:{dimension,integrationId,period:{from,to},rows:[],truncated:false}});
 });
 await page.goto('/marketing/dashboard');await page.getByRole('button',{name:'Detalhamento Meta Ads',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Detalhamento Meta Ads'});
 await expect(dialog.getByRole('alert')).toContainText('A Meta não pôde atender');
 fail=false;await dialog.getByRole('button',{name:'Tentar novamente'}).click();
 await expect(dialog.getByRole('status')).toContainText('não retornou dados');
});
