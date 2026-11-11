import {useEffect,useState} from 'react';
import {Clapperboard,Image as ImageIcon,Play,RefreshCw} from 'lucide-react';
import {formatMarketingMetric} from './marketing-dashboard-config';
import type {MarketingTopAd} from './marketing-metrics';
import {loadMetaAdCreatives,type MarketingAdCreativeMedia} from './marketing-oauth-client';

export type MarketingWinningAd={ad:MarketingTopAd;integrationId:string;clientId:string};

export default function MarketingWinningAds({ads}:{ads:MarketingWinningAd[]}){
 const [media,setMedia]=useState<Record<string,MarketingAdCreativeMedia>>({}),[loading,setLoading]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 const requestKey=JSON.stringify(ads.map(item=>({integrationId:item.integrationId,clientId:item.clientId,adId:item.ad.id})));
 useEffect(()=>{
  const controller=new AbortController();
  const requestedAds=JSON.parse(requestKey) as Array<{integrationId:string;clientId:string;adId:string}>;
  if(!requestedAds.length){setMedia({});setError(false);setLoading(false);return()=>controller.abort()}
  const groups=new Map<string,Array<{clientId:string;adId:string}>>();
  for(const item of requestedAds)groups.set(item.integrationId,[...(groups.get(item.integrationId)||[]),item]);
  setLoading(true);setError(false);
  void Promise.all([...groups].map(async([integrationId,items])=>{
   try{
    const result=await loadMetaAdCreatives({integrationId,clientId:items[0].clientId,adIds:items.map(item=>item.adId)},controller.signal);
    return {items:result.media.map(item=>[`${integrationId}:${item.adId}`,item] as const),failed:false};
   }catch{return {items:[] as Array<readonly [string,MarketingAdCreativeMedia]>,failed:true}}
  })).then(results=>{
   if(controller.signal.aborted)return;
   setMedia(Object.fromEntries(results.flatMap(result=>result.items)));
   setError(results.some(result=>result.failed));
  }).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[requestKey,attempt]);

 return <section className="card marketingWinningAds" aria-labelledby="marketing-winning-ads-title" aria-busy={loading}>
  <header><div><span><Clapperboard aria-hidden="true"/> CRIATIVOS DE DESTAQUE</span><h3 id="marketing-winning-ads-title">Anúncios vencedores</h3><p>As peças com mais resultados no período selecionado.</p></div>{ads.length>0&&<small>{ads.length} anúncios</small>}</header>
  {error&&<div className="marketingWinningAdsError" role="alert"><span>Não foi possível carregar as artes da Meta.</span><button type="button" onClick={()=>{setError(false);setAttempt(value=>value+1)}}><RefreshCw/> Tentar novamente</button></div>}
  {!ads.length?<div className="marketingWinningAdsEmpty"><ImageIcon/><span>Sem anúncios vencedores sincronizados neste período.</span></div>:<div className="marketingWinningAdsGrid">{ads.map(({ad,integrationId})=>{
   const creative=media[`${integrationId}:${ad.id}`];
   return <article key={`${integrationId}:${ad.id}`}>
    <div className="marketingWinningAdMedia">
     {creative?.videoUrl?<video aria-label={`Vídeo do anúncio ${ad.name}`} controls playsInline preload="none" poster={creative.imageUrl||undefined} src={creative.videoUrl}/>:creative?.imageUrl?<img src={creative.imageUrl} alt={`Arte do anúncio ${ad.name}`} loading="lazy" referrerPolicy="no-referrer"/>:<div className="marketingWinningAdPlaceholder"><ImageIcon/><span>{creative?.mediaType==='video'?'Prévia do vídeo indisponível':'Arte indisponível'}</span></div>}
     {creative?.mediaType==='video'&&!creative.videoUrl&&<span className="marketingWinningAdType"><Play aria-hidden="true"/> Vídeo</span>}
     {creative?.videoUrl&&<span className="marketingWinningAdType"><Play aria-hidden="true"/> Vídeo</span>}
    </div>
    <div className="marketingWinningAdInfo"><div><b title={ad.name}>{ad.name}</b><small title={ad.campaignName}>{ad.campaignName}</small></div><dl><div><dt>Resultados</dt><dd>{formatMarketingMetric('results',ad.results)}</dd></div><div><dt>Custo/resultado</dt><dd>{formatMarketingMetric('costPerResult',ad.costPerResult)}</dd></div><div><dt>Investimento</dt><dd>{formatMarketingMetric('spend',ad.spend)}</dd></div></dl></div>
   </article>;
  })}</div>}
  {loading&&<p className="marketingWinningAdsLoading" role="status">Carregando artes e vídeos da Meta…</p>}
 </section>;
}
