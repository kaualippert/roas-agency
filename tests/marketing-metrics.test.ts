import assert from 'node:assert/strict';
import test from 'node:test';
import {aggregateMarketingMetrics,currentMonthPeriod,emptyMarketingMetrics,isMarketingSyncDue,normalizeMarketingMetricsSnapshots,upsertMarketingMetricsSnapshot,type MarketingMetricsSnapshot} from '../apps/web/src/marketing-metrics';

const snapshot=(id:string,spend:number,conversionValue:number):MarketingMetricsSnapshot=>({...emptyMarketingMetrics,id,integrationId:id,clientId:'client-1',provider:id==='meta'?'meta_ads':'google_ads',periodFrom:'2026-09-01',periodTo:'2026-09-14',syncedAt:'2026-09-14T12:00:00.000Z',topAds:[],performanceRows:[],impressions:1000,reach:500,clicks:100,conversions:10,results:10,leads:4,purchases:6,messagingConversations:3,linkClicks:80,landingPageViews:60,postEngagements:120,videoViews:300,spend,conversionValue,roas:spend?conversionValue/spend:0});

test('mantém somente o snapshot mais recente de cada integração',()=>{
 const original=snapshot('meta',100,300),updated={...original,spend:200,conversionValue:800,roas:4};
 assert.deepEqual(upsertMarketingMetricsSnapshot([original,snapshot('google',300,600)],updated).map(item=>[item.id,item.spend]),[['meta',200],['google',300]]);
});

test('mantém compatibilidade com snapshots anteriores às novas métricas da Meta',()=>{
 const [normalized]=normalizeMarketingMetricsSnapshots([{id:'legacy',integrationId:'meta',clientId:'client-1',provider:'meta_ads',conversions:7,spend:350}]);
 assert.equal(normalized.results,7);
 assert.equal(normalized.leads,0);
 assert.equal(normalized.messagingConversations,0);
});

test('converte anúncios antigos em linhas detalhadas e preserva novos níveis',()=>{
 const [legacy]=normalizeMarketingMetricsSnapshots([{id:'legacy',integrationId:'meta',clientId:'client-1',provider:'meta_ads',topAds:[{id:'ad-1',name:'Criativo',campaignName:'Captação',impressions:100,clicks:10,results:2,spend:20,costPerResult:10,ctr:10}]}]);
 assert.equal(legacy.performanceRows[0]?.level,'ad');assert.equal(legacy.performanceRows[0]?.name,'Criativo');
 const [current]=normalizeMarketingMetricsSnapshots([{id:'current',integrationId:'meta',clientId:'client-1',provider:'meta_ads',performanceRows:[{id:'set-1',name:'Público',level:'adset',campaignName:'Captação',spend:50}]}]);
 assert.equal(current.performanceRows[0]?.level,'adset');assert.equal(current.performanceRows[0]?.spend,50);
});

test('consolida as plataformas e recalcula o ROAS ponderado',()=>{
 const result=aggregateMarketingMetrics([snapshot('meta',100,400),snapshot('google',300,600)]);
 assert.equal(result.spend,400);
 assert.equal(result.conversionValue,1000);
 assert.equal(result.roas,2.5);
 assert.equal(result.clicks,200);
});

test('normaliza snapshots inválidos e cria o período mensal local',()=>{
 assert.equal(normalizeMarketingMetricsSnapshots([{id:'sem-vinculo'}]).length,0);
 assert.deepEqual(currentMonthPeriod(new Date(2026,8,14,12)),{from:'2026-09-01',to:'2026-09-14'});
});

test('sincronização automática respeita o intervalo e atualiza contas nunca sincronizadas',()=>{
 const now=new Date('2026-09-14T18:00:00.000Z');
 assert.equal(isMarketingSyncDue(undefined,now),true);
 assert.equal(isMarketingSyncDue('2026-09-14T13:00:00.000Z',now),false);
 assert.equal(isMarketingSyncDue('2026-09-14T12:00:00.000Z',now),true);
 assert.equal(isMarketingSyncDue('data-inválida',now),true);
});
