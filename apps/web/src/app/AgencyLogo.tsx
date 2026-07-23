import {useEffect} from 'react';
import {useStoreData} from './useStoreData';

export default function AgencyLogo(){
 const [settings]=useStoreData('general_settings',{agencyName:'ROAS',logoDataUrl:'',logoScale:100});
 const name=settings.agencyName?.trim()||'ROAS';
 const safeZoom=Math.min(120,Math.max(80,Number(settings.logoScale)||100));
 useEffect(()=>{document.title=`${name} · Gestão de agência`},[name]);
 return <div className={`logo${settings.logoDataUrl?' hasAgencyLogo':''}`}>
  {settings.logoDataUrl?<span className="agencyLogoFrame"><img className="agencyLogo" src={settings.logoDataUrl} alt={`Logo ${name}`} style={{transform:`scale(${safeZoom/100})`}}/></span>:<div className="rmark">{name.charAt(0).toUpperCase()}</div>}
  <div><b title={name}>{name}</b><small>GESTÃO DE AGÊNCIA</small></div>
 </div>
}
