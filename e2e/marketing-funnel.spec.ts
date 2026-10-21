import {expect,test} from '@playwright/test';
import {mockRoasApi,testState,captureBrowserErrors} from './fixtures';

for(const width of [1440,390])test(`funis conectados e valores legíveis em ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:950});
 await mockRoasApi(page);
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_marketing_integrations:[{id:'meta-1',clientId:'client-1',provider:'meta_ads',status:'connected',agencyConnectionId:'oauth-meta-e2e',resourceId:'act_1',primaryId:'bm-1',autoSync:true}]}}}));
 const errors=captureBrowserErrors(page);
 await page.goto('/marketing/dashboard');
 const journey=page.locator('.marketingFunnelPanel .marketingJourneyFunnel');
 await expect(journey).toBeVisible();
 await expect(journey.locator('.marketingJourneyFunnelPlot path')).toHaveCount(4);
 await expect(journey.locator('li')).toHaveCount(4);
 await page.getByRole('button',{name:'Adicionar gráfico',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'Adicionar gráfico',exact:true});
 await modal.getByText('Funil',{exact:true}).click();
 await modal.getByRole('button',{name:'Salvar visualização'}).click();
 const custom=page.locator('.marketingWidget .marketingJourneyFunnel');
 await expect(custom).toBeVisible();
 await expect(custom.locator('svg path')).toHaveCount(2);
 for(const funnel of [journey,custom]){
  const dimensions=await funnel.evaluate(element=>({width:element.clientWidth,scroll:element.scrollWidth,plot:element.querySelector('svg')!.getBoundingClientRect().height,legend:element.querySelector('ol')!.getBoundingClientRect().height}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  expect(dimensions.plot).toBe(dimensions.legend);
 }
 expect(errors).toEqual([]);
});
