const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={};c.window=c;vm.runInNewContext(fs.readFileSync('D:/Codex 2/projects/NES-Wide64-HPBP169/dbz-wide64-v20-blast-controller.js','utf8').replace('global.DreamGroupBlast={','global.DreamGroupBlast={test:{streakAfter},'),c);
const f=(start,values)=>c.DreamGroupBlast.test.streakAfter(start,values.map(missed=>({beforeHp:100,afterHp:100,potential:{lower:'0',upper:'0',missed}})));
const cases=[[0,[true,true],2],[2,[true],3],[3,[false],0],[0,[true,false,true],1],[8,[false,false],0],[0,[null],null],[null,[true],null],[null,[false,true],1]];
for(const [start,values,want]of cases)assert.equal(f(start,values),want);
fs.writeFileSync(__dirname+'/streak-check.json',JSON.stringify({cases:cases.length,usesNativeFlags:true,zeroDamageHitResets:true,unknownNotGuessed:true},null,2));console.log('PASS eight consecutive-miss transition cases including zero-damage hit');
