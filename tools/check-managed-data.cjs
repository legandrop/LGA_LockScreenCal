const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../LockScreenCal.js'),'utf8');
const section=source.split('// ==== MANAGED DATA START ====')[1].split('// ==== MANAGED DATA END ====')[0];
const fixtures={version:1,google:{at:Date.now(),data:{events:[],calendars:[]}},todoist:{at:Date.now(),data:{me:{id:'fixture'},projects:[],tasks:[]}}};
const files=new Map();let offline=false,reply=fixtures,requests=0;
const context=vm.createContext({CONFIG:{googleUrl:'https://example.test?token=FIXTURE',logCollector:'https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/runs'},VERSION:'0.21',
 FileManager:{local:()=>({libraryDirectory:()=>'/lib',joinPath:(a,b)=>a+'/'+b,writeString:(p,v)=>files.set(p,v),readString:p=>files.get(p)})},
 logKey:value=>{assert.equal(value,'LockScreenCal.calendar.v1:FIXTURE');return 'derived-key';},withDeadline:async(p,ms)=>{assert.equal(ms,1500);return p;},
 Request:class {constructor(url){assert.equal(url,'https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/calendar');} response={statusCode:200}; async loadJSON(){requests++;assert.equal(this.headers.Authorization,'Bearer derived-key');if(offline)throw new Error('Sin red');return reply;}},
});vm.runInContext(section,context);
(async()=>{
 assert.equal(context.usesManagedData(),true);
 let data=await context.loadManagedData();assert.equal(data.google.data.events.length,0);assert.ok(!files.get('/lib/LockScreenCal-data.json').includes('FIXTURE'));
 offline=true;data=await context.loadManagedData();assert.equal(data.localCache,true);assert.ok(data.todoist);
 files.set('/lib/LockScreenCal-data.json',JSON.stringify({...fixtures,google:{...fixtures.google,at:Date.now()-3600001},todoist:null}));
 data=await context.loadManagedData();assert.equal(data.google,null);assert.equal(data.todoist,null);
 files.clear();offline=false;reply={version:99,token:'SECRET'};data=await context.loadManagedData();assert.equal(data.google,null);assert.equal(files.size,0);
 context.CONFIG.logCollector='https://other.test/api/runs';assert.equal(context.usesManagedData(),false);
 context.CONFIG.logCollector='https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/runs';context.CONFIG.managedData=false;assert.equal(context.usesManagedData(),false);
 console.log('OK: servicio autorizado, clave separada, copia local, vencimiento y respuesta invalida');
})().catch(error=>{console.error(error);process.exitCode=1;});
