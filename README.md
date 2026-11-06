# Casa Serena · Administración del hotel

Panel React/Vite para administradores, recepcionistas y personal de limpieza/mantenimiento. Usa **la misma API** de `LEO100a0/PROYECTOBD` y el mismo Supabase que la web de clientes. No necesita otro Web Service ni otra base de datos.

## Operaciones disponibles

- Inicio/cierre de sesión con Supabase Auth y verificación del rol en el servidor. No hay registro público de empleados ni cuentas de demostración.
- Resumen de llegadas, salidas, estancias activas, habitaciones por limpiar y cobros del día en horario de Perú.
- Consulta de reservas: huésped, habitación, fechas, fecha de creación, adelanto y saldo, pagos y consumos.
- Check-in desde el día de entrada, normalmente desde las 15:00, con autorización explícita para ingreso anticipado si está lista. Requiere habitación activa, limpia, libre de otra estancia y sin mantenimiento bloqueante en proceso.
- Registro de consumos por estancia activa; preserva precio unitario histórico.
- Registro de pagos recibidos en efectivo/transferencia, validando saldo e idempotencia. El adelanto de la web de clientes continúa siendo simulado. El panel registra operaciones; no ejecuta transferencias bancarias ni cobros de tarjeta.
- Check-out con saldo cero; genera tarea de limpieza y marca habitación por limpiar. La hora de salida recomendada es 12:00; no se fuerza salida automática ni se cobran penalidades automáticas.
- Cancelación sin estancia: libera fechas, conserva pagos e historial; no realiza reembolsos automáticos.
- Limpieza: asignar, iniciar, terminar o cancelar tareas. Personal operativo solo puede actualizar tareas asignadas a su cuenta.
- Mantenimiento preventivo/correctivo: habitación/piso, responsable, descripción, fechas, bloqueo opcional, estado, fechas reales y costo. Al completar un trabajo bloqueante se libera inventario y se solicita limpieza.
- Tarifas de habitación y servicios, activación/desactivación de habitaciones, asignación de roles y activación de empleados (solo administrador).
- Tres reportes con exportación CSV: mantenimientos terminados hasta hoy; cantidades de servicios por año de check-in (por defecto 2026); días de anticipación de cada reserva.

## Matriz de permisos

| Acción | Administrador | Recepcionista | Limpieza/mantenimiento |
|---|---|---|---|
| Reservas, datos del huésped y reportes | Sí | Sí | No |
| Check-in/out, consumos y cobros | Sí | Sí | No |
| Crear/asignar/cancelar tareas y mantenimientos | Sí | Sí | No |
| Iniciar/terminar tarea propia | Sí | Sí | Sí |
| Actualizar tareas ajenas | Sí | Sí | No |
| Cambiar tarifas, roles y personal | Sí | No | No |
| Ver estado de habitaciones | Sí | Sí | Sí |

Los permisos se validan en la API para cada petición; ocultar botones no es la protección. Un cliente autenticado obtiene 403 en el panel. La desactivación de personal se comprueba en cada petición; se impide desactivar al último administrador activo. Acciones administrativas quedan en `hotel.audit_log`.

## 1. Migrar Supabase conservando datos

En el repositorio de la API:

1. Ejecutar **una vez** [`supabase/003_administration.sql`](https://github.com/LEO100a0/PROYECTOBD/blob/main/supabase/003_administration.sql) en SQL Editor de tu proyecto existente. No volver a ejecutar `001_schema.sql` ni `002_seed.sql`, no borrar el esquema `hotel`.
2. La migración es transaccional: crea empleados, limpieza, mantenimiento, auditoría y reportes; amplía roles y agrega columnas, sin eliminar los datos actuales. Si ya se aplicó, rechaza su repetición.
3. Crear o usar la cuenta Auth del primer administrador. Copiar [`004_first_admin.example.sql`](https://github.com/LEO100a0/PROYECTOBD/blob/main/supabase/004_first_admin.example.sql), sustituir correo/nombres/apellidos/documento y ejecutar en SQL Editor. No se necesita contraseña en SQL. Rechaza crear otro primer administrador si ya hay uno activo.
4. Los demás empleados deben existir como cuentas en Auth (desde Authentication → Users, o registro en la web de clientes). Luego vincularlos desde **Equipo y permisos**. No cambies roles desde metadata del navegador.

El proyecto no incluye acceso a tu cuenta de Supabase ni ejecuta migraciones al compilar. La migración debe aplicarse en tu proyecto para habilitar el panel.

## 2. Actualizar el Web Service existente

El código de la API está en `PROYECTOBD`. Con auto deploy de Render se actualizará al publicar cambios en `main`. Conserva `DATABASE_URL`, `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

En `CLIENT_ORIGINS`, conserva la URL de clientes y añade la del nuevo Static Site, separadas por coma y sin `/` final:

```text
https://proyectobd-u8rs.onrender.com,https://TU-ADMIN.onrender.com
```

La URL base de Supabase es `https://TU-PROYECTO.supabase.co`, sin rutas. No compartir DATABASE_URL ni ponerla en el Static Site.

Si el esquema todavía no está migrado, el panel muestra un error de migración pendiente. La API pública de clientes sigue funcionando con el esquema anterior.

## 3. Publicar este Static Site en Render

Conectar `LEO100a0/PROYECTOBDADMIN`, rama `main`:

| Campo | Valor |
|---|---|
| Tipo | Static Site |
| Root Directory | Vacío |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Node | 22 |

Variables del Static Site (las mismas del sitio de clientes):

```text
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=CLAVE_PUBLICA_ANON_O_PUBLISHABLE
VITE_API_URL=https://hotel-api-nfjl.onrender.com
```

También hay `render.yaml` si prefieres New → Blueprint. No usar claves secret/service_role, credenciales PostgreSQL ni contraseñas en variables VITE. Añadir URL de administración a Redirect URLs de Supabase Auth si usas flujos de confirmación/recuperación hacia esta web; el flujo actual es email/password y la recuperación de contraseñas se gestiona aparte, no hay pantalla de restablecimiento en este panel.

Al cambiar variables VITE, reconstruir/desplegar. Al cambiar CLIENT_ORIGINS, redesplegar la API. No cambiar Site URL de clientes para sustituirla por admin: conservar la configuración que ya funciona.

## Desarrollo

```sh
npm ci
cp .env.example .env
# Completar .env con los valores publicos
npm run dev
npm run build
```

Añade `http://localhost:5173` a CLIENT_ORIGINS de la API si lo usas localmente. Sin configuración real se muestra el acceso con instrucciones, no datos ficticios.

## Verificación después de conectar

1. `/health` de API devuelve `{ "ok": true }`.
2. Iniciar sesión con el primer administrador y ver la reserva actual de clientes.
3. Una cuenta normal de cliente no puede entrar al panel.
4. Crear/vincular cuentas de recepción y limpieza; verificar navegación y acciones permitidas.
5. Usar una reserva con entrada hoy: check-in → consumo → cobro de saldo → check-out → asignar limpieza → iniciar/terminar.
6. Programar mantenimiento sin cruce de reservas, iniciarlo y terminarlo; consultar reportes.

## Límites explícitos

- Bloqueos de mantenimiento por fechas completas `[inicio, fin)`, no por horas. Trabajos en proceso bloqueantes impiden vender la habitación hasta terminarlos, incluso si vence el periodo planeado.
- No hay programación recurrente automática: crear cada mantenimiento preventivo. No hay traslado de huéspedes, extensión de estancia, reembolsos automáticos ni contabilidad bancaria en esta versión.
- El primer alta marca habitaciones existentes como listas; revisa su estado físico al arrancar la operación. Las nuevas tareas permiten marcar pendientes y limpieza.
- No se borran pagos, consumos o reservas desde el panel. Correcciones contables y reembolsos necesitan un flujo específico posterior.
- Listado de reservas/tareas: 300 recientes. Reportes de mantenimiento y anticipación: 1.000 recientes. Exportación CSV corresponde al resultado mostrado.
- Registro de clientes sin nacionalidad; roles del personal independientes del cargo laboral. Datos/branding de Casa Serena y tarifas siguen siendo ejemplos hasta personalizarlos.
