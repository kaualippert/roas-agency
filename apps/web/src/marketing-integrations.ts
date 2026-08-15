export type MarketingProvider='meta_ads'|'google_ads'|'google_analytics'|'google_business';

export interface ClientMarketingIntegration{
 schemaVersion:1;
 id:string;
 clientId:string;
 provider:MarketingProvider;
 agencyConnectionId?:string;
 legacySourceId?:string;
 status:'connected'|'error';
 primaryName:string;
 primaryId:string;
 resourceName:string;
 resourceId:string;
 accessEmail:string;
 autoSync:boolean;
 connectedAt:string;
 lastSync?:string;
 createdAt:string;
 updatedAt:string;
}

export const marketingProviders=[
 {id:'meta_ads' as const,name:'Meta Ads',short:'Meta',mark:'M',description:'Campanhas do Facebook e Instagram.',primaryLabel:'Portfólio empresarial (BM)',primaryPlaceholder:'Selecione ou informe a BM',resourceLabel:'Conta de anúncios',resourcePlaceholder:'Ex.: act_123456789'},
 {id:'google_ads' as const,name:'Google Ads',short:'Google Ads',mark:'G',description:'Pesquisa, Display, Performance Max e YouTube.',primaryLabel:'Conta administradora',primaryPlaceholder:'Selecione ou informe a conta manager',resourceLabel:'Conta cliente',resourcePlaceholder:'Ex.: 123-456-7890'},
 {id:'google_analytics' as const,name:'Google Analytics 4',short:'Analytics',mark:'GA',description:'Audiência, aquisição e conversões do site.',primaryLabel:'Conta do Analytics',primaryPlaceholder:'Selecione ou informe a conta',resourceLabel:'Propriedade GA4',resourcePlaceholder:'Ex.: 123456789'},
 {id:'google_business' as const,name:'Perfil da Empresa',short:'Google Empresa',mark:'GB',description:'Presença local, avaliações e interações no Google.',primaryLabel:'Organização ou grupo',primaryPlaceholder:'Selecione ou informe a organização',resourceLabel:'Localização da marca',resourcePlaceholder:'Ex.: locations/123456789'},
];

export const providerById=(provider:MarketingProvider)=>marketingProviders.find(item=>item.id===provider)!;

export interface LegacyMarketingIntegration{
 id:string;
 provider?:'meta'|'google';
 status?:string;
 accountName?:string;
 accountId?:string;
 email?:string;
 autoSync?:boolean;
 connectedAt?:string;
 lastSync?:string;
}

const providerIds=new Set<MarketingProvider>(marketingProviders.map(provider=>provider.id));
const naturalKey=(item:Pick<ClientMarketingIntegration,'clientId'|'provider'>)=>`${item.clientId}:${item.provider}`;
const text=(value:unknown)=>String(value||'').trim();

export function normalizeClientMarketingIntegrations(value:unknown):ClientMarketingIntegration[]{
 if(!Array.isArray(value))return [];
 const seen=new Set<string>(),normalized:ClientMarketingIntegration[]=[];
 for(const raw of value){
  if(!raw||typeof raw!=='object')continue;
  const item=raw as Partial<ClientMarketingIntegration>,clientId=text(item.clientId),provider=item.provider;
  if(!clientId||!provider||!providerIds.has(provider))continue;
  const key=`${clientId}:${provider}`;
  if(seen.has(key))continue;
  const connectedAt=text(item.connectedAt)||text(item.createdAt)||new Date(0).toISOString();
  normalized.push({
   schemaVersion:1,id:text(item.id)||key,clientId,provider,agencyConnectionId:text(item.agencyConnectionId)||undefined,legacySourceId:text(item.legacySourceId)||undefined,
   status:item.status==='error'?'error':'connected',primaryName:text(item.primaryName),primaryId:text(item.primaryId),
   resourceName:text(item.resourceName),resourceId:text(item.resourceId),accessEmail:text(item.accessEmail),
   autoSync:item.autoSync!==false,connectedAt,lastSync:text(item.lastSync)||undefined,
   createdAt:text(item.createdAt)||connectedAt,updatedAt:text(item.updatedAt)||text(item.lastSync)||connectedAt,
  });
  seen.add(key);
 }
 return normalized;
}

export function upsertClientMarketingIntegration(items:ClientMarketingIntegration[],integration:ClientMarketingIntegration){
 const key=naturalKey(integration),existing=items.find(item=>naturalKey(item)===key),now=new Date().toISOString();
 const next={...integration,id:existing?.id||integration.id,createdAt:existing?.createdAt||integration.createdAt||now,updatedAt:now};
 return [next,...items.filter(item=>item.id!==next.id&&naturalKey(item)!==key)];
}

export function removeClientMarketingIntegration(items:ClientMarketingIntegration[],id:string){return items.filter(item=>item.id!==id)}

export function findMarketingResourceConflict(items:ClientMarketingIntegration[],candidate:Pick<ClientMarketingIntegration,'id'|'clientId'|'provider'|'resourceId'>){
 const resourceId=text(candidate.resourceId).toLowerCase();
 if(!resourceId)return undefined;
 return items.find(item=>item.id!==candidate.id&&item.clientId!==candidate.clientId&&item.provider===candidate.provider&&text(item.resourceId).toLowerCase()===resourceId);
}

export function markMarketingIntegrationSynced(items:ClientMarketingIntegration[],id:string,at=new Date().toISOString()){
 return items.map(item=>item.id===id?{...item,status:'connected' as const,lastSync:at,updatedAt:at}:item);
}

export function migratableLegacyMarketingIntegrations(value:unknown):LegacyMarketingIntegration[]{
 if(!Array.isArray(value))return [];
 return value.filter((item):item is LegacyMarketingIntegration=>Boolean(item&&typeof item==='object'&&['meta','google'].includes(String((item as LegacyMarketingIntegration).provider))&&text((item as LegacyMarketingIntegration).accountId)));
}

export function migrateLegacyMarketingIntegration(legacy:LegacyMarketingIntegration,input:{clientId:string;primaryName:string;primaryId:string;resourceName?:string;resourceId?:string},at=new Date().toISOString()):ClientMarketingIntegration{
 const provider:MarketingProvider=legacy.provider==='meta'?'meta_ads':'google_ads',connectedAt=text(legacy.connectedAt)||at;
 return {
  schemaVersion:1,id:crypto.randomUUID(),clientId:text(input.clientId),provider,legacySourceId:legacy.id,status:'connected',
  primaryName:text(input.primaryName),primaryId:text(input.primaryId),resourceName:text(input.resourceName)||text(legacy.accountName),resourceId:text(input.resourceId)||text(legacy.accountId),
  accessEmail:text(legacy.email),autoSync:legacy.autoSync!==false,connectedAt,lastSync:text(legacy.lastSync)||connectedAt,createdAt:connectedAt,updatedAt:at,
 };
}
