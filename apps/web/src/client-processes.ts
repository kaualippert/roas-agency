export type ClientProcessItem={
 id:string;
 title:string;
 completed:boolean;
 completedAt?:string;
};

export type ClientProcess={
 id:string;
 clientId:string;
 title:string;
 description:string;
 items:ClientProcessItem[];
 createdAt:string;
 updatedAt:string;
};

export function clientProcessProgress(process:Pick<ClientProcess,'items'>){
 if(!process.items.length)return 0;
 return Math.round(process.items.filter(item=>item.completed).length/process.items.length*100);
}

export function clientProcessSummary(process:Pick<ClientProcess,'items'>){
 const completed=process.items.filter(item=>item.completed).length;
 return {completed,total:process.items.length,progress:clientProcessProgress(process)};
}
