const express = require('express');
const pool = require('../db/pool');
const verificarToken = require('../middleware/auth');

const router = express.Router();

router.get('/estatus', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.nombre_completo, u.correo,
        CASE
          WHEN m.en_vacaciones THEN 'vacaciones'
          ELSE COALESCE(rj.estatus_actual, 'fuera')
        END AS estatus,
        t.folio AS tarea_folio, t.titulo AS tarea_titulo
      FROM Usuarios u
      LEFT JOIN Metricas_Ingenieros m ON u.id = m.id_ingeniero
      LEFT JOIN Registros_Jornada rj ON rj.id_ingeniero = u.id AND rj.fecha = CURRENT_DATE
      LEFT JOIN LATERAL (
        SELECT folio, titulo FROM Tareas_Asignadas
        WHERE id_ingeniero = u.id AND estatus != 'Completada'
        ORDER BY fecha_limite ASC LIMIT 1
      ) t ON true
      WHERE u.rol = 'ingeniero'
      ORDER BY u.nombre_completo
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al obtener estatus del equipo' });
  }
});

module.exports = router;