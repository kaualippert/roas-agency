import type {Project,Task} from './types';

export function syncProjectProgress(projects:Project[],tasks:Task[]){
  let changed=false;
  const next=projects.map(project=>{
    const projectTasks=tasks.filter(task=>task.projectId===project.id);
    if(projectTasks.length){
      const progress=Math.round(projectTasks.filter(task=>task.status==='completed').length/projectTasks.length*100);
      if(project.progress===progress&&project.progressMode==='tasks')return project;
      changed=true;
      return {...project,progress,progressMode:'tasks' as const,updatedAt:new Date().toISOString()};
    }
    if(project.progressMode==='tasks'){
      changed=true;
      return {...project,progress:0,progressMode:'manual' as const,updatedAt:new Date().toISOString()};
    }
    return project;
  });
  return {changed,projects:next};
}
