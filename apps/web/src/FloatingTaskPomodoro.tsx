import {useCallback,useEffect,useState} from 'react';
import {ArrowUpRight,ChevronDown,ChevronUp,Pause,Play} from 'lucide-react';
import {Link} from 'react-router-dom';
import {store} from './storage';
import type {Task} from './types';
import {activatePomodoroTask,ACTIVE_POMODORO_KEY,breakSeconds,clearActivePomodoroTask,focusSeconds,getActivePomodoroTaskId,POMODORO_EVENT,readPomodoroSession,savePomodoroSession,type PomodoroSession} from './task-pomodoro-state';
import './floating-task-pomodoro.css';

type FloatingSession={taskId:string;title:string;session:PomodoroSession};
const formatClock=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
const clean=(session:PomodoroSession)=>session.status==='ready'&&session.phase==='focus'&&session.completedFocus===0;
const dialLength=2*Math.PI*21;

function MiniDial({phase,progress,running}:{phase:'focus'|'break';progress:number;running:boolean}){
 const angle=progress*3.6;
 return <span className={`floatingPomodoroDial ${phase}${running?' running':''}`} aria-hidden="true"><svg viewBox="0 0 52 52"><circle className="floatingPomodoroTrack" cx="26" cy="26" r="21"/><circle className="floatingPomodoroArc" cx="26" cy="26" r="21" strokeDasharray={dialLength} strokeDashoffset={dialLength*(1-progress/100)} transform="rotate(-90 26 26)"/><line className="floatingPomodoroHand" x1="26" y1="26" x2="26" y2="14" transform={`rotate(${angle} 26 26)`}/><circle className="floatingPomodoroHub" cx="26" cy="26" r="2.2"/></svg></span>;
}

export default function FloatingTaskPomodoro(){
 const [session,setSession]=useState<FloatingSession|null>(null);
 const [now,setNow]=useState(Date.now());
 const [minimized,setMinimized]=useState(()=>localStorage.getItem('roas_task_pomodoro_minimized')==='true');
 const refresh=useCallback(()=>{
  const taskId=getActivePomodoroTaskId();
  if(!taskId){setSession(null);return}
  const current=readPomodoroSession(taskId);
  if(clean(current)){setSession(null);return}
  const task=store.get<Task[]>('tasks',[]).find(item=>item.id===taskId);
  setSession(previous=>previous?.taskId===taskId&&previous.title===(task?.title||'Tarefa')&&previous.session.phase===current.phase&&previous.session.status===current.status&&previous.session.endsAt===current.endsAt&&previous.session.remainingSeconds===current.remainingSeconds&&previous.session.completedFocus===current.completedFocus?previous:{taskId,title:task?.title||'Tarefa',session:current});
 },[]);
 useEffect(()=>{
  refresh();
  const onStorage=(event:StorageEvent)=>{if(event.key===ACTIVE_POMODORO_KEY||event.key?.startsWith('roas_task_pomodoro_'))refresh()};
  window.addEventListener(POMODORO_EVENT,refresh);
  window.addEventListener('storage',onStorage);
  window.addEventListener('roas-change',refresh);
  const interval=window.setInterval(()=>{setNow(Date.now());refresh()},1000);
  return()=>{window.removeEventListener(POMODORO_EVENT,refresh);window.removeEventListener('storage',onStorage);window.removeEventListener('roas-change',refresh);window.clearInterval(interval)};
 },[refresh]);
 useEffect(()=>{try{localStorage.setItem('roas_task_pomodoro_minimized',String(minimized))}catch{}},[minimized]);
 if(!session)return null;
 const {session:timer}=session;
 const remaining=timer.status==='running'?Math.max(0,Math.ceil(((timer.endsAt||now)-now)/1000)):timer.remainingSeconds;
 const duration=timer.phase==='focus'?focusSeconds:breakSeconds;
 const progress=Math.max(0,Math.min(100,((duration-remaining)/duration)*100));
 const phaseLabel=timer.phase==='focus'?'Foco':'Pausa curta';
 const status=timer.status==='running'?'Em andamento':timer.status==='paused'?'Pausado':timer.phase==='break'?'Foco concluído · pausa pronta':'Próximo ciclo';
 const openTask=`/tasks?task=${encodeURIComponent(session.taskId)}`;
 const toggleTimer=()=>{
  const latest=readPomodoroSession(session.taskId);
  if(latest.status==='running'){
   const seconds=Math.max(0,Math.ceil(((latest.endsAt||Date.now())-Date.now())/1000));
   savePomodoroSession(session.taskId,{...latest,status:'paused',remainingSeconds:seconds,endsAt:undefined});
   return;
  }
  const next={...latest,status:'running' as const,endsAt:Date.now()+latest.remainingSeconds*1000};
  savePomodoroSession(session.taskId,next);
  activatePomodoroTask(session.taskId);
 };
 const resetTimer=()=>{savePomodoroSession(session.taskId,{phase:'focus',status:'ready',remainingSeconds:focusSeconds,completedFocus:0});clearActivePomodoroTask(session.taskId)};
 return <aside className={`floatingTaskPomodoro${minimized?' minimized':''}${timer.phase==='break'?' break':''}`} aria-label="Pomodoro flutuante">
  {minimized?<div className="floatingPomodoroCompact"><button type="button" className="floatingPomodoroExpand" onClick={()=>setMinimized(false)} aria-label={`Expandir Pomodoro, ${formatClock(remaining)} restantes`}><MiniDial phase={timer.phase} progress={progress} running={timer.status==='running'}/><time>{formatClock(remaining)}</time><ChevronUp/></button><button type="button" className="floatingPomodoroMiniControl" onClick={toggleTimer} aria-label={timer.status==='running'?'Pausar Pomodoro':'Retomar Pomodoro'}>{timer.status==='running'?<Pause/>:<Play/>}</button></div>:<>
   <div className="floatingPomodoroTop"><span><i className={timer.status==='running'?'active':''}/>{timer.status==='running'?'POMODORO ATIVO':'POMODORO'}</span><button type="button" onClick={()=>setMinimized(true)} title="Minimizar relógio Pomodoro" aria-label="Minimizar relógio Pomodoro"><ChevronDown/></button></div>
   <div className="floatingPomodoroContent"><MiniDial phase={timer.phase} progress={progress} running={timer.status==='running'}/><div className="floatingPomodoroInfo"><b>{formatClock(remaining)} <small>{phaseLabel}</small></b><span title={session.title}>{session.title}</span><em>{status}</em></div></div>
   <div className="floatingPomodoroFooter"><Link to={openTask}>Abrir tarefa <ArrowUpRight/></Link><span>{timer.completedFocus} {timer.completedFocus===1?'foco':'focos'} concluídos</span></div>
   <div className="floatingPomodoroActions"><button type="button" className="floatingPomodoroToggle" onClick={toggleTimer}>{timer.status==='running'?<><Pause/> Pausar</>:<><Play/> {timer.status==='paused'?'Retomar':timer.phase==='break'?'Iniciar pausa':'Continuar foco'}</>}</button><button type="button" className="floatingPomodoroReset" onClick={resetTimer} title="Encerrar Pomodoro" aria-label="Encerrar Pomodoro">Encerrar</button></div>
  </>}
 </aside>;
}
