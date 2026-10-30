import {expect,test,type Page} from '@playwright/test';
import {mockRoasApi,testState} from './fixtures';

async function write(page:Page,value:string){await expect(page.locator('.saveStatusToggle')).toBeVisible();await page.evaluate(async value=>{const path='/src/storage.ts';const {store}=await import(path);store.set('agency_profile',{name:value})},value)}
async function journal(page:Page){return page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('roas_drafts_v1:')).map(key=>JSON.parse(localStorage.getItem(key)!)))}
test.beforeEach(async({page})=>{await mockRoasApi(page);page.on('dialog',dialog=>void dialog.accept())});

test('mostra Salvando até o servidor confirmar e mantém rascunho durante o envio',async({page})=>{
 let release=()=>{};const held=new Promise<void>(resolve=>{release=resolve});
 await page.route('**/api/state/agency_profile',async route=>{await held;await route.fulfill({json:{value:route.request().postDataJSON().value}})});
 await page.goto('/dashboard');
 await expect(page.locator('.saveStatusToggle')).toHaveText('Salvo');
 await write(page,'Em envio');
 await expect(page.locator('.saveStatusToggle')).toHaveText('Salvando…');
 await expect.poll(async()=>JSON.stringify(await journal(page))).toContain('Em envio');
 release();
 await expect(page.locator('.saveStatusToggle')).toHaveText('Salvo');
 await expect.poll(()=>journal(page)).toEqual([]);
});

test('recupera após falha e recarga somente com confirmação',async({page})=>{
 let fail=true;
 await page.route('**/api/state/agency_profile',route=>fail?route.fulfill({status:503,json:{error:'Indisponível'}}):route.fulfill({json:{value:route.request().postDataJSON().value}}));
 await page.goto('/dashboard');await write(page,'Rascunho recuperável');
 await expect(page.locator('.saveStatusToggle')).toHaveText('Falha');
 await page.reload();
 await expect(page.locator('.saveStatusToggle')).toContainText('Falha');
 expect(await page.evaluate(async()=>{const path='/src/storage.ts';const {store}=await import(path);return store.get('agency_profile',null)})).toBeNull();
 await page.locator('.saveStatusToggle').click();
 await expect(page.getByRole('button',{name:'Recuperar rascunho',exact:true})).toBeVisible();
 fail=false;
 await page.getByRole('button',{name:'Recuperar rascunho',exact:true}).click();
 await expect(page.locator('.saveStatusToggle')).toHaveText('Salvo');
 expect(await page.evaluate(async()=>{const path='/src/storage.ts';const {store}=await import(path);return store.get('agency_profile',null)})).toEqual({name:'Rascunho recuperável'});
 await expect.poll(()=>journal(page)).toEqual([]);
});

test('conflito preserva a edição mais recente e a base original sem forçar sobrescrita',async({page})=>{
 let release=()=>{};const held=new Promise<void>(resolve=>{release=resolve});
 const requests:Array<{value:{name:string};baseMissing:boolean}>=[];
 await page.route('**/api/state/agency_profile',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{value:{name:'Versão da equipe'}}});
  requests.push(route.request().postDataJSON());await held;await route.fulfill({status:409,json:{error:'Alteração concorrente'}});
 });
 await page.goto('/dashboard');await write(page,'Primeira edição');
 await expect.poll(()=>requests.length).toBe(1);
 await write(page,'Última edição');release();
 await expect(page.locator('.saveStatusToggle')).toContainText('Falha');
 await expect.poll(async()=>JSON.stringify(await journal(page))).toContain('Última edição');
 await page.locator('.saveStatusToggle').click();
 await page.getByRole('button',{name:'Recuperar rascunho',exact:true}).click();
 await expect.poll(()=>requests.length).toBe(2);
 expect(requests[1]).toMatchObject({value:{name:'Última edição'},baseMissing:true});
 await expect(page.locator('.saveStatusToggle')).toContainText('Falha');
 await page.getByRole('button',{name:'Descartar',exact:true}).click();
 await expect(page.locator('.saveStatusToggle')).toHaveText('Salvo');
 await expect.poll(()=>journal(page)).toEqual([]);
});

test('rascunhos não aparecem para outra conta',async({page})=>{
 await page.route('**/api/state/agency_profile',route=>route.fulfill({status:503,json:{error:'Indisponível'}}));
 await page.goto('/dashboard');await write(page,'Privado da conta original');
 await expect(page.locator('.saveStatusToggle')).toHaveText('Falha');
 await page.route('**/api/access/me',route=>route.fulfill({json:{access:{uid:'outra-conta',member:testState.team[0],isAdministrator:true,accessAreas:['general','marketing','finance','settings'],clientIds:null}}}));
 await page.reload();
 await expect(page.locator('.saveStatusToggle')).toHaveText('Salvo');
 expect(JSON.stringify(await journal(page))).toContain('Privado da conta original');
});

test('reenvia ao recuperar a conexão',async({page,context})=>{
 await page.goto('/dashboard');await expect(page.locator('.saveStatusToggle')).toHaveText('Salvo');
 await expect(page.getByText('Visão geral da agência',{exact:true})).toBeVisible();
 await context.setOffline(true);await write(page,'Alteração offline');
 await expect(page.locator('.saveStatusToggle')).toHaveText('Falha');
 await context.setOffline(false);
 await expect(page.locator('.saveStatusToggle')).toHaveText('Salvo');
 await expect.poll(()=>journal(page)).toEqual([]);
});

test('detalhes do salvamento ficam dentro da tela no celular',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/dashboard');
 await page.locator('.saveStatusToggle').click();
 const box=await page.locator('.saveStatusDetails').boundingBox();
 expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(390);
 await page.screenshot({path:testInfo.outputPath('save-status-mobile.png')});
});

test('edição feita durante um envio usa a nova base e só mostra Salvo no final',async({page})=>{
 let release=()=>{};const held=new Promise<void>(resolve=>{release=resolve});
 const requests:Array<{value:{name:string};baseValue:unknown;baseMissing:boolean}>=[];
 await page.route('**/api/state/agency_profile',async route=>{
  const body=route.request().postDataJSON();requests.push(body);
  if(requests.length===1)await held;
  await route.fulfill({json:{value:body.value}});
 });
 await page.goto('/dashboard');await write(page,'Primeiro valor');await expect.poll(()=>requests.length).toBe(1);
 await write(page,'Valor mais recente');release();
 await expect(page.locator('.saveStatusToggle')).toHaveText('Salvo');
 expect(requests).toHaveLength(2);
 expect(requests[1]).toMatchObject({value:{name:'Valor mais recente'},baseValue:{name:'Primeiro valor'},baseMissing:false});
 expect(await journal(page)).toEqual([]);
});

test('avisa quando o navegador não consegue guardar rascunhos e ainda tenta salvar',async({page})=>{
 let release=()=>{};const held=new Promise<void>(resolve=>{release=resolve});
 await page.route('**/api/state/agency_profile',async route=>{await held;await route.fulfill({json:{value:route.request().postDataJSON().value}})});
 await page.goto('/dashboard');await expect(page.locator('.saveStatusToggle')).toBeVisible();
 await page.evaluate(()=>{const native=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('roas_drafts_v1:'))throw new DOMException('Sem espaço','QuotaExceededError');native.call(this,key,value)}});
 await write(page,'Sem espaço local');
 await expect(page.locator('.saveStatusToggle')).toContainText('Falha');
 await page.locator('.saveStatusToggle').click();
 await expect(page.locator('.saveStatusDetails')).toContainText('Mantenha a página aberta');
 release();await expect(page.locator('.saveStatusToggle')).toHaveText('Salvo');
});
