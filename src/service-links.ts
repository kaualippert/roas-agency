import type {AgencyService} from './ServicesManager';

export type ServiceLinkedRecord={serviceIds?:string[];services?:string[]};
export const defaultServices:AgencyService[]=[
 {id:'traffic',name:'Tráfego Pago',description:'Gestão e otimização de campanhas de mídia paga.',price:3500,pricingType:'monthly',active:true,createdAt:new Date().toISOString()},
 {id:'social',name:'Social Media',description:'Planejamento, criação e publicação de conteúdo.',price:1000,pricingType:'monthly',active:true,createdAt:new Date().toISOString()},
 {id:'reports',name:'Relatórios',description:'Relatórios de performance e reuniões mensais.',price:350,pricingType:'monthly',active:true,createdAt:new Date().toISOString()},
];
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const slug=(value:string)=>normalize(value).replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'servico';

export function ensureLegacyServices(catalog:AgencyService[],records:ServiceLinkedRecord[]){const next=[...catalog];for(const reference of records.flatMap(record=>record.serviceIds?.length?record.serviceIds:record.services||[])){if(next.some(service=>service.id===reference||normalize(service.name)===normalize(reference)))continue;let id=`legacy-${slug(reference)}`,suffix=2;while(next.some(service=>service.id===id))id=`legacy-${slug(reference)}-${suffix++}`;next.push({id,name:reference,description:'Serviço preservado durante a migração dos vínculos existentes.',price:0,pricingType:'variable',active:true,createdAt:new Date().toISOString()})}return next}
export function resolveServiceIds(record:ServiceLinkedRecord|undefined,catalog:AgencyService[]){const references=record?.serviceIds?.length?record.serviceIds:record?.services||[];return Array.from(new Set(references.map(reference=>catalog.find(service=>service.id===reference||normalize(service.name)===normalize(reference))?.id).filter((id):id is string=>Boolean(id))))}
export function linkedServices(record:ServiceLinkedRecord|undefined,catalog:AgencyService[]){return resolveServiceIds(record,catalog).map(id=>catalog.find(service=>service.id===id)).filter((service):service is AgencyService=>Boolean(service))}
export function migrateServiceRecords<T extends ServiceLinkedRecord>(records:T[],catalog:AgencyService[]){return records.map(record=>{const {services:legacyServices,...rest}=record;return {...rest,serviceIds:resolveServiceIds(record,catalog)} as T})}
