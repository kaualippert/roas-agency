import assert from 'node:assert/strict';
import test from 'node:test';
import {defaultMarketingMetricIds,formatMarketingMetric,marketingFunnelShare,metricValue,normalizeMarketingAnalysisPanels,normalizeMarketingDashboardPreferences,normalizeMarketingDashboardWidgets,normalizeMarketingMetricIds,normalizeMarketingPerformanceTable} from '../apps/web/src/marketing-dashboard-config';
import {emptyMarketingMetrics,type MarketingMetrics} from '../apps/web/src/marketing-metrics';

const metrics:MarketingMetrics={...emptyMarketingMetrics,impressions:10000,reach:5000,clicks:200,uniqueClicks:150,outboundClicks:100,conversions:10,results:10,leads:8,purchases:2,messagingConversations:5,linkClicks:170,landingPageViews:120,postEngagements:350,videoViews:600,thruPlays:300,spend:1000,conversionValue:4000,roas:4};

test('calcula porcentagens do funil sem comparar moedas, taxas ou uma base zerada',()=>{
 assert.equal(marketingFunnelShare(metrics,'impressions','impressions'),1);
 assert.equal(marketingFunnelShare(metrics,'clicks','impressions'),.02);
 assert.equal(marketingFunnelShare(metrics,'impressions','clicks'),50);
 assert.equal(marketingFunnelShare(metrics,'impressions','spend'),null);
 assert.equal(marketingFunnelShare(metrics,'ctr','impressions'),null);
 assert.equal(marketingFunnelShare({...metrics,clicks:0},'clicks','impressions'),0);
 assert.equal(marketingFunnelShare(emptyMarketingMetrics,'clicks','impressions'),null);
 assert.equal(normalizeMarketingAnalysisPanels(undefined).journeyShowPercentages,false);
 assert.equal(normalizeMarketingAnalysisPanels({journeyShowPercentages:true}).journeyShowPercentages,true);
});

test('calcula métricas derivadas usando os dados sincronizados',()=>{
 assert.equal(metricValue(metrics,'ctr'),2);
 assert.equal(metricValue(metrics,'cpc'),5);
 assert.equal(metricValue(metrics,'cpm'),100);
 assert.equal(metricValue(metrics,'costPerConversion'),100);
 assert.equal(metricValue(metrics,'costPerResult'),100);
 assert.equal(metricValue(metrics,'costPerLead'),125);
 assert.equal(metricValue(metrics,'costPerThruPlay'),1000/300);
 assert.equal(metricValue(metrics,'uniqueCtr'),3);
 assert.equal(metricValue(metrics,'frequency'),2);
 assert.equal(formatMarketingMetric('roas',4),'4x');
});

test('normaliza seleção e preferências do dashboard por cliente',()=>{
 assert.deepEqual(normalizeMarketingMetricIds(['spend','spend','ctr','inválida']),['spend','ctr']);
 assert.deepEqual(normalizeMarketingMetricIds([]),defaultMarketingMetricIds);
 assert.deepEqual(normalizeMarketingDashboardPreferences([{clientId:'client-1',metricIds:['cpc']}])[0]?.metricIds,['cpc']);
 assert.deepEqual(normalizeMarketingDashboardWidgets([{id:'w1',title:'Meu gráfico',type:'pie',metricIds:['spend','results','inválida']}]),[{id:'w1',title:'Meu gráfico',type:'pie',metricIds:['spend','results']}]);
 assert.equal(normalizeMarketingDashboardWidgets([{id:'w2',title:'Meu funil',type:'funnel',metricIds:['impressions','clicks']}])[0]?.type,'funnel');
 assert.deepEqual(normalizeMarketingDashboardWidgets([{id:'w3',title:'Público',type:'audience_pie',metricIds:[]}]),[{id:'w3',title:'Público',type:'audience_pie',metricIds:[]}]);
 assert.deepEqual(normalizeMarketingPerformanceTable({level:'adset',metricIds:['spend','ctr','inválida']}),{level:'adset',metricIds:['spend','ctr']});
 assert.deepEqual(normalizeMarketingDashboardPreferences([{clientId:'client-1',metricIds:['cpc']}])[0]?.widgets,[]);
});
