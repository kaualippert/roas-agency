import type {AccessArea,TeamMember} from '../types';

export const currentMemberStorageKey='roas_current_team_member_id';
export const allAccessAreas:AccessArea[]=['general','marketing','finance','settings'];

const routeAreas:Record<string,AccessArea>={
  dashboard:'general',clients:'general',onboarding:'general',projects:'general',tasks:'general',crm:'general',
  campaigns:'marketing',ads:'marketing',reports:'marketing',creatives:'marketing',
  finance:'finance',invoices:'finance',payments:'finance',
  team:'settings',integrations:'settings',settings:'settings',
};

export const memberRoles=(member?:TeamMember)=>member?.roles?.length?member.roles:member?.role?[member.role]:[];
export const isAdministrator=(member?:TeamMember)=>memberRoles(member).some(role=>role.toLowerCase().includes('administrador'));
export const memberAccessAreas=(member?:TeamMember):AccessArea[]=>!member||isAdministrator(member)?allAccessAreas:member.accessAreas?.length?member.accessAreas:allAccessAreas;
export const pathArea=(pathname:string)=>routeAreas[pathname.split('/').filter(Boolean)[0]||'dashboard'];
export const canAccessPath=(member:TeamMember|undefined,pathname:string)=>{const area=pathArea(pathname);return !area||memberAccessAreas(member).includes(area)};
export const resolveCurrentMember=(team:TeamMember[])=>{const saved=localStorage.getItem(currentMemberStorageKey);return team.find(member=>member.id===saved&&member.status==='active')||team.find(member=>isAdministrator(member)&&member.status==='active')||team.find(member=>member.status==='active')||team[0]};
export const firstAllowedPath=(member?:TeamMember)=>{const areas=memberAccessAreas(member);return areas.includes('general')?'/dashboard':areas.includes('marketing')?'/campaigns':areas.includes('finance')?'/finance':'/settings'};
