# Asamblea Manager Pro

Sistema de gestión de asambleas y control de asistencia, usado por FIADAH (Casa de Dios Adulam). Permite registrar miembros e invitados vía QR o de forma manual, calcular quórum en tiempo real y administrar la matrícula de la organización.

## Funcionalidades

- **Registro de asistencia** — check-in por QR o manual, miembros e invitados, sesión de asamblea activa.
- **Quórum en tiempo real** — 2/3 de los miembros activos con posición de derecho a voto (`positions.quorum_weight = 1`), consistente en Inicio, Asistencia y Registro.
- **Gestión de matrícula** (`/members`, roles admin / sargento de armas / secretaria) — alta, edición, activar/desactivar, importación masiva por CSV con plantilla, filtros por posición e iglesia.
- **Roles de acceso** — `admin`, `assembly_sergeant`, `secretary`, `user`.
- **Reportes** — exportación de asistencia y quórum a PDF (impresión) y CSV, sin backend adicional.
- **Votación** — módulo presente en el código pero desactivado (`VOTING_ENABLED = false`) para v2.0; reactivable en v2.1.

## Tecnologías

- Vite, TypeScript, React
- shadcn-ui, Tailwind CSS
- Supabase (base de datos, autenticación, RLS, Edge Functions)
- Firebase Hosting (despliegue)

## Desarrollo local

Requiere Node.js y npm.

```sh
git clone <URL_DEL_REPO>
cd asamblea-manager-pro
npm install
npm run dev
npm run lint
npm test
```

## Build y despliegue

```sh
npm run build
firebase deploy --only hosting
```

`npm run build` genera la carpeta `dist/` con los archivos de producción.

## Base de datos

Las migraciones viven en `supabase/migrations/`. Aplicar cambios de esquema vía Supabase CLI o MCP (`apply_migration`), manteniendo el historial de migraciones sincronizado con el proyecto remoto.

## Developer

**Wilfredo Caban Velez**
GitHub: [github.com/cabanw](https://github.com/cabanw)
Email: wilfredo.caban@icloud.com · wilie607@gmail.com
