import {useEffect,useState} from 'react';
import {Coffee,Timer,CheckCircle2,Clock3} from 'lucide-react';
import {store} from './storage';
import type {Task} from './types';
import {formatPomodoroTime,mergePomodoroRecord,pomodoroTotals,recordPomodoroRun,type PomodoroRun} from './pomodoro-tracking';
import {POMODORO_EVENT} from './task-pomodoro-state';
import './pomodoro-history.css';

export default function PomodoroHistory({taskId}:{taskId:string}){
 const [,refresh]=useState(0);
 useEffect(()=>{const update=()=>refresh(value=>value+1);window.addEventListener('roas-change',update);window.addEventListener(POMODORO_EVENT,update);const timer=window.setInterval(update,1000);return()=>{window.removeEventListener('roas-change',update);window.removeEventListener(POMODORO_EVENT,update);window.clearInterval(timer)}},[]);
 const saved=store.get<Task[]>('tasks',[]).find(task=>task.id===taskId)?.pomodoroRecords||[];
 // Reads from the controller happen in timer effects, not during rendering.
 let run:PomodoroRun|undefined;try{run=JSON.parse(localStorage.getItem(`roas_task_pomodoro_${taskId}`)||'null')?.run}catch{}
 const records=run?mergePomodoroRecord(saved,recordPomodoroRun(run,Date.now())):saved;
 const totals=pomodoroTotals(records);
 return <section className="pomodoroHistory" aria-label="Tempo registrado na tarefa">
  <div className="pomodoroHistoryTitle"><Clock3/><div><h3>Tempo nesta tarefa</h3><p>Foco e descanso registrados pelo Pomodoro. Pausas manuais não contam.</p></div></div>
  <div className="pomodoroTimeStats"><div><Timer/><small>Foco</small><b>{formatPomodoroTime(totals.focusSeconds)}</b></div><div><Coffee/><small>Descanso</small><b>{formatPomodoroTime(totals.breakSeconds)}</b></div><div><CheckCircle2/><small>Ciclos concluídos</small><b>{totals.cycles}</b></div></div>
  {records.length>0?<details><summary>Histórico de sessões <span>{records.length} registros</span></summary><div className="pomodoroHistoryScroll"><table><thead><tr><th>Início</th><th>Pessoa</th><th>Etapa</th><th>Tempo</th><th>Situação</th></tr></thead><tbody>{[...records].sort((a,b)=>b.startedAt.localeCompare(a.startedAt)).map(record=><tr key={record.id}><td>{new Date(record.startedAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</td><td>{record.personName}</td><td>{record.phase==='focus'?'Foco':'Descanso'}</td><td>{formatPomodoroTime(record.seconds)}</td><td>{record.completed?'Concluído':record.id===run?.id?'Em andamento':'Parcial'}</td></tr>)}</tbody></table></div></details>:<p className="pomodoroHistoryEmpty">Ative o Pomodoro para começar a registrar. Os totais permanecem ao encerrar ou reiniciar o relógio.</p>}
 </section>;
}
