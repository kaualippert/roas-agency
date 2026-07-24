import {apiRequest} from './storage';
import type {AccessArea,TeamInvitation} from './types';

export interface InvitationInput{
 email:string;
 name:string;
 roles:string[];
 accessAreas:AccessArea[];
 clientIds:string[];
 department:string;
}
interface InvitationResult{invitation:TeamInvitation;inviteUrl:string}

export async function listInvitations(){
 const result=await apiRequest('/invitations') as {invitations:TeamInvitation[]};
 return result.invitations;
}
export async function createInvitation(input:InvitationInput){
 return apiRequest('/invitations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)}) as Promise<InvitationResult>;
}
export async function resendInvitation(id:string){
 return apiRequest(`/invitations/${id}/resend`,{method:'POST'}) as Promise<InvitationResult>;
}
export async function revokeInvitation(id:string){
 await apiRequest(`/invitations/${id}`,{method:'DELETE'});
}
export async function acceptInvitation(token:string){
 return apiRequest('/invitations/accept',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});
}
