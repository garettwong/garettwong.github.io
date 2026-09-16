// Repeat-run state is saved separately; native HP stays below the invulnerability sentinel.
export function createRounds(nes){
 let completed=0;const credit=new Float64Array(16);let cpu=nes.cpu;
 let damagePC=-1,scaledR=false;
 for(let a=0xc000;a<0xffd0;a++)if(cpu.mem[a]===0xb9&&cpu.mem[a+1]===0x78&&cpu.mem[a+2]===5&&cpu.mem[a+3]===0xf0&&cpu.mem[a+5]===0xc9&&cpu.mem[a+6]===0xf0){
  for(let b=a+9;b<a+22;b++)if(cpu.mem[b]===0x99&&cpu.mem[b+1]===0x78&&cpu.mem[b+2]===5){damagePC=b+2;scaledR=cpu.mem[b-3]===0x20&&cpu.mem[b-2]===0x1a&&cpu.mem[b-1]===0xf7;break;}
  if(damagePC>=0)break;
 }
 if(damagePC<0)throw new Error('Unsupported Contra damage routine');
 function install(){cpu=nes.cpu;const write=cpu.write.bind(cpu);cpu.write=function(addr,val){
  if(addr>=0x578&&addr<0x588){const e=addr-0x578,m=this.mem;
   if(this.REG_PC===damagePC&&completed>0){
    const damage=scaledR?m[0]:Math.max(0,m[addr]-val),factor=1+2*completed;
    credit[e]+=damage;const whole=Math.floor(credit[e]/factor);credit[e]-=whole*factor;
    val=Math.max(0,m[addr]-whole);this.REG_ACC=val;this.F_ZERO=val;this.F_SIGN=(val>>7)&1;
   }else credit[e]=0;
  }
  return write(addr,val);
 };}
 install();
 function before(){const m=cpu.mem;
  if(m[0x18]===6){
   completed=Math.min(99999,Math.max(completed+1,m[0x31]));credit.fill(0);
   // Match the native credits exit, returning through the normal level loader.
   m[0x31]=Math.min(3,completed);m[0x30]=0;m[0x18]=5;m[0x2c]=0;m[0x2d]=0;m[0x23]=0;m[0x700]=0;
  }else if(m[0x18]<5&&!m[0x1c]){completed=0;credit.fill(0);}
 }
 return {before,info:()=>({round:completed+1,completed,durability:1+2*completed}),save:()=>({completed,credit:Array.from(credit)}),load(s){if(cpu!==nes.cpu)install();completed=Number.isInteger(s?.completed)?Math.max(0,Math.min(99999,s.completed)):Math.max(0,cpu.mem[0x31]-(cpu.mem[0x18]===6?1:0));credit.fill(0);if(Array.isArray(s?.credit))for(let e=0;e<16;e++)credit[e]=Math.max(0,Math.min(2*completed,s.credit[e]||0));},draw(ctx){if(cpu.mem[0x18]!==5||cpu.mem[0x1c])return;ctx.fillStyle='rgba(5,9,16,.75)';ctx.fillRect(150,229,104,10);ctx.font='8px monospace';ctx.textBaseline='top';ctx.fillStyle='#d7e9ff';ctx.fillText('Round '+(completed+1)+' / '+completed+' clear',153,230);}};
}
