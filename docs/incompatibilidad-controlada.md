# Incompatibilidad controlada

Se introdujo un defecto a propósito, se ejecutó la colección y después se corrigió. La versión final del código ya no tiene ese defecto.

## 1. Qué decía OpenAPI

En `docs/openapi.yaml`, el campo `quantity` de cada producto del pedido es un entero:

```yaml
quantity:
  type: integer
  minimum: 1
```

## 2. Qué cambio local se hizo en la API

En `server/db.js`, dentro de la función que arma el pedido, la cantidad se devolvió como texto:

```javascript
quantity: String(item.quantity),
```

Un café con cantidad 1 salía así: `"quantity": "1"`. El pedido se guardaba bien y el código HTTP seguía en 200. Solo el tipo del campo no coincidía con el contrato.

## 3. Qué prueba debía fallar

`[S11-12] Validar esquemas de éxito y error`.

Esa prueba revisa que `quantity` sea un número entero. No se cambió la prueba para esconder el defecto.

## 4. Qué resultado se obtuvo

Se ejecutó la colección completa con Newman 6.2.2, contra la API en `http://localhost:3000`, el 3 de octubre de 2026.

Resultado de esa corrida:

- 12 scripts de prueba ejecutados
- 29 aserciones
- 1 aserción fallida
- Las otras 11 pruebas pasaron

El fallo fue solo este:

```text
AssertionError  S11-12 el pedido cumple el esquema de éxito
quantity: expected '1' to be a number
inside "05-Esquemas / [S11-12] Validar esquemas de éxito y error"
```

## 5. Cómo se corrigió

Se volvió a dejar la línea original:

```javascript
quantity: item.quantity,
```

Se reinició la API para que tomara el cambio.

## 6. Después de la corrección

Se volvió a ejecutar la misma colección, con el mismo ambiente y sin cambiar las pruebas.

Newman 6.2.2 imprimió:

- test-scripts: 12, failed 0
- assertions: 29, failed 0
- requests: 44, failed 0

S11-12 pasó, incluida la comprobación de que `quantity` es un número.

Para repetirlo en el video:

1. Cambia temporalmente `quantity: item.quantity` por `quantity: String(item.quantity)` en `server/db.js`.
2. Reinicia la API con `npm start`.
3. Ejecuta la colección. Debe fallar S11-12 con `expected '1' to be a number`.
4. Regresa la línea a `quantity: item.quantity` y reinicia otra vez.
5. Ejecuta la colección. Los 12 casos deben pasar.

No dejes el `String(...)` en el archivo al terminar.
