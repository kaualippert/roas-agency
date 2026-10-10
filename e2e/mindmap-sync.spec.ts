import {expect,test,type Page} from '@playwright/test';
import {mergeConcurrentState,StateConflictError} from '../apps/api/src/state-merge';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';

const initialMap={id:'map-sync',clientId:'client-1',title:'Estratégia',description:'',createdAt:'2026-10-01',updatedAt:'2026-10-01',nodes:[{id:'root',parentId:null,text:'Campanha',color:'#5b36f2',x:540,y:310}]};
async function openMap(page:Page){
 await page.goto('/clients/client-1');
 await page.getByRole('button',{name:'Mapas mentais'}).click();
 await page.getByRole('button',{name:'Tela cheia de mapa mental'}).click();
 await expect(page.locator('.mindMapNode.root')).toBeVisible();
}
async function dragRoot(page:Page,dx:number,dy:number){
 const root=page.locator('.mindMapNode.root'),box=await root.boundingBox();
 if(!box)throw new Error('Tópico não visível');
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:8});
 await page.mouse.up();
 return root.evaluate(element=>({x:parseFloat((element as HTMLElement).style.left),y:parseFloat((element as HTMLElement).style.top)}));
}

test('arrastes consecutivos com API lenta não disputam a mesma versão nem revertem posições',async({page})=>{
 await mockRoasApi(page);
 const errors=captureBrowserErrors(page);
 let server=[structuredClone(initialMap)],inFlight=0,maxInFlight=0,conflicts=0;
 const requests:Array<{value:typeof server;baseValue:typeof server}>=[];
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_mind_maps:server}}}));
 await page.route('**/api/state/client_mind_maps',async route=>{
  if(route.request().method()==='GET'){await route.fulfill({json:{value:server}});return}
  const input=route.request().postDataJSON();requests.push(input);inFlight++;maxInFlight=Math.max(maxInFlight,inFlight);
  await new Promise(resolve=>setTimeout(resolve,requests.length===1?1000:100));
  try{
   server=mergeConcurrentState(input.baseValue,server,input.value) as typeof server;
   await route.fulfill({json:{value:server}});
  }catch(error){
   if(!(error instanceof StateConflictError))throw error;
   conflicts++;await route.fulfill({status:409,json:{error:error.message}});
  }finally{inFlight--}
 });
 await openMap(page);
 await dragRoot(page,50,-30);
 await expect.poll(()=>requests.length).toBe(1);
 await dragRoot(page,50,40);
 const latest=await dragRoot(page,-20,40);
 await expect.poll(()=>server[0].nodes[0].x).toBe(latest.x);
 await expect.poll(()=>server[0].nodes[0].y).toBe(latest.y);
 await expect.poll(()=>inFlight).toBe(0);
 expect(requests.length).toBeGreaterThanOrEqual(2);
 expect(maxInFlight).toBe(1);
 expect(conflicts).toBe(0);
 expect(requests[1].baseValue).toEqual(requests[0].value);
 await expect(page.locator('.syncConflictNotice')).toHaveCount(0);
 await expect(page.locator('.mindMapNode.root')).toHaveCSS('left',`${latest.x}px`);
 await page.reload();await page.getByRole('button',{name:'Mapas mentais'}).click();
 await expect(page.locator('.mindMapNode.root')).toHaveCSS('left',`${latest.x}px`);
 await expect(page.locator('.mindMapNode.root')).toHaveCSS('top',`${latest.y}px`);
 expect(errors).toEqual([]);
});

test('conflito real continua protegido e exibe os dados mais recentes do servidor',async({page})=>{
 await mockRoasApi(page);
 const server=structuredClone(initialMap);server.nodes[0].x=700;
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_mind_maps:[initialMap]}}}));
 await page.route('**/api/state/client_mind_maps',route=>route.request().method()==='GET'
  ?route.fulfill({json:{value:[server]}})
  :route.fulfill({status:409,json:{error:'O tópico foi alterado por outra pessoa.'}}));
 await openMap(page);
 await dragRoot(page,50,40);
 await expect(page.locator('.syncConflictNotice')).toContainText('O tópico foi alterado por outra pessoa');
 await expect(page.locator('.mindMapNode.root')).toHaveCSS('left','700px');
});
