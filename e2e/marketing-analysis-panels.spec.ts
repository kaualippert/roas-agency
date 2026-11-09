import {expect,test} from '@playwright/test';
import {mockRoasApi,testState} from './fixtures';

test('personaliza os painéis separadamente, mantém ordem e restaura o padrão',async({page})=>{
 await mockRoasApi(page);
 let preferences:unknown=[];
 const integration={id:'meta-1',clientId:'client-1',provider:'meta_ads',status:'connected',agencyConnectionId:'oauth-meta',resourceId:'act_123',primaryId:'bm-1'};
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_marketing_integrations:[integration],marketing_dashboard_preferences:preferences}}}));
 await page.route('**/api/state/marketing_dashboard_preferences',route=>{
  preferences=route.request().postDataJSON().value;
  return route.fulfill({json:{value:preferences}});
 });
 const save=async()=>{
  const response=page.waitForResponse(res=>res.url().endsWith('/state/marketing_dashboard_preferences')&&res.request().method()==='PUT');
  await page.getByRole('button',{name:'Salvar métricas',exact:true}).click();await response;
 };
 await page.setViewportSize({width:390,height:844});
 await page.goto('/marketing/dashboard');
 const journey=page.locator('.marketingFunnelPanel'),efficiency=page.locator('.marketingEfficiencyPanel');
 await journey.getByRole('button',{name:'Personalizar Jornada de resultados'}).click();
 let editor=page.getByRole('dialog',{name:'Jornada de resultados',exact:true});
 await editor.getByLabel('Métrica 2',{exact:true}).selectOption('leads');
 await editor.getByRole('button',{name:'Mover métrica 2 para cima'}).click();
 expect(await editor.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);
 await save();
 await expect(journey.locator('li').first()).toContainText('Leads');
 await expect(efficiency).toContainText('Custo por conversão');
 await efficiency.getByRole('button',{name:'Personalizar Eficiência da mídia'}).click();
 editor=page.getByRole('dialog',{name:'Eficiência da mídia',exact:true});
 await editor.getByLabel('Métrica 4',{exact:true}).selectOption('costPerResult');
 await editor.getByRole('button',{name:'Adicionar métrica'}).click();
 await editor.getByLabel('Métrica 5',{exact:true}).selectOption('roas');
 await save();
 await page.reload();
 await expect(journey.locator('li').first()).toContainText('Leads');
 await expect(efficiency).toContainText('Custo por resultado');
 await expect(efficiency).toContainText('ROAS');
 await efficiency.getByRole('button',{name:'Personalizar Eficiência da mídia'}).click();
 await editor.getByRole('button',{name:'Restaurar padrão'}).click();
 await save();
 await expect(efficiency).toContainText('Custo por conversão');
 await expect(efficiency).not.toContainText('ROAS');
 await expect(journey.locator('li').first()).toContainText('Leads');
});
