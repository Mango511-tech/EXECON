const express = require('express');
const pool = require('../db/pool');
const verificarToken = require('../middleware/auth');
const { permitirRoles } = require('../middleware/auth');
const { ACTIVIDADES } = require('../db/jornada');

const router = express.Router();
const JORNADA_MINUTOS = 9 * 60;

/* GET /api/jornada/mia
   Entrada y estatus guardados en la BD: sobreviven a refrescar la página o cambiar de navegador. */
router.get('/mia', verificarToken, permitirRoles('ISM/MESA', 'supervisor', 'admin', 'distribuidor'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT estatus, estatus_actual AS etiqueta,
              CASE WHEN hora_entrada IS NULL THEN NULL
                   ELSE (EXTRACT(EPOCH FROM ((fecha + hora_entrada) AT TIME ZONE current_setting('TimeZone'))) * 1000)::bigint
              END AS "entradaMs",
              hora_salida IS NOT NULL AS "cerrada"
         FROM public.registros_jornada
        WHERE id_ingeniero = $1 AND fecha = CURRENT_DATE`,
      [req.usuario.id]
    );
    const fila = result.rows[0];
    return res.json({
      success: true,
      data: fila
        ? { estatus: fila.estatus, etiqueta: fila.etiqueta, entradaMs: fila.entradaMs ? Number(fila.entradaMs) : null, cerrada: fila.cerrada }
        : { estatus: 'sin_reportar', etiqueta: 'Offline', entradaMs: null, cerrada: false },
      opciones: Object.keys(ACTIVIDADES),
    });
  } catch (error) {
    console.error('Error al consultar mi jornada:', error);
    return res.status(500).json({ success: false, message: 'No fue posible consultar tu jornada.' });
  }
});

/* GET /api/jornada/horas?fecha=YYYY-MM-DD
   Horas de jornada por ingeniero (salida - entrada) y si cumplieron las 9 h. */
router.get('/horas', verificarToken, permitirRoles('supervisor', 'admin'), async (req, res) => {
  try {
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.fecha || '')) ? req.query.fecha : null;
    const result = await pool.query(
      `SELECT vei.id_ingeniero AS id,
              vei.nombre_completo AS nombre,
              TO_CHAR(rj.hora_entrada, 'HH24:MI') AS entrada,
              TO_CHAR(rj.hora_salida, 'HH24:MI') AS salida,
              (rj.hora_entrada IS NOT NULL AND rj.hora_salida IS NULL) AS "enCurso",
              CASE WHEN rj.hora_inicio_comida IS NOT NULL AND rj.hora_fin_comida IS NOT NULL
                        AND rj.hora_fin_comida > rj.hora_inicio_comida
                   THEN ROUND(EXTRACT(EPOCH FROM (rj.hora_fin_comida - rj.hora_inicio_comida)) / 60)::int
                   ELSE 0 END AS "comidaMin",
              CASE WHEN rj.hora_entrada IS NULL THEN 0
                   ELSE GREATEST(0, ROUND(EXTRACT(EPOCH FROM (
                          COALESCE(rj.hora_salida, CASE WHEN rj.fecha = CURRENT_DATE THEN LOCALTIME ELSE rj.hora_entrada END)
                          - rj.hora_entrada)) / 60))::int
              END AS minutos
         FROM vw_estatus_actual_ingenieros vei
         LEFT JOIN public.registros_jornada rj
                ON rj.id_ingeniero = vei.id_ingeniero
               AND rj.fecha = COALESCE($1::date, CURRENT_DATE)
        ORDER BY vei.nombre_completo`,
      [fecha]
    );
    const data = result.rows.map((r) => ({ ...r, cumplio: r.minutos >= JORNADA_MINUTOS }));
    return res.json({ success: true, jornadaMinutos: JORNADA_MINUTOS, data });
  } catch (error) {
    console.error('Error al consultar horas de jornada:', error);
    return res.status(500).json({ success: false, message: 'No fue posible consultar las horas de jornada.' });
  }
});

module.exports = router;
