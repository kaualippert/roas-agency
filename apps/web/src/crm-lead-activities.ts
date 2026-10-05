import type {CRMLead} from './crm-leads';
import type {Task} from './types';

export type CRMFollowUpInput={title:string;description:string;dueDate:string;responsibleId:string};

export function createCRMFollowUpTask(lead:CRMLead,input:CRMFollowUpInput,createdAt=new Date().toISOString(),id=crypto.randomUUID()):Task{
 const responsibleId=input.responsibleId.trim();
 const details=[
  `Follow-up do lead: ${lead.name}`,
  lead.contact?`Contato: ${lead.contact}`:'',
  lead.phone?`Telefone: ${lead.phone}`:'',
  lead.nextAction?`Próxima ação atual: ${lead.nextAction}`:'',
  input.description.trim(),
 ].filter(Boolean);
 return {
  id,
  title:input.title.trim(),
  description:details.join('\n'),
  clientId:'',
  projectId:'',
  leadId:lead.id,
  responsibleId,
  responsibleIds:responsibleId?[responsibleId]:[],
  status:'todo',
  priority:'medium',
  dueDate:input.dueDate,
  tags:['CRM','Follow-up'],
  position:0,
  commentsCount:0,
  attachmentsCount:0,
  createdAt,
  updatedAt:createdAt,
 };
}
