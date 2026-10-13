// Verifica la preparacion local y la entrega nativa del cargador de la app.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../LockScreenCal.js'), 'utf8');
const appSection = source.split('// ==== APP RUNNER START ====')[1].split('// ==== APP RUNNER END ====')[0];
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const fixture = { logCollector: 'https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/runs',
  googleUrl: 'SECRET_GOOGLE', todoistToken: 'SECRET_TODOIST', keywords: { SECRET_PROJECT: '#000' }, logRemote: false };
const good = 'const VERSION = "0.20"; function drawCalendar() {}\nScript.setShortcutOutput(' + JSON.stringify(png) + '); Script.complete(); await Promise.resolve(); settled = true;';
async function check({ offline = false, invalidDownload = false, malformedDownload = false, fromShortcut = true, missingOutput = false, freshCodeCached = false, stalledDownload = false, refreshingCode = false, expiredRefresh = false } = {}) {
  const files = new Map(); const keys = new Map(); const calls = []; let downloads = 0;
  if (refreshingCode || expiredRefresh) files.set("/lib/LockScreenCal-code-refresh.json", JSON.stringify({id:"other",at:Date.now()-(expiredRefresh?5000:0)}));
  if (freshCodeCached) files.set("/lib/LockScreenCal-code-at.txt", String(Date.now()));
  files.set('/lib/LockScreenCal.js', missingOutput ? 'function drawCalendar() {}' : good);
  const manager = kind => ({ libraryDirectory: () => '/lib', documentsDirectory: () => '/' + kind + '/documents',
    joinPath: (a,b) => a + '/' + b, fileExists: p => files.has(p), readString: p => files.get(p), writeString: (p,v) => files.set(p,v), remove: p => files.delete(p) });
  const context = vm.createContext({ console, config: { runsInApp: true, runsWithSiri: false },
    Timer: { schedule(ms,repeat,callback) { const timer = setTimeout(callback,ms); return { invalidate() { clearTimeout(timer); } }; } },
    args: { shortcutParameter: fromShortcut ? 'atajo' : null },
    Keychain: { contains: k => keys.has(k), get: k => keys.get(k), set: (k,v) => keys.set(k,v) },
    FileManager: { local: () => manager('local'), iCloud: () => manager('cloud') },
    Request: class { response = { statusCode: 200 }; async loadString() {
      downloads++;
      if (stalledDownload) return new Promise(() => {});
      if (offline) throw new Error('Sin internet');
      return invalidDownload ? '<html>error</html>' : malformedDownload ? 'function drawCalendar() {' : missingOutput ? 'function drawCalendar() {}' : good;
    } },
    Script: { setShortcutOutput(value) { assert.equal(context.settled,true,'La salida nativa debe esperar el final asincrono'); assert.equal(value,png); calls.push('output'); }, complete() { calls.push('complete'); } },
    QuickLook: { async present() { calls.push('preview'); } },
    Image: { fromData(value) { return value; } }, Data: { fromBase64String(value) { return value; } },
  });
  vm.runInContext(appSection, context);
  assert.equal(context.prepareManagedApp({}),0,'No se deben instalar archivos para usuarios sin el receptor administrado');
  assert.equal(context.prepareManagedApp(fixture),2);
  assert.deepEqual(JSON.parse(keys.get('LGA_LockScreenCal.managed.config.v1')),fixture);
  const generated = files.get('/cloud/documents/LGA_LockScreenCal_App.js');
  for(const secret of ['SECRET_GOOGLE','SECRET_TODOIST','SECRET_PROJECT']) assert.ok(!generated.includes(secret),'El archivo debe obtener secretos del Keychain');
  new (Object.getPrototypeOf(async function(){}).constructor)(generated);
  files.set('/local/documents/LGA_LockScreenCal_App.js','MI_SCRIPT_PERSONAL');
  assert.equal(context.prepareManagedApp(fixture),1);
  assert.equal(files.get('/local/documents/LGA_LockScreenCal_App.js'),'MI_SCRIPT_PERSONAL','No se deben pisar scripts personales');
  if (missingOutput) {
    await assert.rejects(vm.runInContext('(async()=>{'+generated+'})()',context),/PNG valido/);
    assert.deepEqual(calls,[],'Un PNG invalido no debe entregarse ni completar la accion como exitosa');
  } else {
    await vm.runInContext('(async()=>{'+generated+'})()',context);
    assert.deepEqual(calls,fromShortcut?['output','complete']:['output','preview','complete']);
    if (freshCodeCached || refreshingCode) assert.equal(downloads,0,'El codigo reciente no debe volver a descargarse');
    if (expiredRefresh) assert.equal(downloads,1);
    if (!refreshingCode) assert.equal(files.has("/lib/LockScreenCal-code-refresh.json"),false,"La marca de descarga debe liberarse despues de exito o fallo");
    if(invalidDownload||malformedDownload) assert.equal(files.get('/lib/LockScreenCal.js'),good,'Una descarga invalida no debe reemplazar la copia buena');
  }
}
(async()=>{
  await check(); await check({fromShortcut:false}); await check({offline:true});
  await check({refreshingCode:true}); await check({expiredRefresh:true});
  await check({freshCodeCached:true}); await check({stalledDownload:true});
  await check({invalidDownload:true}); await check({malformedDownload:true}); await check({missingOutput:true});
  console.log('OK: preparacion privada, Keychain, archivos personales, cache, salida nativa y complete al final');
})().catch(error=>{console.error(error);process.exitCode=1;});
