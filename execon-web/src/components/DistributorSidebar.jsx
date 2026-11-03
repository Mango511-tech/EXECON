import { useState } from 'react';

import {
  AssignmentOutlined,
  AssessmentOutlined,
  ExpandLessOutlined,
  ExpandMoreOutlined,
  LanguageOutlined,
  TaskAltOutlined,
  LogoutOutlined,
  PaletteOutlined,
  PersonOutlineOutlined,
  SettingsOutlined,
  TuneOutlined,
} from '@mui/icons-material';

import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';

import { NavLink, useNavigate } from 'react-router-dom';

const menuItems = [
  {
    label: 'Vista general',
    path: '/distribuidor',
    icon: AssessmentOutlined,
    end: true,
  },
  {
    label: 'Incidentes loggeados',
    path: '/distribuidor/incidentes',
    icon: AssignmentOutlined,
    end: false,
  },
  {
    label: 'Asignación de onsite',
    path: '/distribuidor/onsite',
    icon: TaskAltOutlined,
    end: false,
  },
];

const accountOptions = [
  {
    label: 'Configuración',
    section: 'perfil',
    icon: SettingsOutlined,
  },
  {
    label: 'Tema de color',
    section: 'tema',
    icon: PaletteOutlined,
  },
  {
    label: 'Idioma',
    section: 'idioma',
    icon: LanguageOutlined,
  },
  {
    label: 'Preferencias',
    section: 'preferencias',
    icon: TuneOutlined,
  },
];

const navigationButtonStyle = {
  minHeight: 48,
  borderRadius: 1.5,
  px: { xs: 1, md: 1.5 },
  justifyContent: { xs: 'center', md: 'flex-start' },
  color: '#DCE8F0',

  '&:hover': {
    bgcolor: 'rgba(255,255,255,0.08)',
  },

  '&.active': {
    bgcolor: '#FFFFFF',
    color: '#003359',

    '& .MuiListItemIcon-root': {
      color: '#003359',
    },
  },
};

function DistributorSidebar() {
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);

  const accountMenuOpen = Boolean(anchorEl);

  let usuario = null;

  try {
    usuario = JSON.parse(
      localStorage.getItem('execon_usuario') || 'null',
    );
  } catch {
    usuario = null;
  }

  const nombreUsuario =
    usuario?.nombreCompleto ||
    usuario?.nombre_completo ||
    'Mi cuenta';

  const openAccountMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const closeAccountMenu = () => {
    setAnchorEl(null);
  };

  const openSettings = (section) => {
    closeAccountMenu();

    navigate(
      `/distribuidor/configuracion?seccion=${encodeURIComponent(section)}`,
    );
  };

  const logout = () => {
    closeAccountMenu();

    localStorage.removeItem('execon_token');
    localStorage.removeItem('execon_usuario');

    navigate('/login', { replace: true });
  };

  return (
    <Box
      component="aside"
      aria-label="Menú del distribuidor"
      sx={{
        width: { xs: 76, md: 250 },
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        height: '100dvh',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, #003359 0%, #002642 100%)',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 1, md: 1.5 },
      }}
    >
      {/* Encabezado */}
      <Box
        sx={{
          px: { xs: 0, md: 1 },
          py: 3,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            textAlign: { xs: 'center', md: 'left' },
            fontSize: { xs: '0.8rem', md: '1.2rem' },
            fontWeight: 800,
            letterSpacing: { xs: 0, md: 2 },
          }}
        >
          
        </Typography>

        <Typography
          sx={{
            display: { xs: 'none', md: 'block' },
            mt: 0.5,
            color: '#BCD0DF',
            fontSize: '0.8rem',
          }}
        >
          
        </Typography>
      </Box>

      {/* Navegación principal */}
      <List
        component="nav"
        aria-label="Navegación principal"
        sx={{
          mt: 1,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              end={item.end}
              aria-label={item.label}
              title={item.label}
              sx={{
                ...navigationButtonStyle,
                mb: 1,
              }}
            >
              <ListItemIcon
                sx={{
                  color: 'inherit',
                  minWidth: { xs: 0, md: 36 },
                }}
              >
                <Icon />
              </ListItemIcon>

              <ListItemText
                primary={item.label}
                sx={{
                  display: { xs: 'none', md: 'block' },
                }}
                primaryTypographyProps={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Cuenta al pie del menú */}
      <Box
        sx={{
          mt: 'auto',
          flexShrink: 0,
          pt: 2,
          pb: 1,
          borderTop: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <ListItemButton
          id="distributor-account-button"
          onClick={openAccountMenu}
          aria-label={`Opciones de cuenta de ${nombreUsuario}`}
          aria-controls={
            accountMenuOpen ? 'distributor-account-menu' : undefined
          }
          aria-haspopup="true"
          aria-expanded={accountMenuOpen ? 'true' : undefined}
          title="Opciones de mi cuenta"
          sx={{
            minHeight: 72,
            px: { xs: 0.5, md: 1 },
            py: 1.25,
            borderRadius: 1.5,
            gap: 1.25,
            justifyContent: { xs: 'center', md: 'flex-start' },
            color: '#FFFFFF',
            bgcolor: accountMenuOpen
              ? 'rgba(255,255,255,0.08)'
              : 'transparent',

            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.08)',
            },

            '&.Mui-focusVisible': {
              outline: '2px solid #9BD467',
              outlineOffset: -2,
            },
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '50%',
              bgcolor: 'rgba(144,202,80,0.14)',
              color: '#9BD467',
            }}
          >
            <PersonOutlineOutlined sx={{ fontSize: 25 }} />
          </Box>

          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              flex: 1,
              minWidth: 0,
            }}
          >
            <Typography
              noWrap
              sx={{
                color: '#FFFFFF',
                fontSize: '0.9rem',
                fontWeight: 800,
                lineHeight: 1.4,
              }}
            >
              {nombreUsuario}
            </Typography>

            <Typography
              noWrap
              sx={{
                mt: 0.25,
                color: '#ABC1D1',
                fontSize: '0.75rem',
                lineHeight: 1.4,
              }}
            >
              Distribuidor / Mesa
            </Typography>
          </Box>

          {accountMenuOpen ? (
            <ExpandLessOutlined
              sx={{
                display: { xs: 'none', md: 'block' },
                color: '#ABC1D1',
                fontSize: 22,
              }}
            />
          ) : (
            <ExpandMoreOutlined
              sx={{
                display: { xs: 'none', md: 'block' },
                color: '#ABC1D1',
                fontSize: 22,
              }}
            />
          )}
        </ListItemButton>
      </Box>

      {/* Desplegable de cuenta */}
      <Menu
        id="distributor-account-menu"
        anchorEl={anchorEl}
        open={accountMenuOpen}
        onClose={closeAccountMenu}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        MenuListProps={{
          'aria-labelledby': 'distributor-account-button',
          sx: { py: 0.75 },
        }}
        PaperProps={{
          sx: {
            width: 245,
            maxWidth: 'calc(100vw - 32px)',
            borderRadius: 1.5,
            border: '1px solid #E7EDF4',
            boxShadow: '0 8px 28px rgba(15,23,42,0.18)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography
            noWrap
            sx={{
              color: '#173B66',
              fontSize: '0.95rem',
              fontWeight: 800,
            }}
          >
            {nombreUsuario}
          </Typography>

          <Typography
            sx={{
              mt: 0.3,
              color: '#94A3B8',
              fontSize: '0.8rem',
            }}
          >
            Preferencias de la cuenta
          </Typography>
        </Box>

        <Divider />

        {accountOptions.map((option) => {
          const Icon = option.icon;

          return (
            <MenuItem
              key={option.section}
              onClick={() => openSettings(option.section)}
              sx={{
                minHeight: 46,
                px: 2,
                color: '#334155',
                fontSize: '0.95rem',
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Icon
                  sx={{
                    color: '#7A7A7A',
                    fontSize: 22,
                  }}
                />
              </ListItemIcon>

              <ListItemText primary={option.label} />
            </MenuItem>
          );
        })}

        <Divider sx={{ my: 0.75 }} />

        <MenuItem
          onClick={logout}
          sx={{
            minHeight: 46,
            px: 2,
            color: '#D32F2F',
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <LogoutOutlined
              sx={{
                color: '#D32F2F',
                fontSize: 22,
              }}
            />
          </ListItemIcon>

          <ListItemText primary="Cerrar sesión" />
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default DistributorSidebar;