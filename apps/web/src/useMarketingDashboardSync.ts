import {useEffect,useState} from 'react';
import {store} from './storage';
import {markMarketingIntegrationSynced,normalizeClientMarketingIntegrations,type ClientMarketingIntegration} from './marketing-integrations';
import {normalizeMarketingMetricsSnapshots,upsertMarketingMetricsSnapshot} from './marketing-metrics';
import {marketingPeriodRange,normalizeMarketingPeriodKey,type MarketingPeriodKey} from './marketing-period';
import {syncMarketingMetrics} from './marketing-oauth-client';

type Integration=ClientMarketingIntegration&{provider:'meta_ads'|'google_ads'};
export function useMarketingDashboardSync(integrations:Integration[],period:MarketingPeriodKey){
 const [attempt,setAttempt]=useState(0),[syncing,setSyncing]=useState(false),[error,setError]=useState('');
 // Não use lastSync como dependência: salvar uma resposta não deve iniciar outra consulta.
 const selection=JSON.stringify(integrations.map(({id,provider,agencyConnectionId,primaryId,resourceId,autoSync})=>({id,provider,agencyConnectionId,primaryId,resourceId,autoSync})));
 useEffect(()=>{
  const selected=JSON.parse(selection) as Integration[],eligible=selected.filter(item=>item.agencyConnectionId);
  const controller=new AbortController();
  setError('');
  if(!eligible.length){
   setSyncing(false);
   if(selected.length)setError('Conecte as contas por OAuth nas integrações para atualizar automaticamente o período.');
   return;
  }
  setSyncing(true);
  const timer=window.setTimeout(async()=>{
   try{
    const range=marketingPeriodRange(normalizeMarketingPeriodKey(period));
    const results=await Promise.allSettled(eligible.map(async integration=>({integration,result:await syncMarketingMetrics(integration.provider,{connectionId:integration.agencyConnectionId!,primaryId:integration.primaryId,resourceId:integration.resourceId,...range},controller.signal)})));
    if(controller.signal.aborted)return;
    // Use o estado mais recente para não apagar dados de outros clientes salvos durante a consulta.
    let metrics=normalizeMarketingMetricsSnapshots(store.get('marketing_metrics',[])),connections=normalizeClientMarketingIntegrations(store.get('client_marketing_integrations',[])),saved=false;
    const failures:string[]=[];
    for(let index=0;index<results.length;index++){
     const item=results[index];
     if(item.status==='rejected'){failures.push(`${eligible[index].resourceId}: ${item.reason instanceof Error?item.reason.message:'Não foi possível atualizar a conta.'}`);continue}
     const {integration,result}=item.value;
     if(result.period.from!==range.from||result.period.to!==range.to){failures.push('A plataforma retornou um período diferente do solicitado.');continue}
     if(!connections.some(current=>current.id===integration.id&&current.status==='connected'&&current.resourceId===integration.resourceId))continue;
     metrics=upsertMarketingMetricsSnapshot(metrics,{id:integration.id,integrationId:integration.id,clientId:connections.find(current=>current.id===integration.id)!.clientId,provider:integration.provider,periodFrom:result.period.from,periodTo:result.period.to,syncedAt:result.syncedAt,topAds:result.topAds||[],performanceRows:result.performanceRows||[],...result.metrics});
     connections=markMarketingIntegrationSynced(connections,integration.id,result.syncedAt);saved=true;
    }
    if(saved){store.set('marketing_metrics',metrics);store.set('client_marketing_integrations',connections)}
    if(failures.length)setError(failures.join(' · '));
   }catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Não foi possível atualizar os dados.')}
   finally{if(!controller.signal.aborted)setSyncing(false)}
  },350);
  return()=>{window.clearTimeout(timer);controller.abort()};
 },[selection,period,attempt]);
 useEffect(()=>{
  const refresh=()=>{if(document.visibilityState==='visible')setAttempt(current=>current+1)};
  const auto=integrations.some(item=>item.agencyConnectionId&&item.autoSync);
  if(!auto)return;
  const interval=window.setInterval(refresh,5*60*1000);
  document.addEventListener('visibilitychange',refresh);
  return()=>{window.clearInterval(interval);document.removeEventListener('visibilitychange',refresh)};
 },[selection]);
 return {syncing,syncError:error,refresh:()=>setAttempt(current=>current+1)};
}
