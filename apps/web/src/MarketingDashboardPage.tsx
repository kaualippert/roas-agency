import {useEffect,useMemo,useState} from 'react';
import {BarChart3,CalendarRange,ChevronRight,FileText,MousePointerClick,PlugZap,RefreshCw,Search,Settings2,Target,TrendingUp,WalletCards,X} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useStoreData} from './app/useStoreData';
import {defaultMarketingMetricIds,formatMarketingMetric,marketingMetricCatalog,metricValue,normalizeMarketingDashboardPreferences,type MarketingDashboardPreference,type MarketingMetricKey} from './marketing-dashboard-config';
import {markMarketingIntegrationSynced,marketingProviders,normalizeClientMarketingIntegrations,type ClientMarketingIntegration} from './marketing-integrations';
import {aggregateMarketingMetrics,emptyMarketingMetrics,normalizeMarketingMetricsSnapshots,upsertMarketingMetricsSnapshot,type MarketingMetricsSnapshot} from './marketing-metrics';
import {syncMarketingMetrics} from './marketing-oauth-client';
import {marketingPeriodOptions,marketingPeriodRange,normalizeMarketingPeriodKey,type MarketingPeriodKey} from './marketing-period';
import {usePersistentState} from './persistent-ui';
import type {Client} from './types';
import './marketing-metrics.css';

type ProviderFilter='all'|'meta_ads'|'google_ads';

export default function MarketingDashboardPage(){
 const [clients]=useStoreData<Client[]>('clients',[]);
 const [storedIntegrations,setStoredIntegrations]=useStoreData<ClientMarketingIntegration[]>('client_marketing_integrations',[]);
 const [storedMetrics,setStoredMetrics]=useStoreData<MarketingMetricsSnapshot[]>('marketing_metrics',[]);
 const [storedPreferences,setPreferences]=useStoreData<MarketingDashboardPreference[]>('marketing_dashboard_preferences',[]);
 const integrations=useMemo(()=>normalizeClientMarketingIntegrations(storedIntegrations).filter((item):item is ClientMarketingIntegration&{provider:'meta_ads'|'google_ads'}=>item.status==='connected'&&(item.provider==='meta_ads'||item.provider==='google_ads')),[storedIntegrations]);
 const snapshots=useMemo(()=>normalizeMarketingMetricsSnapshots(storedMetrics),[storedMetrics]);
 const integratedClients=useMemo(()=>clients.filter(client=>client.status==='active'&&integrations.some(item=>item.clientId===client.id)),[clients,integrations]);
 const [clientId,setClientId]=usePersistentState('roas_filter_marketing_dashboard_client',integratedClients[0]?.id||'');
 const [providerFilter,setProviderFilter]=usePersistentState<ProviderFilter>('roas_filter_marketing_dashboard_provider','all');
 const [periodKey,setPeriodKey]=usePersistentState<MarketingPeriodKey>('roas_filter_marketing_dashboard_period','this_month');
 const [customizing,setCustomizing]=useState(false),[draftMetrics,setDraftMetrics]=useState<MarketingMetricKey[]>([]);
 const [metricSearch,setMetricSearch]=useState('');
 const [syncing,setSyncing]=useState(false),[syncError,setSyncError]=useState('');
 useEffect(()=>{if(!integratedClients.some(client=>client.id===clientId))setClientId(integratedClients[0]?.id||'')},[clientId,integratedClients,setClientId]);
 const selectedClient=integratedClients.find(client=>client.id===clientId);
 const clientIntegrations=integrations.filter(item=>item.clientId===clientId);
 const visibleIntegrations=clientIntegrations.filter(item=>providerFilter==='all'||item.provider===providerFilter);
 const visibleIds=new Set(visibleIntegrations.map(item=>item.id));
 const visibleSnapshots=snapshots.filter(item=>visibleIds.has(item.integrationId));
 const metrics=visibleSnapshots.length?aggregateMarketingMetrics(visibleSnapshots):emptyMarketingMetrics;
 const topAds=visibleSnapshots.flatMap(snapshot=>snapshot.topAds.map(ad=>({...ad,key:`${snapshot.integrationId}:${ad.id}`,provider:snapshot.provider}))).sort((a,b)=>b.results-a.results||a.costPerResult-b.costPerResult||b.spend-a.spend).slice(0,5);
 const preferences=normalizeMarketingDashboardPreferences(storedPreferences);
 const metricIds=preferences.find(item=>item.clientId===clientId)?.metricIds||defaultMarketingMetricIds;
 const metricQuery=metricSearch.trim().toLocaleLowerCase('pt-BR');
 const filteredMetricCatalog=marketingMetricCatalog.filter(metric=>!metricQuery||`${metric.label} ${metric.description} ${metric.category}`.toLocaleLowerCase('pt-BR').includes(metricQuery));
 const metricCategories=[...new Set(marketingMetricCatalog.map(metric=>metric.category))];
 const period=visibleSnapshots.length?`${date(visibleSnapshots.map(item=>item.periodFrom).sort()[0])} até ${date(visibleSnapshots.map(item=>item.periodTo).sort().at(-1))}`:'Sem período sincronizado';
 const openCustomization=()=>{setDraftMetrics([...metricIds]);setMetricSearch('');setCustomizing(true)};
 const toggleMetric=(id:MarketingMetricKey)=>setDraftMetrics(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
 const saveCustomization=()=>{if(!clientId||!draftMetrics.length)return;const next:MarketingDashboardPreference={clientId,metricIds:draftMetrics,updatedAt:new Date().toISOString()};setPreferences([next,...preferences.filter(item=>item.clientId!==clientId)]);setCustomizing(false)};
 const applyPeriod=async()=>{
  const eligible=visibleIntegrations.filter(integration=>integration.agencyConnectionId);
  if(!eligible.length){setSyncError('As contas selecionadas precisam estar conectadas por OAuth para atualizar o período.');return}
  setSyncing(true);setSyncError('');
  try{
   const range=marketingPeriodRange(normalizeMarketingPeriodKey(periodKey));
   const results=await Promise.all(eligible.map(async integration=>({integration,result:await syncMarketingMetrics(integration.provider,{connectionId:integration.agencyConnectionId!,primaryId:integration.primaryId,resourceId:integration.resourceId,...range})})));
   let next=normalizeMarketingMetricsSnapshots(storedMetrics),updatedIntegrations=normalizeClientMarketingIntegrations(storedIntegrations);
   for(const {integration,result} of results){
    next=upsertMarketingMetricsSnapshot(next,{id:integration.id,integrationId:integration.id,clientId:integration.clientId,provider:integration.provider,periodFrom:result.period.from,periodTo:result.period.to,syncedAt:result.syncedAt,topAds:result.topAds||[],...result.metrics});
    updatedIntegrations=markMarketingIntegrationSynced(updatedIntegrations,integration.id,result.syncedAt);
   }
   setStoredMetrics(next);setStoredIntegrations(updatedIntegrations);
  }catch(error){setSyncError(error instanceof Error?error.message:'Não foi possível atualizar os dados deste período.')}finally{setSyncing(false)}
 };

 if(!integratedClients.length)return <main className="marketingDashboardPage"><section className="marketingDashboardHero"><div><span><BarChart3/> DASHBOARD DE MARKETING</span><h2>Conecte a primeira marca</h2><p>Vincule uma conta de anúncios a um cliente para começar a analisar os resultados.</p></div><Link className="btn" to="/marketing/integrations"><PlugZap/> Abrir integrações</Link></section></main>;

 return <main className="marketingDashboardPage marketingClientDashboard">
  <section className="marketingDashboardHero marketingAnalysisHero"><div><span><BarChart3/> PERFORMANCE POR CLIENTE</span><h2>{selectedClient?.companyName||'Dashboard de marketing'}</h2><p>Indicadores reais das contas vinculadas. Personalize esta visão conforme sua operação.</p></div><div className="marketingHeroControls"><label><span>Cliente</span><select aria-label="Cliente do dashboard" value={clientId} onChange={event=>setClientId(event.target.value)}>{integratedClients.map(client=><option key={client.id} value={client.id}>{client.companyName}</option>)}</select></label><button className="btn secondary" onClick={openCustomization}><Settings2/> Personalizar métricas</button></div></section>
  <section className="marketingDashboardToolbar"><div className="marketingProviderTabs" aria-label="Filtrar plataforma">{([{id:'all',label:'Todas as plataformas'},{id:'meta_ads',label:'Meta Ads'},{id:'google_ads',label:'Google Ads'}] as Array<{id:ProviderFilter;label:string}>).map(option=><button key={option.id} className={providerFilter===option.id?'active':''} disabled={option.id!=='all'&&!clientIntegrations.some(item=>item.provider===option.id)} onClick={()=>setProviderFilter(option.id)}>{option.label}</button>)}</div><div className="marketingPeriodFilter"><CalendarRange/><label><span>Período</span><select aria-label="Período do dashboard de marketing" value={normalizeMarketingPeriodKey(periodKey)} onChange={event=>setPeriodKey(event.target.value as MarketingPeriodKey)}>{marketingPeriodOptions.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label><button type="button" onClick={applyPeriod} disabled={syncing}>{syncing?<RefreshCw className="spin"/>:<RefreshCw/>}{syncing?'Atualizando…':'Aplicar'}</button></div><span>Dados exibidos: {period}</span></section>
  {syncError&&<div className="marketingSyncError" role="alert">{syncError}</div>}
  <section className="marketingRealMetrics marketingSelectableMetrics" aria-label="Métricas selecionadas do cliente">{metricIds.map(id=>{const definition=marketingMetricCatalog.find(item=>item.id===id)!;return <article className="card" key={id}><small>{definition.label}</small><strong>{formatMarketingMetric(id,metricValue(metrics,id))}</strong><span>{definition.description}</span></article>})}</section>
  {!visibleSnapshots.length?<section className="card marketingNoData"><BarChart3/><h3>Este canal ainda não possui dados</h3><p>Volte às integrações e sincronize a conta de anúncios deste cliente.</p><Link className="btn" to="/marketing/integrations">Sincronizar conta</Link></section>:<>
   <div className="marketingDashboardGrid marketingPerformanceGrid"><section className="card marketingFunnelPanel"><div className="marketingPanelHead"><div><h3>Jornada de resultados</h3><p>Da entrega do anúncio até a conversão</p></div><Target/></div><div className="marketingFunnelRows"><FunnelRow label="Impressões" value={metrics.impressions} max={metrics.impressions}/><FunnelRow label="Alcance" value={metrics.reach} max={metrics.impressions}/><FunnelRow label="Cliques" value={metrics.clicks} max={metrics.impressions}/><FunnelRow label="Conversões" value={metrics.conversions} max={metrics.impressions}/></div></section><section className="card marketingEfficiencyPanel"><div className="marketingPanelHead"><div><h3>Eficiência da mídia</h3><p>Indicadores calculados com os dados sincronizados</p></div><TrendingUp/></div><div className="marketingEfficiencyGrid"><Insight icon={<MousePointerClick/>} label="CTR" value={formatMarketingMetric('ctr',metricValue(metrics,'ctr'))}/><Insight icon={<WalletCards/>} label="CPC médio" value={formatMarketingMetric('cpc',metricValue(metrics,'cpc'))}/><Insight icon={<BarChart3/>} label="CPM" value={formatMarketingMetric('cpm',metricValue(metrics,'cpm'))}/><Insight icon={<Target/>} label="Custo por conversão" value={formatMarketingMetric('costPerConversion',metricValue(metrics,'costPerConversion'))}/></div></section></div>
   <section className="card marketingChannelPanel"><div className="marketingPanelHead"><div><h3>Desempenho por canal</h3><p>Compare os canais vinculados a {selectedClient?.companyName}</p></div><Link to="/marketing/integrations">Gerenciar contas <ChevronRight/></Link></div><div className="marketingChannelTable"><div className="marketingChannelHead"><span>Canal</span><span>Investimento</span><span>Cliques</span><span>Conversões</span><span>ROAS</span><span>Atualização</span></div>{visibleSnapshots.map(snapshot=>{const integration=clientIntegrations.find(item=>item.id===snapshot.integrationId),provider=marketingProviders.find(item=>item.id===snapshot.provider);return <article key={snapshot.integrationId}><div><i className={`providerLogo ${snapshot.provider}`}>{provider?.mark}</i><span><b>{provider?.name}</b><small>{integration?.resourceName}</small></span></div><strong>{formatMarketingMetric('spend',snapshot.spend)}</strong><span>{formatMarketingMetric('clicks',snapshot.clicks)}</span><span>{formatMarketingMetric('conversions',snapshot.conversions)}</span><strong>{formatMarketingMetric('roas',snapshot.roas)}</strong><time>{dateTime(snapshot.syncedAt)}</time></article>})}</div></section>
   <section className="card marketingTopAdsPanel"><div className="marketingPanelHead"><div><h3>Melhores anúncios</h3><p>Ranking por resultados no período selecionado</p></div><small>Top 5</small></div>{topAds.length?<div className="marketingTopAdsTable"><div className="marketingTopAdsHead"><span>Anúncio</span><span>Resultados</span><span>Custo/resultado</span><span>Investimento</span><span>CTR</span></div>{topAds.map((ad,index)=><article key={ad.key}><div><i>{index+1}</i><span><b>{ad.name}</b><small>{ad.campaignName}</small></span></div><strong>{formatMarketingMetric('results',ad.results)}</strong><span>{formatMarketingMetric('costPerResult',ad.costPerResult)}</span><span>{formatMarketingMetric('spend',ad.spend)}</span><span>{formatMarketingMetric('ctr',ad.ctr)}</span></article>)}</div>:<div className="marketingTopAdsEmpty"><BarChart3/><b>Sincronize novamente para carregar os anúncios</b><span>Os dados detalhados estarão disponíveis para contas da Meta Ads.</span></div>}</section>
  </>}
  <div className="marketingDashboardActions"><Link className="btn secondary" to="/marketing/integrations"><PlugZap/> Gerenciar integrações</Link><Link className="btn" to={`/marketing/reports?client=${clientId}`}><FileText/> Criar relatório deste cliente</Link></div>
  {customizing&&<div className="overlay"><div className="modal marketingMetricsModal" role="dialog" aria-label="Personalizar métricas"><div className="modalHead"><div><small>DASHBOARD DE {selectedClient?.companyName.toUpperCase()}</small><h2>Escolher métricas</h2><p>Personalize o painel com os indicadores nativos da Meta Ads.</p></div><button className="iconBtn" onClick={()=>setCustomizing(false)}><X/></button></div><div className="marketingMetricTools"><label><Search/><input aria-label="Buscar métrica" value={metricSearch} onChange={event=>setMetricSearch(event.target.value)} placeholder="Buscar por nome ou categoria..."/></label><span><b>{draftMetrics.length}</b> selecionadas</span><button type="button" onClick={()=>setDraftMetrics(marketingMetricCatalog.map(metric=>metric.id))}>Selecionar todas</button></div><div className="marketingMetricChoices">{metricCategories.map(category=>{const items=filteredMetricCatalog.filter(metric=>metric.category===category);return items.length?<section key={category}><header><b>{category}</b><small>{items.length} métricas</small></header><div>{items.map(metric=><label className={draftMetrics.includes(metric.id)?'selected':''} key={metric.id}><input type="checkbox" checked={draftMetrics.includes(metric.id)} onChange={()=>toggleMetric(metric.id)}/><span><b>{metric.label}</b><small>{metric.description}</small></span></label>)}</div></section>:null})}{!filteredMetricCatalog.length&&<div className="marketingMetricEmpty">Nenhuma métrica encontrada para “{metricSearch}”.</div>}</div><div className="formActions"><button className="btn secondary" onClick={()=>setDraftMetrics([...defaultMarketingMetricIds])}>Restaurar padrão</button><button className="btn" disabled={!draftMetrics.length} onClick={saveCustomization}>Salvar dashboard</button></div></div></div>}
 </main>;
}

function FunnelRow({label,value,max}:{label:string;value:number;max:number}){const percentage=max?Math.max(2,value/max*100):0;return <div><span><b>{label}</b><strong>{Math.round(value).toLocaleString('pt-BR')}</strong></span><i><em style={{width:`${Math.min(100,percentage)}%`}}/></i></div>}
function Insight({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <article><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>}
const date=(value?:string)=>value?new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR'):'—';
const dateTime=(value?:string)=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
