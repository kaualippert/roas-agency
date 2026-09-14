import assert from 'node:assert/strict';
import test from 'node:test';
import {defaultMarketingMetricIds,formatMarketingMetric,metricValue,normalizeMarketingDashboardPreferences,normalizeMarketingMetricIds} from '../apps/web/src/marketing-dashboard-config';
import type {MarketingMetrics} from '../apps/web/src/marketing-metrics';

const metrics:MarketingMetrics={impressions:10000,reach:5000,clicks:200,conversions:10,spend:1000,conversionValue:4000,roas:4};

test('calcula métricas derivadas usando os dados sincronizados',()=>{
 assert.equal(metricValue(metrics,'ctr'),2);
 assert.equal(metricValue(metrics,'cpc'),5);
 assert.equal(metricValue(metrics,'cpm'),100);
 assert.equal(metricValue(metrics,'costPerConversion'),100);
 assert.equal(metricValue(metrics,'frequency'),2);
 assert.equal(formatMarketingMetric('roas',4),'4x');
});

test('normaliza seleção e preferências do dashboard por cliente',()=>{
 assert.deepEqual(normalizeMarketingMetricIds(['spend','spend','ctr','inválida']),['spend','ctr']);
 assert.deepEqual(normalizeMarketingMetricIds([]),defaultMarketingMetricIds);
 assert.deepEqual(normalizeMarketingDashboardPreferences([{clientId:'client-1',metricIds:['cpc']}])[0]?.metricIds,['cpc']);
});
