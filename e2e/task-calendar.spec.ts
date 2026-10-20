import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';

test.beforeEach(async({page})=>{
 await page.clock.setFixedTime(new Date('2026-10-20T12:00:00-03:00'));
 await mockRoasApi(page);
 await page.goto('/tasks');
 await page.getByRole('button',{name:'Calendário',exact:true}).click();
});

test('cria tarefa pelo dia e salva o prazo correto sem sair do calendário',async({page})=>{
 const errors=captureBrowserErrors(page);
 await page.getByRole('button',{name:'Adicionar tarefa em 23/10/2026',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Criar tarefa'});
 await expect(dialog.getByLabel('Prazo',{exact:true})).toHaveValue('2026-10-23');
 await dialog.getByLabel('Título da tarefa').fill('Captação externa na sexta');
 const saved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().endsWith('/api/state/tasks'));
 await dialog.getByRole('button',{name:'Salvar tarefa',exact:true}).click();
 const response=await saved,input=response.request().postDataJSON();
 expect(input.value.find((task:{title:string})=>task.title==='Captação externa na sexta').dueDate).toBe('2026-10-23');
 await expect(dialog).toBeHidden();
 const cell=page.locator('.calendarDays>[data-date="2026-10-23"]');
 await expect(cell.getByRole('button',{name:'Captação externa na sexta',exact:true})).toBeVisible();
 await cell.getByRole('button',{name:'Captação externa na sexta',exact:true}).click();
 await expect(page.getByRole('dialog').getByLabel('Prazo',{exact:true})).toHaveValue('2026-10-23');
 expect(errors).toEqual([]);
});

test('navega meses e oferece criação apenas em dias válidos, inclusive sem tarefas',async({page})=>{
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,tasks:[{...testState.tasks[0],dueDate:''}]}}}));
 await page.reload();
 await page.getByRole('button',{name:'Próximo mês',exact:true}).click();
 await expect(page.locator('.enhancedCalendar>header h3')).toHaveText('novembro de 2026');
 await expect(page.locator('.calendarAddTask')).toHaveCount(30);
 await expect(page.locator('.calendarDays>.outside button')).toHaveCount(0);
 await page.getByRole('button',{name:'Adicionar tarefa em 06/11/2026',exact:true}).click();
 await expect(page.getByRole('dialog').getByLabel('Prazo',{exact:true})).toHaveValue('2026-11-06');
 await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
 await page.getByRole('button',{name:'Mês anterior',exact:true}).click();
 await expect(page.locator('.calendarAddTask')).toHaveCount(31);
});

test('cancelar não reaproveita o dia na criação geral e o botão funciona pelo teclado',async({page})=>{
 const add=page.getByRole('button',{name:'Adicionar tarefa em 31/10/2026',exact:true});
 await add.focus();await add.press('Enter');
 await expect(page.getByRole('dialog').getByLabel('Prazo',{exact:true})).toHaveValue('2026-10-31');
 await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
 await page.getByRole('button',{name:'Nova tarefa',exact:true}).click();
 await expect(page.getByRole('dialog').getByLabel('Prazo',{exact:true})).toHaveValue('');
});

test('botões discretos continuam visíveis e utilizáveis em desktop e celular',async({page},testInfo)=>{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  const add=page.getByRole('button',{name:'Adicionar tarefa em 23/10/2026',exact:true});
  await add.scrollIntoViewIfNeeded();
  await expect(add).toBeVisible();
  const box=await add.boundingBox();expect(box!.width).toBeLessThanOrEqual(32);expect(box!.height).toBeGreaterThanOrEqual(26);
  await page.locator('.enhancedCalendar').screenshot({path:testInfo.outputPath(`calendar-add-${width}.png`)});
  await add.click();
  await expect(page.getByRole('dialog').getByLabel('Prazo',{exact:true})).toHaveValue('2026-10-23');
  await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
 }
});

test('criação pelos botões do kanban continua abrindo sem data predefinida',async({page})=>{
 const errors=captureBrowserErrors(page);
 await page.getByRole('button',{name:'Kanban',exact:true}).click();
 const column=page.locator('.enhancedKanbanColumn.todo');
 await column.locator('header button').click();
 await expect(page.getByRole('dialog').getByLabel('Prazo',{exact:true})).toHaveValue('');
 await page.getByRole('dialog').getByRole('button',{name:'Cancelar',exact:true}).click();
 await column.getByRole('button',{name:'Adicionar tarefa',exact:true}).click();
 await expect(page.getByRole('dialog').getByLabel('Prazo',{exact:true})).toHaveValue('');
 expect(errors).toEqual([]);
});
