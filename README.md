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

## Vídeos largos e importación histórica

Al crear una factura en EUR, el asistente **Vídeos largos** calcula el precio con los minutos de cada vídeo y el número de vídeos del mismo tramo: 10–12 min → 50 €, 12–15 → 55 €, 15–20 → 60 €, 20–25 → 65 €; continúa sumando 5 € por cada tramo de 5 minutos. En los límites comienza el siguiente tramo (12 min → 55 €, 15 min → 60 €). La tarifa es por vídeo, antes de los impuestos y descuentos de la factura; no convierte USD a EUR. Si los vídeos tienen distintas duraciones, añádelos por separado. Se pueden ajustar las líneas antes de guardar; no se recalculan facturas anteriores.

En **Mi negocio → Importar facturas históricas**, carga un JSON de revisión con formato `kiru-history-review-v1` y `catalogCurrency` (`EUR` o `USD`). La moneda del catálogo debe coincidir con la de Mi negocio; no se convierten tarifas. Puedes cargar el archivo o abrir «¿No puedes descargar el archivo? Pega el contenido» para introducir el JSON directamente. Selecciona las facturas, confirma el pago y el vencimiento, y acepta expresamente las discrepancias indicadas. Antes del guardado verás cuántos clientes, servicios y facturas se añadirán. Las estadísticas se recalculan con las facturas guardadas; el estado de pago determina cobrado y por cobrar. Los datos de Mi negocio se conservan y los emisores históricos quedan dentro de sus facturas.

La importación no reemplaza facturas existentes. Omite números ya registrados con el mismo cliente, moneda y total; un número con datos diferentes bloquea el lote para revisión. Deduplica clientes por identificación fiscal (o nombre si falta) y servicios por nombre y precio. Las facturas excluidas del archivo permanecen pendientes de aclaración. El archivo se lee en memoria y solo se guarda en la ruta privada de Firebase al confirmar; no debe incluirse en GitHub ni en el sitio público. La escritura utiliza las mismas protecciones contra conflictos que el resto de la aplicación.

## Facturas para correo y PDF

Cada factura tiene un campo **Enlace de pago único de esta factura**, vacío en las nuevas facturas e independiente de las instrucciones generales de Mi negocio. Pega una URL HTTPS creada en tu proveedor de pagos para el importe correcto; la aplicación no crea enlaces en ese proveedor ni verifica su importe o vigencia. Al cambiar el importe de la factura, revisa también su enlace. Se guarda junto con la factura en Firebase.

En la vista de una factura guardada:

- **Copiar HTML para correo** copia una versión HTML con estilos inline y una alternativa de texto. Pega en el cuerpo del correo con formato enriquecido, no como texto sin formato ni como código fuente. Si el navegador bloquea el portapapeles, aparece una vista para seleccionar y copiar manualmente. La pantalla, el HTML copiado y el PDF usan la misma plantilla oscura, bordes verdes, tablas y CSS inline. El logo es una imagen pública sin datos del cliente. Algunos clientes de correo bloquean imágenes o cambian colores; pega conservando el formato original. No hay descarga de HTML.
- **Imprimir / PDF** abre el diálogo del navegador: selecciona «Guardar como PDF». Se preservan el fondo oscuro, los bordes verdes y el enlace de pago. Activa «Gráficos de fondo» si tu navegador omite los fondos y desactiva encabezados y pies del navegador. La conservación del enlace en el PDF depende de la herramienta de impresión utilizada.

El botón **Pagar** aparece únicamente con una URL HTTPS válida y mientras la factura esté pendiente. Al marcarla pagada deja de aparecer. Las facturas antiguas sin enlace siguen funcionando; puedes editarlas para añadirlo. Exportar no envía correos ni marca automáticamente una factura como pagada.
