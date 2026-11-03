import {
  LogoutOutlined,
  NotificationsNoneOutlined,
  PersonOutlineOutlined,
} from '@mui/icons-material';

import {
  Avatar,
  Badge,
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

import { useNavigate } from 'react-router-dom';

function AppHeader({ title, subtitle }) {
  const navigate = useNavigate();

  /*
    Obtiene el usuario guardado después de iniciar sesión.
    Si todavía no hay datos, muestra valores genéricos.
  */
  const obtenerUsuario = () => {
    try {
      const usuarioGuardado = localStorage.getItem('execon_usuario');

      if (!usuarioGuardado) {
        return {
          nombre: 'Usuario',
          rol: 'Sin rol asignado',
        };
      }

      return JSON.parse(usuarioGuardado);
    } catch (error) {
      return {
        nombre: 'Usuario',
        rol: 'Sin rol asignado',
      };
    }
  };

  const usuario = obtenerUsuario();

  const cerrarSesion = () => {
    /*
      Borra la sesión real que se guarda al iniciar sesión.
    */
    localStorage.removeItem('execon_token');
    localStorage.removeItem('execon_usuario');

    /*
      Limpia también la sesión de pruebas anterior, por si existe.
    */
    localStorage.removeItem('execon_usuario_demo');

    /*
      replace: true evita que el usuario regrese al dashboard
      usando la flecha "Atrás" del navegador.
    */
    navigate('/login', { replace: true });
  };

  const mostrarRol = (rol) => {
    const roles = {
      SUPERVISOR_ADMINISTRADOR: 'Supervisor / Administrador',
      DISTRIBUIDOR_ONSITE: 'Distribuidor Onsite',
      ISM_MESA: 'ISM / Mesa',
    };

    return roles[rol] || rol || 'Sin rol asignado';
  };

  const obtenerIniciales = (nombre) => {
    if (!nombre) return 'US';

    const palabras = nombre
      .trim()
      .split(' ')
      .filter(Boolean);

    if (palabras.length === 1) {
      return palabras[0].slice(0, 2).toUpperCase();
    }

    return `${palabras[0][0]}${palabras[1][0]}`.toUpperCase();
  };

  return (
    <Box
      component="header"
      sx={{
        minHeight: 60,
        px: { xs: 2, md: 3 },
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
      }}
    >
      {/* TÍTULO DE LA PÁGINA */}
{/* LOGO, TÍTULO Y SUBTÍTULO */}
<Stack
  direction="row"
  alignItems="center"
  spacing={1.5}
  sx={{
    minWidth: 0,
    flex: 1,
  }}
>
  <Box
    component="img"
    src="/Execon_Logo.png"
    alt="EXECON Smart Solutions"
    sx={{
      width: { xs: 200, md: 220 },
      height: { xs: 38, md: 46 },
      objectFit: 'contain',
      flexShrink: 0,
    }}
  />

  <Box
    sx={{
      minWidth: 0,
    }}
  >
    <Typography
      component="h1"
      noWrap
      sx={{
        color: '#003359',
        fontSize: { xs: '1rem', md: '1.25rem' },
        fontWeight: 800,
        lineHeight: 1.2,
      }}
    >
      {title}
    </Typography>

    {subtitle && (
      <Typography
        noWrap
        sx={{
          mt: 0.45,
          display: { xs: 'none', sm: 'block' },
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: '#64748B',
          fontSize: '0.76rem',
        }}
      >
        {subtitle}
      </Typography>
    )}
  </Box>
</Stack>

      {/* USUARIO Y ACCIONES */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 0.5, md: 1 }}
        sx={{
          flexShrink: 0,
        }}
      >
        <Tooltip title="Notificaciones">
          <IconButton
            aria-label="Notificaciones"
            sx={{
              color: '#64748B',
              '&:hover': {
                color: '#003359',
                backgroundColor: '#F1F5F9',
              },
            }}
          >
            <Badge
              color="error"
              badgeContent={0}
              invisible
              overlap="circular"
            >
              <NotificationsNoneOutlined />
            </Badge>
          </IconButton>
        </Tooltip>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            ml: { xs: 0, md: 0.5 },
            pl: { xs: 0.5, md: 1.5 },
            borderLeft: '1px solid #E2E8F0',
          }}
        >

        </Stack>

        <Tooltip title="Cerrar sesión">
          <Button
            type="button"
            onClick={cerrarSesion}
            color="error"
            variant="text"
            startIcon={<LogoutOutlined />}
            sx={{
              ml: { xs: 0, md: 0.5 },
              minWidth: { xs: 40, md: 'auto' },
              px: { xs: 0.75, md: 1.25 },
              textTransform: 'none',
              fontSize: '0.75rem',
              fontWeight: 700,

              '& .MuiButton-startIcon': {
                mr: { xs: 0, md: 0.5 },
              },

              '&:hover': {
                backgroundColor: '#FEF2F2',
              },
            }}
          >
            <Box
              component="span"
              sx={{
                display: { xs: 'none', md: 'inline' },
              }}
            >
              Cerrar sesión
            </Box>
          </Button>
        </Tooltip>
      </Stack>
    </Box>
  );
}

export default AppHeader;