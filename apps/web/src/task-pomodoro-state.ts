export type PomodoroPhase='focus'|'break';
export type PomodoroStatus='ready'|'running'|'paused';
export type PomodoroSession={phase:PomodoroPhase;status:PomodoroStatus;remainingSeconds:number;endsAt?:number;completedFocus:number};
export const POMODORO_EVENT='roas-pomodoro-change';
export const ACTIVE_POMODORO_KEY='roas_active_task_pomodoro';
export const focusSeconds=25*60,breakSeconds=5*60;
export const createFreshPomodoroSession=():PomodoroSession=>({phase:'focus',status:'ready',remainingSeconds:focusSeconds,completedFocus:0});
export const pomodoroStorageKey=(taskId:string)=>`roas_task_pomodoro_${taskId}`;
export const nextPomodoroPhase=(session:PomodoroSession):PomodoroSession=>({phase:session.phase==='focus'?'break':'focus',status:'ready',remainingSeconds:session.phase==='focus'?breakSeconds:focusSeconds,completedFocus:session.completedFocus+(session.phase==='focus'?1:0)});

const emit=()=>window.dispatchEvent(new Event(POMODORO_EVENT));
export function savePomodoroSession(taskId:string,session:PomodoroSession){try{localStorage.setItem(pomodoroStorageKey(taskId),JSON.stringify(session))}catch{/* Timer keeps working for this page session if storage is unavailable. */}emit()}
export function readPomodoroSession(taskId:string,now=Date.now()):PomodoroSession{
 try{
  const parsed=JSON.parse(localStorage.getItem(pomodoroStorageKey(taskId))||'null') as PomodoroSession|null;
  if(!parsed||!['focus','break'].includes(parsed.phase)||!['ready','running','paused'].includes(parsed.status)||!Number.isFinite(parsed.remainingSeconds)||!Number.isFinite(parsed.completedFocus))return createFreshPomodoroSession();
  if(parsed.status==='running'){
   const remainingSeconds=Math.max(0,Math.ceil(((parsed.endsAt||0)-now)/1000));
   if(!remainingSeconds){const next=nextPomodoroPhase(parsed);try{localStorage.setItem(pomodoroStorageKey(taskId),JSON.stringify(next))}catch{}return next}
   return {...parsed,remainingSeconds};
  }
  return {...parsed,endsAt:undefined};
 }catch{return createFreshPomodoroSession()}
}
export function getActivePomodoroTaskId(){try{return localStorage.getItem(ACTIVE_POMODORO_KEY)}catch{return null}}
export function activatePomodoroTask(taskId:string){
 const previousId=getActivePomodoroTaskId();
 if(previousId&&previousId!==taskId){
  const previous=readPomodoroSession(previousId);
  if(previous.status==='running'){
   const remainingSeconds=Math.max(0,Math.ceil(((previous.endsAt||Date.now())-Date.now())/1000));
   savePomodoroSession(previousId,{...previous,status:'paused',remainingSeconds,endsAt:undefined});
  }
 }
 try{localStorage.setItem(ACTIVE_POMODORO_KEY,taskId)}catch{}
 emit();
}
export function clearActivePomodoroTask(taskId:string){try{if(localStorage.getItem(ACTIVE_POMODORO_KEY)===taskId)localStorage.removeItem(ACTIVE_POMODORO_KEY)}catch{}emit()}
