import {store} from './storage';
import type {Task} from './types';
import {mergePomodoroRecord,recordPomodoroRun,type PomodoroRun} from './pomodoro-tracking';
export type PomodoroPhase='focus'|'break';
export type PomodoroStatus='ready'|'running'|'paused';
export type PomodoroSession={phase:PomodoroPhase;status:PomodoroStatus;remainingSeconds:number;endsAt?:number;completedFocus:number;run?:PomodoroRun};
export const POMODORO_EVENT='roas-pomodoro-change';
export const ACTIVE_POMODORO_KEY='roas_active_task_pomodoro';
export const focusSeconds=25*60,breakSeconds=5*60;
export const createFreshPomodoroSession=():PomodoroSession=>({phase:'focus',status:'ready',remainingSeconds:focusSeconds,completedFocus:0});
export const pomodoroStorageKey=(taskId:string)=>`roas_task_pomodoro_${taskId}`;
export const nextPomodoroPhase=(session:PomodoroSession):PomodoroSession=>({phase:session.phase==='focus'?'break':'focus',status:'ready',remainingSeconds:session.phase==='focus'?breakSeconds:focusSeconds,completedFocus:session.completedFocus+(session.phase==='focus'?1:0)});
const emit=()=>window.dispatchEvent(new Event(POMODORO_EVENT));
function write(taskId:string,session:PomodoroSession){try{localStorage.setItem(pomodoroStorageKey(taskId),JSON.stringify(session))}catch{}}
function checkpoint(taskId:string,session:PomodoroSession,now:number,force=false){
 if(!session.run)return;
 const tasks=store.get<Task[]>('tasks',[]),task=tasks.find(item=>item.id===taskId);
 if(!task)return;
 const record=recordPomodoroRun(session.run,now),records=task.pomodoroRecords||[],previous=records.find(item=>item.id===record.id);
 if(!force&&!record.completed&&record.seconds-(previous?.seconds||0)<30)return;
 if(!record.seconds&&!record.completed)return;
 const next=mergePomodoroRecord(records,record);
 if(next!==records)store.set('tasks',tasks.map(item=>item.id===taskId?{...item,pomodoroRecords:next}:item));
}
export function readPomodoroSession(taskId:string,now=Date.now()):PomodoroSession{
 let parsed:PomodoroSession;
 try{parsed=JSON.parse(localStorage.getItem(pomodoroStorageKey(taskId))||'null')}catch{return createFreshPomodoroSession()}
 if(!parsed||!['focus','break'].includes(parsed.phase)||!['ready','running','paused'].includes(parsed.status)||!Number.isFinite(parsed.remainingSeconds)||!Number.isFinite(parsed.completedFocus))return createFreshPomodoroSession();
 if(parsed.status==='running'){
  const remainingSeconds=Math.max(0,Math.ceil(((parsed.endsAt||0)-now)/1000));
  if(!remainingSeconds){const next=nextPomodoroPhase(parsed);write(taskId,next);checkpoint(taskId,parsed,now,true);return next}
  checkpoint(taskId,parsed,now);
  return {...parsed,remainingSeconds};
 }
 return {...parsed,endsAt:undefined};
}
export function getActivePomodoroTaskId(){try{return localStorage.getItem(ACTIVE_POMODORO_KEY)}catch{return null}}
export function pausePomodoro(taskId:string){
 const current=readPomodoroSession(taskId);
 if(current.status!=='running')return current;
 const next={...current,status:'paused' as const,endsAt:undefined,run:undefined};
 write(taskId,next);checkpoint(taskId,current,Date.now(),true);emit();return next;
}
export function startPomodoro(taskId:string){
 const previousId=getActivePomodoroTaskId();
 if(previousId&&previousId!==taskId)pausePomodoro(previousId);
 const current=readPomodoroSession(taskId);
 if(current.status==='running')return current;
 const now=Date.now(),access=store.access(),endsAt=now+current.remainingSeconds*1000;
 const run:PomodoroRun={id:crypto.randomUUID(),startedAt:now,endsAt,phase:current.phase,personId:access?.uid||'',personName:access?.member?.name||access?.email||'Usuário'};
 const next={...current,status:'running' as const,endsAt,run};
 write(taskId,next);try{localStorage.setItem(ACTIVE_POMODORO_KEY,taskId)}catch{}emit();return next;
}
export function resetPomodoro(taskId:string){
 pausePomodoro(taskId);
 const next=createFreshPomodoroSession();write(taskId,next);
 try{if(getActivePomodoroTaskId()===taskId)localStorage.removeItem(ACTIVE_POMODORO_KEY)}catch{}
 emit();return next;
}
