import assert from 'node:assert/strict';
import test from 'node:test';
import {config} from './config.js';
import {decryptSecret,encryptSecret,googleAdsHeaders,normalizeGoogleMetrics,normalizeMetaMetrics,normalizeMetaTopAd,signOAuthState,verifyOAuthState} from './marketing-oauth.js';

test('assina e valida o estado OAuth sem expor os dados',()=>{
 const previous=config.oauthStateSecret;config.oauthStateSecret='estado-oauth-de-teste-com-entropia';
 try{
  const token=signOAuthState({provider:'google',uid:'user-1',returnTo:'/marketing/integrations',nonce:'nonce-1',expiresAt:Date.now()+60_000});
  assert.equal(token.includes('user-1'),false);
  assert.equal(verifyOAuthState(token).uid,'user-1');
  const replacement=token.endsWith('x')?'y':'x';
  assert.throws(()=>verifyOAuthState(`${token.slice(0,-1)}${replacement}`),/inválido/);
 }finally{config.oauthStateSecret=previous}
});

test('criptografa tokens OAuth com AES-GCM',()=>{
 const previous=config.marketingTokenEncryptionKey;config.marketingTokenEncryptionKey='chave-de-teste-longa-e-diferente';
 try{
  const encrypted=encryptSecret('access-token-secreto');
  assert.notEqual(encrypted.value,'access-token-secreto');
  assert.equal(decryptSecret(encrypted),'access-token-secreto');
 }finally{config.marketingTokenEncryptionKey=previous}
});

test('normaliza os indicadores retornados pela Meta Ads',()=>{
 const metrics=normalizeMetaMetrics({impressions:'12000',reach:'9000',clicks:'360',spend:'1250.50',actions:[{action_type:'lead',value:'18'},{action_type:'link_click',value:'280'},{action_type:'landing_page_view',value:'190'},{action_type:'post_engagement',value:'640'},{action_type:'video_view',value:'420'}],action_values:[{action_type:'purchase',value:'5000'}],purchase_roas:[{value:'4'}]});
 assert.equal(metrics.impressions,12000);assert.equal(metrics.reach,9000);assert.equal(metrics.results,18);assert.equal(metrics.leads,18);assert.equal(metrics.linkClicks,280);assert.equal(metrics.landingPageViews,190);assert.equal(metrics.postEngagements,640);assert.equal(metrics.videoViews,420);assert.equal(metrics.spend,1250.5);assert.equal(metrics.conversionValue,5000);assert.equal(metrics.roas,4);
});

test('usa conversas como resultado principal quando a campanha não possui compras ou leads',()=>{
 const metrics=normalizeMetaMetrics({spend:'300',actions:[{action_type:'onsite_conversion.messaging_conversation_started_7d',value:'12'},{action_type:'landing_page_view',value:'90'}]});
 assert.equal(metrics.messagingConversations,12);
 assert.equal(metrics.results,12);
 assert.equal(metrics.conversions,12);
});

test('normaliza o desempenho dos melhores anúncios da Meta',()=>{
 const ad=normalizeMetaTopAd({ad_id:'ad-1',ad_name:'Criativo campeão',campaign_name:'Captação',impressions:'10000',clicks:'250',spend:'600',actions:[{action_type:'lead',value:'20'}]});
 assert.deepEqual(ad,{id:'ad-1',name:'Criativo campeão',campaignName:'Captação',impressions:10000,clicks:250,results:20,spend:600,costPerResult:30,ctr:2.5});
});

test('converte micros e calcula ROAS do Google Ads',()=>{
 const metrics=normalizeGoogleMetrics({impressions:'8000',clicks:'240',conversions:12.5,costMicros:'2000000000',conversionsValue:7000});
 assert.equal(metrics.impressions,8000);assert.equal(metrics.clicks,240);assert.equal(metrics.conversions,12.5);assert.equal(metrics.results,12.5);assert.equal(metrics.spend,2000);assert.equal(metrics.conversionValue,7000);assert.equal(metrics.roas,3.5);assert.equal(metrics.thruPlays,0);
});

test('aceita Google Ads sem developer token e normaliza o login customer ID',()=>{
 const previous=config.googleAdsDeveloperToken;config.googleAdsDeveloperToken='';
 try{assert.deepEqual(googleAdsHeaders('oauth-token','123-456-7890'),{authorization:'Bearer oauth-token','content-type':'application/json','login-customer-id':'1234567890'})}
 finally{config.googleAdsDeveloperToken=previous}
});
