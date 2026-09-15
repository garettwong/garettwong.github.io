class PowerAudio extends AudioWorkletProcessor{
 constructor(){super();this.left=new Float32Array(16384);this.right=new Float32Array(16384);this.read=0;this.write=0;this.count=0;this.port.onmessage=({data})=>{if(data.clear){this.read=this.write=this.count=0;return;}const {left,right}=data;if(!left||!right)return;for(let i=0;i<left.length;i++){if(this.count===16384){this.read=(this.read+1)&16383;this.count--;}this.left[this.write]=left[i];this.right[this.write]=right[i];this.write=(this.write+1)&16383;this.count++;}};}
 process(inputs,outputs){const [left,right]=outputs[0];for(let i=0;i<left.length;i++){if(this.count){left[i]=this.left[this.read];right[i]=this.right[this.read];this.read=(this.read+1)&16383;this.count--;}else{left[i]=right[i]=0;}}return true;}
}
registerProcessor('power-audio',PowerAudio);
