import {
  AddOutlined,
  CloseOutlined,
  DeleteOutlineOutlined,
  EditOutlined,
  EmailOutlined,
  GroupOutlined,
  InfoOutlined,
  LaptopOutlined,
  LocationOnOutlined,
  PersonOutlineOutlined,
  PersonRemoveOutlined,
  SearchOutlined,
  TuneOutlined,
} from '@mui/icons-material';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import DashboardLayout from '../layouts/DashboardLayout';
import { usePreferences } from '../context/PreferencesContext';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
).replace(/\/+$/, '');

const ROLES = [
  {
    value: 'supervisor',
    label: 'Supervisor',
  },
  {
    value: 'distribuidor',
    label: 'Distribuidor',
  },
  {
    value: 'ISM/MESA',
    label: 'ISM/MESA',
  },
];

const EMPTY_CREATE_FORM = {
  nombre: '',
  correo: '',
  rol: '',
  estatus: 'ACTIVO',
  contrasena: '',
};

const panelSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1.5,
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 46,
  },
  '& .MuiInputBase-input': {
    fontSize: '0.9rem',
  },
};

const primaryButtonSx = {
  minHeight: 46,
  textTransform: 'none',
  fontWeight: 800,
  whiteSpace: 'nowrap',
};

function normalizarRol(rol) {
  const valor = String(rol || '').trim().toLowerCase();

  const equivalencias = {
    admin: 'supervisor',
    supervisor: 'supervisor',
    supervisor_administrador: 'supervisor',
    distribuidor: 'distribuidor',
    distribuidor_onsite: 'distribuidor',
    ingeniero: 'ISM/MESA',
    ism_mesa: 'ISM/MESA',
    'ism/mesa': 'ISM/MESA',
  };

  return equivalencias[valor] || valor;
}

function getRoleLabel(rol) {
  const normalizado = normalizarRol(rol);
  const encontrado = ROLES.find((item) => item.value === normalizado);
  return encontrado?.label || rol || 'Sin rol';
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getInitials(name) {
  return String(name || 'Usuario')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

function toFrontendUser(user) {
  return {
    id: user.id,
    nombre: user.nombreCompleto || user.nombre_completo || '',
    correo: user.correo || '',
    rol: normalizarRol(user.rol),
    estatus:
      String(user.estatus || '').toUpperCase() === 'INACTIVO' ||
      user.activo === false
        ? 'INACTIVO'
        : 'ACTIVO',
    ultimoAcceso: user.ultimoAcceso || user.ultimo_acceso || null,
    fechaCreacion: user.creadoEn || user.creado_en || null,
    creadoPor: user.creadoPor || 'Sistema',
  };
}

function formatDateTime(value, locale = 'es-MX') {
  if (!value) return 'Sin registro';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin registro';

  return date.toLocaleString(locale, {
    timeZone: 'America/Monterrey',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('execon_token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message ||
        (response.status === 401
          ? 'Tu sesión no es válida. Inicia sesión nuevamente.'
          : 'No fue posible completar la operación.'),
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

function UserManagementPage() {
  const { preferences } = usePreferences();
  const configuredRows = Number(preferences?.registrosPorPagina);
  const rowsPerPage = [10, 20, 50].includes(configuredRows)
    ? configuredRows
    : 10;
  const locale = preferences?.idioma || 'es-MX';

  const [users, setUsers] = useState([]);
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE_FORM });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  const [page, setPage] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const [message, setMessage] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);

  const writeLock = useRef(false);
  const loadSequence = useRef(0);

  const loadUsers = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoadingUsers(true);
    setLoadError('');

    try {
      const result = await apiRequest('/usuarios');
      if (!Array.isArray(result.data)) {
        throw new Error('La API devolvió una lista de usuarios inesperada.');
      }
      if (sequence !== loadSequence.current) return;
      setUsers(result.data.map(toFrontendUser));
    } catch (error) {
      if (sequence !== loadSequence.current) return;
      setUsers([]);
      setSelectedUser(null);
      setEditingUser(null);
      setLoadError(error.message || 'No fue posible cargar los usuarios.');
    } finally {
      if (sequence === loadSequence.current) {
        setLoadingUsers(false);
      }
    }
  }, []);

  useEffect(() => {
    loadUsers();
    return () => {
      loadSequence.current += 1;
    };
  }, [loadUsers]);

  useEffect(() => {
    setPage(0);
  }, [search, roleFilter, rowsPerPage]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = normalizarTexto(search);

    return users.filter((user) => {
      const searchable = normalizarTexto(
        [user.nombre, user.correo, getRoleLabel(user.rol)].join(' '),
      );

      const matchesSearch =
        !normalizedSearch || searchable.includes(normalizedSearch);

      const rol = normalizarRol(user.rol);
      const matchesRole =
        roleFilter === 'TODOS' || rol === normalizarRol(roleFilter);

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const lastPage = Math.max(
    0,
    Math.ceil(filteredUsers.length / rowsPerPage) - 1,
  );
  const effectivePage = Math.min(page, lastPage);
  const visibleUsers = filteredUsers.slice(
    effectivePage * rowsPerPage,
    (effectivePage + 1) * rowsPerPage,
  );

  const totals = useMemo(() => {
    return {
      supervisores: users.filter(
        (user) =>
          ['admin', 'supervisor'].includes(normalizarRol(user.rol)) &&
          user.estatus === 'ACTIVO',
      ).length,
      distribuidores: users.filter(
        (user) =>
          normalizarRol(user.rol) === 'distribuidor' &&
          user.estatus === 'ACTIVO',
      ).length,
      ismMesa: users.filter(
        (user) =>
          normalizarRol(user.rol) === 'ISM/MESA' &&
          user.estatus === 'ACTIVO',
      ).length,
      inactivos: users.filter((user) => user.estatus === 'INACTIVO').length,
    };
  }, [users]);

  const busy = saving || loadingUsers;

  function beginWrite() {
    if (writeLock.current || loadingUsers) return false;
    writeLock.current = true;
    setSaving(true);
    setMessage(null);
    return true;
  }

  function endWrite() {
    writeLock.current = false;
    setSaving(false);
  }

  function putUser(updatedUser) {
    setUsers((currentUsers) => {
      const exists = currentUsers.some((user) => user.id === updatedUser.id);
      return exists
        ? currentUsers.map((user) =>
            user.id === updatedUser.id ? updatedUser : user,
          )
        : [updatedUser, ...currentUsers];
    });
  }

  function selectUser(user) {
    if (saving) return;
    setSelectedUser(user);
    setEditingUser({ ...user });
  }

  function closeDetail() {
    if (saving) return;
    setSelectedUser(null);
    setEditingUser(null);
  }

  function handleCreateField(field, value) {
    setCreateForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function handleEditField(field, value) {
    setEditingUser((currentUser) =>
      currentUser
        ? {
            ...currentUser,
            [field]: value,
          }
        : currentUser,
    );
  }

  async function handleCreateUser(event) {
    event.preventDefault();

    const nombre = createForm.nombre.trim();
    const correo = createForm.correo.trim().toLowerCase();

    if (!nombre || !correo || !createForm.rol || !createForm.contrasena) {
      setMessage({
        severity: 'error',
        text: 'Completa nombre, correo, rol y contraseña inicial.',
      });
      return;
    }

    if (createForm.contrasena.length < 8) {
      setMessage({
        severity: 'error',
        text: 'La contraseña debe tener al menos 8 caracteres.',
      });
      return;
    }

    if (!beginWrite()) return;

    let createdUser = null;

    try {
      const result = await apiRequest('/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          nombreCompleto: nombre,
          correo,
          contrasena: createForm.contrasena,
          rol: normalizarRol(createForm.rol),
        }),
      });

      createdUser = toFrontendUser(result.data);
      putUser(createdUser);
      setSelectedUser(createdUser);
      setEditingUser({ ...createdUser });
      setCreateForm({ ...EMPTY_CREATE_FORM });

      if (createForm.estatus === 'INACTIVO') {
        const statusResult = await apiRequest(
          `/usuarios/${createdUser.id}/estatus`,
          {
            method: 'PATCH',
            body: JSON.stringify({ activo: false }),
          },
        );
        createdUser = toFrontendUser(statusResult.data);
        putUser(createdUser);
        setSelectedUser(createdUser);
        setEditingUser({ ...createdUser });
      }

      setMessage({
        severity: 'success',
        text: 'Usuario creado correctamente.',
      });
    } catch (error) {
      setMessage({
        severity: createdUser ? 'warning' : 'error',
        text: error.message || 'No fue posible crear el usuario.',
      });
    } finally {
      endWrite();
    }
  }

  async function handleSaveChanges(event) {
    event.preventDefault();
    if (!editingUser || !selectedUser) return;

    const nombre = editingUser.nombre.trim();
    const correo = editingUser.correo.trim().toLowerCase();

    if (!nombre || !correo || !editingUser.rol) {
      setMessage({
        severity: 'error',
        text: 'Completa nombre, correo y rol.',
      });
      return;
    }

    if (!beginWrite()) return;

    const desiredStatus = editingUser.estatus;

    try {
      const result = await apiRequest(`/usuarios/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombreCompleto: nombre,
          correo,
          rol: normalizarRol(editingUser.rol),
        }),
      });

      let updatedUser = {
        ...selectedUser,
        ...toFrontendUser(result.data),
      };

      if (desiredStatus !== updatedUser.estatus) {
        const statusResult = await apiRequest(
          `/usuarios/${updatedUser.id}/estatus`,
          {
            method: 'PATCH',
            body: JSON.stringify({ activo: desiredStatus === 'ACTIVO' }),
          },
        );
        updatedUser = {
          ...updatedUser,
          ...toFrontendUser(statusResult.data),
        };
      }

      putUser(updatedUser);
      setSelectedUser(updatedUser);
      setEditingUser({ ...updatedUser });

      setMessage({
        severity: 'success',
        text: 'Cambios guardados correctamente.',
      });
    } catch (error) {
      setMessage({
        severity: 'error',
        text: error.message || 'No fue posible guardar los cambios.',
      });
    } finally {
      endWrite();
    }
  }

  async function toggleUserStatus(user) {
    if (!beginWrite()) return;

    const nextActive = user.estatus !== 'ACTIVO';

    try {
      const result = await apiRequest(`/usuarios/${user.id}/estatus`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: nextActive }),
      });

      const updatedUser = {
        ...user,
        ...toFrontendUser(result.data),
      };

      putUser(updatedUser);

      if (selectedUser?.id === user.id) {
        setSelectedUser(updatedUser);
        setEditingUser({ ...updatedUser });
      }

      setMessage({
        severity: 'success',
        text: nextActive
          ? 'Usuario activado correctamente.'
          : 'Usuario desactivado correctamente.',
      });
    } catch (error) {
      setMessage({
        severity: 'error',
        text: error.message || 'No fue posible cambiar el estatus.',
      });
    } finally {
      endWrite();
    }
  }

  async function handleConfirmDelete() {
    if (!userToDelete || !beginWrite()) return;

    try {
      // Llamada DELETE definitiva al backend
      await apiRequest(`/usuarios/${userToDelete.id}`, {
        method: 'DELETE',
      });

      setUsers((current) => current.filter((u) => u.id !== userToDelete.id));

      if (selectedUser?.id === userToDelete.id) {
        closeDetail();
      }

      setMessage({
        severity: 'success',
        text: `El usuario "${userToDelete.nombre}" ha sido eliminado definitivamente.`,
      });
    } catch (err) {
      setMessage({
        severity: 'error',
        text: err.message || 'No fue posible eliminar al usuario.',
      });
    } finally {
      setUserToDelete(null);
      endWrite();
    }
  }

  return (
    <DashboardLayout>
      <Box sx={{ pb: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <RoleSummaryCard
            icon={<GroupOutlined />}
            label="Supervisores"
            value={totals.supervisores}
            detail="Supervisores y administradores activos"
            color="#1674B7"
          />

          <RoleSummaryCard
            icon={<LocationOnOutlined />}
            label="Distribuidores"
            value={totals.distribuidores}
            detail="Distribuidores activos"
            color="#168A4A"
          />

          <RoleSummaryCard
            icon={<LaptopOutlined />}
            label="ISM/MESA"
            value={totals.ismMesa}
            detail="ISM/MESA activos"
            color="#8B5CF6"
          />

          <RoleSummaryCard
            icon={<PersonRemoveOutlined />}
            label="Usuarios inactivos"
            value={totals.inactivos}
            detail="Cuentas desactivadas"
            color="#DC2626"
          />
        </Box>

        <Paper
          component="form"
          onSubmit={handleCreateUser}
          sx={{
            ...panelSx,
            p: 2.25,
            mb: 1.5,
          }}
        >
          <Typography
            component="h1"
            sx={{
              mb: 1.6,
              color: 'text.primary',
              fontSize: '1.1rem',
              fontWeight: 800,
            }}
          >
            Alta de usuario
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))',
                xl:
                  'minmax(180px, 1fr) ' +
                  'minmax(220px, 1.15fr) ' +
                  'minmax(150px, 0.7fr) ' +
                  'minmax(130px, 0.6fr) ' +
                  'minmax(180px, 0.9fr) auto',
              },
              gap: 1.25,
              alignItems: 'start',
            }}
          >
            <TextField
              label="Nombre completo"
              value={createForm.nombre}
              onChange={(event) =>
                handleCreateField('nombre', event.target.value)
              }
              fullWidth
              required
              disabled={busy}
              size="small"
              sx={fieldSx}
            />

            <TextField
              label="Usuario / correo"
              type="email"
              value={createForm.correo}
              onChange={(event) =>
                handleCreateField('correo', event.target.value)
              }
              fullWidth
              required
              disabled={busy}
              size="small"
              sx={fieldSx}
            />

            <FormControl fullWidth required size="small" disabled={busy}>
              <InputLabel id="create-role-label">Rol</InputLabel>
              <Select
                labelId="create-role-label"
                label="Rol"
                value={createForm.rol}
                onChange={(event) =>
                  handleCreateField('rol', event.target.value)
                }
                sx={{ minHeight: 46, fontSize: '0.9rem' }}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" disabled={busy}>
              <InputLabel id="create-status-label">Estatus</InputLabel>
              <Select
                labelId="create-status-label"
                label="Estatus"
                value={createForm.estatus}
                onChange={(event) =>
                  handleCreateField('estatus', event.target.value)
                }
                sx={{ minHeight: 46, fontSize: '0.9rem' }}
              >
                <MenuItem value="ACTIVO">Activo</MenuItem>
                <MenuItem value="INACTIVO">Inactivo</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Contraseña inicial"
              type="password"
              autoComplete="new-password"
              value={createForm.contrasena}
              onChange={(event) =>
                handleCreateField('contrasena', event.target.value)
              }
              fullWidth
              required
              disabled={busy}
              size="small"
              slotProps={{ htmlInput: { minLength: 8 } }}
              sx={fieldSx}
            />

            <Button
              type="submit"
              variant="contained"
              startIcon={
                saving ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AddOutlined />
                )
              }
              disabled={busy}
              sx={primaryButtonSx}
            >
              {saving ? 'Guardando...' : 'Crear usuario'}
            </Button>
          </Box>
        </Paper>

        {message && (
          <Alert
            severity={message.severity}
            onClose={() => setMessage(null)}
            sx={{ mb: 1.5 }}
          >
            {message.text}
          </Alert>
        )}

        {loadError && (
          <Alert
            severity="error"
            sx={{ mb: 1.5 }}
            action={
              <Button color="inherit" onClick={loadUsers} disabled={busy}>
                Reintentar
              </Button>
            }
          >
            {loadError}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              xl: 'minmax(0, 1fr) 330px',
            },
            gap: 1.5,
            alignItems: 'start',
          }}
        >
          <Paper sx={{ ...panelSx, overflow: 'hidden' }}>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'center' },
                justifyContent: 'space-between',
                gap: 1.25,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                component="h2"
                sx={{
                  color: 'text.primary',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                }}
              >
                Usuarios registrados
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar usuario..."
                  size="small"
                  disabled={busy}
                  sx={{
                    ...fieldSx,
                    minWidth: { xs: 0, sm: 220 },
                    flex: 1,
                  }}
                  slotProps={{
                    htmlInput: { 'aria-label': 'Buscar usuarios' },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchOutlined
                            sx={{ color: 'text.secondary', fontSize: 21 }}
                          />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <FormControl size="small" disabled={busy} sx={{ minWidth: 175 }}>
                  <InputLabel id="users-role-filter-label">
                    Filtrar por rol
                  </InputLabel>
                  <Select
                    labelId="users-role-filter-label"
                    label="Filtrar por rol"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <TuneOutlined
                          sx={{ color: 'text.secondary', fontSize: 20 }}
                        />
                      </InputAdornment>
                    }
                    sx={{ minHeight: 46, fontSize: '0.86rem' }}
                  >
                    <MenuItem value="TODOS">Todos los roles</MenuItem>
                    {ROLES.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            {(search || roleFilter !== 'TODOS') && (
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                  {filteredUsers.length} coincidencias
                </Typography>

                <Button
                  size="small"
                  disabled={busy}
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('TODOS');
                    setPage(0);
                  }}
                >
                  Limpiar filtros
                </Button>
              </Box>
            )}

            <TableContainer>
              <Table
                size="small"
                sx={{
                  minWidth: 800,
                  '& th': {
                    color: 'text.secondary',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    bgcolor: 'action.hover',
                  },
                  '& td': {
                    fontSize: '0.84rem',
                    py: 1.1,
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell>Estatus</TableCell>
                    <TableCell>Último acceso</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Box
                          sx={{
                            minHeight: 240,
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <CircularProgress size={32} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : loadError ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ height: 180 }}>
                        No se pudo cargar la lista. Utiliza “Reintentar”.
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Box
                          sx={{
                            minHeight: 240,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                            textAlign: 'center',
                          }}
                        >
                          <PersonOutlineOutlined
                            sx={{ color: 'text.disabled', fontSize: 42 }}
                          />
                          <Typography sx={{ fontWeight: 800 }}>
                            {users.length === 0
                              ? 'No hay usuarios registrados'
                              : 'No hay coincidencias con estos filtros'}
                          </Typography>
                          <Typography
                            sx={{
                              color: 'text.secondary',
                              fontSize: '0.84rem',
                            }}
                          >
                            {users.length === 0
                              ? 'Utiliza el formulario de alta para crear un usuario.'
                              : 'Cambia el rol seleccionado o borra la búsqueda.'}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleUsers.map((user) => {
                      const isActive = user.estatus === 'ACTIVO';

                      return (
                        <TableRow
                          key={user.id}
                          hover
                          selected={selectedUser?.id === user.id}
                          onClick={() => selectUser(user)}
                          sx={{ cursor: saving ? 'default' : 'pointer' }}
                        >
                          <TableCell>
                            <Typography
                              sx={{
                                fontSize: '0.84rem',
                                fontWeight: 700,
                              }}
                            >
                              {user.nombre || 'Sin nombre'}
                            </Typography>
                            <Typography
                              sx={{
                                mt: 0.2,
                                color: 'text.secondary',
                                fontSize: '0.76rem',
                              }}
                            >
                              {user.correo}
                            </Typography>
                          </TableCell>

                          <TableCell>{getRoleLabel(user.rol)}</TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={isActive ? 'Activo' : 'Inactivo'}
                              color={isActive ? 'success' : 'default'}
                              variant="outlined"
                              sx={{ minWidth: 75, fontWeight: 700 }}
                            />
                          </TableCell>

                          <TableCell>
                            {formatDateTime(user.ultimoAcceso, locale)}
                          </TableCell>

                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={0.6}
                              sx={{ alignItems: 'center' }}
                            >
                              <Tooltip title="Editar usuario">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={busy}
                                    aria-label={`Editar a ${user.nombre}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      selectUser(user);
                                    }}
                                    color="primary"
                                  >
                                    <EditOutlined sx={{ fontSize: 20 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>

                              <Button
                                size="small"
                                variant="outlined"
                                disabled={busy}
                                color={isActive ? 'warning' : 'success'}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleUserStatus(user);
                                }}
                                sx={{
                                  minHeight: 32,
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                }}
                              >
                                {isActive ? 'Desactivar' : 'Reactivar'}
                              </Button>

                              <Tooltip title="Eliminar usuario">
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={busy}
                                    color="error"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setUserToDelete(user);
                                    }}
                                  >
                                    <DeleteOutlineOutlined sx={{ fontSize: 20 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredUsers.length}
              page={effectivePage}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[]}
              onPageChange={(_, nextPage) => setPage(nextPage)}
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} de ${count}`
              }
            />
          </Paper>

          <UserDetailPanel
            selectedUser={selectedUser}
            editingUser={editingUser}
            onClose={closeDetail}
            onEditField={handleEditField}
            onSave={handleSaveChanges}
            onToggleStatus={toggleUserStatus}
            onDelete={(user) => setUserToDelete(user)}
            locale={locale}
            saving={busy}
          />
        </Box>

        {/* Diálogo de Confirmación para Eliminar */}
        <Dialog
          open={Boolean(userToDelete)}
          onClose={() => !saving && setUserToDelete(null)}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#DC2626' }}>
            ¿Eliminar usuario?
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Estás a punto de eliminar definitivamente la cuenta de{' '}
              <strong>{userToDelete?.nombre}</strong> ({userToDelete?.correo}).
              Esta acción no se puede deshacer.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setUserToDelete(null)}
              disabled={saving}
              sx={{ textTransform: 'none' }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              disabled={saving}
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              {saving ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}

function RoleSummaryCard({ icon, label, value, detail, color }) {
  return (
    <Paper
      sx={{
        ...panelSx,
        position: 'relative',
        minHeight: 108,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 1.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            color,
            flexShrink: 0,
            '& svg': { fontSize: 27 },
          }}
        >
          {icon}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.94rem', fontWeight: 700 }}>
            {label}
          </Typography>

          <Typography
            sx={{
              mt: 0.4,
              color,
              fontSize: '1.78rem',
              lineHeight: 1.1,
              fontWeight: 800,
            }}
          >
            {value}
          </Typography>

          <Typography
            sx={{
              mt: 0.4,
              color: 'text.secondary',
              fontSize: '0.7rem',
            }}
          >
            {detail}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          left: 0,
          height: 4,
          bgcolor: color,
        }}
      />
    </Paper>
  );
}

function UserDetailPanel({
  selectedUser,
  editingUser,
  onClose,
  onEditField,
  onSave,
  onToggleStatus,
  onDelete,
  locale,
  saving,
}) {
  if (!selectedUser || !editingUser) {
    return (
      <Paper sx={{ ...panelSx, minHeight: 420, p: 2 }}>
        <Typography component="h2" sx={{ fontSize: '1.05rem', fontWeight: 800 }}>
          Detalle / edición
        </Typography>

        <Box
          sx={{
            minHeight: 330,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            textAlign: 'center',
          }}
        >
          <PersonOutlineOutlined sx={{ color: 'text.disabled', fontSize: 44 }} />
          <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>
            Selecciona un usuario
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '0.78rem',
              lineHeight: 1.5,
            }}
          >
            Haz clic en un registro para consultar o editar su información.
          </Typography>
        </Box>
      </Paper>
    );
  }

  const draftActive = editingUser.estatus === 'ACTIVO';
  const savedActive = selectedUser.estatus === 'ACTIVO';
  const knownRole = ROLES.some((role) => role.value === editingUser.rol);

  return (
    <Paper component="form" onSubmit={onSave} sx={{ ...panelSx, p: 2 }}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.6,
        }}
      >
        <Typography component="h2" sx={{ fontSize: '1.05rem', fontWeight: 800 }}>
          Detalle / edición
        </Typography>

        <IconButton
          size="small"
          onClick={onClose}
          disabled={saving}
          aria-label="Cerrar detalle"
        >
          <CloseOutlined />
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Avatar
          sx={{
            width: 44,
            height: 44,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: '0.82rem',
            fontWeight: 800,
          }}
        >
          {getInitials(editingUser.nombre)}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: '0.84rem', fontWeight: 800 }}>
            {editingUser.nombre}
          </Typography>

          <Typography noWrap sx={{ color: 'text.secondary', fontSize: '0.74rem' }}>
            {editingUser.correo}
          </Typography>
        </Box>

        <Chip
          size="small"
          label={savedActive ? 'Activo' : 'Inactivo'}
          color={savedActive ? 'success' : 'default'}
          variant="outlined"
        />
      </Stack>

      <Divider sx={{ my: 1.75 }} />

      <Stack spacing={1.5}>
        <TextField
          label="Nombre completo"
          value={editingUser.nombre}
          onChange={(event) => onEditField('nombre', event.target.value)}
          fullWidth
          required
          size="small"
          disabled={saving}
          sx={fieldSx}
        />

        <TextField
          label="Usuario / correo"
          type="email"
          value={editingUser.correo}
          onChange={(event) => onEditField('correo', event.target.value)}
          fullWidth
          required
          size="small"
          disabled={saving}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={fieldSx}
        />

        <FormControl fullWidth required size="small" disabled={saving}>
          <InputLabel id="edit-role-label">Rol</InputLabel>
          <Select
            labelId="edit-role-label"
            value={editingUser.rol}
            label="Rol"
            onChange={(event) => onEditField('rol', event.target.value)}
            sx={{ minHeight: 46, fontSize: '0.86rem' }}
          >
            {!knownRole && (
              <MenuItem value={editingUser.rol}>
                {getRoleLabel(editingUser.rol)}
              </MenuItem>
            )}

            {ROLES.map((role) => (
              <MenuItem key={role.value} value={role.value}>
                {role.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
          <Switch
            checked={draftActive}
            disabled={saving}
            onChange={(event) =>
              onEditField('estatus', event.target.checked ? 'ACTIVO' : 'INACTIVO')
            }
          />
          <Typography sx={{ color: 'text.secondary', fontSize: '0.84rem' }}>
            {draftActive ? 'Activo' : 'Inactivo'}
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.25,
          }}
        >
          <DetailInfo
            label="Último acceso"
            value={formatDateTime(selectedUser.ultimoAcceso, locale)}
          />

          <DetailInfo
            label="Fecha de creación"
            value={formatDateTime(selectedUser.fechaCreacion, locale)}
          />
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button
          type="button"
          variant="outlined"
          color="error"
          fullWidth
          disabled={saving}
          onClick={() => onDelete(selectedUser)}
          sx={{ minHeight: 44, fontSize: '0.8rem', fontWeight: 700 }}
        >
          Eliminar
        </Button>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={saving}
          sx={{ minHeight: 44, fontSize: '0.8rem', fontWeight: 700 }}
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </Stack>
    </Paper>
  );
}

function DetailInfo({ label, value }) {
  return (
    <Box>
      <Typography
        sx={{
          color: 'text.secondary',
          fontSize: '0.66rem',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>

      <Typography sx={{ mt: 0.3, fontSize: '0.76rem', lineHeight: 1.4 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default UserManagementPage;