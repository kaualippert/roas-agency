import {expect,test} from '@playwright/test';
import {mockRoasApi,testState} from './fixtures';

test.beforeEach(async({page})=>{await mockRoasApi(page)});

test('carteira, central e relatório do cliente permanecem conectados',async({page})=>{
 const now=new Date().toISOString();
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,reports:[{id:'report-client-1',name:'Resultados do cliente',clientId:'client-1',status:'Pendente',date:now.slice(0,10),category:'Este mês',description:'Resumo para o cliente',createdAt:now,updatedAt:now}]}}}));
 await page.goto('/clients');
 await expect(page.locator('.portfolioOverview')).toContainText('Saúde da carteira');
 await page.getByRole('button',{name:/Mais filtros/}).click();
 await page.getByLabel('Filtrar por saúde da carteira').selectOption('attention');
 await expect(page.locator('.clientTablePanel tbody')).toContainText('Cliente Teste');
 await page.locator('.clientTablePanel tbody tr').filter({hasText:'Cliente Teste'}).click();
 await page.getByRole('link',{name:'Abrir central do cliente'}).click();
 await expect(page.locator('.clientHealthPanel')).toContainText('tarefa atrasada');
 await page.getByRole('button',{name:'Arquivos e relatórios'}).click();
 await page.getByRole('link',{name:'Abrir relatório Resultados do cliente'}).click();
 await expect(page).toHaveURL(/\/marketing\/reports/);
 await expect(page.locator('.reportClientDocument')).toContainText('Resultados do cliente');
 await page.locator('.reportPreviewToolbar').getByRole('button',{name:'Compartilhar'}).click();
 const dialog=page.getByRole('dialog',{name:'Compartilhar relatório'});
 await expect(dialog).toContainText('só será marcado como enviado após sua confirmação');
 const saved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().includes('/api/state/reports'));
 await dialog.getByRole('button',{name:'Confirmar envio ao cliente'}).click();
 await saved;
 await expect(page.locator('.reportStats')).toContainText('Relatórios enviados');
 await expect(page.locator('.reportStats')).toContainText('100%');
});

test('central respeita áreas de marketing e financeiro liberadas ao membro',async({page})=>{
 await mockRoasApi(page,['general']);
 await page.goto('/clients/client-1');
 await expect(page.getByRole('button',{name:'Financeiro'})).toHaveCount(0);
 await page.getByRole('button',{name:'Arquivos e relatórios'}).click();
 await expect(page.getByText('Acesso à área de marketing necessário')).toBeVisible();
 await expect(page.getByRole('link',{name:'Todos os relatórios'})).toHaveCount(0);
});
