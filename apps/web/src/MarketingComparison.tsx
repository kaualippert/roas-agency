import {useEffect,useState} from 'react';
import {ArrowDown,ArrowUp,ArrowLeftRight,RefreshCw} from 'lucide-react';
import {usePersistentState} from './persistent-ui';
import {syncMarketingMetrics} from './marketing-oauth-client';
import {aggregateMarketingMetrics,type MarketingMetrics,type MarketingMetricsSnapshot} from './marketing-metrics';
import type {ClientMarketingIntegration} from './marketing-integrations';
import {formatMarketingMetric,type MarketingMetricKey} from './marketing-dashboard-config';
import {comparisonCost,marketingVariation,previousMarketingRange,type MarketingRange} from './marketing-comparison';
import './marketing-comparison.css';

type Integration=ClientMarketingIntegration&{provider:'meta_ads'|'google_ads'};
type ComparisonData={key:string;metrics:MarketingMetrics|null;error:string};
const displayDate=(value:string)=>value.split('-').reverse().join('/');
const rangeLabel=(range:MarketingRange)=>`${displayDate(range.from)} a ${displayDate(range.to)}`;
export default function MarketingComparison({integrations,range,snapshots,updating,maximum,currentError}:{integrations:Integration[];range:MarketingRange;snapshots:MarketingMetricsSnapshot[];updating:boolean;maximum:boolean;currentError:string}){
 const [enabled,setEnabled]=usePersistentState('roas_filter_marketing_comparison',false),[data,setData]=useState<ComparisonData|null>(null),[attempt,setAttempt]=useState(0);
 const previous=previousMarketingRange(range);
 const accounts=JSON.stringify(integrations.map(({id,clientId,provider,agencyConnectionId,resourceId,primaryId})=>({id,clientId,provider,agencyConnectionId,resourceId,primaryId})));
 const currentReady=integrations.length>0&&integrations.every(integration=>snapshots.some(snapshot=>snapshot.integrationId===integration.id&&snapshot.clientId===integration.clientId&&snapshot.provider===integration.provider&&snapshot.periodFrom.slice(0,10)===range.from&&snapshot.periodTo.slice(0,10)===range.to));
 const version=JSON.stringify(snapshots.map(item=>[item.integrationId,item.syncedAt]));
 const key=JSON.stringify([accounts,range.from,range.to,version,attempt]);
 useEffect(()=>{
  if(!enabled||maximum||!currentReady||updating||currentError)return;
  const selected=JSON.parse(accounts) as Integration[],controller=new AbortController();
  setData(null);
  if(selected.some(item=>!item.agencyConnectionId)){setData({key,metrics:null,error:'Reconecte todas as contas por OAuth para comparar os períodos.'});return}
  const timeout=window.setTimeout(()=>controller.abort(),25000);
  const timer=window.setTimeout(async()=>{
   try{
    const previous=previousMarketingRange(range);
    const results=await Promise.all(selected.map(async integration=>{
     const result=await syncMarketingMetrics(integration.provider,{connectionId:integration.agencyConnectionId!,primaryId:integration.primaryId,resourceId:integration.resourceId,...previous},controller.signal);
     if(result.period.from!==previous.from||result.period.to!==previous.to)throw new Error('Período retornado diferente do solicitado.');
     if(![result.metrics.spend,result.metrics.results].every(value=>Number.isFinite(value)&&value>=0))throw new Error('Métricas inválidas.');
     return result.metrics;
    }));
    if(!controller.signal.aborted)setData({key,metrics:aggregateMarketingMetrics(results),error:''});
   }catch{
    // Never show a partial account total or a response from a previous selection.
    if(!controller.signal.aborted)setData({key,metrics:null,error:'Não foi possível carregar todas as contas do período anterior. Os dados atuais continuam disponíveis.'});
   }finally{window.clearTimeout(timeout)}
  },350);
  const onAbort=()=>setData({key,metrics:null,error:'A consulta do período anterior excedeu o tempo de espera. Tente novamente.'});
  controller.signal.addEventListener('abort',onAbort);
  return()=>{window.clearTimeout(timer);window.clearTimeout(timeout);controller.signal.removeEventListener('abort',onAbort);controller.abort()};
 },[enabled,maximum,currentReady,updating,currentError,key]);
 const ready=enabled&&!maximum&&currentReady&&!updating&&!currentError&&data?.key===key;
 const baseline=ready?data.metrics:null;
 const current=currentReady?aggregateMarketingMetrics(snapshots):null;
 const error=ready?data.error:'';
 return <section className="card marketingComparison" aria-label="Comparativo de marketing">
  <div className="marketingComparisonHead"><div><span><ArrowLeftRight/> ANÁLISE COMPARATIVA</span><h3>Atual versus anterior</h3></div><label><input type="checkbox" checked={enabled} onChange={event=>setEnabled(event.target.checked)}/> Comparar períodos</label></div>
  {!enabled?<p className="marketingComparisonNote">Ative para comparar investimento, resultados e custo por resultado com o intervalo anterior de mesma duração.</p>:maximum?<p className="marketingComparisonNote">Selecione um período diferente de “Máximo” para ter um intervalo anterior equivalente.</p>:<>
   <div className="marketingComparisonRanges"><span><b>Atual</b> {rangeLabel(range)}</span><span><b>Anterior</b> {rangeLabel(previous)}</span></div>
   {currentError?<p className="marketingComparisonNote" role="status">Atualize os dados atuais sem falhas antes de comparar os períodos.</p>:(!currentReady||updating)?<p className="marketingComparisonNote" role="status">Aguardando a atualização de todas as contas selecionadas para comparar.</p>:!ready?<p className="marketingComparisonNote" role="status">Carregando o período anterior…</p>:null}
   {error&&<div className="marketingComparisonError" role="alert"><span>{error}</span><button type="button" onClick={()=>setAttempt(value=>value+1)}><RefreshCw/> Tentar comparação novamente</button></div>}
   <div className="marketingComparisonCards" aria-busy={!ready&&!error}>
    <ComparisonCard id="spend" label="Investimento" current={current?.spend??null} previous={baseline?.spend??null} direction="neutral"/>
    <ComparisonCard id="results" label="Resultados" current={current?.results??null} previous={baseline?.results??null} direction="increase"/>
    <ComparisonCard id="costPerResult" label="Custo por resultado" current={current?comparisonCost(current):null} previous={baseline?comparisonCost(baseline):null} direction="decrease"/>
   </div>
   <p className="marketingComparisonNote">Intervalos fechados e consecutivos, com o mesmo número de dias e as mesmas contas. Resultados seguem a definição de cada plataforma. Sem resultados, o custo por resultado fica indisponível; base anterior zero não gera percentual de crescimento.</p>
  </>}
 </section>;
}
function ComparisonCard({id,label,current,previous,direction}:{id:MarketingMetricKey;label:string;current:number|null;previous:number|null;direction:'increase'|'decrease'|'neutral'}){
 const delta=marketingVariation(current,previous),positive=delta!==null&&delta>0,negative=delta!==null&&delta<0;
 const tone=delta===null||delta===0||direction==='neutral'?'neutral':(direction==='increase'?positive:negative)?'better':'worse';
 return <article className={`marketingComparisonCard ${tone}`} aria-label={label}>
  <small>{label}</small><strong>{current===null?'—':formatMarketingMetric(id,current)}</strong>
  <span>Anterior: <b>{previous===null?'—':formatMarketingMetric(id,previous)}</b></span>
  <div className="marketingComparisonDelta">{positive?<ArrowUp/>:negative?<ArrowDown/>:null}<b>{delta===null?'Sem base comparável':delta===0?'Sem variação':`${positive?'+':''}${delta.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`}</b></div>
 </article>;
}
