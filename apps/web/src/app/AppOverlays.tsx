import {lazy,Suspense} from 'react';
import NotificationCenter from '../NotificationCenter';

const CRMLeadManager=lazy(()=>import('../CRMLeadManager'));

export default function AppOverlays(){
 return <><Suspense fallback={null}><CRMLeadManager/></Suspense><NotificationCenter/></>
}
