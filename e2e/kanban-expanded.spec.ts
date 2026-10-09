import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';

const post={id:'post-1',name:'Conteúdo Teste',date:'2099-12-31',headline:'Headline do conteúdo',description:'Descrição editorial detalhada',format:'Reels',reference:'https://example.test/referencia',steps:{planning:true,creative:false,copy:false,approval:false,scheduling:false,completed:false},createdAt:'2026-09-01T12:00:00Z',updatedAt:'2026-09-01T12:00:00Z'};
const experiment={id:'experiment-1',title:'Teste de criativo',clientId:'client-1',channel:'meta_ads',campaignName:'Campanha Teste',hypothesis:'Um novo criativo deve melhorar os resultados',metricKey:'results',direction:'increase',baselineValue:10,targetValue:20,currentValue:12,spendLimit:500,spentValue:100,ownerId:'member-admin',dueDate:'2099-12-31',status:'running',learning:'',createdAt:'2026-09-01T12:00:00Z',updatedAt:'2026-09-01T12:00:00Z'};

test.beforeEach(async({page})=>{
 await mockRoasApi(page);
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,'editorial_project-1':[post],marketing_experiments:[experiment]}}}));
 await page.addInitScript(()=>{
  for(const key of ['roas_kanban_tasks_density','roas_kanban_crm_density','roas_kanban_editorial_density_project-1','roas_kanban_experiments_density']){
   if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify('compact'));
  }
 });
});

for(const config of [
 {route:'/tasks',selector:'.enhancedTaskCard',field:'Projeto'},
 {route:'/crm',selector:'.leadCard',field:'Valor estimado'},
 {route:'/projects/project-1/editorial',selector:'.editorialColumn article',field:'Produção'},
 {route:'/marketing/experiments',selector:'.marketingExperimentCard',field:'Atual / meta'},
]){
 test(`compacto e expandido mostram informações diferentes em ${config.route}`,async({page},testInfo)=>{
  const errors=captureBrowserErrors(page);
  await page.goto(config.route);
  const card=page.locator(config.selector).first(),details=card.locator('.kanbanCardDetails');
  await expect(card).toBeVisible();
  await expect(details).toHaveCount(0);
  const compactHeight=(await card.boundingBox())!.height;
  await page.getByRole('button',{name:'Expandir cards',exact:true}).click();
  await expect(details.locator('dt').filter({hasText:config.field})).toBeVisible();
  expect((await card.boundingBox())!.height).toBeGreaterThan(compactHeight+30);
  await page.reload();
  await expect(details).toBeVisible();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});
   await card.scrollIntoViewIfNeeded();
   await card.screenshot({path:testInfo.outputPath(`expanded-${width}.png`)});
   const fits=await details.evaluate(element=>Array.from(element.querySelectorAll('dd')).every(item=>item.scrollWidth<=item.clientWidth+1));
   expect(fits).toBeTruthy();
  }
  await page.getByRole('button',{name:/^(Minimizar|Compactar) cards$/}).click();
  await expect(details).toHaveCount(0);
  await page.reload();
  await expect(details).toHaveCount(0);
  expect(errors).toEqual([]);
 });
}

test('expandir informações mantém o limite de cinco cards e a abertura pelo teclado',async({page})=>{
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,tasks:Array.from({length:6},(_,index)=>({...testState.tasks[1],id:`task-${index}`,title:`Tarefa ${index}`}))}}}));
 await page.goto('/tasks');
 const column=page.locator('.enhancedKanbanColumn.todo');
 await expect(column.locator('.enhancedTaskCard')).toHaveCount(5);
 await page.getByRole('button',{name:'Expandir cards',exact:true}).click();
 await expect(column.locator('.kanbanCardDetails')).toHaveCount(5);
 await column.getByRole('button',{name:/Ver mais/}).click();
 await expect(column.locator('.kanbanCardDetails')).toHaveCount(6);
 const card=column.locator('.enhancedTaskCard').first();
 await card.focus();
 await card.press('Enter');
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByLabel('Título da tarefa')).toHaveValue('Tarefa 0');
});
