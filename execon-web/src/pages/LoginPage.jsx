import {
  EmailOutlined,
  LockOutlined,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import api from '../api/client';

// Estos valores deben coincidir con App.jsx y con el backend.
const ROLES_SUPERVISOR = ['supervisor', 'admin'];

const RUTAS_SUPERVISOR = [
  '/dashboard',
  '/distribucion-onsite',
  '/planeacion',
   '/turnos',
  '/usuarios',
  '/configuracion',
];

const RUTAS_DISTRIBUIDOR = [
  '/distribuidor',
  '/distribuidor/incidentes',
  '/distribuidor/onsite',
  '/distribuidor/configuracion',
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

  return rutasPermitidas.includes(rutaSolicitada)
    ? rutaSolicitada
    : rutaInicial;
}

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
        typeof token !== 'string' ||
        !token.trim() ||
        !usuario ||
        typeof usuario !== 'object' ||
        Array.isArray(usuario)
      ) {
        setError('El servidor no devolvió una sesión válida.');
        return;
      }

      const rol = String(usuario.rol || '').trim().toLowerCase();

      if (!rol) {
        setError(
          'Tu cuenta no tiene un rol definido. Contacta al administrador.',
        );
        return;
      }

      const usuarioSesion = {
        ...usuario,
        rol,
      };

      try {
        localStorage.setItem('execon_token', token);
        localStorage.setItem(
          'execon_usuario',
          JSON.stringify(usuarioSesion),
        );
      } catch {
        localStorage.removeItem('execon_token');
        localStorage.removeItem('execon_usuario');

        setError(
          'No fue posible guardar la sesión en este navegador.',
        );
        return;
      }

      const rutaSolicitada = location.state?.from?.pathname;
      const destino = obtenerDestino(rol, rutaSolicitada);

      navigate(destino, { replace: true });
    } catch (requestError) {
      const mensaje =
        requestError.response?.data?.message ||
        'No fue posible conectar con el servidor. Verifica que el backend esté encendido.';

      setError(mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background:
          'linear-gradient(135deg, #002642 0%, #003359 55%, #005079 100%)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 430,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component="img"
            src="/Execon_Logo.png"
            alt="EXECON Smart Solutions"
            sx={{
              width: 200,
              height: 70,
              maxWidth: '100%',
              objectFit: 'contain',
              mb: 2,
            }}
          />

          <Typography
            component="h1"
            sx={{
              color: '#003359',
              fontSize: '1.35rem',
              fontWeight: 800,
            }}
          >
            Bienvenido
          </Typography>

        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              fontSize: '0.75rem',
            }}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Correo electrónico"
            type="email"
            autoComplete="username"
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
            disabled={cargando}
            fullWidth
            required
            size="small"
            sx={{ mb: 1.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined
                    sx={{
                      color: '#64748B',
                      fontSize: 20,
                    }}
                  />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Contraseña"
            type={mostrarContrasena ? 'text' : 'password'}
            autoComplete="current-password"
            value={contrasena}
            onChange={(event) => setContrasena(event.target.value)}
            disabled={cargando}
            fullWidth
            required
            size="small"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined
                    sx={{
                      color: '#64748B',
                      fontSize: 20,
                    }}
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    type="button"
                    aria-label={
                      mostrarContrasena
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                    onClick={() =>
                      setMostrarContrasena((mostrar) => !mostrar)
                    }
                    disabled={cargando}
                  >
                    {mostrarContrasena ? (
                      <VisibilityOff fontSize="small" />
                    ) : (
                      <Visibility fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={cargando}
            sx={{
              minHeight: 42,
              bgcolor: '#003359',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': {
                bgcolor: '#002642',
              },
              '&.Mui-disabled': {
                bgcolor: '#94A3B8',
                color: '#FFFFFF',
              },
            }}
          >
            {cargando ? (
              <CircularProgress size={21} color="inherit" />
            ) : (
              'Iniciar sesión'
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default LoginPage;