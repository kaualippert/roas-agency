import type {MarketingMetrics} from './marketing-metrics';
import {metricValue,type MarketingMetricKey} from './marketing-dashboard-config';
import type {MarketingPeriodKey} from './marketing-period';
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

export function marketingComparisonRange(range:MarketingRange,period:MarketingPeriodKey):MarketingRange{
 if(period!=='this_month'&&period!=='last_month')return previousMarketingRange(range);
 const from=new Date(`${range.from}T00:00:00Z`),year=from.getUTCFullYear(),month=from.getUTCMonth();
 const end=new Date(Date.UTC(year,month,0)),start=new Date(Date.UTC(year,month-1,1));
 if(period==='this_month')end.setUTCDate(Math.min(Number(range.to.slice(8,10)),end.getUTCDate()));
 return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)};
}

export function comparableMetricValue(metrics:MarketingMetrics,id:MarketingMetricKey):number|null{
 const denominator:Partial<Record<MarketingMetricKey,keyof MarketingMetrics>>={ctr:'impressions',uniqueCtr:'reach',cpc:'clicks',cpm:'impressions',cpp:'reach',frequency:'reach',roas:'spend',costPerResult:'results',costPerConversion:'conversions',costPerLead:'leads',costPerPurchase:'purchases',costPerLinkClick:'linkClicks',costPerOutboundClick:'outboundClicks',costPerLandingPageView:'landingPageViews',costPerMessagingConversation:'messagingConversations',costPerThruPlay:'thruPlays'};
 const base=denominator[id];if(base&&metrics[base]<=0)return null;
 const value=metricValue(metrics,id);return Number.isFinite(value)?value:null;
}
