const jwt = require('jsonwebtoken');

const pool = require('../db/pool');

/*
  Normaliza los roles actuales y sus equivalencias anteriores.
*/
function normalizarRol(rol) {
  const valor = String(rol || '').trim().toLowerCase();

  const equivalencias = {
    admin: 'admin',

    supervisor: 'supervisor',
    supervisor_administrador: 'supervisor',

    distribuidor: 'distribuidor',
    distribuidor_onsite: 'distribuidor',

    ingeniero: 'ISM/MESA',
    ism_mesa: 'ISM/MESA',
    'ism/mesa': 'ISM/MESA',
  };

  return equivalencias[valor] || valor;
}

/*
  Verifica el token y guarda sus datos en req.usuario.

  La existencia y activación de la cuenta se verifican:
  - En auth.routes.js, mediante verificarCuentaActiva.
  - En turnos.routes.js, mediante permitirRoles.
*/
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  const coincidencia =
    typeof authHeader === 'string'
      ? authHeader.trim().match(/^Bearer\s+(\S+)$/i)
      : null;

  if (!coincidencia) {
    return res.status(401).json({
      success: false,
      message: 'Debes enviar un token con el formato Bearer TOKEN.',
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET no está configurado.');

    return res.status(500).json({
      success: false,
      message: 'La autenticación del servidor no está configurada.',
    });
  }

  const token = coincidencia[1];

  jwt.verify(token, process.env.JWT_SECRET, (error, usuario) => {
    if (error) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado.',
      });
    }

    const usuarioId = Number(usuario?.id);

    if (
      !usuario ||
      typeof usuario !== 'object' ||
      !Number.isSafeInteger(usuarioId) ||
      usuarioId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message: 'La sesión no es válida. Inicia sesión nuevamente.',
      });
    }

    req.usuario = {
      ...usuario,
      id: usuarioId,
      rol: normalizarRol(usuario.rol),
    };

    return next();
  });
}

/*
  Autoriza según el rol ACTUAL guardado en PostgreSQL.

  Debe ejecutarse después de verificarToken.

  Ejemplo:
  router.use(
    verificarToken,
    permitirRoles('admin', 'supervisor'),
  );
*/
function permitirRoles(...roles) {
  const rolesPermitidos = new Set(
    roles.map((rol) => normalizarRol(rol)),
  );

  return async function verificarPermisos(req, res, next) {
    try {
      const usuarioId = Number(req.usuario?.id);

      if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
        return res.status(401).json({
          success: false,
          message: 'Debes iniciar sesión para continuar.',
        });
      }

      const result = await pool.query(
        `
          SELECT
            id,
            rol,
            activo
          FROM public.usuarios
          WHERE id = $1
        `,
        [usuarioId],
      );

      if (result.rowCount === 0) {
        return res.status(401).json({
          success: false,
          message: 'La cuenta de la sesión ya no existe.',
        });
      }

      const usuario = result.rows[0];

      if (!usuario.activo) {
        return res.status(403).json({
          success: false,
          message: 'Tu cuenta está desactivada.',
        });
      }

      const rolActual = normalizarRol(usuario.rol);

      if (!rolesPermitidos.has(rolActual)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta operación.',
        });
      }

      req.usuario = {
        ...req.usuario,
        id: usuario.id,
        rol: rolActual,
      };

      return next();
    } catch (error) {
      console.error('Error al verificar permisos:', error);

      return res.status(500).json({
        success: false,
        message: 'No fue posible verificar los permisos de la cuenta.',
      });
    }
  };
}

/*
  Conserva la importación existente:
  const verificarToken = require('../middleware/auth');
*/
module.exports = verificarToken;

/*
  Permite también estas importaciones:
  const { verificarToken } = require('../middleware/auth');
  const { permitirRoles } = require('../middleware/auth');
*/
module.exports.verificarToken = verificarToken;
module.exports.permitirRoles = permitirRoles;