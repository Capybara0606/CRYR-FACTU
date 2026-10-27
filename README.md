# KIRU · Facturación

Aplicación sencilla en español para gestionar datos del negocio, clientes, servicios y facturas con estética oscura y verde. Requiere Node.js 20 o superior; no necesita instalar dependencias.

```sh
npm start
```

Servidor en el puerto 3000, configurable con `PORT`. Para validar cálculos: `npm test`.

1. Configura tus datos, moneda (EUR o USD), impuesto y datos bancarios en **Mi negocio**.
2. Guarda tus clientes y servicios.
3. Crea una factura, añade servicios del catálogo o líneas libres, cantidades, descuento e impuesto.
4. Guarda y usa **Imprimir / PDF** para generar el documento. Desactiva las cabeceras y pies del navegador en el diálogo de impresión.
5. Registra manualmente el estado pagado o pendiente.

Las facturas conservan una copia de los datos del cliente y del emisor. Los precios del catálogo usan la moneda configurada del negocio; cambiarla no convierte los importes. Los totales del panel corresponden solo a la moneda actual.

Los datos se guardan en localStorage: son específicos del navegador y del origen (host/puerto). No hay servidor de datos, sincronización, autenticación ni cobros en línea. **Exporta respaldos JSON periódicamente** desde Mi negocio o la barra lateral; restaurar reemplaza los datos actuales. No guardes datos sensibles en equipos compartidos. No es un sistema de comprobantes fiscales electrónicos certificados: revisa los requisitos fiscales aplicables antes de usarlo como documento tributario.

La aplicación funciona sin fuentes externas; Google Fonts mejora la tipografía si está disponible. No se deben incluir datos reales de clientes ni respaldos en el repositorio.
