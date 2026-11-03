const express = require('express');
const pool = require('../db/pool');
const verificarToken = require('../middleware/auth');

const router = express.Router();

// Lista de métricas por ingeniero
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.nombre_completo,
             m.incidentes_cerrados, m.service_requests_cerrados, m.en_vacaciones
      FROM Usuarios u
      LEFT JOIN Metricas_Ingenieros m ON u.id = m.id_ingeniero
      WHERE u.rol = 'ingeniero'
      ORDER BY u.nombre_completo
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al obtener métricas' });
  }
});

// Actualizar la métrica de un ingeniero (edición manual desde el panel)
router.patch('/:id', verificarToken, async (req, res) => {
  const { incidentes_cerrados, service_requests_cerrados, en_vacaciones } = req.body;
  try {
    const result = await pool.query(
      `UPDATE Metricas_Ingenieros
       SET incidentes_cerrados = $1, service_requests_cerrados = $2, en_vacaciones = $3
       WHERE id_ingeniero = $4 RETURNING *`,
      [incidentes_cerrados, service_requests_cerrados, en_vacaciones, req.params.id]
    );
    res.json({ success: true, metrica: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al actualizar métrica' });
  }
});

module.exports = router;

// Porcentaje de ingenieros que se reportaron cada día (últimos 7 días)
router.get('/actividad-diaria', verificarToken, async (req, res) => {
  try {
    const totalResult = await pool.query("SELECT COUNT(*) FROM Usuarios WHERE rol = 'ingeniero'");
    const totalIngenieros = parseInt(totalResult.rows[0].count);

    const result = await pool.query(`
      SELECT fecha, COUNT(DISTINCT id_ingeniero) AS reportados
      FROM Registros_Jornada
      WHERE fecha >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY fecha
    `);

    // Armamos los últimos 7 días completos, aunque algún día no tenga registros (se muestra en 0)
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().slice(0, 10);

      const encontrado = result.rows.find(r => r.fecha.toISOString().slice(0, 10) === fechaStr);
      const reportados = encontrado ? parseInt(encontrado.reportados) : 0;

      dias.push({
        fecha: fechaStr,
        reportados,
        porcentaje: totalIngenieros > 0 ? Math.round((reportados / totalIngenieros) * 100) : 0
      });
    }

    const promedioSemanal = dias.length > 0
      ? Math.round(dias.reduce((sum, d) => sum + d.porcentaje, 0) / dias.length)
      : 0;

    res.json({ totalIngenieros, dias, promedioSemanal });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al obtener actividad diaria' });
  }
});

router.get('/incidentes-cliente', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.plaza_cliente,
        COUNT(*) FILTER (WHERE t.problema_resuelto IS NOT TRUE) AS caidos,
        COUNT(*) FILTER (WHERE t.problema_resuelto IS TRUE) AS levantados
      FROM Tareas_Asignadas t
      JOIN Sitios s ON t.id_sitio = s.id_sitio
      GROUP BY s.plaza_cliente
      ORDER BY s.plaza_cliente
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error al obtener incidentes por cliente' });
  }
});