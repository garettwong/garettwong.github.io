export const melodies={
 correct:[[480,1050,0,.13,'sine'],[880,1175,.09,.16,'triangle']],
 wrong:[[260,95,0,.19,'triangle'],[150,110,.13,.1,'sine']],
 group:[[523,523,0,.12,'sine'],[659,659,.1,.13,'sine'],[784,1047,.2,.24,'triangle']],
 win:[[523,523,0,.16,'triangle'],[659,659,.14,.16,'triangle'],[784,784,.28,.16,'triangle'],[1047,1319,.43,.38,'sine']],
 duck:[[440,240,0,.09,'sawtooth'],[410,210,.12,.12,'triangle']]
};
export class Sounds{
 constructor(enabled=true){this.enabled=enabled;this.context=null;this.last=-Infinity;this.active=new Set();}
 unlock(){if(!this.enabled)return;try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;this.context??=new Audio();if(this.context.state==='suspended')this.context.resume().catch(()=>{});}catch{}}
 async play(kind){if(!this.enabled)return;this.unlock();const c=this.context;if(!c)return;if(c.state==='suspended'){try{await c.resume();}catch{return;}}if(!this.enabled||c.state!=='running')return;const now=c.currentTime;if(now-this.last<.065)return;this.last=now;for(const [from,to,delay,length,type] of melodies[kind]||melodies.correct){const osc=c.createOscillator(),gain=c.createGain(),start=now+delay;osc.type=type;osc.frequency.setValueAtTime(from,start);osc.frequency.exponentialRampToValueAtTime(to,start+length);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(type==='sawtooth'?.025:.075,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+length);osc.connect(gain);gain.connect(c.destination);this.active.add(osc);osc.onended=()=>{this.active.delete(osc);osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+length+.025);}}
 set(enabled){this.enabled=enabled;if(!enabled)for(const osc of this.active){try{osc.stop();}catch{}}else this.unlock();}
}
