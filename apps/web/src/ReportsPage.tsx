import {useEffect,useMemo,useState} from 'react';
import {CalendarDays,CheckCircle2,Copy,Eye,FileText,Plus,Search,Send,Trash2,X} from 'lucide-react';
import {filterReports,type ReportPeriodFilter,type ReportStatusFilter} from './report-filters';
import {useStoreData} from './app/useStoreData';
import type {Client,GenericItem} from './types';
import {usePersistentState} from './persistent-ui';
import {defaultMarketingMetricIds,formatMarketingMetric,marketingMetricCatalog,metricValue,normalizeMarketingMetricIds,type MarketingMetricKey} from './marketing-dashboard-config';
import {normalizeClientMarketingIntegrations,type ClientMarketingIntegration} from './marketing-integrations';
import {aggregateMarketingMetrics,normalizeMarketingMetricsSnapshots,type MarketingMetricsSnapshot} from './marketing-metrics';
import './marketing-metrics.css';

interface MarketingReport extends GenericItem{
 metricIds?:MarketingMetricKey[];
 metricValues?:Partial<Record<MarketingMetricKey,number>>;
 periodFrom?:string;
 periodTo?:string;
 providers?:string[];
}

function currency(n=0){return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function displayDate(value?:string){return value?new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR'):'—'}

export default function ReportsPage(){
 const [reports,setReports]=useStoreData<MarketingReport[]>('reports',[]);
 const [clients]=useStoreData<Client[]>('clients',[]);
 const [storedIntegrations]=useStoreData<ClientMarketingIntegration[]>('client_marketing_integrations',[]);
 const [storedMetrics]=useStoreData<MarketingMetricsSnapshot[]>('marketing_metrics',[]);
 const [query,setQuery]=usePersistentState('roas_filter_reports_query','');
 const [statusFilter,setStatusFilter]=usePersistentState<ReportStatusFilter>('roas_filter_reports_status','all');
 const [periodFilter,setPeriodFilter]=usePersistentState<ReportPeriodFilter>('roas_filter_reports_period','this_month');
 const [modal,setModal]=useState(false);
 const [viewing,setViewing]=useState<MarketingReport|null>(null);
 const integrations=useMemo(()=>normalizeClientMarketingIntegrations(storedIntegrations).filter(item=>item.status==='connected'&&(item.provider==='meta_ads'||item.provider==='google_ads')),[storedIntegrations]);
 const metricsSnapshots=useMemo(()=>normalizeMarketingMetricsSnapshots(storedMetrics),[storedMetrics]);
 const syncedClientIds=useMemo(()=>new Set(metricsSnapshots.filter(snapshot=>integrations.some(item=>item.id===snapshot.integrationId)).map(snapshot=>snapshot.clientId)),[integrations,metricsSnapshots]);
 const reportClients=useMemo(()=>clients.filter(client=>client.status==='active'&&syncedClientIds.has(client.id)),[clients,syncedClientIds]);
 const requestedClient=new URLSearchParams(location.search).get('client')||'';
 const [reportClientId,setReportClientId]=useState(''),[draftMetricIds,setDraftMetricIds]=useState<MarketingMetricKey[]>([...defaultMarketingMetricIds]);
 useEffect(()=>{if(requestedClient&&reportClients.some(client=>client.id===requestedClient)){setReportClientId(requestedClient);setModal(true);history.replaceState({},'',location.pathname)}},[reportClients,requestedClient]);
 const selectedReportClientId=reportClientId||reportClients[0]?.id||'';
 const reportSnapshots=metricsSnapshots.filter(snapshot=>snapshot.clientId===selectedReportClientId&&integrations.some(item=>item.id===snapshot.integrationId));
 const reportMetrics=reportSnapshots.length?aggregateMarketingMetrics(reportSnapshots):null;
 const reportPeriod=periodLabel(reportSnapshots.map(item=>item.periodFrom).sort()[0],reportSnapshots.map(item=>item.periodTo).sort().at(-1));
 const filtered=useMemo(
  ()=>filterReports(reports,query,statusFilter,periodFilter),
  [periodFilter,query,reports,statusFilter],
 );
 const filtersActive=Boolean(query.trim())||statusFilter!=='all'||periodFilter!=='all';

 const save=(next:MarketingReport[])=>{
  setReports(next);
 };
 const clearFilters=()=>{
  setQuery('');
  setStatusFilter('all');
  setPeriodFilter('all');
 };
 const openCreate=()=>{setReportClientId(reportClients[0]?.id||'');setDraftMetricIds([...defaultMarketingMetricIds]);setModal(true)};
 const toggleMetric=(id:MarketingMetricKey)=>setDraftMetricIds(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
 const create=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const selectedSnapshots=metricsSnapshots.filter(snapshot=>snapshot.clientId===selectedReportClientId&&integrations.some(item=>item.id===snapshot.integrationId));
  const selectedMetrics=aggregateMarketingMetrics(selectedSnapshots);
  const report:MarketingReport={
   id:crypto.randomUUID(),
   name:String(form.get('name')),
   clientId:selectedReportClientId,
   status:'Pendente',
   date:String(form.get('date')),
   description:String(form.get('description')),
   category:reportPeriod,
   createdAt:new Date().toISOString(),
   updatedAt:new Date().toISOString(),
   metricIds:normalizeMarketingMetricIds(draftMetricIds),
   metricValues:Object.fromEntries(draftMetricIds.map(id=>[id,metricValue(selectedMetrics,id)])),
   periodFrom:selectedSnapshots.map(item=>item.periodFrom).sort()[0],
   periodTo:selectedSnapshots.map(item=>item.periodTo).sort().at(-1),
   providers:[...new Set(selectedSnapshots.map(item=>item.provider))],
  };
  save([report,...reports]);
  setModal(false);
 };
 const sent=reports.filter(report=>report.status==='Enviado').length;

 return <main>
  <div className="reportsHeader">
   <div><h2>Relatórios</h2><p>Crie, acompanhe e compartilhe os resultados dos seus clientes.</p></div>
   <button className="btn" onClick={openCreate} disabled={!reportClients.length}><Plus/> Criar relatório</button>
  </div>

  {!reportClients.length&&<section className="marketingDataNotice"><FileText/><div><b>Nenhum cliente sincronizado</b><span>Vincule e sincronize uma conta de anúncios antes de criar relatórios de performance.</span></div></section>}

  <div className="reportStats">
   <article><FileText/><span><small>Relatórios criados</small><strong>{reports.length}</strong></span></article>
   <article><Send/><span><small>Relatórios enviados</small><strong>{sent}</strong></span></article>
   <article><CalendarDays/><span><small>Pendentes</small><strong>{reports.filter(report=>report.status==='Pendente').length}</strong></span></article>
   <article><CheckCircle2/><span><small>Taxa de envio</small><strong>{reports.length?Math.round(sent/reports.length*100):0}%</strong></span></article>
  </div>

  <section className="card reportsPanel">
   <div className="reportsTools">
    <div className="memberSearch">
     <Search/>
     <input aria-label="Buscar relatório" placeholder="Buscar relatório..." value={query} onChange={event=>setQuery(event.target.value)}/>
    </div>
    <select aria-label="Filtrar relatórios por status" className="reportsFilter" value={statusFilter} onChange={event=>setStatusFilter(event.target.value as ReportStatusFilter)}>
     <option value="all">Todos os status</option>
     <option value="pending">Pendentes</option>
     <option value="sent">Enviados</option>
    </select>
    <select aria-label="Filtrar relatórios por período" className="reportsFilter" value={periodFilter} onChange={event=>setPeriodFilter(event.target.value as ReportPeriodFilter)}>
     <option value="this_month">Este mês</option>
     <option value="last_month">Mês passado</option>
     <option value="last_3_months">Últimos 3 meses</option>
     <option value="all">Todo o período</option>
    </select>
    <span className="reportsResultCount">{filtered.length} de {reports.length} relatórios</span>
    {filtersActive&&<button className="reportsClearFilters" onClick={clearFilters}>Limpar filtros</button>}
   </div>

   <div className="reportTable">
    <div className="reportTableHead"><span>Relatório</span><span>Cliente</span><span>Período</span><span>Status</span><span>Atualização</span><span/></div>
    {filtered.map(report=>{
     const client=clients.find(item=>item.id===report.clientId);
     return <article className="reportRow" key={report.id}>
      <div className="reportName"><i><FileText/></i><span><b>{report.name}</b><small>{report.description||'Relatório de desempenho'}</small></span></div>
      <span>{client?.companyName||'—'}</span>
      <span>{report.category||'—'}</span>
      <span className={'badge '+(report.status==='Enviado'?'green':'orange')}>{report.status}</span>
      <span>{displayDate(report.date)}</span>
      <div className="reportActions">
       <button className="iconBtn" title="Visualizar" onClick={()=>setViewing(report)}><Eye/></button>
       <button className="iconBtn" title="Duplicar" onClick={()=>save([{...report,id:crypto.randomUUID(),name:`Cópia — ${report.name}`,status:'Pendente',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},...reports])}><Copy/></button>
       <button className="iconBtn" title="Enviar" onClick={()=>save(reports.map(item=>item.id===report.id?{...item,status:'Enviado',updatedAt:new Date().toISOString()}:item))}><Send/></button>
       <button className="iconBtn memberDelete" title="Excluir" onClick={()=>{if(confirm('Excluir relatório?'))save(reports.filter(item=>item.id!==report.id))}}><Trash2/></button>
      </div>
     </article>;
    })}
    {!filtered.length&&<div className="reportsEmpty">
     <FileText/>
     <strong>Nenhum relatório encontrado</strong>
     <span>Ajuste os filtros para visualizar outros registros.</span>
     {filtersActive&&<button onClick={clearFilters}>Limpar filtros</button>}
    </div>}
   </div>
  </section>

  {modal&&<div className="overlay"><div className="modal marketingReportModal">
   <div className="modalHead"><div><small>NOVO RELATÓRIO</small><h2>Criar relatório</h2></div><button className="iconBtn" onClick={()=>setModal(false)}><X/></button></div>
   <form className="form" onSubmit={create}>
    <label className="full">Nome do relatório<input name="name" required placeholder="Ex.: Performance mensal — Cliente"/></label>
    <label>Cliente integrado<select name="client" required value={selectedReportClientId} onChange={event=>setReportClientId(event.target.value)}>{reportClients.map(client=><option value={client.id} key={client.id}>{client.companyName}</option>)}</select></label>
    <div className="marketingReportPeriod"><small>Período dos dados sincronizados</small><strong>{reportPeriod}</strong></div>
    <label className="full">Data de referência<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></label>
    <fieldset className="marketingReportMetrics full"><legend>Métricas do relatório</legend><p>Selecione os indicadores sincronizados que entrarão neste relatório.</p><div>{marketingMetricCatalog.map(metric=><label className={draftMetricIds.includes(metric.id)?'selected':''} key={metric.id}><input type="checkbox" checked={draftMetricIds.includes(metric.id)} onChange={()=>toggleMetric(metric.id)}/><span><b>{metric.label}</b>{reportMetrics&&<small>{formatMarketingMetric(metric.id,metricValue(reportMetrics,metric.id))}</small>}</span></label>)}</div></fieldset>
    <label className="full">Resumo<textarea name="description" placeholder="Principais resultados e observações"/></label>
    <div className="formActions full"><button type="button" className="btn secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn" disabled={!draftMetricIds.length||!reportSnapshots.length}>Criar relatório</button></div>
   </form>
  </div></div>}

  {viewing&&<div className="overlay"><article className="reportPreview">
   <button className="iconBtn previewClose" onClick={()=>setViewing(null)}><X/></button>
   <header><span>AGÊNCIA ROAS</span><h1>{viewing.name}</h1><p>{clients.find(client=>client.id===viewing.clientId)?.companyName} · {viewing.category||'Mensal'}</p></header>
   <div className="previewMetrics">{reportPreviewMetrics(viewing as MarketingReport).map(item=><div key={item[0]}><small>{item[0]}</small><b>{item[1]}</b></div>)}</div>
   <section><h3>Resumo executivo</h3><p>{viewing.description||'Nenhum resumo registrado.'}</p></section>
   <footer><button className="btn secondary" onClick={()=>setViewing(null)}>Fechar</button><button className="btn" onClick={()=>{save(reports.map(report=>report.id===viewing.id?{...report,status:'Enviado'}:report));setViewing(null)}}><Send/> Marcar como enviado</button></footer>
  </article></div>}
 </main>;
}

function reportPreviewMetrics(report:MarketingReport):Array<[string,string]>{
 const ids=report.metricIds&&report.metricValues?normalizeMarketingMetricIds(report.metricIds):[];
 if(ids.length)return ids.map(id=>[marketingMetricCatalog.find(metric=>metric.id===id)?.label||id,formatMarketingMetric(id,Number(report.metricValues?.[id])||0)]);
 return [['Status',report.status],['Data',displayDate(report.date)],['Período',report.category||'—'],['Valor',report.value?currency(report.value):'—']];
}

function periodLabel(from?:string,to?:string){return from&&to?`${displayDate(from)} até ${displayDate(to)}`:'Sem período sincronizado'}
