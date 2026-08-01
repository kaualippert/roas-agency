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
