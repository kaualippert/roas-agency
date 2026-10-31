import test from 'node:test';
import assert from 'node:assert/strict';
import {comparableMetricValue,comparisonCost,marketingComparisonRange,marketingVariation,previousMarketingRange} from '../apps/web/src/marketing-comparison';
import {emptyMarketingMetrics} from '../apps/web/src/marketing-metrics';

test('compara intervalos inclusivos sem sobreposição',()=>{
 assert.deepEqual(previousMarketingRange({from:'2026-10-24',to:'2026-10-30'}),{from:'2026-10-17',to:'2026-10-23'});
 assert.deepEqual(previousMarketingRange({from:'2026-01-01',to:'2026-01-01'}),{from:'2025-12-31',to:'2025-12-31'});
});
test('preserva a quantidade de dias entre meses e anos bissextos',()=>{
 assert.deepEqual(previousMarketingRange({from:'2024-03-01',to:'2024-03-02'}),{from:'2024-02-28',to:'2024-02-29'});
 assert.deepEqual(previousMarketingRange({from:'2026-10-01',to:'2026-10-30'}),{from:'2026-09-01',to:'2026-09-30'});
 assert.throws(()=>previousMarketingRange({from:'2026-10-30',to:'2026-10-01'}));
});
test('calcula variações positivas, negativas e sem mudança',()=>{
 assert.equal(marketingVariation(400,200),100);
 assert.equal(marketingVariation(10,20),-50);
 assert.equal(marketingVariation(0,20),-100);
 assert.equal(marketingVariation(0,0),0);
});
test('não inventa percentuais com base zero ou dados indisponíveis',()=>{
 assert.equal(marketingVariation(10,0),null);
 assert.equal(marketingVariation(null,10),null);
 assert.equal(marketingVariation(10,null),null);
 assert.equal(marketingVariation(Infinity,10),null);
});
test('custo por resultado usa os totais e não é zero quando não há resultados',()=>{
 assert.equal(comparisonCost({spend:400,results:40}),10);
 assert.equal(comparisonCost({spend:0,results:40}),0);
 assert.equal(comparisonCost({spend:400,results:0}),null);
});

test('comparação mensal respeita dias do mês e fevereiro',()=>{
 assert.deepEqual(marketingComparisonRange({from:'2026-10-01',to:'2026-10-20'},'this_month'),{from:'2026-09-01',to:'2026-09-20'});
 assert.deepEqual(marketingComparisonRange({from:'2026-03-01',to:'2026-03-31'},'this_month'),{from:'2026-02-01',to:'2026-02-28'});
 assert.deepEqual(marketingComparisonRange({from:'2026-03-01',to:'2026-03-31'},'last_month'),{from:'2026-02-01',to:'2026-02-28'});
 assert.deepEqual(marketingComparisonRange({from:'2026-10-24',to:'2026-10-30'},'last_7'),{from:'2026-10-17',to:'2026-10-23'});
});
test('comparação suporta métricas personalizadas sem tratar denominador ausente como zero',()=>{
 const metrics={...emptyMarketingMetrics,spend:400,results:40,reach:1000,clicks:80,impressions:2000};
 assert.equal(comparableMetricValue(metrics,'reach'),1000);
 assert.equal(comparableMetricValue(metrics,'ctr'),4);
 assert.equal(comparableMetricValue(metrics,'cpc'),5);
 assert.equal(comparableMetricValue(metrics,'costPerResult'),10);
 assert.equal(comparableMetricValue(emptyMarketingMetrics,'costPerResult'),null);
 assert.equal(comparableMetricValue(emptyMarketingMetrics,'roas'),null);
 assert.equal(comparableMetricValue(emptyMarketingMetrics,'ctr'),null);
});
