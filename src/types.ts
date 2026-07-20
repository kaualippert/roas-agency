export type Status='active'|'inactive'|'prospect'|'planning'|'paused'|'completed'|'cancelled'|'todo'|'pending'|'in_progress'|'overdue';
export interface Base {id:string;createdAt:string;updatedAt:string}
export interface Client extends Base {companyName:string;contactName:string;email:string;phone:string;instagram:string;segment:string;city:string;status:'active'|'inactive'|'prospect';managerId:string;monthlyRevenue:number;services:string[];startDate:string;notes:string;color:string}
export interface Project extends Base {clientId:string;name:string;description:string;status:'planning'|'active'|'paused'|'completed'|'cancelled';priority:string;responsibleId:string;dueDate:string;progress:number;monthlyValue:number;services:string[];channels:string[]}
export interface Task extends Base {title:string;description:string;clientId:string;projectId:string;responsibleId:string;status:'todo'|'pending'|'in_progress'|'completed'|'overdue';priority:'low'|'medium'|'high'|'urgent';dueDate:string;tags:string[];position:number;commentsCount:number;attachmentsCount:number}
export interface TeamMember extends Base {name:string;email:string;role:string;roles?:string[];clientIds?:string[];department:string;status:string;color:string}
export interface GenericItem extends Base {name:string;clientId?:string;status:string;value?:number;date?:string;description?:string;category?:string}
