const express = require('express');
const pool = require('../db/pool');
const verificarToken = require('../middleware/auth');

const router = express.Router();

// Lista de onsites (para la tabla del dashboard)
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.estatus, o.solicitado_en, o.asignado_en,
             uc.nombre_completo AS ingeniero_campo,
             um.nombre_completo AS ingeniero_mesa,
             s.nombre_sitio
      FROM Onsites o
      LEFT JOIN Usuarios uc ON o.id_ingeniero_campo = uc.id
      LEFT JOIN Usuarios um ON o.id_ingeniero_mesa = um.id
      LEFT JOIN Sitios s ON o.id_sitio = s.id_sitio
      ORDER BY o.solicitado_en DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al obtener onsites' });
  }
});

// El ingeniero de campo solicita un onsite (esto lo usará la app móvil más adelante)
router.post('/', verificarToken, async (req, res) => {
  const { id_ingeniero_campo, id_sitio } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Onsites (id_ingeniero_campo, id_sitio) VALUES ($1, $2) RETURNING *`,
      [id_ingeniero_campo, id_sitio]
    );
    res.json({ success: true, onsite: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al solicitar onsite' });
  }
});

// Asignar (o autoasignar) un onsite a un ingeniero de mesa
router.patch('/:id/asignar', verificarToken, async (req, res) => {
  const { id_ingeniero_mesa } = req.body;
  try {
    const result = await pool.query(
      `UPDATE Onsites 
       SET id_ingeniero_mesa = $1, estatus = 'asignado', asignado_en = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [id_ingeniero_mesa, req.params.id]
    );
    res.json({ success: true, onsite: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al asignar onsite' });
  }
});

module.exports = router;