export type PendingChange={value:unknown;baseValue:unknown;baseMissing:boolean};
export type DraftRecord=PendingChange&{key:string};
export const draftLifetime=7*24*60*60*1000;
export function draftStorageKey(api:string,uid:string){return `roas_drafts_v1:${encodeURIComponent(api)}:${encodeURIComponent(uid)}`}
export function parseDrafts(raw:string|null,now=Date.now()):DraftRecord[]{
 try{
  const data=JSON.parse(raw||'null');
  if(data?.version!==1||!Number.isFinite(data.savedAt)||now-data.savedAt>draftLifetime||data.savedAt>now+60000||!Array.isArray(data.entries))return [];
  return data.entries.filter((entry:unknown):entry is DraftRecord=>{
   if(!entry||typeof entry!=='object')return false;
   const item=entry as Record<string,unknown>;
   return typeof item.key==='string'&&!['__proto__','prototype','constructor'].includes(item.key)&&/^[a-zA-Z0-9_-]{1,200}$/.test(item.key)&&Object.hasOwn(item,'value')&&typeof item.baseMissing==='boolean'&&(item.baseMissing||Object.hasOwn(item,'baseValue'));
  });
 }catch{return []}
}
export function serializeDrafts(entries:DraftRecord[],now=Date.now()){return JSON.stringify({version:1,savedAt:now,entries})}
