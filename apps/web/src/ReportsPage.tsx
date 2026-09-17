import {useEffect,useMemo,useState} from 'react';
import {BarChart3,CalendarDays,CheckCircle2,Copy,Eye,FileText,Mail,MessageCircle,Plus,Printer,Search,Send,Share2,Sparkles,Trash2,X} from 'lucide-react';
import {filterReports,type ReportPeriodFilter,type ReportStatusFilter} from './report-filters';
import {useStoreData} from './app/useStoreData';
import type {Client,GenericItem} from './types';
import {usePersistentState} from './persistent-ui';
import {defaultMarketingMetricIds,formatMarketingMetric,marketingMetricCatalog,metricValue,normalizeMarketingMetricIds,type MarketingMetricKey} from './marketing-dashboard-config';
import {normalizeClientMarketingIntegrations,type ClientMarketingIntegration} from './marketing-integrations';
import {aggregateMarketingMetrics,normalizeMarketingMetricsSnapshots,type MarketingMetricsSnapshot} from './marketing-metrics';
import {buildReportShareText,reportEmailUrl,reportWhatsAppUrl} from './report-sharing';
import './marketing-metrics.css';
import './report-client.css';

interface MarketingReport extends GenericItem{
 metricIds?:MarketingMetricKey[];
 metricValues?:Partial<Record<MarketingMetricKey,number>>;
 periodFrom?:string;
 periodTo?:string;
 providers?:string[];
 recipientEmail?:string;
 recipientPhone?:string;
 recommendations?:string;
 overviewValues?:Partial<Record<MarketingMetricKey,number>>;
}

interface GeneralSettings{agencyName?:string;logoDataUrl?:string;email?:string;phone?:string;website?:string}

function currency(n=0){return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function displayDate(value?:string){return value?new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR'):'—'}

export default function ReportsPage(){
 const [reports,setReports]=useStoreData<MarketingReport[]>('reports',[]);
 const [clients]=useStoreData<Client[]>('clients',[]);
 const [storedIntegrations]=useStoreData<ClientMarketingIntegration[]>('client_marketing_integrations',[]);
 const [storedMetrics]=useStoreData<MarketingMetricsSnapshot[]>('marketing_metrics',[]);
 const [agencySettings]=useStoreData<GeneralSettings>('general_settings',{});
 const [query,setQuery]=usePersistentState('roas_filter_reports_query','');
 const [statusFilter,setStatusFilter]=usePersistentState<ReportStatusFilter>('roas_filter_reports_status','all');
 const [periodFilter,setPeriodFilter]=usePersistentState<ReportPeriodFilter>('roas_filter_reports_period','this_month');
 const [modal,setModal]=useState(false);
 const [viewing,setViewing]=useState<MarketingReport|null>(null);
 const [sharing,setSharing]=useState<MarketingReport|null>(null),[shareNotice,setShareNotice]=useState('');
 const integrations=useMemo(()=>normalizeClientMarketingIntegrations(storedIntegrations).filter(item=>item.status==='connected'&&(item.provider==='meta_ads'||item.provider==='google_ads')),[storedIntegrations]);
 const metricsSnapshots=useMemo(()=>normalizeMarketingMetricsSnapshots(storedMetrics),[storedMetrics]);
 const syncedClientIds=useMemo(()=>new Set(metricsSnapshots.filter(snapshot=>integrations.some(item=>item.id===snapshot.integrationId)).map(snapshot=>snapshot.clientId)),[integrations,metricsSnapshots]);
 const reportClients=useMemo(()=>clients.filter(client=>client.status==='active'&&syncedClientIds.has(client.id)),[clients,syncedClientIds]);
 const requestedClient=new URLSearchParams(location.search).get('client')||'';
 const [reportClientId,setReportClientId]=useState(''),[draftMetricIds,setDraftMetricIds]=useState<MarketingMetricKey[]>([...defaultMarketingMetricIds]);
 useEffect(()=>{if(requestedClient&&reportClients.some(client=>client.id===requestedClient)){setReportClientId(requestedClient);setModal(true);history.replaceState({},'',location.pathname)}},[reportClients,requestedClient]);
 const selectedReportClientId=reportClientId||reportClients[0]?.id||'';
 const selectedReportClient=reportClients.find(client=>client.id===selectedReportClientId);
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
  const client=clients.find(item=>item.id===selectedReportClientId),allMetricIds=marketingMetricCatalog.map(metric=>metric.id);
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
   recipientEmail:String(form.get('recipientEmail')||client?.email||''),
   recipientPhone:String(form.get('recipientPhone')||client?.phone||''),
   recommendations:String(form.get('recommendations')||''),
   overviewValues:Object.fromEntries(allMetricIds.map(id=>[id,metricValue(selectedMetrics,id)])),
  };
  save([report,...reports]);
  setModal(false);
 };
 const markSent=(report:MarketingReport)=>save(reports.map(item=>item.id===report.id?{...item,status:'Enviado',updatedAt:new Date().toISOString()}:item));
 const sharePayload=(report:MarketingReport)=>{const client=clients.find(item=>item.id===report.clientId);return buildReportShareText({name:report.name,clientName:client?.companyName||'Cliente',period:report.category||'Período do relatório',description:report.description,recommendations:report.recommendations,metricIds:report.metricIds?.length?normalizeMarketingMetricIds(report.metricIds):[],metricValues:report.metricValues||{},agencyName:agencySettings.agencyName||'Agência ROAS'})};
 const copyReport=async(report:MarketingReport)=>{try{await navigator.clipboard.writeText(sharePayload(report));setShareNotice('Resumo copiado. Já pode colar na conversa com o cliente.')}catch{setShareNotice('Não foi possível copiar automaticamente. Tente pelo compartilhamento do dispositivo.')}setTimeout(()=>setShareNotice(''),3200)};
 const nativeShare=async(report:MarketingReport)=>{if(!navigator.share){await copyReport(report);return}try{await navigator.share({title:report.name,text:sharePayload(report)});markSent(report);setSharing(null)}catch(error){if((error as DOMException).name!=='AbortError')setShareNotice('Não foi possível abrir o compartilhamento.') }};
 const openEmail=(report:MarketingReport)=>{location.href=reportEmailUrl(report.recipientEmail||'',report.name,sharePayload(report));markSent(report);setSharing(null)};
 const openWhatsApp=(report:MarketingReport)=>{window.open(reportWhatsAppUrl(sharePayload(report),report.recipientPhone),'_blank','noopener,noreferrer');markSent(report);setSharing(null)};
 const printReport=(report:MarketingReport)=>{setViewing(report);setSharing(null);setTimeout(()=>window.print(),120)};
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
       <button className="iconBtn" title="Compartilhar" onClick={()=>setSharing(report)}><Share2/></button>
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
    <div className="reportRecipientFields full"><label>E-mail do cliente<input name="recipientEmail" type="email" key={`${selectedReportClientId}-email`} defaultValue={selectedReportClient?.email||''} placeholder="cliente@empresa.com"/></label><label>WhatsApp do cliente<input name="recipientPhone" key={`${selectedReportClientId}-phone`} defaultValue={selectedReportClient?.phone||''} placeholder="(00) 00000-0000"/></label></div>
    <fieldset className="marketingReportMetrics full"><legend>Métricas do relatório</legend><p>Selecione os indicadores sincronizados que entrarão neste relatório.</p><div>{marketingMetricCatalog.map(metric=><label className={draftMetricIds.includes(metric.id)?'selected':''} key={metric.id}><input type="checkbox" checked={draftMetricIds.includes(metric.id)} onChange={()=>toggleMetric(metric.id)}/><span><b>{metric.label}</b>{reportMetrics&&<small>{formatMarketingMetric(metric.id,metricValue(reportMetrics,metric.id))}</small>}</span></label>)}</div></fieldset>
    <label className="full">Resumo executivo<textarea name="description" placeholder="Explique os principais resultados de forma simples para o cliente."/></label>
    <label className="full">Próximos passos<textarea name="recommendations" placeholder="Ex.: escalar os melhores anúncios, testar novos criativos e revisar públicos."/></label>
    <div className="formActions full"><button type="button" className="btn secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn" disabled={!draftMetricIds.length||!reportSnapshots.length}>Criar relatório</button></div>
   </form>
  </div></div>}

  {viewing&&<div className="overlay reportPreviewOverlay"><div className="reportPreviewShell"><div className="reportPreviewToolbar"><div><b>Pré-visualização do cliente</b><span>Este é o documento que será compartilhado.</span></div><div><button className="btn secondary" onClick={()=>window.print()}><Printer/> Salvar em PDF</button><button className="btn" onClick={()=>setSharing(viewing)}><Share2/> Compartilhar</button><button className="iconBtn" aria-label="Fechar pré-visualização" onClick={()=>setViewing(null)}><X/></button></div></div><article className="reportPreview reportClientDocument">
   <header className="reportDocumentHeader"><div className="reportAgencyBrand">{agencySettings.logoDataUrl?.startsWith('data:image/')?<img src={agencySettings.logoDataUrl} alt="Logo da agência"/>:<span>{(agencySettings.agencyName||'ROAS').slice(0,1)}</span>}<div><b>{agencySettings.agencyName||'Agência ROAS'}</b><small>Relatório de performance</small></div></div><div className="reportDocumentMeta"><small>EMITIDO EM</small><b>{displayDate(viewing.date)}</b></div></header>
   <section className="reportDocumentCover"><span>RELATÓRIO DE RESULTADOS</span><h1>{viewing.name}</h1><p>{clients.find(client=>client.id===viewing.clientId)?.companyName||'Cliente'} · {viewing.category||'Período não informado'}</p><div>{(viewing.providers||[]).map(provider=><i key={provider}>{provider==='meta_ads'?'Meta Ads':provider==='google_ads'?'Google Ads':provider}</i>)}</div></section>
   <section className="reportDocumentSection"><div className="reportSectionHeading"><span><Sparkles/></span><div><small>VISÃO GERAL</small><h2>Principais indicadores</h2></div></div><div className="previewMetrics">{reportPreviewMetrics(viewing).map(item=><div key={item[0]}><small>{item[0]}</small><b>{item[1]}</b></div>)}</div></section>
   <section className="reportDocumentSection reportExecutiveGrid"><div><div className="reportSectionHeading"><span><FileText/></span><div><small>ANÁLISE</small><h2>Resumo executivo</h2></div></div><p>{viewing.description||'Os resultados do período estão apresentados nos indicadores acima.'}</p></div><div><div className="reportSectionHeading"><span><CheckCircle2/></span><div><small>PLANO DE AÇÃO</small><h2>Próximos passos</h2></div></div><p>{viewing.recommendations||'Manter o acompanhamento das campanhas e otimizar as oportunidades identificadas.'}</p></div></section>
   <section className="reportDocumentSection reportResultsJourney"><div className="reportSectionHeading"><span><BarChart3/></span><div><small>JORNADA</small><h2>Da entrega ao resultado</h2></div></div><ReportFunnel report={viewing}/></section>
   <footer className="reportDocumentFooter"><div><b>{agencySettings.agencyName||'Agência ROAS'}</b><span>{[agencySettings.email,agencySettings.phone,agencySettings.website].filter(Boolean).join(' · ')}</span></div><small>Dados consolidados automaticamente pelo Flow ROAS</small></footer>
  </article></div></div>}

  {sharing&&<div className="overlay"><div className="modal reportShareModal" role="dialog" aria-label="Compartilhar relatório"><div className="modalHead"><div><small>ENVIAR AO CLIENTE</small><h2>Compartilhar relatório</h2><p>Escolha como deseja entregar “{sharing.name}”.</p></div><button className="iconBtn" aria-label="Fechar" onClick={()=>setSharing(null)}><X/></button></div><div className="reportShareClient"><span>{clients.find(client=>client.id===sharing.clientId)?.companyName?.slice(0,1)||'C'}</span><div><b>{clients.find(client=>client.id===sharing.clientId)?.companyName}</b><small>{sharing.recipientEmail||'E-mail não informado'} · {sharing.recipientPhone||'WhatsApp não informado'}</small></div></div><div className="reportShareOptions"><button type="button" onClick={()=>openWhatsApp(sharing)}><span className="whatsapp"><MessageCircle/></span><div><b>Enviar pelo WhatsApp</b><small>Abre uma mensagem pronta para o cliente</small></div></button><button type="button" onClick={()=>openEmail(sharing)}><span className="email"><Mail/></span><div><b>Enviar por e-mail</b><small>Abre seu aplicativo com assunto e resumo</small></div></button><button type="button" onClick={()=>void nativeShare(sharing)}><span className="share"><Share2/></span><div><b>Compartilhar pelo dispositivo</b><small>Use os aplicativos disponíveis no computador ou celular</small></div></button><button type="button" onClick={()=>void copyReport(sharing)}><span className="copy"><Copy/></span><div><b>Copiar resumo</b><small>Copia indicadores e observações formatados</small></div></button><button type="button" onClick={()=>printReport(sharing)}><span className="print"><Printer/></span><div><b>Salvar ou imprimir PDF</b><small>Gera a versão visual pronta para apresentação</small></div></button></div>{shareNotice&&<div className="reportShareNotice">{shareNotice}</div>}<div className="reportShareHint"><CheckCircle2/><span>O status será atualizado para enviado ao usar WhatsApp, e-mail ou o compartilhamento do dispositivo.</span></div></div></div>}
 </main>;
}

function reportPreviewMetrics(report:MarketingReport):Array<[string,string]>{
 const ids=report.metricIds&&report.metricValues?normalizeMarketingMetricIds(report.metricIds):[];
 if(ids.length)return ids.map(id=>[marketingMetricCatalog.find(metric=>metric.id===id)?.label||id,formatMarketingMetric(id,Number(report.metricValues?.[id])||0)]);
 return [['Status',report.status],['Data',displayDate(report.date)],['Período',report.category||'—'],['Valor',report.value?currency(report.value):'—']];
}

function reportOverviewValue(report:MarketingReport,id:MarketingMetricKey){return Number(report.overviewValues?.[id]??report.metricValues?.[id])||0}
function ReportFunnel({report}:{report:MarketingReport}){const steps:Array<{id:MarketingMetricKey;label:string}>=[{id:'impressions',label:'Impressões'},{id:'reach',label:'Alcance'},{id:'clicks',label:'Cliques'},{id:'results',label:'Resultados'}],max=reportOverviewValue(report,'impressions');return <div className="reportFunnel">{steps.map(step=>{const value=reportOverviewValue(report,step.id),percentage=max?Math.max(5,value/max*100):0;return <div key={step.id}><span><b>{step.label}</b><strong>{formatMarketingMetric(step.id,value)}</strong></span><i><em style={{width:`${Math.min(100,percentage)}%`}}/></i></div>})}</div>}

function periodLabel(from?:string,to?:string){return from&&to?`${displayDate(from)} até ${displayDate(to)}`:'Sem período sincronizado'}
