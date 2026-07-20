export type NotificationPreferenceKey='taskDueSoon'|'taskOverdue'|'paymentReceived'|'billingOverdue'|'reportPending';
export type NotificationPreferences=Record<NotificationPreferenceKey,boolean>;
export const notificationPreferenceOptions:{key:NotificationPreferenceKey;label:string;description:string}[]=[
 {key:'taskDueSoon',label:'Tarefas próximas do prazo',description:'Alertar para tarefas com vencimento hoje ou amanhã.'},
 {key:'taskOverdue',label:'Tarefas atrasadas',description:'Alertar quando uma tarefa ultrapassar o prazo.'},
 {key:'paymentReceived',label:'Novo pagamento recebido',description:'Alertar quando uma cobrança for marcada como recebida.'},
 {key:'billingOverdue',label:'Cobrança vencida',description:'Alertar quando uma cobrança pendente ultrapassar o vencimento.'},
 {key:'reportPending',label:'Relatório pendente',description:'Alertar sobre relatórios que ainda precisam ser enviados.'},
];
const defaults:NotificationPreferences={taskDueSoon:true,taskOverdue:true,paymentReceived:true,billingOverdue:true,reportPending:false};
export function getNotificationPreferences():NotificationPreferences{return{...defaults,...store.get<Partial<NotificationPreferences>>('notification_preferences',{})}}
export function setNotificationPreferences(value:NotificationPreferences){store.set('notification_preferences',value);window.dispatchEvent(new CustomEvent('roas-notification-preferences',{detail:value}))}
import {store} from './storage';
