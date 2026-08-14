import {ArrowRight,Flag,Settings2,Trophy} from 'lucide-react';
import {Link} from 'react-router-dom';
import type {CRMGoal,CRMGoalProgress} from './crm-goal';
import {formatCRMGoalValue} from './crm-goal';

type Props={
 goal:CRMGoal;
 result:CRMGoalProgress;
 onConfigure?:()=>void;
 dashboard?:boolean;
};

export default function SalesGoalGauge({goal,result,onConfigure,dashboard=false}:Props){
 const configured=result.target>0;
 const radius=78,circumference=Math.PI*radius;
 const offset=circumference*(1-result.progress/100);
 return <section className={`card salesGoalCard${dashboard?' dashboardSalesGoal':''}`} aria-label="Meta comercial mensal">
  <div className="salesGoalCopy">
   <span className="salesGoalEyebrow"><Flag/> META COMERCIAL MENSAL</span>
   <h3>{configured?(goal.metric==='value'?'Meta por valor de vendas':'Meta por negócios fechados'):'Defina uma meta para o time comercial'}</h3>
   <p>{configured?'O resultado considera os negócios fechados no mês atual.':'Escolha acompanhar a evolução por valor vendido ou por quantidade de negócios.'}</p>
   {configured&&<div className="salesGoalStats">
    <span><small>Realizado</small><b>{formatCRMGoalValue(result.achieved,goal.metric)}</b></span>
    <span><small>Meta</small><b>{formatCRMGoalValue(result.target,goal.metric)}</b></span>
    <span><small>Restante</small><b>{formatCRMGoalValue(result.remaining,goal.metric)}</b></span>
   </div>}
   {onConfigure?<button type="button" className="salesGoalAction" onClick={onConfigure}><Settings2/>{configured?'Editar meta':'Configurar meta'}</button>:<Link className="salesGoalAction" to="/crm"><span>Gerenciar no CRM</span><ArrowRight/></Link>}
  </div>
  <div className={`salesGoalGauge${configured?'':' empty'}`}>
   <svg viewBox="0 0 200 112" role="img" aria-label={`${result.progress}% da meta atingida`}>
    <path className="salesGoalTrack" d="M 22 98 A 78 78 0 0 1 178 98" pathLength={circumference}/>
    <path className="salesGoalArc" d="M 22 98 A 78 78 0 0 1 178 98" pathLength={circumference} style={{strokeDasharray:circumference,strokeDashoffset:offset}}/>
    {[0,25,50,75,100].map((tick,index)=>{const angle=Math.PI-(Math.PI*index/4),x1=100+68*Math.cos(angle),y1=98-68*Math.sin(angle),x2=100+74*Math.cos(angle),y2=98-74*Math.sin(angle);return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2}/>})}
   </svg>
   <div className="salesGoalGaugeValue"><Trophy/><strong>{result.progress}%</strong><span>{configured?'da meta atingida':'meta não configurada'}</span></div>
   <div className="salesGoalScale"><span>0%</span><span>100%</span></div>
  </div>
 </section>;
}
