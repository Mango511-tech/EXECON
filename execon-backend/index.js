require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const ExcelJS = require('exceljs');

const pool = require('./db/pool');

const authRoutes = require('./routes/auth.routes');
const turnosRoutes = require('./routes/turnos.routes');
const incidentesRoutes = require('./routes/incidentes.routes');

const app = express();
const port = Number(process.env.PORT) || 3000;

const ROLES_PERMITIDOS = [
  'admin',
  'supervisor',
  'distribuidor',
  'ISM/MESA',
];

/* =========================================================
   MIDDLEWARE
   ========================================================= */

app.use(
  cors({
    origin: 'http://localhost:5173',
  }),
);

app.use(express.json());

/* =========================================================
   RUTAS MODULARES
   ========================================================= */

app.use('/api/auth', authRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/incidentes', incidentesRoutes);

/* =========================================================
   FUNCIONES AUXILIARES
   ========================================================= */

function normalizarRol(rol) {
  const valor = String(rol || '').trim().toLowerCase();

  const equivalencias = {
    admin: 'admin',
    supervisor: 'supervisor',
    supervisor_administrador: 'supervisor',
    distribuidor: 'distribuidor',
    distribuidor_onsite: 'distribuidor',
    ingeniero: 'ISM/MESA',
    ism_mesa: 'ISM/MESA',
    'ism/mesa': 'ISM/MESA',
  };

  return equivalencias[valor] || valor;
}

function normalizarCorreo(correo) {
  return String(correo || '').trim().toLowerCase();
}

function esRolIngeniero(rol) {
  return normalizarRol(rol) === 'ISM/MESA';
}

function esFechaISOValida(fecha) {
  const fechaTexto = String(fecha || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) return false;
  const fechaConvertida = new Date(`${fechaTexto}T00:00:00`);
  return !Number.isNaN(fechaConvertida.getTime());
}

function validarPeriodo(request, response) {
  const fechaInicio = String(request.query.inicio || '').trim();
  const fechaFin = String(request.query.fin || '').trim();

  if (!esFechaISOValida(fechaInicio) || !esFechaISOValida(fechaFin)) {
    response.status(400).json({
      message: 'Debes enviar un periodo válido usando inicio y fin con formato YYYY-MM-DD.',
    });
    return null;
  }

  if (fechaFin < fechaInicio) {
    response.status(400).json({
      message: 'La fecha final no puede ser anterior a la fecha inicial.',
    });
    return null;
  }

  return { fechaInicio, fechaFin };
}

/* =========================================================
   SALUD DE LA API
   ========================================================= */

app.get('/api/health', async (request, response) => {
  try {
    const result = await pool.query(
      'SELECT CURRENT_DATABASE() AS database, NOW() AS server_time',
    );
    response.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error de conexión con PostgreSQL:', error);
    response.status(500).json({ ok: false, message: 'No fue posible conectar con PostgreSQL.' });
  }
});

/* =========================================================
   CATÁLOGOS
   ========================================================= */

app.get('/api/catalogos/sitios', async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT
        id_sitio AS id,
        id_sitio,
        nombre_sitio AS nombre,
        nombre_sitio,
        plaza_cliente,
        municipio,
        estado,
        zona,
        plaza_cobertura
      FROM vw_dashboard_sitios
      ORDER BY nombre_sitio
    `);
    response.json({ data: result.rows });
  } catch (error) {
    console.error('Error al consultar sitios:', error);
    response.status(500).json({ message: 'No fue posible obtener el catálogo de sitios.' });
  }
});

/* =========================================================
   GESTIÓN DE USUARIOS
   ========================================================= */

app.get('/api/usuarios', async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.nombre_completo AS "nombreCompleto",
        u.correo,
        u.rol,
        u.creado_en AS "creadoEn",
        u.ultimo_acceso AS "ultimoAcceso",
        CASE
          WHEN COALESCE(u.activo, TRUE) = FALSE THEN 'INACTIVO'
          ELSE 'ACTIVO'
        END AS estatus
      FROM usuarios u
      ORDER BY u.nombre_completo ASC
    `);
    response.json({ data: result.rows });
  } catch (error) {
    console.error('Error al consultar usuarios:', error);
    response.status(500).json({ message: 'No fue posible obtener los usuarios.' });
  }
});

app.post('/api/usuarios', async (request, response) => {
  let client;

  try {
    const { nombreCompleto, correo, contrasena, rol } = request.body;
    const nombreLimpio = String(nombreCompleto || '').trim();
    const correoLimpio = normalizarCorreo(correo);
    const rolLimpio = normalizarRol(rol);

    if (!nombreLimpio || !correoLimpio || !contrasena || !rolLimpio) {
      return response.status(400).json({
        message: 'Nombre completo, correo, contraseña y rol son obligatorios.',
      });
    }

    if (!correoLimpio.includes('@')) {
      return response.status(400).json({ message: 'Ingresa un correo electrónico válido.' });
    }

    if (String(contrasena).length < 8) {
      return response.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    if (!ROLES_PERMITIDOS.includes(rolLimpio)) {
      return response.status(400).json({ message: 'El rol seleccionado no es válido.' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const usuarioExistente = await client.query(
      'SELECT id FROM usuarios WHERE LOWER(correo) = $1',
      [correoLimpio],
    );

    if (usuarioExistente.rowCount > 0) {
      await client.query('ROLLBACK');
      return response.status(409).json({ message: 'Ya existe un usuario registrado con ese correo.' });
    }

    const contrasenaHash = await bcrypt.hash(String(contrasena), 10);

    const usuarioCreado = await client.query(
      `
        INSERT INTO usuarios (nombre_completo, correo, contrasena, rol, activo)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING
          id,
          nombre_completo AS "nombreCompleto",
          correo,
          rol,
          creado_en AS "creadoEn",
          ultimo_acceso AS "ultimoAcceso"
      `,
      [nombreLimpio, correoLimpio, contrasenaHash, rolLimpio],
    );

    const nuevoUsuario = usuarioCreado.rows[0];

    if (esRolIngeniero(rolLimpio)) {
      await client.query(
        `
          INSERT INTO metricas_ingenieros (id_ingeniero)
          VALUES ($1)
          ON CONFLICT (id_ingeniero) DO NOTHING
        `,
        [nuevoUsuario.id],
      );
    }

    await client.query('COMMIT');

    response.status(201).json({
      message: 'Usuario creado correctamente.',
      data: { ...nuevoUsuario, estatus: 'ACTIVO' },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Error al crear usuario:', error);
    response.status(500).json({ message: 'No fue posible crear el usuario.' });
  } finally {
    if (client) client.release();
  }
});

app.put('/api/usuarios/:id', async (request, response) => {
  let client;

  try {
    const userId = Number(request.params.id);
    const { nombreCompleto, correo, rol } = request.body;

    const nombreLimpio = String(nombreCompleto || '').trim();
    const correoLimpio = normalizarCorreo(correo);
    const rolLimpio = normalizarRol(rol);

    if (!Number.isInteger(userId) || userId <= 0) {
      return response.status(400).json({ message: 'El identificador del usuario no es válido.' });
    }

    if (!nombreLimpio || !correoLimpio || !rolLimpio) {
      return response.status(400).json({ message: 'Nombre completo, correo y rol son obligatorios.' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const correoExistente = await client.query(
      'SELECT id FROM usuarios WHERE LOWER(correo) = $1 AND id <> $2',
      [correoLimpio, userId],
    );

    if (correoExistente.rowCount > 0) {
      await client.query('ROLLBACK');
      return response.status(409).json({ message: 'Ese correo ya está asignado a otro usuario.' });
    }

    const usuarioActualizado = await client.query(
      `
        UPDATE usuarios
        SET nombre_completo = $1, correo = $2, rol = $3
        WHERE id = $4
        RETURNING
          id,
          nombre_completo AS "nombreCompleto",
          correo,
          rol,
          creado_en AS "creadoEn",
          ultimo_acceso AS "ultimoAcceso",
          CASE
            WHEN COALESCE(activo, TRUE) = FALSE THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END AS estatus
      `,
      [nombreLimpio, correoLimpio, rolLimpio, userId],
    );

    if (usuarioActualizado.rowCount === 0) {
      await client.query('ROLLBACK');
      return response.status(404).json({ message: 'No se encontró el usuario solicitado.' });
    }

    await client.query('COMMIT');

    response.json({
      message: 'Usuario actualizado correctamente.',
      data: usuarioActualizado.rows[0],
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Error al actualizar usuario:', error);
    response.status(500).json({ message: 'No fue posible actualizar el usuario.' });
  } finally {
    if (client) client.release();
  }
});

// ACTIVAR / DESACTIVAR USUARIO
app.patch('/api/usuarios/:id/estatus', async (request, response) => {
  try {
    const userId = Number(request.params.id);
    const { activo } = request.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return response.status(400).json({ message: 'El identificador del usuario no es válido.' });
    }

    if (typeof activo !== 'boolean') {
      return response.status(400).json({ message: 'El campo activo debe ser verdadero o falso.' });
    }

    const result = await pool.query(
      `
        UPDATE usuarios
        SET activo = $1
        WHERE id = $2
        RETURNING
          id,
          nombre_completo AS "nombreCompleto",
          correo,
          rol,
          creado_en AS "creadoEn",
          ultimo_acceso AS "ultimoAcceso",
          CASE
            WHEN COALESCE(activo, TRUE) = FALSE THEN 'INACTIVO'
            ELSE 'ACTIVO'
          END AS estatus
      `,
      [activo, userId],
    );

    if (result.rowCount === 0) {
      return response.status(404).json({ message: 'No se encontró el usuario solicitado.' });
    }

    response.json({
      message: activo ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error al cambiar estatus del usuario:', error);
    response.status(500).json({ message: 'No fue posible cambiar el estatus del usuario.' });
  }
});

// ACTUALIZAR ESTATUS DE ACTIVIDAD DEL INGENIERO (mesa, comida, campo, etc.)
app.patch('/api/usuarios/:id/estatus-actividad', async (request, response) => {
  try {
    const userId = Number(request.params.id);
    const { estatus } = request.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return response.status(400).json({ message: 'Identificador de usuario inválido.' });
    }

    const estatusLimpio = String(estatus || 'mesa').trim().toLowerCase();

    // Actualiza en la tabla de métricas/estatus si existe
    await pool.query(
      `
        INSERT INTO public.metricas_ingenieros (id_ingeniero, estatus, actualizado_en)
        VALUES ($1, $2, NOW())
        ON CONFLICT (id_ingeniero)
        DO UPDATE SET estatus = $2, actualizado_en = NOW()
      `,
      [userId, estatusLimpio]
    ).catch(() => {});

    response.json({ success: true, message: `Estatus de actividad actualizado a ${estatusLimpio}` });
  } catch (error) {
    console.error('Error al actualizar estatus de actividad:', error);
    response.status(500).json({ success: false, message: 'Error interno al actualizar estatus.' });
  }
});

// ELIMINAR USUARIO DEFINITIVAMENTE
app.delete('/api/usuarios/:id', async (request, response) => {
  let client;

  try {
    const userId = Number(request.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return response.status(400).json({ message: 'El identificador del usuario no es válido.' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Eliminar dependencias
    await client.query('DELETE FROM metricas_ingenieros WHERE id_ingeniero = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM preferencias_usuario WHERE id_usuario = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM asignaciones_turno WHERE id_ingeniero = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM planeacion_eventos WHERE id_usuario = $1', [userId]).catch(() => {});

    const result = await client.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre_completo AS "nombreCompleto"',
      [userId],
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return response.status(404).json({ message: 'No se encontró el usuario a eliminar.' });
    }

    await client.query('COMMIT');

    return response.json({
      success: true,
      message: `El usuario ${result.rows[0].nombreCompleto} fue eliminado definitivamente.`,
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Error al eliminar usuario:', error);
    return response.status(500).json({ message: 'No fue posible eliminar el usuario de la base de datos.' });
  } finally {
    if (client) client.release();
  }
});

/* =========================================================
   INCIDENTES / ONSITE (CRUD COMPLETO Y FLEXIBLE)
   ========================================================= */

app.get('/api/incidentes', async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.id,
        COALESCE(i.folio, ('INC-' || i.id)) AS folio,
        COALESCE(i.resumen, i.descripcion, 'Incidente sin resumen') AS incidente,
        COALESCE(i.resumen, i.descripcion, '') AS resumen,
        i.descripcion,
        COALESCE(i.estatus, 'PENDIENTE') AS estatus,
        COALESCE(i.nombre_sitio, i.plaza, i.cliente_nombre, 'Sin ubicación') AS ubicacion,
        i.plaza,
        COALESCE(i.compania, i.cliente_nombre, 'ENERGIA EOLICA DEL SUR') AS compania,
        COALESCE(i.prioridad, 'P3') AS prioridad,
        TO_CHAR(COALESCE(i.creado_en, NOW()), 'YYYY-MM-DD') AS fecha,
        TO_CHAR(COALESCE(i.creado_en, NOW()), 'HH24:MI') AS inicio,
        COALESCE(i.hora_fin, '') AS fin,
        COALESCE(i.duracion_minutos, 0) AS "duracionMinutos",
        u.nombre_completo AS "ismMesa",
        i.id_ism_asignado AS "idIsmMesa",
        sup.nombre_completo AS "asignadoPor",
        sup.nombre_completo AS "asignadoPorNombre"
      FROM public.incidentes i
      LEFT JOIN public.usuarios u ON u.id = i.id_ism_asignado
      LEFT JOIN public.usuarios sup ON sup.id = i.creado_por
      ORDER BY i.id DESC
    `);
    return response.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error al consultar incidentes:', error);
    return response.status(500).json({ success: false, message: 'No fue posible consultar incidentes.' });
  }
});

app.post('/api/incidentes', async (request, response) => {
  try {
    const {
      folio,
      idSitio,
      nombreSitio,
      plaza,
      municipio,
      estado,
      compania,
      clienteNombre,
      servicio,
      resumen,
      descripcion,
      prioridad,
      idIsmAsignado,
      asignadoPor,
    } = request.body;

    const folioLimpio = String(folio || `FOL-${Date.now().toString().slice(-6)}`).trim();
    const resumenLimpio = String(resumen || descripcion || 'Incidente Onsite').trim();

    if (!folioLimpio || !resumenLimpio) {
      return response.status(400).json({
        success: false,
        message: 'El folio y el resumen del incidente son obligatorios.',
      });
    }

    // 1. Obtener ID del agente asignado
    let parsedIsmId = null;
    if (idIsmAsignado) {
      if (!isNaN(Number(idIsmAsignado))) {
        parsedIsmId = Number(idIsmAsignado);
      } else {
        const ismSearch = await pool.query(
          'SELECT id FROM public.usuarios WHERE LOWER(nombre_completo) = LOWER($1) LIMIT 1',
          [String(idIsmAsignado).trim()]
        );
        if (ismSearch.rowCount > 0) parsedIsmId = ismSearch.rows[0].id;
      }
    }

    // 2. Obtener creador del incidente
    let parsedCreador = asignadoPor && !isNaN(Number(asignadoPor)) ? Number(asignadoPor) : null;
    if (!parsedCreador) {
      const firstUser = await pool.query(
        "SELECT id FROM public.usuarios WHERE LOWER(rol) IN ('admin', 'supervisor', 'distribuidor') ORDER BY id ASC LIMIT 1"
      );
      parsedCreador = firstUser.rows[0]?.id || 1;
    }

    const cleanPriority = String(prioridad || '3').replace(/^P/i, '');
    const clienteFinal = String(compania || clienteNombre || 'Cliente General').trim();
    const ubicacionFinal = String(nombreSitio || plaza || 'Sin ubicación').trim();
    const estatusInicial = parsedIsmId ? 'EN ATENCION' : 'PENDIENTE';

    const result = await pool.query(
      `
        INSERT INTO public.incidentes (
          folio,
          resumen,
          descripcion,
          cliente_nombre,
          compania,
          nombre_sitio,
          plaza,
          prioridad,
          id_ism_asignado,
          creado_por,
          estatus,
          origen,
          creado_en
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'manual', NOW())
        RETURNING *
      `,
      [
        folioLimpio,
        resumenLimpio,
        descripcion ? String(descripcion).trim() : resumenLimpio,
        clienteFinal,
        clienteFinal,
        ubicacionFinal,
        plaza ? String(plaza).trim() : null,
        cleanPriority,
        parsedIsmId,
        parsedCreador,
        estatusInicial,
      ]
    );

    return response.status(201).json({
      success: true,
      message: 'Incidente registrado correctamente.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error detallado al registrar incidente:', error);
    if (error.code === '23505') {
      return response.status(409).json({ success: false, message: 'Ya existe un incidente con ese número de folio.' });
    }
    return response.status(500).json({ success: false, message: error.detail || error.message || 'Error al registrar en PostgreSQL.' });
  }
});

// ASIGNAR O CONCLUIR INCIDENTE
app.put('/api/incidentes/:id', async (request, response) => {
  const incidenteId = Number(request.params.id);
  const { idIsmAsignado, estatus, fin, duracionMinutos } = request.body;

  if (!Number.isInteger(incidenteId) || incidenteId <= 0) {
    return response.status(400).json({ success: false, message: 'ID de incidente inválido.' });
  }

  try {
    let parsedIsmId = null;
    if (idIsmAsignado !== undefined && idIsmAsignado !== null) {
      if (!isNaN(Number(idIsmAsignado))) {
        parsedIsmId = Number(idIsmAsignado);
      } else {
        const ismSearch = await pool.query(
          'SELECT id FROM public.usuarios WHERE LOWER(nombre_completo) = LOWER($1) LIMIT 1',
          [String(idIsmAsignado).trim()]
        );
        if (ismSearch.rowCount > 0) parsedIsmId = ismSearch.rows[0].id;
      }
    }

    const result = await pool.query(
      `
        UPDATE public.incidentes
        SET
          id_ism_asignado = COALESCE($1, id_ism_asignado),
          estatus = COALESCE($2, estatus),
          hora_fin = COALESCE($3, hora_fin),
          duracion_minutos = COALESCE($4, duracion_minutos)
        WHERE id = $5
        RETURNING *
      `,
      [parsedIsmId, estatus || 'EN ATENCION', fin || null, duracionMinutos || null, incidenteId]
    ).catch(async () => {
      // Fallback si no existen las columnas de hora_fin
      return await pool.query(
        `
          UPDATE public.incidentes
          SET
            id_ism_asignado = COALESCE($1, id_ism_asignado),
            estatus = COALESCE($2, estatus)
          WHERE id = $3
          RETURNING *
        `,
        [parsedIsmId, estatus || 'EN ATENCION', incidenteId]
      );
    });

    if (result.rowCount === 0) {
      return response.status(404).json({ success: false, message: 'Incidente no encontrado.' });
    }

    return response.json({
      success: true,
      message: 'Incidente actualizado correctamente.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar incidente:', error);
    return response.status(500).json({ success: false, message: 'No fue posible actualizar el incidente.' });
  }
});

/* =========================================================
   PLANEACIÓN
   ========================================================= */

app.get('/api/planeacion', async (request, response) => {
  const periodo = validarPeriodo(request, response);
  if (!periodo) return;

  try {
    const result = await pool.query(
      `
        SELECT
          p.id,
          p.id_usuario AS "agenteId",
          u.nombre_completo AS agente,
          p.tipo,
          p.fecha_inicio AS "fechaInicio",
          p.fecha_fin AS "fechaFin",
          COALESCE(p.comentario, '') AS comentario,
          p.creado_en AS "creadoEn"
        FROM planeacion_eventos p
        INNER JOIN usuarios u ON u.id = p.id_usuario
        WHERE p.fecha_inicio <= $2::date AND p.fecha_fin >= $1::date
        ORDER BY u.nombre_completo, p.fecha_inicio, p.fecha_fin
      `,
      [periodo.fechaInicio, periodo.fechaFin],
    );
    response.json({ data: result.rows });
  } catch (error) {
    console.error('Error al consultar la planeación:', error);
    response.status(500).json({ message: 'No fue posible obtener los registros de planeación.' });
  }
});

app.post('/api/planeacion', async (request, response) => {
  let client;

  try {
    const { agenteId, tipo, fechaInicio, fechaFin, comentario } = request.body;
    const usuarioId = Number(agenteId);
    const tipoLimpio = String(tipo || '').trim().toUpperCase();
    const inicioLimpio = String(fechaInicio || '').trim();
    const finLimpio = String(fechaFin || '').trim();
    const comentarioLimpio = String(comentario || '').trim();

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return response.status(400).json({ message: 'Selecciona un ISM/MESA válido.' });
    }

    if (!['VACACIONES', 'PROYECTO'].includes(tipoLimpio)) {
      return response.status(400).json({ message: 'El tipo de planeación debe ser VACACIONES o PROYECTO.' });
    }

    if (!esFechaISOValida(inicioLimpio) || !esFechaISOValida(finLimpio)) {
      return response.status(400).json({ message: 'Las fechas deben tener el formato YYYY-MM-DD.' });
    }

    if (finLimpio < inicioLimpio) {
      return response.status(400).json({ message: 'La fecha de fin no puede ser anterior a la de inicio.' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const usuario = await client.query('SELECT id, nombre_completo AS nombre, rol, activo FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);

    if (usuario.rowCount === 0) {
      await client.query('ROLLBACK');
      return response.status(404).json({ message: 'No se encontró el ISM/MESA seleccionado.' });
    }

    const conflicto = await client.query(
      'SELECT id FROM planeacion_eventos WHERE id_usuario = $1 AND fecha_inicio <= $3::date AND fecha_fin >= $2::date LIMIT 1',
      [usuarioId, inicioLimpio, finLimpio],
    );

    if (conflicto.rowCount > 0) {
      await client.query('ROLLBACK');
      return response.status(409).json({ message: 'Este ISM/MESA ya tiene una planeación en esas fechas.' });
    }

    const nuevoEvento = await client.query(
      `
        INSERT INTO planeacion_eventos (id_usuario, tipo, fecha_inicio, fecha_fin, comentario)
        VALUES ($1, $2, $3::date, $4::date, $5)
        RETURNING id, id_usuario AS "agenteId", tipo, fecha_inicio AS "fechaInicio", fecha_fin AS "fechaFin", COALESCE(comentario, '') AS comentario, creado_en AS "creadoEn"
      `,
      [usuarioId, tipoLimpio, inicioLimpio, finLimpio, comentarioLimpio || null],
    );

    await client.query('COMMIT');

    response.status(201).json({
      message: 'Planeación registrada correctamente.',
      data: { ...nuevoEvento.rows[0], agente: usuario.rows[0].nombre },
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Error al crear la planeación:', error);
    response.status(500).json({ message: 'No fue posible guardar el registro de planeación.' });
  } finally {
    if (client) client.release();
  }
});

app.get('/api/planeacion/resumen', async (request, response) => {
  const periodo = validarPeriodo(request, response);
  if (!periodo) return;

  try {
    const result = await pool.query(
      `
        WITH ingenieros AS (
          SELECT id, nombre_completo FROM usuarios
          WHERE LOWER(TRIM(rol::text)) IN ('ism/mesa', 'ism_mesa', 'ingeniero') AND activo = TRUE
        ),
        eventos_en_periodo AS (
          SELECT p.id_usuario, p.tipo, GREATEST(p.fecha_inicio, $1::date) AS inicio_efectivo, LEAST(p.fecha_fin, $2::date) AS fin_efectivo
          FROM planeacion_eventos p
          WHERE p.fecha_inicio <= $2::date AND p.fecha_fin >= $1::date
        )
        SELECT
          i.id, i.nombre_completo AS nombre,
          COALESCE(SUM(CASE WHEN e.tipo = 'VACACIONES' THEN (e.fin_efectivo - e.inicio_efectivo + 1) ELSE 0 END), 0)::integer AS vacaciones,
          COALESCE(SUM(CASE WHEN e.tipo = 'PROYECTO' THEN (e.fin_efectivo - e.inicio_efectivo + 1) ELSE 0 END), 0)::integer AS proyecto
        FROM ingenieros i
        LEFT JOIN eventos_en_periodo e ON e.id_usuario = i.id
        GROUP BY i.id, i.nombre_completo
        ORDER BY i.nombre_completo
      `,
      [periodo.fechaInicio, periodo.fechaFin],
    );

    const resumen = result.rows.map((row) => ({
      ...row,
      vacaciones: Number(row.vacaciones),
      proyecto: Number(row.proyecto),
      total: Number(row.vacaciones) + Number(row.proyecto),
    }));

    response.json({ periodo: { inicio: periodo.fechaInicio, fin: periodo.fechaFin }, data: resumen });
  } catch (error) {
    console.error('Error al consultar el resumen de planeación:', error);
    response.status(500).json({ message: 'No fue posible obtener el resumen de planeación.' });
  }
});

app.get('/api/planeacion/exportar', async (request, response) => {
  const periodo = validarPeriodo(request, response);
  if (!periodo) return;

  try {
    const [resumenResult, detalleResult] = await Promise.all([
      pool.query(
        `
          WITH ingenieros AS (
            SELECT id, nombre_completo FROM usuarios
            WHERE LOWER(rol) = 'ingeniero' AND activo = TRUE
          ),
          eventos_en_periodo AS (
            SELECT p.id_usuario, p.tipo, GREATEST(p.fecha_inicio, $1::date) AS inicio_efectivo, LEAST(p.fecha_fin, $2::date) AS fin_efectivo
            FROM planeacion_eventos p
            WHERE p.fecha_inicio <= $2::date AND p.fecha_fin >= $1::date
          )
          SELECT
            i.nombre_completo AS "ISM/MESA",
            COALESCE(SUM(CASE WHEN e.tipo = 'VACACIONES' THEN (e.fin_efectivo - e.inicio_efectivo + 1) ELSE 0 END), 0)::integer AS "Días vacaciones",
            COALESCE(SUM(CASE WHEN e.tipo = 'PROYECTO' THEN (e.fin_efectivo - e.inicio_efectivo + 1) ELSE 0 END), 0)::integer AS "Días en proyecto",
            COALESCE(SUM(e.fin_efectivo - e.inicio_efectivo + 1), 0)::integer AS "Total días fuera"
          FROM ingenieros i
          LEFT JOIN eventos_en_periodo e ON e.id_usuario = i.id
          GROUP BY i.id, i.nombre_completo
          ORDER BY i.nombre_completo
        `,
        [periodo.fechaInicio, periodo.fechaFin],
      ),
      pool.query(
        `
          SELECT
            p.id AS "ID", u.nombre_completo AS "ISM/MESA", p.tipo AS "Tipo",
            p.fecha_inicio AS "Fecha inicio", p.fecha_fin AS "Fecha fin",
            (p.fecha_fin - p.fecha_inicio + 1)::integer AS "Días",
            COALESCE(p.comentario, '') AS "Comentario", p.creado_en AS "Registrado el"
          FROM planeacion_eventos p
          INNER JOIN usuarios u ON u.id = p.id_usuario
          WHERE p.fecha_inicio <= $2::date AND p.fecha_fin >= $1::date
          ORDER BY u.nombre_completo, p.fecha_inicio
        `,
        [periodo.fechaInicio, periodo.fechaFin],
      ),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EXECON';
    const resumenSheet = workbook.addWorksheet('Resumen');
    const detalleSheet = workbook.addWorksheet('Detalle');

    resumenSheet.columns = [
      { header: 'ISM/MESA', key: 'ISM/MESA', width: 32 },
      { header: 'Días vacaciones', key: 'Días vacaciones', width: 20 },
      { header: 'Días en proyecto', key: 'Días en proyecto', width: 22 },
      { header: 'Total días fuera', key: 'Total días fuera', width: 20 },
    ];
    resumenSheet.addRow({ 'ISM/MESA': `Periodo: ${periodo.fechaInicio} a ${periodo.fechaFin}` });
    resumenSheet.mergeCells('A1:D1');
    resumenResult.rows.forEach((row) => resumenSheet.addRow(row));

    detalleSheet.columns = [
      { header: 'ID', key: 'ID', width: 10 },
      { header: 'ISM/MESA', key: 'ISM/MESA', width: 32 },
      { header: 'Tipo', key: 'Tipo', width: 16 },
      { header: 'Fecha inicio', key: 'Fecha inicio', width: 15 },
      { header: 'Fecha fin', key: 'Fecha fin', width: 15 },
      { header: 'Días', key: 'Días', width: 10 },
      { header: 'Comentario', key: 'Comentario', width: 45 },
      { header: 'Registrado el', key: 'Registrado el', width: 22 },
    ];
    detalleResult.rows.forEach((row) => detalleSheet.addRow(row));

    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', `attachment; filename="planeacion_${periodo.fechaInicio}_${periodo.fechaFin}.xlsx"`);
    await workbook.xlsx.write(response);
    response.end();
  } catch (error) {
    console.error('Error al exportar planeación a Excel:', error);
    if (!response.headersSent) {
      response.status(500).json({ message: 'No fue posible exportar la planeación a Excel.' });
    }
  }
});

/* =========================================================
   ISM/MESA
   ========================================================= */

app.get('/api/ingenieros', async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT
        vei.id_ingeniero AS id,
        vei.nombre_completo AS nombre,
        vei.correo,
        vei.rol,
        vei.estatus,
        vei.id_sitio AS "idSitio",
        vei.fecha,
        vei.actualizado_en AS "actualizadoEn"
      FROM vw_estatus_actual_ingenieros vei
      ORDER BY vei.nombre_completo
    `);
    response.json({ data: result.rows });
  } catch (error) {
    console.error('Error al consultar ISM/MESA:', error);
    response.status(500).json({ message: 'No fue posible obtener los ISM/MESA.' });
  }
});

/* =========================================================
   DASHBOARD
   ========================================================= */

app.get('/api/dashboard/resumen', async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT
        mesa, campo, comida, proyecto, sin_reportar, vacaciones,
        agentes_activos AS "agentesActivos",
        agentes_totales AS "agentesTotales",
        disponibilidad_efectiva AS "disponibilidadEfectiva"
      FROM vw_dashboard_resumen
    `);
    response.json({
      data: result.rows[0] || {
        mesa: 0, campo: 0, comida: 0, proyecto: 0, sin_reportar: 0, vacaciones: 0,
        agentesActivos: 0, agentesTotales: 0, disponibilidadEfectiva: 0,
      },
    });
  } catch (error) {
    console.error('Error al consultar resumen:', error);
    response.status(500).json({ message: 'No fue posible obtener el resumen del dashboard.' });
  }
});

app.get('/api/dashboard/reincidencia', async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT estatus, total FROM vw_dashboard_reincidencia ORDER BY estatus
    `);
    response.json({ data: result.rows });
  } catch (error) {
    console.error('Error al consultar reincidencia:', error);
    response.status(500).json({ message: 'No fue posible obtener la reincidencia por estatus.' });
  }
});

app.get('/api/dashboard/disponibilidad', async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT fecha, dia, porcentaje FROM vw_dashboard_disponibilidad ORDER BY fecha
    `);
    response.json({ data: result.rows });
  } catch (error) {
    console.error('Error al consultar disponibilidad:', error);
    response.status(500).json({ message: 'No fue posible obtener la disponibilidad diaria.' });
  }
});

app.get('/api/dashboard/volumetria', async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT
        id_ingeniero AS id,
        id_ingeniero AS "idIsmMesa",
        ism,
        tareas_campo AS "tareasCampo",
        incidentes_mesa AS "incidentesMesa",
        onsites,
        en_mesa AS "enMesa",
        en_campo AS "enCampo",
        en_comida AS "enComida",
        en_proyecto AS "enProyecto",
        sin_reportar AS "sinReportar",
        vacaciones
      FROM vw_dashboard_volumetria
      ORDER BY ism
    `);
    response.json({ data: result.rows });
  } catch (error) {
    console.error('Error al consultar volumetría:', error);
    response.status(500).json({ message: 'No fue posible obtener la volumetría del dashboard.' });
  }
});

/* =========================================================
   RUTA NO ENCONTRADA
   ========================================================= */

app.use((request, response) => {
  response.status(404).json({
    message: `Ruta no encontrada: ${request.method} ${request.originalUrl}`,
  });
});

/* =========================================================
   INICIO DEL SERVIDOR
   ========================================================= */

app.listen(port, () => {
  console.log(`API EXECON disponible en http://localhost:${port}`);
});