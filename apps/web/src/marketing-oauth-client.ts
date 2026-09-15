import {apiRequest} from './storage';
import type {MarketingProvider} from './marketing-integrations';
import type {MarketingMetrics,MarketingTopAd} from './marketing-metrics';

export type AgencyOAuthProvider='meta'|'google';
export interface AgencyOAuthConnection{id:string;provider:AgencyOAuthProvider;externalUserId:string;accountName:string;accountEmail:string;expiresAt?:string;scopes:string[];createdAt:string;updatedAt:string}
export interface OAuthProviderConfiguration{configured:boolean;missing:string[]}
export interface MarketingResource{id:string;name:string;kind?:string;metadata?:Record<string,unknown>}

export const oauthProviderFor=(provider:MarketingProvider):AgencyOAuthProvider=>provider==='meta_ads'?'meta':'google';

export async function loadOAuthOverview(){
 const [connections,configuration]=await Promise.all([
  apiRequest('/marketing/connections') as Promise<{connections:AgencyOAuthConnection[]}>,
  apiRequest('/marketing/configuration') as Promise<{providers:Record<AgencyOAuthProvider,OAuthProviderConfiguration>;callbacks:Record<AgencyOAuthProvider,string>}>,
 ]);
 return {...configuration,connections:connections.connections};
}

export async function beginOAuth(provider:AgencyOAuthProvider){
 const result=await apiRequest(`/marketing/oauth/${provider}/start`,{method:'POST'}) as {url:string};
 window.location.assign(result.url);
}

export async function loadMarketingResources(provider:MarketingProvider,connectionId:string,primaryId?:string){
 const params=new URLSearchParams({connectionId});if(primaryId)params.set('primaryId',primaryId);
 return apiRequest(`/marketing/resources/${provider}?${params}`) as Promise<{primaries:MarketingResource[];resources:MarketingResource[]}>;
}

export async function syncMarketingMetrics(provider:Extract<MarketingProvider,'meta_ads'|'google_ads'>,input:{connectionId:string;primaryId:string;resourceId:string;from:string;to:string}){
 return apiRequest(`/marketing/sync/${provider}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}) as Promise<{provider:typeof provider;period:{from:string;to:string};metrics:MarketingMetrics;topAds:MarketingTopAd[];syncedAt:string}>;
}
