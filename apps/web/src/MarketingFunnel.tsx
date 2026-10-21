import {useId,type ReactNode} from 'react';
import './marketing-funnel.css';

type FunnelStage={id:string;label:string;formatted:string;help?:ReactNode};
const colors=['#7755ee','#6373e7','#468dd8','#30a6b2','#29aa91','#259b77'];

/** Width indicates stage order, not a ratio between potentially unrelated metrics. */
export default function MarketingFunnel({stages}:{stages:FunnelStage[]}){
 const gradientId=useId().replace(/:/g,'');
 if(!stages.length)return null;
 const height=stages.length*54;
 return <div className="marketingJourneyFunnel">
  <div className="marketingJourneyFunnelPlot" style={{height}} aria-hidden="true">
   <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
    <defs>{stages.map((stage,index)=><linearGradient key={stage.id} id={`${gradientId}-${index}`}><stop stopColor={colors[index%colors.length]}/><stop offset="1" stopColor={colors[index%colors.length]} stopOpacity=".7"/></linearGradient>)}</defs>
    {stages.map((stage,index)=>{const top=index/stages.length*36,bottom=(index+1)/stages.length*36,y=index*54;return <path key={stage.id} d={`M ${top} ${y} L ${100-top} ${y} L ${100-bottom} ${y+51} L ${bottom} ${y+51} Z`} fill={`url(#${gradientId}-${index})`} stroke="var(--card)" strokeWidth=".35"/>})}
   </svg>
  </div>
  <ol className="marketingJourneyFunnelLegend">{stages.map((stage,index)=><li key={stage.id}>
   <span className="marketingJourneyFunnelLabel"><i style={{background:colors[index%colors.length]}}/><span>{stage.label}</span>{stage.help}</span>
   <strong>{stage.formatted}</strong>
  </li>)}</ol>
  <small className="marketingJourneyFunnelNote">Etapas na ordem apresentada. A largura é ilustrativa, não uma taxa de conversão.</small>
 </div>;
}
