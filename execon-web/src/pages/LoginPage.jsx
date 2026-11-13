import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

/* ==========================================================================
   CONFIGURACIÓN DE TUS IMÁGENES (coloca los archivos en tu carpeta /public)
   ========================================================================== */

// 1. Imagen pequeña de arriba a la izquierda (Logo EXECON)
//    Ejemplo: '/logo-execon.png' o '/Execon_Logo.png'
const LOGO_SUPERIOR_IZQUIERDO = '/Execon_1.0.png'; 

// 2. Imagen grande/central del panel izquierdo
//    Ejemplo: '/login-brand.png' o '/isotipo.png'
const IMAGEN_PANEL_IZQUIERDO = '/Execon_2.0.png'; 

// 3. Imagen de fondo general de la pantalla (pon '/fondo-login.jpg' o null para degradado azul)
const FONDO_PAGINA = null; 

export default function LoginPage() {
  const navigate = useNavigate();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!correo.trim() || !contrasena.trim()) {
      setError('Ingresa tu correo y contraseña corporativa.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', {
        correo: correo.trim().toLowerCase(),
        contrasena,
      });

      const token = res.data?.token || res.data?.data?.token;
      const usuario = res.data?.usuario || res.data?.data?.usuario || res.data?.user;

      if (!token) {
        throw new Error('Respuesta inválida del servidor: falta token.');
      }

      localStorage.setItem('execon_token', token);
      localStorage.setItem('execon_usuario', JSON.stringify(usuario || {}));

      // Redirección según rol
      const rol = (usuario?.rol || usuario?.role || '').toUpperCase();
      if (rol.includes('DISTRIBUIDOR')) {
        navigate('/distribucion-onsite');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Credenciales inválidas o error de conexión con el servidor.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 3 },
        /* Fondo: si defines FONDO_PAGINA usa la imagen; si es null usa el degradado */
        background: FONDO_PAGINA
          ? `url(${FONDO_PAGINA}) center center / cover no-repeat`
          : 'radial-gradient(circle at 50% 45%, #0B2A4A 0%, #061B31 60%, #030F1C 100%)',
      }}
    >
      {/* Tarjeta Split-Screen Corporativa */}
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 900,
          minHeight: 500,
          borderRadius: 4, // 24px
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.08fr 1fr' },
          boxShadow: '0 25px 60px -15px rgba(0, 10, 25, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* PANEL IZQUIERDO: Branding EXECON */}
        <Box
          sx={{
            p: { xs: 3.5, md: 5 },
            background: 'linear-gradient(180deg, #0A2B4C 0%, #061F38 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 1. APARTADO: Imagen pequeña de arriba a la izquierda */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, zIndex: 2 }}>
            {LOGO_SUPERIOR_IZQUIERDO ? (
              <Box
                component="img"
                src={LOGO_SUPERIOR_IZQUIERDO}
                alt="EXECON Smart Solutions"
                sx={{
                  maxHeight: 38,
                  maxWidth: 180,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            ) : (
              /* Fallback por si dejas LOGO_SUPERIOR_IZQUIERDO en null */
              <>
                <Box
                  component="svg"
                  viewBox="0 0 220 120"
                  sx={{ width: 34, height: 18.5, display: 'block' }}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M95 20 H45 L15 60 L45 100 H80 L100 75 H60" />
                  <path d="M125 100 H175 L205 60 L175 20 H140 L120 45 H160" />
                </Box>
                <Box>
                  <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.22em', lineHeight: 1 }}>
                    EXECON
                  </Typography>
                  <Typography sx={{ color: '#7E96B4', fontWeight: 600, fontSize: '0.52rem', letterSpacing: '0.1em', mt: 0.3 }}>
                    SMART SOLUTIONS
                  </Typography>
                </Box>
              </>
            )}
          </Box>

          {/* 2. APARTADO: Imagen grande/central del Panel Izquierdo */}
          <Box
            sx={{
              my: 'auto',
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            {IMAGEN_PANEL_IZQUIERDO ? (
              <Box
                component="img"
                src={IMAGEN_PANEL_IZQUIERDO}
                alt="Branding EXECON"
                sx={{
                  maxWidth: '85%',
                  maxHeight: 240,
                  objectFit: 'contain',
                  display: 'block',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.25))',
                }}
              />
            ) : (
              /* Fallback SVG */
              <Box
                component="svg"
                viewBox="0 0 220 120"
                sx={{ width: 310, height: 169, display: 'block', opacity: 0.16 }}
                fill="none"
                stroke="#10B981"
                strokeWidth="22"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M95 20 H45 L15 60 L45 100 H80 L100 75 H60" />
                <path d="M125 100 H175 L205 60 L175 20 H140 L120 45 H160" />
              </Box>
            )}
          </Box>

          {/* Pie de seguridad RBAC */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.2,
              color: '#84A1C0',
              zIndex: 2,
            }}
          >
            <ShieldOutlinedIcon sx={{ fontSize: 18, color: '#10B981', mt: 0.2 }} />
            <Typography sx={{ fontSize: '0.74rem', lineHeight: 1.45, color: '#A0B4CB' }}>
              Acceso seguro con cifrado corporativo y control de acceso basado en roles (RBAC).
            </Typography>
          </Box>
        </Box>

        {/* PANEL DERECHO: Formulario de Login */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: { xs: 4, sm: 5, md: 6 },
            bgcolor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ mb: 3.5, textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.02em',
              }}
            >
              Iniciar sesión
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2.5, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2.2}>
            <Box>
              <Typography sx={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', mb: 0.7 }}>
                Correo electrónico
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="email"
                placeholder="usuario@execon.mx"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                disabled={cargando}
                slotProps={{
                  input: {
                    sx: {
                      bgcolor: '#F8FAFC',
                      borderRadius: 2.5,
                      fontSize: '0.86rem',
                      '& fieldset': { borderColor: '#E2E8F0', borderWidth: 1.5 },
                      '&:hover fieldset': { borderColor: '#CBD5E1' },
                      '&.Mui-focused fieldset': { borderColor: '#003359' },
                    },
                  },
                }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', mb: 0.7 }}>
                Contraseña
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                disabled={cargando}
                slotProps={{
                  input: {
                    sx: {
                      bgcolor: '#F8FAFC',
                      borderRadius: 2.5,
                      fontSize: '0.86rem',
                      '& fieldset': { borderColor: '#E2E8F0', borderWidth: 1.5 },
                      '&:hover fieldset': { borderColor: '#CBD5E1' },
                      '&.Mui-focused fieldset': { borderColor: '#003359' },
                    },
                  },
                }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disableElevation
              disabled={cargando}
              sx={{
                mt: 1.5,
                height: 48,
                borderRadius: 2.5,
                bgcolor: '#003359',
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                boxShadow: '0 4px 14px rgba(0, 51, 89, 0.3)',
                '&:hover': {
                  bgcolor: '#002642',
                },
              }}
            >
              {cargando ? <CircularProgress size={20} color="inherit" /> : 'Iniciar sesión'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}