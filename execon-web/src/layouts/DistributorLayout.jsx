import {
  AssignmentOutlined,
  GridViewOutlined,
  HeadsetMicOutlined,
  LogoutOutlined,
  PersonAddAltOutlined,
  ScheduleOutlined,
  SettingsOutlined,
} from '@mui/icons-material';

import {
  Avatar,
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

import { NavLink, useNavigate } from 'react-router-dom';
import { usePreferences } from '../context/PreferencesContext';

function obtenerUsuarioGuardado() {
  try {
    const usuario = JSON.parse(
      localStorage.getItem('execon_usuario') || '{}',
    );
    return usuario && typeof usuario === 'object' ? usuario : {};
  } catch {
    return {};
  }
}

function DistribuidorLayout({ children }) {
  const { t, isDark } = usePreferences();
  const navigate = useNavigate();

  const userStored = obtenerUsuarioGuardado();

  const translate = (key, fallback) => {
    const translation = t(key);
    return !translation || translation === key ? fallback : translation;
  };

  const nombreUsuario =
    userStored.nombreCompleto ||
    userStored.nombre_completo ||
    userStored.nombre ||
    'Usuario';

  const inicialUsuario =
    String(nombreUsuario).trim().charAt(0).toUpperCase() || 'U';

  const menuItems = [
    {
      text: translate('navGeneral', 'Vista general'),
      icon: <GridViewOutlined />,
      path: '/distribuidor',
    },
    {
      text: translate('navLoggedIncidents', 'Incidentes loggeados'),
      icon: <AssignmentOutlined />,
      path: '/distribuidor/incidentes',
    },
    {
      text: translate('navOnsiteAssignment', 'Asignación de onsite'),
      icon: <PersonAddAltOutlined />,
      path: '/distribuidor/onsite',
    },
    {
      text: translate('navInAttention', 'Incidentes en atención'),
      icon: <HeadsetMicOutlined />,
      path: '/distribuidor/en-atencion',
    },
    {
      text: translate('navShifts', 'Turnos y horarios'),
      icon: <ScheduleOutlined />,
      path: '/distribuidor/turnos',
    },
  ];

  const linkStyles = {
    borderRadius: 1.5,
    py: 1.05,
    color: 'rgba(255, 255, 255, 0.75)',
    transition: 'background-color 150ms ease, color 150ms ease',

    '&.active': {
      bgcolor: isDark
        ? 'rgba(56, 189, 248, 0.18)'
        : 'rgba(255, 255, 255, 0.15)',
      color: isDark ? '#38BDF8' : '#FFFFFF',
      fontWeight: 800,
    },

    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 0.08)',
      color: '#FFFFFF',
    },
  };

  const handleLogout = () => {
    localStorage.removeItem('execon_token');
    localStorage.removeItem('execon_usuario');
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* SIDEBAR */}
      <Paper
        component="aside"
        elevation={0}
        sx={{
          width: 250,
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? '#0F172A' : '#003359',
          color: '#FFFFFF',
          borderRadius: 0,
          zIndex: 1100,
          overflow: 'hidden',
        }}
      >
        {/* LOGO */}
        <Box sx={{ p: 2, flexShrink: 0 }}>
          <Box
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: 1.5,
              px: 2,
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
            }}
          >
            <Box
              component="img"
              src="/Execon_Logo.png"
              alt="EXECON Smart Solutions"
              sx={{
                display: 'block',
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* NAVEGACIÓN */}
        <Box
          component="nav"
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <List sx={{ px: 1.25, py: 1.5 }}>
            {menuItems.map((item) => (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.75 }}>
                <ListItemButton
                  component={NavLink}
                  to={item.path}
                  end
                  sx={linkStyles}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.86rem',
                      fontWeight: 'inherit',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* CONFIGURACIÓN Y PERFIL */}
        <Box sx={{ p: 1.5, flexShrink: 0 }}>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 1.5 }} />

          <ListItemButton
            component={NavLink}
            to="/distribuidor/configuracion"
            end
            sx={{
              ...linkStyles,
              mb: 1.2,
              py: 0.9,
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}>
              <SettingsOutlined />
            </ListItemIcon>
            <ListItemText
              primary={translate('navConfig', 'Configuración')}
              primaryTypographyProps={{
                fontSize: '0.84rem',
                fontWeight: 'inherit',
              }}
            />
          </ListItemButton>

          <Paper
            elevation={0}
            sx={{
              p: 1.25,
              bgcolor: isDark ? '#1E293B' : 'rgba(0, 0, 0, 0.22)',
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 0.75,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: isDark ? '#38BDF8' : '#8CC63F',
                  color: '#003359',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {inicialUsuario}
              </Avatar>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  noWrap
                  title={nombreUsuario}
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                  }}
                >
                  {nombreUsuario}
                </Typography>
                <Typography
                  noWrap
                  sx={{
                    fontSize: '0.65rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                  }}
                >
                  {translate('userRoleDistributor', 'Distribuidor')}
                </Typography>
              </Box>
            </Stack>

            <Tooltip title={translate('navLogout', 'Cerrar sesión')}>
              <IconButton
                onClick={handleLogout}
                size="small"
                sx={{
                  flexShrink: 0,
                  color: '#F87171',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'rgba(248, 113, 113, 0.12)' },
                }}
              >
                <LogoutOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Paper>
        </Box>
      </Paper>

      {/* CONTENIDO PRINCIPAL */}
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, overflowX: 'hidden' }}>
        {children}
      </Box>
    </Box>
  );
}

export default DistribuidorLayout;