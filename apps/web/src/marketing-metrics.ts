import type {MarketingProvider} from './marketing-integrations';

export interface MarketingMetrics{
 impressions:number;
 reach:number;
 clicks:number;
 conversions:number;
 spend:number;
 conversionValue:number;
 roas:number;
}

export interface MarketingMetricsSnapshot extends MarketingMetrics{
 id:string;
 integrationId:string;
 clientId:string;
 provider:Extract<MarketingProvider,'meta_ads'|'google_ads'>;
 periodFrom:string;
 periodTo:string;
 syncedAt:string;
}

export const emptyMarketingMetrics:MarketingMetrics={impressions:0,reach:0,clicks:0,conversions:0,spend:0,conversionValue:0,roas:0};

const number=(value:unknown)=>Math.max(0,Number(value)||0);

export function normalizeMarketingMetricsSnapshots(value:unknown):MarketingMetricsSnapshot[]{
 if(!Array.isArray(value))return [];
 return value.flatMap(raw=>{
  if(!raw||typeof raw!=='object')return [];
  const item=raw as Partial<MarketingMetricsSnapshot>;
  if(!item.integrationId||!item.clientId||!['meta_ads','google_ads'].includes(String(item.provider)))return [];
  return [{id:String(item.id||item.integrationId),integrationId:String(item.integrationId),clientId:String(item.clientId),provider:item.provider as MarketingMetricsSnapshot['provider'],periodFrom:String(item.periodFrom||''),periodTo:String(item.periodTo||''),syncedAt:String(item.syncedAt||''),impressions:number(item.impressions),reach:number(item.reach),clicks:number(item.clicks),conversions:number(item.conversions),spend:number(item.spend),conversionValue:number(item.conversionValue),roas:number(item.roas)}];
 });
}

export function upsertMarketingMetricsSnapshot(items:MarketingMetricsSnapshot[],snapshot:MarketingMetricsSnapshot){
 return [snapshot,...items.filter(item=>item.integrationId!==snapshot.integrationId)];
}

export function aggregateMarketingMetrics(items:MarketingMetricsSnapshot[]):MarketingMetrics{
 const total=items.reduce((sum,item)=>({impressions:sum.impressions+item.impressions,reach:sum.reach+item.reach,clicks:sum.clicks+item.clicks,conversions:sum.conversions+item.conversions,spend:sum.spend+item.spend,conversionValue:sum.conversionValue+item.conversionValue,roas:0}),{...emptyMarketingMetrics});
 return {...total,roas:total.spend?total.conversionValue/total.spend:0};
}

export function currentMonthPeriod(reference=new Date()){
 const local=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 return {from:local(new Date(reference.getFullYear(),reference.getMonth(),1)),to:local(reference)};
}

export function isMarketingSyncDue(lastSync?:string,reference=new Date(),intervalHours=6){
 if(!lastSync)return true;
 const syncedAt=new Date(lastSync).getTime();
 if(!Number.isFinite(syncedAt))return true;
 return reference.getTime()-syncedAt>=intervalHours*60*60*1000;
}
