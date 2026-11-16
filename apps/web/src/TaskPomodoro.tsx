import {useEffect,useState} from 'react';
import {Coffee,Pause,Play,RotateCcw,Timer} from 'lucide-react';
import './task-pomodoro.css';

type Phase='focus'|'break';
type TimerStatus='ready'|'running'|'paused';
type PomodoroSession={phase:Phase;status:TimerStatus;remainingSeconds:number;endsAt?:number;completedFocus:number};
const focusSeconds=25*60,breakSeconds=5*60;
const freshSession=():PomodoroSession=>({phase:'focus',status:'ready',remainingSeconds:focusSeconds,completedFocus:0});
const storageKey=(taskId:string)=>`roas_task_pomodoro_${taskId}`;
const nextPhase=(session:PomodoroSession):PomodoroSession=>({phase:session.phase==='focus'?'break':'focus',status:'ready',remainingSeconds:session.phase==='focus'?breakSeconds:focusSeconds,completedFocus:session.completedFocus+(session.phase==='focus'?1:0)});

function loadSession(taskId:string):PomodoroSession{
 try{
  const parsed=JSON.parse(localStorage.getItem(storageKey(taskId))||'null') as PomodoroSession|null;
  if(!parsed||!['focus','break'].includes(parsed.phase)||!['ready','running','paused'].includes(parsed.status)||!Number.isFinite(parsed.remainingSeconds)||!Number.isFinite(parsed.completedFocus))return freshSession();
  if(parsed.status==='running'){
   const remainingSeconds=Math.max(0,Math.ceil(((parsed.endsAt||0)-Date.now())/1000));
   return remainingSeconds?{...parsed,remainingSeconds}:{...nextPhase(parsed),status:'ready'};
  }
  return {...parsed,endsAt:undefined};
 }catch{return freshSession()}
}
function persist(taskId:string,session:PomodoroSession){try{localStorage.setItem(storageKey(taskId),JSON.stringify(session))}catch{/* Timer keeps working for this page session when storage is unavailable. */}}
const clock=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;

export default function TaskPomodoro({taskId}:{taskId:string}){
 const [session,setSession]=useState(()=>loadSession(taskId));
 const [remainingSeconds,setRemainingSeconds]=useState(session.remainingSeconds);
 const visible=session.status!=='ready'||session.phase!=='focus'||session.completedFocus>0;
 const duration=session.phase==='focus'?focusSeconds:breakSeconds;
 const progress=Math.max(0,Math.min(100,((duration-remainingSeconds)/duration)*100));

 useEffect(()=>{persist(taskId,session)},[taskId,session]);
 useEffect(()=>{
  if(session.status!=='running'||!session.endsAt)return;
  const update=()=>{
   const remaining=Math.max(0,Math.ceil((session.endsAt!-Date.now())/1000));
   setRemainingSeconds(remaining);
   if(remaining===0){const finished=nextPhase(session);setSession(finished);setRemainingSeconds(finished.remainingSeconds)}
  };
  update();
  const interval=window.setInterval(update,1000);
  return()=>window.clearInterval(interval);
 },[session,taskId]);

 const start=()=>{const next={...session,status:'running' as const,endsAt:Date.now()+remainingSeconds*1000};setSession(next);persist(taskId,next)};
 const pause=()=>{const remaining=Math.max(0,Math.ceil(((session.endsAt||Date.now())-Date.now())/1000)),next={...session,status:'paused' as const,remainingSeconds:remaining,endsAt:undefined};setSession(next);setRemainingSeconds(remaining);persist(taskId,next)};
 const reset=()=>{const next=freshSession();setSession(next);setRemainingSeconds(next.remainingSeconds);persist(taskId,next)};

 if(!visible)return <section className="taskPomodoro taskPomodoroIntro"><div className="taskPomodoroCopy"><span className="taskPomodoroIcon"><Timer/></span><div><b>Modo Pomodoro</b><small>Faça uma sessão de foco nesta tarefa, com pausas curtas.</small></div></div><button type="button" className="taskPomodoroStart" onClick={start}><Play/> Ativar · 25 min</button></section>;

 const phaseLabel=session.phase==='focus'?'Foco':'Pausa curta';
 const stateLabel=session.status==='running'?'Em andamento':session.status==='paused'?'Pausado':session.phase==='break'?'Foco concluído':'Pronto para focar';
 return <section className={`taskPomodoro ${session.phase==='break'?'break':''}`} aria-label="Modo Pomodoro">
  <div className="taskPomodoroHead"><div className="taskPomodoroCopy"><span className="taskPomodoroIcon">{session.phase==='break'?<Coffee/>:<Timer/>}</span><div><b>Pomodoro <span>· {phaseLabel}</span></b><small>{stateLabel}{session.completedFocus>0?` · ${session.completedFocus} ${session.completedFocus===1?'sessão concluída':'sessões concluídas'}`:''}</small></div></div><button type="button" className="taskPomodoroReset" onClick={reset} title="Encerrar e reiniciar Pomodoro" aria-label="Encerrar e reiniciar Pomodoro"><RotateCcw/></button></div>
  <div className="taskPomodoroTimer"><time>{clock(remainingSeconds)}</time><div className="taskPomodoroProgress" role="progressbar" aria-label="Progresso da sessão" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><i style={{width:`${progress}%`}}/></div><div className="taskPomodoroControls">{session.status==='running'?<button type="button" onClick={pause}><Pause/> Pausar</button>:<button type="button" onClick={start}><Play/> {session.status==='paused'?'Retomar':session.phase==='break'?'Iniciar pausa':'Iniciar foco'}</button>}{session.status==='paused'&&<span>O tempo fica pausado até você retomar.</span>}</div></div>
 </section>;
}
