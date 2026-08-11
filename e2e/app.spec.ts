import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi} from './fixtures';

test.beforeEach(async({page})=>{
 await mockRoasApi(page);
});

test('carrega o dashboard, a identidade da agência e os arquivos principais',async({page})=>{
 const errors=captureBrowserErrors(page);
 await page.goto('/dashboard');
 await expect(page.locator('.headTitle h1')).toHaveText('Dashboard');
 await expect(page.getByText('Visão geral da agência')).toBeVisible();
 await expect(page.locator('.logo b')).toHaveText('Agência E2E');
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
