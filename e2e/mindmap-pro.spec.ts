import {expect,test,type Locator,type Page} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';

const initialMap={
 id:'map-pro',clientId:'client-1',title:'Estratégia de campanha',description:'Planejamento visual',createdAt:'2026-10-01',updatedAt:'2026-10-01',
 nodes:[
  {id:'root',parentId:null as string|null,text:'Campanha',color:'#5b36f2',x:540,y:310},
  {id:'audience',parentId:'root',text:'Público',color:'#2563eb',x:820,y:310},
  {id:'persona',parentId:'audience',text:'Persona',color:'#059669',x:1100,y:310},
 ],
};

async function openMap(page:Page){
 await mockRoasApi(page);
 let server=[structuredClone(initialMap)];
 const writes:unknown[]=[];
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_mind_maps:server}}}));
 await page.route('**/api/state/client_mind_maps',async route=>{
  if(route.request().method()==='GET'){await route.fulfill({json:{value:server}});return}
  const input=route.request().postDataJSON();
  writes.push(input.value);server=input.value;
  await route.fulfill({json:{key:'client_mind_maps',value:server}});
 });
 const errors=captureBrowserErrors(page);
 await page.goto('/clients/client-1');
 await page.getByRole('button',{name:'Mapas mentais',exact:true}).click();
 await page.getByRole('button',{name:'Tela cheia de mapa mental',exact:true}).click();
 await page.getByRole('button',{name:'Enquadrar mapa',exact:true}).click();
 await expect(page.locator('.mindMapNode')).toHaveCount(3);
 return {server:()=>server[0],writes,errors};
}

function topic(page:Page,text:string){return page.getByRole('button',{name:`Tópico ${text}`,exact:true})}

async function drag(page:Page,node:Locator,dx:number,dy:number){
 await node.scrollIntoViewIfNeeded();
 const box=await node.boundingBox();
 if(!box)throw new Error('Tópico do mapa não visível');
 const x=box.x+box.width/2,y=box.y+box.height/2;
 await page.mouse.move(x,y);await page.mouse.down();
 await page.mouse.move(x+dx,y+dy,{steps:10});await page.mouse.up();
}

test('atalhos editam, criam ramos e irmãos, com persistência depois de recarregar',async({page})=>{
 const state=await openMap(page);
 const root=topic(page,'Campanha');
 await root.focus();await page.keyboard.press('F2');
 const inline=page.getByLabel('Editar texto do tópico', {exact:true});
 await expect(inline).toBeFocused();
 await inline.fill('Campanha principal');await inline.press('Enter');
 await expect(topic(page,'Campanha principal')).toBeVisible();
 await topic(page,'Campanha principal').focus();await page.keyboard.press('Tab');
 const newBranch=page.getByLabel('Nome do novo ramo',{exact:true});
 await expect(newBranch).toBeFocused();
 await newBranch.fill('Criativos');await newBranch.press('Enter');
 await expect(topic(page,'Criativos')).toBeVisible();
 await topic(page,'Criativos').focus();await page.keyboard.press('Enter');
 await expect(newBranch).toBeFocused();
 await newBranch.fill('Oferta');await newBranch.press('Enter');
 await expect(topic(page,'Oferta')).toBeVisible();
 await expect.poll(()=>state.server().nodes.length).toBe(5);
 expect(state.server().nodes.find(node=>node.text==='Criativos')?.parentId).toBe('root');
 expect(state.server().nodes.find(node=>node.text==='Oferta')?.parentId).toBe('root');
 await expect.poll(()=>state.server().nodes.find(node=>node.id==='root')?.text).toBe('Campanha principal');
 await page.reload();await page.getByRole('button',{name:'Mapas mentais',exact:true}).click();
 await expect(topic(page,'Campanha principal')).toBeVisible();
 await expect(topic(page,'Oferta')).toBeVisible();
 await expect(page.locator('.mindMapNode')).toHaveCount(5);
 expect(state.errors).toEqual([]);
});

test('ramos recolhem, expandem e duplicam com desfazer e refazer',async({page})=>{
 const state=await openMap(page);
 await topic(page,'Público').click();
 const actions=page.getByRole('toolbar',{name:'Ações do tópico',exact:true});
 await actions.getByRole('button',{name:'Recolher ramo',exact:true}).click();
 await expect(topic(page,'Persona')).toHaveCount(0);
 await expect(topic(page,'Público')).toBeVisible();
 await actions.getByRole('button',{name:'Expandir ramo',exact:true}).click();
 await expect(topic(page,'Persona')).toBeVisible();
 await page.getByRole('button',{name:'Duplicar ramo',exact:true}).click();
 await expect.poll(()=>state.server().nodes.length).toBe(5);
 await expect(page.locator('.mindMapNode')).toHaveCount(5);
 const clone=state.server().nodes.find(node=>!initialMap.nodes.some(initial=>initial.id===node.id)&&node.parentId==='root');
 expect(clone).toBeDefined();
 expect(state.server().nodes.some(node=>node.parentId===clone?.id)).toBe(true);
 await page.getByRole('button',{name:'Desfazer',exact:true}).click();
 await expect(page.locator('.mindMapNode')).toHaveCount(3);
 await expect.poll(()=>state.server().nodes.length).toBe(3);
 await page.getByRole('button',{name:'Refazer',exact:true}).click();
 await expect(page.locator('.mindMapNode')).toHaveCount(5);
 await expect.poll(()=>state.server().nodes.length).toBe(5);
 const original=page.locator('[data-node-id="audience"]');
 await original.click();await original.focus();await page.keyboard.press('Control+d');
 await expect.poll(()=>state.server().nodes.length).toBe(7);
 expect(state.errors).toEqual([]);
});

test('arrastar um ramo move os descendentes, sem restringir ao canvas antigo',async({page})=>{
 const state=await openMap(page);
 await drag(page,topic(page,'Público'),90,50);
 await expect.poll(()=>state.server().nodes.find(node=>node.id==='audience')?.x||0).toBeGreaterThan(850);
 const audience=state.server().nodes.find(node=>node.id==='audience')!,persona=state.server().nodes.find(node=>node.id==='persona')!;
 expect(persona.x-audience.x).toBeCloseTo(280,1);
 expect(persona.y-audience.y).toBeCloseTo(0,1);
 expect(persona.x).toBeGreaterThan(1100);
 expect(state.server().nodes.find(node=>node.id==='root')?.x).toBe(540);
 await page.getByRole('button',{name:'Desfazer',exact:true}).click();
 await expect.poll(()=>state.server().nodes.find(node=>node.id==='audience')?.x).toBe(820);
 expect(state.server().nodes.find(node=>node.id==='persona')?.x).toBe(1100);
 expect(state.errors).toEqual([]);
});

test('Shift seleciona vários tópicos e o arraste move somente os selecionados',async({page})=>{
 const state=await openMap(page);
 await topic(page,'Campanha').click();
 await topic(page,'Persona').click({modifiers:['Shift']});
 await drag(page,topic(page,'Persona'),-65,60);
 await expect.poll(()=>state.server().nodes.find(node=>node.id==='persona')?.x||0).toBeLessThan(1070);
 const root=state.server().nodes.find(node=>node.id==='root')!,persona=state.server().nodes.find(node=>node.id==='persona')!,audience=state.server().nodes.find(node=>node.id==='audience')!;
 expect(root.x-540).toBeCloseTo(persona.x-1100,1);
 expect(root.y-310).toBeCloseTo(persona.y-310,1);
 expect(audience.x).toBe(820);expect(audience.y).toBe(310);
 expect(state.errors).toEqual([]);
});

test('reconexão permite mudar o pai e impede ciclos entre tópicos',async({page})=>{
 const state=await openMap(page);
 await topic(page,'Público').click();
 const parent=page.getByLabel('Conectar tópico a',{exact:true});
 await expect(parent).toBeVisible();
 const options=await parent.locator('option').evaluateAll(elements=>elements.map(element=>({value:(element as HTMLOptionElement).value,disabled:(element as HTMLOptionElement).disabled})));
 expect(options.filter(option=>['audience','persona'].includes(option.value)).every(option=>option.disabled)).toBe(true);
 await topic(page,'Persona').click();
 await parent.selectOption('root');
 await expect.poll(()=>state.server().nodes.find(node=>node.id==='persona')?.parentId).toBe('root');
 await page.getByRole('button',{name:'Desfazer',exact:true}).click();
 await expect.poll(()=>state.server().nodes.find(node=>node.id==='persona')?.parentId).toBe('audience');
 expect(state.errors).toEqual([]);
});

test('ferramentas e controles de visualização funcionam em desktop e largura móvel',async({page},testInfo)=>{
 const state=await openMap(page);
 const mover=page.getByRole('button',{name:'Ferramenta mover',exact:true}),select=page.getByRole('button',{name:'Ferramenta selecionar',exact:true});
 await mover.click();await expect(mover).toHaveAttribute('aria-pressed','true');
 await select.click();await expect(select).toHaveAttribute('aria-pressed','true');
 const writes=state.writes.length;
 await page.getByRole('button',{name:'Sair da tela cheia de mapa mental',exact:true}).click();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await page.getByRole('button',{name:'Tela cheia de mapa mental',exact:true}).click();
  await page.getByRole('button',{name:'Enquadrar mapa',exact:true}).click();
  const viewport=page.locator('.mindMapCanvasScroll');
  await expect(viewport).toBeVisible();
  await expect.poll(async()=>{
   const bounds=await viewport.boundingBox(),nodes=await page.locator('.mindMapNode').evaluateAll(elements=>elements.map(element=>{
    const rect=element.getBoundingClientRect();return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom};
   }));
   return Boolean(bounds&&nodes.every(node=>node.left>=bounds.x-1&&node.right<=bounds.x+bounds.width+1&&node.top>=bounds.y-1&&node.bottom<=bounds.y+bounds.height+1));
  }).toBe(true);
  await page.locator('.mindMapMain').screenshot({path:testInfo.outputPath(`mindmap-pro-fitted-${width}.png`)});
  const box=await viewport.boundingBox();
  if(!box)throw new Error('Canvas do mapa não visível');
  await viewport.dispatchEvent('wheel',{deltaY:2000,clientX:box.x+box.width/2,clientY:box.y+box.height/2});
  await expect(page.getByTitle('Restaurar zoom para 100%')).toHaveText('20%');
  const grid=await page.locator('.mindMapCanvasStage').evaluate(element=>{
   const rect=element.getBoundingClientRect(),viewport=element.parentElement!.getBoundingClientRect(),style=getComputedStyle(element);
   return {width:rect.width,height:rect.height,viewWidth:viewport.width,viewHeight:viewport.height,background:style.backgroundImage};
  });
  expect(grid.width).toBeGreaterThanOrEqual(grid.viewWidth-1);
  expect(grid.height).toBeGreaterThanOrEqual(grid.viewHeight-1);
  expect(grid.background).toContain('radial-gradient');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('.mindMapMain').screenshot({path:testInfo.outputPath(`mindmap-pro-${width}.png`)});
  await page.getByRole('button',{name:'Sair da tela cheia de mapa mental',exact:true}).click();
 }
 expect(state.writes.length).toBe(writes);
 expect(state.errors).toEqual([]);
});

test('atalhos respeitam botões e seleção continua válida ao desfazer criação',async({page})=>{
 const state=await openMap(page);
 await topic(page,'Persona').focus();
 await page.keyboard.press('F2');
 await expect(page.getByLabel('Editar texto do tópico',{exact:true})).toHaveValue('Persona');
 await page.getByLabel('Editar texto do tópico',{exact:true}).press('Escape');
 const root=topic(page,'Campanha');
 await root.click();
 await root.getByRole('button',{name:'Criar ramo right',exact:true}).focus();
 await page.keyboard.press('Enter');
 await expect(page.getByLabel('Nome do novo ramo',{exact:true})).toBeFocused();
 await page.getByLabel('Nome do novo ramo',{exact:true}).press('Escape');
 await page.getByPlaceholder('Digite uma nova ideia...').fill('Plano novo');
 await page.locator('.mindMapAddBranch').getByRole('button',{name:'Adicionar',exact:true}).click();
 await expect(topic(page,'Plano novo')).toHaveClass(/selected/);
 await expect.poll(()=>state.server().nodes.length).toBe(4);
 const undo=page.getByRole('button',{name:'Desfazer',exact:true});
 await undo.focus();await page.keyboard.press('Space');
 await expect.poll(()=>state.server().nodes.length).toBe(3);
 await expect(root).toHaveClass(/selected/);
 await page.getByRole('button',{name:'Usar cor #dc2626',exact:true}).click();
 await expect.poll(()=>state.server().nodes.find(node=>node.id==='root')?.color).toBe('#dc2626');
 expect(state.errors).toEqual([]);
});
