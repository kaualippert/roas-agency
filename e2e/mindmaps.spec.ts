import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';

test('barra flutuante, edição direta e dicas persistentes do mapa mental',async({page},testInfo)=>{
 await mockRoasApi(page);
 const errors=captureBrowserErrors(page);
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_mind_maps:[{id:'map-inline',clientId:'client-1',title:'Estratégia',description:'',createdAt:'2026-10-01',updatedAt:'2026-10-01',nodes:[{id:'root',parentId:null,text:'Campanha',color:'#5b36f2',x:540,y:310},{id:'branch',parentId:'root',text:'Público',color:'#2563eb',x:900,y:300}]}]}}}));
 await page.goto('/clients/client-1');
 await page.getByRole('button',{name:'Mapas mentais'}).click();
 const controls=page.getByRole('group',{name:'Controles de visualização do mapa'}),hint=page.getByRole('note'),root=page.locator('.mindMapNode.root');
 await expect(hint).toBeVisible();
 await expect(page.locator('.mindMapToolbar .fullscreenButton')).toHaveCount(0);
 await expect(controls.getByRole('button',{name:'Tela cheia de mapa mental'})).toBeVisible();
 await controls.getByRole('button',{name:'Tela cheia de mapa mental'}).click();
 await expect(page.locator('.mindMapMain')).toHaveClass(/fullscreenSurfaceActive/);
 await expect(hint).toHaveCount(0);
 const branch=page.getByRole('button',{name:'Tópico Público',exact:true});
 await branch.dblclick();
 const input=page.getByLabel('Editar texto do tópico');
 await expect(input).toBeFocused();
 await expect(input).toHaveValue('Público');
 await expect(page.locator('.mindMapQuickEditor')).toHaveCount(0);
 await input.fill('Público qualificado');
 const saved=page.waitForResponse(response=>response.url().endsWith('/api/state/client_mind_maps')&&response.request().method()==='PUT');
 await input.press('Enter');await saved;
 await expect(branch).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Tópico Público qualificado',exact:true})).toBeVisible();
 await controls.getByRole('button',{name:'Sair da tela cheia de mapa mental'}).click();
 await root.dblclick();
 await input.fill('Texto descartado');
 await input.press('Escape');
 await expect(root).toContainText('Campanha');
 await controls.getByRole('button',{name:'Ver dicas do mapa'}).click();
 await expect(hint).toBeVisible();
 await page.getByRole('button',{name:'Dispensar dicas do mapa'}).click();
 await page.reload();await page.getByRole('button',{name:'Mapas mentais'}).click();
 await expect(hint).toHaveCount(0);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await expect(controls.getByRole('button',{name:'Tela cheia de mapa mental'})).toBeVisible();
  const fits=await controls.evaluate(element=>Array.from(element.children).every(child=>{const rect=child.getBoundingClientRect(),view=element.getBoundingClientRect();return rect.left>=view.left&&rect.right<=view.right+1}));
  expect(fits).toBe(true);
  await controls.screenshot({path:testInfo.outputPath(`map-controls-${width}.png`)});
 }
 expect(errors).toEqual([]);
});

test('mapa mental permite navegar, editar e enquadrar sem gravações desnecessárias',async({page},testInfo)=>{
 await mockRoasApi(page);
 const errors=captureBrowserErrors(page);
 const map={id:'map-1',clientId:'client-1',title:'Estratégia',description:'Planejamento do cliente',createdAt:'2026-10-01',updatedAt:'2026-10-01',nodes:[
  {id:'root',parentId:null,text:'Campanha',color:'#5b36f2',x:540,y:310},
  {id:'left',parentId:'root',text:'Público',color:'#2563eb',x:130,y:140},
  {id:'right',parentId:'root',text:'Criativos',color:'#059669',x:940,y:480},
 ]};
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_mind_maps:[map]}}}));
 let writes=0;
 page.on('request',request=>{if(request.url().endsWith('/api/state/client_mind_maps')&&request.method()==='PUT')writes++});
 await page.goto('/clients/client-1');
 await page.getByRole('button',{name:'Mapas mentais'}).click();
 const viewport=page.locator('.mindMapCanvasScroll'),root=page.locator('.mindMapNode.root');
 await root.click();
 await expect(page.getByLabel('Texto do tópico selecionado')).toHaveValue('Campanha');
 expect(writes).toBe(0);
 const icon=await root.locator(':scope > span > svg').boundingBox();
 expect(icon?.width).toBe(16);
 expect(icon?.height).toBe(16);
 await viewport.scrollIntoViewIfNeeded();
 const box=await viewport.boundingBox();
 if(!box)throw new Error('Mapa não visível');
 const before=await viewport.evaluate(element=>element.scrollLeft);
 await page.mouse.move(box.x+180,box.y+90);
 await page.mouse.down();
 await page.mouse.move(box.x+100,box.y+90,{steps:6});
 await page.mouse.up();
 await expect.poll(()=>viewport.evaluate(element=>element.scrollLeft)).toBeGreaterThan(before+20);
 expect(writes).toBe(0);
 const zoom=page.getByTitle('Restaurar zoom para 100%');
 await viewport.dispatchEvent('wheel',{deltaY:160,clientX:box.x+220,clientY:box.y+150});
 await expect(zoom).not.toHaveText('100%');
 await zoom.click();
 await page.getByLabel('Texto do tópico selecionado').fill('Lançamento atualizado');
 const saved=page.waitForResponse(response=>response.url().endsWith('/api/state/client_mind_maps')&&response.request().method()==='PUT');
 await page.locator('.mindMapNodeEditor').getByRole('button',{name:'Salvar',exact:true}).click();
 await saved;
 await expect(root).toContainText('Lançamento atualizado');
 await root.getByRole('button',{name:'Criar ramo left'}).click();
 await expect(page.getByLabel('Nome do novo ramo')).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.locator('.mindMapQuickEditor')).toHaveCount(0);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await page.getByRole('button',{name:'Enquadrar mapa',exact:true}).click();
  await expect.poll(async()=>{
   const view=await viewport.boundingBox(),boxes=await page.locator('.mindMapNode').evaluateAll(nodes=>nodes.map(node=>{const rect=node.getBoundingClientRect();return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}}));
   return Boolean(view&&boxes.every(node=>node.left>=view.x-1&&node.right<=view.x+view.width+1&&node.top>=view.y-1&&node.bottom<=view.y+view.height+1));
  }).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('.mindMapMain').screenshot({path:testInfo.outputPath(`mind-map-${width}.png`)});
  // A grade deve preencher o viewport inteiro mesmo quando o conteúdo fica menor.
  await viewport.dispatchEvent('wheel',{deltaY:2000});
  await expect(zoom).toHaveText('20%');
  const grid=await page.locator('.mindMapCanvasStage').evaluate(element=>{
   const style=getComputedStyle(element),rect=element.getBoundingClientRect(),view=element.parentElement!.getBoundingClientRect();
   return {width:rect.width,height:rect.height,viewportWidth:view.width,viewportHeight:view.height,image:style.backgroundImage,size:style.backgroundSize,repeat:style.backgroundRepeat};
  });
  expect(grid.width).toBeGreaterThanOrEqual(grid.viewportWidth-1);
  expect(grid.height).toBeGreaterThanOrEqual(grid.viewportHeight-1);
  expect(grid.image).toContain('radial-gradient');
  expect(grid.image).toContain('0.2px');
  expect(grid.size).toBe('4px 4px');
  expect(grid.repeat).toBe('repeat');
  expect(await page.locator('.mindMapCanvas').evaluate(element=>getComputedStyle(element).backgroundImage)).toBe('none');
  await viewport.screenshot({path:testInfo.outputPath(`mind-map-grid-${width}.png`)});
 }
 await page.getByRole('button',{name:'Focar tópico'}).click();
 await expect(zoom).toHaveText('100%');
 expect(errors).toEqual([]);
});
