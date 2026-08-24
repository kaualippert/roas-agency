export type DescriptionToken={type:'text'|'bold'|'italic'|'strike';value:string;color?:string};
export type DescriptionLine={type:'text'|'checklist';checked?:boolean;tokens:DescriptionToken[]};

export function wrapDescriptionSelection(value:string,start:number,end:number,marker:string,endMarker=marker){
 const selected=value.slice(start,end),content=selected||'texto';
 return {value:`${value.slice(0,start)}${marker}${content}${endMarker}${value.slice(end)}`,selectionStart:start+marker.length,selectionEnd:start+marker.length+content.length};
}

export function parseTaskDescription(value:string):DescriptionToken[]{
 const tokens:DescriptionToken[]=[],pattern=/(\*\*[^*\n]+\*\*|~~[^~\n]+~~|_[^_\n]+_|\[color=#[0-9a-fA-F]{6}\][\s\S]*?\[\/color\])/g;
 let cursor=0,match:RegExpExecArray|null;
 while((match=pattern.exec(value))){
  if(match.index>cursor)tokens.push({type:'text',value:value.slice(cursor,match.index)});
  const raw=match[0],colorMatch=raw.match(/^\[color=(#[0-9a-fA-F]{6})\]([\s\S]*)\[\/color\]$/i);
  if(colorMatch)tokens.push(...parseTaskDescription(colorMatch[2]).map(token=>({...token,color:colorMatch[1].toLowerCase()})));
  else{const type=raw.startsWith('**')?'bold':raw.startsWith('~~')?'strike':'italic',trim=type==='italic'?1:2;tokens.push({type,value:raw.slice(trim,-trim)})}
  cursor=match.index+raw.length;
 }
 if(cursor<value.length)tokens.push({type:'text',value:value.slice(cursor)});
 return tokens;
}

export function parseTaskDescriptionLines(value:string):DescriptionLine[]{
 return value.split('\n').map(line=>{const checklist=line.match(/^- \[([ xX])\]\s?(.*)$/);return checklist?{type:'checklist',checked:checklist[1].toLowerCase()==='x',tokens:parseTaskDescription(checklist[2])}:{type:'text',tokens:parseTaskDescription(line)}});
}

export function insertDescriptionChecklist(value:string,start:number,end:number){
 const safeStart=Math.max(0,Math.min(start,value.length)),safeEnd=Math.max(safeStart,Math.min(end,value.length)),lineStart=value.lastIndexOf('\n',Math.max(0,safeStart-1))+1,nextBreak=value.indexOf('\n',safeEnd),lineEnd=nextBreak===-1?value.length:nextBreak,source=value.slice(lineStart,lineEnd),content=(source||'Item').split('\n').map(line=>/^- \[[ xX]\]\s?/.test(line)?line:`- [ ] ${line||'Item'}`).join('\n');
 return {value:`${value.slice(0,lineStart)}${content}${value.slice(lineEnd)}`,selectionStart:lineStart,selectionEnd:lineStart+content.length};
}

export function toggleDescriptionChecklist(value:string,lineIndex:number){
 const lines=value.split('\n');
 if(lineIndex<0||lineIndex>=lines.length)return value;
 if(/^- \[ \]/.test(lines[lineIndex]))lines[lineIndex]=lines[lineIndex].replace('- [ ]','- [x]');
 else if(/^- \[[xX]\]/.test(lines[lineIndex]))lines[lineIndex]=lines[lineIndex].replace(/- \[[xX]\]/,'- [ ]');
 return lines.join('\n');
}

export function validTaskLink(value:string){
 try{const url=new URL(value);return url.protocol==='http:'||url.protocol==='https:'}catch{return false}
}
