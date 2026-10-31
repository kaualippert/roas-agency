import {useEffect,useState} from 'react';
import {ArrowDown,ArrowUp,ArrowLeftRight,LoaderCircle,RefreshCw} from 'lucide-react';
import {usePersistentState} from './persistent-ui';
import {syncMarketingMetrics} from './marketing-oauth-client';
import {aggregateMarketingMetrics,type MarketingMetrics,type MarketingMetricsSnapshot} from './marketing-metrics';
import type {ClientMarketingIntegration} from './marketing-integrations';
import type {MarketingPeriodKey} from './marketing-period';
import {formatMarketingMetric,marketingMetricCatalog,type MarketingMetricKey} from './marketing-dashboard-config';
import {comparableMetricValue,marketingVariation,marketingComparisonRange,type MarketingRange} from './marketing-comparison';
import './marketing-comparison.css';

type Integration=ClientMarketingIntegration&{provider:'meta_ads'|'google_ads'};
type ComparisonData={key:string;metrics:MarketingMetrics|null;error:string};
const rangeLabel=(range:MarketingRange)=>`${range.from.split('-').reverse().join('/')} a ${range.to.split('-').reverse().join('/')}`;
export function useMarketingComparison({integrations,range,snapshots,updating,period,currentError}:{integrations:Integration[];range:MarketingRange;snapshots:MarketingMetricsSnapshot[];updating:boolean;period:MarketingPeriodKey;currentError:string}){
 const [enabled,setEnabled]=usePersistentState('roas_filter_marketing_comparison',false),[data,setData]=useState<ComparisonData|null>(null),[attempt,setAttempt]=useState(0);
 const maximum=period==='maximum',monthly=period==='this_month'||period==='last_month',previous=marketingComparisonRange(range,period);
 const accounts=JSON.stringify(integrations.map(({id,clientId,provider,agencyConnectionId,resourceId,primaryId})=>({id,clientId,provider,agencyConnectionId,resourceId,primaryId})));
 const currentReady=integrations.length>0&&integrations.every(integration=>snapshots.some(snapshot=>snapshot.integrationId===integration.id&&snapshot.clientId===integration.clientId&&snapshot.provider===integration.provider&&snapshot.periodFrom.slice(0,10)===range.from&&snapshot.periodTo.slice(0,10)===range.to));
 const version=JSON.stringify(snapshots.map(item=>[item.integrationId,item.syncedAt]));
 const key=JSON.stringify([accounts,range.from,range.to,previous.from,previous.to,version,attempt]);
 useEffect(()=>{
  if(!enabled||maximum||!currentReady||updating||currentError)return;
  const selected=JSON.parse(accounts) as Integration[],controller=new AbortController();
  setData(null);
  if(selected.some(item=>!item.agencyConnectionId)){setData({key,metrics:null,error:'Reconecte todas as contas por OAuth para comparar os períodos.'});return}
  const timeout=window.setTimeout(()=>controller.abort(),25000);
  const timer=window.setTimeout(async()=>{
   try{
    const results=await Promise.all(selected.map(async integration=>{
     const result=await syncMarketingMetrics(integration.provider,{connectionId:integration.agencyConnectionId!,primaryId:integration.primaryId,resourceId:integration.resourceId,...previous},controller.signal);
     if(result.period.from!==previous.from||result.period.to!==previous.to)throw new Error('Período retornado diferente do solicitado.');
     if(![result.metrics.spend,result.metrics.results].every(value=>Number.isFinite(value)&&value>=0))throw new Error('Métricas inválidas.');
     return result.metrics;
    }));
    if(!controller.signal.aborted)setData({key,metrics:aggregateMarketingMetrics(results),error:''});
   }catch{
    if(!controller.signal.aborted)setData({key,metrics:null,error:'Não foi possível carregar todas as contas do período anterior.'});
   }finally{window.clearTimeout(timeout)}
  },350);
  const onAbort=()=>setData({key,metrics:null,error:'A consulta do período anterior excedeu o tempo de espera.'});
  controller.signal.addEventListener('abort',onAbort);
  return()=>{window.clearTimeout(timer);window.clearTimeout(timeout);controller.signal.removeEventListener('abort',onAbort);controller.abort()};
 },[enabled,maximum,currentReady,updating,currentError,key]);
 const ready=enabled&&!maximum&&currentReady&&!updating&&!currentError&&data?.key===key;
 const error=enabled&&!maximum?(currentError?'Atualize os dados atuais sem falhas antes de comparar.':ready?data.error:''):'';
 return {enabled,setEnabled,maximum,monthly,previous,range,baseline:ready?data.metrics:null,current:currentReady?aggregateMarketingMetrics(snapshots):null,error,loading:enabled&&!maximum&&!ready&&!error,retry:()=>setAttempt(value=>value+1)};
}
type Comparison=ReturnType<typeof useMarketingComparison>;
export function MarketingComparisonToggle({comparison}:{comparison:Comparison}){
 const label=comparison.monthly?'Comparar com mês anterior':'Comparar com período anterior';
 const detail=comparison.maximum?'Escolha um período diferente de Máximo para comparar.':`${label}: ${rangeLabel(comparison.previous)}. Atual: ${rangeLabel(comparison.range)}.${comparison.monthly?' Mesmos dias do mês, limitados à duração do mês anterior.':' Intervalo anterior de mesma duração.'}`;
 return <div className="marketingComparisonControl">
  <button type="button" className="marketingCompareToggle" aria-label={label} aria-pressed={comparison.enabled&&!comparison.maximum} disabled={comparison.maximum} title={detail} onClick={()=>comparison.setEnabled(!comparison.enabled)}><ArrowLeftRight/><span>Comparar</span></button>
  {comparison.error&&<button type="button" className="marketingCompareRetry" aria-label="Tentar comparação novamente" title={`${comparison.error} Tentar novamente.`} onClick={comparison.retry}><RefreshCw/></button>}
 </div>;
}
export function MarketingMetricDelta({id,comparison}:{id:MarketingMetricKey;comparison:Comparison}){
 if(!comparison.enabled||comparison.maximum)return null;
 const label=marketingMetricCatalog.find(item=>item.id===id)!.label;
 if(comparison.loading)return <div className="marketingMetricDelta loading" role="status" aria-label={`Atualizando comparativo de ${label}`}><LoaderCircle/></div>;
 const current=comparison.current?comparableMetricValue(comparison.current,id):null,previous=comparison.baseline?comparableMetricValue(comparison.baseline,id):null;
 const delta=comparison.error?null:marketingVariation(current,previous),positive=delta!==null&&delta>0,negative=delta!==null&&delta<0;
 const neutral=id==='spend'||id==='frequency',lowerBetter=id.startsWith('costPer')||['cpc','cpm','cpp'].includes(id);
 const tone=delta===null||delta===0||neutral?'neutral':(lowerBetter?negative:positive)?'better':'worse';
 const formatted=delta===null?'—':delta===0?'0%':`${positive?'+':'−'}${Math.abs(delta)<.1?'<0,1':Math.abs(delta).toLocaleString('pt-BR',{maximumFractionDigits:1})}%`;
 const detail=`${label}: ${delta===null?'sem base comparável':`${formatted} em relação ao período anterior`}. Anterior (${rangeLabel(comparison.previous)}): ${previous===null?'indisponível':formatMarketingMetric(id,previous)}.${comparison.error?` ${comparison.error}`:''}`;
 return <div className={`marketingMetricDelta ${tone}`} title={detail} aria-label={detail} tabIndex={0}>{positive?<ArrowUp/>:negative?<ArrowDown/>:null}{formatted}</div>;
}
