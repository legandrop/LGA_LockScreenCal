// LockScreenCal — tu calendario dibujado en el fondo del lock screen.
//
// Corre en la app Scriptable (iPhone). Lee los eventos, dibuja una imagen del
// tamaño exacto de la pantalla y se la pasa a Atajos, que la pone de fondo.
// Instrucciones completas en el README del repo.
//
// Normalmente no se corre este archivo a mano: lo baja y lo corre loader.js,
// que va adentro del Atajo. Los ajustes de cada persona van en el MI_CONFIG de
// ese cargador y pisan los valores de abajo, asi este archivo es igual para todos.

const CONFIG = {
  // De donde salen los eventos:
  //  - Vacio (""): los calendarios del iPhone. Funciona sin configurar nada,
  //    cada calendario con su color.
  //  - URL de Google Apps Script (ver google/Code.gs): trae el color de cada
  //    EVENTO, no solo el del calendario. Los calendarios que Google no tiene
  //    (ej. los cumpleaños de los contactos) se siguen leyendo del iPhone. Si
  //    Google no responde, usa todo del iPhone.
  googleUrl: "",

  // Historial remoto opcional. Si falla, queda pendiente en el iPhone.
  logRemote: false,
  // Receptor administrado independiente del puente de calendario. Vacio: Google.
  logCollector: "",

  // Tareas de Todoist con fecha (opcional). El token se saca de Todoist:
  // Configuracion -> Integraciones -> Desarrollador. Da acceso total a la cuenta:
  // va solo en el MI_CONFIG de cada uno, nunca se comparte.
  todoistToken: "",

  // Solo las tareas asignadas a vos o sin asignar (en proyectos compartidos, las
  // de los demas no se muestran).
  todoistOnlyMine: true,

  // Calendarios a ignorar, por nombre tal cual aparecen en la app Calendario
  // (o en Google Calendar, si se usa googleUrl). Ej: ["Holidays in Argentina"]
  excludeCalendars: [],

  // Si tiene nombres, SOLO se muestran esos calendarios.
  onlyCalendars: [],

  // Cuantos dias hacia adelante mirar como maximo. Se dibuja lo que entre.
  maxDays: 14,

  // Arrancar N dias despues de hoy en vez de hoy. Sirve para probar como se ve
  // una semana con mas eventos; para el uso normal, 0.
  startInDays: 0,

  // Zona libre de la pantalla, en % del alto. Arriba esta el reloj (y los
  // widgets si tenes); abajo, la linterna y la camara.
  topPercent: 33,
  bottomPercent: 13,
  paddingX: 22,

  background: "#000000",
  textColor: "#FFFFFF",
  mutedColor: "#8E8E93",

  // Muestra arriba a la derecha la hora de la ultima actualizacion.
  showUpdated: true,

  // Como se pinta cada evento: "fill" = el fondo del evento entero de su color
  // (como en Google Calendar); "bar" = una barrita de color a la izquierda.
  eventStyle: "fill",

  // Palabras que se pintan de su color cada vez que aparecen en un titulo,
  // ej. { ALFA: "#8E24AA" }. Distingue mayusculas ("VA" se pinta, "va" no) y
  // solo toma palabras enteras. En el texto, un color muy oscuro se aclara
  // solo para que se lea sobre negro.
  keywords: {},
};

// Lo que manda el cargador (MI_CONFIG). Corriendo este archivo suelto no existe.
if (typeof OVERRIDES === "object" && OVERRIDES) Object.assign(CONFIG, OVERRIDES);

const VERSION = "0.16";

// ==== TRACE START ====
// timeoutInterval limita inactividad de red, no el tiempo total de la consulta.
// El temporizador limita lo que esperamos; no cancela la peticion nativa y no
// puede ejecutarse mientras iOS tiene suspendido el proceso.
function withDeadline(work, ms) {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = Timer.schedule(ms, false, () => reject(new Error("timeout")));
  });
  return Promise.race([work, limit]).finally(() => timer.invalidate());
}

// Se deriva una clave de escritura, sin enviar el token de Google al receptor.
// SHA-256 sin WebView ni imagenes nativas; probado contra node:crypto.
function logKey(text) {
  const bytes = unescape(encodeURIComponent(text));
  const words = [], h = [], k = [];
  for (let n = 2; k.length < 64; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
    if (prime) {
      if (h.length < 8) h.push((Math.sqrt(n) % 1 * 4294967296) | 0);
      k.push((Math.cbrt(n) % 1 * 4294967296) | 0);
    }
  }
  for (let i = 0; i < bytes.length; i++) words[i >> 2] = (words[i >> 2] || 0) | bytes.charCodeAt(i) << (24 - (i % 4) * 8);
  words[bytes.length >> 2] = (words[bytes.length >> 2] || 0) | 128 << (24 - (bytes.length % 4) * 8);
  const length = Math.ceil((bytes.length + 9) / 64) * 16;
  words[length - 1] = bytes.length * 8;
  const rotate = (x, n) => x >>> n | x << (32 - n);
  for (let offset = 0; offset < length; offset += 16) {
    const w = Array.from({ length: 16 }, (_, i) => words[offset + i] || 0);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      w[i] = (w[i - 16] + (rotate(a, 7) ^ rotate(a, 18) ^ a >>> 3) + w[i - 7] + (rotate(b, 17) ^ rotate(b, 19) ^ b >>> 10)) | 0;
    }
    let [a, b, c, d, e, f, g, q] = h;
    for (let i = 0; i < 64; i++) {
      const t = (q + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + (e & f ^ ~e & g) + k[i] + w[i]) | 0;
      const u = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + (a & b ^ a & c ^ b & c)) | 0;
      q = g; g = f; f = e; e = (d + t) | 0; d = c; c = b; b = a; a = (t + u) | 0;
    }
    [a, b, c, d, e, f, g, q].forEach((v, i) => { h[i] = (h[i] + v) | 0; });
  }
  return h.map(x => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

// El cargador reutiliza esta funcion del archivo descargado. Cada corrida tiene
// su propio archivo para que dos automatizaciones no se pisen el historial.
function createTelemetry(opts, version, initial) {
  const fm = FileManager.local();
  const dir = fm.joinPath(fm.libraryDirectory(), "LockScreenCal-logs");
  const record = initial || {
    id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2),
    startedAt: Date.now(), events: [],
  };
  record.version = version;
  record.revision = record.revision || record.events.length;
  const collector = opts.logCollector || "";
  record.remoteEnabled = !!(opts.logRemote && opts.googleUrl);
  const file = id => fm.joinPath(dir, id + ".json");
  const syncFile = id => fm.joinPath(dir, id + ".sync.json");
  const read = path => {
    try { return JSON.parse(fm.readString(path)); } catch (_) { return null; }
  };
  const write = (path, value) => {
    try { fm.createDirectory(dir, true); fm.writeString(path, JSON.stringify(value)); }
    catch (_) { console.log("No se pudo guardar el historial local"); }
  };
  const list = () => {
    try {
      return fm.listContents(dir).filter(n => n.endsWith(".json") && !n.endsWith(".sync.json"))
        .map(n => read(fm.joinPath(dir, n))).filter(r => r && Array.isArray(r.events))
        .sort((a, b) => a.startedAt - b.startedAt);
    } catch (_) { return []; }
  };
  const fields = ["count", "width", "height", "base64Chars", "httpStatus"];
  const stages = new Set(("loader_start download_start download_ok download_error download_cache loader_error " +
    "script_start google_start google_ok google_error phone_start phone_ok todoist_start todoist_ok todoist_error " +
    "render_start render_ok build_error error_image output_prepared output_call output_error app_preview " +
    "script_prepared reuse_active reuse_recent loader_return_prepared").split(" "));
  const errorCode = err => {
    const message = String(err && err.message || "");
    const http = message.match(/HTTP (\d{3})/);
    if (http) return "HTTP_" + http[1];
    if (/PNG valido/.test(message)) return "invalid_png";
    if (/Respuesta inesperada de Google/.test(message)) return "invalid_google_response";
    if (/timed? out|timeout|tiempo de espera/i.test(message)) return "timeout";
    if (/offline|sin internet|network connection/i.test(message)) return "network_error";
    const names = ["Error", "TypeError", "RangeError", "SyntaxError", "NetworkError"];
    return names.includes(err && err.name) ? err.name : "Error";
  };
  const event = (stage, details = {}) => {
    if (!stages.has(stage)) return;
    const at = Date.now();
    const e = { at, ms: Math.max(0, at - record.startedAt), stage };
    for (const key of fields) if (Number.isFinite(details[key])) e[key] = details[key];
    if (details.errorCode && /^(Error|TypeError|RangeError|SyntaxError|NetworkError|HTTP_\d{3}|invalid_png|invalid_google_response|timeout|network_error)$/.test(details.errorCode)) e.errorCode = details.errorCode;
    record.updatedAt = at;
    record.revision++;
    record.events.push(e);
    record.events = record.events.slice(-50);
    write(file(record.id), record);
  };
  const prune = () => {
    for (const old of list().slice(0, -100)) {
      // Se deja terminar a otras corridas aunque se supere temporalmente el limite.
      if (Date.now() - old.startedAt < 120000) continue;
      try { fm.remove(file(old.id)); if (fm.fileExists(syncFile(old.id))) fm.remove(syncFile(old.id)); }
      catch (_) {}
    }
  };
  const flush = async (previousOnly = false) => {
    if (!opts.logRemote || !opts.googleUrl) return;
    let pending = [];
    let sendError = "envio_fallido";
    try {
      pending = list().filter(r => (!previousOnly || r.id !== record.id) &&
        (read(syncFile(r.id))?.revision || 0) < (r.revision || r.events.length)).slice(0, 5);
      if (!pending.length) return;
      // Solo se transmiten datos tecnicos. No se copian opciones, mensajes de
      // excepcion ni campos arbitrarios de los archivos locales.
      const runs = pending.map(r => ({
        id: r.id, version: r.version, startedAt: r.startedAt, updatedAt: r.updatedAt, revision: r.revision || r.events.length,
        events: r.events.filter(e => stages.has(e.stage)).map(e => {
          const out = { at: e.at, ms: e.ms, stage: e.stage };
          for (const key of fields) if (Number.isFinite(e[key])) out[key] = e[key];
          if (/^(Error|TypeError|RangeError|SyntaxError|NetworkError|HTTP_\d{3}|invalid_png|invalid_google_response|timeout|network_error)$/.test(e.errorCode || "")) out.errorCode = e.errorCode;
          return out;
        }),
      }));
      const req = new Request(collector || opts.googleUrl + (opts.googleUrl.includes("?") ? "&" : "?") + "action=logs");
      req.method = "POST";
      req.headers = { "Content-Type": "application/json", "User-Agent": "LockScreenCal/" + version };
      if (collector) {
        // Solo este servicio puede recibir la clave derivada; no URLs arbitrarias.
        if (collector !== "https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/runs") throw new Error("Receptor no permitido");
        const token = opts.googleUrl.match(/[?&]token=([^&]+)/)?.[1];
        if (!token) throw new Error("Falta token de logs");
        req.headers.Authorization = "Bearer " + logKey("LockScreenCal.logs.v1:" + decodeURIComponent(token));
      }
      req.body = JSON.stringify({ runs });
      req.timeoutInterval = 2;
      const reply = await withDeadline(req.loadJSON(), 2000);
      if (req.response?.statusCode !== 200) sendError = "HTTP_" + (req.response?.statusCode || 0);
      if (["token", "busy", "schema", "size", "action", "json"].includes(reply && reply.error)) sendError = "puente_" + reply.error;
      if (req.response?.statusCode !== 200 || !Array.isArray(reply && reply.accepted)) throw new Error("Respuesta de logs invalida");
      for (const r of pending) {
        const ack = reply.accepted.find(a => a.id === r.id && a.count === r.events.length && a.revision === (r.revision || r.events.length));
        if (ack) write(syncFile(r.id), { count: ack.count, revision: ack.revision, sentAt: Date.now() });
        else write(syncFile(r.id), { revision: read(syncFile(r.id))?.revision || 0, errorCode: "sin_confirmacion", attemptedAt: Date.now() });
      }
    } catch (err) {
      if (err && err.name === "SyntaxError") sendError = "respuesta_no_json";
      if (errorCode(err) === "timeout") sendError = "timeout";
      for (const r of pending) write(syncFile(r.id), {
        revision: read(syncFile(r.id))?.revision || 0, errorCode: sendError, attemptedAt: Date.now(),
      });
      console.log("Logs pendientes: el puente no confirmo el envio");
    }
  };
  // La URL queda solo en el contenedor local de Scriptable para que el visor
  // pueda consultar Google sin pedir que se vuelva a pegar la clave.
  if (opts.logRemote && opts.googleUrl) {
    try { fm.writeString(fm.joinPath(fm.libraryDirectory(), "LockScreenCal-log-endpoint.txt"), opts.googleUrl); }
    catch (_) {}
  }
  prune();
  return { id: record.id, event, error: (stage, err) => event(stage, { errorCode: errorCode(err) }), flush };
}
// ==== TRACE END ====

// Salir varias veces de una app dispara varias automatizaciones. Se guarda el
// ultimo fondo para que esas corridas no repitan consultas y WebViews; el aviso
// de corrida activa vence solo si iOS mata el proceso sin ejecutar finally.
const COOLDOWN_MS = 60000;
const ACTIVE_MS = 120000;

function runStore(trace) {
  const fm = FileManager.local();
  const file = name => fm.joinPath(fm.libraryDirectory(), "LockScreenCal-" + name);
  const read = name => {
    try { return fm.fileExists(file(name)) ? fm.readString(file(name)) : null; }
    catch (_) { return null; }
  };
  const json = name => {
    try { return JSON.parse(read(name)); } catch (_) { return null; }
  };
  const write = (name, value) => {
    try { fm.writeString(file(name), value); return true; }
    catch (_) { console.log("No se pudo guardar el registro local"); return false; }
  };
  // Solo identifica cambios de ajustes para invalidar el fondo guardado.
  // No se escriben tokens, URLs ni eventos en los archivos de diagnostico.
  let hash = 2166136261;
  for (const c of JSON.stringify(CONFIG)) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  const key = VERSION + ":" + (hash >>> 0);
  const startedAt = Date.now();
  const id = startedAt + ":" + Math.random();
  let state;
  const phase = (name, result = "en curso") => {
    state = { version: VERSION, startedAt, updatedAt: Date.now(), phase: name, result };
    write("run.json", JSON.stringify(state));
    const stages = {
      Inicio: "script_start", "Consulta a Google": "google_start", "Calendarios del iPhone": "phone_start",
      "Consulta a Todoist": "todoist_start", "Dibujo en WebView": "render_start",
      "Fondo de error": "error_image", "Preparacion de salida": "output_prepared",
      "Vista previa en Scriptable": "app_preview", "Salida preparada (sin confirmacion de Atajos)": "script_prepared",
    };
    if (stages[name]) trace.event(stages[name]);
    console.log("v" + VERSION + " · " + name + " · " + ((state.updatedAt - startedAt) / 1000).toFixed(1) + " s");
  };
  const cached = () => {
    const info = json("output.json");
    if (!info || info.key !== key) return null;
    const b64 = read("output.txt");
    return typeof b64 === "string" && b64.startsWith("iVBORw0KGgo") ? { b64, at: info.at } : null;
  };
  return {
    phase, cached,
    delivery: (name, b64) => {
      // Tambien las corridas que reutilizan un fondo tienen su propio intento
      // de salida. No pisan la etapa de otra corrida que aun esta dibujando.
      write("delivery.json", JSON.stringify({
        version: VERSION, runId: trace.id, startedAt, updatedAt: Date.now(), phase: name,
        base64Chars: b64.length,
      }));
      trace.event(name.startsWith("Funcion") ? "output_call" : "output_prepared", { base64Chars: b64.length });
    },
    active: () => {
      const run = json("active.json");
      const age = run && Date.now() - run.startedAt;
      return !!run && age >= 0 && age < ACTIVE_MS;
    },
    begin: () => {
      write("active.json", JSON.stringify({ id, startedAt }));
      phase("Inicio");
    },
    save: b64 => {
      if (write("output.txt", b64)) write("output.json", JSON.stringify({ key, at: Date.now() }));
    },
    release: () => {
      try {
        if (json("active.json")?.id === id) fm.remove(file("active.json"));
      } catch (_) { console.log("La marca de corrida activa vencera sola"); }
    },
  };
}

// ==== RENDER START ====
// Dibuja el calendario en un <canvas>. Corre dentro de un WebView (en el iPhone)
// o en un navegador (tools/preview.mjs), por eso no usa nada de afuera.
function drawCalendar(canvas, data) {
  const W = canvas.width, H = canvas.height;
  const o = data.opts;
  const s = W / 390; // un "punto" de diseño, del ancho de un iPhone
  const ctx = canvas.getContext("2d");
  const FAMILY = '-apple-system, system-ui, "Helvetica Neue", Arial, sans-serif';
  const font = (weight, size) => `${weight} ${size * s}px ${FAMILY}`;
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const two = n => String(n).padStart(2, "0");
  const hhmm = t => { const d = new Date(t); return two(d.getHours()) + ":" + two(d.getMinutes()); };
  const rgba = (hex, a) => {
    let h = String(hex || "#888888").replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const fit = (text, maxW) => {
    if (ctx.measureText(text).width <= maxW) return text;
    let lo = 0, hi = text.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ctx.measureText(text.slice(0, mid) + "…").width <= maxW) lo = mid; else hi = mid - 1;
    }
    return text.slice(0, lo).trimEnd() + "…";
  };
  // Sobre negro, un violeta o un azul oscuro como texto no se lee: se mezcla
  // con blanco hasta que tenga luz suficiente. Las barras usan el color tal cual.
  const toRgb = hex => {
    let h = String(hex || "#888888").replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const lum = c => {
    const l = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  // Texto sobre un evento pintado: negro o blanco, el que mas contraste tenga
  // con ese color (criterio de contraste WCAG: el corte cae en luminancia 0.179).
  const inkOn = hex => lum(toRgb(hex)) > 0.179 ? "#000000" : "#FFFFFF";
  const readable = hex => {
    const rgb = toRgb(hex);
    let mix = rgb;
    for (let t = 0; t <= 1 && lum(mix) < 0.22; t += 0.05) mix = rgb.map(v => Math.round(v + (255 - v) * t));
    return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
  };
  const kw = o.keywords || {};
  const kwNames = Object.keys(kw).sort((a, b) => b.length - a.length);
  const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const kwRe = kwNames.length
    ? new RegExp(`(?<![\\p{L}\\p{N}])(${kwNames.map(esc).join("|")})(?![\\p{L}\\p{N}])`, "gu")
    : null;
  // Titulo con las palabras clave en su color (y en negrita). Sobre un evento
  // pintado (ink) van en negrita del color del texto: en su propio color no se
  // verian, porque casi siempre es el mismo color del fondo.
  const drawTitle = (text, x, cy, maxW, weight, size, ink) => {
    ctx.font = font(700, size); // se mide con la mas ancha para no pasarse
    const fitted = fit(text, maxW);
    const parts = kwRe ? fitted.split(kwRe) : [fitted]; // con grupo: impares = clave
    parts.forEach((part, i) => {
      if (!part) return;
      const isKw = i % 2 === 1;
      ctx.font = font(isKw ? 700 : weight, size);
      ctx.fillStyle = ink || (isKw ? readable(kw[part]) : o.textColor);
      ctx.fillText(part, x, cy);
      x += ctx.measureText(part).width;
    });
  };
  const pill = (x, y, w, h, r) => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    ctx.fill();
  };

  ctx.fillStyle = o.background;
  ctx.fillRect(0, 0, W, H);

  const padX = o.paddingX * s;
  const top = H * o.topPercent / 100;
  const bottom = H * (1 - o.bottomPercent / 100);
  const headH = 32 * s, rowH = 28 * s, dayGap = 14 * s;
  const timeW = 50 * s;

  const now = data.now;
  const today = new Date(now);

  // d: dias desde HOY de verdad (no desde el primer dia dibujado).
  const drawHeader = (d, dayStart, y) => {
    const date = new Date(dayStart);
    const main = d === 0 ? "HOY" : d === 1 ? "MAÑANA" : DIAS[date.getDay()].toUpperCase();
    const sub = (d <= 1 ? DIAS[date.getDay()] + " " : "") + date.getDate() + " " + MESES[date.getMonth()];
    const base = y + headH - 10 * s;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.font = font(700, 14);
    ctx.fillStyle = o.textColor;
    ctx.fillText(main, padX, base);
    const w = ctx.measureText(main).width;
    ctx.font = font(500, 14);
    ctx.fillStyle = o.mutedColor;
    ctx.fillText(sub, padX + w + 8 * s, base);
  };

  const drawRow = (e, y, dayStart) => {
    const cy = y + rowH / 2;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    if (!e) {
      ctx.font = font(400, 15);
      ctx.fillStyle = o.mutedColor;
      ctx.fillText("Nada más por hoy", padX, cy);
      return;
    }
    const fill = o.eventStyle !== "bar";
    if (e.allDay) {
      ctx.fillStyle = fill ? e.color : rgba(e.color, 0.32);
      pill(padX, y + 2 * s, W - 2 * padX, rowH - 4 * s, 6 * s);
      drawTitle(e.title, padX + 10 * s, cy, W - 2 * padX - 20 * s, 600, 15, fill ? inkOn(e.color) : null);
      return;
    }
    if (!fill) {
      ctx.fillStyle = e.color;
      pill(padX, y + 5 * s, 4 * s, rowH - 10 * s, 2 * s);
    }
    // Con fondo pintado la hora va pegada al margen y el evento empieza despues.
    const timeX = fill ? padX : padX + 12 * s;

    const ongoing = !e.task && e.start <= now && e.end > now;
    let label = hhmm(e.start);
    if (e.start < dayStart) label = "…";
    if (ongoing) label = "ahora";
    if (e.task && !e.timed) label = "";
    ctx.font = font(ongoing ? 700 : 500, 15);
    ctx.fillStyle = ongoing ? readable(e.color) : o.mutedColor;
    ctx.fillText(label, timeX, cy);

    const x = timeX + timeW;
    // Las tareas llevan un circulito vacio adelante, como en Todoist.
    const box = (cx, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.arc(cx, cy, 6 * s, 0, Math.PI * 2);
      ctx.stroke();
    };
    if (fill) {
      ctx.fillStyle = e.color;
      pill(x + 4 * s, y + 2 * s, W - padX - x - 4 * s, rowH - 4 * s, 6 * s);
      let tx = x + 14 * s;
      if (e.task) { box(tx + 6 * s, inkOn(e.color)); tx += 20 * s; }
      drawTitle(e.title, tx, cy, W - padX - tx - 10 * s, 500, 16, inkOn(e.color));
    } else {
      let tx = x;
      if (e.task) { box(tx + 6 * s, e.color); tx += 20 * s; }
      drawTitle(e.title, tx, cy, W - padX - tx, 500, 16);
    }
  };

  let y = top;
  const first = o.startInDays || 0;
  for (let d = first; d < first + o.maxDays; d++) {
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d).getTime();
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d + 1).getTime();
    let evs = data.events.filter(e => e.start < dayEnd && e.end > dayStart);
    // Una tarea de hoy sigue pendiente aunque haya pasado su hora: no se oculta.
    if (d === 0) evs = evs.filter(e => e.allDay || e.task || e.end > now);
    if (evs.length === 0 && d > 0) continue;
    const rank = e => e.allDay ? 0 : (e.task && !e.timed) ? 1 : 2;
    evs.sort((a, b) => (rank(a) - rank(b)) || (a.start - b.start) || a.title.localeCompare(b.title));

    const gap = y === top ? 0 : dayGap;
    const rows = evs.length ? evs : [null];
    const avail = Math.floor((bottom - y - gap - headH) / rowH);
    // Un dia que no entra entero necesita lugar para al menos un evento y el
    // "+N mas"; si no, un encabezado con solo "+N mas" no dice nada.
    if (avail < 1 || (rows.length > avail && avail < 2)) break;
    y += gap;
    drawHeader(d, dayStart, y);
    y += headH;

    const shown = rows.length <= avail ? rows : rows.slice(0, avail - 1);
    for (const e of shown) { drawRow(e, y, dayStart); y += rowH; }
    if (shown.length < rows.length) {
      ctx.font = font(500, 15);
      ctx.fillStyle = o.mutedColor;
      ctx.textBaseline = "middle";
      ctx.fillText(`+${rows.length - shown.length} más`, padX + 12 * s, y + rowH / 2);
      break;
    }
  }

  if (data.footer) {
    ctx.font = font(400, 11);
    ctx.fillStyle = "#555555";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(data.footer, W - padX, top + headH - 10 * s);
  }
}
// ==== RENDER END ====

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// "2026-10-07" -> medianoche local de ese dia, en ms
function localDay(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

async function loadFromIPhone(now) {
  let cals = await Calendar.forEvents();
  if (CONFIG.onlyCalendars.length) cals = cals.filter(c => CONFIG.onlyCalendars.includes(c.title));
  cals = cals.filter(c => !CONFIG.excludeCalendars.includes(c.title));
  if (!cals.length) return [];
  const start = startOfDay(now);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (CONFIG.startInDays || 0) + CONFIG.maxDays);
  const evs = await CalendarEvent.between(start, end, cals);
  return evs.map(e => ({
    title: e.title || "(sin título)",
    start: e.startDate.getTime(),
    end: e.endDate.getTime(),
    allDay: e.isAllDay,
    color: "#" + String(e.calendar.color.hex).replace("#", ""),
    calendar: e.calendar.title,
  }));
}

async function loadFromGoogle() {
  const sep = CONFIG.googleUrl.includes("?") ? "&" : "?";
  const req = new Request(CONFIG.googleUrl + sep + "days=" + ((CONFIG.startInDays || 0) + CONFIG.maxDays));
  req.timeoutInterval = 12;
  const json = await withDeadline(req.loadJSON(), 12000);
  if (req.response?.statusCode !== 200) throw new Error("HTTP " + req.response?.statusCode);
  if (!json || !Array.isArray(json.events)) throw new Error("Respuesta inesperada de Google");
  // Mismo filtro de calendarios que con el iPhone, para que MI_CONFIG sirva igual
  // con las dos fuentes.
  const calendars = new Set(json.calendars || json.events.map(e => e.calendar));
  const events = json.events
    .filter(e => !CONFIG.onlyCalendars.length || CONFIG.onlyCalendars.includes(e.calendar))
    .filter(e => !CONFIG.excludeCalendars.includes(e.calendar))
    .map(e => e.allDay
      ? { ...e, start: localDay(e.startDay), end: localDay(e.endDay) }
      : e);
  return { events, calendars };
}

// Colores de proyectos y etiquetas de Todoist (tabla "Colors" de su API v1).
const TODOIST_COLORS = {
  berry_red: "#B8255F", red: "#DC4C3E", orange: "#C77100", yellow: "#B29104",
  olive_green: "#949C31", lime_green: "#65A33A", green: "#369307", mint_green: "#42A393",
  teal: "#148FAD", sky_blue: "#319DC0", light_blue: "#6988A4", blue: "#4180FF",
  grape: "#692EC2", violet: "#CA3FEE", lavender: "#A4698C", magenta: "#E05095",
  salmon: "#C9766F", charcoal: "#808080", grey: "#999999", taupe: "#8F7A69",
};

async function todoistGet(path, paginated) {
  const out = [];
  let cursor = null;
  do {
    let url = "https://api.todoist.com/api/v1/" + path;
    if (paginated) url += "?limit=200" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : "");
    const req = new Request(url);
    req.headers = { Authorization: "Bearer " + CONFIG.todoistToken };
    req.timeoutInterval = 20;
    const json = await req.loadJSON();
    if (req.response.statusCode !== 200) throw new Error("Todoist HTTP " + req.response.statusCode);
    if (!paginated) return json;
    out.push(...(json.results || []));
    cursor = json.next_cursor;
  } while (cursor);
  return out;
}

// due.date de Todoist: "2026-10-14" (sin hora), "2026-10-14T15:00:00" (hora local)
// o "2026-10-14T18:00:00Z" (UTC, zona fija).
function todoistDue(date) {
  const m = date.match(/^(\d{4})-(\d\d)-(\d\d)(?:T(\d\d):(\d\d))?/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  if (!m[4]) return { start: new Date(y, mo, d).getTime(), timed: false };
  if (/Z$/.test(date)) return { start: new Date(date.replace(/\.\d+/, "")).getTime(), timed: true };
  return { start: new Date(y, mo, d, Number(m[4]), Number(m[5])).getTime(), timed: true };
}

async function loadFromTodoist(now) {
  const [me, projects, tasks] = await Promise.all([
    todoistGet("user", false),
    todoistGet("projects", true),
    todoistGet("tasks", true),
  ]);
  const projColor = {};
  for (const p of projects) projColor[p.id] = TODOIST_COLORS[p.color] || "#808080";
  const kw = CONFIG.keywords || {};
  const first = startOfDay(now);
  first.setDate(first.getDate() + (CONFIG.startInDays || 0));
  const last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + CONFIG.maxDays);
  const out = [];
  for (const t of tasks) {
    if (!t.due || t.checked) continue;
    if (CONFIG.todoistOnlyMine && t.responsible_uid && String(t.responsible_uid) !== String(me.id)) continue;
    const due = todoistDue(t.due.date);
    // Las vencidas no: el lock screen es para lo que viene.
    if (!due || due.start < first.getTime() || due.start >= last.getTime()) continue;
    const mins = t.duration && t.duration.unit === "minute" ? t.duration.amount : 0;
    // Color: el de la primera etiqueta que este en keywords (asi una tarea de un
    // proyecto sale igual que sus eventos); si no, el del proyecto de Todoist.
    const label = (t.labels || []).find(l => kw[l]);
    out.push({
      task: true,
      timed: due.timed,
      title: String(t.content || "(sin título)").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*/g, ""),
      start: due.start,
      end: due.timed ? due.start + Math.max(mins, 1) * 60000 : due.start + 86400000,
      allDay: false,
      color: label ? kw[label] : (projColor[t.project_id] || "#808080"),
      calendar: "Todoist",
    });
  }
  return out;
}

async function renderImage(payload, W, H) {
  const wv = new WebView();
  await wv.loadHTML('<html><body style="margin:0;background:#000"><canvas id="c"></canvas></body></html>');
  const js = `${drawCalendar.toString()}
    const c = document.getElementById("c");
    c.width = ${W}; c.height = ${H};
    drawCalendar(c, ${JSON.stringify(payload)});
    c.toDataURL("image/png").split(",")[1];`;
  // El canvas ya entrega el PNG comprimido. Decodificarlo como Image aca
  // consume memoria nativa de la extension de Atajos sin aportar nada: despues
  // habria que volver a codificarlo para devolver exactamente el mismo PNG.
  const b64 = await wv.evaluateJavaScript(js, false);
  if (typeof b64 !== "string" || !b64.startsWith("iVBORw0KGgo")) {
    throw new Error("El dibujo no devolvio un PNG valido");
  }
  return b64;
}

// Si algo falla, igual se entrega un fondo con el error escrito: sin salida,
// Atajos solo dice "Script completed without... outputting a value" y no se
// sabe que paso. Se dibuja con DrawContext, por si lo que fallo es el WebView.
function errorImage(msg, W, H) {
  // Si el proceso ya tiene problemas, el diagnostico no necesita una imagen
  // nativa a resolucion completa. Se conserva la proporcion de la pantalla.
  const scale = Math.min(1, 390 / W);
  W = Math.round(W * scale); H = Math.round(H * scale);
  const dc = new DrawContext();
  dc.size = new Size(W, H);
  dc.opaque = true;
  dc.respectScreenScale = false;
  dc.setFillColor(new Color("#000000"));
  dc.fillRect(new Rect(0, 0, W, H));
  dc.setTextColor(new Color("#FF453A"));
  dc.setFont(Font.boldSystemFont(Math.round(W / 26)));
  dc.drawTextInRect("LockScreenCal v" + VERSION + " — error:\n\n" + msg, new Rect(W * 0.08, H * 0.34, W * 0.84, H * 0.5));
  return dc.getImage();
}

async function main() {
  const res = Device.screenResolution();
  const W = Math.round(res.width), H = Math.round(res.height);
  const context = typeof RUN_CONTEXT === "object" && RUN_CONTEXT ? RUN_CONTEXT : null;
  const trace = context?.trace || createTelemetry(CONFIG, VERSION, context?.record);
  if (context) context.trace = trace;
  // Si la corrida anterior murio antes del envio, se recupera su ultimo estado
  // antes de repetir las consultas que podrian volver a cortar el proceso.
  await trace.flush(true);
  const store = runStore(trace);
  let b64;
  const active = store.active();
  const previous = store.cached();
  const age = previous && Date.now() - previous.at;
  // Dentro de la app se puede probar de nuevo sin esperar el minuto. Una
  // corrida que sigue activa se respeta tambien ahi para no sumar otro WebView.
  if (active || (previous && age >= 0 && age < COOLDOWN_MS && !config.runsInApp)) {
    trace.event(active ? "reuse_active" : "reuse_recent");
    console.log(active ? "Ya hay una actualizacion en curso" : "Se reutiliza el fondo del ultimo minuto");
    b64 = previous ? previous.b64 : Data.fromPNG(errorImage("Ya hay una actualizacion en curso. Espera dos minutos y ejecuta una sola vez.", W, H)).toBase64String();
    store.delivery("Salida preparada con fondo reutilizado o aviso", b64);
    Script.setShortcutOutput(b64);
    store.delivery("Funcion de salida invocada (sin confirmacion de Atajos)", b64);
    if (!context) await trace.flush();
    Script.complete();
    return;
  }
  store.begin();
  let result = "ok";
  try {
    try {
      b64 = await build(W, H, store.phase, trace);
      store.save(b64);
    } catch (err) {
      trace.error("build_error", err);
      result = "error";
      store.phase("Fondo de error", result);
      console.error(err);
      const img = errorImage(String((err && err.message) || err), W, H);
      b64 = Data.fromPNG(img).toBase64String();
    }
    // Se registra ANTES de cada puente nativo: si iOS corta el proceso, la
    // ultima etapa queda en disco aunque el catch no llegue a ejecutarse.
    store.phase("Preparacion de salida", result);
    store.delivery("Salida preparada", b64);
    Script.setShortcutOutput(b64);
    store.delivery("Funcion de salida invocada (sin confirmacion de Atajos)", b64);
    if (config.runsInApp) {
      store.phase("Vista previa en Scriptable", result);
      await QuickLook.present(Image.fromData(Data.fromBase64String(b64)), true);
    }
    store.phase("Salida preparada (sin confirmacion de Atajos)", result);
  } catch (err) {
    trace.error("output_error", err);
    throw err;
  } finally {
    store.release();
  }
  if (!context) await trace.flush();
  Script.complete();
}

async function build(W, H, phase, trace) {
  const now = new Date();
  let events = null;
  let note = "";
  let googleCals = null;
  if (CONFIG.googleUrl) {
    phase("Consulta a Google");
    try {
      const g = await loadFromGoogle();
      events = g.events;
      googleCals = g.calendars;
      trace.event("google_ok", { count: events.length });
      console.log("Google: " + events.length + " eventos de " + [...googleCals].join(", "));
    } catch (err) { trace.error("google_error", err); console.error(err); note = " · sin Google"; }
  }
  phase("Calendarios del iPhone");
  const phone = await loadFromIPhone(now);
  trace.event("phone_ok", { count: phone.length });
  console.log("iPhone: " + phone.length + " eventos");
  let tasks = [];
  if (CONFIG.todoistToken) {
    phase("Consulta a Todoist");
    try {
      tasks = await loadFromTodoist(now);
      trace.event("todoist_ok", { count: tasks.length });
      console.log("Todoist: " + tasks.length + " tareas");
    } catch (err) { trace.error("todoist_error", err); console.error(err); note += " · sin Todoist"; }
  }
  // Del iPhone solo lo que Google no trajo: si no, cada evento saldria dos veces
  // y el de Google es el que tiene el color del evento.
  events = (events
    ? events.concat(phone.filter(e => !googleCals.has(e.calendar)))
    : phone).concat(tasks);

  // Una tarea de Todoist con horario reservado en Akiflow tambien aparece como
  // evento de Google con el mismo nombre (Akiflow la "bloquea" en el calendario).
  // Queda la tarea, que es lo que hay que hacer, y se descarta el evento.
  const norm = t => String(t).toLowerCase().replace(/\s+/g, " ").replace(/[\s.…:;,-]+$/, "").trim();
  const dayKey = t => { const d = new Date(t); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); };
  const taskKeys = new Set(tasks.map(t => dayKey(t.start) + "|" + norm(t.title)));
  if (taskKeys.size) {
    const antes = events.length;
    events = events.filter(e => e.task || !taskKeys.has(dayKey(e.start) + "|" + norm(e.title)));
    if (antes !== events.length) console.log("Akiflow: " + (antes - events.length) + " eventos repetidos de tareas");
  }

  // El mismo evento puede venir de dos calendarios (pasa con los feriados):
  // se muestra una sola vez.
  const seen = new Set();
  events = events.filter(e => {
    const key = [e.title.trim().toLowerCase(), e.start, e.end, e.allDay].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const two = n => String(n).padStart(2, "0");
  const payload = {
    now: now.getTime(),
    events,
    opts: CONFIG,
    footer: CONFIG.showUpdated ? `act. ${two(now.getHours())}:${two(now.getMinutes())}${note}` : "",
  };
  phase("Dibujo en WebView");
  const b64 = await renderImage(payload, W, H);
  trace.event("render_ok", { width: W, height: H, base64Chars: b64.length });
  console.log("Dibujo listo: " + W + "x" + H);
  return b64;
}

await main();
