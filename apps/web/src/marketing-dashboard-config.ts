import type {MarketingMetrics} from './marketing-metrics';

export type MarketingMetricKey=keyof MarketingMetrics|'ctr'|'uniqueCtr'|'cpc'|'cpm'|'cpp'|'costPerConversion'|'costPerResult'|'costPerLead'|'costPerPurchase'|'costPerLinkClick'|'costPerOutboundClick'|'costPerLandingPageView'|'costPerMessagingConversation'|'costPerThruPlay'|'frequency';
export type MarketingMetricCategory='Desempenho'|'Entrega'|'Cliques e tráfego'|'Engajamento'|'Vídeo'|'Leads e conversões';

export interface MarketingDashboardPreference{
 clientId:string;
 metricIds:MarketingMetricKey[];
 updatedAt:string;
}

export const marketingMetricCatalog:Array<{id:MarketingMetricKey;label:string;description:string;format:'currency'|'integer'|'decimal'|'percent'|'ratio';category:MarketingMetricCategory}>=[
 {id:'spend',label:'Investimento',description:'Valor investido em mídia',format:'currency',category:'Desempenho'},
 {id:'results',label:'Resultados',description:'Resultado principal atribuído pela Meta',format:'decimal',category:'Desempenho'},
 {id:'costPerResult',label:'Custo por resultado',description:'Investimento médio por resultado principal',format:'currency',category:'Desempenho'},
 {id:'conversionValue',label:'Valor de conversão',description:'Receita atribuída às conversões',format:'currency',category:'Desempenho'},
 {id:'roas',label:'ROAS',description:'Retorno sobre o investimento em anúncios',format:'ratio',category:'Desempenho'},
 {id:'impressions',label:'Impressões',description:'Total de exibições dos anúncios',format:'integer',category:'Entrega'},
 {id:'reach',label:'Alcance',description:'Pessoas alcançadas',format:'integer',category:'Entrega'},
 {id:'frequency',label:'Frequência',description:'Média de exibições por pessoa',format:'decimal',category:'Entrega'},
 {id:'cpm',label:'CPM',description:'Custo por mil impressões',format:'currency',category:'Entrega'},
 {id:'cpp',label:'Custo por mil pessoas alcançadas',description:'Investimento por mil pessoas alcançadas',format:'currency',category:'Entrega'},
 {id:'clicks',label:'Cliques (todos)',description:'Todos os cliques registrados nos anúncios',format:'integer',category:'Cliques e tráfego'},
 {id:'uniqueClicks',label:'Cliques únicos',description:'Pessoas que clicaram no anúncio',format:'integer',category:'Cliques e tráfego'},
 {id:'linkClicks',label:'Cliques no link',description:'Cliques que abriram um destino',format:'integer',category:'Cliques e tráfego'},
 {id:'outboundClicks',label:'Cliques de saída',description:'Cliques que levaram para fora das tecnologias Meta',format:'integer',category:'Cliques e tráfego'},
 {id:'ctr',label:'CTR (todos)',description:'Percentual de cliques por impressão',format:'percent',category:'Cliques e tráfego'},
 {id:'uniqueCtr',label:'CTR único',description:'Percentual de pessoas alcançadas que clicaram',format:'percent',category:'Cliques e tráfego'},
 {id:'cpc',label:'CPC (todos)',description:'Custo médio por clique',format:'currency',category:'Cliques e tráfego'},
 {id:'costPerLinkClick',label:'Custo por clique no link',description:'Investimento por clique no link',format:'currency',category:'Cliques e tráfego'},
 {id:'costPerOutboundClick',label:'Custo por clique de saída',description:'Investimento por clique para fora da Meta',format:'currency',category:'Cliques e tráfego'},
 {id:'landingPageViews',label:'Visualizações da página de destino',description:'Carregamentos da página de destino',format:'integer',category:'Cliques e tráfego'},
 {id:'costPerLandingPageView',label:'Custo por visualização da página',description:'Investimento por página de destino carregada',format:'currency',category:'Cliques e tráfego'},
 {id:'pageEngagements',label:'Engajamentos com a página',description:'Ações atribuídas à Página',format:'integer',category:'Engajamento'},
 {id:'postEngagements',label:'Engajamentos com a publicação',description:'Interações com publicações e anúncios',format:'integer',category:'Engajamento'},
 {id:'postReactions',label:'Reações à publicação',description:'Reações atribuídas aos anúncios',format:'integer',category:'Engajamento'},
 {id:'comments',label:'Comentários',description:'Comentários atribuídos aos anúncios',format:'integer',category:'Engajamento'},
 {id:'shares',label:'Compartilhamentos',description:'Compartilhamentos atribuídos aos anúncios',format:'integer',category:'Engajamento'},
 {id:'saves',label:'Salvamentos',description:'Publicações salvas após visualizar o anúncio',format:'integer',category:'Engajamento'},
 {id:'photoViews',label:'Visualizações de fotos',description:'Fotos abertas a partir do anúncio',format:'integer',category:'Engajamento'},
 {id:'videoViews',label:'Reproduções de vídeo',description:'Reproduções atribuídas aos anúncios',format:'integer',category:'Vídeo'},
 {id:'thruPlays',label:'ThruPlays',description:'Vídeos reproduzidos por pelo menos 15 segundos ou até o fim',format:'integer',category:'Vídeo'},
 {id:'costPerThruPlay',label:'Custo por ThruPlay',description:'Investimento médio por ThruPlay',format:'currency',category:'Vídeo'},
 {id:'video25',label:'Vídeo reproduzido até 25%',description:'Reproduções que atingiram 25% do vídeo',format:'integer',category:'Vídeo'},
 {id:'video50',label:'Vídeo reproduzido até 50%',description:'Reproduções que atingiram 50% do vídeo',format:'integer',category:'Vídeo'},
 {id:'video75',label:'Vídeo reproduzido até 75%',description:'Reproduções que atingiram 75% do vídeo',format:'integer',category:'Vídeo'},
 {id:'video95',label:'Vídeo reproduzido até 95%',description:'Reproduções que atingiram 95% do vídeo',format:'integer',category:'Vídeo'},
 {id:'video100',label:'Vídeo reproduzido até 100%',description:'Reproduções completas do vídeo',format:'integer',category:'Vídeo'},
 {id:'leads',label:'Leads',description:'Leads atribuídos aos anúncios',format:'integer',category:'Leads e conversões'},
 {id:'costPerLead',label:'Custo por lead',description:'Investimento médio por lead',format:'currency',category:'Leads e conversões'},
 {id:'messagingConversations',label:'Conversas por mensagem iniciadas',description:'Conversas iniciadas pelos anúncios da Meta',format:'integer',category:'Leads e conversões'},
 {id:'costPerMessagingConversation',label:'Custo por conversa iniciada',description:'Investimento médio por conversa',format:'currency',category:'Leads e conversões'},
 {id:'contacts',label:'Contatos',description:'Eventos de contato atribuídos',format:'integer',category:'Leads e conversões'},
 {id:'appointmentsScheduled',label:'Agendamentos',description:'Eventos de agendamento atribuídos',format:'integer',category:'Leads e conversões'},
 {id:'applicationsSubmitted',label:'Cadastros enviados',description:'Formulários ou solicitações enviados',format:'integer',category:'Leads e conversões'},
 {id:'registrationsCompleted',label:'Cadastros concluídos',description:'Registros concluídos atribuídos',format:'integer',category:'Leads e conversões'},
 {id:'subscriptions',label:'Assinaturas',description:'Assinaturas atribuídas aos anúncios',format:'integer',category:'Leads e conversões'},
 {id:'addsToCart',label:'Adições ao carrinho',description:'Produtos adicionados ao carrinho',format:'integer',category:'Leads e conversões'},
 {id:'checkoutsInitiated',label:'Finalizações de compra iniciadas',description:'Checkouts iniciados após os anúncios',format:'integer',category:'Leads e conversões'},
 {id:'purchases',label:'Compras',description:'Compras atribuídas aos anúncios',format:'integer',category:'Leads e conversões'},
 {id:'costPerPurchase',label:'Custo por compra',description:'Investimento médio por compra',format:'currency',category:'Leads e conversões'},
 {id:'conversions',label:'Conversões',description:'Conversões atribuídas às campanhas',format:'decimal',category:'Leads e conversões'},
 {id:'costPerConversion',label:'Custo por conversão',description:'Investimento médio por conversão',format:'currency',category:'Leads e conversões'},
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
  case 'uniqueCtr':return metrics.reach?metrics.uniqueClicks/metrics.reach*100:0;
  case 'cpc':return metrics.clicks?metrics.spend/metrics.clicks:0;
  case 'cpm':return metrics.impressions?metrics.spend/metrics.impressions*1000:0;
  case 'cpp':return metrics.reach?metrics.spend/metrics.reach*1000:0;
  case 'costPerConversion':return metrics.conversions?metrics.spend/metrics.conversions:0;
  case 'costPerResult':return metrics.results?metrics.spend/metrics.results:0;
  case 'costPerLead':return metrics.leads?metrics.spend/metrics.leads:0;
  case 'costPerPurchase':return metrics.purchases?metrics.spend/metrics.purchases:0;
  case 'costPerLinkClick':return metrics.linkClicks?metrics.spend/metrics.linkClicks:0;
  case 'costPerOutboundClick':return metrics.outboundClicks?metrics.spend/metrics.outboundClicks:0;
  case 'costPerLandingPageView':return metrics.landingPageViews?metrics.spend/metrics.landingPageViews:0;
  case 'costPerMessagingConversation':return metrics.messagingConversations?metrics.spend/metrics.messagingConversations:0;
  case 'costPerThruPlay':return metrics.thruPlays?metrics.spend/metrics.thruPlays:0;
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
