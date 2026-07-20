import {useEffect,useMemo,useRef,useState} from 'react';
import {Bell,CheckCheck,Clock3,CreditCard,FileClock,FolderKanban,Trash2,UserPlus,X} from 'lucide-react';
import {getNotificationPreferences} from './notification-preferences';
import {playNotificationSound} from './notification-sound';
import {store} from './storage';
import type {GenericItem,Task} from './types';

type Notification={id:string;title:string;description:string;type:string;read:boolean;createdAt:string};
type ConvertedLead={id:string;name:string;convertedClientId?:string};
type FinancialEntry={id:string;description:string;dueDate:string;status:'pending'|'received';receivedAt?:string;updatedAt?:string};
const legacySeedIds=new Set(['n1','n2','n3']),emittedKey='roas_notification_emitted';
const initialNotifications=()=>store.get<Notification[]>('notifications',[]).filter(item=>!legacySeedIds.has(item.id));
const relative=(date:string)=>{const minutes=Math.max(1,Math.round((Date.now()-new Date(date).getTime())/60000));return minutes<60?`${minutes} min atrás`:minutes<1440?`${Math.floor(minutes/60)} h atrás`:`${Math.floor(minutes/1440)} d atrás`};
const readEmitted=()=>{try{return new Set<string>(JSON.parse(localStorage.getItem(emittedKey)||'[]'))}catch{return new Set<string>()}};
const startOfDay=(value=new Date())=>new Date(value.getFullYear(),value.getMonth(),value.getDate());

export default function NotificationCenter(){
 const [open,setOpen]=useState(false),[items,setItems]=useState<Notification[]>(initialNotifications),[filter,setFilter]=useState('all');
 const knownNotificationIds=useRef(new Set(items.map(item=>item.id)));
 const convertedLeadIds=useRef(new Set(store.get<ConvertedLead[]>('prospects',[]).filter(lead=>lead.convertedClientId).map(lead=>lead.id)));
 const receivedEntryIds=useRef(new Set(store.get<FinancialEntry[]>('financial_entries',[]).filter(entry=>entry.status==='received').map(entry=>entry.id)));

 useEffect(()=>{
  const appendAlerts=(alerts:Notification[])=>{if(!alerts.length)return;const emitted=readEmitted(),current=store.get<Notification[]>('notifications',[]).filter(item=>!legacySeedIds.has(item.id)),fresh=alerts.filter(alert=>!emitted.has(alert.id)&&!current.some(item=>item.id===alert.id));if(!fresh.length)return;fresh.forEach(alert=>emitted.add(alert.id));localStorage.setItem(emittedKey,JSON.stringify([...emitted]));store.set('notifications',[...fresh,...current])};
  const scanSystemAlerts=()=>{
   const preferences=getNotificationPreferences(),today=startOfDay(),todayKey=today.toISOString().slice(0,10),tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);const tomorrowKey=tomorrow.toISOString().slice(0,10),now=new Date().toISOString(),alerts:Notification[]=[];
   store.get<Task[]>('tasks',[]).filter(task=>task.status!=='completed').forEach(task=>{const overdue=task.status==='overdue'||Boolean(task.dueDate&&task.dueDate<todayKey);if(preferences.taskOverdue&&overdue)alerts.push({id:`task-overdue-${task.id}-${task.dueDate}`,title:'Tarefa atrasada',description:`${task.title} ultrapassou o prazo previsto.`,type:'task',read:false,createdAt:now});else if(preferences.taskDueSoon&&(task.dueDate===todayKey||task.dueDate===tomorrowKey))alerts.push({id:`task-due-${task.id}-${task.dueDate}`,title:'Tarefa próxima do prazo',description:`${task.title} vence ${task.dueDate===todayKey?'hoje':'amanhã'}.`,type:'task',read:false,createdAt:now})});
   const entries=store.get<FinancialEntry[]>('financial_entries',[]),currentReceived=new Set(entries.filter(entry=>entry.status==='received').map(entry=>entry.id));
   if(preferences.paymentReceived)entries.filter(entry=>entry.status==='received'&&!receivedEntryIds.current.has(entry.id)).forEach(entry=>alerts.push({id:`payment-received-${entry.id}`,title:'Pagamento recebido',description:`${entry.description} foi marcado como recebido.`,type:'payment',read:false,createdAt:now}));
   receivedEntryIds.current=currentReceived;
   if(preferences.billingOverdue)entries.filter(entry=>entry.status==='pending'&&entry.dueDate<todayKey).forEach(entry=>alerts.push({id:`billing-overdue-${entry.id}-${entry.dueDate}`,title:'Cobrança vencida',description:`${entry.description} está com pagamento atrasado.`,type:'billing',read:false,createdAt:now}));
   if(preferences.reportPending)store.get<GenericItem[]>('reports',[]).filter(report=>report.status.toLowerCase().includes('pend')).forEach(report=>alerts.push({id:`report-pending-${report.id}`,title:'Relatório pendente',description:`${report.name} ainda precisa ser enviado.`,type:'report',read:false,createdAt:now}));
   appendAlerts(alerts);
  };
  const click=(event:MouseEvent)=>{if((event.target as HTMLElement).closest('button.notification'))setOpen(value=>!value)};
  const update=(event:Event)=>{
   const changedKey=(event as CustomEvent<string>).detail;
   if(changedKey==='prospects'){
    const converted=store.get<ConvertedLead[]>('prospects',[]).filter(lead=>lead.convertedClientId),newlyConverted=converted.filter(lead=>!convertedLeadIds.current.has(lead.id));convertedLeadIds.current=new Set(converted.map(lead=>lead.id));
    if(newlyConverted.length){const current=store.get<Notification[]>('notifications',[]),createdAt=new Date().toISOString(),additions=newlyConverted.map(lead=>({id:`conversion-${lead.id}`,title:'Lead convertido em cliente',description:`${lead.name} entrou para a carteira de clientes.`,type:'crm',read:false,createdAt}));store.set('notifications',[...additions.filter(alert=>!current.some(item=>item.id===alert.id)),...current]);return}
   }
   if(['tasks','financial_entries','reports'].includes(changedKey))scanSystemAlerts();
   if(changedKey!=='notifications')return;
   const next=initialNotifications(),added=next.filter(item=>!knownNotificationIds.current.has(item.id));knownNotificationIds.current=new Set(next.map(item=>item.id));setItems(next);if(added.length)playNotificationSound(added.some(item=>item.type==='crm')?'conversion':'notification');
  };
  const preferenceUpdate=()=>scanSystemAlerts();
  const visibilityUpdate=()=>{if(document.visibilityState==='visible')scanSystemAlerts()};
  const automaticCheck=window.setInterval(scanSystemAlerts,60000);
  document.addEventListener('click',click);document.addEventListener('visibilitychange',visibilityUpdate);window.addEventListener('focus',scanSystemAlerts);window.addEventListener('roas-change',update);window.addEventListener('roas-notification-preferences',preferenceUpdate);
  const stored=store.get<Notification[]>('notifications',[]),cleaned=stored.filter(item=>!legacySeedIds.has(item.id));if(!localStorage.getItem('roas_notifications')||cleaned.length!==stored.length)store.set('notifications',cleaned);scanSystemAlerts();
  return()=>{window.clearInterval(automaticCheck);document.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibilityUpdate);window.removeEventListener('focus',scanSystemAlerts);window.removeEventListener('roas-change',update);window.removeEventListener('roas-notification-preferences',preferenceUpdate)};
 },[]);

 const unread=items.filter(item=>!item.read).length;
 useEffect(()=>{const badge=document.querySelector('.notification i');if(badge){badge.textContent=String(unread);(badge as HTMLElement).style.display=unread?'block':'none'}},[unread]);
 const save=(next:Notification[])=>{setItems(next);knownNotificationIds.current=new Set(next.map(item=>item.id));store.set('notifications',next)};
 const visible=useMemo(()=>filter==='unread'?items.filter(item=>!item.read):items,[items,filter]);
 const icon=(type:string)=>type==='billing'||type==='payment'?<CreditCard/>:type==='report'?<FileClock/>:type==='project'?<FolderKanban/>:type==='crm'?<UserPlus/>:<Clock3/>;
 return open?<><button className="notificationBackdrop" aria-label="Fechar notificações" onClick={()=>setOpen(false)}/><aside className="notificationPanel"><div className="notificationHead"><div><small>CENTRAL</small><h2>Notificações</h2></div><button className="iconBtn" onClick={()=>setOpen(false)}><X/></button></div><div className="notificationTools"><div><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Todas</button><button className={filter==='unread'?'active':''} onClick={()=>setFilter('unread')}>Não lidas <span>{unread}</span></button></div><button onClick={()=>save(items.map(item=>({...item,read:true})))}><CheckCheck/> Marcar todas como lidas</button></div><div className="notificationList">{visible.map(item=><article key={item.id} className={item.read?'read':''} onClick={()=>save(items.map(value=>value.id===item.id?{...value,read:true}:value))}><span className={'notificationType '+item.type}>{icon(item.type)}</span><div><b>{item.title}</b><p>{item.description}</p><small>{relative(item.createdAt)}</small></div><button className="iconBtn" title="Excluir" onClick={event=>{event.stopPropagation();save(items.filter(value=>value.id!==item.id))}}><Trash2/></button></article>)}{!visible.length&&<div className="notificationEmpty"><Bell/><b>Tudo em dia</b><span>Nenhuma notificação nesta visualização.</span></div>}</div></aside></>:null;
}
