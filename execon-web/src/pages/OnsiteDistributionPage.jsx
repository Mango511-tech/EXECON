import {
  AddOutlined,
  AssignmentIndOutlined,
  CheckCircleOutlineOutlined,
  CloseOutlined,
  DownloadOutlined,
  EditOutlined,
  HourglassEmptyOutlined,
  InboxOutlined,
  NavigateBefore,
  NavigateNext,
  PersonOutlineOutlined,
  SearchOutlined,
  VisibilityOutlined,
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
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import DashboardLayout from '../layouts/DashboardLayout';

const ITEMS_POR_PAGINA = 8;
const MONO = "'Cascadia Code', 'Consolas', monospace";

const INITIAL_INCIDENTE_FORM = {
  folio: '',
  resumen: '',
  descripcion: '',
  ubicacion: '',
  tecnicoId: '',
  estatus: 'Pendiente',
};

/* ---------- Helpers seguros sin datos inventados ---------- */
const safeText = (val) => (val === null || val === undefined ? '' : String(val).trim());

// Extrae el nombre real del usuario según las columnas posibles del backend
const getNombreUsuario = (u) => {
  if (!u) return '';
  return safeText(u.nombre_completo || u.nombre || u.usuario || u.username || u.name);
};

const getInit = (val) => {
  const t = safeText(val);
  return t.length > 0 ? t.charAt(0).toUpperCase() : '?';
};

const esEnAtencion = (s) => {
  const st = safeText(s).toLowerCase();
  return st === 'en atención' || st === 'en atencion' || st === 'asignado';
};
const esFinalizado = (s) => {
  const st = safeText(s).toLowerCase();
  return st === 'finalizado' || st === 'resuelto' || st === 'cerrado';
};
const esPendiente = (s) => safeText(s).toLowerCase() === 'pendiente';

// Filtra que sea estrictamente ISM/MESA y no supervisor/admin/distribuidor
const esIsmMesa = (u) => {
  if (!u) return false;
  const rol = safeText(u.rol || u.role || u.tipo_usuario).toUpperCase();
  if (rol.includes('SUPERVISOR') || rol.includes('ADMIN') || rol.includes('DISTRIBUIDOR')) {
    return false;
  }
  return (
    rol.includes('ISM') ||
    rol.includes('MESA') ||
    rol.includes('TECNICO') ||
    rol.includes('TÉCNICO') ||
    rol === ''
  );
};

/* ---------- Estilos reutilizables ---------- */
const cardSx = {
  borderRadius: 2.5,
  border: '1px solid #E2E8F0',
  bgcolor: '#FFFFFF',
  boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.04)',
};

const thSx = {
  fontSize: '0.66rem',
  fontWeight: 800,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: '#94A3B8',
  py: 1.3,
  bgcolor: '#F8FAFC',
};

const dashedSx = {
  border: '1.5px dashed #C7D5E4',
  borderRadius: 2.5,
  p: 2,
  bgcolor: '#FBFDFE',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const dashedTitleSx = {
  fontSize: '0.66rem',
  fontWeight: 800,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: '#94A3B8',
  mb: 1.2,
  display: 'flex',
  alignItems: 'center',
  gap: 0.8,
};

const labelSx = {
  fontSize: '0.7rem',
  fontWeight: 800,
  color: '#64748B',
  textTransform: 'uppercase',
};

const iconBtnSx = {
  border: '1px solid #E2E8F0',
  borderRadius: 1.5,
  color: '#64748B',
  '&:hover': { bgcolor: '#F1F5F9' },
};

/* ---------- Tarjeta KPI con animación hover ---------- */
function KpiCard({ label, value, sub, bg, color, Icon }) {
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
          sx={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#94A3B8' }}
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
          }}
        >
          <Icon sx={{ fontSize: 20 }} />
        </Box>
      </Box>
      <Typography sx={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.74rem', color: '#94A3B8', mt: 0.8 }}>{sub}</Typography>
    </Paper>
  );
}

function Paso({ n, texto, hecho, activo }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
      <Box
        sx={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          bgcolor: hecho ? '#E9F9F1' : activo ? '#003359' : '#E2E8F0',
          color: hecho ? '#168A4A' : activo ? '#FFFFFF' : '#64748B',
          fontSize: '0.72rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {n}
      </Box>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{texto}</Typography>
    </Box>
  );
}

export default function OnsiteDistributionPage() {
  const [incidentes, setIncidentes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('Todos');
  const [pagina, setPagina] = useState(1);

  // Asignación rápida
  const [agenteAsignar, setAgenteAsignar] = useState('');
  const [folioAsignar, setFolioAsignar] = useState('');
  const [asignando, setAsignando] = useState(false);

  // Modales
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalFormulario, setModalFormulario] = useState(false);
  const [formulario, setFormulario] = useState(INITIAL_INCIDENTE_FORM);
  const [editandoId, setEditandoId] = useState(null);
  const [guardandoForm, setGuardandoForm] = useState(false);

  const [mensaje, setMensaje] = useState(null);

  // Carga de datos
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resIncidentes, resTecnicos] = await Promise.allSettled([
        api.get('/onsite'),
        api.get('/usuarios?rol=ISM/MESA'),
      ]);

      if (resIncidentes.status === 'fulfilled') {
        const datos = resIncidentes.value.data?.data || resIncidentes.value.data || [];
        setIncidentes(Array.isArray(datos) ? datos : []);
      } else {
        setIncidentes([]);
      }

      if (resTecnicos.status === 'fulfilled') {
        const datos = resTecnicos.value.data?.data || resTecnicos.value.data || [];
        setTecnicos(Array.isArray(datos) ? datos : []);
      } else {
        setTecnicos([]);
      }
    } catch {
      setIncidentes([]);
      setTecnicos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Lista depurada: solo usuarios reales con nombre, rol ISM/MESA y en estatus mesa
  const tecnicosIsmDisponibles = useMemo(() => {
    if (!Array.isArray(tecnicos)) return [];
    return tecnicos.filter((t) => {
      if (!t || t.activo === false) return false;
      // Solo usuarios que tengan nombre real registrado
      const nombre = getNombreUsuario(t);
      if (!nombre) return false;
      if (!esIsmMesa(t)) return false;
      return t.en_mesa === true || t.estatus === 'En mesa' || !t.onsite_actual;
    });
  }, [tecnicos]);

  // Métricas reales
  const kpis = useMemo(() => {
    const list = Array.isArray(incidentes) ? incidentes : [];
    const total = list.length;
    const pendientes = list.filter((i) => esPendiente(i?.estatus)).length;
    const enAtencion = list.filter((i) => esEnAtencion(i?.estatus)).length;
    const finalizados = list.filter((i) => esFinalizado(i?.estatus)).length;
    const disponibles = tecnicosIsmDisponibles.length;

    return { total, pendientes, enAtencion, finalizados, disponibles };
  }, [incidentes, tecnicosIsmDisponibles]);

  // Asignación rápida
  const handleAsignacionRapida = async (e) => {
    e.preventDefault();
    if (!agenteAsignar || !folioAsignar.trim()) {
      setMensaje({
        tipo: 'warning',
        texto: 'Selecciona un técnico disponible e ingresa el folio del incidente.',
      });
      return;
    }

    setAsignando(true);
    try {
      await api.post('/onsite/asignar', {
        tecnicoId: agenteAsignar,
        folio: folioAsignar.trim(),
      });
      setMensaje({
        tipo: 'success',
        texto: `Incidente ${folioAsignar.trim()} asignado exitosamente.`,
      });
      setAgenteAsignar('');
      setFolioAsignar('');
      cargarDatos();
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'No fue posible completar la asignación rápida.',
      });
    } finally {
      setAsignando(false);
    }
  };

  // Crear o editar
  const handleGuardarIncidente = async (e) => {
    e.preventDefault();
    if (!formulario.folio.trim() || !formulario.resumen.trim()) {
      setMensaje({
        tipo: 'warning',
        texto: 'El folio y el resumen del incidente son obligatorios.',
      });
      return;
    }

    setGuardandoForm(true);
    try {
      if (editandoId) {
        await api.put(`/onsite/${editandoId}`, formulario);
        setMensaje({ tipo: 'success', texto: 'Incidente actualizado correctamente.' });
      } else {
        await api.post('/onsite', formulario);
        setMensaje({ tipo: 'success', texto: 'Incidente registrado correctamente.' });
      }
      setModalFormulario(false);
      setEditandoId(null);
      setFormulario(INITIAL_INCIDENTE_FORM);
      cargarDatos();
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'Ocurrió un error al guardar el incidente.',
      });
    } finally {
      setGuardandoForm(false);
    }
  };

  const abrirCreacion = () => {
    setEditandoId(null);
    setFormulario(INITIAL_INCIDENTE_FORM);
    setModalFormulario(true);
  };

  const abrirEdicion = (item) => {
    if (!item) return;
    setEditandoId(item.id);
    setFormulario({
      folio: item.folio || '',
      resumen: item.resumen || item.titulo || '',
      descripcion: item.descripcion || '',
      ubicacion: item.ubicacion || '',
      tecnicoId: item.tecnico_id || item.tecnicoId || '',
      estatus: item.estatus || 'Pendiente',
    });
    setModalFormulario(true);
  };

  // Exportar a CSV
  const exportarCSV = () => {
    if (!incidentes.length) return;
    const encabezados = ['Fecha', 'Folio', 'Resumen', 'Ubicacion', 'Tecnico', 'Estatus'];
    const filas = incidentes.map((i) => [
      `"${i?.fecha || i?.creado_en || ''}"`,
      `"${i?.folio || ''}"`,
      `"${safeText(i?.resumen || i?.titulo).replace(/"/g, '""')}"`,
      `"${i?.ubicacion || ''}"`,
      `"${i?.tecnico_nombre || i?.tecnico || 'Sin asignar'}"`,
      `"${i?.estatus || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [encabezados.join(','), ...filas.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `onsite_distribucion_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado
  const incidentesFiltrados = useMemo(() => {
    const list = Array.isArray(incidentes) ? incidentes : [];
    return list.filter((item) => {
      if (!item) return false;
      const b = busqueda.toLowerCase();
      const matchBusqueda =
        safeText(item.folio).toLowerCase().includes(b) ||
        safeText(item.resumen || item.titulo).toLowerCase().includes(b) ||
        safeText(item.ubicacion).toLowerCase().includes(b);

      if (!matchBusqueda) return false;

      if (filtroEstatus === 'Pendientes') return esPendiente(item.estatus);
      if (filtroEstatus === 'En atención') return esEnAtencion(item.estatus);
      if (filtroEstatus === 'Finalizados') return esFinalizado(item.estatus);
      return true;
    });
  }, [incidentes, busqueda, filtroEstatus]);

  // Paginación
  const totalPaginas = Math.ceil(incidentesFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const incidentesPaginados = useMemo(() => {
    const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
    return incidentesFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [incidentesFiltrados, pagina]);

  const mostrados = Math.min(pagina * ITEMS_POR_PAGINA, incidentesFiltrados.length);

  // Chip de estatus
  const renderStatusChip = (estatus) => {
    let label = 'Pendiente';
    let bg = '#FDF3E3';
    let color = '#B45309';
    if (esFinalizado(estatus)) {
      label = 'Finalizado';
      bg = '#E9F9F1';
      color = '#168A4A';
    } else if (esEnAtencion(estatus)) {
      label = 'En atención';
      bg = '#EAF2FA';
      color = '#155E9C';
    }
    return (
      <Chip
        label={label}
        size="small"
        sx={{ bgcolor: bg, color, fontWeight: 700, fontSize: '0.72rem', borderRadius: 5, height: 22 }}
      />
    );
  };

  const nombreTecnico = (item) => safeText(item?.tecnico_nombre || item?.tecnico);

  return (
    <DashboardLayout>
      <Box sx={{ pb: 4, pt: 0.5 }}>
        {mensaje && (
          <Alert severity={mensaje.tipo} onClose={() => setMensaje(null)} sx={{ mb: 2.5, borderRadius: 2 }}>
            {mensaje.texto}
          </Alert>
        )}

        {/* 1. KPIs con animación hover */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 2.5,
          }}
        >
          <KpiCard
            label="Disponibles en mesa"
            value={kpis.disponibles}
            sub="Listos para recibir asignación"
            bg="#EAF2FA"
            color="#155E9C"
            Icon={PersonOutlineOutlined}
          />
          <KpiCard
            label="Onsites pendientes"
            value={kpis.pendientes}
            sub="Sin técnico asignado"
            bg="#FDF3E3"
            color="#B45309"
            Icon={HourglassEmptyOutlined}
          />
          <KpiCard
            label="En atención"
            value={kpis.enAtencion}
            sub="Servicios activos ahora"
            bg="#E9F9F1"
            color="#168A4A"
            Icon={CheckCircleOutlineOutlined}
          />
          <KpiCard
            label="Total registrados"
            value={kpis.total}
            sub="Histórico acumulado"
            bg="#EFEDFA"
            color="#6A45B5"
            Icon={AssignmentIndOutlined}
          />
        </Box>

        {/* 2. Asignación rápida: con botón "Crear incidente" adentro */}
        <Paper elevation={0} sx={{ ...cardSx, mb: 2.5, overflow: 'hidden' }}>
          <Box
            sx={{
              px: 3,
              py: 2,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 1.5,
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                Asignación rápida de Onsite
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Vincula un incidente con un técnico disponible en tres pasos
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Paso n={1} texto="Seleccionar agente" hecho={!!agenteAsignar} activo={!agenteAsignar} />
              <Typography sx={{ color: '#CBD5E1', fontSize: '0.8rem' }}>→</Typography>
              <Paso n={2} texto="Ingresar folio" hecho={!!folioAsignar.trim()} activo={!!agenteAsignar && !folioAsignar.trim()} />
              <Typography sx={{ color: '#CBD5E1', fontSize: '0.8rem' }}>→</Typography>
              <Paso n={3} texto="Confirmar" activo={!!agenteAsignar && !!folioAsignar.trim()} />
            </Stack>
          </Box>

          <Box
            component="form"
            onSubmit={handleAsignacionRapida}
            sx={{
              p: 3,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1.25fr auto' },
              gap: 2,
              alignItems: 'stretch',
            }}
          >
            {/* Paso 1: Selector ISM */}
            <Box sx={dashedSx}>
              <Typography sx={dashedTitleSx}>
                <PersonOutlineOutlined sx={{ fontSize: 16 }} />
                ISM / MESA disponible
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  displayEmpty
                  value={agenteAsignar}
                  onChange={(e) => setAgenteAsignar(e.target.value)}
                  renderValue={(v) => {
                    const t = tecnicosIsmDisponibles.find((x) => x?.id === v);
                    const nombre = getNombreUsuario(t);
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, py: 0.3 }}>
                        <Avatar
                          sx={{
                            width: 30,
                            height: 30,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: t
                              ? 'linear-gradient(135deg,#0E9F6E,#067A55)'
                              : 'linear-gradient(135deg,#94A3B8,#64748B)',
                          }}
                        >
                          {getInit(nombre)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                            {nombre || 'Selecciona un agente'}
                          </Typography>
                          
                        </Box>
                      </Box>
                    );
                  }}
                  sx={{
                    bgcolor: '#FFFFFF',
                    borderRadius: 2.5,
                    '& fieldset': { borderColor: '#E2E8F0' },
                  }}
                >
                  {tecnicosIsmDisponibles.length === 0 ? (
                    <MenuItem disabled value="">
                      <Typography sx={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                        No hay técnicos ISM en mesa disponibles
                      </Typography>
                    </MenuItem>
                  ) : (
                    tecnicosIsmDisponibles.map((t) => {
                      const nom = getNombreUsuario(t);
                      return (
                        <MenuItem key={t.id} value={t.id} sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                            <Avatar
                              sx={{
                                width: 26,
                                height: 26,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: 'linear-gradient(135deg,#0E9F6E,#067A55)',
                              }}
                            >
                              {getInit(nom)}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>
                                {nom}
                              </Typography>
                              <Typography sx={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                                En mesa · Disponible
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      );
                    })
                  )}
                </Select>
              </FormControl>
            </Box>

            {/* Paso 2: Folio */}
            <Box sx={dashedSx}>
              <Typography sx={dashedTitleSx}>
                <SearchOutlined sx={{ fontSize: 16 }} />
                Incidente por folio
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="iNSERTAR INCIDENTE"
                value={folioAsignar}
                onChange={(e) => setFolioAsignar(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlined sx={{ fontSize: 18, color: '#94A3B8' }} />
                      </InputAdornment>
                    ),
                    sx: {
                      bgcolor: '#FFFFFF',
                      fontFamily: MONO,
                      fontSize: '0.88rem',
                      borderRadius: 2.5,
                      '& fieldset': { borderColor: '#E2E8F0' },
                    },
                  },
                }}
              />
            </Box>

            {/* Columna de Acciones: Asignar + Crear incidente juntos */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 1.25,
                minWidth: { lg: 200 },
              }}
            >
              <Button
                type="button"
                variant="outlined"
                startIcon={<AddOutlined />}
                onClick={abrirCreacion}
                sx={{
                  bgcolor: '#FFFFFF',
                  color: '#003359',
                  borderColor: '#003359',
                  borderWidth: 1.5,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  borderRadius: 2.5,
                  px: 2.5,
                  py: 1,
                  height: 42,
                  '&:hover': { borderWidth: 1.5, borderColor: '#003359', bgcolor: '#F8FAFC' },
                }}
              >
                Crear incidente
              </Button>

              <Button
                type="submit"
                variant="contained"
                disableElevation
                disabled={asignando || !agenteAsignar || !folioAsignar.trim()}
                startIcon={!asignando && <NavigateNext />}
                sx={{
                  bgcolor: '#003359',
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  borderRadius: 2.5,
                  px: 2.5,
                  py: 1,
                  height: 46,
                  boxShadow: '0 4px 12px rgba(0,51,89,.25)',
                  '&:hover': { bgcolor: '#002642' },
                }}
              >
                {asignando ? <CircularProgress size={20} color="inherit" /> : 'Asignar onsite'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* 3. Tabla concentradora */}
        <Paper elevation={0} sx={{ ...cardSx, overflow: 'hidden' }}>
          <Box
            sx={{
              px: 3,
              py: 2,
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', lg: 'center' },
              gap: 2,
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                Tabla concentradora de Onsite
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                {kpis.total} servicios registrados · {kpis.finalizados} finalizados
              </Typography>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <Box sx={{ bgcolor: '#EEF2F6', p: 0.5, borderRadius: 2.5, display: 'inline-flex' }}>
                {['Todos', 'Pendientes', 'En atención', 'Finalizados'].map((tab) => (
                  <Button
                    key={tab}
                    size="small"
                    onClick={() => {
                      setFiltroEstatus(tab);
                      setPagina(1);
                    }}
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      px: 1.6,
                      py: 0.5,
                      borderRadius: 2,
                      color: filtroEstatus === tab ? '#0F172A' : '#64748B',
                      bgcolor: filtroEstatus === tab ? '#FFFFFF' : 'transparent',
                      boxShadow: filtroEstatus === tab ? '0 1px 3px rgba(15,23,42,.1)' : 'none',
                      '&:hover': { bgcolor: filtroEstatus === tab ? '#FFFFFF' : 'rgba(0,0,0,0.03)' },
                    }}
                  >
                    {tab}
                  </Button>
                ))}
              </Box>

              <TextField
                size="small"
                placeholder="Buscar por folio, incidente o ubicación…"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlined sx={{ fontSize: 18, color: '#94A3B8' }} />
                      </InputAdornment>
                    ),
                    sx: {
                      fontSize: '0.8rem',
                      borderRadius: 2.5,
                      bgcolor: '#F8FAFC',
                      '& fieldset': { borderColor: '#E2E8F0' },
                    },
                  },
                }}
                sx={{ minWidth: { xs: '100%', sm: 280 } }}
              />
            </Stack>
          </Box>

          <TableContainer>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Fecha</TableCell>
                  <TableCell sx={thSx}>Folio</TableCell>
                  <TableCell sx={thSx}>Incidente / Resumen</TableCell>
                  <TableCell sx={thSx}>Ubicación</TableCell>
                  <TableCell sx={thSx}>ISM/MESA asignado</TableCell>
                  <TableCell sx={thSx}>Estatus</TableCell>
                  <TableCell align="right" sx={thSx}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {cargando ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={30} sx={{ color: '#003359' }} />
                      <Typography sx={{ fontSize: '0.82rem', color: '#64748B', mt: 1 }}>
                        Cargando servicios de Onsite...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : incidentesPaginados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, border: 0 }}>
                      <InboxOutlined sx={{ fontSize: 36, color: '#CBD5E1' }} />
                      <Typography sx={{ fontSize: '0.88rem', color: '#475569', fontWeight: 700 }}>
                        No se encontraron registros de Onsite
                      </Typography>
                      <Typography sx={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                        Aquí aparecerán los incidentes que registre el supervisor.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  incidentesPaginados.map((item) => {
                    const tecnicoStr = nombreTecnico(item);
                    return (
                      <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#475569', py: 1.4 }}>
                          {item.fecha || item.creado_en
                            ? new Date(item.fecha || item.creado_en).toLocaleDateString()
                            : '—'}
                        </TableCell>

                        <TableCell sx={{ fontFamily: MONO, fontWeight: 700, fontSize: '0.82rem', color: '#155E9C', py: 1.4 }}>
                          {item.folio || '—'}
                        </TableCell>

                        <TableCell sx={{ py: 1.4 }}>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                            {item.resumen || item.titulo || 'Sin título'}
                          </Typography>
                          {item.descripcion && (
                            <Typography noWrap sx={{ fontSize: '0.72rem', color: '#94A3B8', maxWidth: 280 }}>
                              {item.descripcion}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell sx={{ fontSize: '0.8rem', color: '#475569', py: 1.4 }}>
                          {item.ubicacion || '—'}
                        </TableCell>

                        <TableCell sx={{ py: 1.4 }}>
                          {tecnicoStr ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                sx={{
                                  width: 26,
                                  height: 26,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg,#0E9F6E,#067A55)',
                                }}
                              >
                                {getInit(tecnicoStr)}
                              </Avatar>
                              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A' }}>
                                {tecnicoStr}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography sx={{ fontSize: '0.8rem', color: '#94A3B8' }}>Sin asignar</Typography>
                          )}
                        </TableCell>

                        <TableCell sx={{ py: 1.4 }}>{renderStatusChip(item.estatus)}</TableCell>

                        <TableCell align="right" sx={{ py: 1.4 }}>
                          <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                            <IconButton size="small" onClick={() => setModalDetalle(item)} title="Ver detalle" sx={iconBtnSx}>
                              <VisibilityOutlined fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => abrirEdicion(item)} title="Editar" sx={iconBtnSx}>
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pie / paginación */}
          <Box
            sx={{
              px: 3,
              py: 1.6,
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 1.5,
            }}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadOutlined />}
              onClick={exportarCSV}
              disabled={!incidentes.length}
              sx={{
                textTransform: 'none',
                color: '#475569',
                borderColor: '#E2E8F0',
                borderRadius: 2.5,
                fontWeight: 700,
                fontSize: '0.74rem',
                '&:hover': { bgcolor: '#F1F5F9', borderColor: '#E2E8F0' },
              }}
            >
              Exportar CSV
            </Button>

            <Stack direction="row" spacing={1.2} alignItems="center">
              <Typography sx={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                {mostrados} de {incidentesFiltrados.length} registros
              </Typography>
              <IconButton
                size="small"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                sx={iconBtnSx}
              >
                <NavigateBefore fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                sx={iconBtnSx}
              >
                <NavigateNext fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </Paper>

        {/* Modal detalle */}
        <Dialog
          open={Boolean(modalDetalle)}
          onClose={() => setModalDetalle(null)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2.5, p: 1 } }}
        >
          <DialogTitle
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}
          >
            Detalle del Incidente
            <IconButton size="small" onClick={() => setModalDetalle(null)}>
              <CloseOutlined fontSize="small" />
            </IconButton>
          </DialogTitle>
          {modalDetalle && (
            <DialogContent dividers sx={{ borderColor: '#E2E8F0' }}>
              <Stack spacing={2}>
                <Box>
                  <Typography sx={labelSx}>Folio</Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: '1.15rem', fontWeight: 800, color: '#155E9C' }}>
                    {modalDetalle.folio || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={labelSx}>Resumen</Typography>
                  <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                    {modalDetalle.resumen || modalDetalle.titulo || '—'}
                  </Typography>
                </Box>
                {modalDetalle.descripcion && (
                  <Box>
                    <Typography sx={labelSx}>Descripción detallada</Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: '#475569', mt: 0.3 }}>
                      {modalDetalle.descripcion}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography sx={labelSx}>Ubicación</Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: '#0F172A', mt: 0.3 }}>
                      {modalDetalle.ubicacion || '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={labelSx}>Estatus</Typography>
                    <Box sx={{ mt: 0.5 }}>{renderStatusChip(modalDetalle.estatus)}</Box>
                  </Box>
                </Box>
              </Stack>
            </DialogContent>
          )}
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setModalDetalle(null)}
              variant="contained"
              disableElevation
              sx={{ bgcolor: '#003359', borderRadius: 2, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#002642' } }}
            >
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal crear / editar */}
        <Dialog
          open={modalFormulario}
          onClose={() => setModalFormulario(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2.5, p: 1 } }}
        >
          <form onSubmit={handleGuardarIncidente}>
            <DialogTitle
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}
            >
              {editandoId ? 'Editar Incidente' : 'Nuevo Incidente'}
              <IconButton size="small" onClick={() => setModalFormulario(false)}>
                <CloseOutlined fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E2E8F0' }}>
              <Stack spacing={2} sx={{ pt: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Folio de Ivanti *"
                  value={formulario.folio}
                  onChange={(e) => setFormulario({ ...formulario, folio: e.target.value })}
                  slotProps={{ input: { sx: { fontFamily: MONO, borderRadius: 2 } } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Resumen / Asunto *"
                  value={formulario.resumen}
                  onChange={(e) => setFormulario({ ...formulario, resumen: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                  label="Descripción adicional"
                  value={formulario.descripcion}
                  onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Ubicación"
                  value={formulario.ubicacion}
                  onChange={(e) => setFormulario({ ...formulario, ubicacion: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <FormControl fullWidth size="small">
                  <InputLabel id="tecnico-form-label">Técnico ISM/MESA</InputLabel>
                  <Select
                    labelId="tecnico-form-label"
                    label="Técnico ISM/MESA"
                    value={formulario.tecnicoId}
                    onChange={(e) => setFormulario({ ...formulario, tecnicoId: e.target.value })}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">
                      <em>Sin asignar</em>
                    </MenuItem>
                    {tecnicosIsmDisponibles.map((t) => {
                      const nom = getNombreUsuario(t);
                      return (
                        <MenuItem key={t.id} value={t.id}>
                          {nom}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel id="estatus-form-label">Estatus</InputLabel>
                  <Select
                    labelId="estatus-form-label"
                    label="Estatus"
                    value={formulario.estatus}
                    onChange={(e) => setFormulario({ ...formulario, estatus: e.target.value })}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="Pendiente">Pendiente</MenuItem>
                    <MenuItem value="En atención">En atención</MenuItem>
                    <MenuItem value="Finalizado">Finalizado</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button
                onClick={() => setModalFormulario(false)}
                sx={{ textTransform: 'none', color: '#64748B', fontWeight: 700 }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disableElevation
                disabled={guardandoForm}
                sx={{ bgcolor: '#003359', borderRadius: 2, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#002642' } }}
              >
                {guardandoForm ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}