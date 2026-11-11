import type {MetaBreakdownDimension,loadMetaBreakdown} from './meta-breakdown-client';

export const breakdownDimensions=[{id:'age',label:'Idade'},{id:'gender',label:'Gênero'},{id:'region',label:'Região'},{id:'placement',label:'Posicionamento'}] as const;
export const breakdownMetricLabels={spend:'Investimento',impressions:'Impressões',reach:'Alcance',clicks:'Cliques',leads:'Leads',purchases:'Compras',conversations:'Conversas iniciadas',costPerLead:'Custo por lead',costPerPurchase:'Custo por compra',costPerConversation:'Custo por conversa'} as const;
export type BreakdownMetric=keyof typeof breakdownMetricLabels;
export type BreakdownVisualization='bar'|'table';
export type PinnedBreakdownMetric={dimension:MetaBreakdownDimension;rowId:string;label:string;metric:BreakdownMetric};
export const pinnedBreakdownKey=({dimension,rowId,metric}:PinnedBreakdownMetric)=>JSON.stringify([dimension,rowId,metric]);
export function normalizePinnedBreakdowns(input:unknown):PinnedBreakdownMetric[]{
 const entries=new Map<string,PinnedBreakdownMetric>();
 for(const raw of Array.isArray(input)?input:[]){
  if(!raw||typeof raw!=='object')continue;
  const {dimension,rowId,label,metric}=raw as Partial<PinnedBreakdownMetric>;
  if(!dimension||!breakdownDimensions.some(item=>item.id===dimension)||typeof rowId!=='string'||!rowId||rowId.length>800||typeof label!=='string'||!label.trim()||typeof metric!=='string'||!Object.hasOwn(breakdownMetricLabels,metric))continue;
  const entry={dimension,rowId,label:label.trim().slice(0,160),metric};
  entries.set(pinnedBreakdownKey(entry),entry);
 }
 return [...entries.values()];
}

type Row=Awaited<ReturnType<typeof loadMetaBreakdown>>['rows'][number];
export function formatPinnedBreakdown(row:Row|undefined,metric:BreakdownMetric){
 if(!row)return '—';
 const denominator=metric==='costPerLead'?row.leads:metric==='costPerPurchase'?row.purchases:metric==='costPerConversation'?row.conversations:undefined;
 const cost=metric==='costPerLead'||metric==='costPerPurchase'||metric==='costPerConversation';
 const value=cost?(typeof denominator==='number'&&denominator>0&&typeof row.spend==='number'?row.spend/denominator:null):row[metric];
 if(typeof value!=='number'||!Number.isFinite(value))return '—';
 return value.toLocaleString('pt-BR',(cost||metric==='spend')&&row.currency&&/^[A-Z]{3}$/.test(row.currency)?{style:'currency',currency:row.currency}:{maximumFractionDigits:2});
}
