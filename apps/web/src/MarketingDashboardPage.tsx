import {useEffect,useMemo,useState} from 'react';
import {BarChart3,ChevronRight,FileText,MousePointerClick,PlugZap,Settings2,Target,TrendingUp,WalletCards,X} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useStoreData} from './app/useStoreData';
import {defaultMarketingMetricIds,formatMarketingMetric,marketingMetricCatalog,metricValue,normalizeMarketingDashboardPreferences,type MarketingDashboardPreference,type MarketingMetricKey} from './marketing-dashboard-config';
import {marketingProviders,normalizeClientMarketingIntegrations,type ClientMarketingIntegration} from './marketing-integrations';
import {aggregateMarketingMetrics,emptyMarketingMetrics,normalizeMarketingMetricsSnapshots,type MarketingMetricsSnapshot} from './marketing-metrics';
import {usePersistentState} from './persistent-ui';
import type {Client} from './types';
import './marketing-metrics.css';

type ProviderFilter='all'|'meta_ads'|'google_ads';

export default function MarketingDashboardPage(){
 const [clients]=useStoreData<Client[]>('clients',[]);
 const [storedIntegrations]=useStoreData<ClientMarketingIntegration[]>('client_marketing_integrations',[]);
 const [storedMetrics]=useStoreData<MarketingMetricsSnapshot[]>('marketing_metrics',[]);
 const [storedPreferences,setPreferences]=useStoreData<MarketingDashboardPreference[]>('marketing_dashboard_preferences',[]);
 const integrations=useMemo(()=>normalizeClientMarketingIntegrations(storedIntegrations).filter(item=>item.status==='connected'&&(item.provider==='meta_ads'||item.provider==='google_ads')),[storedIntegrations]);
 const snapshots=useMemo(()=>normalizeMarketingMetricsSnapshots(storedMetrics),[storedMetrics]);
 const integratedClients=useMemo(()=>clients.filter(client=>client.status==='active'&&integrations.some(item=>item.clientId===client.id)),[clients,integrations]);
 const [clientId,setClientId]=usePersistentState('roas_filter_marketing_dashboard_client',integratedClients[0]?.id||'');
 const [providerFilter,setProviderFilter]=usePersistentState<ProviderFilter>('roas_filter_marketing_dashboard_provider','all');
 const [customizing,setCustomizing]=useState(false),[draftMetrics,setDraftMetrics]=useState<MarketingMetricKey[]>([]);
 useEffect(()=>{if(!integratedClients.some(client=>client.id===clientId))setClientId(integratedClients[0]?.id||'')},[clientId,integratedClients,setClientId]);
 const selectedClient=integratedClients.find(client=>client.id===clientId);
 const clientIntegrations=integrations.filter(item=>item.clientId===clientId);
 const visibleIntegrations=clientIntegrations.filter(item=>providerFilter==='all'||item.provider===providerFilter);
 const visibleIds=new Set(visibleIntegrations.map(item=>item.id));
 const visibleSnapshots=snapshots.filter(item=>visibleIds.has(item.integrationId));
 const metrics=visibleSnapshots.length?aggregateMarketingMetrics(visibleSnapshots):emptyMarketingMetrics;
 const preferences=normalizeMarketingDashboardPreferences(storedPreferences);
 const metricIds=preferences.find(item=>item.clientId===clientId)?.metricIds||defaultMarketingMetricIds;
 const period=visibleSnapshots.length?`${date(visibleSnapshots.map(item=>item.periodFrom).sort()[0])} até ${date(visibleSnapshots.map(item=>item.periodTo).sort().at(-1))}`:'Sem período sincronizado';
 const openCustomization=()=>{setDraftMetrics([...metricIds]);setCustomizing(true)};
 const toggleMetric=(id:MarketingMetricKey)=>setDraftMetrics(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
 const saveCustomization=()=>{if(!clientId||!draftMetrics.length)return;const next:MarketingDashboardPreference={clientId,metricIds:draftMetrics,updatedAt:new Date().toISOString()};setPreferences([next,...preferences.filter(item=>item.clientId!==clientId)]);setCustomizing(false)};

 if(!integratedClients.length)return <main className="marketingDashboardPage"><section className="marketingDashboardHero"><div><span><BarChart3/> DASHBOARD DE MARKETING</span><h2>Conecte a primeira marca</h2><p>Vincule uma conta de anúncios a um cliente para começar a analisar os resultados.</p></div><Link className="btn" to="/marketing/integrations"><PlugZap/> Abrir integrações</Link></section></main>;

 return <main className="marketingDashboardPage marketingClientDashboard">
  <section className="marketingDashboardHero marketingAnalysisHero"><div><span><BarChart3/> PERFORMANCE POR CLIENTE</span><h2>{selectedClient?.companyName||'Dashboard de marketing'}</h2><p>Indicadores reais das contas vinculadas. Personalize esta visão conforme sua operação.</p></div><div className="marketingHeroControls"><label><span>Cliente</span><select aria-label="Cliente do dashboard" value={clientId} onChange={event=>setClientId(event.target.value)}>{integratedClients.map(client=><option key={client.id} value={client.id}>{client.companyName}</option>)}</select></label><button className="btn secondary" onClick={openCustomization}><Settings2/> Personalizar métricas</button></div></section>
  <section className="marketingDashboardToolbar"><div className="marketingProviderTabs" aria-label="Filtrar plataforma">{([{id:'all',label:'Todas as plataformas'},{id:'meta_ads',label:'Meta Ads'},{id:'google_ads',label:'Google Ads'}] as Array<{id:ProviderFilter;label:string}>).map(option=><button key={option.id} className={providerFilter===option.id?'active':''} disabled={option.id!=='all'&&!clientIntegrations.some(item=>item.provider===option.id)} onClick={()=>setProviderFilter(option.id)}>{option.label}</button>)}</div><span>{period}</span></section>
  <section className="marketingRealMetrics marketingSelectableMetrics" aria-label="Métricas selecionadas do cliente">{metricIds.map(id=>{const definition=marketingMetricCatalog.find(item=>item.id===id)!;return <article className="card" key={id}><small>{definition.label}</small><strong>{formatMarketingMetric(id,metricValue(metrics,id))}</strong><span>{definition.description}</span></article>})}</section>
  {!visibleSnapshots.length?<section className="card marketingNoData"><BarChart3/><h3>Este canal ainda não possui dados</h3><p>Volte às integrações e sincronize a conta de anúncios deste cliente.</p><Link className="btn" to="/marketing/integrations">Sincronizar conta</Link></section>:<>
   <div className="marketingDashboardGrid marketingPerformanceGrid"><section className="card marketingFunnelPanel"><div className="marketingPanelHead"><div><h3>Jornada de resultados</h3><p>Da entrega do anúncio até a conversão</p></div><Target/></div><div className="marketingFunnelRows"><FunnelRow label="Impressões" value={metrics.impressions} max={metrics.impressions}/><FunnelRow label="Alcance" value={metrics.reach} max={metrics.impressions}/><FunnelRow label="Cliques" value={metrics.clicks} max={metrics.impressions}/><FunnelRow label="Conversões" value={metrics.conversions} max={metrics.impressions}/></div></section><section className="card marketingEfficiencyPanel"><div className="marketingPanelHead"><div><h3>Eficiência da mídia</h3><p>Indicadores calculados com os dados sincronizados</p></div><TrendingUp/></div><div className="marketingEfficiencyGrid"><Insight icon={<MousePointerClick/>} label="CTR" value={formatMarketingMetric('ctr',metricValue(metrics,'ctr'))}/><Insight icon={<WalletCards/>} label="CPC médio" value={formatMarketingMetric('cpc',metricValue(metrics,'cpc'))}/><Insight icon={<BarChart3/>} label="CPM" value={formatMarketingMetric('cpm',metricValue(metrics,'cpm'))}/><Insight icon={<Target/>} label="Custo por conversão" value={formatMarketingMetric('costPerConversion',metricValue(metrics,'costPerConversion'))}/></div></section></div>
   <section className="card marketingChannelPanel"><div className="marketingPanelHead"><div><h3>Desempenho por canal</h3><p>Compare os canais vinculados a {selectedClient?.companyName}</p></div><Link to="/marketing/integrations">Gerenciar contas <ChevronRight/></Link></div><div className="marketingChannelTable"><div className="marketingChannelHead"><span>Canal</span><span>Investimento</span><span>Cliques</span><span>Conversões</span><span>ROAS</span><span>Atualização</span></div>{visibleSnapshots.map(snapshot=>{const integration=clientIntegrations.find(item=>item.id===snapshot.integrationId),provider=marketingProviders.find(item=>item.id===snapshot.provider);return <article key={snapshot.integrationId}><div><i className={`providerLogo ${snapshot.provider}`}>{provider?.mark}</i><span><b>{provider?.name}</b><small>{integration?.resourceName}</small></span></div><strong>{formatMarketingMetric('spend',snapshot.spend)}</strong><span>{formatMarketingMetric('clicks',snapshot.clicks)}</span><span>{formatMarketingMetric('conversions',snapshot.conversions)}</span><strong>{formatMarketingMetric('roas',snapshot.roas)}</strong><time>{dateTime(snapshot.syncedAt)}</time></article>})}</div></section>
  </>}
  <div className="marketingDashboardActions"><Link className="btn secondary" to="/marketing/integrations"><PlugZap/> Gerenciar integrações</Link><Link className="btn" to={`/marketing/reports?client=${clientId}`}><FileText/> Criar relatório deste cliente</Link></div>
  {customizing&&<div className="overlay"><div className="modal marketingMetricsModal" role="dialog" aria-label="Personalizar métricas"><div className="modalHead"><div><small>DASHBOARD DE {selectedClient?.companyName.toUpperCase()}</small><h2>Escolher métricas</h2><p>Selecione os cartões que deseja acompanhar.</p></div><button className="iconBtn" onClick={()=>setCustomizing(false)}><X/></button></div><div className="marketingMetricChoices">{marketingMetricCatalog.map(metric=><label className={draftMetrics.includes(metric.id)?'selected':''} key={metric.id}><input type="checkbox" checked={draftMetrics.includes(metric.id)} onChange={()=>toggleMetric(metric.id)}/><span><b>{metric.label}</b><small>{metric.description}</small></span></label>)}</div><div className="formActions"><button className="btn secondary" onClick={()=>setDraftMetrics([...defaultMarketingMetricIds])}>Restaurar padrão</button><button className="btn" disabled={!draftMetrics.length} onClick={saveCustomization}>Salvar dashboard</button></div></div></div>}
 </main>;
}

function FunnelRow({label,value,max}:{label:string;value:number;max:number}){const percentage=max?Math.max(2,value/max*100):0;return <div><span><b>{label}</b><strong>{Math.round(value).toLocaleString('pt-BR')}</strong></span><i><em style={{width:`${Math.min(100,percentage)}%`}}/></i></div>}
function Insight({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <article><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>}
const date=(value?:string)=>value?new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR'):'—';
const dateTime=(value?:string)=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
