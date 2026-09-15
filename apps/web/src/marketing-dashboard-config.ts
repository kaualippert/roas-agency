import type {MarketingMetrics} from './marketing-metrics';

export type MarketingMetricKey='spend'|'impressions'|'reach'|'clicks'|'conversions'|'results'|'leads'|'purchases'|'messagingConversations'|'linkClicks'|'landingPageViews'|'postEngagements'|'videoViews'|'conversionValue'|'roas'|'ctr'|'cpc'|'cpm'|'costPerConversion'|'costPerResult'|'frequency';

export interface MarketingDashboardPreference{
 clientId:string;
 metricIds:MarketingMetricKey[];
 updatedAt:string;
}

export const marketingMetricCatalog:Array<{id:MarketingMetricKey;label:string;description:string;format:'currency'|'integer'|'decimal'|'percent'|'ratio'}>=[
 {id:'spend',label:'Investimento',description:'Valor investido em mídia',format:'currency'},
 {id:'impressions',label:'Impressões',description:'Total de exibições dos anúncios',format:'integer'},
 {id:'reach',label:'Alcance',description:'Pessoas alcançadas',format:'integer'},
 {id:'clicks',label:'Cliques',description:'Cliques registrados nos anúncios',format:'integer'},
 {id:'conversions',label:'Conversões',description:'Resultados atribuídos às campanhas',format:'decimal'},
 {id:'results',label:'Resultados',description:'Resultado principal atribuído pela Meta',format:'decimal'},
 {id:'costPerResult',label:'Custo por resultado',description:'Investimento médio por resultado principal',format:'currency'},
 {id:'leads',label:'Leads',description:'Leads atribuídos aos anúncios',format:'integer'},
 {id:'purchases',label:'Compras',description:'Compras atribuídas aos anúncios',format:'integer'},
 {id:'messagingConversations',label:'Conversas iniciadas',description:'Conversas iniciadas pelos anúncios da Meta',format:'integer'},
 {id:'linkClicks',label:'Cliques no link',description:'Cliques que abriram um destino',format:'integer'},
 {id:'landingPageViews',label:'Visualizações da página',description:'Carregamentos da página de destino',format:'integer'},
 {id:'postEngagements',label:'Engajamentos',description:'Interações com publicações e anúncios',format:'integer'},
 {id:'videoViews',label:'Visualizações de vídeo',description:'Reproduções atribuídas aos anúncios',format:'integer'},
 {id:'conversionValue',label:'Valor de conversão',description:'Receita atribuída às conversões',format:'currency'},
 {id:'roas',label:'ROAS',description:'Retorno sobre o investimento em anúncios',format:'ratio'},
 {id:'ctr',label:'CTR',description:'Percentual de cliques por impressão',format:'percent'},
 {id:'cpc',label:'CPC médio',description:'Custo médio por clique',format:'currency'},
 {id:'cpm',label:'CPM',description:'Custo por mil impressões',format:'currency'},
 {id:'costPerConversion',label:'Custo por conversão',description:'Investimento médio por resultado',format:'currency'},
 {id:'frequency',label:'Frequência',description:'Média de exibições por pessoa',format:'decimal'},
];

const metricIds=new Set(marketingMetricCatalog.map(metric=>metric.id));
export const defaultMarketingMetricIds:MarketingMetricKey[]=['spend','impressions','reach','clicks','conversions','roas'];

export function normalizeMarketingMetricIds(value:unknown){
 if(!Array.isArray(value))return [...defaultMarketingMetricIds];
 const unique=[...new Set(value.filter((item):item is MarketingMetricKey=>metricIds.has(item as MarketingMetricKey)))];
 return unique.length?unique:[...defaultMarketingMetricIds];
}

export function normalizeMarketingDashboardPreferences(value:unknown):MarketingDashboardPreference[]{
 if(!Array.isArray(value))return [];
 return value.flatMap(raw=>{
  if(!raw||typeof raw!=='object')return [];
  const item=raw as Partial<MarketingDashboardPreference>;
  if(!item.clientId)return [];
  return [{clientId:String(item.clientId),metricIds:normalizeMarketingMetricIds(item.metricIds),updatedAt:String(item.updatedAt||'')}];
 });
}

export function metricValue(metrics:MarketingMetrics,id:MarketingMetricKey){
 switch(id){
  case 'ctr':return metrics.impressions?metrics.clicks/metrics.impressions*100:0;
  case 'cpc':return metrics.clicks?metrics.spend/metrics.clicks:0;
  case 'cpm':return metrics.impressions?metrics.spend/metrics.impressions*1000:0;
  case 'costPerConversion':return metrics.conversions?metrics.spend/metrics.conversions:0;
  case 'costPerResult':return metrics.results?metrics.spend/metrics.results:0;
  case 'frequency':return metrics.reach?metrics.impressions/metrics.reach:0;
  default:return metrics[id];
 }
}

export function formatMarketingMetric(id:MarketingMetricKey,value:number){
 const metric=marketingMetricCatalog.find(item=>item.id===id);
 if(metric?.format==='currency')return value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 if(metric?.format==='integer')return Math.round(value).toLocaleString('pt-BR');
 if(metric?.format==='percent')return `${value.toLocaleString('pt-BR',{maximumFractionDigits:2})}%`;
 if(metric?.format==='ratio')return `${value.toLocaleString('pt-BR',{maximumFractionDigits:2})}x`;
 return value.toLocaleString('pt-BR',{maximumFractionDigits:2});
}
