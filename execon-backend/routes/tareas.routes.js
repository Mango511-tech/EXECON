const express = require('express');
const pool = require('../db/pool');
const verificarToken = require('../middleware/auth');

const router = express.Router();

// Lista de tareas con nombre de ingeniero y nombre de sitio (para la tabla del dashboard)
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.folio, t.titulo, t.prioridad, t.estatus, t.fecha_limite,
             u.nombre_completo AS ingeniero, s.nombre_sitio
      FROM Tareas_Asignadas t
      LEFT JOIN Usuarios u ON t.id_ingeniero = u.id
      LEFT JOIN Sitios s ON t.id_sitio = s.id_sitio
      ORDER BY t.creado_en DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al obtener tareas' });
  }
});

// Detalle completo de una tarea (para "Asignación de tareas")
router.get('/:folio', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.nombre_completo AS ingeniero, s.*
      FROM Tareas_Asignadas t
      LEFT JOIN Usuarios u ON t.id_ingeniero = u.id
      LEFT JOIN Sitios s ON t.id_sitio = s.id_sitio
      WHERE t.folio = $1
    `, [req.params.folio]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al obtener la tarea' });
  }
});

// Crear una tarea nueva y asignarla
router.post('/', verificarToken, async (req, res) => {
  const { folio, titulo, descripcion, prioridad, fecha_limite, id_ingeniero, id_sitio } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Tareas_Asignadas (folio, titulo, descripcion, prioridad, fecha_limite, id_ingeniero, id_sitio)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [folio, titulo, descripcion, prioridad, fecha_limite, id_ingeniero, id_sitio]
    );
    res.json({ success: true, tarea: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al crear la tarea' });
  }
});

module.exports = router;

// Actualizar documentación y resolución de una tarea
router.patch('/:folio', verificarToken, async (req, res) => {
  const { documentacion, problema_resuelto } = req.body;
  try {
    const result = await pool.query(
      `UPDATE Tareas_Asignadas
       SET documentacion = $1, problema_resuelto = $2
       WHERE folio = $3 RETURNING *`,
      [documentacion, problema_resuelto, req.params.folio]
    );
    res.json({ success: true, tarea: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar la tarea' });
  }
});