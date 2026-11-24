const pool = require('./pool');

const ESTATUS_VALIDOS = ['mesa', 'campo', 'comida', 'proyecto', 'vacaciones', 'sin_reportar'];

const ETIQUETAS = {
  mesa: 'En mesa',
  campo: 'En campo',
  comida: 'En comida',
  proyecto: 'En proyecto',
  vacaciones: 'Vacaciones',
  sin_reportar: 'No se reportó',
};

// Opciones que el ISM ve en su selector de estatus -> estatus de la BD que las agrupa.
const ACTIVIDADES = {
  'Offline': 'sin_reportar',
  'Available': 'mesa',
  'Lunch': 'comida',
  'Break': 'comida',
  'Asistencia en campo': 'campo',
  'Atención Grupos de Whatsapp': 'mesa',
  'Atención Correo': 'mesa',
  'Atendiendo Backlog': 'mesa',
  'Capacitación - Reunión': 'proyecto',
  'Idle': 'mesa',
  'Outbound Calls': 'mesa',
};

/**
 * Guarda el estatus del día de un ingeniero en registros_jornada (una fila por ingeniero y día).
 * La vista vw_estatus_actual_ingenieros y el dashboard leen de aquí.
 */
async function setEstatusJornada(userId, estatus, db = pool) {
  const texto = String(estatus || '').trim();
  const actividad = Object.keys(ACTIVIDADES).find((k) => k.toLowerCase() === texto.toLowerCase());
  const clave = actividad ? ACTIVIDADES[actividad] : texto.toLowerCase();
  const etiqueta = actividad || ETIQUETAS[clave];
  if (!ESTATUS_VALIDOS.includes(clave)) {
    const error = new Error('Estatus de actividad no válido.');
    error.status = 400;
    throw error;
  }

  await db.query(
    `
      INSERT INTO public.registros_jornada
        (id_ingeniero, fecha, hora_entrada, estatus, estatus_actual, actualizado_en)
      VALUES ($1, CURRENT_DATE, CASE WHEN $2 = 'sin_reportar' THEN NULL ELSE CURRENT_TIME END, $2, $3, NOW())
      ON CONFLICT (id_ingeniero, fecha)
      DO UPDATE SET
        estatus = EXCLUDED.estatus,
        estatus_actual = EXCLUDED.estatus_actual,
        hora_entrada = COALESCE(registros_jornada.hora_entrada, EXCLUDED.hora_entrada),
        hora_salida = CASE WHEN EXCLUDED.estatus = 'sin_reportar' THEN CURRENT_TIME ELSE NULL END,
        hora_inicio_comida = CASE WHEN EXCLUDED.estatus = 'comida' THEN CURRENT_TIME ELSE registros_jornada.hora_inicio_comida END,
        hora_fin_comida = CASE WHEN registros_jornada.estatus = 'comida' AND EXCLUDED.estatus <> 'comida' THEN CURRENT_TIME ELSE registros_jornada.hora_fin_comida END,
        actualizado_en = NOW()
    `,
    [Number(userId), clave, etiqueta]
  );
  return clave;
}

module.exports = { setEstatusJornada, ESTATUS_VALIDOS, ACTIVIDADES };
