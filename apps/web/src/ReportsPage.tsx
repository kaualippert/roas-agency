import {useEffect,useMemo,useState} from 'react';
import {ArrowDown,ArrowUp,BarChart3,CalendarDays,CheckCircle2,Copy,Eye,FileText,Mail,MessageCircle,Pencil,Plus,Printer,Search,Send,Share2,Trash2,X} from 'lucide-react';
import {createPortal,flushSync} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {filterReports,type ReportPeriodFilter,type ReportStatusFilter} from './report-filters';
import {useStoreData} from './app/useStoreData';
import type {Client,GenericItem} from './types';
import {usePersistentState} from './persistent-ui';
import {defaultMarketingMetricIds,formatMarketingMetric,marketingMetricCatalog,metricValue,normalizeMarketingMetricIds,type MarketingMetricKey} from './marketing-dashboard-config';
import {normalizeClientMarketingIntegrations,type ClientMarketingIntegration} from './marketing-integrations';
import {aggregateMarketingMetrics,normalizeMarketingMetricsSnapshots,type MarketingMetricsSnapshot,type MarketingPerformanceRow} from './marketing-metrics';
import {buildReportShareText,reportEmailUrl,reportWhatsAppUrl} from './report-sharing';
import './marketing-metrics.css';
import './report-client.css';
import './portfolio-reports.css';

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
 campaigns?:MarketingPerformanceRow[];
 showJourney?:boolean;
 showCampaigns?:boolean;
 sentAt?:string;
 deliveryChannel?:'email'|'whatsapp'|'device'|'other';
}

interface GeneralSettings{agencyName?:string;logoDataUrl?:string;email?:string;phone?:string;website?:string}

function currency(n=0){return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function displayDate(value?:string){return value?new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR'):'—'}

export default function ReportsPage(){
 const route=useLocation(),navigate=useNavigate();
 const [reports,setReports]=useStoreData<MarketingReport[]>('reports',[]);
 const [clients]=useStoreData<Client[]>('clients',[]);
 const [storedIntegrations]=useStoreData<ClientMarketingIntegration[]>('client_marketing_integrations',[]);
 const [storedMetrics]=useStoreData<MarketingMetricsSnapshot[]>('marketing_metrics',[]);
 const [agencySettings]=useStoreData<GeneralSettings>('general_settings',{});
 const [query,setQuery]=usePersistentState('roas_filter_reports_query','');
 const [clientFilter,setClientFilter]=usePersistentState('roas_filter_reports_client','all');
 const [statusFilter,setStatusFilter]=usePersistentState<ReportStatusFilter>('roas_filter_reports_status','all');
 const [periodFilter,setPeriodFilter]=usePersistentState<ReportPeriodFilter>('roas_filter_reports_period','this_month');
 const [modal,setModal]=useState(false);
 const [editing,setEditing]=useState<MarketingReport|null>(null);
 const [metricSearch,setMetricSearch]=useState('');
 const [viewing,setViewing]=useState<MarketingReport|null>(null);
 const [sharing,setSharing]=useState<MarketingReport|null>(null),[shareNotice,setShareNotice]=useState(''),[shareChannel,setShareChannel]=useState<MarketingReport['deliveryChannel']>('other');
 const integrations=useMemo(()=>normalizeClientMarketingIntegrations(storedIntegrations).filter(item=>item.status==='connected'&&(item.provider==='meta_ads'||item.provider==='google_ads')),[storedIntegrations]);
 const metricsSnapshots=useMemo(()=>normalizeMarketingMetricsSnapshots(storedMetrics),[storedMetrics]);
 const syncedClientIds=useMemo(()=>new Set(metricsSnapshots.filter(snapshot=>integrations.some(item=>item.id===snapshot.integrationId)).map(snapshot=>snapshot.clientId)),[integrations,metricsSnapshots]);
 const reportClients=useMemo(()=>clients.filter(client=>client.status==='active'&&syncedClientIds.has(client.id)),[clients,syncedClientIds]);
 const [reportClientId,setReportClientId]=useState(''),[draftMetricIds,setDraftMetricIds]=useState<MarketingMetricKey[]>([...defaultMarketingMetricIds]);
 useEffect(()=>{
  if(!route.search)return;
  const params=new URLSearchParams(route.search),requestedClient=params.get('client'),requestedReport=params.get('report');
  if(requestedClient&&clients.some(client=>client.id===requestedClient))setClientFilter(requestedClient);
  if(requestedClient&&params.get('create')==='1'&&reportClients.some(client=>client.id===requestedClient)){
   setEditing(null);setMetricSearch('');setDraftMetricIds([...defaultMarketingMetricIds]);setReportClientId(requestedClient);setModal(true)
  }
  if(requestedReport){const report=reports.find(item=>item.id===requestedReport&&(!requestedClient||item.clientId===requestedClient));if(report)setViewing(report)}
  navigate(route.pathname,{replace:true});
 },[route.pathname,route.search,clients,reportClients,reports,navigate,setClientFilter]);
 const selectedReportClientId=reportClientId||reportClients[0]?.id||'';
 const selectedReportClient=reportClients.find(client=>client.id===selectedReportClientId);
 const reportSnapshots=metricsSnapshots.filter(snapshot=>snapshot.clientId===selectedReportClientId&&integrations.some(item=>item.id===snapshot.integrationId));
 const reportMetrics=reportSnapshots.length?aggregateMarketingMetrics(reportSnapshots):null;
 const reportPeriod=periodLabel(reportSnapshots.map(item=>item.periodFrom).sort()[0],reportSnapshots.map(item=>item.periodTo).sort().at(-1));
 const availableValues=editing?{...editing.overviewValues,...editing.metricValues}:undefined;
 const campaigns=editing?editing.campaigns??[]:reportSnapshots.flatMap(snapshot=>snapshot.performanceRows.filter(row=>row.level==='campaign'));
 const availableMetrics=marketingMetricCatalog.filter(metric=>(!availableValues||Number.isFinite(availableValues[metric.id]))&&metricSearchText(metric.label+' '+metric.category).includes(metricSearchText(metricSearch)));
 const scopedReports=useMemo(()=>reports.filter(report=>clientFilter==='all'||report.clientId===clientFilter),[reports,clientFilter]);
 const filtered=useMemo(()=>filterReports(scopedReports,query,statusFilter,periodFilter),[periodFilter,query,scopedReports,statusFilter]);
 const filtersActive=Boolean(query.trim())||statusFilter!=='all'||periodFilter!=='all'||clientFilter!=='all';

 const save=(next:MarketingReport[])=>{
  setReports(next);
 };
 const clearFilters=()=>{
  setQuery('');
  setStatusFilter('all');
  setPeriodFilter('all');
  setClientFilter('all');
 };
 const openCreate=()=>{setEditing(null);setMetricSearch('');setReportClientId(reportClients.find(client=>client.id===clientFilter)?.id||reportClients[0]?.id||'');setDraftMetricIds([...defaultMarketingMetricIds]);setModal(true)};
 const openEdit=(report:MarketingReport)=>{setViewing(null);setEditing(report);setMetricSearch('');setDraftMetricIds(reportMetricIds(report));setModal(true)};
 const toggleMetric=(id:MarketingMetricKey)=>setDraftMetricIds(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
 const moveMetric=(index:number,offset:number)=>setDraftMetricIds(current=>{
  const target=index+offset;
  if(target<0||target>=current.length)return current;
  const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next;
 });
 const create=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  if((!editing&&!reportMetrics)||(!draftMetricIds.length&&(!editing||Object.keys(availableValues??{}).length>0)))return;
  const client=editing?clients.find(item=>item.id===editing.clientId):selectedReportClient;
  const values=availableValues??Object.fromEntries(marketingMetricCatalog.map(metric=>[metric.id,metricValue(reportMetrics!,metric.id)]));
  const now=new Date().toISOString();
  const report:MarketingReport={
   ...(editing??{
    id:crypto.randomUUID(),clientId:selectedReportClientId,status:'Pendente',createdAt:now,category:reportPeriod,
    periodFrom:reportSnapshots.map(item=>item.periodFrom).sort()[0],periodTo:reportSnapshots.map(item=>item.periodTo).sort().at(-1),
    providers:[...new Set(reportSnapshots.map(item=>item.provider))],campaigns,
   }),
   name:String(form.get('name')),
   date:String(form.get('date')),
   description:String(form.get('description')),
   updatedAt:now,
   metricIds:draftMetricIds,
   metricValues:Object.fromEntries(draftMetricIds.map(id=>[id,values[id]])),
   recipientEmail:String(form.get('recipientEmail')??client?.email??''),
   recipientPhone:String(form.get('recipientPhone')??client?.phone??''),
   recommendations:String(form.get('recommendations')||''),
   overviewValues:values,
   showJourney:form.has('showJourney'),
   showCampaigns:form.has('showCampaigns')&&campaigns.length>0,
  };
  save(editing?reports.map(item=>item.id===report.id?report:item):[report,...reports]);
  setModal(false);
  if(editing)setViewing(report);
 };
 const markSent=(report:MarketingReport,channel:MarketingReport['deliveryChannel']='other')=>{const now=new Date().toISOString();save(reports.map(item=>item.id===report.id?{...item,status:'Enviado',sentAt:now,deliveryChannel:channel,updatedAt:now}:item));setSharing(null);setViewing(current=>current?.id===report.id?{...current,status:'Enviado',sentAt:now,deliveryChannel:channel,updatedAt:now}:current)};
 const openShare=(report:MarketingReport)=>{setShareChannel('other');setShareNotice('');setSharing(report)};
 const sharePayload=(report:MarketingReport)=>{const client=clients.find(item=>item.id===report.clientId);return buildReportShareText({name:report.name,clientName:client?.companyName||'Cliente',period:report.category||'Período do relatório',description:report.description,recommendations:report.recommendations,metricIds:reportMetricIds(report),metricValues:{...report.overviewValues,...report.metricValues},agencyName:agencySettings.agencyName||'Agência ROAS'})};
 const copyReport=async(report:MarketingReport)=>{try{await navigator.clipboard.writeText(sharePayload(report));setShareChannel('other');setShareNotice('Resumo copiado. Confirme abaixo se ele foi enviado ao cliente.')}catch{setShareNotice('Não foi possível copiar automaticamente. Tente pelo compartilhamento do dispositivo.')}};
 const nativeShare=async(report:MarketingReport)=>{if(!navigator.share){await copyReport(report);return}try{await navigator.share({title:report.name,text:sharePayload(report)});setShareChannel('device');setShareNotice('Compartilhamento concluído. Confirme o envio abaixo.')}catch(error){if((error as DOMException).name!=='AbortError')setShareNotice('Não foi possível abrir o compartilhamento.') }};
 const openEmail=(report:MarketingReport)=>{setShareChannel('email');window.location.href=reportEmailUrl(report.recipientEmail||'',report.name,sharePayload(report));setShareNotice('Após enviar o e-mail, confirme a entrega abaixo.')};
 const openWhatsApp=(report:MarketingReport)=>{setShareChannel('whatsapp');window.open(reportWhatsAppUrl(sharePayload(report),report.recipientPhone),'_blank','noopener,noreferrer');setShareNotice('Após enviar no WhatsApp, confirme a entrega abaixo.')};
 const printReport=async(report:MarketingReport)=>{
  flushSync(()=>{setViewing(report);setSharing(null)});
  const logo=document.querySelector<HTMLImageElement>('.reportAgencyBrand img');
  await logo?.decode().catch(()=>{});
  window.print();
 };
 const sent=scopedReports.filter(report=>report.status==='Enviado').length;

 return <main>
  <div className="reportsHeader">
   <div><h2>Relatórios</h2><p>Crie, acompanhe e compartilhe os resultados dos seus clientes.</p></div>
   <button className="btn" onClick={openCreate} disabled={!reportClients.length}><Plus/> Criar relatório</button>
  </div>

  {!reportClients.length&&<section className="marketingDataNotice"><FileText/><div><b>Nenhum cliente sincronizado</b><span>Vincule e sincronize uma conta de anúncios antes de criar relatórios de performance.</span></div></section>}

  <div className="reportStats">
   <article><FileText/><span><small>Relatórios criados</small><strong>{scopedReports.length}</strong></span></article>
   <article><Send/><span><small>Relatórios enviados</small><strong>{sent}</strong></span></article>
   <article><CalendarDays/><span><small>Pendentes</small><strong>{scopedReports.filter(report=>report.status==='Pendente').length}</strong></span></article>
   <article><CheckCircle2/><span><small>Taxa de envio</small><strong>{scopedReports.length?Math.round(sent/scopedReports.length*100):0}%</strong></span></article>
  </div>

  <section className="card reportsPanel">
   <div className="reportsTools">
    <div className="memberSearch">
     <Search/>
     <input aria-label="Buscar relatório" placeholder="Buscar relatório..." value={query} onChange={event=>setQuery(event.target.value)}/>
    </div>
    <select aria-label="Filtrar relatórios por cliente" className="reportsFilter" value={clientFilter} onChange={event=>setClientFilter(event.target.value)}><option value="all">Todos os clientes</option>{clients.filter(client=>client.id===clientFilter||reports.some(report=>report.clientId===client.id)||reportClients.some(item=>item.id===client.id)).map(client=><option key={client.id} value={client.id}>{client.companyName}</option>)}</select>
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
    <span className="reportsResultCount">{filtered.length} de {scopedReports.length} relatórios</span>
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
      <span className={'badge '+(report.status==='Enviado'?'green':'orange')} title={report.sentAt?`Enviado em ${displayDate(report.sentAt)}`:undefined}>{report.status}</span>
      <span>{displayDate(report.updatedAt)}</span>
      <div className="reportActions">
       <button className="iconBtn" title="Visualizar" onClick={()=>setViewing(report)}><Eye/></button>
       <button className="iconBtn" title="Editar relatório" onClick={()=>openEdit(report)}><Pencil/></button>
       <button className="iconBtn" title="Duplicar" onClick={()=>save([{...report,id:crypto.randomUUID(),name:`Cópia — ${report.name}`,status:'Pendente',sentAt:undefined,deliveryChannel:undefined,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},...reports])}><Copy/></button>
       <button className="iconBtn" title="Compartilhar" onClick={()=>openShare(report)}><Share2/></button>
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

  {modal&&<div className="overlay"><div className="modal marketingReportModal" role="dialog" aria-label={editing?'Editar relatório':'Criar relatório'}>
   <div className="modalHead"><div><small>RELATÓRIO DO CLIENTE</small><h2>{editing?'Editar relatório':'Criar relatório'}</h2></div><button className="iconBtn" aria-label="Fechar editor" onClick={()=>setModal(false)}><X/></button></div>
   <form className="form" onSubmit={create}>
    <label className="full">Nome do relatório<input name="name" required defaultValue={editing?.name} placeholder="Ex.: Performance mensal"/></label>
    {editing?<div className="marketingReportPeriod"><small>Cliente</small><strong>{clients.find(client=>client.id===editing.clientId)?.companyName||'Cliente'}</strong></div>:<label>Cliente integrado<select name="client" required value={selectedReportClientId} onChange={event=>setReportClientId(event.target.value)}>{reportClients.map(client=><option value={client.id} key={client.id}>{client.companyName}</option>)}</select></label>}
    <div className="marketingReportPeriod"><small>Período dos dados</small><strong>{editing?editing.category||periodLabel(editing.periodFrom,editing.periodTo):reportPeriod}</strong></div>
    <label className="full">Data de referência<input name="date" type="date" required defaultValue={editing?.date?.slice(0,10)||new Date().toISOString().slice(0,10)}/></label>
    <div className="reportRecipientFields full"><label>E-mail do cliente<input name="recipientEmail" type="email" key={`${selectedReportClientId}-email`} defaultValue={editing?editing.recipientEmail:selectedReportClient?.email} placeholder="cliente@empresa.com"/></label><label>WhatsApp do cliente<input name="recipientPhone" key={`${selectedReportClientId}-phone`} defaultValue={editing?editing.recipientPhone:selectedReportClient?.phone} placeholder="(00) 00000-0000"/></label></div>
    <fieldset className="marketingReportMetrics full">
     <legend>Métricas do relatório ({draftMetricIds.length})</legend>
     <p>{editing?'Os valores permanecem vinculados ao período original.':'Escolha e ordene os indicadores que vão aparecer no PDF.'}</p>
     <input aria-label="Buscar métricas do relatório" type="search" value={metricSearch} onChange={event=>setMetricSearch(event.target.value)} placeholder="Buscar por métrica ou categoria"/>
     <div>{availableMetrics.map(metric=><label className={draftMetricIds.includes(metric.id)?'selected':''} key={metric.id}><input type="checkbox" checked={draftMetricIds.includes(metric.id)} onChange={()=>toggleMetric(metric.id)}/><span><b>{metric.label}</b><small>{metric.category}</small></span></label>)}</div>
     {!availableMetrics.length&&<p>{editing&&!Object.keys(availableValues??{}).length?'Este relatório antigo não tem métricas sincronizadas salvas.':'Nenhuma métrica encontrada.'}</p>}
     {!!draftMetricIds.length&&<ol className="reportMetricOrder" aria-label="Ordem das métricas">{draftMetricIds.map((id,index)=><li key={id}><span>{metricLabel(id)}</span><button className="iconBtn" type="button" aria-label={`Mover ${metricLabel(id)} para cima`} disabled={!index} onClick={()=>moveMetric(index,-1)}><ArrowUp/></button><button className="iconBtn" type="button" aria-label={`Mover ${metricLabel(id)} para baixo`} disabled={index===draftMetricIds.length-1} onClick={()=>moveMetric(index,1)}><ArrowDown/></button></li>)}</ol>}
    </fieldset>
    <fieldset className="full reportSectionOptions"><legend>Seções opcionais</legend>
     <label><input type="checkbox" name="showJourney" defaultChecked={editing?.showJourney!==false}/>Jornada de resultados <small>Usa as métricas de volume selecionadas (mínimo de duas).</small></label>
     <label><input type="checkbox" name="showCampaigns" disabled={!campaigns.length} defaultChecked={editing?.showCampaigns??false}/>Detalhamento por campanha <small>{campaigns.length?'Aplica a mesma seleção e ordem de métricas a cada campanha.':'Não há dados por campanha salvos neste recorte.'}</small></label>
    </fieldset>
    <label className="full">Resumo executivo<textarea name="description" defaultValue={editing?.description} placeholder="Explique os principais resultados de forma simples para o cliente."/></label>
    <label className="full">Próximos passos<textarea name="recommendations" defaultValue={editing?.recommendations} placeholder="Ex.: escalar os melhores anúncios, testar novos criativos e revisar públicos."/></label>
    <div className="formActions full"><button type="button" className="btn secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn" disabled={editing?!draftMetricIds.length&&Object.keys(availableValues??{}).length>0:!draftMetricIds.length||!reportMetrics}>{editing?'Salvar alterações':'Criar relatório'}</button></div>
   </form>
  </div></div>}

  {viewing&&!sharing&&createPortal(<div className="overlay reportPreviewOverlay" role="dialog" aria-label="Pré-visualização do cliente"><div className="reportPreviewShell"><div className="reportPreviewToolbar"><div><b>Pré-visualização do cliente</b><span>Confira o documento antes de exportar.</span></div><div><button className="btn secondary" onClick={()=>openEdit(viewing)}><Pencil/> Editar</button><button className="btn secondary" onClick={()=>void printReport(viewing)}><Printer/> Salvar em PDF</button><button className="btn" onClick={()=>openShare(viewing)}><Share2/> Compartilhar</button><button className="iconBtn" aria-label="Fechar pré-visualização" onClick={()=>setViewing(null)}><X/></button></div></div><article className="reportClientDocument">
   <header className="reportDocumentHeader"><div className="reportAgencyBrand">{agencySettings.logoDataUrl?.startsWith('data:image/')?<img src={agencySettings.logoDataUrl} alt="Logo da agência"/>:<span>{(agencySettings.agencyName||'ROAS').slice(0,1)}</span>}<div><b>{agencySettings.agencyName||'Agência ROAS'}</b><small>Relatório de performance</small></div></div><div className="reportDocumentMeta"><small>EMITIDO EM</small><b>{displayDate(viewing.date)}</b></div></header>
   <section className="reportDocumentCover"><span>RELATÓRIO DE RESULTADOS</span><h1>{viewing.name}</h1><p>{clients.find(client=>client.id===viewing.clientId)?.companyName||'Cliente'} · {viewing.category||'Período não informado'}</p><div>{(viewing.providers||[]).map(provider=><i key={provider}>{provider==='meta_ads'?'Meta Ads':provider==='google_ads'?'Google Ads':provider}</i>)}</div></section>
   <section className="reportDocumentSection"><h2>Principais indicadores</h2><ReportMetricList items={reportPreviewMetrics(viewing)}/></section>
   {viewing.description?.trim()&&<section className="reportDocumentSection reportNarrative"><h2>Resumo executivo</h2><p>{viewing.description}</p></section>}
   <ReportFunnel report={viewing}/>
   {viewing.showCampaigns&&!!viewing.campaigns?.length&&<section className="reportDocumentSection reportCampaigns"><h2>Desempenho por campanha</h2>{viewing.campaigns.map((campaign,index)=><section key={`${campaign.id}-${index}`}><h3>{campaign.name}</h3><ReportMetricList items={reportMetricIds(viewing).map(id=>[metricLabel(id),formatMarketingMetric(id,metricValue(campaign,id))])}/></section>)}</section>}
   {viewing.recommendations?.trim()&&<section className="reportDocumentSection reportNarrative"><h2>Próximos passos</h2><p>{viewing.recommendations}</p></section>}
   <footer className="reportDocumentFooter"><div><b>{agencySettings.agencyName||'Agência ROAS'}</b><span>{[agencySettings.email,agencySettings.phone,agencySettings.website].filter(Boolean).join(' · ')}</span></div><small>Dados consolidados automaticamente pelo Flow ROAS</small></footer>
  </article></div></div>,document.body)}

  {sharing&&<div className="overlay"><div className="modal reportShareModal" role="dialog" aria-label="Compartilhar relatório"><div className="modalHead"><div><small>ENVIAR AO CLIENTE</small><h2>Compartilhar relatório</h2><p>Escolha como deseja entregar “{sharing.name}”.</p></div><button className="iconBtn" aria-label="Fechar" onClick={()=>setSharing(null)}><X/></button></div><div className="reportShareClient"><span>{clients.find(client=>client.id===sharing.clientId)?.companyName?.slice(0,1)||'C'}</span><div><b>{clients.find(client=>client.id===sharing.clientId)?.companyName}</b><small>{sharing.recipientEmail||'E-mail não informado'} · {sharing.recipientPhone||'WhatsApp não informado'}</small></div></div><div className="reportShareOptions"><button type="button" onClick={()=>openWhatsApp(sharing)}><span className="whatsapp"><MessageCircle/></span><div><b>Enviar pelo WhatsApp</b><small>Abre uma mensagem pronta para o cliente</small></div></button><button type="button" onClick={()=>openEmail(sharing)}><span className="email"><Mail/></span><div><b>Enviar por e-mail</b><small>Abre seu aplicativo com assunto e resumo</small></div></button><button type="button" onClick={()=>void nativeShare(sharing)}><span className="share"><Share2/></span><div><b>Compartilhar pelo dispositivo</b><small>Use os aplicativos disponíveis no computador ou celular</small></div></button><button type="button" onClick={()=>void copyReport(sharing)}><span className="copy"><Copy/></span><div><b>Copiar resumo</b><small>Copia indicadores e observações formatados</small></div></button><button type="button" onClick={()=>printReport(sharing)}><span className="print"><Printer/></span><div><b>Salvar ou imprimir PDF</b><small>Gera a versão visual pronta para apresentação</small></div></button></div>{shareNotice&&<div className="reportShareNotice">{shareNotice}</div>}<div className="reportShareConfirm"><span>O relatório só será marcado como enviado após sua confirmação.</span><button className="btn" type="button" onClick={()=>markSent(sharing,shareChannel)}><CheckCircle2/> Confirmar envio ao cliente</button></div></div></div>}
 </main>;
}

function metricLabel(id:MarketingMetricKey){return marketingMetricCatalog.find(metric=>metric.id===id)?.label??id}
function metricSearchText(value:string){return value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim()}
function reportMetricIds(report:MarketingReport){
 return report.metricIds?.length?normalizeMarketingMetricIds(report.metricIds).filter(id=>Number.isFinite(report.metricValues?.[id]??report.overviewValues?.[id])):[];
}
function reportValue(report:MarketingReport,id:MarketingMetricKey){return report.metricValues?.[id]??report.overviewValues?.[id]??0}
function reportPreviewMetrics(report:MarketingReport):Array<[string,string]>{
 const ids=reportMetricIds(report);
 if(ids.length)return ids.map(id=>[metricLabel(id),formatMarketingMetric(id,reportValue(report,id))]);
 return [['Status',report.status],['Data',displayDate(report.date)],['Período',report.category||'—'],['Valor',report.value?currency(report.value):'—']];
}

function ReportMetricList({items}:{items:Array<[string,string]>}){
 return <dl className="reportMetricList">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
function ReportFunnel({report}:{report:MarketingReport}){
 const ids=reportMetricIds(report).filter(id=>id==='results'||id==='conversions'||marketingMetricCatalog.some(metric=>metric.id===id&&metric.format==='integer'));
 if(report.showJourney===false||ids.length<2)return null;
 const max=Math.max(...ids.map(id=>reportValue(report,id)));
 return <section className="reportDocumentSection reportResultsJourney"><h2><BarChart3 aria-hidden="true"/> Jornada de resultados</h2><div className="reportFunnel">{ids.map(id=>{
  const value=reportValue(report,id);
  return <div key={id}><span><b>{metricLabel(id)}</b><strong>{formatMarketingMetric(id,value)}</strong></span><i><em style={{width:`${max?value/max*100:0}%`}}/></i></div>;
 })}</div></section>;
}

function periodLabel(from?:string,to?:string){return from&&to?`${displayDate(from)} até ${displayDate(to)}`:'Sem período sincronizado'}
