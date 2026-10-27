# Activar facturación en Firebase

La aplicación ya apunta al proyecto `cybr-view`. La configuración web es pública; las reglas son las que protegen los datos. La aplicación no usa localStorage, IndexedDB, caché offline ni persistencia de sesión para guardar registros. Los formularios abiertos existen temporalmente en memoria y se pierden al cerrar la página si no fueron guardados en Firebase.

## Alternativa: configurar desde Google Cloud Shell

Si el entorno de Codex no permite aplicar el secreto, no lo pongas en GitHub. Abre Cloud Shell con la cuenta administradora de `cybr-view` y ejecuta:

```sh
curl -fsSL https://raw.githubusercontent.com/Capybara0606/CRYR-FACTU/main/setup_firebase.py -o /tmp/kiru-setup-firebase.py
python3 /tmp/kiru-setup-firebase.py
```

Puedes revisar [el script](setup_firebase.py) antes de ejecutarlo. Obtiene un token de la sesión actual de gcloud sin imprimirlo ni guardarlo. Las solicitudes autenticadas indican `cybr-view` como proyecto de cuota mediante `X-Goog-User-Project`; la cuenta necesita permiso para usar la cuota de ese proyecto. Lee y respalda solo las reglas existentes en Cloud Shell, añade las reglas de facturación sin cambiar `cybrview`, autoriza el dominio y verifica el bloqueo de lecturas anónimas. Rechaza reglas generales que pudieran exponer facturación. No lee registros de clientes ni facturas.

Si Google ya tiene un cliente OAuth configurado, intenta activar su proveedor. Si no existe o faltan permisos, indica el paso pendiente en la consola; no inventa credenciales OAuth. Revisa los mensajes `OK`, `PENDIENTE` y `NO COMPLETADO`. Es posible que se completen algunos pasos y otro requiera intervención; puedes volver a ejecutar el script para continuar. La copia de reglas no contiene datos del negocio ni el token.

Pruebas del script: `python3 -m unittest setup_firebase_test.py`.

## 1. Acceso

Abre https://console.firebase.google.com/project/cybr-view/authentication/providers

- En Authentication → Sign-in method, activa **Google**, selecciona el correo de soporte y guarda. No hace falta crear contraseñas ni compartir credenciales con nadie.
- En Authentication → Settings → Authorized domains, añade `capybara0606.github.io` (sin https ni ruta) si aún no aparece.
- La aplicación también admite el correo y contraseña existentes de CYBR VIEW. Si ese usuario se creó con contraseña, usa primero esa opción y conecta siempre la misma cuenta. Diferentes UID tienen datos separados.

## 2. Reglas privadas para facturación

Abre https://console.firebase.google.com/project/cybr-view/database/cybr-view-default-rtdb/rules

Añade la propiedad `kiruBilling` que aparece abajo **dentro del objeto `rules`, al mismo nivel que `cybrview`**. Conserva todas las reglas existentes de CYBR VIEW. El contenido completo también está en `firebase/billing.rules.json` en el repositorio.

```json
"kiruBilling": {
  "v1": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid && newData.exists()",
        ".validate": "newData.hasChildren(['schema', 'revision', 'updatedAt', 'payload']) && newData.child('schema').val() === 1 && newData.child('revision').isNumber() && newData.child('revision').val() === (data.exists() ? data.child('revision').val() + 1 : 1) && newData.child('updatedAt').isString() && newData.child('payload').isString() && newData.child('payload').val().length <= 10000000",
        "schema": { ".validate": "newData.val() === 1" },
        "revision": { ".validate": "newData.isNumber()" },
        "updatedAt": { ".validate": "newData.isString()" },
        "payload": { ".validate": "newData.isString()" },
        "history": {
          "$entry": {
            ".validate": "($entry === '0' || $entry === '1' || $entry === '2' || $entry === '3' || $entry === '4' || $entry === '5' || $entry === '6' || $entry === '7' || $entry === '8' || $entry === '9' || $entry === '10' || $entry === '11' || $entry === '12' || $entry === '13' || $entry === '14' || $entry === '15' || $entry === '16' || $entry === '17' || $entry === '18' || $entry === '19') && (newData.hasChildren(['at', 'payload']) && newData.child('at').isString() && newData.child('payload').isString())"
          }
        },
        "$other": { ".validate": false }
      }
    }
  }
}
```

El historial admite únicamente las claves `0` a `19`, correspondientes al arreglo de las últimas 20 versiones. Esta validación evita usar `numChildren()`, que no está disponible en las reglas de Realtime Database.

Pulsa **Publish** en el editor de reglas. No establezcas `.read: true` ni `.write: true` en la raíz o en la ruta de facturación: una regla pública en un padre anula la protección de los hijos. Si existen permisos generales en la raíz, deben revisarse antes de guardar información real.

## 3. Comprobar

1. Abre https://capybara0606.github.io/CRYR-FACTU/ e inicia sesión.
2. Guarda un cliente de prueba. Solo debe aparecer confirmación después de la respuesta del servidor.
3. Abre la aplicación en una ventana privada u otro equipo, inicia sesión con la misma cuenta y comprueba que aparece el cliente. No necesitas copiar archivos.
4. Desconecta internet: la aplicación bloquea la edición y no confirma guardados.
5. En Mi negocio → Versiones anteriores, comprueba que se conservan versiones después de varios guardados.

Los cambios de otro equipo se recargan cada 20 segundos mientras estás en los listados y no editas formularios. También puedes usar Recargar desde la nube. Si dos equipos guardan desde la misma versión, uno recibe un aviso de conflicto y no sobrescribe al otro. No se fusionan automáticamente ediciones simultáneas.

## Historial y respaldos

Se retienen las últimas **20 versiones anteriores**, dentro de la misma base Firebase, y se restauran desde Mi negocio. No son copias independientes ni respaldos diarios: si se elimina el proyecto o la base desde la consola también se pierde el historial. Para cubrir ese riesgo se debe activar un sistema de respaldos del proyecto (los respaldos programados administrados de RTDB requieren Blaze y configuración adicional). No se ha configurado Drive ni una tarea de respaldo independiente.

## Límites y estado de activación

El código puede probarse con `npm test`. Las pruebas automatizadas usan un servidor simulado para guardado, conflictos y errores; no sustituyen la validación de las reglas publicadas con la cuenta real. La publicación de reglas y la activación de Google requieren acceso de administración a Firebase, que no se incluye en el acceso Git del entorno.

No se guardan contraseñas ni tokens en archivos del proyecto. Cada recarga requiere iniciar sesión porque la autenticación solo vive en memoria. Las respuestas de datos se solicitan con `cache: no-store`; no hay service worker ni almacenamiento persistente de registros. Las opciones voluntarias Imprimir/PDF pueden crear un archivo si el usuario lo solicita.
