export type PomodoroRecord={id:string;phase:'focus'|'break';startedAt:string;endedAt:string;seconds:number;completed:boolean;personId:string;personName:string};
export type PomodoroRun={id:string;startedAt:number;endsAt:number;phase:'focus'|'break';personId:string;personName:string};

export function recordPomodoroRun(run:PomodoroRun,now:number):PomodoroRecord{
 const end=Math.max(run.startedAt,Math.min(now,run.endsAt));
 return {id:run.id,phase:run.phase,startedAt:new Date(run.startedAt).toISOString(),endedAt:new Date(end).toISOString(),seconds:Math.floor((end-run.startedAt)/1000),completed:now>=run.endsAt,personId:run.personId,personName:run.personName};
}
export function mergePomodoroRecord(records:PomodoroRecord[],record:PomodoroRecord){
 const previous=records.find(item=>item.id===record.id);
 if(previous&&(previous.seconds>record.seconds||previous.seconds===record.seconds&&previous.completed===record.completed))return records;
 return previous?records.map(item=>item.id===record.id?record:item):[...records,record];
}
export function pomodoroTotals(records:PomodoroRecord[]){
 return records.reduce((total,record)=>({focusSeconds:total.focusSeconds+(record.phase==='focus'?record.seconds:0),breakSeconds:total.breakSeconds+(record.phase==='break'?record.seconds:0),cycles:total.cycles+(record.phase==='focus'&&record.completed?1:0)}),{focusSeconds:0,breakSeconds:0,cycles:0});
}
export function formatPomodoroTime(seconds:number){const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);return hours?`${hours}h ${minutes}min`:minutes?`${minutes}min ${Math.floor(seconds%60)}s`:`${Math.floor(seconds)}s`}
