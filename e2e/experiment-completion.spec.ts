import {expect,test,type Page} from '@playwright/test';
import {mockRoasApi,testState} from './fixtures';

const experiment={id:'exp-complete',title:'Testar depoimento',clientId:'client-1',channel:'meta_ads',campaignName:'Campanha verão',hypothesis:'Depoimentos aumentam leads',metricKey:'leads',direction:'increase',baselineValue:10,targetValue:30,currentValue:20,spendLimit:500,spentValue:100,ownerId:'member-admin',dueDate:'2099-12-31',status:'running',learning:'',createdAt:'2026-10-01T12:00:00.000Z',updatedAt:'2026-10-01T12:00:00.000Z'};
async function setup(page:Page){
 await mockRoasApi(page);
 let value=[{...experiment}];
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,marketing_experiments:value}}}));
 await page.route('**/api/state/marketing_experiments',route=>{value=route.request().postDataJSON().value;return route.fulfill({json:{value}})});
 await page.goto('/marketing/experiments');
 await expect(page.locator('.marketingExperimentColumn.running')).toContainText(experiment.title);
}
async function drop(page:Page,column='completed'){
 const transfer=await page.evaluateHandle(()=>new DataTransfer());
 await page.locator('.marketingExperimentCard').dispatchEvent('dragstart',{dataTransfer:transfer});
 await page.locator(`.marketingExperimentColumn.${column}`).dispatchEvent('drop',{dataTransfer:transfer});
 await transfer.dispose();
}

test('arrastar abre conclusão sem mover o card; cancelar ou Escape mantém a etapa',async({page})=>{
 await setup(page);let writes=0;page.on('request',request=>{if(request.method()==='PUT'&&request.url().endsWith('/marketing_experiments'))writes++});
 await drop(page);
 const modal=page.getByRole('dialog',{name:'Concluir experimento',exact:true});
 await expect(modal).toBeVisible();await expect(modal.getByLabel('Resultado',{exact:true})).toBeFocused();
 await expect(page.locator('.marketingExperimentColumn.running')).toContainText(experiment.title);
 await modal.getByRole('button',{name:'Cancelar',exact:true}).click();
 await expect(modal).toHaveCount(0);expect(writes).toBe(0);
 await drop(page);await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
 await expect(page.locator('.marketingExperimentColumn.completed .marketingExperimentCard')).toHaveCount(0);expect(writes).toBe(0);
});

test('exige aprendizado e resultado, confirma, salva e preserva após recarregar',async({page})=>{
 await setup(page);await drop(page);
 const modal=page.getByRole('dialog',{name:'Concluir experimento',exact:true});
 await modal.getByRole('button',{name:'Concluir experimento',exact:true}).click();
 await expect(modal).toBeVisible();
 await modal.getByLabel('Resultado',{exact:true}).selectOption('inconclusive');
 await modal.getByLabel('Aprendizado e próximos passos').fill('   ');
 await modal.getByRole('button',{name:'Concluir experimento',exact:true}).click();
 await expect(modal.getByRole('alert')).toContainText('Registre o aprendizado');
 const learning='A amostra foi pequena. Repetir o teste com mais volume antes de decidir.';
 await modal.getByLabel('Aprendizado e próximos passos').fill(learning);
 const saved=page.waitForResponse(response=>response.request().method()==='PUT'&&response.url().endsWith('/marketing_experiments'));
 await modal.getByRole('button',{name:'Concluir experimento',exact:true}).click();await saved;
 await expect(modal).toHaveCount(0);await expect(page.locator('.marketingExperimentColumn.completed')).toContainText(experiment.title);
 await page.reload();await page.getByRole('button',{name:`Abrir experimento ${experiment.title}`}).click();
 const editor=page.getByRole('dialog',{name:'Editar experimento'});
 await expect(editor.getByLabel('Resultado',{exact:true})).toHaveValue('inconclusive');
 await expect(editor.getByLabel('Aprendizado e próximos passos')).toHaveValue(learning);
});

test('também impede conclusão incompleta pela edição, sem travar as demais etapas',async({page})=>{
 await setup(page);await drop(page,'analyzing');
 await expect(page.locator('.marketingExperimentColumn.analyzing')).toContainText(experiment.title);
 await page.getByRole('button',{name:`Abrir experimento ${experiment.title}`}).click();
 const editor=page.getByRole('dialog',{name:'Editar experimento'});
 await editor.getByLabel('Etapa atual').selectOption('completed');
 await editor.getByRole('button',{name:'Salvar alterações',exact:true}).click();
 await expect(editor.getByRole('alert')).toContainText('Selecione o resultado');
 await editor.getByLabel('Resultado',{exact:true}).selectOption('lost');
 await editor.getByRole('button',{name:'Salvar alterações',exact:true}).click();
 await expect(editor.getByRole('alert')).toContainText('Registre o aprendizado');
 await editor.getByLabel('Aprendizado e próximos passos').fill('A hipótese não se confirmou. Alterar a abertura do anúncio.');
 await editor.getByRole('button',{name:'Salvar alterações',exact:true}).click();
 await expect(page.locator('.marketingExperimentColumn.completed')).toContainText(experiment.title);
});

test('formulário de conclusão cabe no celular',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await drop(page);
 const modal=page.getByRole('dialog',{name:'Concluir experimento',exact:true});
 await expect(modal).toBeVisible();const box=await modal.boundingBox();
 expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(390);
 await expect(modal.getByRole('button',{name:'Concluir experimento',exact:true})).toBeInViewport();
 await page.screenshot({path:testInfo.outputPath('experiment-completion-mobile.png')});
});
