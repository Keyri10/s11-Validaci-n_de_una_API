# S11 - Validación de una API con Postman y OpenAPI

## Descripción

Esta actividad reutiliza la aplicación de pedidos de cafetería de la Semana 10. La pantalla, la API de Express, SQLite y las pruebas Cypress se mantienen. Sobre esa misma API se agregó lo necesario para validarla con Postman y documentarla con OpenAPI 3.1.

## Requisitos

Versiones usadas en este proyecto:

- Node.js 22.17.1
- npm 10.9.2
- Express 5.2.1
- better-sqlite3 13.0.3
- Cypress 16.1.0
- Postman 11.63.6
- Newman 6.2.2, para ejecutar la colección desde la terminal

## Instalación

En la carpeta del proyecto:

```bash
npm install
```

En esta computadora `npm ci` no compiló `better-sqlite3` porque no está instalado Visual Studio con las herramientas de C++. Se reutilizó `node_modules` del proyecto de la S10, donde esa dependencia ya estaba compilada. Si `npm install` termina sin error, no hace falta copiar nada.

## Preparación de datos

Con la API detenida, o también con ella encendida:

```bash
npm run db:reset
```

Con la API encendida también se puede llamar:

```bash
curl -X POST http://localhost:3000/api/test/reset
```

Eso borra los pedidos y deja otra vez los cuatro productos con su stock inicial. Cada caso de la colección llama este reinicio al empezar, así que no dependen de una ejecución anterior.

## Inicio de la API

```bash
npm start
```

Queda en http://localhost:3000

## OpenAPI

El contrato está en:

`docs/openapi.yaml`

## Postman

Colección:

`postman/S11-API-Postman.postman_collection.json`

Ambiente:

`postman/S11-local.postman_environment.json`

El ambiente trae la URL local y tokens ficticios de laboratorio. No hay contraseñas ni secretos reales.

- Usuario autorizado: `ana-laboratorio`, token `lab-token-autorizado`
- Usuario sin permiso para crear pedidos y sin acceso a pedidos ajenos: `luis-laboratorio`, token `lab-token-sin-permiso`
- Token inválido de prueba: `lab-token-invalido`

## Ejecución

1. En Postman, elige Import y selecciona `postman/S11-API-Postman.postman_collection.json`.
2. Importa también `postman/S11-local.postman_environment.json`.
3. Arriba a la derecha selecciona el ambiente `S11 local`.
4. En una terminal, dentro del proyecto, ejecuta `npm start`.
5. Los datos se preparan solos: cada caso llama `POST /api/test/reset`. Si quieres dejar la base limpia antes, ejecuta `npm run db:reset`.
6. Abre la colección, pulsa Run y ejecuta las carpetas con Collection Runner.
7. Deben correr 12 requests con los IDs S11-01 a S11-12. Revisa que no quede ninguno en rojo.

La misma colección se ejecutó desde la terminal con Newman 6.2.2:

```bash
npx newman run postman/S11-API-Postman.postman_collection.json -e postman/S11-local.postman_environment.json
```

Ese comando sí se corrió contra la API local. El Collection Runner de la ventana de Postman usa los mismos archivos, pero las capturas de esa ventana hay que tomarlas a mano.

## Resultado esperado

Deben ejecutarse 12 casos, del S11-01 al S11-12, y todos deben pasar.

En la corrida con Newman 6.2.2, después de corregir el defecto de `quantity`, el resumen fue:

- iterations: 1, failed 0
- requests: 44, failed 0
- test-scripts: 12, failed 0
- assertions: 29, failed 0

Los 44 requests incluyen el reinicio, las consultas de comprobación y las llamadas repetidas de la operación idempotente. Los casos de la matriz siguen siendo 12.

## Incompatibilidad controlada

La evidencia del fallo y de la corrección está en `docs/incompatibilidad-controlada.md`.

OpenAPI pide `quantity` como entero. Durante la prueba se hizo que la API devolviera `"1"` en texto. Falló solo S11-12, con el mensaje `quantity: expected '1' to be a number`. Después se regresó el campo a número y la colección volvió a pasar.

## Estructura del proyecto

```text
public/          pantalla de la S10
server/          API Express y SQLite
cypress/         pruebas E2E de la S10
docs/            OpenAPI, matriz y diagramas
postman/         colección y ambiente
data/            cafeteria.db, se crea al arrancar
```

## Pruebas de la Semana 10

Cypress sigue en el proyecto. Con la API encendida:

```bash
npm run test:e2e
```

## Uso de IA

Se utilizó ChatGPT y Cursor como apoyo para proponer casos, revisar scripts, documentación y estructura. Las pruebas y los resultados se ejecutaron y se verificaron personalmente.
