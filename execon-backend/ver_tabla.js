const pool = require('./db/pool');

async function verColumnas() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'incidentes'
    ORDER BY ordinal_position;
  `);
  console.log('Columnas en la tabla incidentes:', res.rows);
  process.exit();
}
verColumnas();