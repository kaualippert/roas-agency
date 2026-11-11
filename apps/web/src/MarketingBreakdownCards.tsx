import {useEffect,useState} from 'react';
import {BarChart3,Layers3,Table2,X} from 'lucide-react';
import {loadMetaBreakdown,type MetaBreakdownDimension} from './meta-breakdown-client';
import {breakdownDimensions,breakdownMetricLabels,formatPinnedBreakdown,pinnedBreakdownKey,type BreakdownVisualization,type PinnedBreakdownMetric} from './meta-breakdown-metrics';
import type {ClientMarketingIntegration} from './marketing-integrations';
import type {MarketingRange} from './marketing-comparison';

type Props={cards:PinnedBreakdownMetric[];account?:ClientMarketingIntegration;range:MarketingRange;views:Partial<Record<MetaBreakdownDimension,BreakdownVisualization>>;onRemove:(card:PinnedBreakdownMetric)=>void;onViewChange:(dimension:MetaBreakdownDimension,view:BreakdownVisualization)=>void};
type Result=Awaited<ReturnType<typeof loadMetaBreakdown>>;

export default function MarketingBreakdownCards(props:Props){
 return <>{breakdownDimensions.map(({id})=>{
  const cards=props.cards.filter(card=>card.dimension===id);
  return cards.length?<BreakdownGroup key={JSON.stringify([props.account?.clientId,props.account?.id,props.account?.resourceId,id,props.range.from,props.range.to])} {...props} cards={cards} dimension={id}/>:null;
 })}</>;
}

function BreakdownGroup({cards,account,range,views,onRemove,onViewChange,dimension}:Props&{dimension:MetaBreakdownDimension}){
 const [result,setResult]=useState<Result>(),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 const integrationId=account?.id,clientId=account?.clientId,{from,to}=range;
 useEffect(()=>{
  if(!integrationId||!clientId)return;
  const controller=new AbortController();
  const timer=window.setTimeout(()=>{
   void loadMetaBreakdown({integrationId,clientId,dimension,from,to},controller.signal).then(data=>{
    if(!controller.signal.aborted)setResult(data);
   }).catch(()=>{if(!controller.signal.aborted)setError(true)});
  },0);
  return()=>{window.clearTimeout(timer);controller.abort()};
 },[integrationId,clientId,dimension,from,to,attempt]);
 const rows=new Map(result?.rows.map(row=>[row.id,row]));
 const view=views[dimension]||'bar';
 return <div className="marketingBreakdownGroup">{cards.map(card=>{
  const label=breakdownMetricLabels[card.metric],title=`${label} · ${card.label}`;
  const row=rows.get(card.rowId);
  return <article key={pinnedBreakdownKey(card)} className="card marketingOverviewMetric" aria-label={title}>
   <div className="marketingOverviewMetricTop">
    <div className="marketingOverviewMetricIcon"><Layers3 aria-hidden="true"/></div>
    <button className="iconBtn metaBreakdownRemove" type="button" aria-label={`Remover ${title}`} onClick={()=>onRemove(card)}><X aria-hidden="true"/></button>
   </div>
   <small>{title}</small>
   <strong>{formatPinnedBreakdown(row,card.metric)}</strong>
   {!account?<small>Conta Meta Ads não vinculada</small>:error?<button className="metaBreakdownRetry" type="button" onClick={()=>{setError(false);setAttempt(value=>value+1)}}>Falha na consulta · Tentar novamente</button>:!result?<small role="status">Consultando Meta Ads…</small>:result.truncated&&!row?<small>Grupo fora do retorno parcial</small>:null}
  </article>;
 })}{!!result?.rows.length&&<section className="card marketingBreakdownVisualization" aria-label={`Gráfico de ${breakdownDimensions.find(item=>item.id===dimension)?.label}`}>
  <header><div><b>{breakdownDimensions.find(item=>item.id===dimension)?.label} · Distribuição</b><small>Dados do período selecionado</small></div>
   <div role="group" aria-label={`Visualização de ${dimension}`}>
    <button type="button" className={view==='bar'?'active':''} aria-pressed={view==='bar'} aria-label="Gráfico de barras" onClick={()=>onViewChange(dimension,'bar')}><BarChart3/></button>
    <button type="button" className={view==='table'?'active':''} aria-pressed={view==='table'} aria-label="Tabela de detalhamento" onClick={()=>onViewChange(dimension,'table')}><Table2/></button>
   </div>
  </header>
  {view==='table'?<div className="marketingBreakdownTableWrap"><table><thead><tr><th>{breakdownDimensions.find(item=>item.id===dimension)?.label}</th>{cards.map(card=><th key={pinnedBreakdownKey(card)}>{breakdownMetricLabels[card.metric]}</th>)}</tr></thead><tbody>{result.rows.slice(0,10).map(row=><tr key={row.id}><th>{row.values.join(' · ')}</th>{cards.map(card=><td key={pinnedBreakdownKey(card)}>{formatPinnedBreakdown(row,card.metric)}</td>)}</tr>)}</tbody></table></div>
   :<div className="marketingBreakdownBars">{cards.map(card=>{
    const values=result.rows.map(row=>({row,value:card.metric==='costPerLead'||card.metric==='costPerPurchase'||card.metric==='costPerConversation'?Number(formatPinnedBreakdown(row,card.metric).replace(/[^\d,.-]/g,'').replaceAll('.','').replace(',','.'))||0:Number(row[card.metric]??0)}));
    const max=Math.max(0,...values.map(item=>item.value));
    return <div key={pinnedBreakdownKey(card)}><b>{breakdownMetricLabels[card.metric]} · {card.label}</b>{values.slice(0,8).map(({row,value})=><div className="marketingBreakdownBarRow" key={row.id}><span>{row.values.join(' · ')}</span><strong>{formatPinnedBreakdown(row,card.metric)}</strong><i><em style={{width:`${max?Math.max(0,value)/max*100:0}%`}}/></i></div>)}</div>;
   })}</div>}
 </section>}</div>;
}
