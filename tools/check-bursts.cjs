// Ejecuta el cargador guardado y el programa real con almacenamiento compartido.
// Verifica rafagas; no reproduce carreras atomicas entre procesos reales de iOS.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../LockScreenCal.js'),'utf8');
const app=source.split('// ==== APP RUNNER START ====')[1].split('// ==== APP RUNNER END ====')[0];
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const epoch=Date.now(),files=new Map(),keys=new Map();let now=epoch,renders=0,requests=0,downloads=0,completions=0,outputs=0;
let renderHold=null,renderReached=null,codeHold=null,codeReached=null;
files.set('/lib/LockScreenCal.js',source);files.set('/lib/LockScreenCal-code-at.txt',String(now));
const settings={logRemote:true,logCollector:'https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/runs',googleUrl:'https://example.test?token=fixture',todoistToken:'FIXTURE'};
const manager=kind=>({libraryDirectory:()=>'/lib',documentsDirectory:()=>'/'+kind+'/docs',joinPath:(a,b)=>a+'/'+b,
 fileExists:p=>files.has(p),readString:p=>files.get(p),writeString:(p,v)=>files.set(p,v),remove:p=>files.delete(p),createDirectory(){},listContents:p=>[...files.keys()].filter(k=>k.startsWith(p+'/')).map(k=>k.slice(p.length+1))});
async function run(){
 class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const context=vm.createContext({Date:Clock,console:{log(){},error(){}},config:{runsInApp:false,runsWithSiri:true},args:{shortcutParameter:'atajo'},
  FileManager:{local:()=>manager('local'),iCloud:()=>manager('cloud')},Keychain:{contains:k=>keys.has(k),get:k=>keys.get(k),set:(k,v)=>keys.set(k,v)},
  Device:{screenResolution:()=>({width:1179,height:2556})},Calendar:{forEvents:async()=>[]},
  Timer:{schedule(ms,repeat,callback){const timer=setTimeout(callback,ms);return {invalidate(){clearTimeout(timer);}};}},
  WebView:class {async loadHTML(){}async evaluateJavaScript(){renders++;if(renderReached)renderReached();if(renderHold)await renderHold;return png;}},
  Request:class {constructor(url){this.url=url;}response={statusCode:200};async loadString(){downloads++;if(codeReached)codeReached();if(codeHold)await codeHold;return source;}async loadJSON(){
   if(this.method==='POST'){const runs=JSON.parse(this.body).runs;return {accepted:runs.map(r=>({id:r.id,count:r.events.length,revision:r.revision}))};}
   assert.equal(this.url,'https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/calendar');requests++;
   return {version:1,google:{at:now,data:{events:[],calendars:[]}},todoist:{at:now,data:{me:{id:'fixture'},projects:[],tasks:[]}}};
  }},
  Script:{setShortcutOutput(value){assert.equal(value,png);outputs++;},complete(){completions++;}},
 });
 vm.runInContext(app,context);context.prepareManagedApp(settings);await context.managedAppRunner();
}
(async()=>{
 await run();assert.equal(renders,1);assert.equal(requests,1);assert.equal(downloads,0);
 for(let i=1;i<=5;i++){now=epoch+i*1000;await run();}
 assert.equal(renders,1,'Cinco repeticiones dentro del minuto deben reutilizar el PNG');assert.equal(requests,1);assert.equal(outputs,6);
 now=epoch+60000;let resumeRender;
 const reached=new Promise(resolve=>{renderReached=resolve;});renderHold=new Promise(resolve=>{resumeRender=resolve;});
 const active=run();await reached;const owner=JSON.parse(files.get('/lib/LockScreenCal-active.json')).id;
 await Promise.all(Array.from({length:5},()=>run()));
 assert.equal(renders,2,'Las llegadas durante el dibujo no deben crear otro WebView');assert.equal(requests,2);
 assert.equal(JSON.parse(files.get('/lib/LockScreenCal-active.json')).id,owner,'Una llegada repetida no debe quitar la marca del propietario');
 resumeRender();await active;renderHold=null;renderReached=null;assert.equal(files.has('/lib/LockScreenCal-active.json'),false);
 now=epoch+300000;let resumeCode;
 const reachedCode=new Promise(resolve=>{codeReached=resolve;});codeHold=new Promise(resolve=>{resumeCode=resolve;});
 const refreshing=run();await reachedCode;await Promise.all(Array.from({length:5},()=>run()));
 assert.equal(downloads,1,'La rafaga con cache vencida no debe multiplicar descargas de codigo');
 resumeCode();await refreshing;codeHold=null;codeReached=null;
 assert.equal(renders,3);assert.equal(requests,3);assert.equal(files.has('/lib/LockScreenCal-code-refresh.json'),false);
 assert.equal(outputs,completions);assert.equal(outputs,18);
 const stages=[...files.entries()].filter(([p])=>p.includes('/LockScreenCal-logs/')&&!p.endsWith('.sync.json')).flatMap(([,value])=>JSON.parse(value).events.map(e=>e.stage));
 assert.ok(stages.includes('reuse_active'));assert.ok(stages.includes('reuse_recent'));
 console.log('OK: cargador real, rafagas, una consulta/dibujo por minuto, propietario y descarga unica');
})().catch(error=>{console.error(error);process.exitCode=1;});
