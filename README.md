# iTuc Cel — Web, Catálogo Administrable & Service Técnico

Sitio web minimalista para **iTuc Cel** (venta de iPhone, accesorios Apple y servicio técnico **iTuc Care** en Tucumán y Salta), con catálogo dinámico y panel administrador listo para **Vercel**.

## Correr en local (con backend completo)

Requiere Node.js 18 o superior (sin dependencias externas):

```bash
npm start
```

- Sitio público: `http://localhost:3000`
- Catálogo por categorías: `http://localhost:3000/catalogo`
- Panel administrador: `http://localhost:3000/admin`
- Contraseña demo por defecto: `ituc2026`

En modo local los cambios del panel administrador se guardan directamente en `data/products.json`.

## Despliegue en Vercel

1. Conectá el repositorio `https://github.com/TomaasVegaa/ituc.git` en [Vercel](https://vercel.com/new) (Framework Preset: **Other**, sin build command necesario).
2. En **Project Settings → Environment Variables** definí:
   - `ADMIN_PASSWORD`: clave privada para entrar a `/admin`.
   - `AUTH_SECRET`: cadena aleatoria larga para firmar cookies de sesión.
3. **(Recomendado para persistencia real en la nube)** Conectá una base **Upstash Redis** desde el Marketplace de Vercel (o agregá `KV_REST_API_URL` y `KV_REST_API_TOKEN`, o `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`). Sin Redis conectado, Vercel funciona igual en modo demo usando los datos iniciales de `data/products.json`.

## Configuración de sucursales

Las direcciones, horarios, mapas y números de WhatsApp de Tucumán y Salta se editan en un único archivo: `assets/js/config.js`.
