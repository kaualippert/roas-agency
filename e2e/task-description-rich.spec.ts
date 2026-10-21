import {expect,test,type Locator} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';

const markdown='| Anúncio | Conteúdo | O que queremos testar |\n| --- | --- | --- |\n| **Planejamento do sorriso** | Dra. explicando lentes de resina | Interesse por naturalidade |\n| **Dúvidas sobre lentes** | Indicação, cuidados e manutenção | Pessoas mais informadas |\n| **Como funciona a avaliação** | Atendimento e etapas | Redução da insegurança |\n| **Caso próprio autorizado** | Tratamento realizado | Confiança no trabalho |';
async function paste(editor:Locator,plain:string,html=''){
 await editor.focus();
 await editor.evaluate((element,data)=>{const clipboard=new DataTransfer();clipboard.setData('text/plain',data.plain);if(data.html)clipboard.setData('text/html',data.html);element.dispatchEvent(new ClipboardEvent('paste',{clipboardData:clipboard,bubbles:true,cancelable:true}))},{plain,html});
}
test.beforeEach(async({page})=>{await mockRoasApi(page)});

test('colar tabela do chat mostra células reais e preserva a edição após salvar',async({page},testInfo)=>{
 const errors=captureBrowserErrors(page);
 await page.goto('/tasks');await page.getByRole('button',{name:'Nova tarefa',exact:true}).click();
 const dialog=page.getByRole('dialog'),editor=dialog.getByRole('textbox',{name:'Descrição da tarefa',exact:true});
 await dialog.getByLabel('Título da tarefa').fill('Planejamento de anúncios');
 await paste(editor,markdown);
 await expect(editor.locator('table')).toHaveCount(1);
 await expect(editor.locator('th')).toHaveCount(3);
 await expect(editor.locator('tbody tr')).toHaveCount(4);
 await expect(editor.locator('tbody tr').first().locator('td').first().locator('strong')).toHaveText('Planejamento do sorriso');
 await editor.locator('tbody tr').first().locator('td').nth(1).click();
 await page.keyboard.press('End');await page.keyboard.type(' — atualizado');
 const saved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().endsWith('/api/state/tasks'));
 await dialog.getByRole('button',{name:'Salvar tarefa',exact:true}).click();await saved;
 await page.getByRole('button',{name:'Lista',exact:true}).click();
 await page.locator('tbody tr').filter({hasText:'Planejamento de anúncios'}).click();
 await expect(editor.locator('tbody tr')).toHaveCount(4);
 await expect(editor.locator('table')).toContainText('atualizado');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await editor.scrollIntoViewIfNeeded();
  await editor.screenshot({path:testInfo.outputPath(`description-table-${width}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
 }
 expect(errors).toEqual([]);
});

test('colar HTML preserva tabela e negrito sem trazer scripts, estilos e links perigosos',async({page})=>{
 await page.goto('/tasks');await page.getByRole('button',{name:'Nova tarefa',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'Descrição da tarefa',exact:true});
 await paste(editor,'Conteúdo','<h2 onclick="window.badPaste=1">Plano</h2><table style="background:red"><tr><th>Anúncio</th><th>Conteúdo</th></tr><tr><td><strong>Sorriso</strong></td><td><a href="javascript:alert(1)">Link ruim</a><img src=x onerror="window.badPaste=1"><script>window.badPaste=1</script><br>Naturalidade</td></tr></table>');
 await expect(editor.getByRole('heading',{name:'Plano'})).toBeVisible();
 await expect(editor.locator('table strong')).toHaveText('Sorriso');
 await expect(editor.locator('table')).toContainText('Naturalidade');
 await expect(editor.locator('script,img,[onclick],[onerror],a[href^="javascript:"]')).toHaveCount(0);
 expect(await page.evaluate(()=>Boolean((window as unknown as {badPaste?:boolean}).badPaste))).toBe(false);
});

test('descrições antigas renderizam títulos, listas e tabelas e podem alternar para Markdown',async({page})=>{
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,tasks:[{...testState.tasks[1],description:'## Estratégia\n- Planejar\n- Publicar\n\n'+markdown}]}}}));
 await page.goto('/tasks');await page.getByRole('button',{name:'Abrir tarefa Planejamento futuro',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'Descrição da tarefa',exact:true});
 await expect(editor.getByRole('heading',{name:'Estratégia'})).toBeVisible();
 await expect(editor.locator('ul li')).toHaveCount(2);
 await expect(editor.locator('table')).toHaveCount(1);
 await page.getByRole('button',{name:'Markdown',exact:true}).click();
 const source=page.getByRole('textbox',{name:'Descrição em Markdown',exact:true});
 await expect(source).toContainText('## Estratégia');
 await page.getByRole('button',{name:'Visual',exact:true}).click();
 await expect(editor.locator('table')).toHaveCount(1);
});

test('formatação visual aplica negrito, itálico, tachado, cor e checklist',async({page})=>{
 await page.goto('/tasks');await page.getByRole('button',{name:'Nova tarefa',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'Descrição da tarefa',exact:true}),toolbar=page.getByRole('toolbar',{name:'Formatação da descrição'});
 for(const [label,tag] of [['Negrito','b,strong'],['Itálico','i,em'],['Tachado','strike,s']] as const){
  await editor.fill('Texto selecionado');await editor.selectText();
  await toolbar.getByRole('button',{name:label,exact:true}).click();
  await expect(editor.locator(tag)).toHaveText('Texto selecionado');
 }
 await editor.fill('Alerta');await editor.selectText();
 await toolbar.getByRole('button',{name:'Cor do texto',exact:true}).click();await page.getByRole('button',{name:'Vermelho',exact:true}).click();
 await expect(editor.locator('[color],[style*="color"]')).toHaveCSS('color','rgb(220, 38, 38)');
 await editor.fill('');await toolbar.getByRole('button',{name:'Adicionar checklist',exact:true}).click();
 await editor.getByRole('checkbox').check();
 await expect(page.locator('input[name="description"]')).toHaveValue('- [x] Item');
 await editor.getByRole('checkbox').uncheck();
 await expect(page.locator('input[name="description"]')).toHaveValue('- [ ] Item');
 await editor.fill('Planejar campanha');await editor.selectText();
 await toolbar.getByRole('button',{name:'Adicionar checklist',exact:true}).click();
 await expect(editor.locator('.descriptionChecklistItem')).toHaveText('Planejar campanha');
});

test('tabela tabulada e botão inserir tabela funcionam no modo visual',async({page})=>{
 await page.goto('/tasks');await page.getByRole('button',{name:'Nova tarefa',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'Descrição da tarefa',exact:true});
 await paste(editor,'Anúncio\tConteúdo\nSorriso\tNaturalidade');
 await expect(editor.locator('table')).toHaveCount(1);await expect(editor.locator('th')).toHaveCount(2);
 await editor.fill('');
 await page.getByRole('button',{name:'Inserir tabela',exact:true}).click();
 await expect(editor.locator('th')).toHaveCount(3);
});

test('colar listas aninhadas e negrito redundante preserva estrutura sem expor marcadores',async({page})=>{
 await page.goto('/tasks');await page.getByRole('button',{name:'Nova tarefa',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'Descrição da tarefa',exact:true});
 await paste(editor,'Campanha','<ul><li><strong><span style="font-weight:700">Campanha</span></strong><ul><li>Público</li><li>Criativos</li></ul></li><li>Relatório</li></ul>');
 await expect(editor.locator('ul ul li')).toHaveCount(2);
 await expect(editor.locator('strong')).toHaveText('Campanha');
 await expect(editor).not.toContainText('**');
 await page.getByRole('button',{name:'Markdown',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Descrição em Markdown',exact:true})).toHaveValue(/  - Público/);
 await page.getByRole('button',{name:'Visual',exact:true}).click();
 await expect(editor.locator('ul ul li')).toHaveCount(2);
});

test('estilo de título e Tab entre células mantêm o foco no editor',async({page})=>{
 await page.goto('/tasks');await page.getByRole('button',{name:'Nova tarefa',exact:true}).click();
 const editor=page.getByRole('textbox',{name:'Descrição da tarefa',exact:true});
 await editor.fill('Objetivo da campanha');await editor.selectText();
 await page.getByLabel('Estilo do bloco',{exact:true}).selectOption('h2');
 await expect(editor.getByRole('heading',{name:'Objetivo da campanha'})).toBeVisible();
 await editor.fill('');
 await page.getByRole('button',{name:'Inserir tabela',exact:true}).click();
 const cell=editor.locator('tbody td').first();await cell.click();await page.keyboard.press('Tab');await page.keyboard.type('Segunda célula');
 await expect(editor.locator('tbody td').nth(1)).toContainText('Segunda célula');
});
