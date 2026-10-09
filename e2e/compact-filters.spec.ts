import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi} from './fixtures';

test.beforeEach(async({page})=>{await mockRoasApi(page)});

for(const config of [
 {route:'/tasks',field:'Prioridade',value:'urgent',chip:'Prioridade: Urgente'},
 {route:'/crm',field:'Origem',value:'Instagram',chip:'Origem: Instagram'},
 {route:'/clients',field:'Filtrar por saúde da carteira',value:'attention',chip:'Saúde: Atenção'},
 {route:'/projects',field:'Prioridade',value:'high',chip:'Prioridade: Alta'},
 {route:'/marketing/experiments',field:'Filtrar por canal',value:'meta_ads',chip:'Canal: Meta Ads'},
]){
 test(`filtros compactos persistem e podem ser removidos em ${config.route}`,async({page},testInfo)=>{
  const errors=captureBrowserErrors(page);
  await page.goto(config.route);
  const filters=page.locator('.compactFilters'),more=filters.getByRole('button',{name:/Mais filtros/}),field=filters.getByLabel(config.field,{exact:true});
  await expect(more).toHaveAttribute('aria-expanded','false');
  await expect(field).toBeHidden();
  await more.click();
  await field.selectOption(config.value);
  const chip=filters.getByRole('button',{name:`Remover filtro ${config.chip}`,exact:true});
  await expect(chip).toBeVisible();
  await field.press('Escape');
  await expect(more).toBeFocused();
  await expect(more).toHaveAttribute('aria-expanded','false');
  await expect(more).toContainText('1');
  await page.waitForLoadState('networkidle');
  await page.reload();
  await expect(chip).toBeVisible();
  await expect(field).toBeHidden();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});
   if(config.route==='/projects')await expect(filters.getByRole('button',{name:/Pausados/})).toBeVisible();
   if(width===1440&&config.route==='/tasks'){
    const bottoms=await filters.locator('.compactFiltersMain').evaluate(element=>Array.from(element.children).map(child=>Math.round(child.getBoundingClientRect().bottom)));
    expect(Math.max(...bottoms)-Math.min(...bottoms)).toBeLessThanOrEqual(1);
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
   await filters.screenshot({path:testInfo.outputPath(`filters-${width}.png`)});
  }
  await chip.click();
  await expect(chip).toHaveCount(0);
  await more.click();
  await field.selectOption(config.value);
  await filters.locator('input[type="search"]').fill(config.route==='/crm'?'Academia':'Teste');
  await expect(filters.getByRole('button',{name:/Remover filtro Busca:/})).toBeVisible();
  await filters.getByRole('button',{name:'Limpar todos',exact:true}).click();
  await expect(filters.locator('input[type="search"]')).toHaveValue('');
  await expect(filters.getByRole('button',{name:/Remover filtro/})).toHaveCount(0);
  await expect(field).toHaveValue(config.route==='/clients'||config.route==='/marketing/experiments'?'all':'');
  expect(errors).toEqual([]);
 });
}

test('a busca do CRM filtra oportunidades e a etiqueta restaura o resultado',async({page})=>{
 await page.goto('/crm');
 const filters=page.locator('.compactFilters');
 await filters.locator('input[type="search"]').fill('Carla');
 await expect(page.locator('.leadCard')).toHaveCount(1);
 await expect(page.locator('.leadCard')).toContainText('Academia Horizonte');
 await filters.getByRole('button',{name:'Remover filtro Busca: Carla'}).click();
 await expect(page.locator('.leadCard')).toHaveCount(2);
});
