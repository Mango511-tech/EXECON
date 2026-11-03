const express = require('express');

const pool = require('../db/pool');
const verificarToken = require('../middleware/auth');
const { permitirRoles } = require('../middleware/auth');

const router = express.Router();

const ZONA_OPERACION = 'America/Monterrey';

router.use(
  verificarToken,
  permitirRoles('admin', 'supervisor'),
);

function esIdValido(value) {
  return (
    /^\d+$/.test(String(value ?? '')) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
  );
}

function esFechaValida(value) {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function esHoraValida(value) {
  return (
    typeof value === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

function esRolIsm(rol) {
  return ['ism/mesa', 'ism_mesa', 'ingeniero'].includes(
    String(rol || '').trim().toLowerCase(),
  );
}

function errorRespuesta(response, error, message) {
  console.error(message, error);

  return response.status(500).json({
    success: false,
    message,
  });
}

/*
  GET /api/turnos
*/
router.get('/', async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.nombre,
        TO_CHAR(t.hora_inicio, 'HH24:MI') AS "horaInicio",
        TO_CHAR(t.hora_fin, 'HH24:MI') AS "horaFin",
        t.dias_semana AS "diasSemana",
        t.zona_horaria AS "zonaHoraria",
        t.activo,
        (t.hora_fin < t.hora_inicio) AS "cruzaMedianoche",
        t.creado_por AS "creadoPor",
        u.nombre_completo AS "nombreCreador",
        t.creado_en AS "creadoEn"
      FROM public.turnos t
      INNER JOIN public.usuarios u
        ON u.id = t.creado_por
      ORDER BY t.nombre, t.id
    `);

    return response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    return errorRespuesta(
      response,
      error,
      'No fue posible consultar los turnos.',
    );
  }
});

/*
  POST /api/turnos

  diasSemana: 1 = lunes, ... 7 = domingo.
  Los días indican cuándo comienza la jornada.
*/
router.post('/', async (request, response) => {
  try {
    const {
      nombre,
      horaInicio,
      horaFin,
      diasSemana,
    } = request.body || {};

    const nombreLimpio = String(nombre || '').trim();

    if (!nombreLimpio || nombreLimpio.length > 100) {
      return response.status(400).json({
        success: false,
        message: 'El nombre debe tener entre 1 y 100 caracteres.',
      });
    }

    if (!esHoraValida(horaInicio) || !esHoraValida(horaFin)) {
      return response.status(400).json({
        success: false,
        message: 'Las horas deben tener formato HH:mm, de 00:00 a 23:59.',
      });
    }

    if (horaInicio === horaFin) {
      return response.status(400).json({
        success: false,
        message: 'La entrada y salida no pueden ser iguales.',
      });
    }

    if (
      !Array.isArray(diasSemana) ||
      diasSemana.length < 1 ||
      diasSemana.length > 7 ||
      !diasSemana.every(
        (day) => Number.isInteger(day) && day >= 1 && day <= 7,
      ) ||
      new Set(diasSemana).size !== diasSemana.length
    ) {
      return response.status(400).json({
        success: false,
        message:
          'Selecciona días sin repetir, del 1 (lunes) al 7 (domingo).',
      });
    }

    const result = await pool.query(
      `
        INSERT INTO public.turnos (
          nombre,
          hora_inicio,
          hora_fin,
          dias_semana,
          zona_horaria,
          creado_por
        )
        VALUES ($1, $2::time, $3::time, $4::smallint[], $5, $6)
        RETURNING
          id,
          nombre,
          TO_CHAR(hora_inicio, 'HH24:MI') AS "horaInicio",
          TO_CHAR(hora_fin, 'HH24:MI') AS "horaFin",
          dias_semana AS "diasSemana",
          zona_horaria AS "zonaHoraria",
          activo,
          (hora_fin < hora_inicio) AS "cruzaMedianoche",
          creado_en AS "creadoEn"
      `,
      [
        nombreLimpio,
        horaInicio,
        horaFin,
        [...diasSemana].sort((a, b) => a - b),
        ZONA_OPERACION,
        request.usuario.id,
      ],
    );

    return response.status(201).json({
      success: true,
      message: 'Turno creado correctamente.',
      data: result.rows[0],
    });
  } catch (error) {
    return errorRespuesta(
      response,
      error,
      'No fue posible crear el turno.',
    );
  }
});

/*
  GET /api/turnos/asignaciones

  Filtro opcional: ?idIngeniero=2
*/
router.get('/asignaciones', async (request, response) => {
  try {
    const idIngeniero = request.query.idIngeniero;

    if (
      idIngeniero !== undefined &&
      !esIdValido(idIngeniero)
    ) {
      return response.status(400).json({
        success: false,
        message: 'El identificador del ISM no es válido.',
      });
    }

    const result = await pool.query(
      `
        SELECT
          a.id,
          a.id_ingeniero AS "idIngeniero",
          u.nombre_completo AS ingeniero,
          a.id_turno AS "idTurno",
          t.nombre AS turno,
          TO_CHAR(t.hora_inicio, 'HH24:MI') AS "horaInicio",
          TO_CHAR(t.hora_fin, 'HH24:MI') AS "horaFin",
          t.dias_semana AS "diasSemana",
          t.zona_horaria AS "zonaHoraria",
          (t.hora_fin < t.hora_inicio) AS "cruzaMedianoche",
          TO_CHAR(a.fecha_inicio, 'YYYY-MM-DD') AS "fechaInicio",
          TO_CHAR(a.fecha_fin, 'YYYY-MM-DD') AS "fechaFin",
          a.cancelada,
          a.motivo,
          a.asignado_por AS "asignadoPor",
          supervisor.nombre_completo AS "nombreAsignador",
          a.creado_en AS "creadoEn"
        FROM public.asignaciones_turno a
        INNER JOIN public.usuarios u
          ON u.id = a.id_ingeniero
        INNER JOIN public.turnos t
          ON t.id = a.id_turno
        INNER JOIN public.usuarios supervisor
          ON supervisor.id = a.asignado_por
        WHERE ($1::integer IS NULL OR a.id_ingeniero = $1)
        ORDER BY a.fecha_inicio DESC, u.nombre_completo, a.id DESC
      `,
      [
        idIngeniero === undefined
          ? null
          : Number(idIngeniero),
      ],
    );

    return response.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    return errorRespuesta(
      response,
      error,
      'No fue posible consultar las asignaciones de turno.',
    );
  }
});

/*
  POST /api/turnos/asignaciones

  Primera versión:
  un ISM solo puede tener una asignación no cancelada
  para cada periodo de vigencia.

  No admite dos horarios simultáneos aunque sus días
  de la semana sean diferentes.
*/
router.post('/asignaciones', async (request, response) => {
  const {
    idIngeniero,
    idTurno,
    fechaInicio,
    fechaFin,
    motivo,
  } = request.body || {};

  const motivoLimpio = String(motivo || '').trim();

  const fin =
    fechaFin === undefined || fechaFin === null || fechaFin === ''
      ? null
      : fechaFin;

  if (!esIdValido(idIngeniero) || !esIdValido(idTurno)) {
    return response.status(400).json({
      success: false,
      message: 'Selecciona un ISM y un turno válidos.',
    });
  }

  if (
    !esFechaValida(fechaInicio) ||
    (fin !== null && !esFechaValida(fin))
  ) {
    return response.status(400).json({
      success: false,
      message: 'Las fechas deben ser válidas y usar YYYY-MM-DD.',
    });
  }

  if (fin !== null && fin < fechaInicio) {
    return response.status(400).json({
      success: false,
      message: 'La fecha final no puede ser anterior a la inicial.',
    });
  }

  if (!motivoLimpio || motivoLimpio.length > 2000) {
    return response.status(400).json({
      success: false,
      message: 'El motivo debe tener entre 1 y 2000 caracteres.',
    });
  }

  let client;

  try {
    client = await pool.connect();

    await client.query('BEGIN');

    // Serializa las asignaciones del mismo ISM.
    const usuarioResult = await client.query(
      `
        SELECT id, rol, activo
        FROM public.usuarios
        WHERE id = $1
        FOR UPDATE
      `,
      [Number(idIngeniero)],
    );

    const usuario = usuarioResult.rows[0];

    if (!usuario) {
      await client.query('ROLLBACK');

      return response.status(404).json({
        success: false,
        message: 'No se encontró el ISM.',
      });
    }

    if (!usuario.activo || !esRolIsm(usuario.rol)) {
      await client.query('ROLLBACK');

      return response.status(400).json({
        success: false,
        message: 'El usuario debe estar activo y tener rol ISM/MESA.',
      });
    }

    const turnoResult = await client.query(
      `
        SELECT id, activo, zona_horaria
        FROM public.turnos
        WHERE id = $1
        FOR SHARE
      `,
      [Number(idTurno)],
    );

    const turno = turnoResult.rows[0];

    if (!turno) {
      await client.query('ROLLBACK');

      return response.status(404).json({
        success: false,
        message: 'No se encontró el turno.',
      });
    }

    if (!turno.activo || turno.zona_horaria !== ZONA_OPERACION) {
      await client.query('ROLLBACK');

      return response.status(400).json({
        success: false,
        message:
          'El turno debe estar activo y usar America/Monterrey.',
      });
    }

    const conflicto = await client.query(
      `
        SELECT id
        FROM public.asignaciones_turno
        WHERE id_ingeniero = $1
          AND cancelada = FALSE
          AND fecha_inicio <= COALESCE($3::date, 'infinity'::date)
          AND COALESCE(fecha_fin, 'infinity'::date) >= $2::date
        LIMIT 1
      `,
      [Number(idIngeniero), fechaInicio, fin],
    );

    if (conflicto.rowCount > 0) {
      await client.query('ROLLBACK');

      return response.status(409).json({
        success: false,
        message:
          'El ISM ya tiene una asignación de turno en ese periodo.',
      });
    }

    const result = await client.query(
      `
        INSERT INTO public.asignaciones_turno (
          id_ingeniero,
          id_turno,
          fecha_inicio,
          fecha_fin,
          motivo,
          asignado_por
        )
        VALUES ($1, $2, $3::date, $4::date, $5, $6)
        RETURNING
          id,
          id_ingeniero AS "idIngeniero",
          id_turno AS "idTurno",
          TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS "fechaInicio",
          TO_CHAR(fecha_fin, 'YYYY-MM-DD') AS "fechaFin",
          cancelada,
          motivo,
          asignado_por AS "asignadoPor",
          creado_en AS "creadoEn"
      `,
      [
        Number(idIngeniero),
        Number(idTurno),
        fechaInicio,
        fin,
        motivoLimpio,
        request.usuario.id,
      ],
    );

    await client.query('COMMIT');

    return response.status(201).json({
      success: true,
      message: 'Turno asignado correctamente.',
      data: result.rows[0],
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    return errorRespuesta(
      response,
      error,
      'No fue posible asignar el turno.',
    );
  } finally {
    if (client) client.release();
  }
});

module.exports = router;