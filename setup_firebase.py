#!/usr/bin/env python3
"""Configura Firebase desde Cloud Shell usando su sesión, sin mostrar ni guardar tokens."""
import datetime
import json
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request

PROJECT = 'cybr-view'
DOMAIN = 'capybara0606.github.io'
DATABASE = 'https://cybr-view-default-rtdb.firebaseio.com'
AUTH = f'https://identitytoolkit.googleapis.com/admin/v2/projects/{PROJECT}'
RULES_FILE = 'https://raw.githubusercontent.com/Capybara0606/CRYR-FACTU/main/firebase/billing.rules.json'


class SetupError(Exception):
    pass


def request(url, token=None, method='GET', data=None):
    headers = {'Accept': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if data is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, headers=headers, method=method,
                                 data=json.dumps(data).encode() if data is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=40) as response:
            return response.read().decode()
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            raise SetupError(f'Acceso rechazado (HTTP {error.code}). Usa Cloud Shell con la cuenta administradora de {PROJECT}. No se muestra el token.') from None
        raise SetupError(f'La API respondió HTTP {error.code} al ejecutar {method}. No se imprimieron credenciales.') from None
    except (urllib.error.URLError, TimeoutError):
        raise SetupError('No se pudo contactar con Google. Comprueba la conexión e inténtalo de nuevo.') from None


def parse_rules(source):
    # Firebase permite comentarios en reglas; respeta las cadenas con expresiones.
    result, pos, in_string, escaped = [], 0, False, False
    while pos < len(source):
        char = source[pos]
        if in_string:
            result.append(char)
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == '"':
                in_string = False
            pos += 1
        elif char == '"':
            in_string = True
            result.append(char)
            pos += 1
        elif source[pos:pos + 2] == '//':
            end = source.find('\n', pos)
            pos = len(source) if end == -1 else end
        elif source[pos:pos + 2] == '/*':
            end = source.find('*/', pos + 2)
            if end == -1:
                raise SetupError('Las reglas actuales contienen un comentario sin cierre. No se modificaron.')
            result.append(' ')
            pos = end + 2
        else:
            result.append(char)
            pos += 1
    try:
        parsed = json.loads(''.join(result))
    except ValueError:
        raise SetupError('No se pudieron interpretar las reglas actuales. No se reemplazaron.') from None
    if not isinstance(parsed, dict) or not isinstance(parsed.get('rules'), dict):
        raise SetupError('Formato de reglas inesperado. No se reemplazaron.')
    return parsed


def merge_rules(existing, addition):
    current = existing['rules']
    # Un permiso concedido en un padre no se puede restringir en sus hijos.
    for permission in ('.read', '.write'):
        if current.get(permission) not in (None, False, 'false'):
            raise SetupError(f'Existe una regla global {permission} que podría dar acceso a facturación. Se requiere revisarla; no se modificó ninguna regla.')
    if set(addition) != {'kiruBilling'}:
        raise SetupError('El archivo de reglas de facturación tiene un formato inesperado.')
    if 'kiruBilling' in current and current['kiruBilling'] != addition['kiruBilling']:
        raise SetupError('Ya existen reglas diferentes para kiruBilling. Se conservaron; requieren revisión antes de reemplazarlas.')
    return {**existing, 'rules': {**current, **addition}}


def main():
    print('KIRU / CONFIGURACIÓN DE FIREBASE')
    print('Se conservarán las reglas de CYBR VIEW. No se leerán clientes ni facturas.')
    result = subprocess.run(['gcloud', 'auth', 'print-access-token'], capture_output=True, text=True)
    if result.returncode or not result.stdout.strip():
        raise SetupError('Cloud Shell no tiene una sesión utilizable. Autoriza gcloud con la cuenta administradora y vuelve a ejecutar.')
    token = result.stdout.strip()
    config = json.loads(request(AUTH + '/config', token))
    rules_url = DATABASE + '/.settings/rules.json'
    rules_source = request(rules_url, token)
    existing = parse_rules(rules_source)
    addition = json.loads(request(RULES_FILE))
    merged = merge_rules(existing, addition)
    domains = config.get('authorizedDomains', [])
    if not isinstance(domains, list):
        raise SetupError('Formato de dominios inesperado; no se realizaron cambios.')

    backup = pathlib.Path.home() / ('kiru-reglas-antes-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.json')
    backup.write_text(rules_source, encoding='utf-8')
    backup.chmod(0o600)
    print('Copia de las reglas anteriores guardada en Cloud Shell: ' + backup.name)

    if merged != existing:
        # Detecta cambios de otro administrador durante la preparación.
        if parse_rules(request(rules_url, token)) != existing:
            raise SetupError('Otro administrador cambió las reglas. No se sobrescribieron; vuelve a ejecutar para leer la versión nueva.')
        request(rules_url, token, 'PUT', merged)
    actual = parse_rules(request(rules_url, token))
    if actual != merged:
        raise SetupError('No se pudo confirmar la configuración completa de reglas. Revisa la consola antes de continuar.')
    print('OK: reglas privadas añadidas y reglas existentes conservadas.')

    if DOMAIN not in domains:
        latest = json.loads(request(AUTH + '/config', token))
        updated_domains = list(dict.fromkeys(latest.get('authorizedDomains', []) + [DOMAIN]))
        request(AUTH + '/config?updateMask=authorizedDomains', token, 'PATCH', {'authorizedDomains': updated_domains})
    verified = json.loads(request(AUTH + '/config', token))
    if DOMAIN not in verified.get('authorizedDomains', []):
        raise SetupError('No se confirmó el dominio autorizado.')
    print('OK: capybara0606.github.io autorizado para iniciar sesión.')

    # Verifica que las reglas rechazan solicitudes anónimas; nunca imprime datos.
    probe = urllib.request.Request(DATABASE + '/kiruBilling/v1/users/kiru-access-probe.json')
    try:
        with urllib.request.urlopen(probe, timeout=30):
            raise SetupError('La comprobación anónima obtuvo acceso. No introduzcas datos; revisa las reglas globales en Firebase.')
    except urllib.error.HTTPError as error:
        if error.code not in (401, 403):
            raise SetupError('Respuesta inesperada al comprobar el bloqueo de acceso anónimo.') from None
    print('OK: lectura anónima rechazada.')

    # No inventa IDs o secretos OAuth si Google aún no fue configurado.
    provider = None
    try:
        provider = json.loads(request(AUTH + '/defaultSupportedIdpConfigs/google.com', token))
    except SetupError:
        pass
    if provider and provider.get('enabled'):
        print('OK: acceso con Google ya activo.')
    elif provider and provider.get('clientId'):
        try:
            request(AUTH + '/defaultSupportedIdpConfigs/google.com?updateMask=enabled', token, 'PATCH', {'enabled': True})
            enabled = json.loads(request(AUTH + '/defaultSupportedIdpConfigs/google.com', token)).get('enabled')
        except SetupError:
            enabled = False
        if enabled:
            print('OK: acceso con Google activado.')
        else:
            print('PENDIENTE: activa Google en la consola indicada abajo.')
    else:
        print('PENDIENTE: Google requiere configurar su proveedor en la consola (correo de soporte / cliente OAuth).')
    print('Proveedor Google: https://console.firebase.google.com/project/cybr-view/authentication/providers')
    print('Abre https://capybara0606.github.io/CRYR-FACTU/ e inicia sesión.')
    print('También puedes usar el correo y contraseña existentes de CYBR VIEW.')
    print('Prueba un guardado y comprueba su lectura en otra ventana con la misma cuenta.')
    print('El historial de versiones está en Firebase; no se ha activado un respaldo independiente del proyecto.')


if __name__ == '__main__':
    try:
        main()
    except SetupError as error:
        print('NO COMPLETADO: ' + str(error), file=sys.stderr)
        sys.exit(1)
    except (OSError, ValueError, KeyError):
        print('NO COMPLETADO: respuesta o configuración inesperada. No compartas tokens ni credenciales al solicitar ayuda.', file=sys.stderr)
        sys.exit(1)
