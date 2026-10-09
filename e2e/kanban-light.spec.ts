import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';

test('cards leves preservam detalhes ao abrir e têm bordas arredondadas',async({page},testInfo)=>{
 await mockRoasApi(page);
 const errors=captureBrowserErrors(page);
 await page.goto('/tasks');
 const card=page.getByRole('button',{name:'Abrir tarefa Relatório atrasado'});
 await expect(card).toContainText('Admin E2E');
 await expect(card).toContainText('Urgente');
 await expect(card).not.toContainText('Deve aparecer na coluna');
 await expect(card.locator('.taskTags,.taskCardDescription')).toHaveCount(0);
 await card.focus();await page.keyboard.press('Enter');
 const task=page.locator('.enhancedTaskModal');
 await expect(task.locator('textarea[name="description"]')).toHaveValue('Deve aparecer na coluna de atrasadas');
 await task.getByRole('button',{name:'Fechar'}).click();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await card.scrollIntoViewIfNeeded();
  const radii=await card.evaluate(element=>[element,element.closest('.enhancedKanbanColumn')!,element.closest('.enhancedKanbanColumn')!.querySelector('header')!].map(node=>getComputedStyle(node).borderTopLeftRadius));
  expect(radii.every(radius=>parseFloat(radius)>0)).toBe(true);
  await card.screenshot({path:testInfo.outputPath(`task-card-${width}.png`)});
 }
 await page.goto('/crm');
 const lead=page.getByRole('button',{name:'Lead Academia Horizonte',exact:true});
 await expect(lead.locator('.leadValue,.leadServices,.crmLeadQuickActions,select')).toHaveCount(0);
 await lead.click();
 const dialog=page.getByRole('dialog',{name:'Editar oportunidade'});
 await expect(dialog.getByLabel('Contato',{exact:true})).toHaveValue('Carla Lima');
 await expect(dialog.getByRole('button',{name:'Observações de Academia Horizonte'})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Criar tarefa para Academia Horizonte'})).toBeVisible();
 await dialog.getByRole('button',{name:'Fechar'}).click();
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,'editorial_project-1':[{id:'post-light',name:'Post planejado',date:'2099-12-31',headline:'Headline completa',description:'Descrição detalhada',format:'Reels',reference:'',steps:{planning:true,creative:false,copy:false,approval:false,scheduling:false,completed:false},createdAt:'2026-10-01',updatedAt:'2026-10-01'}]}}}));
 await page.goto('/projects/project-1/editorial');
 await page.reload();
 const post=page.getByRole('button',{name:'Editar post Post planejado'});
 await expect(post).not.toContainText('Descrição detalhada');
 await expect(post).not.toContainText('Headline completa');
 await post.click();
 await expect(page.getByRole('dialog').getByLabel('Descrição')).toHaveValue('Descrição detalhada');
 expect(errors).toEqual([]);
});
