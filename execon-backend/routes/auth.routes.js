const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = require('../db/pool');
const verificarToken = require('../middleware/auth');

const router = express.Router();

const ROLES_PERMITIDOS = [
  'admin',
  'supervisor',
  'distribuidor',
  'ISM/MESA',
];

function normalizarCorreo(correo) {
  return String(correo || '').trim().toLowerCase();
}

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

function normalizarUsuario(usuario) {
  return {
    ...usuario,
    rol: normalizarRol(usuario.rol),
  };
}

/*
  Verifica en la base que la cuenta siga existiendo y activa.
  Se ejecuta después de verificarToken en las rutas privadas
  de este archivo.
*/
async function verificarCuentaActiva(request, response, next) {
  try {
    const usuarioId = Number(request.usuario?.id);

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return response.status(401).json({
        success: false,
        message: 'La sesión no es válida. Inicia sesión nuevamente.',
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
      return response.status(401).json({
        success: false,
        message: 'La cuenta de la sesión ya no existe.',
      });
    }

    const usuario = result.rows[0];

    if (!usuario.activo) {
      return response.status(403).json({
        success: false,
        message: 'Tu cuenta está desactivada.',
      });
    }

    const rol = normalizarRol(usuario.rol);

    if (!ROLES_PERMITIDOS.includes(rol)) {
      return response.status(403).json({
        success: false,
        message:
          'Tu cuenta no tiene un rol válido. Contacta al administrador.',
      });
    }

    request.usuario = {
      ...request.usuario,
      id: usuario.id,
      rol,
    };

    return next();
  } catch (error) {
    console.error('Error al verificar cuenta activa:', error);

    return response.status(500).json({
      success: false,
      message: 'No fue posible verificar la cuenta de la sesión.',
    });
  }
}

/*
  POST /api/auth/login
*/
router.post('/login', async (request, response) => {
  try {
    const correo = normalizarCorreo(request.body?.correo);

    const contrasena = String(
      request.body?.contrasena || '',
    );

    if (!correo || !contrasena) {
      return response.status(400).json({
        success: false,
        message: 'Correo y contraseña son obligatorios.',
      });
    }

    const result = await pool.query(
      `
        SELECT
          id,
          nombre_completo,
          correo,
          contrasena,
          rol,
          activo
        FROM public.usuarios
        WHERE LOWER(correo) = $1
      `,
      [correo],
    );

    if (result.rowCount === 0) {
      return response.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    if (result.rowCount > 1) {
      console.error(
        'Login rechazado: más de una cuenta coincide con el correo.',
      );

      return response.status(500).json({
        success: false,
        message:
          'No fue posible validar la cuenta. Contacta al administrador.',
      });
    }

    const usuario = result.rows[0];

    const coincide = await bcrypt.compare(
      contrasena,
      usuario.contrasena,
    );

    if (!coincide) {
      return response.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    if (!usuario.activo) {
      return response.status(403).json({
        success: false,
        message:
          'Tu cuenta está desactivada. Contacta al administrador.',
      });
    }

    const rolNormalizado = normalizarRol(usuario.rol);

    if (!ROLES_PERMITIDOS.includes(rolNormalizado)) {
      return response.status(403).json({
        success: false,
        message:
          'Tu cuenta no tiene un rol válido. Contacta al administrador.',
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET no está configurado.');

      return response.status(500).json({
        success: false,
        message: 'La autenticación del servidor no está configurada.',
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        rol: rolNormalizado,
        nombre: usuario.nombre_completo,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h',
      },
    );

    await pool.query(
      `
        UPDATE public.usuarios
        SET ultimo_acceso = NOW()
        WHERE id = $1
      `,
      [usuario.id],
    );

    return response.json({
      success: true,
      token,
      usuario: {
        id: usuario.id,
        nombreCompleto: usuario.nombre_completo,
        correo: usuario.correo,
        rol: rolNormalizado,
      },
    });
  } catch (error) {
    console.error('Error durante inicio de sesión:', error);

    return response.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
});

/*
  POST /api/auth/registrar

  Deshabilitado: la creación de usuarios se concentra
  en POST /api/usuarios.
*/
router.post('/registrar', (request, response) => {
  return response.status(410).json({
    success: false,
    message:
      'Este endpoint de registro está deshabilitado. Usa Gestión de Usuarios.',
  });
});

/*
  Las rutas siguientes requieren token y una cuenta activa.
*/
router.use(verificarToken, verificarCuentaActiva);

/*
  GET /api/auth/me
*/
router.get('/me', async (request, response) => {
  try {
    const result = await pool.query(
      `
        SELECT
          id,
          nombre_completo AS "nombreCompleto",
          correo,
          rol,
          activo,
          creado_en AS "creadoEn",
          ultimo_acceso AS "ultimoAcceso"
        FROM public.usuarios
        WHERE id = $1
      `,
      [request.usuario.id],
    );

    if (result.rowCount === 0) {
      return response.status(404).json({
        success: false,
        message: 'No se encontró el usuario de la sesión.',
      });
    }

    const usuario = result.rows[0];

    if (!usuario.activo) {
      return response.status(403).json({
        success: false,
        message: 'Tu cuenta está desactivada.',
      });
    }

    return response.json({
      success: true,
      data: normalizarUsuario(usuario),
    });
  } catch (error) {
    console.error('Error al consultar perfil:', error);

    return response.status(500).json({
      success: false,
      message: 'No fue posible obtener la información de tu cuenta.',
    });
  }
});

/*
  PATCH /api/auth/mi-perfil

  No permite modificar el rol ni elegir otro usuario.
*/
router.patch('/mi-perfil', async (request, response) => {
  try {
    const nombreCompleto = String(
      request.body?.nombreCompleto || '',
    ).trim();

    const correo = normalizarCorreo(request.body?.correo);

    if (!nombreCompleto || !correo) {
      return response.status(400).json({
        success: false,
        message: 'Nombre completo y correo son obligatorios.',
      });
    }

    if (!correo.includes('@')) {
      return response.status(400).json({
        success: false,
        message: 'Ingresa un correo electrónico válido.',
      });
    }

    const correoExistente = await pool.query(
      `
        SELECT id
        FROM public.usuarios
        WHERE LOWER(correo) = $1
          AND id <> $2
      `,
      [correo, request.usuario.id],
    );

    if (correoExistente.rowCount > 0) {
      return response.status(409).json({
        success: false,
        message: 'Ese correo ya está asignado a otra cuenta.',
      });
    }

    const result = await pool.query(
      `
        UPDATE public.usuarios
        SET
          nombre_completo = $1,
          correo = $2
        WHERE id = $3
          AND activo = TRUE
        RETURNING
          id,
          nombre_completo AS "nombreCompleto",
          correo,
          rol,
          activo,
          creado_en AS "creadoEn",
          ultimo_acceso AS "ultimoAcceso"
      `,
      [
        nombreCompleto,
        correo,
        request.usuario.id,
      ],
    );

    if (result.rowCount === 0) {
      return response.status(403).json({
        success: false,
        message: 'La cuenta ya no está disponible para actualizar.',
      });
    }

    return response.json({
      success: true,
      message: 'Perfil actualizado correctamente.',
      data: normalizarUsuario(result.rows[0]),
    });
  } catch (error) {
    if (error.code === '23505') {
      return response.status(409).json({
        success: false,
        message: 'Ese correo ya está asignado a otra cuenta.',
      });
    }

    console.error('Error al actualizar perfil:', error);

    return response.status(500).json({
      success: false,
      message: 'No fue posible actualizar el perfil.',
    });
  }
});

/*
  GET /api/auth/preferencias
*/
router.get('/preferencias', async (request, response) => {
  try {
    await pool.query(
      `
        INSERT INTO public.preferencias_usuario (id_usuario)
        VALUES ($1)
        ON CONFLICT (id_usuario) DO NOTHING
      `,
      [request.usuario.id],
    );

    const result = await pool.query(
      `
        SELECT
          tema,
          idioma,
          notificaciones,
          recordatorios_onsite AS "recordatoriosOnsite",
          confirmar_cierre_sesion AS "confirmarCierreSesion",
          registros_por_pagina AS "registrosPorPagina",
          actualizado_en AS "actualizadoEn"
        FROM public.preferencias_usuario
        WHERE id_usuario = $1
      `,
      [request.usuario.id],
    );

    return response.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error al obtener preferencias:', error);

    return response.status(500).json({
      success: false,
      message: 'No fue posible obtener las preferencias.',
    });
  }
});

/*
  PATCH /api/auth/preferencias

  Conserva el contrato existente: requiere todos
  los campos de preferencias.
*/
router.patch('/preferencias', async (request, response) => {
  try {
    const {
      tema,
      idioma,
      notificaciones,
      recordatoriosOnsite,
      confirmarCierreSesion,
      registrosPorPagina,
    } = request.body || {};

    const temasValidos = ['claro', 'oscuro', 'sistema'];
    const idiomasValidos = ['es-MX', 'en-US'];
    const registrosValidos = [10, 20, 50];

    const temaLimpio = String(tema || '').trim();
    const idiomaLimpio = String(idioma || '').trim();
    const registros = Number(registrosPorPagina);

    if (!temasValidos.includes(temaLimpio)) {
      return response.status(400).json({
        success: false,
        message: 'El tema seleccionado no es válido.',
      });
    }

    if (!idiomasValidos.includes(idiomaLimpio)) {
      return response.status(400).json({
        success: false,
        message: 'El idioma seleccionado no es válido.',
      });
    }

    if (
      typeof notificaciones !== 'boolean' ||
      typeof recordatoriosOnsite !== 'boolean' ||
      typeof confirmarCierreSesion !== 'boolean'
    ) {
      return response.status(400).json({
        success: false,
        message:
          'Las preferencias booleanas deben ser verdadero o falso.',
      });
    }

    if (!registrosValidos.includes(registros)) {
      return response.status(400).json({
        success: false,
        message:
          'La cantidad de registros por página no es válida.',
      });
    }

    const result = await pool.query(
      `
        INSERT INTO public.preferencias_usuario (
          id_usuario,
          tema,
          idioma,
          notificaciones,
          recordatorios_onsite,
          confirmar_cierre_sesion,
          registros_por_pagina,
          actualizado_en
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id_usuario)
        DO UPDATE SET
          tema = EXCLUDED.tema,
          idioma = EXCLUDED.idioma,
          notificaciones = EXCLUDED.notificaciones,
          recordatorios_onsite = EXCLUDED.recordatorios_onsite,
          confirmar_cierre_sesion =
            EXCLUDED.confirmar_cierre_sesion,
          registros_por_pagina = EXCLUDED.registros_por_pagina,
          actualizado_en = NOW()
        RETURNING
          tema,
          idioma,
          notificaciones,
          recordatorios_onsite AS "recordatoriosOnsite",
          confirmar_cierre_sesion AS "confirmarCierreSesion",
          registros_por_pagina AS "registrosPorPagina",
          actualizado_en AS "actualizadoEn"
      `,
      [
        request.usuario.id,
        temaLimpio,
        idiomaLimpio,
        notificaciones,
        recordatoriosOnsite,
        confirmarCierreSesion,
        registros,
      ],
    );

    return response.json({
      success: true,
      message: 'Preferencias actualizadas correctamente.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error al actualizar preferencias:', error);

    return response.status(500).json({
      success: false,
      message: 'No fue posible actualizar las preferencias.',
    });
  }
});

/*
  PATCH /api/auth/cambiar-contrasena
*/
router.patch('/cambiar-contrasena', async (request, response) => {
  try {
    const contrasenaActual = String(
      request.body?.contrasenaActual || '',
    );

    const nuevaContrasena = String(
      request.body?.nuevaContrasena || '',
    );

    if (!contrasenaActual || !nuevaContrasena) {
      return response.status(400).json({
        success: false,
        message:
          'La contraseña actual y la nueva contraseña son obligatorias.',
      });
    }

    if (nuevaContrasena.length < 8) {
      return response.status(400).json({
        success: false,
        message:
          'La nueva contraseña debe tener al menos 8 caracteres.',
      });
    }

    // Evita aceptar contraseñas que excedan el límite de bcrypt.
    if (Buffer.byteLength(nuevaContrasena, 'utf8') > 72) {
      return response.status(400).json({
        success: false,
        message:
          'La nueva contraseña es demasiado larga. Usa como máximo 72 bytes en UTF-8.',
      });
    }

    if (contrasenaActual === nuevaContrasena) {
      return response.status(400).json({
        success: false,
        message:
          'La nueva contraseña debe ser diferente a la actual.',
      });
    }

    const usuarioResult = await pool.query(
      `
        SELECT
          id,
          contrasena,
          activo
        FROM public.usuarios
        WHERE id = $1
      `,
      [request.usuario.id],
    );

    if (usuarioResult.rowCount === 0) {
      return response.status(404).json({
        success: false,
        message: 'No se encontró el usuario de la sesión.',
      });
    }

    const usuario = usuarioResult.rows[0];

    if (!usuario.activo) {
      return response.status(403).json({
        success: false,
        message: 'Tu cuenta está desactivada.',
      });
    }

    const coincide = await bcrypt.compare(
      contrasenaActual,
      usuario.contrasena,
    );

    if (!coincide) {
      return response.status(401).json({
        success: false,
        message: 'La contraseña actual es incorrecta.',
      });
    }

    const nuevoHash = await bcrypt.hash(nuevaContrasena, 10);

    const result = await pool.query(
      `
        UPDATE public.usuarios
        SET contrasena = $1
        WHERE id = $2
          AND activo = TRUE
        RETURNING id
      `,
      [nuevoHash, request.usuario.id],
    );

    if (result.rowCount === 0) {
      return response.status(403).json({
        success: false,
        message: 'La cuenta ya no está disponible para actualizar.',
      });
    }

    return response.json({
      success: true,
      message: 'Contraseña actualizada correctamente.',
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);

    return response.status(500).json({
      success: false,
      message: 'No fue posible cambiar la contraseña.',
    });
  }
});

module.exports = router;