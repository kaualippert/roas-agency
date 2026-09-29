import {marketingMetricCatalog,type MarketingMetricKey} from './marketing-dashboard-config';

export const marketingExperimentStatuses=['idea','planned','running','analyzing','completed'] as const;
export type MarketingExperimentStatus=typeof marketingExperimentStatuses[number];
export type MarketingExperimentChannel='meta_ads'|'google_ads'|'instagram_organic'|'landing_page'|'email'|'other';
export type MarketingExperimentOutcome='won'|'lost'|'inconclusive';

export interface MarketingExperiment{
 id:string;
 title:string;
 clientId:string;
 channel:MarketingExperimentChannel;
 integrationId?:string;
 campaignId?:string;
 campaignName:string;
 hypothesis:string;
 metricKey:MarketingMetricKey;
 direction:'increase'|'decrease';
 baselineValue:number;
 targetValue:number;
 currentValue:number;
 spendLimit:number;
 spentValue:number;
 ownerId:string;
 dueDate:string;
 status:MarketingExperimentStatus;
 outcome?:MarketingExperimentOutcome;
 learning:string;
 createdAt:string;
 updatedAt:string;
}

const channels=new Set<MarketingExperimentChannel>(['meta_ads','google_ads','instagram_organic','landing_page','email','other']);
const statuses=new Set<MarketingExperimentStatus>(marketingExperimentStatuses);
const outcomes=new Set<MarketingExperimentOutcome>(['won','lost','inconclusive']);
const metricKeys=new Set(marketingMetricCatalog.map(metric=>metric.id));
const text=(value:unknown,max=500)=>String(value??'').trim().slice(0,max);
const number=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?Math.max(0,parsed):0};

export function normalizeMarketingExperiments(value:unknown):MarketingExperiment[]{
 if(!Array.isArray(value))return [];
 return value.flatMap(raw=>{
  if(!raw||typeof raw!=='object')return [];
  const item=raw as Partial<MarketingExperiment>,id=text(item.id,100),title=text(item.title,120),clientId=text(item.clientId,100);
  if(!id||!title||!clientId)return [];
  const now=new Date().toISOString(),createdAt=text(item.createdAt,40)||now,rawMetric=text(item.metricKey,80);
  const outcome=outcomes.has(item.outcome as MarketingExperimentOutcome)?item.outcome as MarketingExperimentOutcome:undefined;
  return [{
   id,title,clientId,channel:channels.has(item.channel as MarketingExperimentChannel)?item.channel as MarketingExperimentChannel:'other',
   integrationId:text(item.integrationId,100)||undefined,campaignId:text(item.campaignId,150)||undefined,campaignName:text(item.campaignName,160),
   hypothesis:text(item.hypothesis,2000),metricKey:metricKeys.has(rawMetric as MarketingMetricKey)?rawMetric as MarketingMetricKey:'results',
   direction:item.direction==='decrease'?'decrease':'increase',baselineValue:number(item.baselineValue),targetValue:number(item.targetValue),currentValue:number(item.currentValue),
   spendLimit:number(item.spendLimit),spentValue:number(item.spentValue),ownerId:text(item.ownerId,100),dueDate:text(item.dueDate,20),
   status:statuses.has(item.status as MarketingExperimentStatus)?item.status as MarketingExperimentStatus:'idea',outcome,
   learning:text(item.learning,3000),createdAt,updatedAt:text(item.updatedAt,40)||createdAt,
  }];
 });
}

export function experimentProgress(experiment:Pick<MarketingExperiment,'baselineValue'|'targetValue'|'currentValue'|'direction'>){
 const distance=experiment.direction==='decrease'?experiment.baselineValue-experiment.targetValue:experiment.targetValue-experiment.baselineValue;
 if(distance<=0)return experiment.currentValue===experiment.targetValue?100:0;
 const moved=experiment.direction==='decrease'?experiment.baselineValue-experiment.currentValue:experiment.currentValue-experiment.baselineValue;
 return Math.max(0,Math.min(100,Math.round(moved/distance*100)));
}

export function upsertMarketingExperiment(items:MarketingExperiment[],experiment:MarketingExperiment){
 const existing=items.find(item=>item.id===experiment.id),now=new Date().toISOString();
 const next={...experiment,createdAt:existing?.createdAt||experiment.createdAt||now,updatedAt:now};
 return existing?items.map(item=>item.id===next.id?next:item):[next,...items];
}
