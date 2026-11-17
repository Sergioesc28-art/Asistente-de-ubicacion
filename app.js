/* Mi Asistente de Ubicación – Práctica 3: APIs del dispositivo
 * Geolocation API · MediaDevices (cámara) · Leaflet/OSM · IndexedDB · Permissions API
 */
'use strict';

const $ = (id) => document.getElementById(id);
const CONSENT_KEY = 'asistente_consent_v1';

/* ---------- Utilidades ---------- */
function toast(msg, ms = 3500) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), ms);
}
function setStatus(el, msg, type = '') {
  el.textContent = msg;
  el.className = 'status' + (type ? ' ' + type : '');
}
const fmtDate = (ts) => new Date(ts).toLocaleString('es-MX');
const fmtCoord = (n) => Number(n).toFixed(6);

/* ---------- IndexedDB ---------- */
const DB_NAME = 'asistente-ubicacion';
const DB_VERSION = 1;
let dbPromise;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB no disponible'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('ubicaciones'))
        db.createObjectStore('ubicaciones', { keyPath: 'id', autoIncrement: true }).createIndex('fecha', 'fecha');
      if (!db.objectStoreNames.contains('fotos'))
        db.createObjectStore('fotos', { keyPath: 'id', autoIncrement: true }).createIndex('fecha', 'fecha');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
async function tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    t.oncomplete = () => resolve(r && r.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
const dbAdd = (store, obj) => tx(store, 'readwrite', (s) => s.add(obj));
const dbAll = (store) => tx(store, 'readonly', (s) => s.getAll());
const dbDel = (store, id) => tx(store, 'readwrite', (s) => s.delete(id));
const dbClear = (store) => tx(store, 'readwrite', (s) => s.clear());

/* ---------- Consentimiento ---------- */
function hasConsent() {
  try { return localStorage.getItem(CONSENT_KEY) === 'yes'; } catch { return false; }
}
function applyConsent() {
  const ok = hasConsent();
  $('consentBanner').hidden = ok;
  $('app').hidden = !ok;
  if (ok) initApp();
}
$('chkConsent').addEventListener('change', (e) => ($('btnConsent').disabled = !e.target.checked));
$('btnConsent').addEventListener('click', () => {
  try { localStorage.setItem(CONSENT_KEY, 'yes'); } catch {}
  applyConsent();
});
$('btnRevoke').addEventListener('click', () => {
  if (!confirm('Se retirará tu consentimiento y se cerrará la cámara. ¿Deseas borrar también tus datos guardados?')) {
    // Retira consentimiento sin borrar datos
  } else {
    wipeAll(true);
  }
  stopCamera();
  try { localStorage.removeItem(CONSENT_KEY); } catch {}
  location.reload();
});

/* ---------- Permisos ---------- */
const PERM_TXT = { granted: 'concedido ✅', denied: 'denegado ⛔', prompt: 'se solicitará al usarlo ❔' };
async function refreshPermissions() {
  if (!navigator.permissions || !navigator.permissions.query) {
    $('permGeo').textContent = $('permCam').textContent = 'no consultable en este navegador';
    return;
  }
  for (const [name, el] of [['geolocation', 'permGeo'], ['camera', 'permCam']]) {
    try {
      const st = await navigator.permissions.query({ name });
      $(el).textContent = PERM_TXT[st.state] || st.state;
      st.onchange = refreshPermissions;
    } catch {
      $(el).textContent = 'no consultable en este navegador';
    }
  }
}

/* ---------- Mapa (Leaflet + OpenStreetMap) ---------- */
let map, marker, circle;
function initMap() {
  if (map) { setTimeout(() => map.invalidateSize(), 200); return; }
  if (typeof L === 'undefined') {
    $('map').hidden = true;
    $('mapMsg').hidden = false;
    setStatus($('mapMsg'), 'No se pudo cargar Leaflet (sin conexión). Conéctate una vez para que se guarde en caché.', 'error');
    return;
  }
  map = L.map('map').setView([23.6345, -102.5528], 4); // México
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  setTimeout(() => map.invalidateSize(), 200);
}
function showOnMap(lat, lng, acc, label) {
  if (!map) return;
  const ll = [lat, lng];
  if (marker) marker.remove();
  if (circle) circle.remove();
  marker = L.marker(ll).addTo(map).bindPopup(label || 'Estás aquí').openPopup();
  if (acc) circle = L.circle(ll, { radius: acc, weight: 1 }).addTo(map);
  map.setView(ll, acc && acc > 500 ? 14 : 17);
}

/* ---------- Geolocalización ---------- */
let lastPos = null;      // última posición obtenida
let pendingLoc = null;   // posición lista para guardar

const GEO_ERR = {
  1: 'Permiso de ubicación denegado. Actívalo desde el candado de la barra de direcciones (o Ajustes del navegador) y recarga la página.',
  2: 'No se pudo determinar la ubicación (señal GPS/red no disponible).',
  3: 'Se agotó el tiempo de espera. Inténtalo de nuevo, preferentemente al aire libre.'
};

function locate() {
  const st = $('locStatus');
  if (!('geolocation' in navigator)) {
    setStatus(st, 'Tu navegador no soporta geolocalización.', 'error');
    return;
  }
  if (!window.isSecureContext) {
    setStatus(st, 'La geolocalización requiere HTTPS (o localhost).', 'error');
    return;
  }
  setStatus(st, 'Solicitando ubicación…');
  $('btnLocate').disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      $('btnLocate').disabled = false;
      const { latitude, longitude, accuracy } = pos.coords;
      lastPos = { lat: latitude, lng: longitude, precision: accuracy, fecha: pos.timestamp || Date.now() };
      pendingLoc = lastPos;
      $('locData').hidden = false;
      $('lat').textContent = fmtCoord(latitude);
      $('lng').textContent = fmtCoord(longitude);
      $('acc').textContent = '± ' + Math.round(accuracy) + ' m';
      $('ts').textContent = fmtDate(lastPos.fecha);
      $('btnSaveLoc').disabled = false;
      setStatus(st, 'Ubicación obtenida correctamente.', 'ok');
      showOnMap(latitude, longitude, accuracy);
      refreshPermissions();
    },
    (err) => {
      $('btnLocate').disabled = false;
      setStatus(st, GEO_ERR[err.code] || 'Error de geolocalización: ' + err.message, 'error');
      refreshPermissions();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

async function saveLocation() {
  if (!pendingLoc) return;
  try {
    await dbAdd('ubicaciones', { ...pendingLoc, nota: $('locNote').value.trim().slice(0, 120) });
    $('locNote').value = '';
    $('btnSaveLoc').disabled = true;
    pendingLoc = null;
    toast('Ubicación guardada en este dispositivo.');
    renderList();
  } catch (e) {
    toast('No se pudo guardar: ' + e.message);
  }
}

/* ---------- Cámara ---------- */
let stream = null;
let facing = 'environment';
let capturedBlob = null;

const CAM_ERR = {
  NotAllowedError: 'Permiso de cámara denegado. Actívalo desde el candado de la barra de direcciones y recarga. Mientras tanto puedes usar "Tomar foto (alternativa)".',
  SecurityError: 'Permiso de cámara denegado por la política del navegador o del sitio.',
  NotFoundError: 'No se encontró ninguna cámara en este dispositivo.',
  NotReadableError: 'La cámara está siendo usada por otra aplicación.',
  OverconstrainedError: 'La cámara solicitada no está disponible. Prueba con "Cambiar cámara".',
  AbortError: 'La cámara no pudo iniciarse. Inténtalo de nuevo.'
};

async function startCamera() {
  const st = $('camStatus');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) {
    setStatus(st, 'Cámara no disponible (se requiere HTTPS y un navegador compatible). Usa la opción alternativa.', 'error');
    $('fileFallback').hidden = false;
    return;
  }
  stopCamera(false);
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });
    const v = $('video');
    v.srcObject = stream;
    v.hidden = false;
    $('preview').hidden = true;
    ['btnCapture', 'btnCamStop', 'btnCamFlip'].forEach((id) => ($(id).disabled = false));
    setStatus(st, 'Cámara activa.', 'ok');
    refreshPermissions();
  } catch (err) {
    setStatus(st, CAM_ERR[err.name] || 'Error de cámara: ' + err.message, 'error');
    $('fileFallback').hidden = false; // alternativa cuando se deniega
    refreshPermissions();
  }
}

function stopCamera(updateUI = true) {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  $('video').srcObject = null;
  if (updateUI) {
    ['btnCapture', 'btnCamStop', 'btnCamFlip'].forEach((id) => ($(id).disabled = true));
    setStatus($('camStatus'), 'La cámara está apagada.');
  }
}

function flipCamera() {
  facing = facing === 'environment' ? 'user' : 'environment';
  startCamera();
}

function setPreview(blob) {
  capturedBlob = blob;
  const img = $('preview');
  if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
  const url = URL.createObjectURL(blob);
  img.dataset.url = url;
  img.src = url;
  img.hidden = false;
  $('video').hidden = true;
  $('btnSavePhoto').disabled = false;
}

function capture() {
  const v = $('video');
  if (!v.videoWidth) return toast('La cámara aún no está lista.');
  const c = $('canvas');
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  c.toBlob((b) => {
    if (!b) return toast('No se pudo capturar la imagen.');
    setPreview(b);
    setStatus($('camStatus'), 'Foto capturada. Guárdala o vuelve a abrir la cámara para repetir.', 'ok');
    stopCamera(false);
    ['btnCapture', 'btnCamFlip'].forEach((id) => ($(id).disabled = true));
    $('btnCamStop').disabled = true;
  }, 'image/jpeg', 0.85);
}

async function savePhoto() {
  if (!capturedBlob) return;
  const loc = $('chkAttachLoc').checked && lastPos ? { lat: lastPos.lat, lng: lastPos.lng, precision: lastPos.precision } : null;
  try {
    await dbAdd('fotos', {
      blob: capturedBlob,
      tipo: capturedBlob.type || 'image/jpeg',
      nota: $('photoNote').value.trim().slice(0, 120),
      ubicacion: loc,
      fecha: Date.now()
    });
    capturedBlob = null;
    $('photoNote').value = '';
    $('btnSavePhoto').disabled = true;
    $('preview').hidden = true;
    setStatus($('camStatus'), 'Fotografía guardada en este dispositivo.', 'ok');
    toast('Fotografía guardada.');
    renderList();
  } catch (e) {
    toast('No se pudo guardar la foto: ' + e.message);
  }
}

/* ---------- Registros ---------- */
let objectUrls = [];

async function renderList() {
  const list = $('list');
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
  objectUrls = [];
  list.replaceChildren();

  let items = [];
  try {
    const [locs, fotos] = await Promise.all([dbAll('ubicaciones'), dbAll('fotos')]);
    items = [
      ...locs.map((x) => ({ ...x, kind: 'loc' })),
      ...fotos.map((x) => ({ ...x, kind: 'photo' }))
    ].sort((a, b) => b.fecha - a.fecha);
  } catch (e) {
    setStatus($('emptyMsg'), 'No se pudo leer IndexedDB: ' + e.message, 'error');
    $('emptyMsg').hidden = false;
    return;
  }

  const f = $('filter').value;
  if (f !== 'all') items = items.filter((i) => i.kind === f);
  $('emptyMsg').hidden = items.length > 0;
  $('emptyMsg').className = 'status';
  $('emptyMsg').textContent = 'Todavía no hay registros.';

  for (const it of items) {
    const li = document.createElement('li');
    li.className = 'item';

    let thumb;
    if (it.kind === 'photo') {
      thumb = document.createElement('img');
      const url = URL.createObjectURL(it.blob);
      objectUrls.push(url);
      thumb.src = url;
      thumb.alt = it.nota ? 'Foto: ' + it.nota : 'Fotografía guardada';
    } else {
      thumb = document.createElement('div');
      thumb.textContent = '📍';
    }
    thumb.className = 'thumb';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('strong');
    title.textContent = it.kind === 'photo' ? 'Fotografía' : 'Ubicación';
    const l1 = document.createElement('div');
    l1.textContent = fmtDate(it.fecha);
    meta.append(title, l1);
    const coords = it.kind === 'photo' ? it.ubicacion : it;
    if (coords) {
      const l2 = document.createElement('div');
      l2.textContent = `${fmtCoord(coords.lat)}, ${fmtCoord(coords.lng)} (± ${Math.round(coords.precision)} m)`;
      meta.append(l2);
    }
    if (it.nota) {
      const l3 = document.createElement('div');
      l3.textContent = '“' + it.nota + '”'; // textContent evita inyección de HTML
      meta.append(l3);
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    if (coords) {
      const b = document.createElement('button');
      b.className = 'btn small';
      b.textContent = 'Ver en mapa';
      b.onclick = () => {
        showOnMap(coords.lat, coords.lng, coords.precision, it.nota || title.textContent);
        $('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      actions.append(b);
    }
    const d = document.createElement('button');
    d.className = 'btn small danger';
    d.textContent = 'Eliminar';
    d.onclick = async () => {
      if (!confirm('¿Eliminar este registro?')) return;
      await dbDel(it.kind === 'photo' ? 'fotos' : 'ubicaciones', it.id);
      renderList();
    };
    actions.append(d);

    li.append(thumb, meta, actions);
    list.append(li);
  }
}

async function exportJSON() {
  const [locs, fotos] = await Promise.all([dbAll('ubicaciones'), dbAll('fotos')]);
  const data = {
    exportado: new Date().toISOString(),
    ubicaciones: locs,
    fotos: fotos.map(({ blob, ...rest }) => ({ ...rest, tamanoBytes: blob.size })) // sin binarios
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mis-registros.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function wipeAll(silent = false) {
  if (!silent && !confirm('Se borrarán TODAS las ubicaciones y fotografías de este dispositivo. ¿Continuar?')) return;
  await Promise.all([dbClear('ubicaciones'), dbClear('fotos')]);
  lastPos = null;
  pendingLoc = null;
  if (!silent) { toast('Todos los datos fueron borrados.'); renderList(); }
}

/* ---------- Red e instalación PWA ---------- */
function updateNet() {
  const el = $('netStatus');
  el.textContent = navigator.onLine ? 'En línea' : 'Sin conexión';
  el.classList.toggle('off', !navigator.onLine);
}
window.addEventListener('online', updateNet);
window.addEventListener('offline', updateNet);

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('btnInstall').hidden = false;
});
$('btnInstall').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('btnInstall').hidden = true;
});

/* ---------- Inicio ---------- */
let initialized = false;
function initApp() {
  if (initialized) return;
  initialized = true;
  initMap();
  refreshPermissions();
  renderList();

  $('btnLocate').addEventListener('click', locate);
  $('btnSaveLoc').addEventListener('click', saveLocation);
  $('btnCamStart').addEventListener('click', startCamera);
  $('btnCamFlip').addEventListener('click', flipCamera);
  $('btnCapture').addEventListener('click', capture);
  $('btnCamStop').addEventListener('click', () => stopCamera());
  $('btnSavePhoto').addEventListener('click', savePhoto);
  $('fileInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setPreview(file);
      setStatus($('camStatus'), 'Foto seleccionada. Guárdala cuando quieras.', 'ok');
    }
    e.target.value = '';
  });
  $('filter').addEventListener('change', renderList);
  $('btnExport').addEventListener('click', exportJSON);
  $('btnWipe').addEventListener('click', () => wipeAll());

  // Privacidad: apagar la cámara si la pestaña se oculta o se cierra
  document.addEventListener('visibilitychange', () => { if (document.hidden && stream) stopCamera(); });
  window.addEventListener('pagehide', () => stopCamera(false));
}

updateNet();
applyConsent();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
