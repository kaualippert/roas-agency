import {useEffect,useMemo,useState} from 'react';
import {ArrowDown,ArrowUp,BarChart3,CalendarRange,ChevronRight,FileText,Layers3,PlugZap,RefreshCw,Search,Settings2,SlidersHorizontal,X} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useStoreData} from './app/useStoreData';
import {defaultMarketingAnalysisPanels,defaultMarketingMetricIds,defaultMarketingPerformanceTable,formatMarketingMetric,marketingMetricCatalog,metricValue,normalizeMarketingDashboardPreferences,type MarketingDashboardPreference,type MarketingDashboardWidget,type MarketingMetricCategory,type MarketingMetricKey,type MarketingPerformanceTablePreference} from './marketing-dashboard-config';
import MarketingDashboardWidgets from './MarketingDashboardWidgets';
import MarketingWinningAds from './MarketingWinningAds';
import MarketingAnalysisPanels from './MarketingAnalysisPanels';
import {useMarketingComparison,MarketingComparisonToggle} from './MarketingComparison';
import {marketingProviders,normalizeClientMarketingIntegrations,type ClientMarketingIntegration} from './marketing-integrations';
import {aggregateMarketingMetrics,emptyMarketingMetrics,normalizeMarketingMetricsSnapshots,type MarketingMetricsSnapshot,type MarketingPerformanceLevel,type MarketingPerformanceRow} from './marketing-metrics';
import {useMarketingDashboardSync} from './useMarketingDashboardSync';
import {marketingPeriodOptions,marketingPeriodRange,normalizeMarketingPeriodKey,type MarketingPeriodKey} from './marketing-period';
import {usePersistentState} from './persistent-ui';
import type {Client} from './types';
import './marketing-metrics.css';
import './marketing-overview.css';
import MarketingMetricCard from './MarketingMetricCard';
import MetaBreakdownDialog from './MetaBreakdownDialog';
import MarketingBreakdownCards from './MarketingBreakdownCards';
import {pinnedBreakdownKey,type PinnedBreakdownMetric} from './meta-breakdown-metrics';
import {MetricHelp} from './DashboardReading';
import {useAccessibleDialog} from './useAccessibleDialog';

type ProviderFilter='all'|'meta_ads'|'google_ads';
const providerOptions:Array<{id:ProviderFilter;label:string}>=[{id:'all',label:'Todas as plataformas'},{id:'meta_ads',label:'Meta Ads'},{id:'google_ads',label:'Google Ads'}];

export default function MarketingDashboardPage(){
 const [clients]=useStoreData<Client[]>('clients',[]);
 const [storedIntegrations]=useStoreData<ClientMarketingIntegration[]>('client_marketing_integrations',[]);
 const [storedMetrics]=useStoreData<MarketingMetricsSnapshot[]>('marketing_metrics',[]);
 const [storedPreferences,setPreferences]=useStoreData<MarketingDashboardPreference[]>('marketing_dashboard_preferences',[]);
 const integrations=useMemo(()=>normalizeClientMarketingIntegrations(storedIntegrations).filter((item):item is ClientMarketingIntegration&{provider:'meta_ads'|'google_ads'}=>item.status==='connected'&&(item.provider==='meta_ads'||item.provider==='google_ads')),[storedIntegrations]);
 const snapshots=useMemo(()=>normalizeMarketingMetricsSnapshots(storedMetrics),[storedMetrics]);
 const integratedClients=useMemo(()=>clients.filter(client=>client.status==='active'&&integrations.some(item=>item.clientId===client.id)),[clients,integrations]);
 const [clientId,setClientId]=usePersistentState('roas_filter_marketing_dashboard_client',integratedClients[0]?.id||'');
 const [providerFilter,setProviderFilter]=usePersistentState<ProviderFilter>('roas_filter_marketing_dashboard_provider','all');
 const [periodKey,setPeriodKey]=usePersistentState<MarketingPeriodKey>('roas_filter_marketing_dashboard_period','this_month');
 const [customizing,setCustomizing]=useState(false),[draftMetrics,setDraftMetrics]=useState<MarketingMetricKey[]>([]),[configuringTable,setConfiguringTable]=useState(false);
 const [draftWinningAdsOnlyWithResults,setDraftWinningAdsOnlyWithResults]=useState(true);
 const [showMetaBreakdown,setShowMetaBreakdown]=useState(false);
 useEffect(()=>{if(!integratedClients.some(client=>client.id===clientId))setClientId(integratedClients[0]?.id||'')},[clientId,integratedClients,setClientId]);
 const selectedClient=integratedClients.find(client=>client.id===clientId);
 const clientIntegrations=integrations.filter(item=>item.clientId===clientId);
 const metaAccount=clientIntegrations.find(item=>item.provider==='meta_ads'&&item.agencyConnectionId&&item.resourceId);
 useEffect(()=>{if(providerFilter!=='all'&&clientIntegrations.length&&!clientIntegrations.some(item=>item.provider===providerFilter))setProviderFilter('all')},[clientId,providerFilter,integrations,setProviderFilter]);
 const visibleIntegrations=clientIntegrations.filter(item=>providerFilter==='all'||item.provider===providerFilter);
 const visibleIds=new Set(visibleIntegrations.map(item=>item.id));
 const selectedRange=marketingPeriodRange(normalizeMarketingPeriodKey(periodKey));
 const visibleSnapshots=snapshots.filter(item=>visibleIds.has(item.integrationId)&&item.periodFrom.slice(0,10)===selectedRange.from&&item.periodTo.slice(0,10)===selectedRange.to);
 const {syncing,syncError,refresh}=useMarketingDashboardSync(visibleIntegrations,periodKey);
 const comparison=useMarketingComparison({integrations:visibleIntegrations,range:selectedRange,snapshots:visibleSnapshots,updating:syncing,period:normalizeMarketingPeriodKey(periodKey),currentError:syncError});
 const metrics=visibleSnapshots.length?aggregateMarketingMetrics(visibleSnapshots):emptyMarketingMetrics;
 const preferences=normalizeMarketingDashboardPreferences(storedPreferences);
 const clientPreference=preferences.find(item=>item.clientId===clientId),metricIds=clientPreference?.metricIds||defaultMarketingMetricIds,widgets=clientPreference?.widgets||[],performanceTable=clientPreference?.performanceTable||defaultMarketingPerformanceTable,winningAdsOnlyWithResults=clientPreference?.winningAdsWithResultsOnly??true;
 const pinnedBreakdowns=clientPreference?.pinnedBreakdowns||[];
 const analysisPanels=clientPreference?.analysisPanels||defaultMarketingAnalysisPanels;
 const performanceRows=visibleSnapshots.flatMap(snapshot=>snapshot.performanceRows.map(row=>({...row,key:`${snapshot.integrationId}:${row.level}:${row.id}`}))).filter(row=>row.level===performanceTable.level).sort((a,b)=>metricValue(b,performanceTable.metricIds[0])-metricValue(a,performanceTable.metricIds[0])).slice(0,10);
 const winningAds=visibleSnapshots.filter(snapshot=>snapshot.provider==='meta_ads').flatMap(snapshot=>snapshot.topAds.filter(ad=>/^\d{1,32}$/.test(ad.id)&&(!winningAdsOnlyWithResults||ad.results>0)).map(ad=>({ad,integrationId:snapshot.integrationId,clientId:snapshot.clientId}))).sort((a,b)=>b.ad.results-a.ad.results||a.ad.costPerResult-b.ad.costPerResult||b.ad.spend-a.ad.spend).slice(0,6);
 const period=visibleSnapshots.length?`${date(visibleSnapshots.map(item=>item.periodFrom).sort()[0])} até ${date(visibleSnapshots.map(item=>item.periodTo).sort().at(-1))}`:'Sem período sincronizado';
 const pendingPeriod=visibleIntegrations.some(integration=>!visibleSnapshots.some(snapshot=>snapshot.integrationId===integration.id));
 const openCustomization=()=>{setDraftMetrics([...metricIds]);setDraftWinningAdsOnlyWithResults(winningAdsOnlyWithResults);setCustomizing(true)};
 const toggleMetric=(id:MarketingMetricKey)=>setDraftMetrics(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
 const moveDraftMetric=(index:number,direction:-1|1)=>setDraftMetrics(current=>{const target=index+direction;if(target<0||target>=current.length)return current;const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next});
 const savePreference=(nextMetricIds:MarketingMetricKey[],nextWidgets:MarketingDashboardWidget[],nextTable=performanceTable,nextPinned=pinnedBreakdowns,nextPanels=analysisPanels,nextBreakdownViews=clientPreference?.breakdownVisualizations,nextWinningAdsOnlyWithResults=winningAdsOnlyWithResults)=>{if(!clientId)return;const next:MarketingDashboardPreference={clientId,metricIds:nextMetricIds,widgets:nextWidgets,performanceTable:nextTable,pinnedBreakdowns:nextPinned,analysisPanels:nextPanels,breakdownVisualizations:nextBreakdownViews,winningAdsWithResultsOnly:nextWinningAdsOnlyWithResults,updatedAt:new Date().toISOString()};setPreferences([next,...preferences.filter(item=>item.clientId!==clientId)])};
 const pinBreakdown=(card:PinnedBreakdownMetric)=>{
  if(!pinnedBreakdowns.some(item=>pinnedBreakdownKey(item)===pinnedBreakdownKey(card)))savePreference(metricIds,widgets,performanceTable,[...pinnedBreakdowns,card]);
  if(providerFilter==='google_ads')setProviderFilter('meta_ads');
 };
 const removeBreakdown=(card:PinnedBreakdownMetric)=>savePreference(metricIds,widgets,performanceTable,pinnedBreakdowns.filter(item=>pinnedBreakdownKey(item)!==pinnedBreakdownKey(card)));
 const saveCustomization=()=>{if(!draftMetrics.length)return;savePreference(draftMetrics,widgets,performanceTable,pinnedBreakdowns,analysisPanels,clientPreference?.breakdownVisualizations,draftWinningAdsOnlyWithResults);setCustomizing(false)};
 const saveWidgets=(nextWidgets:MarketingDashboardWidget[])=>savePreference(metricIds,nextWidgets);
 const savePerformanceTable=(nextTable:MarketingPerformanceTablePreference)=>{savePreference(metricIds,widgets,nextTable);setConfiguringTable(false)};

 if(!integratedClients.length)return <main className="marketingDashboardPage"><section className="marketingDashboardHero"><div><span><BarChart3/> DASHBOARD DE MARKETING</span><h2>Conecte a primeira marca</h2><p>Vincule uma conta de anúncios a um cliente para começar a analisar os resultados.</p></div><Link className="btn" to="/marketing/integrations"><PlugZap/> Abrir integrações</Link></section></main>;

 return <main className="marketingDashboardPage marketingClientDashboard">
  <section className="card marketingOverviewHero" aria-labelledby="marketing-client-title">
   <div className="marketingOverviewIdentity">
    <span className="marketingOverviewEyebrow"><BarChart3 aria-hidden="true"/> ANÁLISE DE MÍDIA</span>
    <h2 id="marketing-client-title">{selectedClient?.companyName||'Dashboard de marketing'}</h2>
    <p>Desempenho das contas de anúncios vinculadas ao cliente.</p>
   </div>
   <div className="marketingOverviewActions">
    <Link className="btn secondary" to="/marketing/integrations"><PlugZap aria-hidden="true"/> Gerenciar integrações</Link>
    <Link className="btn" to={`/marketing/reports?client=${encodeURIComponent(clientId)}&create=1`}><FileText aria-hidden="true"/> Criar relatório deste cliente</Link>
   </div>
  </section>
  <section className="card marketingDashboardToolbar marketingOverviewFilters" aria-label="Filtros de marketing">
   <label className="marketingOverviewField"><span>Cliente</span>
    <select aria-label="Cliente do dashboard" value={clientId} onChange={event=>setClientId(event.target.value)}>
     {integratedClients.map(client=><option key={client.id} value={client.id}>{client.companyName}</option>)}
    </select>
   </label>
   <div className="marketingOverviewPlatform">
    <span>Plataforma</span>
    <div className="marketingProviderTabs" role="group" aria-label="Filtrar plataforma">
     {providerOptions.map(option=><button type="button" key={option.id} className={providerFilter===option.id?'active':''} aria-pressed={providerFilter===option.id} disabled={option.id!=='all'&&!clientIntegrations.some(item=>item.provider===option.id)} onClick={()=>setProviderFilter(option.id)}>{option.label}</button>)}
    </div>
   </div>
   <label className="marketingOverviewField"><span>Período</span>
    <span className="marketingOverviewDate"><CalendarRange aria-hidden="true"/>
     <select aria-label="Período do dashboard de marketing" value={normalizeMarketingPeriodKey(periodKey)} onChange={event=>setPeriodKey(event.target.value as MarketingPeriodKey)}>
      {marketingPeriodOptions.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}
     </select>
    </span>
   </label>
   <button className="marketingOverviewRefresh" type="button" onClick={refresh} disabled={syncing}><RefreshCw aria-hidden="true" className={syncing?'spin':undefined}/>{syncing?'Atualizando…':'Atualizar agora'}</button>
  </section>
  {syncError&&<div className="marketingSyncError" role="alert">{syncError}</div>}
  {(syncing||pendingPeriod)&&<p className="dashboardReadingNote marketingPeriodNotice" role="status">{syncing?'Atualizando automaticamente os dados do período selecionado…':'Algumas contas não possuem dados sincronizados neste período. Os totais incluem apenas as contas atualizadas para a data selecionada.'}</p>}
  <section className="marketingOverviewMetrics" aria-labelledby="marketing-metrics-title">
   <div className="marketingOverviewSectionHead">
    <div><h3 id="marketing-metrics-title">Indicadores do período</h3><p><CalendarRange aria-hidden="true"/>{period}</p></div>
    <div className="marketingOverviewMetricActions">
     <MarketingComparisonToggle comparison={comparison}/>
     <button type="button" className="marketingOverviewCustomize" onClick={openCustomization}><Settings2 aria-hidden="true"/> Personalizar métricas</button>
     <button type="button" className="marketingOverviewCustomize" onClick={()=>setShowMetaBreakdown(true)}><Layers3 aria-hidden="true"/> Detalhamento Meta Ads</button>
    </div>
   </div>
   <section aria-busy={syncing} className="marketingRealMetrics marketingSelectableMetrics" aria-label="Métricas selecionadas do cliente">
    {metricIds.map(id=>{
     const definition=marketingMetricCatalog.find(item=>item.id===id)!;
     return <MarketingMetricCard key={id} definition={definition} period={period} value={visibleSnapshots.length?formatMarketingMetric(id,metricValue(metrics,id)):'—'} comparison={comparison}/>;
    })}
    {providerFilter!=='google_ads'&&<MarketingBreakdownCards cards={pinnedBreakdowns} account={metaAccount} range={selectedRange} views={clientPreference?.breakdownVisualizations||{}} onRemove={removeBreakdown} onViewChange={(dimension,view)=>savePreference(metricIds,widgets,performanceTable,pinnedBreakdowns,analysisPanels,{...clientPreference?.breakdownVisualizations,[dimension]:view})}/>}
   </section>
  </section>
  {!visibleSnapshots.length?<section className="card marketingNoData"><BarChart3/><h3>{syncing?'Buscando dados do período…':'Sem dados neste período'}</h3><p>{syncing?'As métricas serão exibidas assim que a consulta terminar.':'Confira a conexão da conta ou tente atualizar novamente. Não exibimos dados de outras datas como se fossem deste período.'}</p>{!syncing&&<Link className="btn" to="/marketing/integrations">Ver integrações</Link>}</section>:<>
   <MarketingAnalysisPanels key={clientId} metrics={metrics} panels={analysisPanels} onChange={next=>savePreference(metricIds,widgets,performanceTable,pinnedBreakdowns,next)}/>
   <section className="card marketingChannelPanel"><div className="marketingPanelHead"><div><h3>Desempenho por canal</h3><p>Compare os canais vinculados a {selectedClient?.companyName}</p></div><Link to="/marketing/integrations">Gerenciar contas <ChevronRight/></Link></div><div className="marketingChannelTable"><div className="marketingChannelHead"><span>Canal</span><span>Investimento</span><span>Cliques</span><span>Conversões</span><span>ROAS</span><span>Atualização</span></div>{visibleSnapshots.map(snapshot=>{const integration=clientIntegrations.find(item=>item.id===snapshot.integrationId),provider=marketingProviders.find(item=>item.id===snapshot.provider);return <article key={snapshot.integrationId}><div><i className={`providerLogo ${snapshot.provider}`}>{provider?.mark}</i><span><b>{provider?.name}</b><small>{integration?.resourceName}</small></span></div><strong>{formatMarketingMetric('spend',snapshot.spend)}</strong><span>{formatMarketingMetric('clicks',snapshot.clicks)}</span><span>{formatMarketingMetric('conversions',snapshot.conversions)}</span><strong>{formatMarketingMetric('roas',snapshot.roas)}</strong><time>{dateTime(snapshot.syncedAt)}</time></article>})}</div></section>
   {providerFilter!=='google_ads'&&clientIntegrations.some(item=>item.provider==='meta_ads')&&<MarketingWinningAds ads={winningAds}/>}
   <section className="card marketingTopAdsPanel marketingPerformanceTablePanel"><div className="marketingPanelHead"><div><h3>Desempenho detalhado</h3><p>Compare campanhas, conjuntos de anúncios e anúncios no período</p></div><button type="button" className="marketingTableSettings" onClick={()=>setConfiguringTable(true)}><SlidersHorizontal/> Configurar tabela</button></div><div className="marketingBreakdownTabs" role="group" aria-label="Nível de detalhamento">{([{id:'campaign',label:'Campanhas'},{id:'adset',label:'Conjuntos de anúncios'},{id:'ad',label:'Anúncios'}] as Array<{id:MarketingPerformanceLevel;label:string}>).map(option=><button type="button" className={performanceTable.level===option.id?'active':''} aria-pressed={performanceTable.level===option.id} key={option.id} onClick={()=>savePreference(metricIds,widgets,{...performanceTable,level:option.id})}>{option.label}</button>)}</div>{performanceRows.length?<PerformanceTable rows={performanceRows} metricIds={performanceTable.metricIds}/>:<div className="marketingTopAdsEmpty"><Layers3/><b>Sincronize novamente para carregar este detalhamento</b><span>A próxima sincronização da Meta Ads trará campanhas, conjuntos e anúncios.</span></div>}</section>
  </>}
  <MarketingDashboardWidgets metrics={metrics} widgets={widgets} onChange={saveWidgets} metaAccount={providerFilter==='google_ads'?undefined:metaAccount} range={selectedRange} hasMetrics={visibleSnapshots.length>0}/>
  {customizing&&<MarketingMetricsModal clientName={selectedClient?.companyName||'cliente'} selected={draftMetrics} onToggle={toggleMetric} onMove={moveDraftMetric} onRestoreDefaults={()=>setDraftMetrics([...defaultMarketingMetricIds])} winningAdsOnlyWithResults={draftWinningAdsOnlyWithResults} onWinningAdsOnlyWithResultsChange={setDraftWinningAdsOnlyWithResults} onSave={saveCustomization} onClose={()=>setCustomizing(false)}/>}
  {configuringTable&&<PerformanceTableModal initial={performanceTable} onClose={()=>setConfiguringTable(false)} onSave={savePerformanceTable}/>}
  {showMetaBreakdown&&<MetaBreakdownDialog account={metaAccount} clientName={selectedClient?.companyName} range={selectedRange} onClose={()=>setShowMetaBreakdown(false)} pinned={pinnedBreakdowns} onPin={pinBreakdown}/>}
 </main>;
}

function MarketingMetricsModal({clientName,selected,onToggle,onMove,onRestoreDefaults,winningAdsOnlyWithResults,onWinningAdsOnlyWithResultsChange,onSave,onClose}:{clientName:string;selected:MarketingMetricKey[];onToggle:(id:MarketingMetricKey)=>void;onMove:(index:number,direction:-1|1)=>void;onRestoreDefaults:()=>void;winningAdsOnlyWithResults:boolean;onWinningAdsOnlyWithResultsChange:(value:boolean)=>void;onSave:()=>void;onClose:()=>void}){
 const [query,setQuery]=useState(''),[category,setCategory]=useState<MarketingMetricCategory|'Todas'>('Todas');
 const dialogRef=useAccessibleDialog<HTMLDivElement>({open:true,onClose});
 const categories=useMemo(()=>['Todas',...new Set(marketingMetricCatalog.map(metric=>metric.category))] as Array<MarketingMetricCategory|'Todas'>,[]);
 const visibleMetrics=useMemo(()=>{
  const normalized=query.trim().toLocaleLowerCase('pt-BR');
  return marketingMetricCatalog.filter(metric=>(category==='Todas'||metric.category===category)&&(!normalized||`${metric.label} ${metric.description} ${metric.category}`.toLocaleLowerCase('pt-BR').includes(normalized)));
 },[category,query]);
 const orderedMetrics=selected.map(id=>marketingMetricCatalog.find(metric=>metric.id===id)).filter((metric):metric is typeof marketingMetricCatalog[number]=>Boolean(metric));
 return <div className="overlay marketingMetricsOverlay"><section ref={dialogRef} tabIndex={-1} className="modal marketingMetricsModal marketingMetricsStudio" role="dialog" aria-modal="true" aria-label="Personalizar métricas">
  <header className="marketingMetricsStudioHead"><div><span className="marketingMetricsEyebrow"><Settings2 aria-hidden="true"/> DASHBOARD DE {clientName.toUpperCase()}</span><h2>Personalizar métricas</h2><p>Escolha os indicadores, organize a ordem e ajuste como os anúncios vencedores são exibidos.</p></div><button type="button" className="iconBtn" aria-label="Fechar personalização" onClick={onClose}><X/></button></header>
  <div className="marketingMetricsStudioSummary"><span><b>{selected.length}</b> {selected.length===1?'métrica selecionada':'métricas selecionadas'}</span><small>A ordem à direita define a ordem dos cartões no dashboard.</small></div>
  <div className="marketingMetricsStudioGrid">
   <section className="marketingMetricLibrary" aria-labelledby="marketing-metric-library-title">
    <header><div><h3 id="marketing-metric-library-title">Biblioteca de métricas</h3><p>Pesquise e marque os indicadores que deseja acompanhar.</p></div><span>{visibleMetrics.length} disponíveis</span></header>
    <label className="marketingMetricSearch"><Search aria-hidden="true"/><input aria-label="Buscar métrica" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por nome ou descrição"/>{query&&<button type="button" aria-label="Limpar busca" onClick={()=>setQuery('')}><X/></button>}</label>
    <div className="marketingMetricCategories" role="group" aria-label="Filtrar categoria de métricas">{categories.map(item=><button type="button" key={item} aria-pressed={category===item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div>
    <div className="marketingMetricLibraryList">{visibleMetrics.map(metric=>{const isSelected=selected.includes(metric.id);return <label className={`marketingMetricOption${isSelected?' selected':''}`} key={metric.id}><input type="checkbox" checked={isSelected} onChange={()=>onToggle(metric.id)}/><span><b>{metric.label}</b><small>{metric.description}</small><em>{metric.category}</em></span><i aria-hidden="true">{isSelected?'No dashboard':'Adicionar'}</i></label>})}{!visibleMetrics.length&&<div className="marketingMetricEmpty"><Search/><b>Nenhuma métrica encontrada</b><span>Tente outra busca ou escolha outra categoria.</span></div>}</div>
   </section>
   <section className="marketingMetricOrder marketingMetricOrderStudio" aria-labelledby="marketing-metric-order-title">
    <header><div><h3 id="marketing-metric-order-title">No seu dashboard</h3><p>Reordene ou remova cartões.</p></div><span>{orderedMetrics.length}</span></header>
    {orderedMetrics.length?<ol>{orderedMetrics.map((metric,index)=><li key={metric.id}><span className="marketingMetricOrderNumber">{String(index+1).padStart(2,'0')}</span><div><b>{metric.label}</b><small>{metric.category}</small></div><span className="marketingMetricOrderActions"><button type="button" aria-label={`Mover ${metric.label} para cima`} onClick={()=>onMove(index,-1)} disabled={!index}><ArrowUp/></button><button type="button" aria-label={`Mover ${metric.label} para baixo`} onClick={()=>onMove(index,1)} disabled={index===orderedMetrics.length-1}><ArrowDown/></button><button type="button" aria-label={`Remover ${metric.label}`} onClick={()=>onToggle(metric.id)}><X/></button></span></li>)}</ol>:<div className="marketingMetricEmpty"><BarChart3/><b>Seu dashboard está vazio</b><span>Adicione métricas pela biblioteca ao lado.</span></div>}
    <label className="marketingWinningAdsPreference"><input type="checkbox" checked={winningAdsOnlyWithResults} onChange={event=>onWinningAdsOnlyWithResultsChange(event.target.checked)}/><span><b>Somente anúncios com resultados</b><small>Filtra anúncios sem conversas iniciadas, leads ou outros resultados atribuídos.</small></span></label>
   </section>
  </div>
  <footer className="marketingMetricsStudioFooter"><button type="button" className="btn secondary" onClick={onRestoreDefaults}>Restaurar padrão</button><span>{selected.length} no dashboard</span><div><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button type="button" className="btn" disabled={!selected.length} onClick={onSave}>Salvar personalização</button></div></footer>
 </section></div>;
}

function PerformanceTable({rows,metricIds}:{rows:Array<MarketingPerformanceRow&{key:string}>;metricIds:MarketingMetricKey[]}){const columns=`minmax(240px,1.8fr) repeat(${metricIds.length},minmax(105px,.8fr))`;return <div className="marketingTopAdsTable marketingPerformanceTable"><div className="marketingTopAdsHead" style={{gridTemplateColumns:columns}}><span>Nome</span>{metricIds.map(id=>{const definition=marketingMetricCatalog.find(metric=>metric.id===id)!;return <span key={id}>{definition.label}<MetricHelp label={definition.label} description={`${definition.description}. Valores do período sincronizado, para o nível de detalhamento selecionado.`}/></span>})}</div>{rows.map((row,index)=><article key={row.key} style={{gridTemplateColumns:columns}}><div><i>{index+1}</i><span><b>{row.name}</b><small>{performanceContext(row)}</small></span></div>{metricIds.map(id=><span key={id}>{formatMarketingMetric(id,metricValue(row,id))}</span>)}</article>)}</div>}
function performanceContext(row:MarketingPerformanceRow){if(row.level==='campaign')return 'Campanha';if(row.level==='adset')return row.campaignName||'Campanha não informada';return [row.campaignName,row.adSetName].filter(Boolean).join(' · ')||'Origem não informada'}
function PerformanceTableModal({initial,onClose,onSave}:{initial:MarketingPerformanceTablePreference;onClose:()=>void;onSave:(value:MarketingPerformanceTablePreference)=>void}){const [level,setLevel]=useState(initial.level),[selected,setSelected]=useState([...initial.metricIds]),[search,setSearch]=useState('');const dialogRef=useAccessibleDialog<HTMLDivElement>({open:true,onClose});const query=search.trim().toLocaleLowerCase('pt-BR'),visible=marketingMetricCatalog.filter(metric=>!query||`${metric.label} ${metric.category}`.toLocaleLowerCase('pt-BR').includes(query));const toggle=(id:MarketingMetricKey)=>setSelected(current=>current.includes(id)?current.filter(item=>item!==id):current.length<6?[...current,id]:current);return <div className="overlay"><div ref={dialogRef} tabIndex={-1} className="modal marketingWidgetModal marketingTableModal" role="dialog" aria-modal="true" aria-label="Configurar tabela de desempenho"><div className="modalHead"><div><small>DETALHAMENTO DA MÍDIA</small><h2>Configurar tabela</h2><p>Escolha o nível de análise e até seis colunas de métricas.</p></div><button type="button" className="iconBtn" aria-label="Fechar" onClick={onClose}><X/></button></div><form onSubmit={event=>{event.preventDefault();if(selected.length)onSave({level,metricIds:selected})}}><fieldset className="marketingWidgetTypes"><legend>Mostrar dados por</legend><div>{([{id:'campaign',label:'Campanhas'},{id:'adset',label:'Conjuntos'},{id:'ad',label:'Anúncios'}] as Array<{id:MarketingPerformanceLevel;label:string}>).map(option=><label className={level===option.id?'selected':''} key={option.id}><input type="radio" checked={level===option.id} onChange={()=>setLevel(option.id)}/><span><Layers3/></span><b>{option.label}</b><small>Nível da conta de anúncios</small></label>)}</div></fieldset><div className="marketingWidgetMetricHead"><div><b>Colunas da tabela</b><small>{selected.length}/6 selecionadas</small></div><label><Search/><input aria-label="Buscar coluna da tabela" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar métrica..."/></label></div><div className="marketingWidgetMetrics">{visible.map(metric=><label className={selected.includes(metric.id)?'selected':''} key={metric.id}><input type="checkbox" checked={selected.includes(metric.id)} onChange={()=>toggle(metric.id)}/><span><b>{metric.label}</b><small>{metric.category}</small></span></label>)}</div><div className="formActions"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn" disabled={!selected.length}>Salvar tabela</button></div></form></div></div>}
const date=(value?:string)=>value?new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR'):'—';
const dateTime=(value?:string)=>value?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
