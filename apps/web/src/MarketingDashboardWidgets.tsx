import {useEffect,useState} from 'react';
import {BarChart3,ChartBarBig,ChartNoAxesColumnIncreasing,Filter,Pencil,Plus,Search,Table2,Trash2,X} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,Cell,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {formatMarketingMetric,marketingMetricCatalog,metricValue,type MarketingDashboardWidget,type MarketingMetricKey,type MarketingWidgetType} from './marketing-dashboard-config';
import type {MarketingMetrics} from './marketing-metrics';
import MarketingFunnel from './MarketingFunnel';
import type {ClientMarketingIntegration} from './marketing-integrations';
import type {MarketingRange} from './marketing-comparison';
import {loadMetaBreakdown} from './meta-breakdown-client';

const colors=['#6541ee','#2f80ed','#14a36d','#f59e0b','#e55370','#8b5cf6'];
const widgetTypes:Array<{id:MarketingWidgetType;label:string;description:string;icon:React.ReactNode}>=[
 {id:'bar',label:'Colunas',description:'Comparação vertical entre métricas',icon:<ChartNoAxesColumnIncreasing/>},
 {id:'horizontal_bar',label:'Barras',description:'Comparação horizontal',icon:<ChartBarBig/>},
 {id:'pie',label:'Pizza',description:'Participação proporcional',icon:<PieIcon/>},
 {id:'audience_pie',label:'Pizza de idade e gênero',description:'Distribuição de impressões do Meta Ads',icon:<PieIcon/>},
 {id:'table',label:'Tabela',description:'Leitura direta dos valores',icon:<Table2/>},
 {id:'funnel',label:'Funil',description:'Queda entre etapas da jornada',icon:<Filter/>},
];

export default function MarketingDashboardWidgets({metrics,widgets,onChange,metaAccount,range,hasMetrics}:{metrics:MarketingMetrics;widgets:MarketingDashboardWidget[];onChange:(widgets:MarketingDashboardWidget[])=>void;metaAccount?:ClientMarketingIntegration;range:MarketingRange;hasMetrics:boolean}){
 const [editing,setEditing]=useState<MarketingDashboardWidget|null|undefined>(undefined);
 const openCreate=()=>setEditing(null);
 const save=(widget:MarketingDashboardWidget)=>{onChange(editing?widgets.map(item=>item.id===widget.id?widget:item):[...widgets,widget]);setEditing(undefined)};
 const remove=(id:string)=>{if(confirm('Excluir esta visualização do dashboard?'))onChange(widgets.filter(widget=>widget.id!==id))};
 return <section className="marketingCustomVisuals">
  <div className="marketingCustomVisualsHead"><div><small>DASHBOARD PERSONALIZADO</small><h3>Suas visualizações</h3><p>Transforme as métricas selecionadas em gráficos e tabelas.</p></div><button type="button" className="btn" onClick={openCreate}><Plus/> Adicionar gráfico</button></div>
  {widgets.length?<div className="marketingWidgetGrid">{widgets.map(widget=><Widget key={widget.id} widget={widget} metrics={metrics} metaAccount={metaAccount} range={range} hasMetrics={hasMetrics} onEdit={()=>setEditing(widget)} onRemove={()=>remove(widget.id)}/>)}</div>:<button type="button" className="marketingWidgetEmpty" onClick={openCreate}><span><BarChart3/></span><b>Adicione sua primeira visualização</b><small>Escolha as métricas e o formato que melhor representa sua análise.</small></button>}
  {editing!==undefined&&<WidgetModal initial={editing} onClose={()=>setEditing(undefined)} onSave={save}/>} 
 </section>;
}

function Widget({widget,metrics,metaAccount,range,hasMetrics,onEdit,onRemove}:{widget:MarketingDashboardWidget;metrics:MarketingMetrics;metaAccount?:ClientMarketingIntegration;range:MarketingRange;hasMetrics:boolean;onEdit:()=>void;onRemove:()=>void}){
 const data=widget.metricIds.map((id,index)=>{const definition=marketingMetricCatalog.find(metric=>metric.id===id)!;return{id,label:definition.label,value:metricValue(metrics,id),formatted:formatMarketingMetric(id,metricValue(metrics,id)),fill:colors[index%colors.length]}});
 return <article className="card marketingWidget"><header><div><h4>{widget.title}</h4><small>{widgetTypes.find(type=>type.id===widget.type)?.label}{widget.type==='audience_pie'?' · Meta Ads':` · ${data.length} métricas`}</small></div><span><button type="button" aria-label={`Editar ${widget.title}`} onClick={onEdit}><Pencil/></button><button type="button" aria-label={`Excluir ${widget.title}`} onClick={onRemove}><Trash2/></button></span></header><div className="marketingWidgetBody">{widget.type==='audience_pie'?<AudiencePie account={metaAccount} range={range}/>:!hasMetrics?<WidgetNoData/>:widget.type==='table'?<WidgetTable data={data}/>:widget.type==='pie'?<WidgetPie data={data}/>:widget.type==='funnel'?<WidgetFunnel data={data}/>:<WidgetBars data={data} horizontal={widget.type==='horizontal_bar'}/>}</div></article>;
}

type WidgetDatum={id:string;label:string;value:number;formatted:string;fill:string};
function WidgetBars({data,horizontal}:{data:WidgetDatum[];horizontal:boolean}){return <ResponsiveContainer width="100%" height={260}><BarChart data={data} layout={horizontal?'vertical':'horizontal'} margin={{top:8,right:12,bottom:horizontal?4:34,left:horizontal?34:0}}><CartesianGrid strokeDasharray="3 3" vertical={!horizontal}/>{horizontal?<><XAxis type="number"/><YAxis dataKey="label" type="category" width={105} tick={{fontSize:9}}/></>:<><XAxis dataKey="label" tick={{fontSize:8}} angle={-24} textAnchor="end" interval={0}/><YAxis tick={{fontSize:9}}/></>}<Tooltip formatter={(value)=>Number(value||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}/><Bar dataKey="value" radius={horizontal?[0,6,6,0]:[6,6,0,0]}>{data.map(item=><Cell key={item.id} fill={item.fill}/>)}</Bar></BarChart></ResponsiveContainer>}
function WidgetPie({data}:{data:WidgetDatum[]}){const positive=data.filter(item=>item.value>0);if(!positive.length)return <WidgetNoData/>;return <div className="marketingWidgetPie"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={positive} dataKey="value" nameKey="label" innerRadius={48} outerRadius={82} paddingAngle={2}>{positive.map(item=><Cell key={item.id} fill={item.fill}/>)}</Pie><Tooltip formatter={(value)=>Number(value||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}/></PieChart></ResponsiveContainer><div>{positive.map(item=><span key={item.id}><i style={{background:item.fill}}/><small>{item.label}</small><b>{item.formatted}</b></span>)}</div></div>}
function WidgetTable({data}:{data:WidgetDatum[]}){return <div className="marketingWidgetTable">{data.map(item=><div key={item.id}><span><i style={{background:item.fill}}/>{item.label}</span><strong>{item.formatted}</strong></div>)}</div>}
function WidgetFunnel({data}:{data:WidgetDatum[]}){return <MarketingFunnel stages={data}/>}
function WidgetNoData(){return <div className="marketingWidgetNoData"><BarChart3/><span>As métricas selecionadas ainda não possuem dados neste período.</span></div>}

function WidgetModal({initial,onClose,onSave}:{initial:MarketingDashboardWidget|null;onClose:()=>void;onSave:(widget:MarketingDashboardWidget)=>void}){
 const [title,setTitle]=useState(initial?.title||'Análise personalizada'),[type,setType]=useState<MarketingWidgetType>(initial?.type||'bar'),[selected,setSelected]=useState<MarketingMetricKey[]>(initial?.metricIds||['spend','results']),[search,setSearch]=useState('');
 const audience=type==='audience_pie';
 const query=search.trim().toLocaleLowerCase('pt-BR'),visible=marketingMetricCatalog.filter(metric=>!query||`${metric.label} ${metric.category}`.toLocaleLowerCase('pt-BR').includes(query));
 const toggle=(id:MarketingMetricKey)=>setSelected(current=>current.includes(id)?current.filter(item=>item!==id):current.length<6?[...current,id]:current);
 const submit=(event:React.FormEvent)=>{event.preventDefault();if(!audience&&!selected.length)return;const name=title.trim();onSave({id:initial?.id||crypto.randomUUID(),title:audience&&(!name||!initial&&name==='Análise personalizada')?'Idade e gênero':name||'Análise personalizada',type,metricIds:audience?[]:selected})};
 return <div className="overlay"><div className="modal marketingWidgetModal" role="dialog" aria-label={initial?'Editar gráfico':'Adicionar gráfico'}><div className="modalHead"><div><small>VISUALIZAÇÃO PERSONALIZADA</small><h2>{initial?'Editar visualização':'Adicionar gráfico'}</h2><p>Escolha como visualizar os dados do dashboard.</p></div><button type="button" className="iconBtn" aria-label="Fechar" onClick={onClose}><X/></button></div><form onSubmit={submit}><label className="marketingWidgetTitle">Título<input value={title} maxLength={80} onChange={event=>setTitle(event.target.value)}/></label><fieldset className="marketingWidgetTypes"><legend>Formato da visualização</legend><div>{widgetTypes.map(option=><label className={type===option.id?'selected':''} key={option.id}><input type="radio" name="widgetType" checked={type===option.id} onChange={()=>setType(option.id)}/><span>{option.icon}</span><b>{option.label}</b><small>{option.description}</small></label>)}</div></fieldset>{audience?<p className="dashboardReadingNote">A pizza mostra a participação nas impressões do Meta Ads. Alterne entre idade e gênero no gráfico.</p>:<><div className="marketingWidgetMetricHead"><div><b>Métricas</b><small>{selected.length}/6 selecionadas</small></div><label><Search/><input aria-label="Buscar métrica do gráfico" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar métrica..."/></label></div><div className="marketingWidgetMetrics">{visible.map(metric=><label className={selected.includes(metric.id)?'selected':''} key={metric.id}><input type="checkbox" checked={selected.includes(metric.id)} onChange={()=>toggle(metric.id)}/><span><b>{metric.label}</b><small>{metric.category}</small></span></label>)}</div></>}<div className="formActions"><button type="button" className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn" disabled={!audience&&!selected.length}>Salvar visualização</button></div></form></div></div>;
}

function AudiencePie({account,range}:{account?:ClientMarketingIntegration;range:MarketingRange}){
 const [dimension,setDimension]=useState<'age'|'gender'>('age');
 if(!account)return <p className="dashboardReadingNote">Selecione uma conta vinculada do Meta Ads para ver este gráfico.</p>;
 return <div>
  <div className="marketingBreakdownTabs" role="group" aria-label="Recorte da pizza">
   <button type="button" className={dimension==='age'?'active':''} aria-pressed={dimension==='age'} onClick={()=>setDimension('age')}>Idade</button>
   <button type="button" className={dimension==='gender'?'active':''} aria-pressed={dimension==='gender'} onClick={()=>setDimension('gender')}>Gênero</button>
  </div>
  <AudienceSlices key={JSON.stringify([account.id,account.clientId,account.resourceId,dimension,range.from,range.to])} integrationId={account.id} clientId={account.clientId} dimension={dimension} from={range.from} to={range.to}/>
 </div>;
}

function AudienceSlices({integrationId,clientId,dimension,from,to}:{integrationId:string;clientId:string;dimension:'age'|'gender';from:string;to:string}){
 const [data,setData]=useState<{rows:WidgetDatum[];partial:boolean}>(),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  void loadMetaBreakdown({integrationId,clientId,dimension,from,to},controller.signal).then(result=>{
   if(controller.signal.aborted)return;
   const rows=result.rows.filter(row=>typeof row.impressions==='number'&&Number.isFinite(row.impressions)&&row.impressions>0);
   const total=rows.reduce((sum,row)=>sum+(row.impressions??0),0);
   setData({partial:result.truncated||result.rows.some(row=>row.impressions===null),rows:rows.map((row,index)=>{
    const value=row.impressions??0,group=row.values[0]||'unknown';
    const label=group==='male'?'Masculino':group==='female'?'Feminino':group==='unknown'?'Não informado':group;
    return {id:row.id,value,label,fill:colors[index%colors.length],formatted:(value/total).toLocaleString('pt-BR',{style:'percent',maximumFractionDigits:1})};
   })});
  }).catch(()=>{if(!controller.signal.aborted)setError(true)});
  return()=>controller.abort();
 },[integrationId,clientId,dimension,from,to,attempt]);
 if(error)return <div className="marketingWidgetNoData"><span role="alert">Não foi possível consultar o público do Meta Ads.</span><button type="button" className="btn secondary" onClick={()=>{setError(false);setAttempt(value=>value+1)}}>Tentar novamente</button></div>;
 if(!data)return <p className="dashboardReadingNote" role="status">Carregando dados de público…</p>;
 if(!data.rows.length)return <p className="dashboardReadingNote">Sem impressões disponíveis para este recorte no período.</p>;
 return <><WidgetPie data={data.rows}/><p className="dashboardReadingNote">Participação nas impressões {data.partial?'disponíveis neste recorte (dados parciais).':'por '+(dimension==='age'?'faixa etária.':'gênero.')}</p></>;
}

function PieIcon(){return <span className="marketingPieIcon"/>}
