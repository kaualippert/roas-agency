import {useMemo,useState} from 'react';
import {CalendarDays,CheckCircle2,Copy,Eye,FileText,Plus,Search,Send,Trash2,X} from 'lucide-react';
import {filterReports,type ReportPeriodFilter,type ReportStatusFilter} from './report-filters';
import {store} from './storage';
import type {Client,GenericItem} from './types';

function currency(n=0){return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function displayDate(value?:string){return value?new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR'):'—'}

export default function ReportsPage(){
 const [reports,setReports]=useState<GenericItem[]>(()=>store.get('reports',[]));
 const [clients]=useState<Client[]>(()=>store.get('clients',[]));
 const [query,setQuery]=useState('');
 const [statusFilter,setStatusFilter]=useState<ReportStatusFilter>('all');
 const [periodFilter,setPeriodFilter]=useState<ReportPeriodFilter>('this_month');
 const [modal,setModal]=useState(false);
 const [viewing,setViewing]=useState<GenericItem|null>(null);
 const filtered=useMemo(
  ()=>filterReports(reports,query,statusFilter,periodFilter),
  [periodFilter,query,reports,statusFilter],
 );
 const filtersActive=Boolean(query.trim())||statusFilter!=='all'||periodFilter!=='all';

 const save=(next:GenericItem[])=>{
  setReports(next);
  store.set('reports',next);
 };
 const clearFilters=()=>{
  setQuery('');
  setStatusFilter('all');
  setPeriodFilter('all');
 };
 const create=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const report:GenericItem={
   id:crypto.randomUUID(),
   name:String(form.get('name')),
   clientId:String(form.get('client')),
   status:'Pendente',
   date:String(form.get('date')),
   description:String(form.get('description')),
   category:String(form.get('period')),
   createdAt:new Date().toISOString(),
   updatedAt:new Date().toISOString(),
  };
  save([report,...reports]);
  setModal(false);
 };
 const sent=reports.filter(report=>report.status==='Enviado').length;

 return <main>
  <div className="reportsHeader">
   <div><h2>Relatórios</h2><p>Crie, acompanhe e compartilhe os resultados dos seus clientes.</p></div>
   <button className="btn" onClick={()=>setModal(true)}><Plus/> Criar relatório</button>
  </div>

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

  {modal&&<div className="overlay"><div className="modal">
   <div className="modalHead"><div><small>NOVO RELATÓRIO</small><h2>Criar relatório</h2></div><button className="iconBtn" onClick={()=>setModal(false)}><X/></button></div>
   <form className="form" onSubmit={create}>
    <label className="full">Nome do relatório<input name="name" required placeholder="Ex.: Performance mensal — Cliente"/></label>
    <label>Cliente<select name="client">{clients.map(client=><option value={client.id} key={client.id}>{client.companyName}</option>)}</select></label>
    <label>Período<select name="period"><option>Mensal</option><option>Semanal</option><option>Personalizado</option></select></label>
    <label className="full">Data de referência<input name="date" type="date" required/></label>
    <label className="full">Resumo<textarea name="description" placeholder="Principais resultados e observações"/></label>
    <div className="formActions full"><button type="button" className="btn secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="btn">Criar relatório</button></div>
   </form>
  </div></div>}

  {viewing&&<div className="overlay"><article className="reportPreview">
   <button className="iconBtn previewClose" onClick={()=>setViewing(null)}><X/></button>
   <header><span>AGÊNCIA ROAS</span><h1>{viewing.name}</h1><p>{clients.find(client=>client.id===viewing.clientId)?.companyName} · {viewing.category||'Mensal'}</p></header>
   <div className="previewMetrics">{[
    ['Status',viewing.status],
    ['Data',displayDate(viewing.date)],
    ['Período',viewing.category||'—'],
    ['Valor',viewing.value?currency(viewing.value):'—'],
   ].map(item=><div key={item[0]}><small>{item[0]}</small><b>{item[1]}</b></div>)}</div>
   <section><h3>Resumo executivo</h3><p>{viewing.description||'Nenhum resumo registrado.'}</p></section>
   <footer><button className="btn secondary" onClick={()=>setViewing(null)}>Fechar</button><button className="btn" onClick={()=>{save(reports.map(report=>report.id===viewing.id?{...report,status:'Enviado'}:report));setViewing(null)}}><Send/> Marcar como enviado</button></footer>
  </article></div>}
 </main>;
}
