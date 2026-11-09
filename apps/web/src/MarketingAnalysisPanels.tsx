import {useEffect,useRef,useState} from 'react';
import {ArrowDown,ArrowUp,BarChart3,Plus,Settings2,WalletCards,X} from 'lucide-react';
import {MetricHelp} from './DashboardReading';
import MarketingFunnel from './MarketingFunnel';
import {defaultMarketingAnalysisPanels,formatMarketingMetric,marketingAnalysisMetricLimit,marketingMetricCatalog,metricValue,type MarketingAnalysisPanel,type MarketingAnalysisPanels as PanelPreferences,type MarketingMetricKey} from './marketing-dashboard-config';
import type {MarketingMetrics} from './marketing-metrics';
import './marketing-analysis-panels.css';

const titles={journey:'Jornada de resultados',efficiency:'Eficiência da mídia'};
const definitions=new Map(marketingMetricCatalog.map(item=>[item.id,item]));
const categories=[...new Set(marketingMetricCatalog.map(item=>item.category))];
const groupedMetrics=categories.map(category=>({category,items:marketingMetricCatalog.filter(item=>item.category===category)}));

export default function MarketingAnalysisPanels({metrics,panels,onChange}:{metrics:MarketingMetrics;panels:PanelPreferences;onChange:(panels:PanelPreferences)=>void}){
 const [editing,setEditing]=useState<MarketingAnalysisPanel|null>(null);
 const stages=panels.journey.map(id=>{
  const definition=definitions.get(id)!;
  return {id,label:definition.label,formatted:formatMarketingMetric(id,metricValue(metrics,id)),help:<MetricHelp label={definition.label} description={definition.description}/>};
 });
 return <div className="marketingDashboardGrid marketingPerformanceGrid">
  <section className="card marketingFunnelPanel">
   <PanelHeading panel="journey" detail="Etapas e indicadores do período" onEdit={setEditing}/>
   <MarketingFunnel stages={stages}/>
  </section>
  <section className="card marketingEfficiencyPanel">
   <PanelHeading panel="efficiency" detail="Indicadores calculados com os dados sincronizados" onEdit={setEditing}/>
   <div className="marketingEfficiencyGrid">{panels.efficiency.map(id=>{
    const definition=definitions.get(id)!,Icon=definition.format==='currency'?WalletCards:BarChart3;
    return <article key={id}><span><Icon aria-hidden="true"/></span><div><small>{definition.label}<MetricHelp label={definition.label} description={definition.description}/></small><strong>{formatMarketingMetric(id,metricValue(metrics,id))}</strong></div></article>;
   })}</div>
  </section>
  {editing&&<PanelEditor key={editing} panel={editing} initial={panels[editing]} onClose={()=>setEditing(null)} onSave={selection=>onChange({...panels,[editing]:selection})}/>}
 </div>;
}

function PanelHeading({panel,detail,onEdit}:{panel:MarketingAnalysisPanel;detail:string;onEdit:(panel:MarketingAnalysisPanel)=>void}){
 return <div className="marketingPanelHead"><div><h3>{titles[panel]}</h3><p>{detail}</p></div><button type="button" className="marketingOverviewCustomize" aria-label={`Personalizar ${titles[panel]}`} onClick={()=>onEdit(panel)}><Settings2 aria-hidden="true"/> Personalizar</button></div>;
}

function PanelEditor({panel,initial,onClose,onSave}:{panel:MarketingAnalysisPanel;initial:MarketingMetricKey[];onClose:()=>void;onSave:(selection:MarketingMetricKey[])=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const addTrigger=useRef<HTMLButtonElement>(null);
 const [selection,setSelection]=useState(initial);
 const [adding,setAdding]=useState(false);
 const [candidate,setCandidate]=useState<MarketingMetricKey|''>('');
 const canAdd=selection.length<marketingAnalysisMetricLimit;
 const canInclude=canAdd&&candidate!==''&&definitions.has(candidate)&&!selection.includes(candidate);
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close()},[]);
 const close=()=>{dialog.current?.close();onClose()};
 const move=(index:number,offset:number)=>setSelection(current=>{
  const target=index+offset;if(target<0||target>=current.length)return current;
  const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next;
 });
 const closePicker=()=>{setAdding(false);setCandidate('')};
 const include=()=>{
  if(!canInclude||!candidate)return;
  setSelection(current=>current.length<marketingAnalysisMetricLimit&&!current.includes(candidate)?[...current,candidate]:current);
  closePicker();
  if(selection.length+1<marketingAnalysisMetricLimit)addTrigger.current?.focus();
 };
 return <dialog ref={dialog} className="metaBreakdownDialog marketingAnalysisEditor" aria-labelledby="marketing-analysis-title" onCancel={event=>{event.preventDefault();close()}}>
  <div className="metaBreakdownHeading"><div><span>MARKETING · INDICADORES</span><h2 id="marketing-analysis-title">{titles[panel]}</h2><p>Escolha até {marketingAnalysisMetricLimit} métricas e organize a ordem em que aparecem.</p></div><button className="iconBtn" type="button" aria-label="Fechar" onClick={close}><X aria-hidden="true"/></button></div>
  <form onSubmit={event=>{event.preventDefault();if(selection.length&&!adding){onSave(selection);close()}}}>
   <ol className="marketingAnalysisChoices">{selection.map((id,index)=><li key={id}>
    <select aria-label={`Métrica ${index+1}`} value={id} onChange={event=>{const next=event.target.value as MarketingMetricKey;setSelection(current=>current.map((item,i)=>i===index?next:item))}}>
     {groupedMetrics.map(({category,items})=><optgroup key={category} label={category}>{items.map(item=><option key={item.id} value={item.id} disabled={item.id!==id&&selection.includes(item.id)}>{item.label}</option>)}</optgroup>)}
    </select>
    <button className="iconBtn" type="button" aria-label={`Mover métrica ${index+1} para cima`} disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp aria-hidden="true"/></button>
    <button className="iconBtn" type="button" aria-label={`Mover métrica ${index+1} para baixo`} disabled={index===selection.length-1} onClick={()=>move(index,1)}><ArrowDown aria-hidden="true"/></button>
    <button className="iconBtn" type="button" aria-label={`Remover métrica ${index+1}`} disabled={selection.length===1} onClick={()=>setSelection(current=>current.filter(item=>item!==id))}><X aria-hidden="true"/></button>
   </li>)}</ol>
   <button ref={addTrigger} className="btn secondary" type="button" aria-expanded={adding} disabled={!canAdd} onClick={()=>{if(adding)closePicker();else setAdding(true)}}>{adding?<X aria-hidden="true"/>:<Plus aria-hidden="true"/>} {adding?'Cancelar inclusão':'Adicionar métrica'}</button>
   {adding&&<div className="marketingAnalysisPicker">
    <label>Nova métrica <select aria-label="Nova métrica" autoFocus value={candidate} onChange={event=>setCandidate(event.target.value as MarketingMetricKey|'')}>
     <option value="">Escolha uma métrica</option>
     {groupedMetrics.map(({category,items})=>{
      const available=items.filter(item=>!selection.includes(item.id));
      return available.length?<optgroup key={category} label={category}>{available.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>:null;
     })}
    </select></label>
    <button type="button" className="btn secondary" disabled={!canInclude} onClick={include}>Incluir métrica</button>
   </div>}
   {!canAdd&&<p className="marketingAnalysisLimit">Limite de {marketingAnalysisMetricLimit} métricas. Remova uma para incluir outra.</p>}
   <div className="formActions"><button className="btn secondary" type="button" onClick={()=>{setSelection(defaultMarketingAnalysisPanels[panel]);closePicker()}}>Restaurar padrão</button><button className="btn" type="submit" disabled={adding}>Salvar métricas</button></div>
  </form>
 </dialog>;
}
