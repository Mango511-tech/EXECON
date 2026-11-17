const fs = require('node:fs');
const path = require('node:path');
const pool = require('./pool');

async function migrate() {
  const migrationPath = path.join(__dirname, 'migrations', '001_incident_onsite_fields.sql');
  const migration = fs.readFileSync(migrationPath, 'utf8');

  try {
    await pool.query(migration);
    console.log('Migración de campos de incidentes aplicada correctamente.');
  } catch (error) {
    console.error('No fue posible aplicar la migración de incidentes:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
