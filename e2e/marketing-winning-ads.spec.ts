import {expect,test} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi,testState} from './fixtures';
import {emptyMarketingMetrics} from '../apps/web/src/marketing-metrics';

test('mostra as artes e os vídeos dos anúncios vencedores do Meta Ads',async({page})=>{
 await mockRoasApi(page);
 await page.route('**/api/state',route=>route.fulfill({json:{state:{...testState,client_marketing_integrations:[{id:'meta-1',clientId:'client-1',provider:'meta_ads',status:'connected',agencyConnectionId:'oauth-meta',resourceId:'act_1',primaryId:'bm-1',resourceName:'Conta Meta Teste',autoSync:true}]}}}));
 await page.route('**/api/marketing/sync/*',route=>{
  const {from,to}=route.request().postDataJSON();
  return route.fulfill({json:{period:{from,to},metrics:{...emptyMarketingMetrics,spend:400,results:20},topAds:[
   {id:'123',name:'Criativo imagem',campaignName:'Campanha de leads',impressions:2500,clicks:80,results:12,spend:240,costPerResult:20,ctr:3.2},
   {id:'456',name:'Criativo vídeo',campaignName:'Campanha de vídeo',impressions:1800,clicks:65,results:8,spend:160,costPerResult:20,ctr:3.6},
  ],performanceRows:[],syncedAt:new Date().toISOString()}});
 });
 const creativeRequests:Array<{adIds:string[]}> = [];
 await page.route('**/api/marketing/creatives/meta_ads',route=>{
  creativeRequests.push(route.request().postDataJSON());
  return route.fulfill({json:{integrationId:'meta-1',media:[
   {adId:'123',mediaType:'image',imageUrl:'https://scontent.xx.fbcdn.net/image.jpg',videoUrl:null},
   {adId:'456',mediaType:'video',imageUrl:'https://scontent.xx.fbcdn.net/video-poster.jpg',videoUrl:'https://video.xx.fbcdn.net/video.mp4'},
  ]}});
 });
 await page.route('https://scontent.xx.fbcdn.net/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#6541ee"/></svg>'}));
 const errors=captureBrowserErrors(page);
 await page.goto('/marketing/dashboard');
 const section=page.getByRole('region',{name:'Anúncios vencedores'});
 await expect(section.getByRole('img',{name:'Arte do anúncio Criativo imagem'})).toBeVisible();
 await expect(section.locator('video[aria-label="Vídeo do anúncio Criativo vídeo"]')).toHaveAttribute('src','https://video.xx.fbcdn.net/video.mp4');
 await expect(section).toContainText('Campanha de leads');
 await expect(section).toContainText('Campanha de vídeo');
 await expect.poll(()=>creativeRequests.length).toBe(1);
 expect(creativeRequests[0].adIds).toEqual(['123','456']);
 expect(errors).toEqual([]);
});
