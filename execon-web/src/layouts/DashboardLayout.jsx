import {
  AssignmentOutlined,
  CalendarMonthOutlined,
  GroupOutlined,
  GridViewOutlined,
  LogoutOutlined,
  QueryBuilderOutlined,
  SettingsOutlined,
} from '@mui/icons-material';

import {
  Avatar,
  Box,
  Divider,
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

function DashboardLayout({ children }) {
  const { t, isDark } = usePreferences();
  const navigate = useNavigate();

  const userStored = JSON.parse(localStorage.getItem('execon_usuario') || '{}');
  const role = (userStored.rol || '').toUpperCase();
  const isDistributor = role === 'DISTRIBUIDOR' || role === 'DISTRIBUIDORONSITE';

  // Menú dinámico según rol
  const menuItems = isDistributor
    ? [
        { text: t('navDistribution'), icon: <AssignmentOutlined />, path: '/distribucion-onsite' },
        { text: t('navPlanning'), icon: <CalendarMonthOutlined />, path: '/planeacion' },
        { text: t('navShifts'), icon: <QueryBuilderOutlined />, path: '/turnos' },
      ]
    : [
        { text: t('navGeneral'), icon: <GridViewOutlined />, path: '/dashboard' },
        { text: t('navDistribution'), icon: <AssignmentOutlined />, path: '/distribucion-onsite' },
        { text: t('navPlanning'), icon: <CalendarMonthOutlined />, path: '/planeacion' },
        { text: t('navShifts'), icon: <QueryBuilderOutlined />, path: '/turnos' },
        { text: t('navUsers'), icon: <GroupOutlined />, path: '/usuarios' },
      ];

  const handleLogout = () => {
    localStorage.removeItem('execon_token');
    localStorage.removeItem('execon_usuario');
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* SIDEBAR FIJO COMPLETO AL 100% DE LA ALTURA */}
      <Paper
        elevation={0}
        sx={{
          width: 250,
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? '#0F172A' : '#003359',
          color: '#FFFFFF',
          borderRadius: 0,
          zIndex: 1100,
        }}
      >
        {/* PARTE SUPERIOR: LOGO EN CAJA BLANCA + NAVEGACIÓN */}
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* CONTENEDOR CON FONDO BLANCO PARA EL LOGO */}
          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                borderRadius: 1.5,
                px: 2,
                py: 1.25,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}
            >
              <img src="/Execon_Logo.png" alt="Execon Logo" style={{ width: '100%', height: 'auto' }} />
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* LISTA DE ENLACES */}
          <List sx={{ px: 1.25, py: 1.5, overflowY: 'auto', flex: 1 }}>
            {menuItems.map((item) => (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.75 }}>
                <ListItemButton
                  component={NavLink}
                  to={item.path}
                  sx={{
                    borderRadius: 1.5,
                    py: 1.1,
                    color: 'rgba(255, 255, 255, 0.75)',
                    '&.active': {
                      bgcolor: isDark ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.15)',
                      color: isDark ? '#38BDF8' : '#FFFFFF',
                      fontWeight: 800,
                    },
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ fontSize: '0.86rem', fontWeight: 'inherit' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* PARTE INFERIOR: CONFIGURACIÓN Y PERFIL ANCLADOS AL FONDO */}
        <Box sx={{ p: 1.5 }}>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 1.5 }} />

          <ListItemButton
            component={NavLink}
            to="/configuracion"
            sx={{
              borderRadius: 1.5,
              mb: 1.2,
              py: 0.9,
              color: 'rgba(255, 255, 255, 0.85)',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}>
              <SettingsOutlined />
            </ListItemIcon>
            <ListItemText primary={t('navConfig')} primaryTypographyProps={{ fontSize: '0.84rem' }} />
          </ListItemButton>

          <Paper
            sx={{
              p: 1.25,
              bgcolor: isDark ? '#1E293B' : 'rgba(0, 0, 0, 0.22)',
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: isDark ? '#38BDF8' : '#8CC63F',
                  color: '#003359',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                }}
              >
                {userStored.nombreCompleto?.charAt(0) || userStored.nombre?.charAt(0) || 'U'}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {userStored.nombreCompleto || userStored.nombre || 'Usuario'}
                </Typography>
                <Typography noWrap sx={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {isDistributor ? t('userRoleDistributor') : t('userRoleAdmin')}
                </Typography>
              </Box>
            </Stack>

            <Tooltip title={t('navLogout')}>
              <ListItemButton onClick={handleLogout} sx={{ minWidth: 0, p: 0.5, borderRadius: 1 }}>
                <LogoutOutlined sx={{ fontSize: 18, color: '#F87171' }} />
              </ListItemButton>
            </Tooltip>
          </Paper>
        </Box>
      </Paper>

      {/* CONTENIDO PRINCIPAL */}
      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 }, overflowX: 'hidden' }}>
        {children}
      </Box>
    </Box>
  );
}

export default DashboardLayout;