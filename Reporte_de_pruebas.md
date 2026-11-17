# Reporte de pruebas – Práctica 3
**Aplicación:** Mi Asistente de Ubicación (PWA)
**Alumno:** ______________________  **Grupo:** ________  **Fecha:** ____/____/______
**URL probada:** https://______________________

## 1. Dispositivos utilizados

| | Dispositivo 1 | Dispositivo 2 |
|---|---|---|
| Tipo (teléfono / tableta / PC) | | |
| Marca y modelo | | |
| Sistema operativo y versión | | |
| Navegador y versión | | |
| Tamaño de pantalla | | |

## 2. Casos de prueba

Marca ✅ (pasa), ❌ (falla) o N/A, y agrega evidencia (captura de pantalla).

| # | Caso de prueba | Resultado esperado | Disp. 1 | Disp. 2 | Evidencia / Observaciones |
|---|---|---|---|---|---|
| 1 | Aviso de privacidad | No se puede usar la app sin aceptar | | | |
| 2 | Obtener ubicación (permiso concedido) | Se muestran lat, lng, precisión y marcador en el mapa | | | |
| 3 | Ubicación con permiso denegado | Mensaje claro con instrucciones; la app no se rompe | | | |
| 4 | Guardar ubicación | Aparece en "Mis registros" | | | |
| 5 | Mapa interactivo | Zoom, arrastre y popup funcionan | | | |
| 6 | Abrir cámara (permiso concedido) | Se ve la vista en vivo | | | |
| 7 | Cámara con permiso denegado | Mensaje claro y aparece la opción alternativa | | | |
| 8 | Cambiar cámara (frontal/trasera) | Cambia de cámara (si el equipo tiene dos) | | | |
| 9 | Capturar y guardar fotografía | Se guarda con fecha y ubicación adjunta | | | |
| 10 | Persistencia | Tras cerrar y reabrir, los registros siguen ahí | | | |
| 11 | Ver registro en el mapa | El botón centra el mapa en las coordenadas | | | |
| 12 | Eliminar un registro | Desaparece de la lista | | | |
| 13 | Exportar JSON | Se descarga el archivo sin binarios de fotos | | | |
| 14 | Borrar todo | Se eliminan ubicaciones y fotos | | | |
| 15 | Cámara se apaga al cambiar de pestaña | El indicador de cámara se apaga | | | |
| 16 | Diseño adaptable | Se ve bien en vertical, horizontal y escritorio | | | |
| 17 | Instalación como PWA | Se puede instalar / agregar a pantalla de inicio | | | |
| 18 | Modo sin conexión | Abre la app; registros visibles; mapa sin mosaicos nuevos | | | |

## 3. Evidencias adjuntas
- [ ] Captura del permiso de ubicación solicitado
- [ ] Captura de la ubicación en el mapa
- [ ] Captura del permiso de cámara solicitado
- [ ] Captura de la fotografía capturada y guardada
- [ ] Captura de la lista de registros (IndexedDB en DevTools → Application)
- [ ] Captura del mensaje con permiso denegado
- [ ] Captura de la app en ambos dispositivos

## 4. Problemas encontrados y soluciones
| Problema | Dispositivo | Solución / Estado |
|---|---|---|
| | | |

## 5. Conclusiones
(Escribe aquí 3–5 líneas sobre lo aprendido, diferencias entre dispositivos/navegadores y mejoras posibles.)
