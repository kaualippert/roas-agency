import {lazy} from 'react';

const CRMLeadManager=lazy(()=>import('../CRMLeadManager'));
const NotificationCenter=lazy(()=>import('../NotificationCenter'));

export default function AppOverlays(){
 return <><CRMLeadManager/><NotificationCenter/></>
}
