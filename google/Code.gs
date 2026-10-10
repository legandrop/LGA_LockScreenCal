// LockScreenCal — puente con Google Calendar (opcional).
//
// El iPhone ve el color de cada CALENDARIO, pero no el color que le pusiste a
// cada EVENTO en Google (los colorId de los proyectos). Este script corre en la
// cuenta de Google de cada uno y le devuelve a Scriptable los eventos con su
// color real. Como se instala, en el README ("Colores de Google").

// Cambialo por algo largo y al azar. Va tambien al final de la URL en Scriptable.
const TOKEN = "CAMBIAME-por-algo-largo-y-al-azar";

// Calendarios a ignorar, por nombre. Ej: ["Holidays in Argentina"]
const EXCLUDE = [];

// Colores de evento de Google Calendar (los que se ven en la web y la app).
const EVENT_COLORS = {
  "1": "#7986CB", // Lavender
  "2": "#33B679", // Sage
  "3": "#8E24AA", // Grape
  "4": "#E67C73", // Flamingo
  "5": "#F6BF26", // Banana
  "6": "#F4511E", // Tangerine
  "7": "#039BE5", // Peacock
  "8": "#616161", // Graphite
  "9": "#3F51B5", // Blueberry
  "10": "#0B8043", // Basil
  "11": "#D50000", // Tomato
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.token !== TOKEN) return json_({ error: "token" });

  const days = Math.min(Number(p.days) || 14, 31);
  const tz = Session.getScriptTimeZone();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + (days + 1) * 86400000);
  const day = d => Utilities.formatDate(d, tz, "yyyy-MM-dd");

  const events = [];
  const calendars = [];
  CalendarApp.getAllCalendars().forEach(cal => {
    if (cal.isHidden() || !cal.isSelected()) return;
    if (EXCLUDE.indexOf(cal.getName()) >= 0) return;
    calendars.push(cal.getName());
    cal.getEvents(start, end).forEach(ev => {
      // En calendarios de solo lectura (feriados, compartidos) puede fallar.
      let status = null;
      try { status = ev.getMyStatus(); } catch (_) {}
      if (status === CalendarApp.GuestStatus.NO) return;
      const out = {
        title: ev.getTitle() || "(sin título)",
        calendar: cal.getName(), // para filtrar con onlyCalendars / excludeCalendars
        color: EVENT_COLORS[ev.getColor()] || cal.getColor(),
        allDay: ev.isAllDayEvent(),
      };
      if (out.allDay) {
        out.startDay = day(ev.getAllDayStartDate());
        out.endDay = day(ev.getAllDayEndDate()); // exclusivo
      } else {
        out.start = ev.getStartTime().getTime();
        out.end = ev.getEndTime().getTime();
      }
      events.push(out);
    });
  });
  // calendars: lo que Google conoce, para que el iPhone complete con el resto
  // (ej. los cumpleaños de los contactos, que no estan en Google).
  return json_({ events: events, calendars: calendars, generated: Date.now() });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
