const express = require('express');
const pool = require('../db/pool');
const verificarToken = require('../middleware/auth');

const router = express.Router();

// Obtener todos los sitios (para selects, autocompletados, etc.)
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Sitios ORDER BY nombre_sitio');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al obtener sitios' });
  }
});

// Crear un sitio nuevo
router.post('/', verificarToken, async (req, res) => {
  const { id_sitio, nombre_sitio, plaza_cliente, calle, colonia, municipio, estado, cp, zona, plaza_cobertura, tipo_zona, latitud, longitud } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO Sitios (id_sitio, nombre_sitio, plaza_cliente, calle, colonia, municipio, estado, cp, zona, plaza_cobertura, tipo_zona, latitud, longitud)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [id_sitio, nombre_sitio, plaza_cliente, calle, colonia, municipio, estado, cp, zona, plaza_cobertura, tipo_zona, latitud, longitud]
    );
    res.json({ success: true, sitio: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al crear sitio' });
  }
});

module.exports = router;