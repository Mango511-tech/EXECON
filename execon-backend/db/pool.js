const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
});

pool
  .query('SELECT NOW() AS fecha_servidor')
  .then((result) => {
    console.log(
      `🟢 Conectado exitosamente a PostgreSQL (${process.env.DB_NAME})`,
    );
    console.log(
      `🕒 Hora del servidor PostgreSQL: ${result.rows[0].fecha_servidor}`,
    );
  })
  .catch((error) => {
    console.error(
      '🔴 Error al conectar con PostgreSQL:',
      error.message,
    );
  });

pool.on('error', (error) => {
  console.error(
    '🔴 Error inesperado en un cliente inactivo de PostgreSQL:',
    error.message,
  );
});

module.exports = pool;