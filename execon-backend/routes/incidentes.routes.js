const express = require('express');
const pool = require('../db/pool');
const verificarToken = require('../middleware/auth');
const { permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(verificarToken);

function normalizarPrioridad(prio) {
  const clean = String(prio || '3').trim().toUpperCase();
  const match = clean.match(/^P?([1-5])$/);
  return match ? `P${match[1]}` : 'P3';
}

function normalizarEstatus(estatus) {
  const clean = String(estatus || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  if (clean === 'ASIGNADO') return 'EN ATENCION';
  return ['PENDIENTE', 'EN ATENCION', 'FINALIZADO'].includes(clean) ? clean : null;
}

/* =========================================================
   1. GET /api/incidentes (LISTAR TODOS LOS INCIDENTES)
   ========================================================= */
router.get('/', permitirRoles('admin', 'supervisor', 'distribuidor', 'ISM/MESA'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.id,
        COALESCE(i.folio, ('INC-' || LPAD(i.id::text, 6, '0'))) AS folio,
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

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error al consultar incidentes:', error);
    return res.status(500).json({ success: false, message: 'No fue posible consultar incidentes.' });
  }
});

/* =========================================================
   2. POST /api/incidentes (REGISTRAR NUEVO INCIDENTE)
   ========================================================= */
router.post('/', permitirRoles('admin', 'supervisor', 'distribuidor'), async (req, res) => {
  try {
    const {
      folio,
      resumen,
      descripcion,
      clienteNombre,
      compania,
      plaza,
      municipio,
      estado,
      nombreSitio,
      idSitio,
      prioridad,
      idIsmAsignado,
      estatus,
    } = req.body || {};

    const textoFolio = String(folio || `FOL-${Date.now().toString().slice(-6)}`).trim();
    const textoResumen = String(resumen || descripcion || 'Incidente Onsite registrado').trim();
    const textoCliente = String(compania || clienteNombre || 'Cliente General').trim();
    const textoUbicacion = String(nombreSitio || plaza || 'Sin ubicación').trim();
    const estatusSolicitado = estatus === undefined ? null : normalizarEstatus(estatus);

    if (estatus !== undefined && !estatusSolicitado) {
      return res.status(400).json({ success: false, message: 'El estatus del incidente no es válido.' });
    }

    // 1. Obtener ID del agente ISM/MESA asignado
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
    const parsedCreador = req.usuario.id;

    const prioridadLimpia = normalizarPrioridad(prioridad);
    const estatusInicial = estatusSolicitado || (parsedIsmId ? 'EN ATENCION' : 'PENDIENTE');

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
          municipio,
          estado,
          prioridad,
          id_ism_asignado,
          creado_por,
          asignado_por,
          estatus,
          origen,
          creado_en
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'manual', NOW())
        RETURNING *
      `,
      [
        textoFolio,
        textoResumen,
        descripcion ? String(descripcion).trim() : textoResumen,
        textoCliente,
        textoCliente,
        textoUbicacion,
        plaza ? String(plaza).trim() : null,
        municipio ? String(municipio).trim() : null,
        estado ? String(estado).trim() : null,
        prioridadLimpia,
        parsedIsmId,
        parsedCreador,
        parsedCreador,
        estatusInicial,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Incidente registrado correctamente.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error al registrar incidente:', error);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Ya existe un incidente con ese número de folio.' });
    }
    return res.status(500).json({ success: false, message: error.detail || error.message || 'Error al registrar incidente.' });
  }
});

/* =========================================================
   3. PUT /api/incidentes/:id (ASIGNAR / CONCLUIR INCIDENTE)
   ========================================================= */
router.put('/:id', permitirRoles('admin', 'supervisor', 'distribuidor', 'ISM/MESA'), async (req, res) => {
  const incidenteId = Number(req.params.id);
  const body = req.body || {};
  const {
    idIsmAsignado,
    estatus,
    fin,
    duracionMinutos,
    folio,
    resumen,
    descripcion,
    nombreSitio,
    ubicacion,
    plaza,
  } = body;

  if (!Number.isInteger(incidenteId) || incidenteId <= 0) {
    return res.status(400).json({ success: false, message: 'ID de incidente inválido.' });
  }

  const isIsm = req.usuario.rol === 'ISM/MESA';
  const isDistributor = req.usuario.rol === 'distribuidor';
  if (
    isIsm &&
    ['folio', 'resumen', 'nombreSitio', 'ubicacion', 'plaza'].some((field) =>
      Object.prototype.hasOwnProperty.call(body, field)
    )
  ) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para modificar estos datos del incidente.' });
  }

  try {
    let parsedIsmId = null;
    const hasAssignment = Object.prototype.hasOwnProperty.call(body, 'idIsmAsignado');
    const clearAssignment = hasAssignment && (idIsmAsignado === null || idIsmAsignado === '');
    if (idIsmAsignado !== undefined && idIsmAsignado !== null) {
      if (!isNaN(Number(idIsmAsignado))) {
        parsedIsmId = Number(idIsmAsignado);
      } else {
        const ismSearch = await pool.query(
          'SELECT id FROM public.usuarios WHERE LOWER(nombre_completo) = LOWER($1) LIMIT 1',
          [String(idIsmAsignado).trim()]
        );
        if (ismSearch.rowCount === 0) {
          return res.status(400).json({ success: false, message: 'El usuario ISM/MESA indicado no existe.' });
        }
        parsedIsmId = ismSearch.rows[0].id;
      }
    }

    const estatusLimpio = estatus === undefined ? null : normalizarEstatus(estatus);
    if (estatus !== undefined && !estatusLimpio) {
      return res.status(400).json({ success: false, message: 'El estatus del incidente no es válido.' });
    }
    if (
      isIsm &&
      ((parsedIsmId !== null && parsedIsmId !== req.usuario.id) ||
        (clearAssignment && estatusLimpio !== 'FINALIZADO') ||
        ((fin !== undefined || duracionMinutos !== undefined) && estatusLimpio !== 'FINALIZADO') ||
        (estatusLimpio !== null && !['EN ATENCION', 'FINALIZADO'].includes(estatusLimpio)))
    ) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta actualización.' });
    }
    if (
      isDistributor &&
      ((clearAssignment && hasAssignment) ||
        (estatusLimpio !== null && estatusLimpio !== 'EN ATENCION') ||
        ['fin', 'duracionMinutos', 'folio', 'resumen', 'descripcion', 'nombreSitio', 'ubicacion', 'plaza'].some((field) =>
          Object.prototype.hasOwnProperty.call(body, field)
        ))
    ) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta actualización.' });
    }

    const optionalText = (value) => (value === undefined || value === null ? null : String(value).trim());
    const result = await pool.query(
      `
        UPDATE public.incidentes
        SET
          id_ism_asignado = CASE
            WHEN $1 THEN NULL
            WHEN $2 THEN $3
            ELSE id_ism_asignado
          END,
          estatus = COALESCE($4, estatus),
          hora_fin = COALESCE($5, hora_fin),
          duracion_minutos = COALESCE($6, duracion_minutos),
          folio = COALESCE($7, folio),
          resumen = COALESCE($8, resumen),
          descripcion = COALESCE($9, descripcion),
          nombre_sitio = COALESCE($10, nombre_sitio),
          plaza = COALESCE($11, plaza)
        WHERE id = $12
          AND ($13 = FALSE OR id_ism_asignado = $14)
        RETURNING *
      `,
      [
        clearAssignment,
        hasAssignment,
        parsedIsmId,
        estatusLimpio,
        fin || null,
        duracionMinutos || null,
        optionalText(folio),
        optionalText(resumen),
        optionalText(descripcion),
        optionalText(nombreSitio ?? ubicacion),
        optionalText(plaza),
        incidenteId,
        isIsm,
        req.usuario.id,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Incidente no encontrado.' });
    }

    return res.json({ success: true, message: 'Incidente actualizado correctamente.', data: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar incidente:', error);
    return res.status(500).json({ success: false, message: 'No fue posible actualizar el incidente.' });
  }
});

module.exports = router;