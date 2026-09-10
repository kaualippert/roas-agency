import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi} from './fixtures';

test.beforeEach(async({page})=>{
 await mockRoasApi(page);
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
 await expect(page.getByText('Pipeline comercial')).toBeVisible();
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
 await expect(page.getByRole('heading',{name:'Contas certas para cada cliente'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Configurar Meta'}).click();
 await expect(page.locator('.modal').getByText('Cliente Teste',{exact:true})).toBeVisible();
 await expect(page.locator('.modal').getByRole('button',{name:'Salvar vínculo'})).toBeVisible();
});
