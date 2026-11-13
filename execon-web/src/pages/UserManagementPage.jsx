import {
  AddOutlined,
  CloseOutlined,
  DeleteOutlineOutlined,
  EditOutlined,
  EmailOutlined,
  LaptopOutlined,
  LocationOnOutlined,
  NavigateBefore,
  NavigateNext,
  PersonOutlineOutlined,
  PersonRemoveOutlined,
  SearchOutlined,
  StarOutlineOutlined,
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
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { usePreferences } from '../context/PreferencesContext';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

const ROLES = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'distribuidor', label: 'Distribuidor' },
  { value: 'ISMMESA', label: 'ISM/MESA' },
];

const EMPTY_CREATE_FORM = {
  nombre: '',
  correo: '',
  rol: '',
  estatus: 'ACTIVO',
  contrasena: '',
};

/* ---------- Tokens del Sistema de Diseño ---------- */
const T = {
  border: '#E2E8F0',
  text: '#0F172A',
  text2: '#475569',
  text3: '#94A3B8',
  primary: '#003359',
  head: '#F8FAFC',
};

const cardSx = {
  bgcolor: '#FFFFFF',
  borderRadius: 2.5,
  border: `1px solid ${T.border}`,
  boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.04)',
};

const thSx = {
  fontSize: '0.66rem',
  fontWeight: 800,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: T.text3,
  py: 1.3,
  bgcolor: T.head,
  borderBottom: `1px solid ${T.border}`,
};

const iconBtnSx = {
  border: `1px solid ${T.border}`,
  borderRadius: 1.5,
  color: T.text2,
  '&:hover': { bgcolor: '#F1F5F9' },
};

/* ---------- Helpers de normalización ---------- */
function normalizarRol(rol) {
  const valor = String(rol || '').trim().toLowerCase();
  const equivalencias = {
    admin: 'supervisor',
    supervisor: 'supervisor',
    'supervisor/administrador': 'supervisor',
    distribuidor: 'distribuidor',
    'distribuidor/onsite': 'distribuidor',
    ingeniero: 'ISMMESA',
    ismmesa: 'ISMMESA',
    'ism/mesa': 'ISMMESA',
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
    nombre: user.nombreCompleto || user.nombre_completo || user.nombre || '',
    correo: user.correo || user.email || '',
    rol: normalizarRol(user.rol),
    estatus:
      String(user.estatus || '').toUpperCase() === 'INACTIVO' || user.activo === false
        ? 'INACTIVO'
        : 'ACTIVO',
    ultimoAcceso: user.ultimoAcceso || user.ultimo_acceso || null,
    fechaCreacion: user.creadoEn || user.creado_en || user.created_at || null,
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
          : 'No fue posible completar la operación.')
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

/* ---------- Badge de rol corporativo ---------- */
function RolBadge({ rol }) {
  const norm = normalizarRol(rol);
  let color = '#6D5BD0';
  let Icon = LaptopOutlined;
  let label = 'ISM/MESA';

  if (norm === 'supervisor') {
    color = '#155E9C';
    Icon = StarOutlineOutlined;
    label = 'Supervisor';
  } else if (norm === 'distribuidor') {
    color = '#0E9F6E';
    Icon = LocationOnOutlined;
    label = 'Distribuidor';
  }

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, color, fontWeight: 700, fontSize: '0.8rem' }}>
      <Icon sx={{ fontSize: 16 }} />
      <span>{label}</span>
    </Box>
  );
}

/* ---------- Tarjeta KPI con animación y soporte para Imagen o Ícono ---------- */
function KpiCard({ label, value, sub, bg, color, imgSrc, Icon }) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...cardSx,
        p: 2.2,
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
        cursor: 'default',
        '&:hover': {
          transform: 'translateY(-4px) scale(1.01)',
          boxShadow: '0 12px 24px -8px rgba(10,37,64,0.12), 0 4px 12px rgba(15,23,42,0.06)',
          borderColor: '#CBD5E1',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography
          sx={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: T.text3 }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: bg,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {imgSrc ? (
            <Box
              component="img"
              src={imgSrc}
              alt={label}
              sx={{
                width: 60,
                height: 60,
                objectFit: 'contain',
                display: 'block',
              }}
            />
          ) : Icon ? (
            <Icon sx={{ fontSize: 20 }} />
          ) : null}
        </Box>
      </Box>
      <Typography sx={{ fontSize: '1.85rem', fontWeight: 800, color: T.text, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.74rem', color: T.text3, mt: 0.8 }}>{sub}</Typography>
    </Paper>
  );
}

/* ---------- Componente Principal ---------- */
export default function UserManagementPage() {
  const preferences = usePreferences();
  const configuredRows = Number(preferences?.registrosPorPagina);
  const rowsPerPage = [8, 10, 20, 50].includes(configuredRows) ? configuredRows : 8;
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
      const list = Array.isArray(result) ? result : result.data;
      if (!Array.isArray(list)) {
        throw new Error('La API devolvió una lista de usuarios inesperada.');
      }
      if (sequence !== loadSequence.current) return;
      setUsers(list.map(toFrontendUser));
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
      const searchable = normalizarTexto([user.nombre, user.correo, getRoleLabel(user.rol)].join(' '));
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const rol = normalizarRol(user.rol);
      const matchesRole = roleFilter === 'TODOS' || rol === normalizarRol(roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const lastPage = Math.max(0, Math.ceil(filteredUsers.length / rowsPerPage) - 1);
  const effectivePage = Math.min(page, lastPage);
  const visibleUsers = filteredUsers.slice(effectivePage * rowsPerPage, (effectivePage + 1) * rowsPerPage);

  const totals = useMemo(() => {
    return {
      supervisores: users.filter(
        (u) => ['admin', 'supervisor'].includes(normalizarRol(u.rol)) && u.estatus === 'ACTIVO'
      ).length,
      distribuidores: users.filter((u) => normalizarRol(u.rol) === 'distribuidor' && u.estatus === 'ACTIVO').length,
      ismMesa: users.filter((u) => normalizarRol(u.rol) === 'ISMMESA' && u.estatus === 'ACTIVO').length,
      inactivos: users.filter((u) => u.estatus === 'INACTIVO').length,
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
      const exists = currentUsers.some((u) => u.id === updatedUser.id);
      return exists
        ? currentUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
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
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function handleEditField(field, value) {
    setEditingUser((current) => (current ? { ...current, [field]: value } : current));
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    const nombre = createForm.nombre.trim();
    const correo = createForm.correo.trim().toLowerCase();

    if (!nombre || !correo || !createForm.rol || !createForm.contrasena) {
      setMessage({ severity: 'error', text: 'Completa nombre, correo, rol y contraseña inicial.' });
      return;
    }

    if (createForm.contrasena.length < 8) {
      setMessage({ severity: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' });
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

      createdUser = toFrontendUser(result.data || result);
      putUser(createdUser);
      setSelectedUser(createdUser);
      setEditingUser({ ...createdUser });
      setCreateForm({ ...EMPTY_CREATE_FORM });

      if (createForm.estatus === 'INACTIVO') {
        const statusResult = await apiRequest(`/usuarios/${createdUser.id}/estatus`, {
          method: 'PATCH',
          body: JSON.stringify({ activo: false }),
        });
        createdUser = toFrontendUser(statusResult.data || statusResult);
        putUser(createdUser);
        setSelectedUser(createdUser);
        setEditingUser({ ...createdUser });
      }

      setMessage({ severity: 'success', text: 'Usuario creado correctamente.' });
    } catch (error) {
      setMessage({
        severity: createdUser ? 'warning' : 'error',
        text: error.message || 'No fue posible crear el usuario.',
      });
    } finally {
      endWrite();
    }
  }

  async function handleSaveChanges(e) {
    e.preventDefault();
    if (!editingUser || !selectedUser) return;

    const nombre = editingUser.nombre.trim();
    const correo = editingUser.correo.trim().toLowerCase();

    if (!nombre || !correo || !editingUser.rol) {
      setMessage({ severity: 'error', text: 'Completa nombre, correo y rol.' });
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

      let updatedUser = { ...selectedUser, ...toFrontendUser(result.data || result) };

      if (desiredStatus !== updatedUser.estatus) {
        const statusResult = await apiRequest(`/usuarios/${updatedUser.id}/estatus`, {
          method: 'PATCH',
          body: JSON.stringify({ activo: desiredStatus === 'ACTIVO' }),
        });
        updatedUser = { ...updatedUser, ...toFrontendUser(statusResult.data || statusResult) };
      }

      putUser(updatedUser);
      setSelectedUser(updatedUser);
      setEditingUser({ ...updatedUser });
      setMessage({ severity: 'success', text: 'Cambios guardados correctamente.' });
    } catch (error) {
      setMessage({ severity: 'error', text: error.message || 'No fue posible guardar los cambios.' });
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

      const updatedUser = { ...user, ...toFrontendUser(result.data || result) };
      putUser(updatedUser);

      if (selectedUser?.id === user.id) {
        setSelectedUser(updatedUser);
        setEditingUser({ ...updatedUser });
      }

      setMessage({
        severity: 'success',
        text: nextActive ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.',
      });
    } catch (error) {
      setMessage({ severity: 'error', text: error.message || 'No fue posible cambiar el estatus.' });
    } finally {
      endWrite();
    }
  }

  async function handleConfirmDelete() {
    if (!userToDelete || !beginWrite()) return;
    try {
      await apiRequest(`/usuarios/${userToDelete.id}`, { method: 'DELETE' });
      setUsers((current) => current.filter((u) => u.id !== userToDelete.id));
      if (selectedUser?.id === userToDelete.id) {
        closeDetail();
      }
      setMessage({
        severity: 'success',
        text: `El usuario ${userToDelete.nombre} ha sido eliminado definitivamente.`,
      });
    } catch (err) {
      setMessage({ severity: 'error', text: err.message || 'No fue posible eliminar al usuario.' });
    } finally {
      setUserToDelete(null);
      endWrite();
    }
  }

  return (
    <DashboardLayout>
      <Box sx={{ pb: 4, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {message && (
          <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ borderRadius: 2 }}>
            {message.text}
          </Alert>
        )}

        {loadError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={loadUsers} disabled={busy}>
                Reintentar
              </Button>
            }
            sx={{ borderRadius: 2 }}
          >
            {loadError}
          </Alert>
        )}

        {/* 1. KPIs de roles con animación hover e imágenes */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <KpiCard
            label="Supervisores"
            value={totals.supervisores}
            sub="Supervisores y administradores"
            bg="#EAF2FA"
            color="#155E9C"
            imgSrc="/supervisor.webp"
          />
          <KpiCard
            label="Distribuidores"
            value={totals.distribuidores}
            sub="Distribuidores activos"
            bg="#E9F9F1"
            color="#0E9F6E"
            Icon={LocationOnOutlined}
          />
          <KpiCard
            label="ISM/MESA"
            value={totals.ismMesa}
            sub="Técnicos activos"
            bg="#EFEDFA"
            color="#6D5BD0"
            Icon={LaptopOutlined}
          />
          <KpiCard
            label="Usuarios inactivos"
            value={totals.inactivos}
            sub="Cuentas desactivadas"
            bg="#FDECEA"
            color="#C0392B"
            Icon={PersonRemoveOutlined}
          />
        </Box>

        {/* 2. Alta de usuario (Fila horizontal equilibrada) */}
        <Paper elevation={0} sx={{ ...cardSx, overflow: 'hidden' }}>
          <Box
            sx={{
              px: 3,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.text }}>
                Alta de usuario
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: T.text3 }}>
                La contraseña se cifra con bcrypt antes de guardarse
              </Typography>
            </Box>
            <Chip
              label="Cuenta nueva"
              size="small"
              sx={{ bgcolor: '#EAF2FA', color: '#155E9C', fontWeight: 700, fontSize: '0.7rem', borderRadius: 2 }}
            />
          </Box>

          <Box
            component="form"
            onSubmit={handleCreateUser}
            sx={{
              p: 3,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
                lg: '1.2fr 1.3fr 1fr 0.9fr 1.1fr auto',
              },
              gap: 2,
              alignItems: 'center',
            }}
          >
            <TextField
              label="Nombre completo *"
              placeholder="Ej. Ana Martínez"
              size="small"
              value={createForm.nombre}
              onChange={(e) => handleCreateField('nombre', e.target.value)}
              disabled={busy}
              slotProps={{ input: { sx: { bgcolor: '#F8FAFC', borderRadius: 2, fontSize: '0.84rem' } } }}
            />

            <TextField
              label="Usuario / correo *"
              placeholder="ana@execon.mx"
              type="email"
              size="small"
              value={createForm.correo}
              onChange={(e) => handleCreateField('correo', e.target.value)}
              disabled={busy}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined sx={{ fontSize: 16, color: T.text3 }} />
                    </InputAdornment>
                  ),
                  sx: { bgcolor: '#F8FAFC', borderRadius: 2, fontSize: '0.84rem' },
                },
              }}
            />

            <FormControl size="small" disabled={busy}>
              <InputLabel id="crear-rol-label">Rol *</InputLabel>
              <Select
                labelId="crear-rol-label"
                label="Rol *"
                value={createForm.rol}
                onChange={(e) => handleCreateField('rol', e.target.value)}
                sx={{ bgcolor: '#F8FAFC', borderRadius: 2, fontSize: '0.84rem' }}
              >
                {ROLES.map((r) => (
                  <MenuItem key={r.value} value={r.value} sx={{ fontSize: '0.84rem' }}>
                    {r.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" disabled={busy}>
              <InputLabel id="crear-estatus-label">Estatus</InputLabel>
              <Select
                labelId="crear-estatus-label"
                label="Estatus"
                value={createForm.estatus}
                onChange={(e) => handleCreateField('estatus', e.target.value)}
                sx={{ bgcolor: '#F8FAFC', borderRadius: 2, fontSize: '0.84rem' }}
              >
                <MenuItem value="ACTIVO" sx={{ fontSize: '0.84rem' }}>Activo</MenuItem>
                <MenuItem value="INACTIVO" sx={{ fontSize: '0.84rem' }}>Inactivo</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Contraseña inicial *"
              placeholder="••••••••"
              type="password"
              size="small"
              value={createForm.contrasena}
              onChange={(e) => handleCreateField('contrasena', e.target.value)}
              disabled={busy}
              slotProps={{
                htmlInput: { minLength: 8 },
                input: { sx: { bgcolor: '#F8FAFC', borderRadius: 2, fontSize: '0.84rem' } },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={busy}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddOutlined />}
              sx={{
                bgcolor: T.primary,
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '0.86rem',
                borderRadius: 2,
                height: 40,
                px: 2.5,
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#002642' },
              }}
            >
              Crear usuario
            </Button>
          </Box>
        </Paper>

        {/* 3. Layout Maestro-Detalle (Tabla + Panel lateral sticky) */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: selectedUser ? '1fr 340px' : '1fr' },
            gap: 2.5,
            alignItems: 'start',
          }}
        >
          {/* Tabla de usuarios */}
          <Paper elevation={0} sx={{ ...cardSx, overflow: 'hidden' }}>
            <Box
              sx={{
                px: 3,
                py: 2,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', md: 'center' },
                gap: 2,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: T.text }}>
                  Usuarios registrados
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: T.text3 }}>
                  Haz clic en una fila para consultar o editar su información
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <TuneOutlined sx={{ fontSize: 16, color: T.text3 }} />
                      </InputAdornment>
                    }
                    sx={{ bgcolor: T.head, borderRadius: 2, fontSize: '0.8rem' }}
                  >
                    <MenuItem value="TODOS" sx={{ fontSize: '0.8rem' }}>Todos los roles</MenuItem>
                    {ROLES.map((r) => (
                      <MenuItem key={r.value} value={r.value} sx={{ fontSize: '0.8rem' }}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  placeholder="Buscar usuario…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchOutlined sx={{ fontSize: 18, color: T.text3 }} />
                        </InputAdornment>
                      ),
                      sx: { bgcolor: T.head, borderRadius: 2, fontSize: '0.8rem' },
                    },
                  }}
                  sx={{ minWidth: { xs: '100%', sm: 220 } }}
                />
              </Stack>
            </Box>

            <TableContainer>
              <Table size="small" sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={thSx}>Usuario</TableCell>
                    <TableCell sx={thSx}>Rol</TableCell>
                    <TableCell sx={thSx}>Estatus</TableCell>
                    <TableCell sx={thSx}>Último acceso</TableCell>
                    <TableCell align="right" sx={thSx}>
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={28} sx={{ color: T.primary }} />
                        <Typography sx={{ fontSize: '0.8rem', color: T.text3, mt: 1 }}>
                          Cargando usuarios...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : visibleUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6, border: 0 }}>
                        <PersonOutlineOutlined sx={{ fontSize: 38, color: '#CBD5E1', mb: 0.5 }} />
                        <Typography sx={{ fontSize: '0.86rem', fontWeight: 700, color: T.text2 }}>
                          No se encontraron usuarios
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: T.text3 }}>
                          Intenta con otro filtro o agrega un usuario en el formulario superior.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleUsers.map((user) => {
                      const isActive = user.estatus === 'ACTIVO';
                      const isSelected = selectedUser?.id === user.id;

                      return (
                        <TableRow
                          key={user.id}
                          hover
                          onClick={() => selectUser(user)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: isSelected ? '#EAF2FA !important' : 'inherit',
                            '&:last-child td, &:last-child th': { border: 0 },
                          }}
                        >
                          <TableCell sx={{ py: 1.4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  background: 'linear-gradient(135deg,#1D6FB8,#14406A)',
                                }}
                              >
                                {getInitials(user.nombre)}
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: T.text }}>
                                  {user.nombre || 'Sin nombre'}
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: T.text3 }}>
                                  {user.correo}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell sx={{ py: 1.4 }}>
                            <RolBadge rol={user.rol} />
                          </TableCell>

                          <TableCell sx={{ py: 1.4 }}>
                            <Chip
                              size="small"
                              label={isActive ? 'Activo' : 'Inactivo'}
                              sx={{
                                bgcolor: isActive ? '#E9F9F1' : '#F1F5F9',
                                color: isActive ? '#0E9F6E' : '#64748B',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                borderRadius: 5,
                                height: 22,
                              }}
                            />
                          </TableCell>

                          <TableCell sx={{ py: 1.4, fontSize: '0.78rem', color: T.text2 }}>
                            {formatDateTime(user.ultimoAcceso, locale)}
                          </TableCell>

                          <TableCell align="right" sx={{ py: 1.4 }} onClick={(e) => e.stopPropagation()}>
                            <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => selectUser(user)} sx={iconBtnSx}>
                                  <EditOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title={isActive ? 'Desactivar' : 'Activar'}>
                                <IconButton
                                  size="small"
                                  onClick={() => toggleUserStatus(user)}
                                  disabled={busy}
                                  sx={{
                                    ...iconBtnSx,
                                    color: isActive ? '#B45309' : '#0E9F6E',
                                  }}
                                >
                                  <PersonRemoveOutlined fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Eliminar">
                                <IconButton
                                  size="small"
                                  onClick={() => setUserToDelete(user)}
                                  disabled={busy}
                                  sx={{
                                    ...iconBtnSx,
                                    color: '#DC2626',
                                    '&:hover': { bgcolor: '#FDECEA', borderColor: '#F5C6C0' },
                                  }}
                                >
                                  <DeleteOutlineOutlined fontSize="small" />
                                </IconButton>
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

            {/* Paginación */}
            <Box
              sx={{
                px: 3,
                py: 1.6,
                borderTop: `1px solid ${T.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography sx={{ fontSize: '0.74rem', color: T.text3 }}>
                {filteredUsers.length === 0
                  ? '0 registros'
                  : `${effectivePage * rowsPerPage + 1}–${Math.min(
                      (effectivePage + 1) * rowsPerPage,
                      filteredUsers.length
                    )} de ${filteredUsers.length} usuarios`}
              </Typography>

              <Stack direction="row" spacing={1}>
                <IconButton
                  size="small"
                  disabled={effectivePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  sx={iconBtnSx}
                >
                  <NavigateBefore fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={effectivePage >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  sx={iconBtnSx}
                >
                  <NavigateNext fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </Paper>

          {/* Panel Lateral: Detalle / Edición Sticky */}
          {selectedUser && editingUser && (
            <Paper
              elevation={0}
              component="form"
              onSubmit={handleSaveChanges}
              sx={{
                ...cardSx,
                position: 'sticky',
                top: 16,
                overflow: 'hidden',
              }}
            >
              {/* Hero del usuario seleccionado */}
              <Box
                sx={{
                  p: 3,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderBottom: `1px solid ${T.border}`,
                  position: 'relative',
                }}
              >
                <IconButton
                  size="small"
                  onClick={closeDetail}
                  sx={{ position: 'absolute', top: 12, right: 12, color: T.text3 }}
                >
                  <CloseOutlined fontSize="small" />
                </IconButton>

                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg,#1D6FB8,#14406A)',
                    mb: 1.2,
                  }}
                >
                  {getInitials(editingUser.nombre)}
                </Avatar>
                <Typography sx={{ fontSize: '0.96rem', fontWeight: 800, color: T.text }}>
                  {editingUser.nombre || 'Sin nombre'}
                </Typography>
                <Typography sx={{ fontSize: '0.74rem', color: T.text3 }}>{editingUser.correo}</Typography>
                <Box sx={{ mt: 1 }}>
                  <RolBadge rol={editingUser.rol} />
                </Box>
              </Box>

              {/* Formulario de edición rápida */}
              <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nombre completo"
                  value={editingUser.nombre}
                  onChange={(e) => handleEditField('nombre', e.target.value)}
                  disabled={saving}
                  slotProps={{ input: { sx: { borderRadius: 2, fontSize: '0.84rem' } } }}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Correo / Usuario"
                  value={editingUser.correo}
                  onChange={(e) => handleEditField('correo', e.target.value)}
                  disabled={saving}
                  slotProps={{ input: { sx: { borderRadius: 2, fontSize: '0.84rem' } } }}
                />

                <FormControl fullWidth size="small" disabled={saving}>
                  <InputLabel id="edit-rol-label">Rol</InputLabel>
                  <Select
                    labelId="edit-rol-label"
                    label="Rol"
                    value={editingUser.rol}
                    onChange={(e) => handleEditField('rol', e.target.value)}
                    sx={{ borderRadius: 2, fontSize: '0.84rem' }}
                  >
                    {ROLES.map((r) => (
                      <MenuItem key={r.value} value={r.value} sx={{ fontSize: '0.84rem' }}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    bgcolor: T.head,
                    borderRadius: 2,
                    border: `1px solid ${T.border}`,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: T.text }}>
                      Estatus de la cuenta
                    </Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: T.text3 }}>
                      {editingUser.estatus === 'ACTIVO' ? 'Permite acceso al sistema' : 'Acceso bloqueado'}
                    </Typography>
                  </Box>
                  <Switch
                    checked={editingUser.estatus === 'ACTIVO'}
                    onChange={(e) => handleEditField('estatus', e.target.checked ? 'ACTIVO' : 'INACTIVO')}
                    disabled={saving}
                    size="small"
                  />
                </Box>

                <Divider sx={{ my: 0.5 }} />

                {/* Metadatos */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>
                      Último acceso
                    </Typography>
                    <Typography sx={{ fontSize: '0.76rem', color: T.text, mt: 0.3 }}>
                      {formatDateTime(selectedUser.ultimoAcceso, locale)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>
                      Fecha de alta
                    </Typography>
                    <Typography sx={{ fontSize: '0.76rem', color: T.text, mt: 0.3 }}>
                      {formatDateTime(selectedUser.fechaCreacion, locale)}
                    </Typography>
                  </Box>
                </Box>

                {/* Botones de acción */}
                <Stack direction="row" spacing={1.2} sx={{ mt: 1 }}>
                  <Button
                    type="button"
                    variant="outlined"
                    color="error"
                    fullWidth
                    disabled={saving}
                    onClick={() => setUserToDelete(selectedUser)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      borderRadius: 2,
                    }}
                  >
                    Eliminar
                  </Button>

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={saving}
                    sx={{
                      bgcolor: T.primary,
                      textTransform: 'none',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      borderRadius: 2,
                      '&:hover': { bgcolor: '#002642' },
                    }}
                  >
                    {saving ? <CircularProgress size={16} color="inherit" /> : 'Guardar'}
                  </Button>
                </Stack>
              </Box>
            </Paper>
          )}
        </Box>

        {/* Diálogo de Confirmación para Eliminar Usuario */}
        <Dialog
          open={Boolean(userToDelete)}
          onClose={() => !saving && setUserToDelete(null)}
          maxWidth="xs"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 2.5, p: 1 } } }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#DC2626', fontSize: '1.05rem' }}>
            ¿Eliminar usuario?
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: '0.86rem', color: T.text2 }}>
              Estás a punto de eliminar definitivamente la cuenta de{' '}
              <strong>{userToDelete?.nombre}</strong> ({userToDelete?.correo}). Esta acción no se puede deshacer.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setUserToDelete(null)}
              disabled={saving}
              sx={{ textTransform: 'none', color: T.text2, fontWeight: 700 }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              disabled={saving}
              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
            >
              {saving ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}