import type {Task} from './types';

export type EffectiveTaskStatus=Task['status'];

export function localDateKey(date=new Date()){
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export function isTaskOverdue(task:Pick<Task,'status'|'dueDate'>,referenceDate=localDateKey()){
 return task.status!=='completed'&&Boolean(task.dueDate&&task.dueDate<referenceDate);
}

export function effectiveTaskStatus(task:Pick<Task,'status'|'dueDate'>,referenceDate=localDateKey()):EffectiveTaskStatus{
 if(isTaskOverdue(task,referenceDate))return'overdue';
 return task.status==='overdue'?'pending':task.status;
}

export function isTaskOpen(task:Pick<Task,'status'|'dueDate'>){return effectiveTaskStatus(task)!=='completed'}

export function normalizeTaskStatuses<T extends Pick<Task,'status'|'dueDate'>>(tasks:T[],referenceDate=localDateKey()):T[]{
 let changed=false;
 const next=tasks.map(task=>{const status=effectiveTaskStatus(task,referenceDate);if(status===task.status)return task;changed=true;return {...task,status}});
 return changed?next:tasks;
}
