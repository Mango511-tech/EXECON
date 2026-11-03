import {
  AccessTimeOutlined,
  AddOutlined,
  AddTaskOutlined,
  AssignmentOutlined,
  HeadsetMicOutlined,
  PersonOutlineOutlined,
  RefreshOutlined,
  ScheduleOutlined,
  SearchOutlined,
  SendOutlined,
} from '@mui/icons-material';

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import DistribuidorLayout from '../../layouts/DistributorLayout';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
).replace(/\/+$/, '');

const EMPTY_INCIDENT_FORM = {
  folio: '',
  idSitio: '',
  nombreSitio: '',
  plaza: '',
  compania: '',
  resumen: '',
  descripcion: '',
  prioridad: '3',
  idIsmAsignado: '',
};

const panelSx = {
  border: '1px solid #E7EDF4',
  borderRadius: 1.5,
};

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeStatus(value) {
  return normalizeText(value).replace(/[\s_-]+/g, '').toUpperCase();
}

function normalizePriority(value) {
  const priority = String(value ?? '').trim().toUpperCase();
  const match = priority.match(/^P?([1-5])$/);
  return match ? `P${match[1]}` : 'P3';
}

function getStatusStyle(status) {
  const normalized = normalizeStatus(status);

  if (normalized === 'PENDIENTE') {
    return { label: 'Pendiente', background: '#FFF7ED', color: '#C2410C' };
  }
  if (normalized === 'ENATENCION' || normalized === 'EN ATENCION') {
    return { label: 'En atención', background: '#ECFDF3', color: '#168A4A' };
  }
  if (normalized === 'FINALIZADO') {
    return { label: 'Finalizado', background: '#EAF4FF', color: '#1664A7' };
  }

  return { label: status || 'Pendiente', background: '#F1F5F9', color: '#64748B' };
}

function getIncidentSummary(incident) {
  return incident.incidente || incident.resumen || '';
}

function getIncidentLocation(incident) {
  return incident.ubicacion || incident.nombreSitio || incident.plaza || '';
}

function formatDuration(value) {
  const minutes = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours > 0 ? `${hours}h ${remaining}m` : `${remaining}m`;
}

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('execon_token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'No fue posible completar la operación.');
  }

  return result;
}

function DistributorOverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const pathname = location.pathname.replace(/\/+$/, '');

  const section =
    pathname === '/distribuidor/incidentes'
      ? 'incidentes'
      : pathname === '/distribuidor/onsite'
        ? 'onsite'
        : pathname === '/distribuidor/en-atencion'
          ? 'en-atencion'
          : pathname === '/distribuidor/turnos'
            ? 'turnos'
            : 'general';

  const [engineers, setEngineers] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const [loadingEngineers, setLoadingEngineers] = useState(true);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [priorityTab, setPriorityTab] = useState('TODOS');

  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [selectedIncidentToAssign, setSelectedIncidentToAssign] = useState('');
  const [message, setMessage] = useState(null);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ ...EMPTY_INCIDENT_FORM });
  const [savingIncident, setSavingIncident] = useState(false);
  const [formError, setFormError] = useState('');

  const writeLock = useRef(false);

  const loadEngineers = useCallback(async () => {
    setLoadingEngineers(true);
    try {
      const result = await apiRequest('/ingenieros');
      setEngineers(Array.isArray(result.data) ? result.data : []);
    } catch {
      setEngineers([]);
    } finally {
      setLoadingEngineers(false);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    setLoadingIncidents(true);
    try {
      const result = await apiRequest('/incidentes');
      setIncidents(Array.isArray(result.data) ? result.data : []);
    } catch {
      setIncidents([]);
    } finally {
      setLoadingIncidents(false);
    }
  }, []);

  useEffect(() => {
    loadEngineers();
    loadIncidents();
  }, [loadEngineers, loadIncidents]);

  const availableEngineers = useMemo(
    () => engineers.filter((eng) => normalizeText(eng.estatus) === 'mesa' || !eng.estatus),
    [engineers],
  );

  const inAttentionIncidents = useMemo(
    () => incidents.filter((inc) => normalizeStatus(inc.estatus) === 'ENATENCION' || normalizeStatus(inc.estatus) === 'EN ATENCION'),
    [incidents],
  );

  const summary = useMemo(() => {
    const pendientes = incidents.filter(
      (inc) => normalizeStatus(inc.estatus) === 'PENDIENTE',
    ).length;

    const enAtencion = inAttentionIncidents.length;

    const totalMinutes = incidents.reduce(
      (total, inc) => total + Math.max(0, Number(inc.duracionMinutos) || 0),
      0,
    );

    return {
      disponibles: availableEngineers.length,
      pendientes,
      enAtencion,
      averageMinutes: incidents.length ? Math.round(totalMinutes / incidents.length) : 0,
    };
  }, [availableEngineers, incidents, inAttentionIncidents]);

  const filteredIncidents = useMemo(() => {
    const search = normalizeText(tableSearch);

    return incidents.filter((incident) => {
      const searchable = normalizeText(
        [
          incident.folio,
          getIncidentSummary(incident),
          getIncidentLocation(incident),
          incident.ismMesa,
          incident.compania,
        ].join(' '),
      );

      const matchesSearch = !search || searchable.includes(search);

      const matchesStatus =
        statusFilter === 'TODOS' ||
        normalizeStatus(incident.estatus) === normalizeStatus(statusFilter);

      const matchesPriority =
        section !== 'incidentes' ||
        priorityTab === 'TODOS' ||
        normalizePriority(incident.prioridad) === priorityTab;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [incidents, tableSearch, statusFilter, priorityTab, section]);

  const handleQuickAssign = async () => {
    if (!selectedEngineer) {
      setMessage({ severity: 'warning', text: 'Selecciona un agente ISM/MESA disponible.' });
      return;
    }
    if (!selectedIncidentToAssign) {
      setMessage({ severity: 'warning', text: 'Selecciona un incidente pendiente para asignar.' });
      return;
    }

    try {
      const userStored = JSON.parse(localStorage.getItem('execon_usuario') || '{}');
      await apiRequest(`/incidentes/${selectedIncidentToAssign}`, {
        method: 'PUT',
        body: JSON.stringify({
          idIsmAsignado: selectedEngineer,
          estatus: 'EN ATENCION',
          asignadoPor: userStored.id || null,
        }),
      });

      setMessage({ severity: 'success', text: 'Incidente asignado correctamente al agente.' });
      setSelectedIncidentToAssign('');
      setSelectedEngineer('');
      loadIncidents();
      loadEngineers();
    } catch {
      setIncidentForm((prev) => ({ ...prev, idIsmAsignado: selectedEngineer }));
      setOpenCreateModal(true);
    }
  };

  const handleSaveIncident = async (event) => {
    event.preventDefault();
    if (writeLock.current) return;

    const folio = incidentForm.folio.trim();
    const resumen = incidentForm.resumen.trim();

    if (!folio || !resumen) {
      setFormError('Folio y resumen son obligatorios.');
      return;
    }

    writeLock.current = true;
    setSavingIncident(true);
    setFormError('');

    try {
      const userStored = JSON.parse(localStorage.getItem('execon_usuario') || '{}');
      await apiRequest('/incidentes', {
        method: 'POST',
        body: JSON.stringify({
          ...incidentForm,
          folio,
          resumen,
          asignadoPor: userStored?.id || null,
        }),
      });

      setOpenCreateModal(false);
      setIncidentForm({ ...EMPTY_INCIDENT_FORM });
      setMessage({ severity: 'success', text: `Incidente ${folio} registrado y asignado exitosamente.` });
      await Promise.all([loadIncidents(), loadEngineers()]);
    } catch (error) {
      setFormError(error.message || 'Error al guardar el incidente.');
    } finally {
      writeLock.current = false;
      setSavingIncident(false);
    }
  };

  const reloadData = () => {
    loadEngineers();
    loadIncidents();
  };

  const isLoading = loadingEngineers || loadingIncidents;

  return (
    <DistribuidorLayout>
      <Box sx={{ width: '100%', minWidth: 0, pt: 0.5, pb: 2 }}>
        {message && (
          <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        {/* 1. SECCIÓN VISTA GENERAL */}
        {section === 'general' && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  xl: 'repeat(4, minmax(0, 1fr))',
                },
                gap: 1.5,
                mb: 2,
              }}
            >
              <MetricCard
                icon={<PersonOutlineOutlined />}
                label="Disponibles en mesa"
                value={loadingEngineers ? '—' : summary.disponibles}
                color="#1674B7"
                background="#EAF4FF"
              />
              <MetricCard
                icon={<AddTaskOutlined />}
                label="Onsites pendientes"
                value={loadingIncidents ? '—' : summary.pendientes}
                color="#E67817"
                background="#FFF7ED"
              />
              <MetricCard
                icon={<HeadsetMicOutlined />}
                label="En atención"
                value={loadingIncidents ? '—' : summary.enAtencion}
                color="#168A4A"
                background="#ECFDF3"
              />
              <MetricCard
                icon={<AccessTimeOutlined />}
                label="Tiempo promedio"
                value={loadingIncidents ? '—' : formatDuration(summary.averageMinutes)}
                color="#6A45B5"
                background="#F3EEFF"
              />
            </Box>

            {/* CONTROL DE DISPONIBILIDAD Y HORARIOS */}
            <Paper sx={{ ...panelSx, p: 2, mb: 2 }}>
              <Typography sx={{ color: '#173B66', fontSize: '1.05rem', fontWeight: 800, mb: 1.5 }}>
                Disponibilidad y horarios de los ISM/MESA
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    minWidth: 780,
                    borderCollapse: 'collapse',
                    '& th': {
                      py: 1.2,
                      px: 1.5,
                      textAlign: 'left',
                      bgcolor: '#F8FAFC',
                      color: '#64748B',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      borderBottom: '1px solid #E7EDF4',
                    },
                    '& td': {
                      py: 1.15,
                      px: 1.5,
                      color: '#334155',
                      fontSize: '0.84rem',
                      borderBottom: '1px solid #EEF2F6',
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th>Agente ISM/MESA</th>
                      <th>Estatus actual</th>
                      <th>Horario / Turno</th>
                      <th>Correo</th>
                      <th>Acción directa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engineers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                          No hay agentes registrados en la base de datos.
                        </td>
                      </tr>
                    ) : (
                      engineers.map((eng) => {
                        const isAvailable = normalizeText(eng.estatus) === 'mesa' || !eng.estatus;
                        const shiftSchedule = eng.turnoHorario || eng.horario || 'Matutino (08:00 - 17:00)';
                        return (
                          <tr key={eng.id}>
                            <td style={{ fontWeight: 700, color: '#173B66' }}>{eng.nombre}</td>
                            <td>
                              <Chip
                                size="small"
                                label={isAvailable ? 'En mesa (Disponible)' : eng.estatus}
                                sx={{
                                  bgcolor: isAvailable ? '#ECFDF3' : '#F1F5F9',
                                  color: isAvailable ? '#168A4A' : '#64748B',
                                  fontWeight: 800,
                                }}
                              />
                            </td>
                            <td>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <ScheduleOutlined sx={{ fontSize: 16, color: '#64748B' }} />
                                <Typography sx={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                                  {shiftSchedule}
                                </Typography>
                              </Stack>
                            </td>
                            <td>{eng.correo || 'Sin correo'}</td>
                            <td>
                              <Button
                                size="small"
                                variant="text"
                                disabled={!isAvailable}
                                onClick={() => {
                                  setSelectedEngineer(eng.id);
                                  navigate('/distribuidor/onsite');
                                }}
                                sx={{ textTransform: 'none', fontWeight: 800, color: '#003359' }}
                              >
                                Asignar onsite
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Box>
              </Box>
            </Paper>

            {/* INCIDENTES EN ATENCIÓN */}
            <Paper sx={{ ...panelSx, p: 2, mb: 2 }}>
              <Typography sx={{ color: '#173B66', fontSize: '1.05rem', fontWeight: 800, mb: 1.5 }}>
                Incidentes en atención 
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    minWidth: 850,
                    borderCollapse: 'collapse',
                    '& th': {
                      py: 1.2,
                      px: 1.5,
                      textAlign: 'left',
                      bgcolor: '#F8FAFC',
                      color: '#64748B',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      borderBottom: '1px solid #E7EDF4',
                    },
                    '& td': {
                      py: 1.15,
                      px: 1.5,
                      color: '#334155',
                      fontSize: '0.84rem',
                      borderBottom: '1px solid #EEF2F6',
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Cliente / Compañía</th>
                      <th>Plaza / Ubicación</th>
                      <th>Resumen del servicio</th>
                      <th>ISM/MESA asignado</th>
                      <th>Atendido por</th>
                      <th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inAttentionIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                          No hay incidentes en atención actualmente.
                        </td>
                      </tr>
                    ) : (
                      inAttentionIncidents.map((inc) => (
                        <tr key={inc.id ?? inc.folio}>
                          <td style={{ fontWeight: 800, color: '#173B66' }}>{inc.folio}</td>
                          <td style={{ fontWeight: 600 }}>{inc.compania || '—'}</td>
                          <td>{getIncidentLocation(inc)}</td>
                          <td>{getIncidentSummary(inc)}</td>
                          <td style={{ fontWeight: 700, color: '#003359' }}>{inc.ismMesa || 'Sin asignar'}</td>
                          <td>{inc.asignadoPorNombre || inc.atendidoPor || 'Supervisor / Distribuidor'}</td>
                          <td>
                            <Chip
                              size="small"
                              label="En atención"
                              sx={{ bgcolor: '#ECFDF3', color: '#168A4A', fontWeight: 800 }}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Box>
              </Box>
            </Paper>

            {/* ACCIONES RÁPIDAS DE DISTRIBUCIÓN */}
            <Paper sx={{ ...panelSx, p: 2.25 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#173B66', mb: 0.5 }}>
                Acciones rápidas de distribución
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: '0.86rem', mb: 2 }}>
                Navega directamente a las listas de incidentes o asigna técnicos en campo.
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/distribuidor/onsite')}
                  sx={{ bgcolor: '#003359', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#002642' } }}
                >
                  Ir a asignación de onsite
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/distribuidor/incidentes')}
                  sx={{ borderColor: '#003359', color: '#003359', fontWeight: 800, textTransform: 'none' }}
                >
                  Ver incidentes loggeados
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshOutlined />}
                  onClick={reloadData}
                  disabled={isLoading}
                  sx={{ borderColor: '#D9E2EC', color: '#173B66', fontWeight: 800, textTransform: 'none' }}
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar vista general'}
                </Button>
              </Stack>
            </Paper>
          </>
        )}

        {/* 2. SECCIÓN INCIDENTES LOGGEADOS */}
        {section === 'incidentes' && (
          <Paper sx={{ ...panelSx, p: 2.5 }}>
            <Tabs
              value={priorityTab}
              onChange={(_, value) => setPriorityTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2, borderBottom: '1px solid #E7EDF4', '& .MuiTabs-indicator': { bgcolor: '#003359' } }}
            >
              <Tab value="TODOS" label="Todos" sx={{ textTransform: 'none', fontWeight: 800 }} />
              {['P1', 'P2', 'P3', 'P4', 'P5'].map((p) => (
                <Tab key={p} value={p} label={p} sx={{ fontWeight: 800 }} />
              ))}
            </Tabs>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
              <TextField
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Buscar por folio, cliente, resumen o ubicación..."
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <SearchOutlined sx={{ color: '#94A3B8' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel id="status-filter-label">Estatus</InputLabel>
                <Select
                  labelId="status-filter-label"
                  label="Estatus"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="TODOS">Todos los estatus</MenuItem>
                  <MenuItem value="PENDIENTE">Pendientes</MenuItem>
                  <MenuItem value="EN ATENCION">En atención</MenuItem>
                  <MenuItem value="FINALIZADO">Finalizados</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  minWidth: 850,
                  borderCollapse: 'collapse',
                  '& th': {
                    py: 1.25,
                    px: 1.5,
                    textAlign: 'left',
                    bgcolor: '#F8FAFC',
                    color: '#64748B',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    borderBottom: '1px solid #E7EDF4',
                  },
                  '& td': {
                    py: 1.2,
                    px: 1.5,
                    color: '#334155',
                    fontSize: '0.84rem',
                    borderBottom: '1px solid #EEF2F6',
                  },
                }}
              >
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Folio</th>
                    <th>Prioridad</th>
                    <th>Incidente / Resumen</th>
                    <th>Plaza / Ubicación</th>
                    <th>ISM/MESA asignado</th>
                    <th>Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                        <AssignmentOutlined sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                        <Typography sx={{ fontWeight: 800, color: '#475569' }}>
                          No hay incidentes para esta categoría
                        </Typography>
                      </td>
                    </tr>
                  ) : (
                    filteredIncidents.map((inc) => {
                      const st = getStatusStyle(inc.estatus);
                      return (
                        <tr key={inc.id ?? inc.folio}>
                          <td>{inc.fecha || '—'}</td>
                          <td style={{ fontWeight: 800, color: '#173B66' }}>{inc.folio}</td>
                          <td>
                            <Chip size="small" label={normalizePriority(inc.prioridad)} sx={{ fontWeight: 800, bgcolor: '#F1F5F9' }} />
                          </td>
                          <td>{getIncidentSummary(inc)}</td>
                          <td>{getIncidentLocation(inc)}</td>
                          <td>{inc.ismMesa || 'Sin asignar'}</td>
                          <td>
                            <Chip size="small" label={st.label} sx={{ bgcolor: st.background, color: st.color, fontWeight: 800 }} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Box>
            </Box>
          </Paper>
        )}

        {/* 3. SECCIÓN ASIGNACIÓN DE ONSITE */}
        {section === 'onsite' && (
          <Box>
            <Paper sx={{ ...panelSx, p: 2.25, mb: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'auto minmax(220px, 1fr) minmax(250px, 1.2fr) auto' }, gap: 1.5, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<AddOutlined />}
                  onClick={() => setOpenCreateModal(true)}
                  sx={{ borderColor: '#003359', color: '#003359', fontWeight: 800, textTransform: 'none', height: 40, whiteSpace: 'nowrap' }}
                >
                  Nuevo incidente
                </Button>

                <FormControl size="small" fullWidth>
                  <InputLabel id="assign-eng-select">ISM disponible</InputLabel>
                  <Select
                    labelId="assign-eng-select"
                    label="ISM disponible"
                    value={selectedEngineer}
                    onChange={(e) => setSelectedEngineer(e.target.value)}
                    sx={{ height: 40 }}
                  >
                    <MenuItem value="">Selecciona un técnico disponible</MenuItem>
                    {availableEngineers.map((eng) => (
                      <MenuItem key={eng.id} value={eng.id}>
                        {eng.nombre} (En mesa)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="assign-inc-select">Incidente pendiente</InputLabel>
                  <Select
                    labelId="assign-inc-select"
                    label="Incidente pendiente"
                    value={selectedIncidentToAssign}
                    onChange={(e) => setSelectedIncidentToAssign(e.target.value)}
                    sx={{ height: 40 }}
                  >
                    <MenuItem value="">Selecciona un incidente pendiente</MenuItem>
                    {incidents
                      .filter((i) => normalizeStatus(i.estatus) === 'PENDIENTE')
                      .map((inc) => (
                        <MenuItem key={inc.id} value={inc.id}>
                          {inc.folio} - {getIncidentSummary(inc).slice(0, 35)}...
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  startIcon={<SendOutlined />}
                  onClick={handleQuickAssign}
                  sx={{ height: 40, bgcolor: '#003359', textTransform: 'none', fontWeight: 800, px: 2.5, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#002642' } }}
                >
                  Asignar onsite
                </Button>
              </Box>
            </Paper>

            <Paper sx={{ ...panelSx, p: 2 }}>
              <Typography sx={{ color: '#173B66', fontSize: '1.05rem', fontWeight: 800, mb: 1.5 }}>
                Tabla concentradora de onsite
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    minWidth: 850,
                    borderCollapse: 'collapse',
                    '& th': {
                      py: 1.25,
                      px: 1.5,
                      textAlign: 'left',
                      bgcolor: '#F8FAFC',
                      color: '#64748B',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      borderBottom: '1px solid #E7EDF4',
                    },
                    '& td': {
                      py: 1.2,
                      px: 1.5,
                      color: '#334155',
                      fontSize: '0.84rem',
                      borderBottom: '1px solid #EEF2F6',
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Folio</th>
                      <th>Incidente</th>
                      <th>Plaza / Ubicación</th>
                      <th>ISM/MESA asignado</th>
                      <th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                          No hay incidencias registradas en la base de datos.
                        </td>
                      </tr>
                    ) : (
                      incidents.map((inc) => {
                        const st = getStatusStyle(inc.estatus);
                        return (
                          <tr key={inc.id ?? inc.folio}>
                            <td>{inc.fecha || '—'}</td>
                            <td style={{ fontWeight: 800, color: '#173B66' }}>{inc.folio}</td>
                            <td>{getIncidentSummary(inc)}</td>
                            <td>{getIncidentLocation(inc)}</td>
                            <td style={{ fontWeight: 700, color: '#003359' }}>{inc.ismMesa || 'Sin asignar'}</td>
                            <td>
                              <Chip size="small" label={st.label} sx={{ bgcolor: st.background, color: st.color, fontWeight: 800 }} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}

        {/* 4. SECCIÓN DEDICADA: INCIDENTES EN ATENCIÓN */}
        {section === 'en-atencion' && (
          <Paper sx={{ ...panelSx, p: 2.5 }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  minWidth: 850,
                  borderCollapse: 'collapse',
                  '& th': {
                    py: 1.25,
                    px: 1.5,
                    textAlign: 'left',
                    bgcolor: '#F8FAFC',
                    color: '#64748B',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    borderBottom: '1px solid #E7EDF4',
                  },
                  '& td': {
                    py: 1.2,
                    px: 1.5,
                    color: '#334155',
                    fontSize: '0.84rem',
                    borderBottom: '1px solid #EEF2F6',
                  },
                }}
              >
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Cliente / Compañía</th>
                    <th>Plaza / Ubicación</th>
                    <th>Resumen del servicio</th>
                    <th>ISM/MESA asignado</th>
                    <th>Atendido por</th>
                    <th>Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {inAttentionIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                        No hay incidentes en atención activa en este momento.
                      </td>
                    </tr>
                  ) : (
                    inAttentionIncidents.map((inc) => (
                      <tr key={inc.id ?? inc.folio}>
                        <td style={{ fontWeight: 800, color: '#173B66' }}>{inc.folio}</td>
                        <td style={{ fontWeight: 600 }}>{inc.compania || '—'}</td>
                        <td>{getIncidentLocation(inc)}</td>
                        <td>{getIncidentSummary(inc)}</td>
                        <td style={{ fontWeight: 700, color: '#003359' }}>{inc.ismMesa || 'Sin asignar'}</td>
                        <td>{inc.asignadoPorNombre || inc.atendidoPor || 'Supervisor / Distribuidor'}</td>
                        <td>
                          <Chip
                            size="small"
                            label="En atención"
                            sx={{ bgcolor: '#ECFDF3', color: '#168A4A', fontWeight: 800 }}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Box>
            </Box>
          </Paper>
        )}

        {/* 5. SECCIÓN DEDICADA: TURNOS Y HORARIOS */}
        {section === 'turnos' && (
          <Paper sx={{ ...panelSx, p: 2.5 }}>
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  minWidth: 800,
                  borderCollapse: 'collapse',
                  '& th': {
                    py: 1.25,
                    px: 1.5,
                    textAlign: 'left',
                    bgcolor: '#F8FAFC',
                    color: '#64748B',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    borderBottom: '1px solid #E7EDF4',
                  },
                  '& td': {
                    py: 1.2,
                    px: 1.5,
                    color: '#334155',
                    fontSize: '0.84rem',
                    borderBottom: '1px solid #EEF2F6',
                  },
                }}
              >
                <thead>
                  <tr>
                    <th>Agente ISM/MESA</th>
                    <th>Estatus actual</th>
                    <th>Horario / Turno</th>
                    <th>Correo</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {engineers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                        No hay agentes registrados en la base de datos.
                      </td>
                    </tr>
                  ) : (
                    engineers.map((eng) => {
                      const isAvailable = normalizeText(eng.estatus) === 'mesa' || !eng.estatus;
                      const shiftSchedule = eng.turnoHorario || eng.horario || 'Matutino (08:00 - 17:00)';
                      return (
                        <tr key={eng.id}>
                          <td style={{ fontWeight: 700, color: '#173B66' }}>{eng.nombre}</td>
                          <td>
                            <Chip
                              size="small"
                              label={isAvailable ? 'En mesa (Disponible)' : eng.estatus}
                              sx={{
                                bgcolor: isAvailable ? '#ECFDF3' : '#F1F5F9',
                                color: isAvailable ? '#168A4A' : '#64748B',
                                fontWeight: 800,
                              }}
                            />
                          </td>
                          <td>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <ScheduleOutlined sx={{ fontSize: 16, color: '#64748B' }} />
                              <Typography sx={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                                {shiftSchedule}
                              </Typography>
                            </Stack>
                          </td>
                          <td>{eng.correo || 'Sin correo'}</td>
                          <td>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={!isAvailable}
                              onClick={() => {
                                setSelectedEngineer(eng.id);
                                navigate('/distribuidor/onsite');
                              }}
                              sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#003359' }}
                            >
                              Asignar onsite
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Box>
            </Box>
          </Paper>
        )}

        {/* MODAL CREAR INCIDENTE */}
        <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: '#173B66' }}>Registrar incidente Onsite</DialogTitle>
          <Box component="form" onSubmit={handleSaveIncident}>
            <DialogContent dividers>
              <Stack spacing={2}>
                {formError && <Alert severity="error">{formError}</Alert>}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Folio / Ticket"
                    value={incidentForm.folio}
                    onChange={(e) => setIncidentForm({ ...incidentForm, folio: e.target.value })}
                    required
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Compañía / Cliente"
                    value={incidentForm.compania}
                    onChange={(e) => setIncidentForm({ ...incidentForm, compania: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Plaza / Municipio"
                    placeholder="Ej. Monterrey / San Pedro"
                    value={incidentForm.plaza}
                    onChange={(e) => setIncidentForm({ ...incidentForm, plaza: e.target.value })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Sitio / Ubicación"
                    placeholder="Ej. CEDIS Principal"
                    value={incidentForm.nombreSitio}
                    onChange={(e) => setIncidentForm({ ...incidentForm, nombreSitio: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="form-eng-label">Asignar a ISM/MESA</InputLabel>
                    <Select
                      labelId="form-eng-label"
                      label="Asignar a ISM/MESA"
                      value={incidentForm.idIsmAsignado}
                      onChange={(e) => setIncidentForm({ ...incidentForm, idIsmAsignado: e.target.value })}
                    >
                      <MenuItem value="">Sin asignar (Pendiente)</MenuItem>
                      {availableEngineers.map((eng) => (
                        <MenuItem key={eng.id} value={eng.id}>
                          {eng.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel id="form-prio-label">Prioridad</InputLabel>
                    <Select
                      labelId="form-prio-label"
                      label="Prioridad"
                      value={incidentForm.prioridad}
                      onChange={(e) => setIncidentForm({ ...incidentForm, prioridad: e.target.value })}
                    >
                      {['1', '2', '3', '4', '5'].map((p) => (
                        <MenuItem key={p} value={p}>
                          P{p}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
                <TextField
                  label="Resumen del problema"
                  value={incidentForm.resumen}
                  onChange={(e) => setIncidentForm({ ...incidentForm, resumen: e.target.value })}
                  required
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Descripción técnica"
                  value={incidentForm.descripcion}
                  onChange={(e) => setIncidentForm({ ...incidentForm, descripcion: e.target.value })}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenCreateModal(false)} disabled={savingIncident}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={savingIncident}
                sx={{ bgcolor: '#003359', fontWeight: 800, '&:hover': { bgcolor: '#002642' } }}
              >
                {savingIncident ? 'Guardando...' : 'Crear incidente'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Box>
    </DistribuidorLayout>
  );
}

function MetricCard({ icon, label, value, color, background }) {
  return (
    <Paper sx={{ position: 'relative', height: 108, overflow: 'hidden', ...panelSx }}>
      <Box sx={{ height: '100%', p: 1.55, display: 'flex', alignItems: 'center', gap: 1.65 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 1.5,
            bgcolor: background,
            color,
            flexShrink: 0,
            '& svg': { fontSize: 27 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ color: '#334155', fontSize: '0.94rem', fontWeight: 700 }}>{label}</Typography>
          <Typography sx={{ mt: 0.65, color, fontSize: '1.78rem', fontWeight: 800 }}>{value}</Typography>
        </Box>
      </Box>
      <Box sx={{ position: 'absolute', right: 0, bottom: 0, left: 0, height: 4, bgcolor: color }} />
    </Paper>
  );
}

export default DistributorOverviewPage;