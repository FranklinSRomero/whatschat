# Chat estilo WhatsApp Desktop con NestJS + Meta Cloud API

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-0f6b5b?logo=github)](https://franklinsromero.github.io/whatschat/)

WhatsChat es un MVP local que combina una interfaz SPA estilo WhatsApp Desktop con una API en NestJS, persistencia con Prisma e integración con Meta WhatsApp Cloud API.

> **Límite del MVP:** es un demo de desarrollo, no un cliente de WhatsApp listo para producción. Todavía no implementa autenticación ni validación de firma de webhooks de Meta.

> **Demo en vivo:** [abrí la interfaz standalone](https://franklinsromero.github.io/whatschat/). Usa datos mock en el navegador; la aplicación completa requiere el backend de NestJS, Prisma y la configuración de Meta Cloud API.

## Interfaz

![Interfaz de WhatsChat](screenshot-chat.png)

## Inicio rápido

1. Creá la configuración local y completá tus valores de Meta:

   ```bash
   cp .env.example .env
   ```

2. Instalá las dependencias y sincronizá el esquema local de SQLite:

   ```bash
   npm ci
   npx prisma db push
   ```

3. Levantá el servidor de desarrollo y abrí [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run start:dev
   ```

<details>
<summary><strong>Ejecutar el build compilado</strong></summary>

```bash
npm run build
npm start
```

</details>

## Funcionalidades

- [x] Lista de conversaciones e historial de mensajes
- [x] Crear o abrir un chat desde un número de WhatsApp
- [x] Enviar mensajes de texto salientes por Meta Cloud API
- [x] Recibir mensajes entrantes y actualizaciones de estado por webhooks
- [x] Persistir contactos, conversaciones y mensajes en SQLite local
- [x] Actualizar la SPA mediante polling a la API local
- [x] Consultar el estado del servicio en `GET /api/health`

## Stack tecnológico

| Capa | Elección |
| --- | --- |
| Backend | NestJS 10 + TypeScript |
| Datos | Prisma ORM + SQLite |
| Integración WhatsApp | Meta WhatsApp Cloud API mediante Axios |
| Frontend | SPA estática de HTML/CSS/JavaScript servida por NestJS |
| Validación | Esquema de configuración Joi y `ValidationPipe` de Nest |

## Arquitectura

| Área | Responsabilidad |
| --- | --- |
| `src/chat/` | API de conversaciones, ciclo de vida de mensajes y coordinación de persistencia |
| `src/whatsapp/` | Llamadas salientes a Meta Graph API usando configuración de entorno |
| `src/webhook/` | Verificación del challenge de Meta y procesamiento de mensajes/estados entrantes |
| `src/prisma/` | Ciclo de vida compartido del cliente Prisma |
| `public/` | SPA del navegador servida desde la raíz de la aplicación |

### Resumen del esquema Prisma

| Modelo | Propósito | Relaciones clave |
| --- | --- | --- |
| `Contact` | Identidad de WhatsApp (`waId`) y nombre opcional | Una `Conversation` opcional; muchos `Message` |
| `Conversation` | Un chat por contacto | Contiene muchos `Message`; borrado en cascada al eliminar el contacto |
| `Message` | Dirección, contenido, tipo, estado, ID de Meta y fechas | Pertenece a un contacto y una conversación |

`Message` tiene un índice por `(conversationId, createdAt)` para lecturas cronológicas del chat y otro por `contactId` para buscar por contacto.

<details>
<summary><strong>Mapa de API</strong></summary>

| Endpoint | Uso |
| --- | --- |
| `GET /api/health` | Verificar el estado |
| `GET /api/chat/conversations` | Listar conversaciones |
| `POST /api/chat/conversations` | Crear o abrir una conversación |
| `GET /api/chat/conversations/:id/messages` | Leer el historial de mensajes |
| `POST /api/chat/send` | Encolar y enviar un mensaje de texto |
| `GET /webhook` / `POST /webhook` | Verificar y recibir eventos de webhook de Meta |

</details>

## Entorno y límites

- Mantené `.env` local. Contiene `DATABASE_URL`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` y el `WHATSAPP_API_VERSION` opcional.
- El envío de texto libre está limitado por la ventana de atención de 24 horas de WhatsApp; los envíos rechazados se guardan como `FAILED`.
- Antes de producción, agregá autenticación de aplicación y validación del header `X-Hub-Signature-256` de Meta.
- Para probar webhooks de Meta en local, exponé `/webhook` mediante un túnel HTTPS público y usá el mismo token de verificación en Meta y `.env`.
