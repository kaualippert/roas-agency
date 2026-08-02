import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi} from './fixtures';

test.beforeEach(async({page})=>{
 await mockRoasApi(page);
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
 const box=await modal.boundingBox();
 expect(box?.width).toBeLessThanOrEqual(412);
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
