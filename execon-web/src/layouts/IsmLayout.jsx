import {
  AccessTimeFilledOutlined,
  AssignmentOutlined,
  GridViewOutlined,
  LogoutOutlined,
  ScheduleOutlined,
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

export default function IsmLayout({ children }) {
  const navigate = useNavigate();
  const userStored = JSON.parse(localStorage.getItem('execon_usuario') || '{}');
  const nombreUsuario = userStored.nombreCompleto || userStored.nombre || 'Agente ISM';

  // 1. Registro de turno arriba de Vista general
  const menuItems = [
    { text: 'Registro de turno', icon: <ScheduleOutlined />, path: '/ism/turnos' },
    { text: 'Vista general', icon: <GridViewOutlined />, path: '/ism' },
    { text: 'Mis incidentes', icon: <AssignmentOutlined />, path: '/ism/incidentes' },
    { text: 'Duración de actividades', icon: <AccessTimeFilledOutlined />, path: '/ism/duracion' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('execon_token');
    localStorage.removeItem('execon_usuario');
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      <Paper
        elevation={0}
        sx={{
          width: 255,
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #E7EDF4',
          bgcolor: '#003359',
          color: '#FFFFFF',
          borderRadius: 0,
          zIndex: 1100,
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ bgcolor: '#FFFFFF', borderRadius: 1.5, p: 1.25, textAlign: 'center' }}>
            <Box component="img" src="/Execon_Logo.png" alt="EXECON" sx={{ width: '100%', height: 'auto' }} />
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        <List sx={{ px: 1.25, py: 1.5, flex: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.75 }}>
              <ListItemButton
                component={NavLink}
                to={item.path}
                end
                sx={{
                  borderRadius: 1.5,
                  py: 1.05,
                  color: 'rgba(255, 255, 255, 0.75)',
                  '&.active': { bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', fontWeight: 800 },
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)', color: '#FFFFFF' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 38 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: 'inherit' }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ p: 1.5 }}>
          <Paper sx={{ p: 1.25, bgcolor: 'rgba(0, 0, 0, 0.22)', borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#8CC63F', color: '#003359', fontWeight: 800, fontSize: '0.8rem' }}>
                {nombreUsuario.charAt(0)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#FFFFFF' }}>{nombreUsuario}</Typography>
                <Typography noWrap sx={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.6)' }}>ISM/MESA</Typography>
              </Box>
            </Stack>
            <Tooltip title="Cerrar sesión">
              <IconButton onClick={handleLogout} size="small" sx={{ color: '#F87171' }}>
                <LogoutOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Paper>
        </Box>
      </Paper>

      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 }, overflowX: 'hidden' }}>
        {children}
      </Box>
    </Box>
  );
}