import {lazy,Suspense} from 'react';
import NotificationCenter from '../NotificationCenter';
import '../notification-center.css';
import '../notification-center-enhanced.css';

const CRMLeadManager=lazy(()=>import('../CRMLeadManager'));

export default function AppOverlays(){
 return <><Suspense fallback={null}><CRMLeadManager/></Suspense><NotificationCenter/></>
}
