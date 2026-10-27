# KIRU · Facturación en la nube

Aplicación en español para datos del negocio, clientes, servicios y facturas con identidad visual KIRU / CYBR VIEW. Los registros se guardan exclusivamente en Firebase Realtime Database, separados por usuario autenticado. No hay modo local ni guardado offline.

**Activación necesaria:** sigue [CLOUD_SETUP.md](CLOUD_SETUP.md) para habilitar Google, autorizar el dominio y añadir las reglas privadas sin sustituir las de CYBR VIEW.

Requiere Node.js 20+ para desarrollo. No tiene dependencias npm:

```sh
npm start
npm test
```

Servidor en puerto 3000 (configurable con `PORT`). Producción estática en GitHub Pages mediante `.github/workflows/pages.yml`.

- Inicia sesión con Google o con tu cuenta existente de CYBR VIEW. La sesión solo permanece en memoria, hasta cerrar o recargar.
- Configura el negocio, moneda EUR/USD, impuesto e instrucciones de pago.
- Crea clientes, servicios y facturas. Cada guardado espera la confirmación de Firebase.
- Sin conexión se bloquea la edición. No se mantienen colas offline.
- Accede desde otro equipo con la misma cuenta para recuperar los registros. Los listados se actualizan cada 20 segundos; las ediciones simultáneas se protegen con ETag y producen un aviso de conflicto.
- Mi negocio permite restaurar las últimas 20 versiones anteriores guardadas en Firebase. Este historial no es un respaldo independiente. Consulta los límites en la guía de activación.
- Imprimir / PDF permite exportar la factura voluntariamente. No hay almacenamiento automático de registros en tu equipo.

Las facturas conservan una copia del cliente y del emisor. Cambiar la moneda no convierte precios existentes. Los totales del panel corresponden a la moneda actual. No es un sistema de comprobantes fiscales electrónicos certificados.

## Identidad visual

Logo SVG y tokens de [Capybara0606/cybr-view](https://github.com/Capybara0606/cybr-view), revisión `c43a6127fd3580140aedac88d80124f200dbf2db`, en `assets/`.
