import {useEffect,useMemo,useRef,useState} from 'react';
import {BarChart3,CalendarDays,FilterX,Funnel,GripVertical,Pencil,Plus,Target,TrendingUp,Trophy,UserRound,X} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,Cell,Line,LineChart,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {store} from './storage';
import {KanbanMoreButton,useKanbanColumnLimit,visibleKanbanCards} from './KanbanColumnLimit';
import type {AgencyService} from './ServicesManager';
import type {Client,TeamMember} from './types';
import {
 crmStageNextAction,
 crmStages as stages,
 filterCRMLeads,
 isConvertedLead,
 leadServiceIds,
 moveCRMLeadToStage,
 requestCRMLeadOpen,
 serviceEstimate,
 type CRMLead as Lead,
 type CRMLeadFilters,
 type CRMStage as Stage,
} from './crm-leads';
import CRMServicesAnalytics from './CRMServicesAnalytics';
import './crm-funnel.css';

type FunnelItem={stage:string;fullStage:Stage;leads:number;percentage:number;color:string};

const palette=['#5b36f2','#287cf0','#16a269','#e99a18','#e8547c','#7c8aa2','#0e9f6e','#e04a52'];
const money=(value:number)=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const emptyFilters:CRMLeadFilters={status:'all',source:'',responsibleId:'',serviceId:''};

export default function CRMPage(){
 const [leads,setLeads]=useState<Lead[]>(()=>store.get('prospects',[]));
 const [services,setServices]=useState<AgencyService[]>(()=>store.get('services',[]));
 const [team,setTeam]=useState<TeamMember[]>(()=>store.get('team',[]));
 const [clients,setClients]=useState<Client[]>(()=>store.get('clients',[]));
 const [modal,setModal]=useState(false);
 const [newLeadStage,setNewLeadStage]=useState<Stage>('Leads captados');
 const [dragged,setDragged]=useState<string|null>(null);
 const [selectedServiceIds,setSelectedServiceIds]=useState<string[]>([]);
 const [variableEstimate,setVariableEstimate]=useState(0);
 const [filters,setFilters]=useState<CRMLeadFilters>(emptyFilters);
 const [focusedStage,setFocusedStage]=useState<Stage>('Leads captados');
 const pipelineRef=useRef<HTMLDivElement>(null);
 const {isExpanded,toggleColumn}=useKanbanColumnLimit();

 useEffect(()=>{
  const update=()=>{
   setLeads(store.get('prospects',[]));
   setServices(store.get('services',[]));
   setTeam(store.get('team',[]));
   setClients(store.get('clients',[]));
  };
  window.addEventListener('roas-change',update);
  return()=>window.removeEventListener('roas-change',update);
 },[]);

 const convertedLeadIds=useMemo(()=>new Set(clients.map(client=>client.sourceLeadId).filter(Boolean) as string[]),[clients]);
 const filteredLeads=useMemo(()=>filterCRMLeads(leads,filters,services),[leads,filters,services]);
 const hasFilters=Object.entries(filters).some(([key,value])=>key==='status'?value!=='all':Boolean(value));
 const sources=useMemo(()=>Array.from(new Set(leads.map(lead=>lead.source?.trim()).filter(Boolean))).sort(),[leads]);
 const activeTeam=useMemo(()=>team.filter(member=>member.status==='active'),[team]);
 const availableServices=useMemo(()=>services.filter(service=>service.active||leads.some(lead=>leadServiceIds(lead,services).includes(service.id))),[services,leads]);

 const save=(next:Lead[])=>{setLeads(next);store.set('prospects',next)};
 const moveLead=(leadId:string,stage:Stage)=>{
  const current=leads.find(lead=>lead.id===leadId);
  if(!current)return;
  const converted=isConvertedLead(current,convertedLeadIds);
  const moved=moveCRMLeadToStage(current,stage,converted);
  if(moved===current)return;
  save(leads.map(lead=>lead.id===leadId?moved:lead));
 };
 const drop=(stage:Stage)=>{if(dragged)moveLead(dragged,stage);setDragged(null)};
 const estimate=serviceEstimate(selectedServiceIds,services);
 const estimatedValue=estimate.fixedValue+(estimate.hasVariable||!selectedServiceIds.length?variableEstimate:0);
 const openModal=(stage:Stage='Leads captados')=>{setNewLeadStage(stage);setSelectedServiceIds([]);setVariableEstimate(0);setModal(true)};
 const closeModal=()=>{setModal(false);setSelectedServiceIds([]);setVariableEstimate(0)};
 const add=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const form=new FormData(event.currentTarget),now=new Date().toISOString();
  const name=String(form.get('name')||'').trim(),contact=String(form.get('contact')||'').trim();
  if(!name||!contact)return;
  const stage=String(form.get('stage')||newLeadStage) as Stage;
  save([{id:crypto.randomUUID(),name,contact,phone:String(form.get('phone')||'').trim(),responsibleId:String(form.get('responsibleId')||''),value:estimatedValue,stage,source:String(form.get('source')||'Outro'),nextAction:crmStageNextAction[stage],color:palette[leads.length%palette.length],serviceIds:selectedServiceIds,createdAt:now,updatedAt:now},...leads]);
  closeModal();
 };
 const focusStage=(stage:Stage)=>{
  setFocusedStage(stage);
  pipelineRef.current?.querySelector<HTMLElement>(`[data-crm-stage="${stage}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'start'});
 };

 const funnel=useMemo<FunnelItem[]>(()=>stages.map((stage,index)=>{const count=filteredLeads.filter(lead=>lead.stage===stage).length;return{stage:stage.length>15?stage.split(' ')[0]:stage,fullStage:stage,leads:count,percentage:filteredLeads.length?Math.round(count/filteredLeads.length*100):0,color:palette[index]}}),[filteredLeads]);
 const sourceData=useMemo(()=>Array.from(new Set(filteredLeads.map(lead=>lead.source||'Sem origem'))).map(source=>({name:source,value:filteredLeads.filter(lead=>(lead.source||'Sem origem')===source).length})),[filteredLeads]);
 const active=filteredLeads.filter(lead=>!['Negócio fechado','Negócio perdido'].includes(lead.stage));
 const won=filteredLeads.filter(lead=>lead.stage==='Negócio fechado');
 const conversion=filteredLeads.length?Math.round(won.length/filteredLeads.length*100):0;
 const trend=useMemo(()=>Array.from({length:12},(_,index)=>{const end=new Date();end.setHours(23,59,59,999);end.setDate(end.getDate()-(11-index)*7);const start=new Date(end);start.setDate(start.getDate()-6);start.setHours(0,0,0,0);return{week:start.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),leads:filteredLeads.filter(lead=>{if(!lead.createdAt)return false;const createdAt=new Date(lead.createdAt);return !Number.isNaN(createdAt.getTime())&&createdAt>=start&&createdAt<=end}).length}}),[filteredLeads]);

 return <main className="crmPage">
  <div className="crmPageTitle"><div><h2>CRM de Prospecção</h2><p>Acompanhe oportunidades, serviços solicitados e a saúde do funil.</p></div><button className="btn" onClick={()=>openModal()}><Plus/> Novo lead</button></div>
  <div className="crmKpis"><Kpi icon={<Target/>} label="Oportunidades ativas" value={String(active.length)} note="Em negociação"/><Kpi icon={<TrendingUp/>} label="Valor no pipeline" value={money(active.reduce((sum,lead)=>sum+Number(lead.value||0),0))} note="Potencial de receita" tone="blue"/><Kpi icon={<Trophy/>} label="Negócios fechados" value={String(won.length)} note={money(won.reduce((sum,lead)=>sum+Number(lead.value||0),0))} tone="green"/><Kpi icon={<BarChart3/>} label="Conversão" value={`${conversion}%`} note="Do recorte atual" tone="orange"/></div>

  <section className="card crmFilterBar" aria-label="Filtros do CRM">
   <div className="crmStatusFilters" role="group" aria-label="Situação das oportunidades">
    {[['all','Todos'],['active','Em aberto'],['won','Ganhos'],['lost','Perdidos']].map(([value,label])=><button type="button" key={value} className={filters.status===value?'active':''} onClick={()=>setFilters(current=>({...current,status:value as CRMLeadFilters['status']}))}>{label}</button>)}
   </div>
   <label><span>Origem</span><select value={filters.source} onChange={event=>setFilters(current=>({...current,source:event.target.value}))}><option value="">Todas</option>{sources.map(source=><option key={source}>{source}</option>)}</select></label>
   <label><span>Responsável</span><select value={filters.responsibleId} onChange={event=>setFilters(current=>({...current,responsibleId:event.target.value}))}><option value="">Todos</option>{activeTeam.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
   <label><span>Serviço</span><select value={filters.serviceId} onChange={event=>setFilters(current=>({...current,serviceId:event.target.value}))}><option value="">Todos</option>{availableServices.map(service=><option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
   <button type="button" className="crmClearFilters" disabled={!hasFilters} onClick={()=>setFilters(emptyFilters)}><FilterX/> Limpar</button>
   <small className="crmFilterResult"><b>{filteredLeads.length}</b> de {leads.length} oportunidades</small>
  </section>

  <section className="card crmPageBoard">
   <div className="crmBoardLabel"><div><b>Pipeline comercial</b><span>Arraste no computador ou use “Mover para” em qualquer dispositivo.</span></div><small>{filteredLeads.length} oportunidades visíveis</small></div>
   <div className="crmStageNav" aria-label="Navegar pelas etapas">{stages.map(stage=><button type="button" key={stage} className={focusedStage===stage?'active':''} onClick={()=>focusStage(stage)}><span>{stage}</span><b>{filteredLeads.filter(lead=>lead.stage===stage).length}</b></button>)}</div>
   <div className="crmColumns" ref={pipelineRef}>{stages.map((stage,index)=>{
    const items=filteredLeads.filter(lead=>lead.stage===stage),expanded=isExpanded(stage);
    return <div className="crmColumn" data-crm-stage={stage} key={stage} onDragOver={event=>event.preventDefault()} onDrop={()=>drop(stage)}>
     <header style={{borderBottom:`2px solid ${palette[index]}`}}><b>{stage}</b><span>{items.length}</span></header>
     <div className="crmCards">{visibleKanbanCards(items,expanded).map(lead=>{
      const linked=services.filter(service=>leadServiceIds(lead,services).includes(service.id));
      const responsible=team.find(member=>member.id===lead.responsibleId);
      const converted=isConvertedLead(lead,convertedLeadIds);
      return <article className={`leadCard${converted?' converted':''}`} data-lead-id={lead.id} key={lead.id} draggable={!converted} onDragStart={()=>setDragged(lead.id)} onDragEnd={()=>setDragged(null)} onClick={()=>requestCRMLeadOpen(lead.id)}>
       <div className="leadTop"><i style={{background:lead.color}}>{lead.name.split(' ').map(part=>part[0]).join('').slice(0,2).toUpperCase()}</i><div>{converted&&<span className="convertedLeadBadge">Cliente</span>}<GripVertical aria-hidden="true"/><button type="button" className="leadEditButton" aria-label={`Editar ${lead.name}`} onClick={event=>{event.stopPropagation();requestCRMLeadOpen(lead.id)}}><Pencil/></button></div></div>
       <h3>{lead.name}</h3><p><UserRound/>{lead.contact||'Contato não informado'}</p>{responsible&&<span className="leadResponsible">Responsável: {responsible.name}</span>}
       {linked.length?<div className="leadServices">{linked.slice(0,2).map(service=><span key={service.id}>{service.name}</span>)}{linked.length>2&&<span>+{linked.length-2}</span>}</div>:<span className="leadNoService">Sem serviço vinculado</span>}
       <strong>{money(lead.value)}</strong>
       <footer><span>{lead.source||'Sem origem'}</span><small><CalendarDays/>{lead.nextAction||'Definir próxima ação'}</small></footer>
       <label className="crmQuickMove" onClick={event=>event.stopPropagation()}><span>{converted?'Lead convertido':'Mover para'}</span><select aria-label={`Mover ${lead.name} para outra etapa`} value={lead.stage} disabled={converted} onChange={event=>moveLead(lead.id,event.target.value as Stage)}>{stages.map(option=><option key={option}>{option}</option>)}</select></label>
      </article>})}{!items.length&&<div className="crmColumnEmpty"><span>Sem oportunidades</span><small>Nenhum lead nesta etapa com os filtros atuais.</small></div>}</div>
     <KanbanMoreButton total={items.length} expanded={expanded} onToggle={()=>toggleColumn(stage)}/><button className="addLead" onClick={()=>openModal(stage)}>＋ Adicionar nesta etapa</button>
    </div>
   })}</div>
  </section>

  <FunnelOverview data={funnel} total={filteredLeads.length} conversion={conversion}/>
  <div className="crmAnalytics">
   <Chart title="Visão do funil" subtitle="Quantidade de oportunidades por etapa"><ResponsiveContainer width="100%" height={260}><BarChart data={funnel}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="stage" tick={{fontSize:10}}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="leads" radius={[5,5,0,0]}>{funnel.map(item=><Cell fill={item.color} key={item.fullStage}/>)}</Bar></BarChart></ResponsiveContainer></Chart>
   <section className="card crmChart"><div className="chartTitle"><h3>Origem dos leads</h3><p>Canais que geram oportunidades</p></div>{sourceData.length?<><ResponsiveContainer width="100%" height={210}><PieChart><Pie data={sourceData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78}>{sourceData.map((source,index)=><Cell fill={palette[index%palette.length]} key={source.name}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="sourceLegend">{sourceData.map((source,index)=><span key={source.name}><i style={{background:palette[index%palette.length]}}/>{source.name}<b>{source.value}</b></span>)}</div></>:<ChartEmpty text="Nenhuma origem encontrada neste recorte."/>}</section>
   <Chart title="Evolução da prospecção" subtitle="Leads captados nas últimas 12 semanas" last><ResponsiveContainer width="100%" height={230}><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="week"/><YAxis allowDecimals={false}/><Tooltip/><Line dataKey="leads" type="monotone" stroke="#5b36f2" strokeWidth={3}/></LineChart></ResponsiveContainer></Chart>
  </div>
  <CRMServicesAnalytics leads={filteredLeads} services={services}/>

  {modal&&<div className="overlay" role="presentation"><div className="modal crmModal" role="dialog" aria-modal="true" aria-labelledby="new-lead-title"><div className="modalHead"><div><small>NOVO LEAD</small><h2 id="new-lead-title">Adicionar oportunidade</h2><p>Cadastre o contato, o responsável e os serviços solicitados.</p></div><button type="button" className="iconBtn" aria-label="Fechar" onClick={closeModal}><X/></button></div><form className="form" onSubmit={add}><label>Empresa<input name="name" required autoFocus/></label><label>Contato<input name="contact" required/></label><label>Telefone<input name="phone" type="tel" placeholder="(00) 00000-0000"/></label><label>Responsável pelo lead<select name="responsibleId"><option value="">Definir depois</option>{activeTeam.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Etapa inicial<select name="stage" value={newLeadStage} onChange={event=>setNewLeadStage(event.target.value as Stage)}>{stages.map(stage=><option key={stage}>{stage}</option>)}</select></label><label>Origem<select name="source"><option>Instagram</option><option>Site</option><option>Indicação</option><option>Google</option><option>WhatsApp</option><option>Outro</option></select></label><div className="full"><b className="formGroupLabel">Serviços solicitados</b><small className="formHelper">Serviços mensais entram automaticamente no valor estimado.</small><div className="selectionGrid crmServicesSelect">{services.filter(service=>service.active).map(service=><label key={service.id}><input type="checkbox" checked={selectedServiceIds.includes(service.id)} onChange={event=>setSelectedServiceIds(current=>event.target.checked?[...current,service.id]:current.filter(id=>id!==service.id))}/><span><b>{service.name}</b><small>{service.pricingType==='variable'||service.price<=0?'Valor a definir':`${money(service.price)}/mês`}</small></span></label>)}</div>{!services.some(service=>service.active)&&<p className="noServices">Cadastre serviços ativos em Configurações → Serviços.</p>}</div><div className="leadEstimateBox full"><div><span>Valor automático dos serviços</span><strong>{money(estimate.fixedValue)}</strong></div>{(estimate.hasVariable||!selectedServiceIds.length)&&<label>{selectedServiceIds.length?'Estimativa dos serviços sem valor fixo':'Valor estimado'}<input type="number" min="0" step="0.01" value={variableEstimate||''} onChange={event=>setVariableEstimate(Number(event.target.value)||0)} placeholder="0,00"/><small>{selectedServiceIds.length?'Adicione uma estimativa para os serviços de valor variável.':'Selecione serviços ou informe uma estimativa manual.'}</small></label>}<div className="leadEstimateTotal"><span>Valor estimado total</span><strong>{money(estimatedValue)}</strong></div></div><div className="formActions full"><button type="button" className="btn secondary" onClick={closeModal}>Cancelar</button><button className="btn">Adicionar ao CRM</button></div></form></div></div>}
 </main>;
}

function FunnelOverview({data,total,conversion}:{data:FunnelItem[];total:number;conversion:number}){return <section className="card crmFunnelOverview"><div className="crmFunnelHeader"><div><span className="crmFunnelTitleIcon"><Funnel/></span><div><h3>Funil de oportunidades</h3><p>Percentual de leads em cada etapa do recorte atual</p></div></div><span className="crmFunnelTotal"><b>{total}</b> leads no total</span></div><div className="crmFunnelBody"><div className="crmFunnelShape">{data.map((item,index)=><div className="crmFunnelStep" key={item.fullStage} style={{width:`${Math.max(46,100-index*7.5)}%`,background:item.color}}><span>{item.fullStage}</span><strong>{item.percentage}%</strong><small>{item.leads} {item.leads===1?'lead':'leads'}</small></div>)}</div><div className="crmFunnelBreakdown">{data.map(item=><div className="crmFunnelMetric" key={item.fullStage}><div><i style={{background:item.color}}/><span>{item.fullStage}</span><b>{item.leads}</b></div><div className="crmFunnelProgress"><span style={{width:`${item.percentage}%`,background:item.color}}/></div><small>{item.percentage}% do total</small></div>)}<div className="crmFunnelConversion"><span>Conversão final</span><strong>{conversion}%</strong><small>Leads totais → negócios fechados</small></div></div></div></section>}
function Kpi({icon,label,value,note,tone='' }:{icon:React.ReactNode;label:string;value:string;note:string;tone?:string}){return <article><span className={'crmKpiIcon '+tone}>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>}
function Chart({title,subtitle,children,last=false}:{title:string;subtitle:string;children:React.ReactNode;last?:boolean}){return <section className={'card crmChart wide '+(last?'last':'')}><div className="chartTitle"><h3>{title}</h3><p>{subtitle}</p></div>{children}</section>}
function ChartEmpty({text}:{text:string}){return <div className="crmChartEmpty"><BarChart3/><span>{text}</span></div>}
