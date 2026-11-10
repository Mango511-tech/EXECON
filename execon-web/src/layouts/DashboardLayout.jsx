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

/* Isotipo EXECON: dos eslabones entrelazados */
function IsotipoExecon({ size = 22 }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 220 120"
      sx={{ width: size * 1.83, height: size, display: 'block' }}
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="18"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M95 20 H45 L15 60 L45 100 H80 L100 75 H60" />
      <path d="M125 100 H175 L205 60 L175 20 H140 L120 45 H160" />
    </Box>
  );
}

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
  const { t, isDark } = usePreferences();
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
        /* Zoom base 90%: mismo efecto que el navegador, sin que el usuario lo ajuste */
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
        {/* MARCA: ISOTIPO + EXECON SMART SOLUTIONS */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{ px: 2.25, pt: 2.5, pb: 2 }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '11px',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow:
                '0 6px 16px -6px rgba(16,185,129,.55), inset 0 1px 0 rgba(255,255,255,.25)',
              flexShrink: 0,
            }}
          >
            <IsotipoExecon size={20} />
          </Box>

          <Box sx={{ lineHeight: 1 }}>
            <Typography
              sx={{
                color: '#FFFFFF',
                fontSize: '1rem',
                fontWeight: 800,
                letterSpacing: '0.24em',
                lineHeight: 1,
              }}
            >
              EXECON
            </Typography>
            <Typography
              sx={{
                color: '#7E96B4',
                fontSize: '0.53rem',
                fontWeight: 600,
                letterSpacing: '0.09em',
                mt: 0.5,
              }}
            >
              SMART SOLUTIONS
            </Typography>
          </Box>
        </Stack>

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