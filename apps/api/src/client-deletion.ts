import {deleteState,getState,updateStateAtomically} from './state.js';

const clientCollections=['activities','client_processes','client_mind_maps','client_marketing_integrations','marketing_metrics','marketing_dashboard_preferences','documents','financial_entries','invoices','onboarding','payments','reports','tasks'] as const;
const records=(value:unknown)=>Array.isArray(value)?value as Array<Record<string,unknown>>:[];
export const removeClientRecords=(value:unknown,clientId:string)=>records(value).filter(item=>String(item.clientId||'')!==clientId);

export async function deleteClientData(clientId:string){
 const projectIds=new Set<string>();
 await updateStateAtomically('projects',value=>records(value).filter(project=>{
  const remove=String(project.clientId||'')===clientId;
  if(remove&&project.id)projectIds.add(String(project.id));
  return !remove;
 }));
 await Promise.all(clientCollections.map(key=>updateStateAtomically(key,value=>removeClientRecords(value,clientId))));
 await updateStateAtomically('team',value=>records(value).map(member=>({...member,clientIds:Array.isArray(member.clientIds)?member.clientIds.filter(id=>String(id)!==clientId):member.clientIds})));
 await updateStateAtomically('prospects',value=>records(value).map(lead=>String(lead.convertedClientId||'')===clientId?{...lead,convertedClientId:undefined,updatedAt:new Date().toISOString()}:lead));
 await updateStateAtomically('clients',value=>records(value).filter(client=>String(client.id||'')!==clientId));
 await Promise.all([...projectIds].map(projectId=>deleteState(`editorial_${projectId}`)));
 return {projectIds:[...projectIds]};
}
