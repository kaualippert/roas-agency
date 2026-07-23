import {lazy} from 'react';

const CRMServicesAnalytics=lazy(()=>import('../CRMServicesAnalytics'));
const CRMLeadManager=lazy(()=>import('../CRMLeadManager'));
const NotificationCenter=lazy(()=>import('../NotificationCenter'));

export default function AppOverlays(){
 return <><CRMServicesAnalytics/><CRMLeadManager/><NotificationCenter/></>
}
