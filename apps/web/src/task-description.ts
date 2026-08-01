export type DescriptionToken={type:'text'|'bold'|'italic'|'strike';value:string};

export function wrapDescriptionSelection(value:string,start:number,end:number,marker:string){
 const selected=value.slice(start,end),content=selected||'texto';
 return {value:`${value.slice(0,start)}${marker}${content}${marker}${value.slice(end)}`,selectionStart:start+marker.length,selectionEnd:start+marker.length+content.length};
}

export function parseTaskDescription(value:string):DescriptionToken[]{
 const tokens:DescriptionToken[]=[],pattern=/(\*\*[^*\n]+\*\*|~~[^~\n]+~~|_[^_\n]+_)/g;
 let cursor=0,match:RegExpExecArray|null;
 while((match=pattern.exec(value))){
  if(match.index>cursor)tokens.push({type:'text',value:value.slice(cursor,match.index)});
  const raw=match[0],type=raw.startsWith('**')?'bold':raw.startsWith('~~')?'strike':'italic',trim=type==='italic'?1:2;
  tokens.push({type,value:raw.slice(trim,-trim)});
  cursor=match.index+raw.length;
 }
 if(cursor<value.length)tokens.push({type:'text',value:value.slice(cursor)});
 return tokens;
}

export function validTaskLink(value:string){
 try{const url=new URL(value);return url.protocol==='http:'||url.protocol==='https:'}catch{return false}
}
