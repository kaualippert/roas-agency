import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi} from './fixtures';

test.beforeEach(async({page})=>{
 await mockRoasApi(page);
});

<<<<<<< HEAD
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
=======
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
 await page.getByRole('button',{name:'Cards compactos'}).click();
 await expect(page.locator('.leadCard').first()).toHaveClass(/compact/);
 await page.goto('/tasks');
 await page.getByRole('button',{name:'Minimizar cards'}).click();
 await expect(page.locator('.enhancedTaskCard').first()).toHaveClass(/compact/);
 await page.goto('/crm');
 await expect(page.locator('.leadCard').first()).toHaveClass(/compact/);
>>>>>>> a1ceb7b (Persiste filtros e adiciona visualização compacta nos kanbans)
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
 await expect(page.locator('.taskResultBar')).toContainText('1');
});

test('filtra, movimenta e protege oportunidades no CRM',async({page})=>{
 await page.goto('/crm');
 await expect(page.locator('.headTitle h1')).toHaveText('CRM');
 await expect(page.getByText('Academia Horizonte')).toBeVisible();
 await page.getByRole('button',{name:'Em aberto'}).click();
 await expect(page.getByText('Academia Horizonte')).toBeVisible();
 await expect(page.getByText('Cliente Convertido')).toHaveCount(0);
 const activeCard=page.locator('[data-lead-id="lead-active"]');
 await activeCard.getByLabel(/Mover Academia Horizonte/).selectOption('Reunião');
 await expect(page.locator('[data-crm-stage="Reunião"]')).toContainText('Academia Horizonte');
 await page.getByRole('button',{name:'Todos'}).click();
 await page.getByRole('button',{name:'Editar Cliente Convertido'}).click();
 await expect(page.getByText('Lead convertido em cliente')).toBeVisible();
 await expect(page.getByRole('button',{name:'Excluir lead'})).toBeDisabled();
 await expect(page.locator('.leadEditModal select[name="stage"]')).toBeDisabled();
});

test('cria lead com serviço mensal e valor automático',async({page})=>{
 await page.goto('/crm');
 await page.getByRole('button',{name:'Novo lead'}).click();
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
 await page.goto('/dashboard');
 const dashboardGoal=page.locator('.dashboardSalesGoal');
 await expect(dashboardGoal).toContainText('Meta por negócios fechados');
 await expect(dashboardGoal).toContainText('5 negócios');
 await expect(dashboardGoal).toContainText('0%');
 await expect(dashboardGoal.locator('.salesGoalArc')).toHaveCSS('opacity','0');
});

test('configura uma integração por marca e apresenta a cobertura no dashboard de marketing',async({page})=>{
 await page.goto('/marketing/integrations');
 await expect(page.locator('.headTitle h1')).toHaveText('Integrações de marca');
 await expect(page.getByRole('heading',{name:'Contas certas para cada cliente'})).toBeVisible();
 await page.getByRole('button',{name:'Configurar Meta'}).click();
 const modal=page.locator('.modal');
 await modal.getByLabel('Portfólio empresarial (BM)').selectOption('bm-123');
 await modal.getByLabel('Conta de anúncios').selectOption('act_123');
 const persisted=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/client_marketing_integrations'));
 await modal.getByRole('button',{name:'Salvar vínculo'}).click();
 await persisted;
 await expect(page.getByText('BM Cliente Teste')).toBeVisible();
 await page.goto('/marketing/dashboard');
 await expect(page.locator('.headTitle h1')).toHaveText('Marketing');
 await expect(page.getByText('1 de 4 canais')).toBeVisible();
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
