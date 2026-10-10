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

  // Calendarios a ignorar, por nombre tal cual aparecen en la app Calendario
  // (o en Google Calendar, si se usa googleUrl). Ej: ["Holidays in Argentina"]
  excludeCalendars: [],

  // Si tiene nombres, SOLO se muestran esos calendarios.
  onlyCalendars: [],

  // Cuantos dias hacia adelante mirar como maximo. Se dibuja lo que entre.
  maxDays: 14,

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

  // Palabras que se pintan de su color cada vez que aparecen en un titulo,
  // ej. { ALFA: "#8E24AA" }. Distingue mayusculas ("VA" se pinta, "va" no) y
  // solo toma palabras enteras. En el texto, un color muy oscuro se aclara
  // solo para que se lea sobre negro.
  keywords: {},
};

// Lo que manda el cargador (MI_CONFIG). Corriendo este archivo suelto no existe.
if (typeof OVERRIDES === "object" && OVERRIDES) Object.assign(CONFIG, OVERRIDES);

const VERSION = "0.6";

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
  const readable = hex => {
    let h = String(hex || "#888888").replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16);
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const lum = c => {
      const l = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
    };
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
  // Titulo con las palabras clave en su color (y en negrita).
  const drawTitle = (text, x, cy, maxW, weight, size) => {
    ctx.font = font(700, size); // se mide con la mas ancha para no pasarse
    const fitted = fit(text, maxW);
    const parts = kwRe ? fitted.split(kwRe) : [fitted]; // con grupo: impares = clave
    parts.forEach((part, i) => {
      if (!part) return;
      const isKw = i % 2 === 1;
      ctx.font = font(isKw ? 700 : weight, size);
      ctx.fillStyle = isKw ? readable(kw[part]) : o.textColor;
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
    if (e.allDay) {
      ctx.fillStyle = rgba(e.color, 0.32);
      pill(padX, y + 3 * s, W - 2 * padX, rowH - 6 * s, 6 * s);
      drawTitle(e.title, padX + 10 * s, cy, W - 2 * padX - 20 * s, 600, 15);
      return;
    }
    ctx.fillStyle = e.color;
    pill(padX, y + 5 * s, 4 * s, rowH - 10 * s, 2 * s);

    const ongoing = e.start <= now && e.end > now;
    let label = hhmm(e.start);
    if (e.start < dayStart) label = "…";
    if (ongoing) label = "ahora";
    ctx.font = font(ongoing ? 700 : 500, 15);
    ctx.fillStyle = ongoing ? readable(e.color) : o.mutedColor;
    ctx.fillText(label, padX + 12 * s, cy);

    const x = padX + 12 * s + timeW;
    drawTitle(e.title, x, cy, W - padX - x, 500, 16);
  };

  let y = top;
  for (let d = 0; d < o.maxDays; d++) {
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d).getTime();
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d + 1).getTime();
    let evs = data.events.filter(e => e.start < dayEnd && e.end > dayStart);
    if (d === 0) evs = evs.filter(e => e.allDay || e.end > now);
    if (evs.length === 0 && d > 0) continue;
    evs.sort((a, b) => (b.allDay - a.allDay) || (a.start - b.start) || a.title.localeCompare(b.title));

    const gap = y === top ? 0 : dayGap;
    if (y + gap + headH + rowH > bottom) break;
    y += gap;
    drawHeader(d, dayStart, y);
    y += headH;

    const rows = evs.length ? evs : [null];
    const avail = Math.floor((bottom - y) / rowH);
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
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + CONFIG.maxDays);
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
  const req = new Request(CONFIG.googleUrl + sep + "days=" + CONFIG.maxDays);
  req.timeoutInterval = 20;
  const json = await req.loadJSON();
  if (!json || !Array.isArray(json.events)) throw new Error("Respuesta inesperada de Google: " + JSON.stringify(json).slice(0, 200));
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

async function renderImage(payload, W, H) {
  const wv = new WebView();
  await wv.loadHTML('<html><body style="margin:0;background:#000"><canvas id="c"></canvas></body></html>');
  const js = `${drawCalendar.toString()}
    const c = document.getElementById("c");
    c.width = ${W}; c.height = ${H};
    drawCalendar(c, ${JSON.stringify(payload)});
    c.toDataURL("image/png").split(",")[1];`;
  const b64 = await wv.evaluateJavaScript(js, false);
  return Image.fromData(Data.fromBase64String(b64));
}

async function main() {
  const now = new Date();
  let events = null;
  let note = "";
  let googleCals = null;
  if (CONFIG.googleUrl) {
    try {
      const g = await loadFromGoogle();
      events = g.events;
      googleCals = g.calendars;
    } catch (err) { console.error(err); note = " · sin Google"; }
  }
  const phone = await loadFromIPhone(now);
  // Del iPhone solo lo que Google no trajo: si no, cada evento saldria dos veces
  // y el de Google es el que tiene el color del evento.
  events = events
    ? events.concat(phone.filter(e => !googleCals.has(e.calendar)))
    : phone;

  // El mismo evento puede venir de dos calendarios (pasa con los feriados):
  // se muestra una sola vez.
  const seen = new Set();
  events = events.filter(e => {
    const key = [e.title.trim().toLowerCase(), e.start, e.end, e.allDay].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const res = Device.screenResolution();
  const W = Math.round(res.width), H = Math.round(res.height);
  const two = n => String(n).padStart(2, "0");
  const payload = {
    now: now.getTime(),
    events,
    opts: CONFIG,
    footer: CONFIG.showUpdated ? `act. ${two(now.getHours())}:${two(now.getMinutes())}${note}` : "",
  };
  const img = await renderImage(payload, W, H);

  // Atajos no acepta una imagen como salida de Scriptable: va como texto
  // base64 y el Atajo la decodifica antes de ponerla de fondo.
  Script.setShortcutOutput(Data.fromPNG(img).toBase64String());
  if (config.runsInApp) await QuickLook.present(img, true);
  Script.complete();
}

await main();
