import type {AgencyService} from './ServicesManager';
import {resolveServiceIds} from './service-links';

export type CRMStage='Leads captados'|'Primeiro contato'|'Em andamento'|'Reunião'|'Ciclo de acompanhamento'|'Em espera'|'Negócio fechado'|'Negócio perdido';

export type CRMLead={
  id:string;
  name:string;
  contact:string;
  phone?:string;
  responsibleId?:string;
  value:number;
  stage:CRMStage;
  source:string;
  nextAction:string;
  color:string;
  serviceIds?:string[];
  services?:string[];
  convertedClientId?:string;
};

export const crmStages:CRMStage[]=['Leads captados','Primeiro contato','Em andamento','Reunião','Ciclo de acompanhamento','Em espera','Negócio fechado','Negócio perdido'];

export const leadServiceIds=(lead:Pick<CRMLead,'serviceIds'|'services'>|undefined,catalog:AgencyService[])=>resolveServiceIds(lead,catalog);

export const serviceEstimate=(serviceIds:string[],catalog:AgencyService[])=>{
  const selected=catalog.filter(service=>serviceIds.includes(service.id));
  const fixedValue=selected.filter(service=>(service.pricingType||'monthly')==='monthly'&&service.price>0).reduce((sum,service)=>sum+service.price,0);
  const hasVariable=selected.some(service=>service.pricingType==='variable'||service.price<=0);
  return {fixedValue,hasVariable,selected};
};
