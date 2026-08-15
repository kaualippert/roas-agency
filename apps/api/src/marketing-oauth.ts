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
 const token=await accessToken(connection),root=`https://graph.facebook.com/${config.metaGraphApiVersion}`;
 if(!primaryId){const result=await requestJson<{data?:Array<{id:string;name:string}>}>(`${root}/me/businesses?fields=id,name&limit=100&access_token=${encodeURIComponent(token)}`);return {primaries:(result.data||[]).map(item=>({id:item.id,name:item.name,kind:'business'})),resources:[] as Resource[]}}
 const fields='id,name,account_status,currency,timezone_name';
 const [owned,clients]=await Promise.all(['owned_ad_accounts','client_ad_accounts'].map(edge=>requestJson<{data?:Array<{id:string;name?:string;account_status?:number;currency?:string;timezone_name?:string}>}>(`${root}/${encodeURIComponent(primaryId)}/${edge}?fields=${fields}&limit=100&access_token=${encodeURIComponent(token)}`).catch(()=>({data:[]}))));
 const records=[...(owned.data||[]),...(clients.data||[])],unique=new Map(records.map(item=>[item.id,item]));
 return {primaries:[] as Resource[],resources:[...unique.values()].map(item=>({id:item.id,name:item.name||item.id,kind:'ad_account',metadata:{status:item.account_status,currency:item.currency,timezone:item.timezone_name}}))};
}

async function googleAdsResources(connection:ConnectionDocument,primaryId?:string){
 if(!config.googleAdsDeveloperToken)throw new HttpError(503,'Configure GOOGLE_ADS_DEVELOPER_TOKEN para consultar contas do Google Ads.');
 const token=await accessToken(connection),root=`https://googleads.googleapis.com/${config.googleAdsApiVersion}`,headers={authorization:`Bearer ${token}`,'developer-token':config.googleAdsDeveloperToken,'content-type':'application/json'};
 if(!primaryId){
  const result=await requestJson<{resourceNames?:string[]}>(`${root}/customers:listAccessibleCustomers`,{headers});
  const primaries=await Promise.all((result.resourceNames||[]).map(async name=>{const id=strip(name,'customers/');const detail=await requestJson<{results?:Array<{customer?:{descriptiveName?:string;manager?:boolean}}>}>(`${root}/customers/${id}/googleAds:search`,{method:'POST',headers,body:JSON.stringify({query:'SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1'})}).catch(()=>({results:[]}));const customer=detail.results?.[0]?.customer;return {id,name:customer?.descriptiveName||id,kind:customer?.manager?'manager':'account'}}));
  return {primaries,resources:[] as Resource[]};
 }
 const result=await requestJson<{results?:Array<{customerClient?:{id?:string;descriptiveName?:string;manager?:boolean;level?:string;status?:string;currencyCode?:string;timeZone?:string}}>}>(`${root}/customers/${primaryId}/googleAds:search`,{method:'POST',headers:{...headers,'login-customer-id':primaryId},body:JSON.stringify({query:'SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.level, customer_client.status, customer_client.currency_code, customer_client.time_zone FROM customer_client WHERE customer_client.level <= 1'})});
 return {primaries:[] as Resource[],resources:(result.results||[]).map(({customerClient:item={}})=>({id:String(item.id||''),name:item.descriptiveName||String(item.id||''),kind:item.manager?'manager':'ad_account',metadata:{level:item.level,status:item.status,currency:item.currencyCode,timezone:item.timeZone}})).filter(item=>item.id)};
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
 return router;
}
