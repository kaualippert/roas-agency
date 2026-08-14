import type {CRMLead} from './crm-leads';

export type CRMGoalMetric='value'|'quantity';

export type CRMGoal={
 metric:CRMGoalMetric;
 target:number;
 updatedAt:string;
};

export type CRMGoalProgress={
 achieved:number;
 target:number;
 progress:number;
 wonDeals:number;
 remaining:number;
};

export const emptyCRMGoal:CRMGoal={metric:'value',target:0,updatedAt:''};

export function normalizeCRMGoal(value:unknown):CRMGoal{
 if(!value||typeof value!=='object')return emptyCRMGoal;
 const candidate=value as Partial<CRMGoal>;
 return {
  metric:candidate.metric==='quantity'?'quantity':'value',
  target:Math.max(0,Number(candidate.target)||0),
  updatedAt:String(candidate.updatedAt||''),
 };
}

export function isDateInMonth(value:string|undefined,reference=new Date()){
 if(!value)return false;
 const date=new Date(value);
 return !Number.isNaN(date.getTime())&&date.getFullYear()===reference.getFullYear()&&date.getMonth()===reference.getMonth();
}

export function calculateCRMGoalProgress(goal:CRMGoal,leads:CRMLead[],reference=new Date()):CRMGoalProgress{
 const won=leads.filter(lead=>lead.stage==='Negócio fechado'&&isDateInMonth(lead.updatedAt||lead.createdAt,reference));
 const achieved=goal.metric==='quantity'?won.length:won.reduce((sum,lead)=>sum+Math.max(0,Number(lead.value)||0),0);
 const target=Math.max(0,Number(goal.target)||0);
 const progress=target>0?Math.min(100,Math.round(achieved/target*100)):0;
 return {achieved,target,progress,wonDeals:won.length,remaining:Math.max(0,target-achieved)};
}

export const formatCRMGoalValue=(value:number,metric:CRMGoalMetric)=>metric==='value'
 ?value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
 :`${value.toLocaleString('pt-BR')} ${value===1?'negócio':'negócios'}`;
