// Audio starts/resumes synchronously inside the controller gesture, before loading a worklet.
export function createAudioOutput(onRate){
 let context=null,node=null,pending=null,error=null,backend=null,blocks=0,played={samples:0,peak:0};
 function unlock(){
  try{
   if(navigator.audioSession)navigator.audioSession.type='playback';
   if(!context||context.state==='closed'){
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
    context=new Audio({latencyHint:'interactive'});onRate(context.sampleRate);
   }
   // Do not await a module download before this call: iOS requires the live gesture.
   void context.resume().catch(e=>{error=String(e);});
   if(!node&&!pending){pending=connect().finally(()=>{pending=null;});}
  }catch(e){error=String(e);}
 }
 async function connect(){
  try{
   if(!context.audioWorklet)throw new Error('AudioWorklet unavailable');
   await context.audioWorklet.addModule('/power-core/audio.js?v=82');
   node=new AudioWorkletNode(context,'power-audio',{outputChannelCount:[2]});backend='worklet';node.port.onmessage=({data})=>{played=data;};
  }catch(e){
   // Older Safari or a failed worklet fetch must not leave an unrecoverable silent graph.
   try{
    const l=new Float32Array(16384),r=new Float32Array(16384);let read=0,write=0,count=0;
    node=context.createScriptProcessor(2048,0,2);backend='fallback';
    node.port={postMessage(data){if(data.clear){read=write=count=0;return;}for(let i=0;i<data.left.length;i++){if(count===l.length){read=(read+1)&16383;count--;}l[write]=data.left[i];r[write]=data.right[i];write=(write+1)&16383;count++;}}};
    node.onaudioprocess=event=>{const a=event.outputBuffer.getChannelData(0),b=event.outputBuffer.getChannelData(1);for(let i=0;i<a.length;i++){if(count){a[i]=l[read];b[i]=r[read];read=(read+1)&16383;count--;}else a[i]=b[i]=0;}};
   }catch(failure){node=null;error=String(failure);return;}
  }
  node.connect(context.destination);error=null;
 }
 return {unlock,clear(){node?.port.postMessage({clear:true});},pause(){void context?.suspend().catch(()=>{});node?.port.postMessage({clear:true});},push(left,right){if(!node||context.state!=='running'||!left.length)return;const l=Float32Array.from(left),r=Float32Array.from(right);node.port.postMessage({left:l,right:r},[l.buffer,r.buffer]);blocks++;},info(){return {state:context?.state||'not-started',backend,blocks,error,played};}};
}
