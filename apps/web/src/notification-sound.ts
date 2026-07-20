export const notificationSoundKey='roas_notification_sound_enabled';

export const notificationSoundEnabled=()=>localStorage.getItem(notificationSoundKey)!=='false';

export function playNotificationSound(kind:'notification'|'conversion'='notification'){
 if(!notificationSoundEnabled())return;
 try{
  const AudioContextClass=window.AudioContext||(window as typeof window&{webkitAudioContext:typeof AudioContext}).webkitAudioContext;
  if(!AudioContextClass)return;
  const context=new AudioContextClass();
  if(kind==='conversion'){
   const strike=context.currentTime+.015;
   [{frequency:880,volume:.16,duration:1.05},{frequency:1760,volume:.07,duration:.72},{frequency:2640,volume:.035,duration:.48},{frequency:3520,volume:.018,duration:.32}].forEach(tone=>{
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type='sine';oscillator.frequency.setValueAtTime(tone.frequency,strike);
    gain.gain.setValueAtTime(.0001,strike);gain.gain.exponentialRampToValueAtTime(tone.volume,strike+.012);gain.gain.exponentialRampToValueAtTime(.0001,strike+tone.duration);
    oscillator.connect(gain);gain.connect(context.destination);oscillator.start(strike);oscillator.stop(strike+tone.duration+.02);
   });
   window.setTimeout(()=>void context.close(),1250);
   return;
  }
  [659.25,880].forEach((frequency,index)=>{
   const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+index*.11;
   oscillator.type='triangle';oscillator.frequency.setValueAtTime(frequency,start);
   gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.13,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+.16);
   oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.17);
  });
  window.setTimeout(()=>void context.close(),480);
 }catch{/* O navegador pode bloquear áudio antes da primeira interação do usuário. */}
}
