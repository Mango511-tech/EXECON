import {
  EmailOutlined,
  LockOutlined,
  Visibility,
  VisibilityOff,
  VerifiedUserOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';

const ROLES_SUPERVISOR = ['supervisor', 'admin'];
const RUTAS_SUPERVISOR = [
  '/dashboard', '/distribucion-onsite', '/planeacion',
  '/turnos', '/usuarios', '/configuracion',
];
const RUTAS_DISTRIBUIDOR = [
  '/distribuidor', '/distribuidor/incidentes',
  '/distribuidor/onsite', '/distribuidor/configuracion',
];

function obtenerDestino(rol, rutaSolicitada) {
  let rutaInicial = '/sin-acceso';
  let rutasPermitidas = [];
  if (rol === 'distribuidor') {
    rutaInicial = '/distribuidor';
    rutasPermitidas = RUTAS_DISTRIBUIDOR;
  } else if (ROLES_SUPERVISOR.includes(rol)) {
    rutaInicial = '/dashboard';
    rutasPermitidas = RUTAS_SUPERVISOR;
  }
  return rutasPermitidas.includes(rutaSolicitada) ? rutaSolicitada : rutaInicial;
}

/* Isotipo EXECON (dos eslabones hexagonales entrelazados) */
function IsotipoExecon({ size = 40, color = '#FFFFFF', strokeWidth = 14, sx }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 220 120"
      sx={{ width: size * 1.83, height: size, display: 'block', ...sx }}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Eslabón izquierdo */}
      <path d="M95 20 H45 L15 60 L45 100 H80 L100 75 H60" />
      {/* Eslabón derecho */}
      <path d="M125 100 H175 L205 60 L175 20 H140 L120 45 H160" />
    </Box>
  );
}

const estiloInput = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: '#F4F7FA',
    fontSize: '0.92rem',
    '& fieldset': { borderColor: '#DDE3EA' },
    '&:hover fieldset': { borderColor: '#B8C4D1' },
    '&.Mui-focused': { bgcolor: '#FFFFFF' },
    '&.Mui-focused fieldset': { borderColor: '#003359', borderWidth: 1.5 },
  },
};

const estiloEtiqueta = {
  display: 'block',
  mb: 0.7,
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#334155',
};

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (cargando) return;

    const correoLimpio = correo.trim().toLowerCase();
    if (!correoLimpio || !contrasena) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    setError('');
    setCargando(true);

    try {
      const response = await api.post('/auth/login', {
        correo: correoLimpio,
        contrasena,
      });
      const { token, usuario } = response.data || {};

      if (
        typeof token !== 'string' || !token.trim() ||
        !usuario || typeof usuario !== 'object' || Array.isArray(usuario)
      ) {
        setError('El servidor no devolvió una sesión válida.');
        return;
      }

      const rol = String(usuario.rol || '').trim().toLowerCase();
      if (!rol) {
        setError('Tu cuenta no tiene un rol definido. Contacta al administrador.');
        return;
      }

      try {
        localStorage.setItem('execon_token', token);
        localStorage.setItem('execon_usuario', JSON.stringify({ ...usuario, rol }));
      } catch {
        localStorage.removeItem('execon_token');
        localStorage.removeItem('execon_usuario');
        setError('No fue posible guardar la sesión en este navegador.');
        return;
      }

      const destino = obtenerDestino(rol, location.state?.from?.pathname);
      navigate(destino, { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'No fue posible conectar con el servidor. Verifica que el backend esté encendido.',
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 4 },
        background:
          'radial-gradient(ellipse at 50% 0%, #0B4A7A 0%, #062F52 40%, #021A30 100%)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          maxWidth: 710,
          minHeight: 408,
          borderRadius: '22px',
          overflow: 'hidden',
          boxShadow: '0 30px 70px rgba(0, 8, 20, 0.55)',
        }}
      >
        {/* PANEL IZQUIERDO */}
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            p: 4,
            background: 'linear-gradient(160deg, #0A3358 0%, #062A4A 55%, #05243F 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRight: 'none',
            borderRadius: '22px 0 0 22px',
          }}
        >
          {/* Logo superior */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, zIndex: 2 }}>
            <IsotipoExecon size={22} strokeWidth={18} />
            <Box sx={{ lineHeight: 1 }}>
              <Typography
                sx={{
                  color: '#FFFFFF',
                  fontSize: '1.15rem',
                  fontWeight: 600,
                  letterSpacing: '0.28em',
                  lineHeight: 1,
                }}
              >
                EXECON
              </Typography>
              <Typography
                sx={{
                  color: '#FFFFFF',
                  fontSize: '0.55rem',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  mt: 0.4,
                }}
              >
                SMART SOLUTIONS
              </Typography>
            </Box>
          </Box>

          {/* Isotipo grande verde translúcido */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -52%)',
              opacity: 0.45,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <IsotipoExecon size={170} color="#2E7D6B" strokeWidth={26} />
          </Box>

          {/* Mensaje de seguridad */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, zIndex: 2 }}>
            <VerifiedUserOutlined sx={{ fontSize: 16, color: '#34D399', mt: 0.2 }} />
            <Typography sx={{ color: '#A9BCCF', fontSize: '0.72rem', lineHeight: 1.6 }}>
              Acceso seguro con cifrado corporativo y control de acceso basado en roles (RBAC).
            </Typography>
          </Box>
        </Box>

        {/* PANEL DERECHO: FORMULARIO */}
        <Box
          sx={{
            flex: 1,
            bgcolor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            px: { xs: 3.5, sm: 4.5 },
            py: 5,
            borderRadius: { xs: '22px', md: '0 22px 22px 0' },
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography sx={{ color: '#0F172A', fontSize: '1.3rem', fontWeight: 600 }}>
              Iniciar sesión
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.8rem', mt: 0.5 }}>
              Ingresa tus credenciales corporativas
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '10px', fontSize: '0.78rem' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography component="label" htmlFor="correo" sx={estiloEtiqueta}>
              Correo electrónico
            </Typography>
            <TextField
              id="correo"
              type="email"
              placeholder="usuario@execon.mx"
              autoComplete="username"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              disabled={cargando}
              fullWidth
              size="small"
              sx={{ ...estiloInput, mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined sx={{ fontSize: 18, color: '#94A3B8' }} />
                  </InputAdornment>
                ),
              }}
            />

            <Typography component="label" htmlFor="contrasena" sx={estiloEtiqueta}>
              Contraseña
            </Typography>
            <TextField
              id="contrasena"
              type={mostrarContrasena ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              disabled={cargando}
              fullWidth
              size="small"
              sx={{ ...estiloInput, mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined sx={{ fontSize: 18, color: '#94A3B8' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setMostrarContrasena((v) => !v)}
                      disabled={cargando}
                    >
                      {mostrarContrasena ? (
                        <VisibilityOff sx={{ fontSize: 18 }} />
                      ) : (
                        <Visibility sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={cargando}
              sx={{
                minHeight: 44,
                borderRadius: '10px',
                bgcolor: '#062F52',
                fontWeight: 600,
                fontSize: '0.88rem',
                textTransform: 'none',
                boxShadow: '0 8px 20px rgba(6, 47, 82, 0.35)',
                '&:hover': { bgcolor: '#04223D' },
                '&.Mui-disabled': { bgcolor: '#94A3B8', color: '#FFFFFF' },
              }}
            >
              {cargando ? <CircularProgress size={20} color="inherit" /> : 'Iniciar sesión'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default LoginPage;