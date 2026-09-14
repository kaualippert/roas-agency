import assert from 'node:assert/strict';
import test from 'node:test';
import {aggregateMarketingMetrics,currentMonthPeriod,isMarketingSyncDue,normalizeMarketingMetricsSnapshots,upsertMarketingMetricsSnapshot,type MarketingMetricsSnapshot} from '../apps/web/src/marketing-metrics';

const snapshot=(id:string,spend:number,conversionValue:number):MarketingMetricsSnapshot=>({id,integrationId:id,clientId:'client-1',provider:id==='meta'?'meta_ads':'google_ads',periodFrom:'2026-09-01',periodTo:'2026-09-14',syncedAt:'2026-09-14T12:00:00.000Z',impressions:1000,reach:500,clicks:100,conversions:10,spend,conversionValue,roas:spend?conversionValue/spend:0});

test('mantém somente o snapshot mais recente de cada integração',()=>{
 const original=snapshot('meta',100,300),updated={...original,spend:200,conversionValue:800,roas:4};
 assert.deepEqual(upsertMarketingMetricsSnapshot([original,snapshot('google',300,600)],updated).map(item=>[item.id,item.spend]),[['meta',200],['google',300]]);
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
