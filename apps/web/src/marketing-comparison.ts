import type {MarketingMetrics} from './marketing-metrics';
export type MarketingRange={from:string;to:string};
const day=86400000;
export function previousMarketingRange(range:MarketingRange):MarketingRange{
 const from=Date.parse(`${range.from}T00:00:00Z`),to=Date.parse(`${range.to}T00:00:00Z`);
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<from)throw new Error('Período inválido.');
 const length=Math.round((to-from)/day)+1;
 return {from:new Date(from-length*day).toISOString().slice(0,10),to:new Date(from-day).toISOString().slice(0,10)};
}
export function marketingVariation(current:number|null,previous:number|null):number|null{
 if(current===null||previous===null||!Number.isFinite(current)||!Number.isFinite(previous))return null;
 if(previous===0)return current===0?0:null;
 return (current-previous)/Math.abs(previous)*100;
}
export function comparisonCost(metrics:Pick<MarketingMetrics,'spend'|'results'>):number|null{return metrics.results>0?metrics.spend/metrics.results:null}
