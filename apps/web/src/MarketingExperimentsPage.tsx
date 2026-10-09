import CompactFilters from './CompactFilters';
import {usePersistentState} from './persistent-ui';
import KanbanCardSummary from './KanbanCardSummary';
import {useMemo,useState} from 'react';
import {Check,CircleDollarSign,FlaskConical,Lightbulb,Plus,Search,TrendingUp,X} from 'lucide-react';
import {useStoreData} from './app/useStoreData';
import {formatMarketingMetric,marketingMetricCatalog,metricValue,type MarketingMetricKey} from './marketing-dashboard-config';
import {marketingProviders,normalizeClientMarketingIntegrations} from './marketing-integrations';
import {normalizeMarketingMetricsSnapshots,type MarketingMetricsSnapshot,type MarketingPerformanceRow} from './marketing-metrics';
import {normalizeMarketingExperiments,upsertMarketingExperiment,type MarketingExperiment,type MarketingExperimentChannel,type MarketingExperimentStatus,type MarketingExperimentOutcome} from './marketing-experiments';
import type {Client,TeamMember} from './types';

const columns:Array<{id:MarketingExperimentStatus;label:string;hint:string}>=[
 {id:'idea',label:'Ideias',hint:'Hipóteses para explorar'},
 {id:'planned',label:'Planejados',hint:'Prontos para começar'},
 {id:'running',label:'Em andamento',hint:'Testes ativos'},
 {id:'analyzing',label:'Em análise',hint:'Interpretando resultados'},
 {id:'completed',label:'Concluídos',hint:'Resultados e aprendizados'},
];
const channelLabels:Record<MarketingExperimentChannel,string>={meta_ads:'Meta Ads',google_ads:'Google Ads',instagram_organic:'Instagram orgânico',landing_page:'Site / landing page',email:'E-mail / CRM',other:'Outro canal'};
const outcomeLabels:Record<MarketingExperimentOutcome,string>={won:'Venceu',lost:'Não venceu',inconclusive:'Inconclusivo'};
const isoToday=()=>new Date().toISOString().slice(0,10);

export default function MarketingExperimentsPage(){
 const [clients]=useStoreData<Client[]>('clients',[]),[team]=useStoreData<TeamMember[]>('team',[]);
 const [storedIntegrations]=useStoreData('client_marketing_integrations',[] as unknown[]),[storedSnapshots]=useStoreData('marketing_metrics',[] as unknown[]);
 const [storedExperiments,setStoredExperiments]=useStoreData('marketing_experiments',[] as unknown[]);
 const experiments=useMemo(()=>normalizeMarketingExperiments(storedExperiments),[storedExperiments]);
 const integrations=useMemo(()=>normalizeClientMarketingIntegrations(storedIntegrations),[storedIntegrations]);
 const snapshots=useMemo(()=>normalizeMarketingMetricsSnapshots(storedSnapshots),[storedSnapshots]);
 const activeClients=clients.filter(client=>client.status==='active');
 const activeTeam=team.filter(member=>member.status==='active');
 const [editing,setEditing]=useState<MarketingExperiment|null|undefined>(undefined),[query,setQuery]=usePersistentState('roas_filter_experiments_query',''),[clientFilter,setClientFilter]=usePersistentState('roas_filter_experiments_client','all'),[channelFilter,setChannelFilter]=usePersistentState('roas_filter_experiments_channel','all');
 const [expanded,setExpanded]=useState<Partial<Record<MarketingExperimentStatus,boolean>>>({});
 const filtered=experiments.filter(item=>{
  const client=clients.find(value=>value.id===item.clientId),needle=query.trim().toLocaleLowerCase('pt-BR');
  return (clientFilter==='all'||item.clientId===clientFilter)&&(channelFilter==='all'||item.channel===channelFilter)&&(!needle||`${item.title} ${item.hypothesis} ${item.campaignName} ${client?.companyName||''}`.toLocaleLowerCase('pt-BR').includes(needle));
 });
 const activeCount=experiments.filter(item=>item.status==='running'||item.status==='analyzing').length;
 const completed=experiments.filter(item=>item.status==='completed'),wins=completed.filter(item=>item.outcome==='won').length;
 const spend=experiments.reduce((total,item)=>total+item.spentValue,0);
 const save=(experiment:MarketingExperiment)=>{const next=upsertMarketingExperiment(experiments,experiment);setStoredExperiments(next)};
 const move=(experiment:MarketingExperiment,status:MarketingExperimentStatus)=>save({...experiment,status});
 const remove=(experiment:MarketingExperiment)=>{if(!confirm(`Excluir o experimento “${experiment.title}”?`))return;setStoredExperiments(experiments.filter(item=>item.id!==experiment.id));setEditing(undefined)};
 const showMore=(status:MarketingExperimentStatus)=>setExpanded(current=>({...current,[status]:!current[status]}));

 return <main className="marketingExperimentsPage">
  <section className="marketingExperimentsHero"><div className="marketingExperimentsIntro"><span><FlaskConical/> GROWTH LAB</span><h2>Experimentos de marketing</h2><p>Transforme hipóteses em testes, acompanhe o que funciona e compartilhe os aprendizados com a equipe.</p></div><button type="button" className="btn" onClick={()=>setEditing(null)}><Plus/> Novo experimento</button></section>
  <section className="marketingExperimentStats" aria-label="Resumo dos experimentos">
   <Stat icon={<FlaskConical/>} label="Testes ativos" value={String(activeCount)} note="Em andamento ou análise" tone="purple"/>
   <Stat icon={<Check/>} label="Concluídos" value={String(completed.length)} note={completed.length?`${wins} com resultado positivo`:'Ainda sem resultados'} tone="green"/>
   <Stat icon={<TrendingUp/>} label="Taxa de sucesso" value={completed.length?`${Math.round(wins/completed.length*100)}%`:'—'} note="Entre os testes concluídos" tone="blue"/>
   <Stat icon={<CircleDollarSign/>} label="Investimento registrado" value={money(spend)} note="Soma do valor gasto nos testes" tone="orange"/>
  </section>
  <CompactFilters label="Filtros de experimentos" query={query} onQuery={setQuery} placeholder="Buscar experimento, cliente ou hipótese..." primary={<label><span>Cliente</span><select aria-label="Filtrar por cliente" value={clientFilter} onChange={event=>setClientFilter(event.target.value)}><option value="all">Todos os clientes</option>{clients.map(client=><option key={client.id} value={client.id}>{client.companyName}</option>)}</select></label>} secondary={<label><span>Canal</span><select aria-label="Filtrar por canal" value={channelFilter} onChange={event=>setChannelFilter(event.target.value)}><option value="all">Todos os canais</option>{Object.entries(channelLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>} secondaryCount={channelFilter==='all'?0:1} chips={[
 ...(query?[{id:'query',label:`Busca: ${query}`,onRemove:()=>setQuery('')}]:[]),
 ...(clientFilter!=='all'?[{id:'client',label:`Cliente: ${clients.find(client=>client.id===clientFilter)?.companyName||'Não encontrado'}`,onRemove:()=>setClientFilter('all')}]:[]),
 ...(channelFilter!=='all'?[{id:'channel',label:`Canal: ${channelLabels[channelFilter as MarketingExperimentChannel]}`,onRemove:()=>setChannelFilter('all')}]:[])
 ]} onClear={()=>{setQuery('');setClientFilter('all');setChannelFilter('all')}} result={<>{filtered.length} experimentos</>}/>
  {!experiments.length?<section className="marketingExperimentEmpty card"><span><Lightbulb/></span><h3>Comece com uma hipótese</h3><p>Registre uma ideia, defina como medir o resultado e acompanhe o aprendizado em cada etapa.</p><button type="button" className="btn" onClick={()=>setEditing(null)}><Plus/> Criar primeiro experimento</button></section>:<div className="marketingExperimentBoard lightKanban" aria-label="Kanban de experimentos de marketing">{columns.map(column=>{
   const items=filtered.filter(item=>item.status===column.id),expandedColumn=Boolean(expanded[column.id]),visible=expandedColumn?items:items.slice(0,5);
   return <section className={`marketingExperimentColumn ${column.id}`} key={column.id} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const id=event.dataTransfer.getData('marketing-experiment-id'),experiment=experiments.find(item=>item.id===id);if(experiment&&experiment.status!==column.id)move(experiment,column.id)}}><header><div><b>{column.label}</b><span>{items.length}</span><small>{column.hint}</small></div><button type="button" title={`Criar experimento em ${column.label}`} aria-label={`Criar experimento em ${column.label}`} onClick={()=>setEditing(null)}><Plus/></button></header><div className="marketingExperimentCards">{visible.map(item=><ExperimentCard key={item.id} experiment={item} owner={activeTeam.find(member=>member.id===item.ownerId)?.name} onEdit={()=>setEditing(item)}/>)}</div>{items.length>5&&<button type="button" className="marketingExperimentMore" onClick={()=>showMore(column.id)}>{expandedColumn?'Mostrar menos':`Ver mais ${items.length-5}`}</button>}{!items.length&&<p className="marketingExperimentColumnEmpty">Arraste um experimento para cá ou crie um novo.</p>}</section>;
  })}</div>}
  {editing!==undefined&&<ExperimentModal initial={editing} clients={activeClients} allClients={clients} team={activeTeam} integrations={integrations} snapshots={snapshots} onClose={()=>setEditing(undefined)} onSave={experiment=>{save(experiment);setEditing(undefined)}} onDelete={editing?()=>remove(editing):undefined}/>}
 </main>;
}

function ExperimentCard({experiment,owner,onEdit}:{experiment:MarketingExperiment;owner?:string;onEdit:()=>void}){
 const late=Boolean(experiment.status!=='completed'&&experiment.dueDate&&experiment.dueDate<isoToday());
 return <article className="marketingExperimentCard" draggable onDragStart={event=>event.dataTransfer.setData('marketing-experiment-id',experiment.id)}><button type="button" className="marketingExperimentCardOpen" aria-label={`Abrir experimento ${experiment.title}`} onClick={onEdit}><KanbanCardSummary title={experiment.title} owner={owner} dueDate={experiment.dueDate} late={late}/></button></article>;
}

function ExperimentModal({initial,clients,allClients,team,integrations,snapshots,onClose,onSave,onDelete}:{initial:MarketingExperiment|null;clients:Client[];allClients:Client[];team:TeamMember[];integrations:ReturnType<typeof normalizeClientMarketingIntegrations>;snapshots:MarketingMetricsSnapshot[];onClose:()=>void;onSave:(experiment:MarketingExperiment)=>void;onDelete?:()=>void}){
 const [title,setTitle]=useState(initial?.title||''),[clientId,setClientId]=useState(initial?.clientId||clients[0]?.id||''),[channel,setChannel]=useState<MarketingExperimentChannel>(initial?.channel||'meta_ads');
 const [integrationId,setIntegrationId]=useState(initial?.integrationId||''),[campaignId,setCampaignId]=useState(initial?.campaignId||''),[campaignName,setCampaignName]=useState(initial?.campaignName||'');
 const [hypothesis,setHypothesis]=useState(initial?.hypothesis||''),[metricKey,setMetricKey]=useState<MarketingMetricKey>(initial?.metricKey||'results'),[direction,setDirection]=useState<'increase'|'decrease'>(initial?.direction||'increase');
 const [baseline,setBaseline]=useState(initial?String(initial.baselineValue):'0'),[target,setTarget]=useState(initial?String(initial.targetValue):''),[current,setCurrent]=useState(initial?String(initial.currentValue):'0');
 const [spendLimit,setSpendLimit]=useState(initial?String(initial.spendLimit):''),[spentValue,setSpentValue]=useState(initial?String(initial.spentValue):'0'),[ownerId,setOwnerId]=useState(initial?.ownerId||''),[dueDate,setDueDate]=useState(initial?.dueDate||'');
 const [status,setStatus]=useState<MarketingExperimentStatus>(initial?.status||'idea'),[outcome,setOutcome]=useState<MarketingExperimentOutcome|''>(initial?.outcome||''),[learning,setLearning]=useState(initial?.learning||''),[error,setError]=useState('');
 const clientIntegrations=integrations.filter(item=>item.clientId===clientId&&item.provider===channel&&item.status==='connected');
 const currentIntegrationId=clientIntegrations.some(item=>item.id===integrationId)?integrationId:clientIntegrations[0]?.id||'';
 const campaigns=useMemo(()=>{
  const byId=new Map<string,{id:string;name:string;integrationId:string;row:MarketingPerformanceRow;snapshot:MarketingMetricsSnapshot}>();
  snapshots.filter(snapshot=>snapshot.clientId===clientId&&snapshot.provider===channel&&(!currentIntegrationId||snapshot.integrationId===currentIntegrationId)).sort((a,b)=>b.syncedAt.localeCompare(a.syncedAt)).forEach(snapshot=>snapshot.performanceRows.filter(row=>row.level==='campaign').forEach(row=>{const key=`${snapshot.integrationId}:${row.id}`;if(!byId.has(key))byId.set(key,{id:row.id,name:row.name,integrationId:snapshot.integrationId,row,snapshot})}));
  return [...byId.values()];
 },[snapshots,clientId,channel,currentIntegrationId]);
 const selectedCampaign=campaigns.find(item=>item.id===campaignId);
 const campaignMetric=selectedCampaign?metricValue(selectedCampaign.row,metricKey):undefined;
 const onChannelChange=(value:MarketingExperimentChannel)=>{setChannel(value);setIntegrationId('');setCampaignId('');setCampaignName('')};
 const submit=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();const base=Number(baseline),goal=Number(target),actual=Number(current),budget=Number(spendLimit||0),spent=Number(spentValue||0);
  if(!clientId){setError('Selecione um cliente para este experimento.');return}
  if(!title.trim()||!hypothesis.trim()){setError('Preencha o nome e a hipótese do experimento.');return}
  if(!Number.isFinite(base)||!Number.isFinite(goal)||base===goal){setError('A linha de base e a meta precisam ser diferentes.');return}
  if((direction==='increase'&&goal<base)||(direction==='decrease'&&goal>base)){setError(direction==='increase'?'Para uma meta de aumento, a meta deve ser maior que a linha de base.':'Para uma meta de redução, a meta deve ser menor que a linha de base.');return}
  if(![base,goal,actual,budget,spent].every(value=>Number.isFinite(value)&&value>=0)){setError('Use valores válidos, iguais ou maiores que zero.');return}
  const now=new Date().toISOString();
  onSave({id:initial?.id||crypto.randomUUID(),title:title.trim(),clientId,channel,integrationId:currentIntegrationId||undefined,campaignId:selectedCampaign?.id||undefined,campaignName:selectedCampaign?.name||campaignName.trim(),hypothesis:hypothesis.trim(),metricKey,direction,baselineValue:base,targetValue:goal,currentValue:actual,spendLimit:budget,spentValue:spent,ownerId,dueDate,status,outcome:status==='completed'?outcome||undefined:undefined,learning:learning.trim(),createdAt:initial?.createdAt||now,updatedAt:now});
 };
 const importCampaignMetric=()=>{if(campaignMetric!==undefined)setCurrent(String(Number(campaignMetric.toFixed(2))))};
 return <div className="overlay marketingExperimentOverlay"><div className="modal marketingExperimentModal" role="dialog" aria-modal="true" aria-label={initial?'Editar experimento':'Novo experimento'}><div className="modalHead"><div><small>GROWTH LAB · {initial?'ACOMPANHAMENTO':'NOVO TESTE'}</small><h2>{initial?'Editar experimento':'Planejar experimento'}</h2><p>Uma hipótese clara e uma métrica observável deixam o aprendizado útil.</p></div><button type="button" className="iconBtn" aria-label="Fechar" onClick={onClose}><X/></button></div><form onSubmit={submit} className="marketingExperimentForm">
  <label className="experimentField full">Nome do experimento<input autoFocus required maxLength={120} value={title} onChange={event=>setTitle(event.target.value)} placeholder="Ex.: Testar criativo com depoimento de cliente"/></label>
  <label className="experimentField">Cliente<select required value={clientId} onChange={event=>{setClientId(event.target.value);setIntegrationId('');setCampaignId('');setCampaignName('')}}><option value="">Selecione um cliente</option>{(initial?allClients:clients).map(client=><option key={client.id} value={client.id}>{client.companyName}{client.status==='inactive'?' · Inativo':''}</option>)}</select></label>
  <label className="experimentField">Canal<select value={channel} onChange={event=>onChannelChange(event.target.value as MarketingExperimentChannel)}>{Object.entries(channelLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
  <label className="experimentField full">Hipótese<textarea required maxLength={2000} rows={3} value={hypothesis} onChange={event=>setHypothesis(event.target.value)} placeholder="Acreditamos que [mudança] para [público] vai gerar [resultado] porque [motivo]."/></label>
  <label className="experimentField">Métrica principal<select value={metricKey} onChange={event=>setMetricKey(event.target.value as MarketingMetricKey)}>{marketingMetricCatalog.map(metric=><option key={metric.id} value={metric.id}>{metric.label} · {metric.category}</option>)}</select></label>
  <label className="experimentField">O resultado deve<select value={direction} onChange={event=>setDirection(event.target.value as 'increase'|'decrease')}><option value="increase">Aumentar</option><option value="decrease">Diminuir</option></select></label>
  <label className="experimentField">Linha de base<input type="number" min="0" step="any" required value={baseline} onChange={event=>setBaseline(event.target.value)}/></label>
  <label className="experimentField">Meta<input type="number" min="0" step="any" required value={target} onChange={event=>setTarget(event.target.value)}/></label>
  <label className="experimentField">Valor observado<input type="number" min="0" step="any" required value={current} onChange={event=>setCurrent(event.target.value)}/></label>
  <label className="experimentField">Responsável<select value={ownerId} onChange={event=>setOwnerId(event.target.value)}><option value="">Sem responsável</option>{team.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
  <label className="experimentField">Prazo<input type="date" value={dueDate} onChange={event=>setDueDate(event.target.value)}/></label>
  <label className="experimentField">Limite de investimento (R$)<input type="number" min="0" step="0.01" value={spendLimit} onChange={event=>setSpendLimit(event.target.value)} placeholder="Opcional"/></label>
  <label className="experimentField">Investimento realizado (R$)<input type="number" min="0" step="0.01" value={spentValue} onChange={event=>setSpentValue(event.target.value)}/></label>
  <div className="experimentCampaignSection full"><div><b>Campanha relacionada</b><small>Opcional · escolha uma campanha sincronizada ou informe o nome</small></div>{clientIntegrations.length>0&&<label className="experimentField">Conta de anúncios<select value={currentIntegrationId} onChange={event=>{setIntegrationId(event.target.value);setCampaignId('')}}>{clientIntegrations.map(item=><option key={item.id} value={item.id}>{item.resourceName||item.resourceId||marketingProviders.find(provider=>provider.id===item.provider)?.name}</option>)}</select></label>}<label className="experimentField">Campanha sincronizada<select value={campaignId} onChange={event=>{setCampaignId(event.target.value);const match=campaigns.find(item=>item.id===event.target.value);if(match)setCampaignName(match.name)}}><option value="">Informar nome manualmente / sem campanha</option>{campaigns.map(item=><option key={`${item.integrationId}:${item.id}`} value={item.id}>{item.name}</option>)}</select></label>{!campaignId&&<label className="experimentField">Nome da campanha<input maxLength={160} value={campaignName} onChange={event=>setCampaignName(event.target.value)} placeholder={campaigns.length?'Opcional':'Sem dados de campanha sincronizados'}/></label>}{campaignId&&<div className="experimentMetricImport"><span>Último valor sincronizado: <b>{formatMarketingMetric(metricKey,campaignMetric||0)}</b></span><button type="button" className="btn secondary" onClick={importCampaignMetric} disabled={campaignMetric===undefined}>Usar como valor observado</button></div>}</div>
  {initial&&<><label className="experimentField">Etapa atual<select value={status} onChange={event=>setStatus(event.target.value as MarketingExperimentStatus)}>{columns.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{status==='completed'&&<label className="experimentField">Resultado<select aria-label="Resultado" value={outcome} onChange={event=>setOutcome(event.target.value as MarketingExperimentOutcome| '')}><option value="">Ainda não classificado</option>{Object.entries(outcomeLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}</>}
  {status==='completed'&&<label className="experimentField full">Aprendizado e próximos passos<textarea rows={3} maxLength={3000} value={learning} onChange={event=>setLearning(event.target.value)} placeholder="O que aprendemos? O que deve ser repetido, ajustado ou descartado?"/></label>}
  {error&&<p className="experimentFormError full" role="alert">{error}</p>}
  <div className="formActions full">{onDelete&&<button type="button" className="btn danger" onClick={onDelete}>Excluir experimento</button>}<span/><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn">{initial?'Salvar alterações':'Criar experimento'}</button></div>
 </form></div></div>;
}

function Stat({icon,label,value,note,tone}:{icon:React.ReactNode;label:string;value:string;note:string;tone:string}){return <article className="card"><span className={`experimentStatIcon ${tone}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>}
const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=(value:string)=>{const parsed=new Date(`${value.slice(0,10)}T12:00:00`);return Number.isNaN(parsed.getTime())?'Sem prazo':parsed.toLocaleDateString('pt-BR')};
