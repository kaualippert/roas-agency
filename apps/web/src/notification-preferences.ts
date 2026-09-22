export type NotificationPreferenceKey='goalAchievedSound'|'taskDueSoon'|'taskOverdue'|'paymentReceived'|'billingOverdue'|'reportPending';
export type NotificationPreferences=Record<NotificationPreferenceKey,boolean>;
export const notificationPreferenceOptions:{key:NotificationPreferenceKey;label:string;description:string}[]=[
 {key:'goalAchievedSound',label:'Som de meta batida',description:'Reproduzir um aviso comemorativo quando a meta comercial mensal atingir 100%.'},
 {key:'taskDueSoon',label:'Tarefas próximas do prazo',description:'Alertar para tarefas com vencimento hoje ou amanhã.'},
 {key:'taskOverdue',label:'Tarefas atrasadas',description:'Alertar quando uma tarefa ultrapassar o prazo.'},
 {key:'paymentReceived',label:'Novo pagamento recebido',description:'Alertar quando uma cobrança for marcada como recebida.'},
 {key:'billingOverdue',label:'Cobrança vencida',description:'Alertar quando uma cobrança pendente ultrapassar o vencimento.'},
 {key:'reportPending',label:'Relatório pendente',description:'Alertar sobre relatórios que ainda precisam ser enviados.'},
];
const defaults:NotificationPreferences={goalAchievedSound:true,taskDueSoon:true,taskOverdue:true,paymentReceived:true,billingOverdue:true,reportPending:false};
type StoredNotificationPreferences=NotificationPreferences&{id:string;userId:string};
const currentUserId=()=>store.access()?.uid||'';
export function getNotificationPreferences():NotificationPreferences{const userId=currentUserId(),items=store.get<StoredNotificationPreferences[]>('notification_preferences',[]),saved=Array.isArray(items)?items.find(item=>item.userId===userId):undefined;return{...defaults,...saved}}
export function setNotificationPreferences(value:NotificationPreferences){const userId=currentUserId();if(!userId)return;const items=store.get<StoredNotificationPreferences[]>('notification_preferences',[]),record:StoredNotificationPreferences={id:`notification-preferences-${userId}`,userId,...value};store.set('notification_preferences',[record,...items.filter(item=>item.userId!==userId)]);window.dispatchEvent(new CustomEvent('roas-notification-preferences',{detail:value}))}
import {store} from './storage';
