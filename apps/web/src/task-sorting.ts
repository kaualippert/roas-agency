import type {Task} from './types';

export const taskSortOptions=[
 {value:'due',label:'Prazo mais próximo'},
 {value:'newest',label:'Mais recentes (criação)'},
 {value:'oldest',label:'Mais antigas (criação)'},
 {value:'title_asc',label:'Título: A → Z'},
 {value:'title_desc',label:'Título: Z → A'},
 {value:'priority',label:'Maior prioridade'},
] as const;
export type TaskSort=typeof taskSortOptions[number]['value'];
export const normalizeTaskSort=(value:unknown):TaskSort=>taskSortOptions.some(option=>option.value===value)?value as TaskSort:'due';
const priorities={low:1,medium:2,high:3,urgent:4};
export function sortTasks(tasks:Task[],value:unknown){
 const order=normalizeTaskSort(value);
 const title=(a:Task,b:Task)=>a.title.localeCompare(b.title,'pt-BR',{numeric:true,sensitivity:'base'})||a.id.localeCompare(b.id);
 const due=(a:Task,b:Task)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||priorities[b.priority]-priorities[a.priority]||title(a,b);
 return [...tasks].sort((a,b)=>{
  if(order==='title_asc')return title(a,b);
  if(order==='title_desc')return -title(a,b);
  if(order==='priority')return priorities[b.priority]-priorities[a.priority]||due(a,b);
  if(order==='newest'||order==='oldest'){
   const left=Date.parse(a.createdAt),right=Date.parse(b.createdAt);
   if(!Number.isFinite(left)||!Number.isFinite(right))return Number.isFinite(left)?-1:Number.isFinite(right)?1:title(a,b);
   return (order==='newest'?right-left:left-right)||title(a,b);
  }
  return due(a,b);
 });
}
