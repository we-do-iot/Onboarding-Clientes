# WeDo IoT — Alta de clientes

Formulario web para el onboarding de nuevos clientes de WeDo IoT. Permite registrar los datos del cliente, la configuración de red del gateway y la suscripción elegida. Al enviarlo, los datos llegan por email al equipo de WeDo vía Web3Forms.

## Qué recopila el formulario

- **Datos del cliente**: empresa, nombre, apellido, email, teléfono, provincia y ciudad.
- **Configuración del gateway**: tipo de conexión (ETH DHCP, ETH IP fija o WiFi) con los campos correspondientes según la selección.
- **Suscripción**: plan y período de facturación (anual o mensual).

## Cómo funciona

El formulario es una página estática (`index.html`) sin backend. Al hacer submit, los datos se envían a la API de [Web3Forms](https://web3forms.com), que los reenvía por email al equipo. No requiere servidor ni base de datos.

## Deploy

El sitio está publicado en GitHub Pages:

**[https://guilleferru.github.io/Onboarding/](https://guilleferru.github.io/Onboarding/)**

Para republicar, simplemente pusheá cambios a la rama `master`.

## Licencias disponibles

| Plan | Dispositivos | Código anual | Código mensual |
|------|-------------|--------------|----------------|
| WeDo Inicial | 10 | LIC10 | LIC101 |
| WeDo Avanzado | 20 | LIC20 | LIC201 |
| WeDo Pro | 30 | LIC30 | LIC301 |
| WeDo Corpo50 | 50 | LIC50 | LIC501 |
| WeDo Corpo100 | 100 | LIC100 | LIC1001 |

Para agregar o modificar planes, editá el objeto `LICENSE_CATALOG` en `index.html`.
