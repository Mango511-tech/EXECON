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

/* ===================== SISTEMA DE DISEÑO ===================== */
const NAV_TOKENS = {
  accent: '#10B981',
  accentSoft: '#5EEAD4',
  activeFrom: 'rgba(29, 111, 184, 0.30)',
  activeTo: 'rgba(29, 111, 184, 0.08)',
  idle: '#A9BCCF',
  label: '#5B7396',
};

/* Encabezado de sección del menú */
function NavLabel({ text }) {
  return (
    <Typography
      sx={{
        px: 2,
        pt: 2,
        pb: 0.75,
        fontSize: '0.6rem',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: NAV_TOKENS.label,
        userSelect: 'none',
      }}
    >
      {text}
    </Typography>
  );
}

/* Elemento de navegación */
function NavItem({ item }) {
  return (
    <ListItem disablePadding sx={{ mb: 0.25 }}>
      <ListItemButton
        component={NavLink}
        to={item.path}
        sx={{
          position: 'relative',
          borderRadius: 1.5,
          py: 1.05,
          px: 1.5,
          color: NAV_TOKENS.idle,
          transition: 'background-color 160ms ease, color 160ms ease',
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.06)',
            color: '#E2E8F0',
          },
          '&.active': {
            background: `linear-gradient(90deg, ${NAV_TOKENS.activeFrom} 0%, ${NAV_TOKENS.activeTo} 100%)`,
            color: '#FFFFFF',
            '& .nav-icon': { color: NAV_TOKENS.accentSoft },
            '&::before': {
              content: '""',
              position: 'absolute',
              left: -8,
              top: '22%',
              height: '56%',
              width: 3.5,
              borderRadius: 4,
              bgcolor: NAV_TOKENS.accent,
              boxShadow: `0 0 12px ${NAV_TOKENS.accent}`,
              pointerEvents: 'none',
            },
          },
        }}
      >
        <ListItemIcon
          className="nav-icon"
          sx={{ color: 'inherit', minWidth: 36, '& svg': { fontSize: 19 } }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            fontSize: '0.83rem',
            fontWeight: 600,
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}

function DashboardLayout({ children }) {
  const { t } = usePreferences();
  const navigate = useNavigate();

  const userStored = JSON.parse(localStorage.getItem('execon_usuario') || '{}');
  const role = (userStored.rol || '').toUpperCase();
  const isDistributor = role === 'DISTRIBUIDOR' || role === 'DISTRIBUIDORONSITE';

  const nombreUsuario =
    userStored.nombreCompleto || userStored.nombre || 'Usuario';

  const inicial =
    nombreUsuario?.trim()?.charAt(0)?.toUpperCase() || 'U';

  // Menú agrupado por secciones, según rol
  const menuSections = isDistributor
    ? [
        {
          label: 'Operación',
          items: [
            { text: t('navDistribution'), icon: <AssignmentOutlined />, path: '/distribucion-onsite' },
          ],
        },
        {
          label: 'Personal',
          items: [
            { text: t('navPlanning'), icon: <CalendarMonthOutlined />, path: '/planeacion' },
            { text: t('navShifts'), icon: <QueryBuilderOutlined />, path: '/turnos' },
          ],
        },
      ]
    : [
        {
          label: 'Operación',
          items: [
            { text: t('navGeneral'), icon: <GridViewOutlined />, path: '/dashboard' },
            { text: t('navDistribution'), icon: <AssignmentOutlined />, path: '/distribucion-onsite' },
          ],
        },
        {
          label: 'Personal',
          items: [
            { text: t('navPlanning'), icon: <CalendarMonthOutlined />, path: '/planeacion' },
            { text: t('navShifts'), icon: <QueryBuilderOutlined />, path: '/turnos' },
          ],
        },
        {
          label: 'Administración',
          items: [
            { text: t('navUsers'), icon: <GroupOutlined />, path: '/usuarios' },
          ],
        },
      ];

  const handleLogout = () => {
    localStorage.removeItem('execon_token');
    localStorage.removeItem('execon_usuario');
    navigate('/login');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* SIDEBAR CORPORATIVO */}
      <Paper
        elevation={0}
        sx={{
          width: 264,
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'linear-gradient(180deg, #0A2540 0%, #071B30 100%)',
          borderRadius: 0,
          zIndex: 1100,
        }}
      >
        {/* LOGO DE LA EMPRESA EN PNG (enlace al dashboard) */}
        <Box
          component={NavLink}
          to="/dashboard"
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2.5,
            pt: 2.5,
            pb: 2,
            textDecoration: 'none',
          }}
        >
          <Box
            component="img"
            src="Execon_Logo.png" // Cambia la ruta según el nombre de tu archivo en public/
            alt="EXECON Smart Solutions"
            sx={{
              maxHeight: 42,
              maxWidth: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </Box>

        {/* NAVEGACIÓN AGRUPADA */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'rgba(255,255,255,0.12)',
              borderRadius: 4,
            },
          }}
        >
          <List sx={{ px: 1.25, pb: 1.5 }}>
            {menuSections.map((section) => (
              <Box key={section.label}>
                <NavLabel text={section.label} />
                {section.items.map((item) => (
                  <NavItem key={item.path} item={item} />
                ))}
              </Box>
            ))}
          </List>
        </Box>

        {/* PIE: CONFIGURACIÓN + USUARIO + CERRAR SESIÓN */}
        <Box sx={{ p: 1.5, pt: 1.25, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <ListItemButton
            component={NavLink}
            to="/configuracion"
            sx={{
              borderRadius: 1.5,
              mb: 1.25,
              py: 0.9,
              px: 1.5,
              color: NAV_TOKENS.idle,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#E2E8F0' },
              '&.active': {
                background: `linear-gradient(90deg, ${NAV_TOKENS.activeFrom} 0%, ${NAV_TOKENS.activeTo} 100%)`,
                color: '#FFFFFF',
                '& .nav-icon': { color: NAV_TOKENS.accentSoft },
              },
            }}
          >
            <ListItemIcon
              className="nav-icon"
              sx={{ color: 'inherit', minWidth: 36, '& svg': { fontSize: 19 } }}
            >
              <SettingsOutlined />
            </ListItemIcon>
            <ListItemText
              primary={t('navConfig')}
              primaryTypographyProps={{ fontSize: '0.83rem', fontWeight: 600 }}
            />
          </ListItemButton>

          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontSize: '0.8rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1D6FB8, #14406A)',
                boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.18)',
                flexShrink: 0,
              }}
            >
              {inicial}
            </Avatar>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                noWrap
                sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#F1F5F9' }}
              >
                {nombreUsuario}
              </Typography>
              <Typography
                noWrap
                sx={{ fontSize: '0.63rem', fontWeight: 500, color: '#7E96B4', mt: 0.25 }}
              >
                {isDistributor ? t('userRoleDistributor') : t('userRoleAdmin')}
              </Typography>
            </Box>

            <Tooltip title={t('navLogout')}>
              <IconButton
                onClick={handleLogout}
                size="small"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '9px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#8FA5C0',
                  flexShrink: 0,
                  transition: 'all 160ms ease',
                  '&:hover': {
                    bgcolor: 'rgba(239, 68, 68, 0.12)',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: '#F87171',
                  },
                }}
              >
                <LogoutOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
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