/* Observe native framebuffer uploads without altering the emulator or its pixels. */

(()=>{

 const state=window.DreamFrameSource={enabled:false,requested:true,seq:0,totalFrames:0,pixels:null,format:null,uploads:[]};

 const seen=new Set();

 for(const name of ['WebGLRenderingContext','WebGL2RenderingContext']){

  const proto=window[name]?.prototype;if(!proto)continue;

  for(const method of ['texImage2D','texSubImage2D']){const original=proto[method];if(!original)continue;proto[method]=function(...args){const result=original.apply(this,args);

   const sub=method==='texSubImage2D',w=args[sub?4:3],h=args[sub?5:4],format=args[6],type=args[7],data=args[8];

   if(typeof w==='number'&&typeof h==='number'&&ArrayBuffer.isView(data)){

    const key=[method,w,h,format,type,data.BYTES_PER_ELEMENT].join(':');if(!seen.has(key)&&state.uploads.length<12){seen.add(key);state.uploads.push(key);}

    if(w===256&&h===240&&format===6408&&type===5121&&data.byteLength>=(args[9]||0)+256*240*4){state.canvas=this.canvas;state.totalFrames++;if(state.enabled&&state.requested){state.requested=false;state.capturedAt=globalThis.performance?.now?.()??0;const offset=args[9]||0,bytes=new Uint8ClampedArray(data.buffer,data.byteOffset+offset,256*240*4);state.pixels=new Uint8ClampedArray(bytes);for(let i=3;i<state.pixels.length;i+=4)state.pixels[i]=255;state.seq++;state.format='rgba8';try{state.onFrame?.();}catch(error){console.warn('Artwork frame listener failed',error);}}}

   }

   return result;

  };}

 }

 // Read the completed default framebuffer only when P requests a capture.
 // A core may upload blank RGBA textures before drawing its real RGB frame.
 for(const name of ['WebGLRenderingContext','WebGL2RenderingContext']){
  const proto=window[name]?.prototype;if(!proto)continue;
  for(const method of ['drawArrays','drawElements']){const original=proto[method];if(!original)continue;proto[method]=function(...args){const result=original.apply(this,args);
   if(state.captureCanvasOnce&&this.getParameter(this.FRAMEBUFFER_BINDING)===null){
    const width=this.drawingBufferWidth,height=this.drawingBufferHeight,raw=new Uint8Array(width*height*4);this.readPixels(0,0,width,height,this.RGBA,this.UNSIGNED_BYTE,raw);
    if(raw.some((v,i)=>i%4!==3&&v!==0)){const pixels=new Uint8ClampedArray(raw.length);for(let y=0;y<height;y++)pixels.set(raw.subarray((height-y-1)*width*4,(height-y)*width*4),y*width*4);for(let i=3;i<pixels.length;i+=4)pixels[i]=255;const done=state.captureCanvasOnce;state.captureCanvasOnce=null;done({pixels,width,height});}
   }return result;
  };}
 }

})();

