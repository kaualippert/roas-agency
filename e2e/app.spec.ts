import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';

test('filtros de tarefas ficam juntos e a ordenação por criação persiste',async({page},testInfo)=>{
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,tasks:testState.tasks.map((task,index)=>({...task,createdAt:index?'2026-07-01T12:00:00Z':'2026-01-01T12:00:00Z'}))}}}));
 await page.goto('/tasks');
 await page.getByRole('button',{name:'Lista',exact:true}).click();
 const order=page.getByLabel('Ordenar tarefas',{exact:true});
 await order.selectOption('newest');
 await expect(page.locator('.enhancedTaskTable tbody tr').first()).toContainText('Planejamento futuro');
 await order.selectOption('oldest');
 await expect(page.locator('.enhancedTaskTable tbody tr').first()).toContainText('Relatório atrasado');
 await page.goto('/dashboard');
 await page.goto('/tasks');
 await expect(order).toHaveValue('oldest');
 await order.selectOption('title_asc');
 await expect(page.locator('.enhancedTaskTable tbody tr').first()).toContainText('Planejamento futuro');
 await order.selectOption('title_desc');
 await expect(page.locator('.enhancedTaskTable tbody tr').first()).toContainText('Relatório atrasado');
 await expect(page.locator('.advancedTaskFilters')).toHaveCount(0);
 await page.getByLabel('Cliente',{exact:true}).selectOption('client-1');
 await page.getByLabel('Prazo',{exact:true}).selectOption('overdue');
 await expect(page.locator('.enhancedTaskTable tbody tr')).toHaveCount(1);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await expect(page.locator('.compactFiltersMain')).toBeVisible();
  await expect(page.getByRole('button',{name:/Mais filtros/})).toHaveAttribute('aria-expanded','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('.compactFilters').screenshot({path:testInfo.outputPath(`task-filters-${width}.png`)});
 }
});

test('editar cliente carrega seleções ao abrir a central diretamente e salva centavos',async({page},testInfo)=>{
 await page.goto('/clients/client-1');
 await page.getByRole('button',{name:'Editar cadastro'}).click();
 const dialog=page.getByRole('dialog',{name:'Atualizar cadastro'});
 const social=dialog.getByRole('checkbox',{name:'Social Media'});
 const site=dialog.getByRole('checkbox',{name:'Landing Page'});
 await social.check();
 await site.check();
 await site.uncheck();
 await expect(dialog.locator('input[name="responsibleIds"]')).toBeChecked();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await dialog.locator('.clientServicesField').scrollIntoViewIfNeeded();
  const checkbox=await social.boundingBox();
  expect(checkbox!.width).toBeLessThanOrEqual(20);
  expect(checkbox!.height).toBeLessThanOrEqual(20);
  const label=await social.locator('..').boundingBox();
  expect(checkbox!.x).toBeGreaterThanOrEqual(label!.x);
  expect(checkbox!.x+checkbox!.width).toBeLessThanOrEqual(label!.x+label!.width);
  await dialog.locator('.clientServicesField').screenshot({path:testInfo.outputPath(`client-services-${width}.png`)});
 }
 await dialog.getByLabel('Receita mensal',{exact:true}).fill('3500.75');
 const saved=page.waitForRequest(request=>request.url().endsWith('/api/state/clients')&&request.method()==='PUT');
 await dialog.getByRole('button',{name:'Salvar cliente'}).click();
 const client=(await saved).postDataJSON().value.find((item:{id:string})=>item.id==='client-1');
 expect(client.monthlyRevenue).toBe(3500.75);
 expect(client.serviceIds).toEqual(['service-social']);
 expect(client.responsibleIds).toEqual(['member-admin']);
 await expect(dialog).toBeHidden();
 await page.reload();
 await page.getByRole('button',{name:'Editar cadastro'}).click();
 await expect(social).toBeChecked();
 await expect(site).not.toBeChecked();
 await expect(dialog.getByLabel('Receita mensal',{exact:true})).toHaveValue('3500.75');
 await page.keyboard.press('Escape');
 await expect(dialog).toBeHidden();
 await page.goto('/clients');
 await page.getByRole('button',{name:'Novo cliente'}).click();
 const create=page.getByRole('dialog',{name:'Cadastrar cliente'});
 await expect(create.getByRole('checkbox',{name:'Social Media'})).not.toBeChecked();
 const responsibleBox=await create.locator('input[name="responsibleIds"]').boundingBox();
 expect(responsibleBox!.height).toBeLessThanOrEqual(20);
 await create.getByRole('button',{name:'Cancelar'}).click();
 await expect(create).toBeHidden();
});

test('abre edição de tarefa sem esconder o formulário na tela cheia',async({page})=>{
 await page.goto('/tasks');
 await page.getByRole('button',{name:'Tela cheia de tarefas'}).click();
 await expect(page.locator('.taskWorkspace')).toHaveClass(/fullscreenSurfaceActive/);
 await page.locator('.enhancedTaskCard').filter({hasText:'Planejamento futuro'}).click();
 await expect(page.locator('.taskWorkspace')).not.toHaveClass(/fullscreenSurfaceActive/);
 const modal=page.locator('.enhancedTaskModal');
 await expect(modal).toBeVisible();
 await expect(modal.locator('input[name="title"]')).toHaveValue('Planejamento futuro');
 await modal.locator('input[name="title"]').fill('Planejamento revisado');
});

test('cobertura de marketing considera somente clientes ativos',async({page})=>{
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,
  clients:[...testState.clients,{...testState.clients[0],id:'inactive',status:'inactive'}],
  client_marketing_integrations:[{id:'old',clientId:'inactive',provider:'meta_ads',status:'connected'},{id:'deleted',clientId:'deleted',provider:'google_ads',status:'connected'}],
 }}}));
 await page.goto('/marketing/dashboard');
 await expect(page.getByRole('heading',{name:'Conecte a primeira marca'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Abrir integrações'})).toBeVisible();
});

test.beforeEach(async({page})=>{
 await mockRoasApi(page);
});

test('menu reduzido não corta títulos de seção e mantém nomes acessíveis',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('roas_sidebar_open','false'));
 await page.goto('/dashboard');
 const sidebar=page.locator('#app-sidebar');
 await expect(sidebar).toHaveClass(/closed/);
 await expect(sidebar.locator('.navGroup>span')).toBeHidden();
 const tasksLink=sidebar.getByRole('link',{name:'Tarefas'});
 await expect(tasksLink).toHaveAttribute('title','Tarefas');
 await expect(tasksLink).toHaveAttribute('aria-label','Tarefas');
 await expect(sidebar.locator('.navGroup[aria-label="MARKETING"]')).toBeVisible();
 const itemBox=await tasksLink.boundingBox(),sidebarBox=await sidebar.boundingBox();
 expect(itemBox&&sidebarBox).toBeTruthy();
 expect(itemBox!.x).toBeGreaterThan(sidebarBox!.x);
 expect(itemBox!.x+itemBox!.width).toBeLessThanOrEqual(sidebarBox!.x+sidebarBox!.width);
});

test('exibe a identidade configurada no centro do carregamento',async({page})=>{
 const logo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
 await page.addInitScript(brand=>localStorage.setItem('roas_loading_brand',JSON.stringify(brand)),{agencyName:'Agência E2E',logoDataUrl:logo,logoScale:100});
 await page.route('**/api/state',async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.fallback()});
 await page.goto('/dashboard');
 const loader=page.locator('.authLoadingContent');
 await expect(loader.getByAltText('Logo Agência E2E')).toBeVisible();
 await expect(loader.getByText('Agência E2E',{exact:true})).toBeVisible();
 const box=await loader.boundingBox(),viewport=page.viewportSize();
 expect(Math.abs((box?.x||0)+(box?.width||0)/2-(viewport?.width||0)/2)).toBeLessThan(3);
 await expect(page.locator('.headTitle h1')).toHaveText('Dashboard');
});

test('mantém os últimos filtros ao navegar entre as páginas',async({page})=>{
 await page.goto('/dashboard');
 await page.getByLabel('Período').selectOption('month');
 await page.goto('/clients');
 await page.goto('/dashboard');
 await expect(page.getByLabel('Período')).toHaveValue('month');

 await page.goto('/crm');
 await page.getByRole('button',{name:'Ganhos'}).click();
 await page.goto('/projects');
 await page.goto('/crm');
 await expect(page.getByRole('button',{name:'Ganhos'})).toHaveClass(/active/);

 await page.goto('/tasks');
 const search=page.getByPlaceholder('Buscar tarefa, cliente ou projeto...');
 await search.fill('Planejamento futuro');
 await page.goto('/dashboard');
 await page.goto('/tasks');
 await expect(page.getByPlaceholder('Buscar tarefa, cliente ou projeto...')).toHaveValue('Planejamento futuro');
});

test('mantém cards compactos nos kanbans de CRM e tarefas',async({page})=>{
 await page.goto('/crm');
 const boardActions=page.locator('.crmPageBoard .kanbanViewActions');
 const fullscreen=boardActions.getByRole('button',{name:'Tela cheia de pipeline comercial'});
 await expect(fullscreen.locator('span')).toHaveCount(0);
 const [counter,compactButton,fullscreenButton]=await Promise.all([
  boardActions.locator('small').boundingBox(),
  boardActions.getByRole('button',{name:'Compactar cards'}).boundingBox(),
  fullscreen.boundingBox(),
 ]);
 expect(counter&&compactButton&&fullscreenButton).toBeTruthy();
 expect(counter!.x+counter!.width).toBeLessThanOrEqual(compactButton!.x+1);
 expect(compactButton!.x+compactButton!.width).toBeLessThanOrEqual(fullscreenButton!.x+1);
 await page.getByRole('button',{name:'Compactar cards'}).click();
 await expect(page.locator('.leadCard').first()).toHaveClass(/compact/);
 await expect(page.getByRole('button',{name:'Expandir cards'})).toBeVisible();
 await page.goto('/tasks');
 await page.getByRole('button',{name:'Minimizar cards'}).click();
 await expect(page.locator('.enhancedTaskCard').first()).toHaveClass(/compact/);
 await page.goto('/crm');
 await expect(page.locator('.leadCard').first()).toHaveClass(/compact/);
});

test('registra observações e follow-ups ligados ao lead do CRM',async({page},testInfo)=>{
 await page.addInitScript(()=>{
  localStorage.setItem('roas_kanban_crm_density',JSON.stringify('compact'));
  localStorage.setItem('roas_sidebar_open','false');
 });
 await page.goto('/crm');
 const leadCard=page.locator('[data-lead-id="lead-active"]');
 await leadCard.click();
 await page.getByRole('dialog',{name:'Editar oportunidade'}).getByRole('button',{name:'Observações de Academia Horizonte'}).click();
 const notes=page.getByRole('dialog',{name:'Observações'});
 await notes.getByLabel('Nova observação').fill('Cliente pediu retorno depois da reunião interna.');
 const noteSaved=page.waitForResponse(response=>response.url().endsWith('/api/state/prospects')&&response.request().method()==='PUT');
 await notes.getByRole('button',{name:'Salvar observação'}).click();
 await noteSaved;
 await leadCard.click();
 await expect(page.getByRole('dialog',{name:'Editar oportunidade'}).getByRole('button',{name:'Observações de Academia Horizonte'})).toContainText('1');

 await page.getByRole('dialog',{name:'Editar oportunidade'}).getByRole('button',{name:'Criar tarefa para Academia Horizonte'}).click();
 const followUp=page.getByRole('dialog',{name:'Criar tarefa'});
 await followUp.getByLabel('Título da tarefa').fill('Agendar retorno comercial');
 const due=new Date();due.setDate(due.getDate()+1);
 await followUp.getByLabel('Prazo').fill([due.getFullYear(),String(due.getMonth()+1).padStart(2,'0'),String(due.getDate()).padStart(2,'0')].join('-'));
 const taskSaved=page.waitForResponse(response=>response.url().endsWith('/api/state/tasks')&&response.request().method()==='PUT');
 await followUp.getByRole('button',{name:'Criar tarefa'}).click();
 await taskSaved;
 await expect(followUp).toBeHidden();
 await expect(leadCard.locator('time')).not.toHaveText('Sem prazo');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await leadCard.scrollIntoViewIfNeeded();
  const fits=await leadCard.locator('.kanbanCardMeta').evaluate(meta=>Array.from(meta.children).every(child=>{const bounds=meta.getBoundingClientRect(),rect=child.getBoundingClientRect();return rect.left>=bounds.left&&rect.right<=bounds.right+1}));
  expect(fits).toBe(true);
 }
 await page.setViewportSize({width:1440,height:900});
 await leadCard.screenshot({path:testInfo.outputPath('crm-lead-card.png')});
 await page.goto('/tasks');
 const taskCard=page.locator('.enhancedTaskCard').filter({hasText:'Agendar retorno comercial'});
 await expect(taskCard).toBeVisible();
 await taskCard.click();
 await expect(page.locator('.taskLeadContext')).toContainText('Academia Horizonte');
});

test('abre a tarefa da lista com informações antes da descrição ampla',async({page})=>{
 await page.goto('/tasks');
 await page.getByRole('button',{name:'Lista'}).click();
 const row=page.locator('.enhancedTaskTable tbody tr').filter({hasText:'Planejamento futuro'});
 await expect(row.getByText('Descrição',{exact:true})).toBeVisible();
 await row.click();
 const modal=page.locator('.enhancedTaskModal');
 await expect(modal.getByRole('heading',{name:'Visualizar e editar tarefa'})).toBeVisible();
 await expect(modal.locator('input[name="title"]')).toHaveValue('Planejamento futuro');
 await expect(modal.getByRole('heading',{name:'Informações da tarefa'})).toBeVisible();
 await expect(modal.getByRole('heading',{name:'Descrição'})).toBeVisible();
 const information=await modal.locator('.taskInformationSection').boundingBox();
 const description=await modal.locator('.taskDescriptionSection').boundingBox();
 const textarea=await modal.locator('textarea[name="description"]').boundingBox();
 expect((information?.y||0)).toBeLessThan(description?.y||0);
 expect(textarea?.height||0).toBeGreaterThan(220);
 const preview=modal.locator('.taskDescriptionPreview');
 await expect(preview.locator('.formattedTaskDescription')).toBeVisible();
 await preview.getByRole('button',{name:/Minimizar/}).click();
 await expect(preview.getByRole('button')).toHaveAttribute('aria-expanded','false');
 await expect(preview.locator('.formattedTaskDescription')).toHaveCount(0);
 await modal.getByRole('button',{name:'Fechar'}).click();
 await row.click();
 const reopened=page.locator('.enhancedTaskModal .taskDescriptionPreview');
 await expect(reopened.getByRole('button',{name:/Expandir/})).toBeVisible();
 await reopened.getByRole('button',{name:/Expandir/}).click();
 await expect(reopened.locator('.formattedTaskDescription')).toBeVisible();
});

test('cadastra e edita a descrição de um conteúdo da linha editorial',async({page})=>{
 await page.goto('/projects/project-1/editorial');
 await page.getByRole('button',{name:'Novo conteúdo'}).click();
 const dialog=page.getByRole('dialog',{name:'Novo conteúdo'});
 await dialog.getByLabel('Nome do post').fill('Campanha de lançamento');
 await dialog.getByLabel('Headline').fill('Uma nova fase começa agora');
 await dialog.getByLabel('Descrição').fill('Apresentar o conceito da campanha, seus benefícios e a chamada para ação.');
 const created=page.waitForResponse(response=>response.url().endsWith('/api/state/editorial_project-1')&&response.request().method()==='PUT');
 await dialog.getByRole('button',{name:'Salvar conteúdo'}).click();
 await created;
 await expect(page.locator('.editorialContentCell').filter({hasText:'Campanha de lançamento'})).toContainText('Apresentar o conceito da campanha');
 await expect(page.locator('.editorialPostDescription')).toContainText('seus benefícios e a chamada para ação');
 await page.locator('.editorialContentCell').getByRole('button',{name:'Campanha de lançamento'}).click();
 const editor=page.getByRole('dialog',{name:'Editar conteúdo'});
 await expect(editor.getByLabel('Descrição')).toHaveValue('Apresentar o conceito da campanha, seus benefícios e a chamada para ação.');
 await editor.getByLabel('Headline').fill('');
 await editor.getByLabel('Planejamento',{exact:true}).check();
 await editor.getByLabel('Descrição').fill('Briefing revisado');
 const saved=page.waitForResponse(response=>response.url().endsWith('/api/state/editorial_project-1')&&response.request().method()==='PUT');
 await editor.getByRole('button',{name:'Salvar conteúdo'}).click();
 await saved;
 await page.reload();
 await expect(page.locator('.editorialColumn.in_progress')).toContainText('Campanha de lançamento');
 await page.getByRole('button',{name:'Tela cheia de Kanban editorial'}).click();
 await page.locator('.editorialKanban').getByRole('button',{name:'Editar post Campanha de lançamento'}).click();
 await expect(editor.getByLabel('Descrição')).toHaveValue('Briefing revisado');
 await expect(editor.getByLabel('Headline')).toHaveValue('');
 await expect(editor.getByLabel('Planejamento',{exact:true})).toBeChecked();
 await expect(page.locator('.fullscreenSurfaceActive')).toHaveCount(0);
 await editor.getByLabel('Descrição').fill('Alteração não salva');
 page.once('dialog',dialog=>dialog.dismiss());
 await editor.getByRole('button',{name:'Cancelar',exact:true}).click();
 await expect(editor).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());
 await editor.getByRole('button',{name:'Cancelar',exact:true}).click();
 await page.locator('.editorialCalendar').getByRole('button',{name:'Editar post Campanha de lançamento'}).focus();
 await page.keyboard.press('Enter');
 await expect(editor.getByLabel('Descrição')).toHaveValue('Briefing revisado');
 page.once('dialog',dialog=>dialog.accept());
 const deleted=page.waitForResponse(response=>response.url().endsWith('/api/state/editorial_project-1')&&response.request().method()==='PUT');
 await editor.getByRole('button',{name:'Excluir conteúdo'}).click();
 await deleted;
 await page.reload();
 await expect(page.locator('.editorialContentCell')).toHaveCount(0);
 await expect(page.locator('.editorialKanban article')).toHaveCount(0);
});

test('carrega o dashboard, a identidade da agência e os arquivos principais',async({page})=>{
 const errors=captureBrowserErrors(page);
 await page.goto('/dashboard');
 await expect(page.locator('.headTitle h1')).toHaveText('Dashboard');
 await expect(page.getByText('Visão geral da agência')).toBeVisible();
 await expect(page.locator('.logo b')).toHaveText('Agência E2E');
 await expect(page.locator('.dashboardKpis .dataSource.period')).toHaveText('No período');
 await expect(page.locator('.dashboardKpis .dataSource.current')).toHaveCount(4);
 const frame=page.locator('.agencyLogoFrame');
 await expect(frame).toBeVisible();
 const size=await frame.boundingBox();
 expect(size?.width).toBe(32);
 expect(size?.height).toBe(32);
 expect(errors).toEqual([]);
});

test('aplica menu claro, tema all black e logo preenchendo o quadro',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('roas_theme','light'));
 await page.goto('/dashboard');
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 expect(await page.locator('#app-sidebar').evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgb(255, 255, 255)');
 const logo=page.locator('.agencyLogo');
 expect(await logo.evaluate(element=>getComputedStyle(element).objectFit)).toBe('cover');
 expect(await logo.evaluate(element=>getComputedStyle(element).padding)).toBe('0px');
 await page.goto('/settings');
 await page.getByRole('button',{name:/Aparência/}).click();
 await page.getByRole('button',{name:/All Black/}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(page.locator('html')).toHaveAttribute('data-theme-variant','all-black');
 expect(await page.locator('body').evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgb(0, 0, 0)');
});

test('abre o perfil e navega para configurações sem perder a sessão',async({page})=>{
 await page.goto('/dashboard');
 await page.getByTitle('Abrir menu do perfil').click();
 const settings=page.getByRole('menuitem',{name:/Configura/});
 await expect(settings).toBeVisible();
 await settings.click();
 await expect(page).toHaveURL(/\/settings$/);
 await expect(page.locator('.headTitle h1')).toHaveText(/Configura/);
 await expect(page.locator('.loginPanel')).toHaveCount(0);
});

test('aplica o filtro de tarefas atrasadas usando a regra real de prazo',async({page})=>{
 await page.goto('/tasks');
 await expect(page.locator('.headTitle h1')).toHaveText('Tarefas');
 const statusFilter=page.locator('.taskFilterSelect').filter({hasText:'Status'}).locator('select');
 await statusFilter.selectOption('overdue');
 await expect(page.getByText('Relatório atrasado')).toBeVisible();
 await expect(page.getByText('Planejamento futuro')).toHaveCount(0);
 await expect(page.locator('.compactFiltersResult')).toContainText('1');
});

test('filtra, movimenta e protege oportunidades no CRM',async({page})=>{
 await page.goto('/crm');
 await expect(page.locator('.headTitle h1')).toHaveText('CRM');
 await expect(page.getByText('Academia Horizonte')).toBeVisible();
 await page.getByRole('button',{name:'Em aberto'}).click();
 await expect(page.getByText('Academia Horizonte')).toBeVisible();
 await expect(page.getByText('Cliente Convertido')).toHaveCount(0);
 const activeCard=page.locator('[data-lead-id="lead-active"]');
 await activeCard.focus();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog',{name:'Editar oportunidade'})).toBeVisible();
 await page.getByRole('dialog',{name:'Editar oportunidade'}).getByLabel('Etapa',{exact:true}).selectOption('Reunião');
 await page.getByRole('dialog',{name:'Editar oportunidade'}).getByRole('button',{name:'Salvar alterações'}).click();
 await expect(page.locator('[data-crm-stage="Reunião"]')).toContainText('Academia Horizonte');
 await page.getByRole('button',{name:'Todos'}).click();
 await page.getByRole('button',{name:'Lead Cliente Convertido',exact:true}).click();
 await expect(page.getByText('Lead convertido em cliente')).toBeVisible();
 await expect(page.getByRole('button',{name:'Excluir lead'})).toBeDisabled();
 await expect(page.locator('.leadEditModal select[name="stage"]')).toBeDisabled();
});

test('cria lead com serviço mensal e valor automático',async({page})=>{
 await page.goto('/crm');
 await page.getByRole('button',{name:'Novo lead'}).click();
 const dialog=page.getByRole('dialog',{name:'Adicionar oportunidade'});
 const serviceGrid=dialog.locator('.crmServicesSelect');
 await expect(serviceGrid).toHaveCSS('display','grid');
 const checkbox=serviceGrid.getByRole('checkbox').first();
 const checkboxBox=await checkbox.boundingBox();
 expect(checkboxBox?.width).toBeLessThanOrEqual(20);
 expect(checkboxBox?.height).toBeLessThanOrEqual(20);
 await page.getByLabel('Empresa').fill('Clínica Aurora');
 await page.getByLabel('Contato',{exact:true}).fill('Marina');
 await page.getByRole('dialog',{name:'Adicionar oportunidade'}).getByRole('checkbox',{name:/Social Media/}).check();
 await expect(page.locator('.leadEstimateTotal')).toContainText('R$ 2.500,00');
 await page.getByRole('button',{name:'Adicionar ao CRM'}).click();
 await expect(page.getByText('Clínica Aurora')).toBeVisible();
});

test('cria um processo do cliente e acompanha o checklist',async({page})=>{
 await page.goto('/clients/client-1');
 await page.getByRole('button',{name:'Processos'}).click();
 await expect(page.getByText('Nenhum processo criado')).toBeVisible();
 await page.getByRole('button',{name:'Novo processo'}).click();
 const dialog=page.getByRole('dialog',{name:'Novo processo'});
 await dialog.getByLabel('Nome do processo').fill('Aprovação mensal');
 await dialog.getByLabel('Descrição').fill('Fluxo de aprovação dos conteúdos do mês.');
 await dialog.getByRole('textbox',{name:'Etapa 1',exact:true}).fill('Enviar planejamento');
 await dialog.getByRole('button',{name:'Adicionar etapa'}).click();
 await dialog.getByRole('textbox',{name:'Etapa 2',exact:true}).fill('Receber aprovação');
 const saved=page.waitForResponse(response=>response.url().endsWith('/api/state/client_processes')&&response.request().method()==='PUT');
 await dialog.getByRole('button',{name:'Criar processo'}).click();
 await saved;
 const process=page.locator('.clientProcessCard').filter({hasText:'Aprovação mensal'});
 await expect(process).toContainText('0%');
 const firstCheckSaved=page.waitForResponse(response=>response.url().endsWith('/api/state/client_processes')&&response.request().method()==='PUT');
 await process.getByRole('checkbox',{name:'Enviar planejamento'}).check();
 await firstCheckSaved;
 await expect(process).toContainText('50%');
 const secondCheckSaved=page.waitForResponse(response=>response.url().endsWith('/api/state/client_processes')&&response.request().method()==='PUT');
 await process.getByRole('checkbox',{name:'Receber aprovação'}).check();
 await secondCheckSaved;
 await expect(process).toContainText('100%');
 await expect(process).toContainText('Concluído');
 await page.reload();
 await page.getByRole('button',{name:'Processos'}).click();
 await expect(page.locator('.clientProcessCard').filter({hasText:'Aprovação mensal'})).toContainText('100%');
});

test('configura a meta comercial no CRM e compartilha o velocímetro com o dashboard',async({page})=>{
 await page.goto('/crm');
 const crmGoal=page.locator('.salesGoalCard');
 await expect(crmGoal).toHaveCSS('display','grid');
 await expect(crmGoal.locator('.salesGoalGauge')).toHaveCSS('max-width','320px');
 await crmGoal.getByRole('button',{name:'Configurar meta'}).click();
 const dialog=page.getByRole('dialog',{name:'Configurar meta mensal'});
 await dialog.getByRole('radio',{name:/Quantidade/}).check();
 await dialog.getByLabel('Quantidade de negócios').fill('5');
 const saved=page.waitForResponse(response=>response.url().endsWith('/api/state/crm_goal')&&response.request().method()==='PUT');
 await dialog.getByRole('button',{name:'Salvar meta'}).click();
 await saved;
 await expect(crmGoal).toContainText('Meta por negócios fechados');
 await expect(crmGoal).toContainText('5 negócios');
 await expect(crmGoal.locator('.salesGoalArc')).toHaveCSS('opacity','0');
 page.once('dialog',dialog=>dialog.accept());
 const resetSaved=page.waitForResponse(response=>response.url().endsWith('/api/state/crm_goal')&&response.request().method()==='PUT');
 await crmGoal.getByRole('button',{name:'Redefinir meta'}).click();
 await resetSaved;
 await expect(crmGoal.locator('.salesGoalGaugeValue strong')).toHaveText('0%');
 await crmGoal.getByRole('button',{name:'Editar meta'}).click();
 await dialog.getByLabel('Quantidade de negócios').fill('3');
 const edited=page.waitForResponse(response=>response.url().endsWith('/api/state/crm_goal')&&response.request().method()==='PUT');
 await dialog.getByRole('button',{name:'Salvar meta'}).click();
 await edited;
 await expect(crmGoal).toContainText('3 negócios');
 await expect(crmGoal.locator('.salesGoalGaugeValue strong')).toHaveText('0%');
 await page.goto('/dashboard');
 const dashboardGoal=page.locator('.dashboardSalesGoal');
 await expect(dashboardGoal).toContainText('Meta por negócios fechados');
 await expect(dashboardGoal).toContainText('3 negócios');
 await expect(dashboardGoal.locator('.salesGoalGaugeValue strong')).toHaveText('0%');
 await expect(dashboardGoal.locator('.salesGoalArc')).toHaveCSS('opacity','0');
});

test('configura uma integração por marca e apresenta a cobertura no dashboard de marketing',async({page})=>{
 await page.goto('/marketing/integrations');
 await expect(page.locator('.headTitle h1')).toHaveText('Integrações de marca');
 await expect(page.getByRole('heading',{name:'Conectar contas aos clientes'})).toBeVisible();
 await page.getByRole('button',{name:'Configurar Meta'}).click();
 const modal=page.locator('.modal');
 await modal.getByLabel('Portfólio empresarial (BM)').selectOption('bm-123');
 await modal.getByLabel('Conta de anúncios').selectOption('act_123');
 const persisted=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/client_marketing_integrations'));
 await modal.getByRole('button',{name:'Salvar vínculo'}).click();
 await persisted;
 await expect(page.getByText('BM Cliente Teste')).toBeVisible();
 const metricsSaved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/marketing_metrics'));
 await page.getByRole('button',{name:'Sincronizar agora'}).click();
 await metricsSaved;
 await page.goto('/marketing/dashboard');
 await expect(page.locator('.headTitle h1')).toHaveText('Marketing');
 await expect(page.getByLabel('Cliente do dashboard')).toHaveValue('client-1');
 await expect(page.getByRole('region',{name:'Métricas selecionadas do cliente'})).toContainText('4x');
 await expect(page.getByRole('heading',{name:'Desempenho detalhado'})).toBeVisible();
 await expect(page.getByText('Criativo campeão')).toBeVisible();
 const campaignViewSaved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/marketing_dashboard_preferences'));
 await page.getByRole('button',{name:'Campanhas'}).click();
 await campaignViewSaved;
 await expect(page.getByText('Captação Setembro',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:'Configurar tabela'}).click();
 const tableDialog=page.getByRole('dialog',{name:'Configurar tabela de desempenho'});
 await tableDialog.getByText('Conjuntos',{exact:true}).click();
 const tableSaved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/marketing_dashboard_preferences'));
 await tableDialog.getByRole('button',{name:'Salvar tabela'}).click();
 await tableSaved;
 await expect(page.getByText('Público semelhante',{exact:true}).first()).toBeVisible();
 const adViewSaved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/marketing_dashboard_preferences'));
 await page.getByRole('button',{name:'Anúncios',exact:true}).click();
 await adViewSaved;
 await page.getByLabel('Período do dashboard de marketing').selectOption('last_7');
 const periodRequest=page.waitForRequest(request=>request.method()==='POST'&&request.url().includes('/api/marketing/sync/meta_ads'));
 await page.getByRole('button',{name:'Aplicar'}).click();
 const requested=await periodRequest,input=requested.postDataJSON() as {from:string;to:string};
 expect((new Date(`${input.to}T12:00:00`).getTime()-new Date(`${input.from}T12:00:00`).getTime())/86_400_000).toBe(6);
 await expect(page.getByText('Criativo campeão')).toBeVisible();
 await page.getByRole('button',{name:'Adicionar gráfico'}).click();
 const widgetDialog=page.getByRole('dialog',{name:'Adicionar gráfico'});
 await widgetDialog.getByLabel('Título').fill('Visão de investimento e resultados');
 await widgetDialog.getByText('Funil',{exact:true}).click();
 const widgetSaved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/marketing_dashboard_preferences'));
 await widgetDialog.getByRole('button',{name:'Salvar visualização'}).click();
 await widgetSaved;
 await expect(page.getByRole('heading',{name:'Visão de investimento e resultados'})).toBeVisible();
 await page.getByRole('button',{name:'Personalizar métricas'}).click();
 const metricsDialog=page.getByRole('dialog',{name:'Personalizar métricas'});
 await metricsDialog.getByLabel('Mover Investimento para baixo').click();
 await expect(metricsDialog.getByText('Resultados',{exact:true})).toBeVisible();
 await expect(metricsDialog.getByText('Custo por resultado',{exact:true})).toBeVisible();
 await metricsDialog.getByText('Resultados',{exact:true}).click();
 await metricsDialog.getByText('Custo por resultado',{exact:true}).click();
 await expect(metricsDialog.getByText('Vídeo',{exact:true})).toBeVisible();
 await metricsDialog.getByLabel('Buscar métrica').fill('ThruPlay');
 await expect(metricsDialog.getByText('Custo por ThruPlay',{exact:true})).toBeVisible();
 await metricsDialog.getByLabel('Buscar métrica').fill('');
 await metricsDialog.getByText('CPC (todos)',{exact:true}).click();
 const preferenceSaved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/marketing_dashboard_preferences'));
 await metricsDialog.getByRole('button',{name:'Salvar dashboard'}).click();
 await preferenceSaved;
 await expect(page.getByRole('region',{name:'Métricas selecionadas do cliente'})).toContainText('Resultados');
 await expect(page.getByRole('region',{name:'Métricas selecionadas do cliente'})).toContainText('R$ 51,44');
 await expect(page.getByRole('region',{name:'Métricas selecionadas do cliente'})).toContainText('CPC (todos)');
 await expect(page.getByRole('heading',{name:'Visão de investimento e resultados'})).toBeVisible();
 await page.getByRole('link',{name:'Criar relatório deste cliente'}).click();
 const reportDialog=page.locator('.marketingReportModal');
 await expect(reportDialog.getByLabel('Cliente integrado')).toHaveValue('client-1');
 await reportDialog.getByLabel('Nome do relatório').fill('Performance Meta — Cliente Teste');
 await reportDialog.getByLabel('Resumo executivo').fill('O investimento gerou resultados consistentes no período.');
 await reportDialog.getByLabel('Próximos passos').fill('Escalar os melhores criativos e acompanhar o custo por resultado.');
 const reportSaved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/reports'));
 await reportDialog.getByRole('button',{name:'Criar relatório'}).click();
 await reportSaved;
 await expect(page.getByText('Performance Meta — Cliente Teste')).toBeVisible();
 await page.getByTitle('Visualizar').first().click();
 const reportPreview=page.locator('.reportClientDocument');
 await expect(reportPreview.getByRole('heading',{name:'Performance Meta — Cliente Teste'})).toBeVisible();
 await expect(reportPreview.getByText('O investimento gerou resultados consistentes no período.')).toBeVisible();
 await expect(reportPreview.getByText('Escalar os melhores criativos e acompanhar o custo por resultado.')).toBeVisible();
 await page.locator('.reportPreviewToolbar').getByRole('button',{name:'Compartilhar'}).click();
 const shareDialog=page.getByRole('dialog',{name:'Compartilhar relatório'});
 await expect(shareDialog.getByRole('button',{name:/Enviar pelo WhatsApp/})).toBeVisible();
 await expect(shareDialog.getByRole('button',{name:/Enviar por e-mail/})).toBeVisible();
 await expect(shareDialog.getByRole('button',{name:/Salvar ou imprimir PDF/})).toBeVisible();
});

test('consulta versões anteriores no histórico de alterações',async({page})=>{
 await page.route('**/api/audit**',route=>route.fulfill({json:{page:1,hasMore:false,items:[{
  id:'audit-1',eventId:'audit-event-1',entityType:'clients',entityId:'client-1',entityLabel:'Cliente Teste',action:'updated',areas:['general','marketing','finance'],clientId:'client-1',actorId:'member-admin',actorName:'Admin E2E',actorEmail:'admin@roas-e2e.test',occurredAt:'2026-09-20T14:30:00.000Z',
  changes:[{key:'email',label:'E-mail',before:'anterior@example.test',after:'novo@example.test'},{key:'monthlyRevenue',label:'Receita mensal',before:2500,after:3500}],
  before:{companyName:'Cliente Teste',email:'anterior@example.test',monthlyRevenue:2500,status:'active'},after:{companyName:'Cliente Teste',email:'novo@example.test',monthlyRevenue:3500,status:'active'},
 }]}}));
 await page.goto('/history?client=client-1');
 await expect(page.locator('.headTitle h1')).toHaveText('Histórico de alterações');
 await expect(page.getByText('Admin E2E').first()).toBeVisible();
 await expect(page.getByText('E-mail',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Consultar versões: Cliente Teste'}).click();
 const dialog=page.getByRole('dialog',{name:'Versões de Cliente Teste'});
 await expect(dialog.getByText('anterior@example.test')).toBeVisible();
 await expect(dialog.getByText('novo@example.test')).toBeVisible();
 await expect(dialog.getByText('R$ 2.500,00')).toBeVisible();
 await expect(dialog.getByText('R$ 3.500,00')).toBeVisible();
 await expect(dialog.getByText('Admin E2E',{exact:true})).toBeVisible();
});

test('cria, acompanha e registra o aprendizado de um experimento de marketing',async({page})=>{
 await page.goto('/marketing/experiments');
 await expect(page.locator('.headTitle h1')).toHaveText('Experimentos');
 await page.getByRole('button',{name:'Novo experimento'}).click();
 const dialog=page.getByRole('dialog',{name:'Novo experimento'});
 await dialog.getByLabel('Nome do experimento').fill('Teste de anúncio com depoimento');
 await dialog.getByLabel('Cliente').selectOption('client-1');
 await dialog.getByLabel('Canal').selectOption('meta_ads');
 await dialog.getByLabel('Hipótese').fill('Um criativo com depoimento reduz o custo por lead para este cliente.');
 await dialog.getByLabel('Métrica principal').selectOption('costPerLead');
 await dialog.getByLabel('O resultado deve').selectOption('decrease');
 await dialog.getByLabel('Linha de base').fill('50');
 await dialog.getByLabel('Meta',{exact:true}).fill('30');
 await dialog.getByLabel('Valor observado').fill('40');
 await dialog.getByLabel('Limite de investimento (R$)').fill('600');
 await dialog.getByLabel('Investimento realizado (R$)').fill('180');
 await dialog.getByLabel('Responsável').selectOption('member-admin');
 const created=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().endsWith('/api/state/marketing_experiments'));
 await dialog.getByRole('button',{name:'Criar experimento'}).click();
 await created;
 const card=page.locator('.marketingExperimentCard').filter({hasText:'Teste de anúncio com depoimento'});
 await expect(card).not.toContainText('Hipótese');
 await card.getByRole('button',{name:'Abrir experimento Teste de anúncio com depoimento'}).click();
 const editor=page.getByRole('dialog',{name:'Editar experimento'});
 await expect(editor.getByLabel('Valor observado')).toHaveValue('40');
 await expect(editor.getByLabel('Hipótese')).toHaveValue('Um criativo com depoimento reduz o custo por lead para este cliente.');
 await editor.getByLabel('Etapa atual').selectOption('running');
 const moved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().endsWith('/api/state/marketing_experiments'));
 await editor.getByRole('button',{name:'Salvar alterações'}).click();
 await moved;
 await expect(page.locator('.marketingExperimentColumn.running').getByText('Teste de anúncio com depoimento')).toBeVisible();
 await card.getByRole('button',{name:'Abrir experimento Teste de anúncio com depoimento'}).click();
 await editor.getByLabel('Etapa atual').selectOption('completed');
 await editor.getByLabel('Resultado',{exact:true}).selectOption('won');
 await editor.getByLabel('Aprendizado e próximos passos').fill('O depoimento reduziu o custo por lead. Testar variações de abertura no próximo ciclo.');
 const concluded=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().endsWith('/api/state/marketing_experiments'));
 await editor.getByRole('button',{name:'Salvar alterações'}).click();
 await concluded;
 await card.getByRole('button',{name:'Abrir experimento Teste de anúncio com depoimento'}).click();
 await expect(editor.getByLabel('Resultado',{exact:true})).toHaveValue('won');
 await editor.getByRole('button',{name:'Fechar'}).click();
 await page.reload();
 await expect(page.locator('.marketingExperimentColumn.completed')).toContainText('Teste de anúncio com depoimento');
 await card.getByRole('button',{name:'Abrir experimento Teste de anúncio com depoimento'}).click();
 await expect(editor.getByLabel('Resultado',{exact:true})).toHaveValue('won');
 await expect(editor.getByLabel('Aprendizado e próximos passos')).toHaveValue('O depoimento reduziu o custo por lead. Testar variações de abertura no próximo ciclo.');
});

test('migra um cadastro manual para o vínculo permanente do cliente',async({page})=>{
 await page.goto('/marketing/integrations');
 await expect(page.getByText('1 cadastro manual pendente')).toBeVisible();
 await page.getByRole('button',{name:'Migrar cadastros'}).click();
 const modal=page.locator('.modal');
 await expect(modal.getByLabel('Conta de anúncios')).toHaveValue('Meta Ads Legado');
 await expect(modal.getByLabel('ID da conta')).toHaveValue('act_legacy_123');
 await modal.getByLabel('Portfólio empresarial (BM)').fill('BM Migrada');
 await modal.getByLabel('ID da estrutura').fill('bm-migrada-1');
 const newLink=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/client_marketing_integrations'));
 const oldRecord=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/marketing_integrations'));
 await modal.getByRole('button',{name:'Migrar vínculo'}).click();
 await Promise.all([newLink,oldRecord]);
 await expect(page.getByText('1 cadastro manual pendente')).toHaveCount(0);
 await expect(page.getByText('BM Migrada')).toBeVisible();
 await expect(page.getByText('Meta Ads Legado')).toBeVisible();
});

test('abre a tarefa pela notificação e permite limpar todos os alertas',async({page})=>{
 await page.goto('/dashboard');
 await page.getByRole('button',{name:'Abrir notificações'}).click();
 await expect(page.getByText('Nova versão do Flow ROAS')).toBeVisible();
 const taskNotification=page.locator('.notificationList article').filter({hasText:'Relatório atrasado'});
 await expect(taskNotification).toBeVisible();
 await taskNotification.locator('.notificationOpen').click();
 await expect(page).toHaveURL(/\/tasks/);
 const taskModal=page.locator('.enhancedTaskModal');
 await expect(taskModal).toBeVisible();
 await expect(taskModal.locator('input[name="title"]')).toHaveValue('Relatório atrasado');
 await taskModal.locator('.modalHead .iconBtn').click();
 await page.getByRole('button',{name:'Abrir notificações'}).click();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Limpar todas'}).click();
 await expect(page.locator('.notificationEmpty')).toBeVisible();
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.locator('.notificationList article')).toHaveCount(0);
});

test('cria e persiste um mapa mental dentro do cliente',async({page})=>{
 await page.goto('/clients/client-1');
 await page.getByRole('button',{name:'Mapas mentais'}).click();
 await expect(page.getByText('Nenhum mapa mental criado')).toBeVisible();
 await page.getByRole('button',{name:'Criar primeiro mapa'}).click();
 const dialog=page.getByRole('dialog',{name:'Novo mapa mental'});
 await dialog.getByLabel('Nome do mapa').fill('Estratégia de lançamento');
 await dialog.getByLabel('Descrição').fill('Organização da campanha do cliente.');
 await dialog.getByLabel('Tópico central').fill('Novo produto');
 const mapSaved=page.waitForResponse(response=>response.url().endsWith('/api/state/client_mind_maps')&&response.request().method()==='PUT');
 await dialog.getByRole('button',{name:'Criar mapa'}).click();
 await mapSaved;
 const root=page.locator('.mindMapNode.root');
 await expect(root).toContainText('Novo produto');
 const zoomValue=page.getByTitle('Restaurar zoom para 100%');
 await expect(zoomValue).toHaveText('100%');
 await page.locator('.mindMapCanvasScroll').dispatchEvent('wheel',{deltaY:-180,clientX:420,clientY:260});
 await expect(zoomValue).not.toHaveText('100%');
 await zoomValue.click();
 await expect(zoomValue).toHaveText('100%');
 await expect(page.getByRole('button',{name:'Enquadrar mapa'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Focar tópico'})).toBeVisible();
 const mapWorkspace=page.locator('.mindMapMain');
 await page.getByRole('button',{name:'Tela cheia de mapa mental'}).click();
 await expect(mapWorkspace).toHaveClass(/fullscreenSurfaceActive/);
 await page.getByRole('button',{name:'Sair da tela cheia de mapa mental'}).click();
 await expect(mapWorkspace).not.toHaveClass(/fullscreenSurfaceActive/);
 await root.getByRole('button',{name:'Criar ramo right'}).click();
 const quickEditor=page.locator('.mindMapQuickEditor');
 await quickEditor.getByPlaceholder('Nome do novo ramo').fill('Público-alvo');
 const branchSaved=page.waitForResponse(response=>response.url().endsWith('/api/state/client_mind_maps')&&response.request().method()==='PUT');
 await quickEditor.getByRole('button',{name:'Criar tópico'}).click();
 await branchSaved;
 const branch=page.locator('.mindMapNode').filter({hasText:'Público-alvo'});
 await expect(branch).toBeVisible();
 const branchBox=await branch.boundingBox();
 if(!branchBox)throw new Error('Não foi possível localizar o ramo criado');
 const positionSaved=page.waitForResponse(response=>response.url().endsWith('/api/state/client_mind_maps')&&response.request().method()==='PUT');
 await page.mouse.move(branchBox.x+branchBox.width/2,branchBox.y+branchBox.height/2);
 await page.mouse.down();
 await page.mouse.move(branchBox.x+branchBox.width/2+80,branchBox.y+branchBox.height/2+45,{steps:5});
 await page.mouse.up();
 await positionSaved;
 await page.locator('.mindMapCanvas').dblclick({position:{x:700,y:420}});
 await quickEditor.getByPlaceholder('Nome do tópico livre').fill('Referências');
 const freeTopicSaved=page.waitForResponse(response=>response.url().endsWith('/api/state/client_mind_maps')&&response.request().method()==='PUT');
 await quickEditor.getByRole('button',{name:'Criar tópico'}).click();
 await freeTopicSaved;
 await expect(page.locator('.mindMapNode').filter({hasText:'Referências'})).toBeVisible();
 await page.reload();
 await page.getByRole('button',{name:'Mapas mentais'}).click();
 await expect(page.getByText('Estratégia de lançamento',{exact:true}).first()).toBeVisible();
 await expect(page.locator('.mindMapNode').filter({hasText:'Público-alvo'})).toBeVisible();
 await expect(page.locator('.mindMapNode').filter({hasText:'Referências'})).toBeVisible();
});

test('oferece tela cheia nas áreas densas de tarefas e CRM',async({page})=>{
 await page.goto('/tasks');
 const taskWorkspace=page.locator('.taskWorkspace');
 await page.getByRole('button',{name:'Tela cheia de tarefas'}).click();
 await expect(taskWorkspace).toHaveClass(/fullscreenSurfaceActive/);
 await page.keyboard.press('Escape');
 await expect(taskWorkspace).not.toHaveClass(/fullscreenSurfaceActive/);
 await page.goto('/crm');
 await expect(page.getByRole('button',{name:'Tela cheia de pipeline comercial'})).toBeVisible();
 await page.goto('/projects/project-1/editorial');
 await expect(page.getByRole('button',{name:'Tela cheia de Kanban editorial'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Tela cheia de calendário editorial'})).toBeVisible();
});

test('mantém editar e excluir somente dentro da central do cliente',async({page})=>{
 await page.goto('/clients');
 await expect(page.getByRole('button',{name:/Editar/})).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Excluir cliente/})).toHaveCount(0);
 await page.getByRole('link',{name:'Abrir central do cliente'}).click();
 await expect(page).toHaveURL(/\/clients\/client-1$/);
 await expect(page.getByRole('button',{name:'Editar cadastro'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Excluir cliente'})).toBeVisible();
 await page.getByRole('button',{name:'Editar cadastro'}).click();
 await expect(page.locator('.clientFormModal')).toContainText('Atualizar cadastro');
 await page.getByRole('button',{name:'Cancelar'}).click();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.getByRole('button',{name:'Excluir cliente'}).click();
 await expect(page).toHaveURL(/\/clients\/client-1$/);
});

test('formata descrição com cor e checklist interativo',async({page})=>{
 await page.goto('/tasks');
 await page.locator('.tasksPageTop').getByRole('button',{name:'Nova tarefa'}).click();
 const dialog=page.getByRole('dialog',{name:'Criar tarefa'}),description=dialog.locator('textarea[name="description"]'),toolbar=dialog.getByRole('toolbar',{name:'Formatação da descrição'});
 await description.fill('Texto importante');
 await description.selectText();
 await toolbar.getByRole('button',{name:'Negrito'}).click();
 await expect(description).toHaveValue('**Texto importante**');
 await expect(dialog.locator('.taskDescriptionPreview strong')).toHaveText('Texto importante');
 await description.fill('Concluído');
 await description.selectText();
 await toolbar.getByRole('button',{name:'Tachado'}).click();
 await expect(description).toHaveValue('~~Concluído~~');
 await expect(dialog.locator('.taskDescriptionPreview s')).toHaveText('Concluído');
 await description.fill('Alerta');
 await description.selectText();
 await toolbar.getByRole('button',{name:'Cor do texto'}).click();
 await dialog.getByRole('button',{name:'Vermelho'}).click();
 await expect(description).toHaveValue('[color=#dc2626]Alerta[/color]');
 await expect(dialog.locator('.taskDescriptionPreview [style*="color"]')).toHaveCSS('color','rgb(220, 38, 38)');
 await description.fill('Planejar');
 await description.selectText();
 await toolbar.getByRole('button',{name:'Adicionar checklist'}).click();
 await expect(description).toHaveValue('- [ ] Planejar');
 await dialog.locator('.taskDescriptionPreview input[type="checkbox"]').check();
 await expect(description).toHaveValue('- [x] Planejar');
});

test('salva a preferência do aviso sonoro de meta batida',async({page})=>{
 await page.goto('/settings');
 await page.getByRole('button',{name:'Notificações',exact:true}).click();
 const goalSound=page.locator('.toggleList label').filter({hasText:'Som de meta batida'}).locator('input');
 await expect(goalSound).toBeChecked();
 const saved=page.waitForResponse(response=>response.url().endsWith('/api/state/notification_preferences')&&response.request().method()==='PUT');
 await goalSound.uncheck();
 await saved;
 await page.goto('/dashboard');
 await page.goto('/settings');
 await page.getByRole('button',{name:'Notificações',exact:true}).click();
 await expect(page.locator('.toggleList label').filter({hasText:'Som de meta batida'}).locator('input')).not.toBeChecked();
});

test('bloqueia configurações quando a área não foi concedida',async({page})=>{
 await page.unroute('**/api/**');
 await mockRoasApi(page,['general']);
 await page.goto('/settings');
 await expect(page.locator('.accessDenied')).toBeVisible();
 await expect(page.locator('.accessDenied')).toContainText(/Acesso n.o permitido/);
 await expect(page.locator('nav').getByText(/Configura/)).toHaveCount(0);
 await expect(page.locator('nav').getByText('Dashboard')).toBeVisible();
});

test('exibe a tela de login quando não existe sessão',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('roas_e2e_logged_out','true'));
 await page.goto('/dashboard');
 await expect(page.getByRole('heading',{name:'Entre na sua conta'})).toBeVisible();
 const password=page.getByPlaceholder('Sua senha');
 await expect(password).toHaveAttribute('type','password');
 await page.getByRole('button',{name:'Mostrar senha'}).click();
 await expect(password).toHaveAttribute('type','text');
});
