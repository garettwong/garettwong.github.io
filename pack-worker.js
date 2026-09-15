/* Match the captured frame off the emulation/input thread. Only one frame is in flight. */

importScripts('/pack-engine.js?v=13','/pack-match.js?v=3','/pack-scenery.js?v=1','/pack-ui.js?v=1','/pack-effects.js?v=1','/pack-map.js?v=1');

let config=null,indices,previousPixels=null,previousResult=null;

onmessage=event=>{

 const d=event.data;if(d.type==='init'){config=d;indices=new Map(d.rules.map((r,i)=>[r.id,i]));previousPixels=null;previousResult=null;postMessage({type:'ready'});return;}if(d.type!=='frame'||!config)return;

 try{const start=performance.now(),p=d.pixels;let same=!!previousPixels;if(same)for(let i=0;i<p.length;i++)if(p[i]!==previousPixels[i]){same=false;break;}if(same){postMessage({...previousResult,pixels:p,generation:d.generation,capturedAt:d.capturedAt,workerMs:performance.now()-start,reused:true},[p.buffer]);return;}

 const matches=DreamPatternTools.findMatches(p,config.rules).map(r=>({index:indices.get(r.id),region:r.region})),scene=config.scenery?DreamSceneryTools.match(p,config.scenery):null,scenery=scene?{image:scene.image,region:scene.region,period:scene.period,offset:scene.offset,reveal:scene.reveal}:null,ui=config.ui?DreamHudTools.match(p,config.ui):null;

 if(ui)delete ui.pixels;

 const effects=config.effects?DreamEffectTools.match(p):[],mapTiles=config.map?DreamMapTools.match(p,config.map):[];

 if(!previousPixels)previousPixels=new Uint8ClampedArray(p.length);previousPixels.set(p);previousResult={matches,scenery,ui,effects,mapTiles};postMessage({pixels:p,...previousResult,generation:d.generation,capturedAt:d.capturedAt,workerMs:performance.now()-start,reused:false},[p.buffer]);

 }catch(error){postMessage({error:String(error)});}

};

