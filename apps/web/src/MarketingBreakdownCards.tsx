import {useEffect,useState} from 'react';
import {Layers3,X} from 'lucide-react';
import {loadMetaBreakdown,type MetaBreakdownDimension} from './meta-breakdown-client';
import {breakdownDimensions,breakdownMetricLabels,formatPinnedBreakdown,pinnedBreakdownKey,type PinnedBreakdownMetric} from './meta-breakdown-metrics';
import type {ClientMarketingIntegration} from './marketing-integrations';
import type {MarketingRange} from './marketing-comparison';

type Props={cards:PinnedBreakdownMetric[];account?:ClientMarketingIntegration;range:MarketingRange;onRemove:(card:PinnedBreakdownMetric)=>void};
type Result=Awaited<ReturnType<typeof loadMetaBreakdown>>;

export default function MarketingBreakdownCards(props:Props){
 return <>{breakdownDimensions.map(({id})=>{
  const cards=props.cards.filter(card=>card.dimension===id);
  return cards.length?<BreakdownGroup key={JSON.stringify([props.account?.clientId,props.account?.id,props.account?.resourceId,id,props.range.from,props.range.to])} {...props} cards={cards} dimension={id}/>:null;
 })}</>;
}

function BreakdownGroup({cards,account,range,onRemove,dimension}:Props&{dimension:MetaBreakdownDimension}){
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
 return <>{cards.map(card=>{
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
 })}</>;
}
