import crypto from 'node:crypto';
import {Router,type NextFunction,type Request,type Response} from 'express';
import mongoose from 'mongoose';
import {config} from './config.js';
import {requireFirebaseAuth} from './auth.js';
import {requireAgencyAccess,type AccessContext} from './access.js';

type OAuthProvider='meta'|'google';
type MarketingProvider='meta_ads'|'google_ads'|'google_analytics'|'google_business';
type EncryptedValue={iv:string;tag:string;value:string};
type ConnectionDocument={
 id:string;provider:OAuthProvider;externalUserId:string;accountName:string;accountEmail:string;
 accessToken:EncryptedValue;refreshToken?:EncryptedValue;expiresAt?:string;scopes:string[];
 createdBy:string;createdAt:string;updatedAt:string;
};
type OAuthState={provider:OAuthProvider;uid:string;returnTo:string;nonce:string;expiresAt:number};
type Resource={id:string;name:string;kind?:string;metadata?:Record<string,unknown>};
export type MarketingMetrics={impressions:number;reach:number;clicks:number;uniqueClicks:number;outboundClicks:number;conversions:number;results:number;leads:number;purchases:number;messagingConversations:number;linkClicks:number;landingPageViews:number;pageEngagements:number;postEngagements:number;postReactions:number;comments:number;shares:number;saves:number;photoViews:number;videoViews:number;thruPlays:number;video25:number;video50:number;video75:number;video95:number;video100:number;addsToCart:number;checkoutsInitiated:number;registrationsCompleted:number;contacts:number;appointmentsScheduled:number;applicationsSubmitted:number;subscriptions:number;spend:number;conversionValue:number;roas:number};
export type MarketingTopAd={id:string;name:string;campaignName:string;impressions:number;clicks:number;results:number;spend:number;costPerResult:number;ctr:number};
export type MarketingPerformanceLevel='campaign'|'adset'|'ad';
export type MarketingPerformanceRow=MarketingMetrics&{id:string;name:string;level:MarketingPerformanceLevel;campaignName:string;adSetName:string};
type MetaAction={action_type?:string;value?:string};
type MetaInsightsRow={campaign_id?:string;campaign_name?:string;adset_id?:string;adset_name?:string;ad_id?:string;ad_name?:string;impressions?:string;reach?:string;clicks?:string;unique_clicks?:string;spend?:string;actions?:MetaAction[];action_values?:MetaAction[];outbound_clicks?:MetaAction[];video_play_actions?:MetaAction[];video_thruplay_watched_actions?:MetaAction[];video_p25_watched_actions?:MetaAction[];video_p50_watched_actions?:MetaAction[];video_p75_watched_actions?:MetaAction[];video_p95_watched_actions?:MetaAction[];video_p100_watched_actions?:MetaAction[];purchase_roas?:Array<{value?:string}>};

const collectionName='marketing_oauth_connections';
const googleScopes=['openid','email','profile','https://www.googleapis.com/auth/adwords','https://www.googleapis.com/auth/analytics.readonly','https://www.googleapis.com/auth/business.manage'];
const allowedReturnPath='/marketing/integrations';

class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
const asyncRoute=(handler:(request:Request,response:Response)=>Promise<unknown>)=>(request:Request,response:Response,next:NextFunction)=>{handler(request,response).catch(next)};
const base64url=(value:Buffer|string)=>Buffer.from(value).toString('base64url');
const signingKey=()=>config.oauthStateSecret||config.marketingTokenEncryptionKey;
const encryptionKey=()=>crypto.createHash('sha256').update(config.marketingTokenEncryptionKey).digest();
const callbackUrl=(provider:OAuthProvider)=>`${config.appOrigin.replace(/\/$/,'')}/api/marketing/oauth/${provider}/callback`;
const frontendRedirect=(params:Record<string,string>)=>`${config.appOrigin.replace(/\/$/,'')}${allowedReturnPath}?${new URLSearchParams(params)}`;

export function signOAuthState(value:OAuthState){
 if(!signingKey())throw new HttpError(503,'Configure OAUTH_STATE_SECRET e MARKETING_TOKEN_ENCRYPTION_KEY antes de conectar uma plataforma.');
 const payload=base64url(JSON.stringify(value));
 const signature=crypto.createHmac('sha256',signingKey()).update(payload).digest('base64url');
 return `${payload}.${signature}`;
}

export function verifyOAuthState(state:string):OAuthState{
 const [payload,signature]=state.split('.');
 if(!payload||!signature||!signingKey())throw new HttpError(400,'Estado OAuth inválido.');
 const expected=crypto.createHmac('sha256',signingKey()).update(payload).digest();
 const received=Buffer.from(signature,'base64url');
 if(received.length!==expected.length||!crypto.timingSafeEqual(received,expected))throw new HttpError(400,'Estado OAuth inválido.');
 const parsed=JSON.parse(Buffer.from(payload,'base64url').toString()) as OAuthState;
 if(parsed.expiresAt<Date.now()||parsed.returnTo!==allowedReturnPath||!['meta','google'].includes(parsed.provider))throw new HttpError(400,'A solicitação OAuth expirou. Tente conectar novamente.');
 return parsed;
}

export function encryptSecret(value:string):EncryptedValue{
 if(!config.marketingTokenEncryptionKey)throw new HttpError(503,'Configure MARKETING_TOKEN_ENCRYPTION_KEY antes de conectar uma plataforma.');
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);
 const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return {iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),value:encrypted.toString('base64')};
}

export function decryptSecret(secret:EncryptedValue){
 const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(secret.iv,'base64'));
 decipher.setAuthTag(Buffer.from(secret.tag,'base64'));
 return Buffer.concat([decipher.update(Buffer.from(secret.value,'base64')),decipher.final()]).toString('utf8');
}

function configuration(provider:OAuthProvider){
 const common=Boolean(config.oauthStateSecret&&config.marketingTokenEncryptionKey);
 if(provider==='meta')return {configured:common&&Boolean(config.metaAppId&&config.metaAppSecret&&config.metaGraphApiVersion),missing:[!config.oauthStateSecret&&'OAUTH_STATE_SECRET',!config.marketingTokenEncryptionKey&&'MARKETING_TOKEN_ENCRYPTION_KEY',!config.metaAppId&&'META_APP_ID',!config.metaAppSecret&&'META_APP_SECRET',!config.metaGraphApiVersion&&'META_GRAPH_API_VERSION'].filter(Boolean)};
 return {configured:common&&Boolean(config.googleOauthClientId&&config.googleOauthClientSecret),missing:[!config.oauthStateSecret&&'OAUTH_STATE_SECRET',!config.marketingTokenEncryptionKey&&'MARKETING_TOKEN_ENCRYPTION_KEY',!config.googleOauthClientId&&'GOOGLE_OAUTH_CLIENT_ID',!config.googleOauthClientSecret&&'GOOGLE_OAUTH_CLIENT_SECRET'].filter(Boolean)};
}

function requireConfigured(provider:OAuthProvider){
 const status=configuration(provider);
 if(!status.configured)throw new HttpError(503,`OAuth ${provider==='meta'?'Meta':'Google'} não configurado. Variáveis ausentes: ${status.missing.join(', ')}.`);
}

async function requestJson<T>(url:string,options?:RequestInit):Promise<T>{
 const response=await fetch(url,options),body=await response.json().catch(()=>({})) as Record<string,unknown>;
 if(!response.ok){const apiError=body.error as Record<string,unknown>|undefined;throw new HttpError(response.status>=500?502:400,String(apiError?.message||body.error_description||body.message||`A plataforma respondeu com erro ${response.status}.`))}
 return body as T;
}

async function saveConnection(document:ConnectionDocument){
 const collection=mongoose.connection.db!.collection<ConnectionDocument>(collectionName);
 const current=await collection.findOne({provider:document.provider,externalUserId:document.externalUserId});
 if(current&&!document.refreshToken)document.refreshToken=current.refreshToken;
 if(current){document.id=current.id;document.createdAt=current.createdAt}
 await collection.updateOne({provider:document.provider,externalUserId:document.externalUserId},{$set:document},{upsert:true});
}

async function exchangeGoogle(code:string,createdBy:string){
 const token=await requestJson<{access_token:string;refresh_token?:string;expires_in?:number;scope?:string}>(`https://oauth2.googleapis.com/token`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:config.googleOauthClientId,client_secret:config.googleOauthClientSecret,redirect_uri:callbackUrl('google'),grant_type:'authorization_code'})});
 const user=await requestJson<{sub:string;name?:string;email?:string}>('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:`Bearer ${token.access_token}`}}),now=new Date().toISOString();
 await saveConnection({id:crypto.randomUUID(),provider:'google',externalUserId:user.sub,accountName:user.name||user.email||'Conta Google',accountEmail:user.email||'',accessToken:encryptSecret(token.access_token),refreshToken:token.refresh_token?encryptSecret(token.refresh_token):undefined,expiresAt:token.expires_in?new Date(Date.now()+token.expires_in*1000).toISOString():undefined,scopes:(token.scope||'').split(' ').filter(Boolean),createdBy,createdAt:now,updatedAt:now});
}

async function exchangeMeta(code:string,createdBy:string){
 const params=new URLSearchParams({client_id:config.metaAppId,client_secret:config.metaAppSecret,redirect_uri:callbackUrl('meta'),code});
 let token=await requestJson<{access_token:string;expires_in?:number}>(`https://graph.facebook.com/${config.metaGraphApiVersion}/oauth/access_token?${params}`);
 const longParams=new URLSearchParams({grant_type:'fb_exchange_token',client_id:config.metaAppId,client_secret:config.metaAppSecret,fb_exchange_token:token.access_token});
 token=await requestJson<{access_token:string;expires_in?:number}>(`https://graph.facebook.com/${config.metaGraphApiVersion}/oauth/access_token?${longParams}`).catch(()=>token);
 const user=await requestJson<{id:string;name?:string;email?:string}>(`https://graph.facebook.com/${config.metaGraphApiVersion}/me?fields=id,name,email&access_token=${encodeURIComponent(token.access_token)}`),now=new Date().toISOString();
 await saveConnection({id:crypto.randomUUID(),provider:'meta',externalUserId:user.id,accountName:user.name||'Conta Meta',accountEmail:user.email||'',accessToken:encryptSecret(token.access_token),expiresAt:token.expires_in?new Date(Date.now()+token.expires_in*1000).toISOString():undefined,scopes:['ads_read','business_management'],createdBy,createdAt:now,updatedAt:now});
}

async function connectionById(id:string){
 const connection=await mongoose.connection.db!.collection<ConnectionDocument>(collectionName).findOne({id});
 if(!connection)throw new HttpError(404,'Conexão OAuth não encontrada.');
 return connection;
}

async function accessToken(connection:ConnectionDocument){
 if(connection.provider!=='google'||!connection.expiresAt||new Date(connection.expiresAt).getTime()>Date.now()+60_000)return decryptSecret(connection.accessToken);
 if(!connection.refreshToken)throw new HttpError(401,'A conexão Google expirou. Conecte a conta novamente.');
 const refreshed=await requestJson<{access_token:string;expires_in?:number}>(`https://oauth2.googleapis.com/token`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.googleOauthClientId,client_secret:config.googleOauthClientSecret,refresh_token:decryptSecret(connection.refreshToken),grant_type:'refresh_token'})});
 connection.accessToken=encryptSecret(refreshed.access_token);connection.expiresAt=refreshed.expires_in?new Date(Date.now()+refreshed.expires_in*1000).toISOString():undefined;connection.updatedAt=new Date().toISOString();
 await mongoose.connection.db!.collection<ConnectionDocument>(collectionName).updateOne({id:connection.id},{$set:{accessToken:connection.accessToken,expiresAt:connection.expiresAt,updatedAt:connection.updatedAt}});
 return refreshed.access_token;
}

const strip=(value:string,prefix:string)=>value.startsWith(prefix)?value.slice(prefix.length):value;
async function metaResources(connection:ConnectionDocument,primaryId?:string){
 const token=await accessToken(connection),root=`https://graph.facebook.com/${config.metaGraphApiVersion}`,headers={authorization:`Bearer ${token}`};
 if(!primaryId){const result=await requestJson<{data?:Array<{id:string;name:string}>}>(`${root}/me/businesses?fields=id,name&limit=100`,{headers});return {primaries:(result.data||[]).map(item=>({id:item.id,name:item.name,kind:'business'})),resources:[] as Resource[]}}
 const fields='id,name,account_status,currency,timezone_name';
 const [owned,clients]=await Promise.all(['owned_ad_accounts','client_ad_accounts'].map(edge=>requestJson<{data?:Array<{id:string;name?:string;account_status?:number;currency?:string;timezone_name?:string}>}>(`${root}/${encodeURIComponent(primaryId)}/${edge}?fields=${fields}&limit=100`,{headers}).catch(()=>({data:[]}))));
 const records=[...(owned.data||[]),...(clients.data||[])],unique=new Map(records.map(item=>[item.id,item]));
 return {primaries:[] as Resource[],resources:[...unique.values()].map(item=>({id:item.id,name:item.name||item.id,kind:'ad_account',metadata:{status:item.account_status,currency:item.currency,timezone:item.timezone_name}}))};
}

async function googleAdsResources(connection:ConnectionDocument,primaryId?:string){
 const token=await accessToken(connection),root=`https://googleads.googleapis.com/${config.googleAdsApiVersion}`,headers=googleAdsHeaders(token);
 if(!primaryId){
  const result=await requestJson<{resourceNames?:string[]}>(`${root}/customers:listAccessibleCustomers`,{headers});
  const primaries=await Promise.all((result.resourceNames||[]).map(async name=>{const id=strip(name,'customers/');const detail=await requestJson<{results?:Array<{customer?:{descriptiveName?:string;manager?:boolean}}>}>(`${root}/customers/${id}/googleAds:search`,{method:'POST',headers,body:JSON.stringify({query:'SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1'})}).catch(()=>({results:[]}));const customer=detail.results?.[0]?.customer;return {id,name:customer?.descriptiveName||id,kind:customer?.manager?'manager':'account'}}));
  return {primaries,resources:[] as Resource[]};
 }
 const result=await requestJson<{results?:Array<{customerClient?:{id?:string;descriptiveName?:string;manager?:boolean;level?:string;status?:string;currencyCode?:string;timeZone?:string}}>}>(`${root}/customers/${primaryId}/googleAds:search`,{method:'POST',headers:{...headers,'login-customer-id':primaryId},body:JSON.stringify({query:'SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.level, customer_client.status, customer_client.currency_code, customer_client.time_zone FROM customer_client WHERE customer_client.level <= 1'})});
 return {primaries:[] as Resource[],resources:(result.results||[]).map(({customerClient:item={}})=>({id:String(item.id||''),name:item.descriptiveName||String(item.id||''),kind:item.manager?'manager':'ad_account',metadata:{level:item.level,status:item.status,currency:item.currencyCode,timezone:item.timeZone}})).filter(item=>item.id)};
}

export function googleAdsHeaders(token:string,loginCustomerId?:string){
 const headers:Record<string,string>={authorization:`Bearer ${token}`,'content-type':'application/json'};
 if(config.googleAdsDeveloperToken)headers['developer-token']=config.googleAdsDeveloperToken;
 if(loginCustomerId)headers['login-customer-id']=loginCustomerId.replace(/\D/g,'');
 return headers;
}

const numeric=(value:unknown)=>Math.max(0,Number(value)||0);
const actionValue=(entries:Array<{action_type?:string;value?:string}>|undefined,types:string[])=>{
 for(const type of types){const match=entries?.find(item=>item.action_type===type);if(match)return numeric(match.value)}
 return 0;
};
const firstMetricValue=(entries:MetaAction[]|undefined)=>numeric(entries?.[0]?.value);
export function normalizeMetaMetrics(row:MetaInsightsRow={}):MarketingMetrics{
 const spend=numeric(row.spend),purchases=actionValue(row.actions,['offsite_conversion.fb_pixel_purchase','purchase']),leads=actionValue(row.actions,['lead','offsite_conversion.fb_pixel_lead']),messagingConversations=actionValue(row.actions,['onsite_conversion.messaging_conversation_started_7d','onsite_conversion.messaging_first_reply']),landingPageViews=actionValue(row.actions,['landing_page_view']),results=purchases||leads||messagingConversations||landingPageViews,conversionValue=actionValue(row.action_values,['offsite_conversion.fb_pixel_purchase','purchase']);
 return {impressions:numeric(row.impressions),reach:numeric(row.reach),clicks:numeric(row.clicks),uniqueClicks:numeric(row.unique_clicks),outboundClicks:firstMetricValue(row.outbound_clicks),conversions:results,results,leads,purchases,messagingConversations,linkClicks:actionValue(row.actions,['link_click']),landingPageViews,pageEngagements:actionValue(row.actions,['page_engagement']),postEngagements:actionValue(row.actions,['post_engagement']),postReactions:actionValue(row.actions,['post_reaction']),comments:actionValue(row.actions,['comment']),shares:actionValue(row.actions,['post']),saves:actionValue(row.actions,['onsite_conversion.post_save']),photoViews:actionValue(row.actions,['photo_view']),videoViews:firstMetricValue(row.video_play_actions)||actionValue(row.actions,['video_view']),thruPlays:firstMetricValue(row.video_thruplay_watched_actions),video25:firstMetricValue(row.video_p25_watched_actions),video50:firstMetricValue(row.video_p50_watched_actions),video75:firstMetricValue(row.video_p75_watched_actions),video95:firstMetricValue(row.video_p95_watched_actions),video100:firstMetricValue(row.video_p100_watched_actions),addsToCart:actionValue(row.actions,['offsite_conversion.fb_pixel_add_to_cart','add_to_cart']),checkoutsInitiated:actionValue(row.actions,['offsite_conversion.fb_pixel_initiate_checkout','initiate_checkout']),registrationsCompleted:actionValue(row.actions,['offsite_conversion.fb_pixel_complete_registration','complete_registration']),contacts:actionValue(row.actions,['contact']),appointmentsScheduled:actionValue(row.actions,['schedule']),applicationsSubmitted:actionValue(row.actions,['submit_application']),subscriptions:actionValue(row.actions,['subscribe']),spend,conversionValue,roas:numeric(row.purchase_roas?.[0]?.value)||(spend?conversionValue/spend:0)};
}
export function normalizeMetaTopAd(row:MetaInsightsRow):MarketingTopAd{
 const metrics=normalizeMetaMetrics(row),results=metrics.results;
 return {id:String(row.ad_id||row.ad_name||'ad'),name:String(row.ad_name||'Anúncio sem nome'),campaignName:String(row.campaign_name||'Campanha não informada'),impressions:metrics.impressions,clicks:metrics.clicks,results,spend:metrics.spend,costPerResult:results?metrics.spend/results:0,ctr:metrics.impressions?metrics.clicks/metrics.impressions*100:0};
}
export function normalizeMetaPerformanceRow(row:MetaInsightsRow,level:MarketingPerformanceLevel):MarketingPerformanceRow{
 const metrics=normalizeMetaMetrics(row),identity=level==='campaign'?{id:row.campaign_id,name:row.campaign_name}:level==='adset'?{id:row.adset_id,name:row.adset_name}:{id:row.ad_id,name:row.ad_name};
 return {...metrics,id:String(identity.id||identity.name||level),name:String(identity.name||`${level} sem nome`),level,campaignName:String(row.campaign_name||''),adSetName:String(row.adset_name||'')};
}
export function normalizeGoogleMetrics(row:{impressions?:string;clicks?:string;conversions?:number;costMicros?:string;conversionsValue?:number}={}):MarketingMetrics{
 const spend=numeric(row.costMicros)/1_000_000,conversionValue=numeric(row.conversionsValue);
 const conversions=numeric(row.conversions);
 return {impressions:numeric(row.impressions),reach:0,clicks:numeric(row.clicks),uniqueClicks:0,outboundClicks:0,conversions,results:conversions,leads:0,purchases:0,messagingConversations:0,linkClicks:0,landingPageViews:0,pageEngagements:0,postEngagements:0,postReactions:0,comments:0,shares:0,saves:0,photoViews:0,videoViews:0,thruPlays:0,video25:0,video50:0,video75:0,video95:0,video100:0,addsToCart:0,checkoutsInitiated:0,registrationsCompleted:0,contacts:0,appointmentsScheduled:0,applicationsSubmitted:0,subscriptions:0,spend,conversionValue,roas:spend?conversionValue/spend:0};
}

async function syncMetaAds(connection:ConnectionDocument,resourceId:string,from:string,to:string){
 const token=await accessToken(connection),account=resourceId.startsWith('act_')?resourceId:`act_${resourceId}`,headers={authorization:`Bearer ${token}`},timeRange=JSON.stringify({since:from,until:to});
 const metricFields='impressions,reach,clicks,unique_clicks,outbound_clicks,spend,actions,action_values,video_play_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions,purchase_roas';
 const accountParams=new URLSearchParams({fields:metricFields,level:'account',time_range:timeRange,limit:'1'});
 const breakdownRequest=(level:MarketingPerformanceLevel,identityFields:string)=>{const params=new URLSearchParams({fields:`${identityFields},${metricFields}`,level,time_range:timeRange,sort:'spend_descending',limit:'100'});return requestJson<{data?:MetaInsightsRow[]}>(`https://graph.facebook.com/${config.metaGraphApiVersion}/${encodeURIComponent(account)}/insights?${params}`,{headers}).catch(()=>({data:[]}))};
 const accountResult=await requestJson<{data?:MetaInsightsRow[]}>(`https://graph.facebook.com/${config.metaGraphApiVersion}/${encodeURIComponent(account)}/insights?${accountParams}`,{headers});
 const [campaignResult,adSetResult,adsResult]=await Promise.all([
  breakdownRequest('campaign','campaign_id,campaign_name'),
  breakdownRequest('adset','adset_id,adset_name,campaign_id,campaign_name'),
  breakdownRequest('ad','ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name'),
 ]);
 const topAds=(adsResult.data||[]).map(normalizeMetaTopAd).filter(ad=>ad.impressions>0||ad.spend>0).sort((a,b)=>b.results-a.results||a.costPerResult-b.costPerResult||b.spend-a.spend).slice(0,10);
 const performanceRows=([['campaign',campaignResult],['adset',adSetResult],['ad',adsResult]] as const).flatMap(([level,result])=>(result.data||[]).map(row=>normalizeMetaPerformanceRow(row,level)).filter(row=>row.impressions>0||row.spend>0));
 return {metrics:normalizeMetaMetrics(accountResult.data?.[0]),topAds,performanceRows};
}
async function syncGoogleAds(connection:ConnectionDocument,primaryId:string,resourceId:string,from:string,to:string){
 const token=await accessToken(connection),customerId=resourceId.replace(/\D/g,''),loginId=primaryId.replace(/\D/g,''),query=`SELECT metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros, metrics.conversions_value FROM customer WHERE segments.date BETWEEN '${from}' AND '${to}'`;
 const result=await requestJson<{results?:Array<{metrics?:Parameters<typeof normalizeGoogleMetrics>[0]}>}>(`https://googleads.googleapis.com/${config.googleAdsApiVersion}/customers/${customerId}/googleAds:search`,{method:'POST',headers:googleAdsHeaders(token,loginId!==customerId?loginId:undefined),body:JSON.stringify({query})});
 return {metrics:normalizeGoogleMetrics(result.results?.[0]?.metrics),topAds:[] as MarketingTopAd[],performanceRows:[] as MarketingPerformanceRow[]};
}

function syncPeriod(body:Record<string,unknown>){
 const today=new Date(),fallbackTo=today.toISOString().slice(0,10),fallbackFrom=new Date(today.getFullYear(),today.getMonth(),1).toISOString().slice(0,10),from=String(body.from||fallbackFrom),to=String(body.to||fallbackTo);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)throw new HttpError(400,'Informe um período de sincronização válido.');
 return {from,to};
}

async function analyticsResources(connection:ConnectionDocument,primaryId?:string){
 const token=await accessToken(connection),result=await requestJson<{accountSummaries?:Array<{account:string;displayName?:string;propertySummaries?:Array<{property:string;displayName?:string;propertyType?:string}>}>}>('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200',{headers:{authorization:`Bearer ${token}`}}),accounts=result.accountSummaries||[];
 if(!primaryId)return {primaries:accounts.map(item=>({id:strip(item.account,'accounts/'),name:item.displayName||item.account,kind:'analytics_account'})),resources:[] as Resource[]};
 const account=accounts.find(item=>strip(item.account,'accounts/')===primaryId);
 return {primaries:[] as Resource[],resources:(account?.propertySummaries||[]).map(item=>({id:strip(item.property,'properties/'),name:item.displayName||item.property,kind:'analytics_property',metadata:{propertyType:item.propertyType}}))};
}

async function businessResources(connection:ConnectionDocument,primaryId?:string){
 const token=await accessToken(connection),headers={authorization:`Bearer ${token}`};
 if(!primaryId){const result=await requestJson<{accounts?:Array<{name:string;accountName?:string;type?:string}>}>('https://mybusinessaccountmanagement.googleapis.com/v1/accounts',{headers});return {primaries:(result.accounts||[]).map(item=>({id:strip(item.name,'accounts/'),name:item.accountName||item.name,kind:item.type||'business_account'})),resources:[] as Resource[]}}
 const result=await requestJson<{locations?:Array<{name:string;title?:string;storeCode?:string}>}>(`https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${encodeURIComponent(primaryId)}/locations?readMask=name,title,storeCode&pageSize=100`,{headers});
 return {primaries:[] as Resource[],resources:(result.locations||[]).map(item=>({id:item.name,name:item.title||item.name,kind:'location',metadata:{storeCode:item.storeCode}}))};
}

export function marketingOAuthRouter(){
 const router=Router();
 router.get('/oauth/:provider/callback',asyncRoute(async(request,response)=>{
  try{
   const provider=request.params.provider as OAuthProvider,state=verifyOAuthState(String(request.query.state||''));
   if(provider!==state.provider||request.query.error)throw new HttpError(400,String(request.query.error_description||'A autorização foi cancelada.'));
   const code=String(request.query.code||'');if(!code)throw new HttpError(400,'Código OAuth não recebido.');
   requireConfigured(provider);provider==='google'?await exchangeGoogle(code,state.uid):await exchangeMeta(code,state.uid);
   response.redirect(frontendRedirect({oauth:'success',provider}));
  }catch(error){response.redirect(frontendRedirect({oauth:'error',message:error instanceof Error?error.message:'Falha na conexão OAuth.'}))}
 }));
 router.use(requireFirebaseAuth,(_request,response,next)=>mongoose.connection.readyState===1?next():response.status(503).json({error:'MongoDB is not connected'}),requireAgencyAccess,(_request,response,next)=>{const access=response.locals.access as AccessContext;return access.isAdministrator||access.accessAreas.includes('marketing')?next():response.status(403).json({error:'Você não possui acesso à área de marketing.'})});
 router.get('/configuration',asyncRoute(async(_request,response)=>response.json({providers:{meta:configuration('meta'),google:configuration('google')},callbacks:{meta:callbackUrl('meta'),google:callbackUrl('google')}})));
 router.post('/oauth/:provider/start',asyncRoute(async(request,response)=>{
  const access=response.locals.access as AccessContext;if(!access.isAdministrator)throw new HttpError(403,'Somente administradores podem conectar contas da agência.');
  const provider=request.params.provider as OAuthProvider;if(!['meta','google'].includes(provider))throw new HttpError(404,'Plataforma não encontrada.');requireConfigured(provider);
  const state=signOAuthState({provider,uid:access.uid,returnTo:allowedReturnPath,nonce:crypto.randomUUID(),expiresAt:Date.now()+10*60_000});
  const url=provider==='google'?`https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({client_id:config.googleOauthClientId,redirect_uri:callbackUrl('google'),response_type:'code',scope:googleScopes.join(' '),access_type:'offline',prompt:'consent',include_granted_scopes:'true',state})}`:`https://www.facebook.com/${config.metaGraphApiVersion}/dialog/oauth?${new URLSearchParams({client_id:config.metaAppId,redirect_uri:callbackUrl('meta'),response_type:'code',scope:'ads_read,business_management',state})}`;
  response.json({url});
 }));
 router.get('/connections',asyncRoute(async(_request,response)=>{
  const documents=await mongoose.connection.db!.collection<ConnectionDocument>(collectionName).find({}).sort({updatedAt:-1}).toArray();
  response.json({connections:documents.map(({accessToken:_access,refreshToken:_refresh,...item})=>item)});
 }));
 router.delete('/connections/:id',asyncRoute(async(request,response)=>{
  const access=response.locals.access as AccessContext;if(!access.isAdministrator)throw new HttpError(403,'Somente administradores podem remover conexões da agência.');
  await mongoose.connection.db!.collection<ConnectionDocument>(collectionName).deleteOne({id:request.params.id});response.status(204).end();
 }));
 router.get('/resources/:provider',asyncRoute(async(request,response)=>{
  const provider=request.params.provider as MarketingProvider,connection=await connectionById(String(request.query.connectionId||'')),primaryId=String(request.query.primaryId||'')||undefined;
  if(provider==='meta_ads'&&connection.provider!=='meta')throw new HttpError(400,'Escolha uma conexão Meta.');
  if(provider!=='meta_ads'&&connection.provider!=='google')throw new HttpError(400,'Escolha uma conexão Google.');
  const result=provider==='meta_ads'?await metaResources(connection,primaryId):provider==='google_ads'?await googleAdsResources(connection,primaryId):provider==='google_analytics'?await analyticsResources(connection,primaryId):provider==='google_business'?await businessResources(connection,primaryId):null;
  if(!result)throw new HttpError(404,'Plataforma não encontrada.');response.json(result);
 }));
 router.post('/sync/:provider',asyncRoute(async(request,response)=>{
  const provider=request.params.provider as MarketingProvider;
  if(provider!=='meta_ads'&&provider!=='google_ads')throw new HttpError(400,'A sincronização de métricas está disponível para Meta Ads e Google Ads.');
  const body=request.body as Record<string,unknown>,connection=await connectionById(String(body.connectionId||'')),primaryId=String(body.primaryId||''),resourceId=String(body.resourceId||''),period=syncPeriod(body);
  if(!primaryId||!resourceId)throw new HttpError(400,'Selecione a estrutura e a conta de anúncios.');
  if(provider==='meta_ads'&&connection.provider!=='meta')throw new HttpError(400,'A conexão selecionada não pertence à Meta.');
  if(provider==='google_ads'&&connection.provider!=='google')throw new HttpError(400,'A conexão selecionada não pertence ao Google.');
  const result=provider==='meta_ads'?await syncMetaAds(connection,resourceId,period.from,period.to):await syncGoogleAds(connection,primaryId,resourceId,period.from,period.to);
  response.json({provider,period,...result,syncedAt:new Date().toISOString()});
 }));
 return router;
}
