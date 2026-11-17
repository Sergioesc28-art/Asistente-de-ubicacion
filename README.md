# Mi Asistente de Ubicación (PWA)

Práctica 3 – Integración de APIs del dispositivo.

## Tecnologías
- **Geolocation API** (`navigator.geolocation`) con consentimiento explícito.
- **Leaflet + OpenStreetMap** para el mapa interactivo.
- **MediaDevices API** (`getUserMedia`) para la cámara, con alternativa `<input capture>`.
- **IndexedDB** (almacenes `ubicaciones` y `fotos`; las fotos se guardan como Blob).
- **Permissions API** para mostrar el estado de los permisos.
- **PWA**: `manifest.webmanifest` + `sw.js` (funciona sin conexión).

## Controles de privacidad y permisos
- Aviso de privacidad y consentimiento antes de usar la app; se puede retirar.
- Ubicación y cámara solo se piden al pulsar el botón (nunca automáticamente).
- Mensajes específicos para permiso denegado, cámara ocupada, sin cámara, tiempo agotado, etc.
- Alternativa de captura de foto si la cámara es denegada.
- La cámara se apaga al ocultar la pestaña o cerrar la página.
- Los datos se guardan solo en el dispositivo; se pueden exportar, eliminar uno por uno o borrar todo.
- Texto de usuario mostrado con `textContent` (sin riesgo de inyección HTML).
- No se usa geocodificación inversa de terceros para no enviar coordenadas a otros servidores.

## Estructura
```
index.html  styles.css  app.js  sw.js  manifest.webmanifest
icon.svg  icon-192.png  icon-512.png  Reporte_de_pruebas.md
```
