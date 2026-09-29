import {useDeferredValue,useEffect,useState} from 'react';
import {ArrowRight,BriefcaseBusiness,CalendarClock,Check,ChevronDown,Clock3,FileClock,History,Search,ShieldCheck,WalletCards,X} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {useStoreData} from './app/useStoreData';
import {apiRequest} from './storage';
import type {Client,TeamMember} from './types';

type AuditField={key:string;label:string;before:unknown;after:unknown};
type AuditEvent={id:string;eventId:string;entityType:'clients'|'tasks'|'team'|'financial_entries';entityId:string;entityLabel:string;action:'created'|'updated'|'deleted';areas:string[];clientId?:string;clientIds?:string[];actorId:string;actorName:string;actorEmail:string;occurredAt:string;changes:AuditField[];before:Record<string,unknown>|null;after:Record<string,unknown>|null};
type AuditResponse={items:AuditEvent[];hasMore:boolean;page:number};
const entityLabels:Record<AuditEvent['entityType'],string>={clients:'Cliente',tasks:'Tarefa',team:'Membro da equipe',financial_entries:'Lançamento financeiro'};
const actionLabels:Record<AuditEvent['action'],string>={created:'Criou',updated:'Alterou',deleted:'Excluiu'};
const accessLabels:Record<string,string>={general:'Geral',marketing:'Marketing',finance:'Financeiro',settings:'Configurações'};
const statusLabels:Record<string,string>={active:'Ativo',inactive:'Inativo',prospect:'Prospect',todo:'A fazer',pending:'Pendente',in_progress:'Em andamento',overdue:'Atrasada',completed:'Concluída',received:'Recebido',planning:'Planejamento',paused:'Pausado',cancelled:'Cancelado'};

export default function AuditHistoryPage(){
 const location=useLocation(),initialClient=new URLSearchParams(location.search).get('client')||'all';
 const [clients]=useStoreData<Client[]>('clients',[]),[team]=useStoreData<TeamMember[]>('team',[]);
 const [entityType,setEntityType]=useState('all'),[action,setAction]=useState('all'),[clientId,setClientId]=useState(initialClient),[search,setSearch]=useState('');
 const query=useDeferredValue(search.trim()),[page,setPage]=useState(1),[retry,setRetry]=useState(0),[items,setItems]=useState<AuditEvent[]>([]),[hasMore,setHasMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState<AuditEvent|null>(null);
 useEffect(()=>{setClientId(initialClient)},[initialClient]);
 useEffect(()=>{
  let current=true;setLoading(true);setError('');
  const params=new URLSearchParams({page:String(page),limit:'30'});
  if(entityType!=='all')params.set('entityType',entityType);
  if(action!=='all')params.set('action',action);
  if(clientId!=='all')params.set('clientId',clientId);
  if(query)params.set('search',query);
  void apiRequest(`/audit?${params}`).then((result:AuditResponse)=>{
   if(!current)return;
   setItems(existing=>page===1?result.items:[...existing,...result.items]);setHasMore(result.hasMore);
  }).catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'Não foi possível carregar o histórico.')}).finally(()=>{if(current)setLoading(false)});
  return()=>{current=false};
 },[page,entityType,action,clientId,query,retry]);
 const changeFilter=(setter:(value:string)=>void,value:string)=>{setter(value);setPage(1);setItems([])};
 const clientName=(id:string)=>clients.find(client=>client.id===id)?.companyName||'Cliente';
 const loadMore=()=>setPage(current=>current+1);

 return <main className="auditHistoryPage">
  <section className="auditHistoryHero"><div><span><History/> REGISTRO DA AGÊNCIA</span><h2>Histórico de alterações</h2><p>Veja quem mudou informações importantes e compare a versão anterior com a atual.</p></div><div className="auditHistoryPrivacy"><ShieldCheck/><span><b>Histórico protegido</b><small>Os registros seguem as permissões por área e cliente.</small></span></div></section>
  <section className="auditHistoryFilters card" aria-label="Filtros do histórico"><label className="auditHistorySearch"><Search/><input aria-label="Buscar no histórico" placeholder="Buscar registro, campo ou responsável..." value={search} onChange={event=>{setSearch(event.target.value);setPage(1);setItems([])}}/></label><label><span>Cliente</span><select aria-label="Filtrar histórico por cliente" value={clientId} onChange={event=>changeFilter(setClientId,event.target.value)}><option value="all">Todos os clientes</option>{clients.map(client=><option key={client.id} value={client.id}>{client.companyName}</option>)}</select></label><label><span>Tipo de registro</span><select aria-label="Filtrar por tipo" value={entityType} onChange={event=>changeFilter(setEntityType,event.target.value)}><option value="all">Todos os tipos</option><option value="clients">Clientes</option><option value="tasks">Tarefas</option><option value="team">Equipe e permissões</option><option value="financial_entries">Financeiro</option></select></label><label><span>Ação</span><select aria-label="Filtrar por ação" value={action} onChange={event=>changeFilter(setAction,event.target.value)}><option value="all">Todas as ações</option><option value="created">Criações</option><option value="updated">Alterações</option><option value="deleted">Exclusões</option></select></label></section>
  <section className="auditHistoryResults card"><header><div><small>LINHA DO TEMPO</small><h3>Alterações registradas</h3></div><span>{items.length}{hasMore?'+':''} registros</span></header>
   {error&&<div className="auditHistoryError" role="alert">{error}<button type="button" onClick={()=>setRetry(current=>current+1)}>Tentar novamente</button></div>}
   <div className="auditHistoryList">{items.map(event=><article className={`auditHistoryItem ${event.action}`} key={event.id}><span className="auditHistoryIcon">{event.entityType==='financial_entries'?<WalletCards/>:event.entityType==='team'?<ShieldCheck/>:event.entityType==='tasks'?<Check/>:<BriefcaseBusiness/>}</span><div className="auditHistoryEvent"><div className="auditHistoryEventTitle"><b>{event.actorName}</b><span>{actionLabels[event.action].toLowerCase()} {entityLabels[event.entityType].toLocaleLowerCase('pt-BR')}</span><strong>{event.entityLabel}</strong></div><div className="auditHistoryMeta"><span>{event.clientId?clientName(event.clientId):event.clientIds?.length?`${event.clientIds.length} clientes vinculados`:'Agência'}</span><time><Clock3/>{dateTime(event.occurredAt)}</time><small>{event.changes.length} {event.changes.length===1?'campo':'campos'}</small></div><div className="auditHistoryChangedFields">{event.changes.slice(0,4).map(field=><span key={field.key}>{field.label}</span>)}{event.changes.length>4&&<i>+{event.changes.length-4}</i>}</div></div><button type="button" className="auditHistoryOpen" aria-label={`Consultar versões: ${event.entityLabel}`} onClick={()=>setSelected(event)}><span>Ver versões</span><ArrowRight/></button></article>)}
    {!items.length&&!loading&&!error&&<div className="auditHistoryEmpty"><FileClock/><b>Nenhuma alteração encontrada</b><span>Novas alterações em clientes, tarefas, equipe ou financeiro aparecerão aqui.</span></div>}
    {loading&&<div className="auditHistoryLoading"><i/><span>Carregando histórico...</span></div>}
   </div>{hasMore&&!loading&&<button type="button" className="auditHistoryLoadMore" onClick={loadMore}><ChevronDown/> Carregar mais alterações</button>}
  </section>
  {selected&&<VersionModal event={selected} clients={clients} team={team} onClose={()=>setSelected(null)}/>}
 </main>;
}

function VersionModal({event,clients,team,onClose}:{event:AuditEvent;clients:Client[];team:TeamMember[];onClose:()=>void}){
 const fields=new Map<string,AuditField>();
 [...(event.before?Object.keys(event.before):[]),...(event.after?Object.keys(event.after):[]),...event.changes.map(item=>item.key)].forEach(key=>{
  const change=event.changes.find(item=>item.key===key);fields.set(key,change||{key,label:key,before:event.before?.[key]??null,after:event.after?.[key]??null});
 });
 const versionLabel=event.action==='created'?'Registro criado':event.action==='deleted'?'Registro excluído':'Versões comparadas';
 return <div className="overlay auditVersionOverlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="modal auditVersionModal" role="dialog" aria-modal="true" aria-label={`Versões de ${event.entityLabel}`}><header className="auditVersionHead"><div><small>{entityLabels[event.entityType]} · {versionLabel}</small><h2>{event.entityLabel}</h2><p>{event.actorName} · {dateTime(event.occurredAt)}</p></div><button type="button" className="iconBtn" aria-label="Fechar" onClick={onClose}><X/></button></header><div className="auditVersionCompare"><div className="auditVersionColumn previous"><header><span>{event.action==='created'?'Antes da criação':'Versão anterior'}</span>{event.action!=='created'&&<time>{dateTime(event.occurredAt)}</time>}</header>{event.before?<VersionFields version={event.before} fields={[...fields.values()]} clients={clients} team={team}/>:<div className="auditVersionMissing">Este registro ainda não existia.</div>}</div><div className="auditVersionDivider"><ArrowRight/></div><div className="auditVersionColumn current"><header><span>{event.action==='deleted'?'Depois da exclusão':'Versão registrada'}</span><time>{dateTime(event.occurredAt)}</time></header>{event.after?<VersionFields version={event.after} fields={[...fields.values()]} clients={clients} team={team}/>:<div className="auditVersionMissing">O registro foi excluído.</div>}</div></div><footer className="auditVersionFooter"><span><CalendarClock/> Alterado por <b>{event.actorName}</b>{event.actorEmail?` · ${event.actorEmail}`:''}</span><button type="button" className="btn" onClick={onClose}>Concluído</button></footer></section></div>;
}

function VersionFields({version,fields,clients,team}:{version:Record<string,unknown>;fields:AuditField[];clients:Client[];team:TeamMember[]}){
 return <dl>{fields.map(field=><div className={field.key in version?'':'missing'} key={field.key}><dt>{field.label}</dt><dd>{field.key in version?displayValue(field.key,version[field.key],clients,team):'—'}</dd></div>)}</dl>;
}

function displayValue(field:string,value:unknown,clients:Client[],team:TeamMember[]):string{
 if(value===null||value===undefined||value==='')return 'Não informado';
 if(field==='monthlyRevenue'||field==='value')return Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 if(field==='clientId')return clients.find(client=>client.id===String(value))?.companyName||'Cliente';
 if(['managerId','responsibleId'].includes(field))return team.find(member=>member.id===String(value))?.name||'Responsável';
 if(field==='responsibleIds')return Array.isArray(value)?value.map(id=>team.find(member=>member.id===String(id))?.name||'Responsável').join(', ')||'Não informado':'Não informado';
 if(field==='clientIds')return Array.isArray(value)?`${value.length} ${value.length===1?'cliente':'clientes'} vinculados`:'Não informado';
 if(field==='serviceIds')return Array.isArray(value)?`${value.length} ${value.length===1?'serviço':'serviços'}`:'Não informado';
 if(field==='accessAreas')return Array.isArray(value)?value.map(item=>accessLabels[String(item)]||String(item)).join(', '):String(value);
 if(Array.isArray(value))return value.map(item=>statusLabels[String(item)]||String(item)).join(', ')||'Não informado';
 const text=String(value);
 if(field==='status'||field==='priority'||field==='kind')return statusLabels[text]||text;
 if(/date|At$/.test(field)&&!Number.isNaN(new Date(text).getTime()))return dateTime(text);
 return text.length>1200?`${text.slice(0,1200)}…`:text;
}

function dateTime(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?'Data indisponível':date.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}
