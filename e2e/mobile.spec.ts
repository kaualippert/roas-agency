import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';

test.beforeEach(async({page})=>{
 await mockRoasApi(page);
});

test('abre detalhes dos cards leves por toque sem expor descrições no kanban',async({page})=>{
 const errors=captureBrowserErrors(page);
 await page.goto('/tasks');
 const card=page.getByRole('button',{name:'Abrir tarefa Relatório atrasado'});
 await expect(card).toContainText('Admin E2E');
 await expect(card).toContainText('Urgente');
 await expect(card.locator('.taskCardDescription')).toHaveCount(0);
 await card.tap();
 await expect(page.locator('.enhancedTaskModal textarea[name="description"]')).toHaveValue('Deve aparecer na coluna de atrasadas');
 await page.locator('.enhancedTaskModal').getByRole('button',{name:'Fechar'}).tap();
 await page.goto('/crm');
 await page.getByRole('button',{name:'Lead Academia Horizonte',exact:true}).tap();
 await page.getByRole('dialog',{name:'Editar oportunidade'}).getByRole('button',{name:'Observações de Academia Horizonte'}).tap();
 await expect(page.getByRole('dialog',{name:'Observações'})).toBeVisible();
 expect(errors).toEqual([]);
});

test('cria ramos por toque e foca o mapa mental no celular',async({page})=>{
 const errors=captureBrowserErrors(page);
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_mind_maps:[{
  id:'map-mobile',clientId:'client-1',title:'Mapa do cliente',description:'',createdAt:'2026-10-01',updatedAt:'2026-10-01',nodes:[
   {id:'root',parentId:null,text:'Campanha mobile',color:'#5b36f2',x:540,y:310},
   {id:'branch',parentId:'root',text:'Público',color:'#2563eb',x:130,y:140},
  ],
 }]}}}));
 await page.goto('/clients/client-1');
 await page.getByRole('button',{name:'Mapas mentais'}).tap();
 await page.getByRole('button',{name:'Enquadrar mapa',exact:true}).tap();
 const zoom=page.getByTitle('Restaurar zoom para 100%');
 await expect(zoom).not.toHaveText('100%');
 await page.getByRole('button',{name:'Focar tópico'}).tap();
 await expect(zoom).toHaveText('100%');
 const root=page.locator('.mindMapNode.root');
 await root.tap();
 await root.getByRole('button',{name:'Criar ramo right'}).tap();
 await page.getByLabel('Nome do novo ramo').fill('Follow-up mobile');
 const saved=page.waitForResponse(response=>response.url().endsWith('/api/state/client_mind_maps')&&response.request().method()==='PUT');
 await page.getByRole('button',{name:'Criar tópico',exact:true}).tap();
 await saved;
 await expect(page.getByLabel('Texto do tópico selecionado')).toHaveValue('Follow-up mobile');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
 expect(errors).toEqual([]);
});

test('ações do pipeline do CRM não se sobrepõem no telefone',async({page})=>{
 await page.goto('/crm');
 const actions=page.locator('.crmPageBoard .kanbanViewActions');
 const compact=actions.getByRole('button',{name:'Compactar cards'});
 const fullscreen=actions.getByRole('button',{name:'Tela cheia de pipeline comercial'});
 const [counterBox,compactBox,fullscreenBox]=await Promise.all([actions.locator('small').boundingBox(),compact.boundingBox(),fullscreen.boundingBox()]);
 expect(counterBox&&compactBox&&fullscreenBox).toBeTruthy();
 expect(counterBox!.x+counterBox!.width).toBeLessThanOrEqual(compactBox!.x+1);
 expect(compactBox!.x+compactBox!.width).toBeLessThanOrEqual(fullscreenBox!.x+1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});

test('edita post editorial pelo toque no celular',async({page})=>{
 await page.goto('/projects/project-1/editorial');
 await page.getByRole('button',{name:'Novo conteúdo'}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Nome do post').fill('Post mobile');
 const saved=page.waitForResponse(response=>response.url().endsWith('/api/state/editorial_project-1')&&response.request().method()==='PUT');
 await dialog.getByRole('button',{name:'Salvar conteúdo'}).click();
 await saved;
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width+1);
 await page.locator('.editorialKanban').getByRole('button',{name:'Editar post Post mobile'}).tap();
 await expect(dialog.getByLabel('Nome do post')).toHaveValue('Post mobile');
 const width=await dialog.evaluate(element=>element.scrollWidth-element.clientWidth);
 expect(width).toBeLessThanOrEqual(1);
 await dialog.getByLabel('Criativo',{exact:true}).check();
 await dialog.getByRole('button',{name:'Salvar conteúdo'}).click();
 await expect(dialog).toHaveCount(0);
});

test('menu mobile abre, navega e fecha sem estourar a largura da página',async({page})=>{
 const errors=captureBrowserErrors(page);
 await page.goto('/dashboard');
 const sidebar=page.locator('#app-sidebar');
 await expect(sidebar).toHaveClass(/closed/);
 await page.getByRole('button',{name:'Abrir menu'}).click();
 await expect(sidebar).toHaveClass(/open/);
 await sidebar.getByText('Tarefas').click();
 await expect(page).toHaveURL(/\/tasks$/);
 await expect(sidebar).toHaveClass(/closed/);
 await expect(page.locator('.headTitle h1')).toHaveText('Tarefas');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 expect(errors).toEqual([]);
});

test('formulário de nova tarefa permanece utilizável no telefone',async({page})=>{
 await page.goto('/tasks');
 await page.getByRole('button',{name:/Nova tarefa/}).click();
 const modal=page.locator('.enhancedTaskModal');
 await expect(modal).toBeVisible();
 await expect(modal.getByRole('textbox',{name:/T.tulo/})).toBeVisible();
 await expect(modal.getByText('Admin E2E')).toBeVisible();
 const description=modal.locator('.taskDescriptionSection textarea');
 await description.scrollIntoViewIfNeeded();
 await expect(description).toBeVisible();
 const descriptionBox=await description.boundingBox();
 expect(descriptionBox?.height||0).toBeGreaterThan(220);
 const box=await modal.boundingBox();
 expect(box?.width).toBeLessThanOrEqual(412);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});

test('pipeline do CRM usa navegação horizontal e ações acessíveis no telefone',async({page})=>{
 const errors=captureBrowserErrors(page);
 await page.goto('/crm');
 await expect(page.getByText('Pipeline comercial',{exact:true})).toBeVisible();
 const pipeline=page.locator('.crmColumns');
 await expect(pipeline).toBeVisible();
 await expect(page.locator('[data-lead-id="lead-active"] select')).toBeVisible();
 await page.getByRole('button',{name:/Reunião/}).click();
 const bodyOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(bodyOverflow).toBeLessThanOrEqual(1);
 await page.getByRole('button',{name:'Novo lead'}).click();
 const modal=page.getByRole('dialog',{name:'Adicionar oportunidade'});
 await expect(modal).toBeVisible();
 const box=await modal.boundingBox();
 expect(box?.width).toBeLessThanOrEqual(412);
 expect(errors).toEqual([]);
});

test('processos do cliente e checklist permanecem utilizáveis no telefone',async({page})=>{
 const errors=captureBrowserErrors(page);
 await page.goto('/clients/client-1');
 await page.getByRole('button',{name:'Processos'}).click();
 await expect(page.getByRole('button',{name:'Novo processo'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
 await page.getByRole('button',{name:'Novo processo'}).click();
 const modal=page.getByRole('dialog',{name:'Novo processo'});
 await expect(modal.getByLabel('Nome do processo')).toBeVisible();
 await expect(modal.getByRole('textbox',{name:'Etapa 1',exact:true})).toBeVisible();
 const box=await modal.boundingBox();
 expect(box?.width).toBeLessThanOrEqual(412);
 expect(errors).toEqual([]);
});

test('integrações de marca permanecem legíveis e configuráveis no telefone',async({page})=>{
 await page.goto('/marketing/integrations');
 await expect(page.getByRole('heading',{name:'Conectar contas aos clientes'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Configurar Meta'}).click();
 await expect(page.locator('.modal').getByText('Cliente Teste',{exact:true})).toBeVisible();
 await expect(page.locator('.modal').getByRole('button',{name:'Salvar vínculo'})).toBeVisible();
});
