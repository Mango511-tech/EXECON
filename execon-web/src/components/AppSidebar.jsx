import {
  AccessTimeOutlined,
  AssessmentOutlined,
  CalendarMonthOutlined,
  ChevronRightOutlined,
  ColorLensOutlined,
  GroupsOutlined,
  LanguageOutlined,
  LogoutOutlined,
  PersonOutlineOutlined,
  SettingsOutlined,
  TaskAltOutlined,
  TuneOutlined,
} from '@mui/icons-material';

import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';

import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const DRAWER_WIDTH = 270;

const MENU_ITEMS = [
  {
    label: 'Vista General',
    path: '/dashboard',
    icon: AssessmentOutlined,
  },
  {
    label: 'Distribución de Onsite',
    path: '/distribucion-onsite',
    icon: TaskAltOutlined,
  },
  {
    label: 'Planeación',
    path: '/planeacion',
    icon: CalendarMonthOutlined,
  },
  {
    label: 'Turnos y disponibilidad',
    path: '/turnos',
    icon: AccessTimeOutlined,
  },
  {
    label: 'Gestión de Usuarios',
    path: '/usuarios',
    icon: GroupsOutlined,
  },
];

function AppSidebar() {
  const navigate = useNavigate();

  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const userMenuOpen = Boolean(userMenuAnchor);

  const openUserMenu = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const closeUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const goToConfiguration = (section = 'cuenta') => {
    closeUserMenu();

    navigate(`/configuracion?seccion=${section}`);
  };

  const cerrarSesion = () => {
    localStorage.removeItem('execon_token');
    localStorage.removeItem('execon_usuario');
    localStorage.removeItem('execon_usuario_demo');

    closeUserMenu();

    navigate('/login', { replace: true });
  };

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,

          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: 'none',
            color: '#FFFFFF',
            background:
              'linear-gradient(180deg, #003359 0%, #002642 100%)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        {/* Navegación del supervisor / administrador */}
        <List
          component="nav"
          aria-label="Navegación del supervisor"
          sx={{
            px: 1.5,
            pt: 10,
            pb: 2,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={item.path}
                title={item.label}
                sx={{
                  mb: 0.75,
                  minHeight: 48,
                  borderRadius: 1.2,
                  px: 1.5,

                  '& .MuiListItemIcon-root': {
                    minWidth: 40,
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.82)',
                  },

                  '& .MuiListItemText-primary': {
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.88)',
                    whiteSpace: 'nowrap',
                  },

                  '&.active': {
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',

                    '& .MuiListItemIcon-root': {
                      color: '#003359',
                    },

                    '& .MuiListItemText-primary': {
                      color: '#003359',
                      fontWeight: 800,
                    },
                  },

                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.11)',
                  },

                  '&.active:hover': {
                    backgroundColor: '#EAF4FF',
                  },
                }}
              >
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>

                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>

        {/* Cuenta al pie del menú */}
        <Box
          sx={{
            mt: 'auto',
            p: 1.5,
            flexShrink: 0,
          }}
        >
          <Divider
            sx={{
              mb: 1.25,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          />

          <ListItemButton
            id="supervisor-account-button"
            onClick={openUserMenu}
            aria-label="Opciones de la cuenta"
            aria-controls={
              userMenuOpen ? 'user-settings-menu' : undefined
            }
            aria-haspopup="true"
            aria-expanded={userMenuOpen ? 'true' : undefined}
            sx={{
              minHeight: 58,
              px: 1,
              borderRadius: 1.25,

              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.11)',
              },
            }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                mr: 1.15,
                bgcolor: 'rgba(140,198,63,0.18)',
                color: '#8CC63F',
              }}
            >
              <PersonOutlineOutlined fontSize="small" />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                noWrap
                sx={{
                  color: '#FFFFFF',
                  fontSize: '0.77rem',
                  fontWeight: 800,
                }}
              >
                Administrador
              </Typography>

              <Typography
                noWrap
                sx={{
                  mt: 0.1,
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.64rem',
                }}
              >
                Supervisor / Admin
              </Typography>
            </Box>

            <ChevronRightOutlined
              sx={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 19,
                transform: userMenuOpen
                  ? 'rotate(90deg)'
                  : 'rotate(0deg)',
                transition: 'transform 160ms ease',
              }}
            />
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Opciones personales */}
      <Menu
        id="user-settings-menu"
        anchorEl={userMenuAnchor}
        open={userMenuOpen}
        onClose={closeUserMenu}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        MenuListProps={{
          'aria-labelledby': 'supervisor-account-button',
        }}
        PaperProps={{
          sx: {
            minWidth: 225,
            mt: -0.5,
            borderRadius: 1.5,
            border: '1px solid #E7EDF4',
            boxShadow: '0 10px 28px rgba(15,23,42,0.16)',

            '& .MuiMenuItem-root': {
              minHeight: 42,
              fontSize: '0.76rem',
            },
          },
        }}
      >
        <Box sx={{ px: 1.75, py: 1.25 }}>
          <Typography
            sx={{
              color: '#173B66',
              fontSize: '0.75rem',
              fontWeight: 800,
            }}
          >
            Administrador
          </Typography>

          <Typography
            sx={{
              mt: 0.2,
              color: '#94A3B8',
              fontSize: '0.63rem',
            }}
          >
            Preferencias de la cuenta
          </Typography>
        </Box>

        <Divider />

        <MenuItem onClick={() => goToConfiguration('cuenta')}>
          <ListItemIcon>
            <SettingsOutlined fontSize="small" />
          </ListItemIcon>

          Configuración
        </MenuItem>

        <MenuItem onClick={() => goToConfiguration('apariencia')}>
          <ListItemIcon>
            <ColorLensOutlined fontSize="small" />
          </ListItemIcon>

          Tema de color
        </MenuItem>

        <MenuItem onClick={() => goToConfiguration('idioma')}>
          <ListItemIcon>
            <LanguageOutlined fontSize="small" />
          </ListItemIcon>

          Idioma
        </MenuItem>

        <MenuItem onClick={() => goToConfiguration('preferencias')}>
          <ListItemIcon>
            <TuneOutlined fontSize="small" />
          </ListItemIcon>

          Preferencias
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={cerrarSesion}
          sx={{
            color: '#D92D20',

            '& .MuiListItemIcon-root': {
              color: '#D92D20',
            },

            '&:hover': {
              bgcolor: '#FEF2F2',
            },
          }}
        >
          <ListItemIcon>
            <LogoutOutlined fontSize="small" />
          </ListItemIcon>

          Cerrar sesión
        </MenuItem>
      </Menu>
    </>
  );
}

export default AppSidebar;