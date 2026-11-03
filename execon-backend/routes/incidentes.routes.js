const express = require('express');
const pool = require('../db/pool');
const verificarToken = require('../middleware/auth');

const router = express.Router();

function normalizarPrioridad(prio) {
  const clean = String(prio || '3').trim().toUpperCase();
  const match = clean.match(/^P?([1-5])$/);
  return match ? `P${match[1]}` : 'P3';
}

/* =========================================================
   1. GET /api/incidentes (LISTAR TODOS LOS INCIDENTES)
   ========================================================= */
router.get('/', async (req, res) => {
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
router.post('/', async (req, res) => {
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
      asignadoPor,
    } = req.body;

    const textoFolio = String(folio || `FOL-${Date.now().toString().slice(-6)}`).trim();
    const textoResumen = String(resumen || descripcion || 'Incidente Onsite registrado').trim();
    const textoCliente = String(compania || clienteNombre || 'Cliente General').trim();
    const textoUbicacion = String(nombreSitio || plaza || 'Sin ubicación').trim();

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
    let parsedCreador = asignadoPor && !isNaN(Number(asignadoPor)) ? Number(asignadoPor) : null;
    if (!parsedCreador) {
      const userResult = await pool.query(
        "SELECT id FROM public.usuarios WHERE LOWER(rol) IN ('admin', 'supervisor', 'distribuidor') ORDER BY id ASC LIMIT 1"
      );
      parsedCreador = userResult.rows[0]?.id || 1;
    }

    const prioridadLimpia = normalizarPrioridad(prioridad);
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
router.put('/:id', async (req, res) => {
  const incidenteId = Number(req.params.id);
  const { idIsmAsignado, estatus, fin, duracionMinutos } = req.body;

  if (!Number.isInteger(incidenteId) || incidenteId <= 0) {
    return res.status(400).json({ success: false, message: 'ID de incidente inválido.' });
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