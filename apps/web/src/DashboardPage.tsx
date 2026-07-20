import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,ArrowRight,BriefcaseBusiness,CheckCircle2,CircleDollarSign,Clock3,Funnel,Target,TrendingUp,Users,WalletCards} from 'lucide-react';
import {Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,Line,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {store} from './storage';
import type {Client,Project,Task} from './types';

type Period='30d'|'90d'|'6m'|'12m';
type Lead={id:string;name:string;value:number;stage:string;createdAt?:string};
type FinancialEntry={id:string;clientId:string;kind:'recurring'|'variable'|'one_off';value:number;dueDate:string;status:'pending'|'received';receivedAt?:string};
const periods:Record<Period,{label:string;days:number}>={'30d':{label:'Últimos 30 dias',days:30},'90d':{label:'Últimos 90 dias',days:90},'6m':{label:'Últimos 6 meses',days:183},'12m':{label:'Últimos 12 meses',days:365}};
const stages=['Leads captados','Primeiro contato','Em andamento','Reunião','Ciclo de acompanhamento','Em espera','Negócio fechado','Negócio perdido'];
const stageColors=['#6d4bf2','#3b82f6','#16a269','#e99a18','#e8547c','#7c8aa2','#17a66a','#e04a52'];
const money=(value=0)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const parseDate=(value?:string)=>value?new Date(value.length===10?`${value}T12:00:00`:value):null;
const isAfter=(value:string|undefined,from:Date)=>{const date=parseDate(value);return Boolean(date&&date>=from)};
export default function DashboardPage(){
 const [clients,setClients]=useState<Client[]>(()=>store.get('clients',[]));
 const [projects,setProjects]=useState<Project[]>(()=>store.get('projects',[]));
 const [tasks,setTasks]=useState<Task[]>(()=>store.get('tasks',[]));
 const [leads,setLeads]=useState<Lead[]>(()=>store.get('prospects',[]));
 const [entries,setEntries]=useState<FinancialEntry[]>(()=>store.get('financial_entries',[]));
 const [period,setPeriod]=useState<Period>('6m');
 useEffect(()=>{const update=()=>{setClients(store.get('clients',[]));setProjects(store.get('projects',[]));setTasks(store.get('tasks',[]));setLeads(store.get('prospects',[]));setEntries(store.get('financial_entries',[]))};window.addEventListener('roas-change',update);update();return()=>window.removeEventListener('roas-change',update)},[]);
 const from=useMemo(()=>{const date=new Date();date.setDate(date.getDate()-periods[period].days);date.setHours(0,0,0,0);return date},[period]);
 const activeClients=clients.filter(client=>client.status==='active');
 const activeProjects=projects.filter(project=>project.status==='active');
 const openTasks=tasks.filter(task=>task.status!=='completed');
 const mrr=activeClients.reduce((sum,client)=>sum+client.monthlyRevenue,0);
 const activeLeads=leads.filter(lead=>!['Negócio fechado','Negócio perdido'].includes(lead.stage));
 const pipeline=activeLeads.reduce((sum,lead)=>sum+lead.value,0);
 const periodEntries=entries.filter(entry=>isAfter(entry.dueDate,from));
 const received=periodEntries.filter(entry=>entry.status==='received').reduce((sum,entry)=>sum+entry.value,0);
 const variable=periodEntries.filter(entry=>entry.kind==='variable').reduce((sum,entry)=>sum+entry.value,0);
 const periodTasks=tasks.filter(task=>isAfter(task.createdAt,from)||isAfter(task.dueDate,from));
 const completedTasks=periodTasks.filter(task=>task.status==='completed');
 const taskRate=periodTasks.length?Math.round(completedTasks.length/periodTasks.length*100):0;
 const overdueTasks=openTasks.filter(task=>task.status==='overdue'||new Date(task.dueDate)<new Date());
 const conversion=leads.length?Math.round(leads.filter(lead=>lead.stage==='Negócio fechado').length/leads.length*100):0;
 const projectAverage=Math.round(activeProjects.reduce((sum,project)=>sum+project.progress,0)/Math.max(1,activeProjects.length));
 const revenueData=useMemo(()=>buildRevenueData(period,entries,mrr),[period,entries,mrr]);
 const funnelData=stages.map((stage,index)=>({stage:stage==='Negócio fechado'?'Fechado':stage==='Negócio perdido'?'Perdido':stage.length>13?stage.split(' ')[0]:stage,total:leads.filter(lead=>lead.stage===stage&&(isAfter(lead.createdAt,from)||!lead.createdAt)).length,color:stageColors[index]}));
 const taskData=[
  {name:'A fazer',value:periodTasks.filter(task=>task.status==='todo').length,color:'#6d4bf2'},
  {name:'Pendentes',value:periodTasks.filter(task=>task.status==='pending').length,color:'#e99a18'},
  {name:'Em andamento',value:periodTasks.filter(task=>task.status==='in_progress').length,color:'#3b82f6'},
  {name:'Concluídas',value:completedTasks.length,color:'#16a269'},
  {name:'Atrasadas',value:periodTasks.filter(task=>task.status==='overdue').length,color:'#e04a52'},
 ];
 const projectData=activeProjects.slice(0,7).map(project=>({name:project.name.length>16?`${project.name.slice(0,15)}…`:project.name,progresso:project.progress}));
 const priorities=[...openTasks].sort((a,b)=>priorityValue(b.priority)-priorityValue(a.priority)||a.dueDate.localeCompare(b.dueDate)).slice(0,5);
 const activity=useMemo(()=>[
  ...clients.filter(client=>isAfter(client.updatedAt,from)).map(client=>({type:'client',title:client.sourceLeadId?'Lead convertido em cliente':'Cliente atualizado',detail:client.companyName,date:client.updatedAt})),
  ...tasks.filter(task=>task.status==='completed'&&isAfter(task.updatedAt,from)).map(task=>({type:'task',title:'Tarefa concluída',detail:task.title,date:task.updatedAt})),
  ...entries.filter(entry=>entry.status==='received'&&isAfter(entry.receivedAt||entry.dueDate,from)).map(entry=>({type:'finance',title:'Pagamento recebido',detail:clients.find(client=>client.id===entry.clientId)?.companyName||'Cliente',date:entry.receivedAt||entry.dueDate})),
 ].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,6),[clients,tasks,entries,from]);
 return <main className="connectedDashboard">
  <div className="dashboardToolbar"><div><h2>Visão geral da agência</h2><p>Indicadores atualizados com os dados reais de cada área.</p></div><label>Período<select value={period} onChange={event=>setPeriod(event.target.value as Period)}>{Object.entries(periods).map(([value,item])=><option key={value} value={value}>{item.label}</option>)}</select></label></div>
  <div className="dashboardKpis">
   <DashboardKpi icon={<CircleDollarSign/>} label="Receita recebida" value={money(received)} note={`${periodEntries.filter(entry=>entry.status==='received').length} pagamentos no período`} trend="finance"/>
   <DashboardKpi icon={<TrendingUp/>} label="Receita recorrente" value={money(mrr)} note={`${activeClients.length} contratos ativos`} trend="client" tone="blue"/>
   <DashboardKpi icon={<Funnel/>} label="Pipeline comercial" value={money(pipeline)} note={`${activeLeads.length} oportunidades`} trend="crm" tone="purple"/>
   <DashboardKpi icon={<BriefcaseBusiness/>} label="Projetos ativos" value={String(activeProjects.length)} note={`${projectAverage}% de progresso médio`} trend="project" tone="green"/>
   <DashboardKpi icon={<Clock3/>} label="Tarefas em aberto" value={String(openTasks.length)} note={`${overdueTasks.length} precisam de atenção`} trend="task" tone={overdueTasks.length?'orange':'green'}/>
  </div>
  <div className="dashboardMainGrid">
   <section className="card dashboardRevenue"><DashboardTitle title="Receita e previsão" subtitle={`Movimentações financeiras — ${periods[period].label.toLowerCase()}`} action={<a href="/finance">Abrir financeiro <ArrowRight/></a>}/><div className="revenueHighlights"><span><i className="received"/><small>Recebido</small><b>{money(received)}</b></span><span><i className="forecast"/><small>Previsão recorrente</small><b>{money(mrr)}</b></span><span><i className="variable"/><small>Receitas variáveis</small><b>{money(variable)}</b></span></div><ResponsiveContainer width="100%" height={270}><AreaChart data={revenueData}><defs><linearGradient id="dashboardRevenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6541ee" stopOpacity={.24}/><stop offset="1" stopColor="#6541ee" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis tickFormatter={value=>`${Math.round(value/1000)}k`}/><Tooltip formatter={(value:any)=>money(Number(value))}/><Area type="monotone" dataKey="previsto" stroke="#6541ee" fill="url(#dashboardRevenueGradient)" strokeWidth={2}/><Line type="monotone" dataKey="recebido" stroke="#18a267" strokeWidth={3}/></AreaChart></ResponsiveContainer></section>
   <section className="card agencyPulse"><DashboardTitle title="Saúde da operação" subtitle="Indicadores essenciais do período"/><Pulse label="Conclusão de tarefas" value={taskRate} icon={<CheckCircle2/>} tone="green"/><Pulse label="Progresso dos projetos" value={projectAverage} icon={<Target/>} tone="blue"/><Pulse label="Conversão comercial" value={conversion} icon={<Funnel/>} tone="purple"/><div className="attentionBox"><AlertTriangle/><div><b>{overdueTasks.length} tarefas atrasadas</b><span>Revise responsáveis e prazos prioritários.</span></div><a href="/tasks">Ver tarefas</a></div></section>
  </div>
  <div className="dashboardCharts">
   <section className="card funnelChart"><DashboardTitle title="Funil comercial" subtitle="Oportunidades por etapa no período" action={<a href="/crm">Abrir CRM <ArrowRight/></a>}/><ResponsiveContainer width="100%" height={245}><BarChart data={funnelData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="stage" tick={{fontSize:9}}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="total" radius={[5,5,0,0]}>{funnelData.map(item=><Cell key={item.stage} fill={item.color}/>)}</Bar></BarChart></ResponsiveContainer></section>
   <section className="card taskDistribution"><DashboardTitle title="Distribuição de tarefas" subtitle={`${periodTasks.length} tarefas consideradas no período`}/><div className="taskBars">{taskData.map(item=><div key={item.name}><span><b>{item.name}</b><em>{item.value}</em></span><i><strong style={{width:`${periodTasks.length?item.value/periodTasks.length*100:0}%`,background:item.color}}/></i></div>)}</div><a className="dashboardTextLink" href="/tasks">Gerenciar tarefas <ArrowRight/></a></section>
   <section className="card projectProgress"><DashboardTitle title="Progresso dos projetos" subtitle="Projetos ativos por evolução"/><ResponsiveContainer width="100%" height={245}><BarChart data={projectData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" domain={[0,100]} tickFormatter={value=>`${value}%`}/><YAxis type="category" dataKey="name" width={95} tick={{fontSize:9}}/><Tooltip formatter={(value:any)=>`${value}%`}/><Bar dataKey="progresso" fill="#3b82f6" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></section>
  </div>
  <div className="dashboardBottom">
   <section className="card priorityTasks"><DashboardTitle title="Prioridades da equipe" subtitle="Tarefas abertas com maior urgência" action={<a href="/tasks">Ver todas <ArrowRight/></a>}/>{priorities.map(task=><PriorityTask key={task.id} task={task} client={clients.find(client=>client.id===task.clientId)}/>)}</section>
   <section className="card dashboardActivity"><DashboardTitle title="Atividade recente" subtitle={`Atualizações encontradas — ${periods[period].label.toLowerCase()}`}/>{activity.map((item,index)=><Activity key={`${item.type}-${index}`} item={item}/>)}{!activity.length&&<div className="dashboardEmpty"><Clock3/><span>Nenhuma atividade registrada neste período.</span></div>}</section>
  </div>
 </main>
}

function PriorityTask({task,client}:{task:Task;client?:Client}){return <article><span className={`priorityDot ${task.priority}`}/><div><b>{task.title}</b><small>{client?.companyName||'Todos os clientes'}</small></div><span className={`dueDate ${new Date(task.dueDate)<new Date()?'late':''}`}>{new Date(task.dueDate).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span></article>}
function Activity({item}:{item:{type:string;title:string;detail:string;date?:string}}){return <article><span className={`activityIcon ${item.type}`}>{item.type==='finance'?<WalletCards/>:item.type==='task'?<CheckCircle2/>:<Users/>}</span><div><b>{item.title}</b><small>{item.detail}</small></div><time>{relativeDate(item.date)}</time></article>}
function buildRevenueData(period:Period,entries:FinancialEntry[],mrr:number){const total=period==='30d'?5:period==='90d'?3:period==='6m'?6:12,isWeeks=period==='30d';return Array.from({length:total},(_,index)=>{const end=new Date(),start=new Date();if(isWeeks){end.setDate(end.getDate()-(total-1-index)*7);start.setTime(end.getTime());start.setDate(start.getDate()-6)}else{end.setMonth(end.getMonth()-(total-1-index),1);end.setMonth(end.getMonth()+1,0);start.setFullYear(end.getFullYear(),end.getMonth(),1)}const items=entries.filter(entry=>{const date=parseDate(entry.dueDate);return date&&date>=start&&date<=end}),extra=items.filter(entry=>entry.kind!=='recurring').reduce((sum,entry)=>sum+entry.value,0);return {label:isWeeks?`${start.getDate()}/${start.getMonth()+1}`:start.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),previsto:(isWeeks?mrr/4:mrr)+extra,recebido:items.filter(entry=>entry.status==='received').reduce((sum,entry)=>sum+entry.value,0)}})}
function priorityValue(priority:Task['priority']){return {low:1,medium:2,high:3,urgent:4}[priority]}
function relativeDate(value?:string){const date=parseDate(value);if(!date)return 'Agora';const days=Math.max(0,Math.floor((Date.now()-date.getTime())/86400000));return days===0?'Hoje':days===1?'Ontem':`${days} dias`}
function DashboardKpi({icon,label,value,note,tone='',trend}:{icon:React.ReactNode;label:string;value:string;note:string;tone?:string;trend:string}){return <article><span className={`dashboardKpiIcon ${tone}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div><i className={`dataSource ${trend}`}>Ao vivo</i></article>}
function DashboardTitle({title,subtitle,action}:{title:string;subtitle:string;action?:React.ReactNode}){return <div className="connectedTitle"><div><h3>{title}</h3><p>{subtitle}</p></div>{action}</div>}
function Pulse({label,value,icon,tone}:{label:string;value:number;icon:React.ReactNode;tone:string}){return <div className="pulseRow"><span className={`pulseIcon ${tone}`}>{icon}</span><div><p><b>{label}</b><strong>{value}%</strong></p><i><em style={{width:`${Math.min(100,value)}%`}}/></i></div></div>}
