import type {Client} from './types';
import type {FinancialEntry} from './financial-entries';

export type EffectiveFinancialStatus='pending'|'received'|'overdue';
export const financialStatusLabel:Record<EffectiveFinancialStatus,string>={pending:'Pendente',received:'Recebido',overdue:'Atrasado'};
export const financialKindLabel={recurring:'Recorrente',variable:'Variável',one_off:'Avulsa'};
export const paymentMethodLabel={pix:'PIX',boleto:'Boleto',transfer:'Transferência',card:'Cartão',other:'Outro'};
export const formatMoney=(value=0)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const monthKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
export const effectiveFinancialStatus=(entry:FinancialEntry):EffectiveFinancialStatus=>entry.status==='received'?'received':entry.dueDate<new Date().toISOString().slice(0,10)?'overdue':'pending';

export function seedFinancialEntries(clients:Client[]){
 const active=clients.filter(client=>client.status==='active'),now=new Date(),entries:FinancialEntry[]=[];
 for(let offset=5;offset>=0;offset--){
  const date=new Date(now.getFullYear(),now.getMonth()-offset,1),month=monthKey(date);
  active.forEach((client,index)=>{
   const received=offset!==0||index%3!==1,dueDate=`${month}-${String(Math.min(25,5+index*3)).padStart(2,'0')}`,stamp=new Date().toISOString();
   entries.push({id:`recurring-${client.id}-${month}`,clientId:client.id,serviceId:client.serviceIds?.[0],source:'client',description:`Mensalidade ${date.toLocaleDateString('pt-BR',{month:'long'})}`,kind:'recurring',value:client.monthlyRevenue,dueDate,status:received?'received':'pending',receivedAt:received?dueDate:undefined,paymentMethod:received?'pix':undefined,notes:'Cobrança recorrente gerada pelo sistema.',createdAt:stamp,updatedAt:stamp});
  });
 }
 return entries;
}
