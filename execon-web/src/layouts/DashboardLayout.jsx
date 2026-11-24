import {
  AccessTimeOutlined,
  AssignmentOutlined,
  CalendarMonthOutlined,
  CheckOutlined,
  ColorLensOutlined,
  LanguageOutlined,
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
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
  Divider,
  Alert,
} from '@mui/material';

import { useState } from 'react';
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
        display: { xs: 'none', md: 'block' },
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
        end={item.end}
        title={item.text}
        sx={{
          position: 'relative',
          borderRadius: 1.5,
          py: 1.05,
          px: { xs: 1, md: 1.5 },
          justifyContent: { xs: 'center', md: 'flex-start' },
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
          sx={{
            color: 'inherit',
            minWidth: { xs: 0, md: 36 },
            justifyContent: 'center',
            '& svg': { fontSize: 19 },
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.text}
          sx={{ display: { xs: 'none', md: 'block' } }}
          slotProps={{
            primary: {
              fontSize: '0.83rem',
              fontWeight: 600,
            },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}

function getStoredUser() {
  try {
    const user = JSON.parse(localStorage.getItem('execon_usuario') || '{}');
    return user && typeof user === 'object' ? user : {};
  } catch {
    return {};
  }
}

function DashboardLayout({ children, variant = 'supervisor' }) {
  const { t, preferences, savePreferences } = usePreferences();
  const navigate = useNavigate();
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [settingsError, setSettingsError] = useState('');
  const settingsOpen = Boolean(settingsAnchor);

  const userStored = getStoredUser();
  const isDistributor = variant === 'distributor';
  const isIsm = variant === 'ism';
  const homePath = isDistributor ? '/distribuidor' : isIsm ? '/ism' : '/dashboard';

  const nombreUsuario =
    userStored.nombreCompleto || userStored.nombre || 'Usuario';

  const inicial =
    nombreUsuario?.trim()?.charAt(0)?.toUpperCase() || 'U';

  // Menú agrupado por secciones, según rol
  const menuSections = isDistributor
    ? [
        {
          label: t('navOperations'),
          items: [
            { text: t('navGeneral'), icon: <GridViewOutlined />, path: '/distribuidor', end: true },
          ],
        },
      ]
    : isIsm
      ? [
          {
            label: t('navOperations'),
            items: [
              { text: t('navGeneral'), icon: <GridViewOutlined />, path: '/ism', end: true },
            ],
          },
        ]
    : [
        {
          label: t('navOperations'),
          items: [
            { text: t('navGeneral'), icon: <GridViewOutlined />, path: '/dashboard' },
            { text: t('navDistribution'), icon: <AssignmentOutlined />, path: '/distribucion-onsite' },
          ],
        },
        {
          label: t('navPersonnel'),
          items: [
            { text: t('navPlanning'), icon: <CalendarMonthOutlined />, path: '/planeacion' },
            { text: t('navShifts'), icon: <QueryBuilderOutlined />, path: '/turnos' },
            { text: t('navHours'), icon: <AccessTimeOutlined />, path: '/horas-jornada' },
          ],
        },
        {
          label: t('navAdministration'),
          items: [
            { text: t('navUsers'), icon: <GroupOutlined />, path: '/usuarios' },
          ],
        },
      ];

  const handleLogout = () => {
    if (preferences.confirmarCierreSesion && !window.confirm(t('confirmSignOut'))) return;
    localStorage.removeItem('execon_token');
    localStorage.removeItem('execon_usuario');
    navigate('/login');
  };

  const updatePreference = async (key, value) => {
    if (preferences[key] === value) return;
    setSettingsError('');
    try {
      await savePreferences({ ...preferences, [key]: value });
    } catch (error) {
      setSettingsError(error.response?.data?.message || error.message || 'No se pudieron guardar las preferencias.');
    }
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
        className="dashboard-sidebar"
        elevation={0}
        sx={{
          width: { xs: 72, md: 235 },
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
          className="dashboard-brand"
          component={NavLink}
          to={homePath}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: { xs: 1, md: 2.5 },
            pt: { xs: 1.5, md: 2.5 },
            pb: 2,
            textDecoration: 'none',
          }}
        >
          <Box
            component="img"
            src="/Execon_Logo.png"
            alt="EXECON Smart Solutions"
            sx={{
              maxHeight: { xs: 36, md: 42 },
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
          <List sx={{ px: { xs: 0.75, md: 1.25 }, pb: 1.5 }}>
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
            id="dashboard-settings-button"
            onClick={(event) => {
              setSettingsError('');
              setSettingsAnchor(event.currentTarget);
            }}
            title={t('navConfig')}
            aria-haspopup="menu"
            aria-expanded={settingsOpen ? 'true' : undefined}
            sx={{
              borderRadius: 1.5,
              mb: 1.25,
              py: 0.9,
              px: { xs: 1, md: 1.5 },
              justifyContent: { xs: 'center', md: 'flex-start' },
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
              sx={{
                color: 'inherit',
                minWidth: { xs: 0, md: 36 },
                justifyContent: 'center',
                '& svg': { fontSize: 19 },
              }}
            >
              <SettingsOutlined />
            </ListItemIcon>
            <ListItemText
              primary={t('navConfig')}
              sx={{ display: { xs: 'none', md: 'block' } }}
              slotProps={{ primary: { fontSize: '0.83rem', fontWeight: 600 } }}
            />
          </ListItemButton>

          <Menu
            anchorEl={settingsAnchor}
            open={settingsOpen}
            onClose={() => setSettingsAnchor(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            slotProps={{
              paper: {
                sx: {
                  width: 264,
                  p: 0.75,
                  border: '1px solid #E2E8F0',
                  borderRadius: 2,
                  boxShadow: '0 16px 40px rgba(15,23,42,.18)',
                },
              },
            }}
          >
            <Box sx={{ px: 1.25, py: 0.75 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <LanguageOutlined sx={{ color: '#64748B', fontSize: 17 }} />
                <Typography sx={{ color: 'text.primary', fontSize: '0.78rem', fontWeight: 800 }}>
                  {t('settingsLanguage')}
                </Typography>
              </Stack>
            </Box>
            {[
              { value: 'es-MX', label: t('languageSpanish'), code: 'ES' },
              { value: 'en-US', label: t('languageEnglish'), code: 'EN' },
            ].map((language) => (
              <MenuItem
                key={language.value}
                selected={preferences.idioma === language.value}
                onClick={() => updatePreference('idioma', language.value)}
                sx={{ minHeight: 38, borderRadius: 1.25, fontSize: '0.8rem' }}
              >
                <ListItemIcon sx={{ minWidth: 30, color: '#64748B', fontSize: '0.68rem', fontWeight: 800 }}>
                  {language.code}
                </ListItemIcon>
                {language.label}
                {preferences.idioma === language.value && <CheckOutlined sx={{ ml: 'auto', fontSize: 17, color: '#168A4A' }} />}
              </MenuItem>
            ))}
            <Divider sx={{ my: 0.75 }} />
            <Box sx={{ px: 1.25, py: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ColorLensOutlined sx={{ color: '#64748B', fontSize: 17 }} />
              <Typography sx={{ color: 'text.primary', fontSize: '0.75rem', fontWeight: 700 }}>
                {t('settingsAppearance')}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ px: 0.5, pb: 0.5 }}>
              {[
                ['claro', t('themeLight')],
                ['oscuro', t('themeDark')],
                ['sistema', t('themeSystem')],
              ].map(([value, label]) => (
                <MenuItem
                  key={value}
                  selected={preferences.tema === value}
                  onClick={() => updatePreference('tema', value)}
                  sx={{
                    flex: 1,
                    minHeight: 34,
                    justifyContent: 'center',
                    borderRadius: 1,
                    px: 0.5,
                    fontSize: '0.7rem',
                  }}
                >
                  {label}
                </MenuItem>
              ))}
            </Stack>
            {settingsError && (
              <Alert severity="error" sx={{ mx: 0.5, mb: 0.5, py: 0 }}>
                {settingsError}
              </Alert>
            )}
            <Divider sx={{ my: 0.75 }} />
            <MenuItem
              onClick={() => {
                setSettingsAnchor(null);
                navigate(isDistributor ? '/distribuidor/configuracion' : isIsm ? '/ism/configuracion' : '/configuracion');
              }}
              sx={{ minHeight: 38, borderRadius: 1.25, fontSize: '0.78rem' }}
            >
              <ListItemIcon sx={{ minWidth: 30 }}><SettingsOutlined fontSize="small" /></ListItemIcon>
              {t('settingsAdvanced')}
            </MenuItem>
          </Menu>

          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignItems: 'center',
              justifyContent: { xs: 'center', md: 'flex-start' },
            }}
          >
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

            <Box sx={{ minWidth: 0, flex: 1, display: { xs: 'none', md: 'block' } }}>
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
                {isDistributor ? t('userRoleDistributor') : isIsm ? t('userRoleIsm') : t('userRoleAdmin')}
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
      <Box className="dashboard-main" component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 1.25, md: 2 }, overflowX: 'hidden' }}>
        {children}
      </Box>
    </Box>
  );
}

export default DashboardLayout;