import type {MarketingProvider} from './marketing-integrations';

export interface MarketingMetrics{
 impressions:number;
 reach:number;
 clicks:number;
 uniqueClicks:number;
 outboundClicks:number;
 conversions:number;
 results:number;
 leads:number;
 purchases:number;
 messagingConversations:number;
 linkClicks:number;
 landingPageViews:number;
 pageEngagements:number;
 postEngagements:number;
 postReactions:number;
 comments:number;
 shares:number;
 saves:number;
 photoViews:number;
 videoViews:number;
 thruPlays:number;
 video25:number;
 video50:number;
 video75:number;
 video95:number;
 video100:number;
 addsToCart:number;
 checkoutsInitiated:number;
 registrationsCompleted:number;
 contacts:number;
 appointmentsScheduled:number;
 applicationsSubmitted:number;
 subscriptions:number;
 spend:number;
 conversionValue:number;
 roas:number;
}

export interface MarketingTopAd{
 id:string;
 name:string;
 campaignName:string;
 impressions:number;
 clicks:number;
 results:number;
 spend:number;
 costPerResult:number;
 ctr:number;
}

export interface MarketingMetricsSnapshot extends MarketingMetrics{
 id:string;
 integrationId:string;
 clientId:string;
 provider:Extract<MarketingProvider,'meta_ads'|'google_ads'>;
 periodFrom:string;
 periodTo:string;
 syncedAt:string;
 topAds:MarketingTopAd[];
}

export const emptyMarketingMetrics:MarketingMetrics={impressions:0,reach:0,clicks:0,uniqueClicks:0,outboundClicks:0,conversions:0,results:0,leads:0,purchases:0,messagingConversations:0,linkClicks:0,landingPageViews:0,pageEngagements:0,postEngagements:0,postReactions:0,comments:0,shares:0,saves:0,photoViews:0,videoViews:0,thruPlays:0,video25:0,video50:0,video75:0,video95:0,video100:0,addsToCart:0,checkoutsInitiated:0,registrationsCompleted:0,contacts:0,appointmentsScheduled:0,applicationsSubmitted:0,subscriptions:0,spend:0,conversionValue:0,roas:0};

const number=(value:unknown)=>Math.max(0,Number(value)||0);
const normalizeTopAds=(value:unknown):MarketingTopAd[]=>Array.isArray(value)?value.flatMap(raw=>{
 if(!raw||typeof raw!=='object')return [];
 const item=raw as Partial<MarketingTopAd>,id=String(item.id||'').trim();
 if(!id)return [];
 return [{id,name:String(item.name||'Anúncio sem nome'),campaignName:String(item.campaignName||'Campanha não informada'),impressions:number(item.impressions),clicks:number(item.clicks),results:number(item.results),spend:number(item.spend),costPerResult:number(item.costPerResult),ctr:number(item.ctr)}];
}):[];

export function normalizeMarketingMetricsSnapshots(value:unknown):MarketingMetricsSnapshot[]{
 if(!Array.isArray(value))return [];
 return value.flatMap(raw=>{
  if(!raw||typeof raw!=='object')return [];
  const item=raw as Partial<MarketingMetricsSnapshot>;
  if(!item.integrationId||!item.clientId||!['meta_ads','google_ads'].includes(String(item.provider)))return [];
  const conversions=number(item.conversions),results=number(item.results)||conversions;
  return [{id:String(item.id||item.integrationId),integrationId:String(item.integrationId),clientId:String(item.clientId),provider:item.provider as MarketingMetricsSnapshot['provider'],periodFrom:String(item.periodFrom||''),periodTo:String(item.periodTo||''),syncedAt:String(item.syncedAt||''),topAds:normalizeTopAds(item.topAds),impressions:number(item.impressions),reach:number(item.reach),clicks:number(item.clicks),uniqueClicks:number(item.uniqueClicks),outboundClicks:number(item.outboundClicks),conversions,results,leads:number(item.leads),purchases:number(item.purchases),messagingConversations:number(item.messagingConversations),linkClicks:number(item.linkClicks),landingPageViews:number(item.landingPageViews),pageEngagements:number(item.pageEngagements),postEngagements:number(item.postEngagements),postReactions:number(item.postReactions),comments:number(item.comments),shares:number(item.shares),saves:number(item.saves),photoViews:number(item.photoViews),videoViews:number(item.videoViews),thruPlays:number(item.thruPlays),video25:number(item.video25),video50:number(item.video50),video75:number(item.video75),video95:number(item.video95),video100:number(item.video100),addsToCart:number(item.addsToCart),checkoutsInitiated:number(item.checkoutsInitiated),registrationsCompleted:number(item.registrationsCompleted),contacts:number(item.contacts),appointmentsScheduled:number(item.appointmentsScheduled),applicationsSubmitted:number(item.applicationsSubmitted),subscriptions:number(item.subscriptions),spend:number(item.spend),conversionValue:number(item.conversionValue),roas:number(item.roas)}];
 });
}

export function upsertMarketingMetricsSnapshot(items:MarketingMetricsSnapshot[],snapshot:MarketingMetricsSnapshot){
 return [snapshot,...items.filter(item=>item.integrationId!==snapshot.integrationId)];
}

export function aggregateMarketingMetrics(items:MarketingMetricsSnapshot[]):MarketingMetrics{
 const total=items.reduce((sum,item)=>Object.fromEntries(Object.keys(emptyMarketingMetrics).map(key=>[key,key==='roas'?0:sum[key as keyof MarketingMetrics]+item[key as keyof MarketingMetrics]])) as unknown as MarketingMetrics,{...emptyMarketingMetrics});
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
