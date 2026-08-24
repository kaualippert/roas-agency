import type {Client} from './types';

export function selectableClients(clients:Client[],selectedClientId=''){
 return clients.filter(client=>client.status==='active'||client.id===selectedClientId);
}
