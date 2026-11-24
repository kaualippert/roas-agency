import {useEffect,useState} from 'react';
import {Coffee,Pause,Play,RotateCcw,Timer} from 'lucide-react';
import {createFreshPomodoroSession,focusSeconds,readPomodoroSession,breakSeconds,startPomodoro,pausePomodoro,resetPomodoro,POMODORO_EVENT} from './task-pomodoro-state';
import PomodoroHistory from './PomodoroHistory';
import './task-pomodoro.css';

const dialMarks=Array.from({length:60},(_,index)=>{const angle=(index/60)*Math.PI*2,radius=index%5===0?87:90;return {x1:120+Math.sin(angle)*radius,y1:120-Math.cos(angle)*radius,x2:120+Math.sin(angle)*95,y2:120-Math.cos(angle)*95,major:index%5===0}});
const clock=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;

export default function TaskPomodoro({taskId}:{taskId:string}){
 const [session,setSession]=useState(createFreshPomodoroSession);
 const [remainingSeconds,setRemainingSeconds]=useState(session.remainingSeconds);
 const visible=session.status!=='ready'||session.phase!=='focus'||session.completedFocus>0;
 const duration=session.phase==='focus'?focusSeconds:breakSeconds;
 const progress=Math.max(0,Math.min(100,((duration-remainingSeconds)/duration)*100));
 const handRotation=progress*3.6,cycleIndex=session.completedFocus%4,completedInCycle=session.completedFocus%4;

 useEffect(()=>{
  const update=()=>{
   const current=readPomodoroSession(taskId);setSession(current);setRemainingSeconds(current.remainingSeconds);
  };
  update();
  const interval=window.setInterval(update,1000);
  window.addEventListener(POMODORO_EVENT,update);window.addEventListener('storage',update);
  return()=>{window.clearInterval(interval);window.removeEventListener(POMODORO_EVENT,update);window.removeEventListener('storage',update)};
 },[taskId]);

 const start=()=>startPomodoro(taskId);
 const pause=()=>pausePomodoro(taskId);
 const reset=()=>resetPomodoro(taskId);

 if(!visible)return <><section className="taskPomodoro taskPomodoroIntro"><div className="taskPomodoroCopy"><span className="taskPomodoroIcon"><Timer/></span><div><b>Modo Pomodoro</b><small>Faça uma sessão de foco nesta tarefa, com pausas curtas.</small></div></div><button type="button" className="taskPomodoroStart" onClick={start}><Play/> Ativar · 25 min</button></section><PomodoroHistory taskId={taskId}/></>;

 const phaseLabel=session.phase==='focus'?'Foco':'Pausa curta';
 const stateLabel=session.status==='running'?'Sessão em andamento':session.status==='paused'?'Sessão pausada':session.phase==='break'?'Foco concluído':'Pronto para focar';
 return <><section className={`taskPomodoro ${session.phase==='break'?'break':''}`} aria-label="Modo Pomodoro">
  <div className="taskPomodoroHead"><div className="taskPomodoroCopy"><span className="taskPomodoroIcon">{session.phase==='break'?<Coffee/>:<Timer/>}</span><div><b>Modo Pomodoro <span>· {phaseLabel}</span></b><small>{stateLabel}{session.completedFocus>0?` · ${session.completedFocus} ${session.completedFocus===1?'sessão concluída':'sessões concluídas'}`:''}</small></div></div><button type="button" className="taskPomodoroReset" onClick={reset} title="Encerrar e reiniciar Pomodoro" aria-label="Encerrar e reiniciar Pomodoro"><RotateCcw/></button></div>
  <div className="taskPomodoroBody">
   <div className={`taskPomodoroDial${session.status==='running'?' isRunning':''}`} aria-label={`${phaseLabel}: ${clock(remainingSeconds)} restantes`}>
    <svg viewBox="0 0 240 240" aria-hidden="true"><circle className="pomodoroDialTrack" cx="120" cy="120" r="100"/><circle className="pomodoroDialProgress" cx="120" cy="120" r="100" strokeDasharray={2*Math.PI*100} strokeDashoffset={2*Math.PI*100*(1-progress/100)} transform="rotate(-90 120 120)"/>{dialMarks.map((mark,index)=><line key={index} className={mark.major?'pomodoroDialMajor':'pomodoroDialMinor'} x1={mark.x1} y1={mark.y1} x2={mark.x2} y2={mark.y2}/>)}<line className="pomodoroDialHand" x1="120" y1="120" x2="120" y2="63" transform={`rotate(${handRotation} 120 120)`}/><circle className="pomodoroDialHub" cx="120" cy="120" r="5"/></svg>
    <div className="taskPomodoroReadout"><span>{session.phase==='focus'?'TEMPO DE FOCO':'TEMPO DE PAUSA'}</span><time>{clock(remainingSeconds)}</time><small>restante</small></div>
   </div>
   <div className="taskPomodoroSide">
    <div className="taskPomodoroCycle"><div><b>Ciclo de foco</b><small>{session.completedFocus} {session.completedFocus===1?'sessão concluída':'sessões concluídas'}</small></div><div className="taskPomodoroCycleDots" aria-label={`${completedInCycle} de 4 sessões concluídas neste ciclo`}>{Array.from({length:4},(_,index)=><i key={index} className={index<completedInCycle?'done':index===cycleIndex?'current':''}/>)}</div></div>
    <div className="taskPomodoroPhases"><span className={session.phase==='focus'?'active':''}><Timer/><b>Foco</b><small>25 min</small></span><i/><span className={session.phase==='break'?'active':''}><Coffee/><b>Pausa</b><small>5 min</small></span></div>
    <div className="taskPomodoroControls">{session.status==='running'?<button type="button" onClick={pause}><Pause/> Pausar sessão</button>:<button type="button" onClick={start}><Play/> {session.status==='paused'?'Retomar foco':session.phase==='break'?'Iniciar pausa':'Iniciar foco'}</button>}{session.status==='paused'&&<small>O cronômetro fica pausado até você retomar.</small>}</div>
   </div>
  </div>
 </section><PomodoroHistory taskId={taskId}/></>;
}
