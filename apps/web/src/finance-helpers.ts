import type {FinancialEntry} from './financial-entries';

export type EffectiveFinancialStatus='pending'|'received'|'overdue';
export const financialStatusLabel:Record<EffectiveFinancialStatus,string>={pending:'Pendente',received:'Recebido',overdue:'Atrasado'};
export const financialKindLabel={recurring:'Recorrente',variable:'Variável',one_off:'Avulsa'};
export const paymentMethodLabel={pix:'PIX',boleto:'Boleto',transfer:'Transferência',card:'Cartão',other:'Outro'};
export const formatMoney=(value=0)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const monthKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
export const effectiveFinancialStatus=(entry:FinancialEntry):EffectiveFinancialStatus=>entry.status==='received'?'received':entry.dueDate<new Date().toISOString().slice(0,10)?'overdue':'pending';
