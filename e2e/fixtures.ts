import type {Page,Route} from '@playwright/test';

const now='2026-07-24T12:00:00.000Z';
const admin={
 id:'member-admin',
 name:'Admin E2E',
 email:'admin@roas-e2e.test',
 role:'Administrador',
 roles:['Administrador'],
 clientIds:[],
 accessAreas:['general','marketing','finance','settings'],
 department:'Gestão',
 status:'active',
 color:'#6541ee',
 createdAt:now,
 updatedAt:now,
};

export const testState={
 general_settings:{
  agencyName:'Agência E2E',
  logoDataUrl:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%228%22 fill=%22%236541ee%22/%3E%3Ctext x=%2216%22 y=%2222%22 text-anchor=%22middle%22 font-size=%2218%22 fill=%22white%22%3ER%3C/text%3E%3C/svg%3E',
  logoScale:100,
 },
 team:[admin],
 clients:[{
  id:'client-1',companyName:'Cliente Teste',contactName:'Maria Teste',email:'maria@example.test',phone:'11999999999',instagram:'@clienteteste',segment:'Varejo',city:'São Paulo',status:'active',managerId:'member-admin',responsibleIds:['member-admin'],monthlyRevenue:3500,serviceIds:[],services:[],startDate:'2026-01-10',notes:'',color:'#2583e9',createdAt:now,updatedAt:now,
 }],
 projects:[{
  id:'project-1',clientId:'client-1',name:'Projeto Teste',description:'Projeto usado nos testes de interface',status:'active',priority:'high',responsibleId:'member-admin',responsibleIds:['member-admin'],dueDate:'2099-12-31',progress:50,progressMode:'tasks',pricingType:'monthly',monthlyValue:3500,serviceIds:[],services:[],channels:[],createdAt:now,updatedAt:now,
 }],
 tasks:[
  {id:'task-overdue',title:'Relatório atrasado',description:'Deve aparecer na coluna de atrasadas',clientId:'client-1',projectId:'project-1',responsibleId:'member-admin',responsibleIds:['member-admin'],status:'todo',priority:'urgent',dueDate:'2020-01-01',tags:['relatório'],position:0,commentsCount:0,attachmentsCount:0,createdAt:now,updatedAt:now},
  {id:'task-future',title:'Planejamento futuro',description:'Tarefa dentro do prazo',clientId:'client-1',projectId:'project-1',responsibleId:'member-admin',responsibleIds:['member-admin'],status:'todo',priority:'medium',dueDate:'2099-12-31',tags:['planejamento'],position:1,commentsCount:0,attachmentsCount:0,createdAt:now,updatedAt:now},
 ],
 prospects:[
  {id:'lead-active',name:'Academia Horizonte',contact:'Carla Lima',phone:'11988887777',responsibleId:'member-admin',value:2500,stage:'Em andamento',source:'Instagram',nextAction:'Enviar proposta',color:'#6541ee',serviceIds:['service-social'],createdAt:now,updatedAt:now},
  {id:'lead-converted',name:'Cliente Convertido',contact:'Paulo Teste',phone:'11977776666',responsibleId:'member-admin',value:2500,stage:'Negócio fechado',source:'Indicação',nextAction:'Cliente convertido',color:'#10a56b',serviceIds:['service-social'],convertedClientId:'client-1',createdAt:now,updatedAt:now},
 ],
 services:[
  {id:'service-social',name:'Social Media',description:'Gestão mensal de conteúdo',price:2500,pricingType:'monthly',active:true,createdAt:now},
  {id:'service-site',name:'Landing Page',description:'Projeto sob orçamento',price:0,pricingType:'variable',active:true,createdAt:now},
 ],
 financial_entries:[],
 notifications:[{id:'notification-1',title:'Teste de notificação',read:false,createdAt:now,updatedAt:now}],
 reports:[],
 team_invitations:[],
};

type AccessArea='general'|'marketing'|'finance'|'settings';

export async function mockRoasApi(page:Page,areas:AccessArea[]=['general','marketing','finance','settings']){
 const member={...admin,accessAreas:areas};
 await page.route('**/api/**',async route=>handleApi(route,member,areas));
}

async function handleApi(route:Route,member:typeof admin,areas:AccessArea[]){
 const request=route.request();
 const path=new URL(request.url()).pathname;
 if(request.method()==='GET'&&path==='/api/state'){
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({state:{...testState,team:[member]}})});
  return;
 }
 if(request.method()==='GET'&&path==='/api/access/me'){
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access:{uid:'e2e-user',email:member.email,member,isAdministrator:areas.length===4,accessAreas:areas,clientIds:null}})});
  return;
 }
 if(request.method()==='PUT'&&path.startsWith('/api/state/')){
  const body=request.postDataJSON() as {value:unknown};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({key:path.split('/').pop(),value:body.value})});
  return;
 }
 await route.fulfill({status:204,body:''});
}

export function captureBrowserErrors(page:Page){
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 return errors;
}
