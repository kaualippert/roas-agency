export type AppNotification={
 id:string;
 title:string;
 description:string;
 type:string;
 read:boolean;
 createdAt:string;
 taskId?:string;
 targetPath?:string;
 version?:string;
};

export function currentAppVersion(){
 return typeof __APP_VERSION__==='string'?__APP_VERSION__.trim():'';
}

export function createVersionNotification(version:string,createdAt=new Date().toISOString()):AppNotification|null{
 const normalized=version.trim();
 if(!normalized)return null;
 const label=/^[a-f0-9]{7,40}$/i.test(normalized)?`build ${normalized.slice(0,7)}`:`versão ${normalized}`;
 return {id:`app-version-${normalized}`,title:'Nova versão do Flow ROAS',description:`O aplicativo foi atualizado para a ${label}. Você já está usando as melhorias mais recentes.`,type:'version',read:false,createdAt,version:normalized};
}

export function notificationTarget(item:Pick<AppNotification,'taskId'|'targetPath'>){
 if(item.taskId)return `/tasks?task=${encodeURIComponent(item.taskId)}`;
 return item.targetPath||'';
}

export function mergeNotificationAlerts(current:AppNotification[],alerts:AppNotification[],dismissedIds:string[]){
 const dismissed=new Set(dismissedIds),byId=new Map(alerts.map(alert=>[alert.id,alert]));
 let changed=false;
 const enriched=current.filter(item=>!dismissed.has(item.id)).map(item=>{
  const alert=byId.get(item.id);
  if(!alert)return item;
  const taskId=item.taskId||alert.taskId,targetPath=item.targetPath||alert.targetPath,version=item.version||alert.version;
  if(taskId===item.taskId&&targetPath===item.targetPath&&version===item.version)return item;
  changed=true;
  return {...item,taskId,targetPath,version};
 });
 if(enriched.length!==current.length)changed=true;
 const existing=new Set(enriched.map(item=>item.id));
 const fresh=alerts.filter(alert=>!existing.has(alert.id)&&!dismissed.has(alert.id));
 return fresh.length||changed?[...fresh,...enriched]:current;
}
