# WeDo IoT — Alta de clientes

Formulario web para el onboarding de nuevos clientes de WeDo IoT. Permite registrar los datos del cliente y la configuración de red del gateway. Al enviarlo, los datos llegan por email al equipo de WeDo vía Web3Forms.

## Qué recopila el formulario

- **Datos del cliente**: empresa, nombre, apellido, email, teléfono (opcional), provincia y ciudad.
- **Configuración del gateway**: tipo de conexión (ETH DHCP, ETH IP fija o WiFi) con los campos correspondientes según la selección.

## Cómo funciona

El formulario es una página estática sin backend. Al hacer submit, los datos se envían a la API de [Web3Forms](https://web3forms.com), que los reenvía por email al equipo. No requiere servidor ni base de datos.

## Estructura

```
index.html   — markup
style.css    — estilos
app.js       — lógica y sanitización de inputs
tests/       — tests unitarios (Vitest)
```

Para correr los tests: `npm install && npm test`

## Deploy

El sitio está publicado en GitHub Pages en la rama `main`. Para republicar, simplemente pusheá cambios a `main`.
