// Prueba build() con datos preparados viejos: colores sobre eventos del iPhone.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const src = fs.readFileSync(require('node:path').join(__dirname, '../LockScreenCal.js'), 'utf8');
const grab = re => src.match(re)[0];
const code = [
  grab(/const DATA_FRESH_MS[\s\S]*?const TASKS_STALE_MAX_MS = .*\n/),
  grab(/function localDay\(str\) \{[\s\S]*?\n\}/),
  grab(/async function loadFromGoogle\(prepared\) \{[\s\S]*?\n\}/),
  grab(/async function build\(W, H, phase, trace\) \{[\s\S]*?\n\}\n/),
].join('\n');
async function run(googleAgeMin, todoistAgeMin) {
  const now = Date.now(), at = new Date(); at.setHours(at.getHours() + 2, 0, 0, 0);
  let payload;
  const ctx = vm.createContext({ console: { log() {}, error() {} },
    CONFIG: { googleUrl: 'x', todoistToken: 'y', onlyCalendars: [], excludeCalendars: [], showUpdated: true },
    usesManagedData: () => true,
    loadManagedData: async () => ({ version: 1,
      google: { at: now - googleAgeMin * 60000, data: { calendars: ['Wanka'], events: [
        { title: 'Reunion ALFA', calendar: 'Wanka', color: '#8E24AA', allDay: false, start: at.getTime(), end: at.getTime() + 3600000 }] } },
      todoist: { at: now - todoistAgeMin * 60000, data: {} } }),
    loadFromIPhone: async () => [
      { title: 'Reunion ALFA', calendar: 'Wanka', color: '#9FE1E7', allDay: false, start: at.getTime(), end: at.getTime() + 3600000 },
      { title: 'Evento nuevo', calendar: 'Wanka', color: '#9FE1E7', allDay: false, start: at.getTime() + 7200000, end: at.getTime() + 9000000 }],
    loadFromTodoist: async () => [{ task: true, timed: false, title: 'Tarea', color: '#4180FF', allDay: false, start: now, end: now + 86400000 }],
    withDeadline: p => p,
    renderImage: async p => { payload = p; return 'B64'; },
  });
  vm.runInContext(code, ctx);
  await ctx.build(1179, 2556, () => {}, { event() {}, error() {}, flush: async () => {} });
  return payload;
}
(async () => {
  let p = await run(10, 10);
  assert.equal(p.events.find(e => e.title === 'Reunion ALFA').color, '#8E24AA');
  assert.equal(p.events.filter(e => e.title === 'Reunion ALFA').length, 1, 'Sin duplicados con datos frescos');
  assert.ok(p.events.find(e => e.task)); assert.ok(!/datos de/.test(p.footer));
  p = await run(180, 180);
  assert.equal(p.events.find(e => e.title === 'Reunion ALFA').color, '#8E24AA', 'Copia de 3 h pinta el evento del iPhone');
  assert.equal(p.events.find(e => e.title === 'Evento nuevo').color, '#9FE1E7', 'Un evento nuevo conserva el color del calendario');
  assert.equal(p.events.filter(e => e.title === 'Reunion ALFA').length, 1);
  assert.ok(p.events.find(e => e.task), 'Tareas de 3 h se muestran'); assert.match(p.footer, /datos de \d\d:\d\d/);
  p = await run(180, 13 * 60);
  assert.ok(!p.events.find(e => e.task), 'Tareas de 13 h no'); assert.match(p.footer, /sin Todoist/);
  console.log('OK: datos frescos, copia vieja solo para colores, tareas hasta 12 h y aviso en el pie');
})().catch(e => { console.error(e); process.exit(1); });
