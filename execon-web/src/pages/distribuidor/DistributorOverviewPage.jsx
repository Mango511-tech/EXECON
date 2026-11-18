import {
  AddOutlined,
  ArrowBackOutlined,
  AssignmentOutlined,
  BusinessCenterOutlined,
  GroupsOutlined,
  LocationOnOutlined,
  RefreshOutlined,
  RestaurantOutlined,
  ScheduleOutlined,
  SearchOutlined,
  SendOutlined,
  WarningAmberOutlined,
  WbSunnyOutlined,
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
import usePolling from '../../hooks/usePolling';
import { useLocation, useNavigate } from 'react-router-dom';

import DistribuidorLayout from '../../layouts/DistributorLayout';
import { usePreferences } from '../../context/PreferencesContext';
import StatusSummaryCards from '../../components/StatusSummaryCards';

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

function getStatusStyle(status, isEnglish = false) {
  const normalized = normalizeStatus(status);

  if (normalized === 'PENDIENTE') {
    return { label: isEnglish ? 'Pending' : 'Pendiente', background: '#FFF7ED', color: '#C2410C' };
  }
  if (normalized === 'ENATENCION' || normalized === 'EN ATENCION') {
    return { label: isEnglish ? 'In progress' : 'En atención', background: '#ECFDF3', color: '#168A4A' };
  }
  if (normalized === 'FINALIZADO') {
    return { label: isEnglish ? 'Completed' : 'Finalizado', background: '#EAF4FF', color: '#1664A7' };
  }
  if (normalized === 'SINREPORTAR') {
    return { label: isEnglish ? 'Unreported' : 'Sin reportar', background: '#F1F5F9', color: '#64748B' };
  }

  return { label: status || (isEnglish ? 'Pending' : 'Pendiente'), background: '#F1F5F9', color: '#64748B' };
}

function getIncidentSummary(incident) {
  return incident.incidente || incident.resumen || '';
}

function getIncidentLocation(incident) {
  return incident.ubicacion || incident.nombreSitio || incident.plaza || '';
}

function getEngineerStatus(eng, isEnglish) {
  const status = normalizeStatus(eng.estatus || 'MESA');
  if (!status || status === 'MESA' || status === 'ENMESA' || status === 'DISPONIBLE') {
    return isEnglish ? 'At desk' : 'En mesa (Disponible)';
  }
  const labels = {
    ENCAMPO: isEnglish ? 'In field' : 'En campo',
    CAMPO: isEnglish ? 'In field' : 'En campo',
    COMIDA: isEnglish ? 'At lunch' : 'En comida',
    ENCOMIDA: isEnglish ? 'At lunch' : 'En comida',
    ENPROYECTO: isEnglish ? 'On project' : 'En proyecto',
    PROYECTO: isEnglish ? 'On project' : 'En proyecto',
    VACACIONES: isEnglish ? 'On vacation' : 'En vacaciones',
    SINREPORTAR: isEnglish ? 'Unreported' : 'Sin reportar',
    FUERATURNO: isEnglish ? 'Off shift' : 'Fuera de turno',
  };
  return labels[status] || eng.estatus || (isEnglish ? 'Unreported' : 'Sin reportar');
}

function getShiftSchedule(engineer, isEnglish) {
  const schedule = engineer.turnoHorario || engineer.horario;
  if (!schedule) return isEnglish ? 'Morning (08:00 - 17:00)' : 'Matutino (08:00 - 17:00)';
  if (!isEnglish) return schedule;
  return schedule
    .replace(/Matutino/gi, 'Morning')
    .replace(/Vespertino/gi, 'Afternoon')
    .replace(/Nocturno/gi, 'Night');
}

async function apiRequest(endpoint, options = {}, fallbackMessage = 'No fue posible completar la operación.') {
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
    throw new Error(result.message || fallbackMessage);
  }

  return result;
}

function DistributorOverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, preferences } = usePreferences();
  const isEnglish = preferences.idioma === 'en-US';
  const tx = useCallback((spanish, english) => (isEnglish ? english : spanish), [isEnglish]);

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

  const [selectedEngineer, setSelectedEngineer] = useState(location.state?.engineerId || '');
  const [selectedIncidentToAssign, setSelectedIncidentToAssign] = useState('');
  const [selectedIncidentForReview, setSelectedIncidentForReview] = useState(null);
  const [message, setMessage] = useState(null);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ ...EMPTY_INCIDENT_FORM });
  const [savingIncident, setSavingIncident] = useState(false);
  const [formError, setFormError] = useState('');

  const writeLock = useRef(false);
  const assignmentFormRef = useRef(null);

  const loadEngineers = useCallback(async (silent = false) => {
    if (!silent) setLoadingEngineers(true);
    try {
      const result = await apiRequest('/ingenieros');
      setEngineers(Array.isArray(result.data) ? result.data : []);
    } catch {
      if (!silent) setEngineers([]);
    } finally {
      if (!silent) setLoadingEngineers(false);
    }
  }, []);

  const loadIncidents = useCallback(async (silent = false) => {
    if (!silent) setLoadingIncidents(true);
    try {
      const result = await apiRequest('/incidentes');
      setIncidents(Array.isArray(result.data) ? result.data : []);
    } catch {
      if (!silent) setIncidents([]);
    } finally {
      if (!silent) setLoadingIncidents(false);
    }
  }, []);

  useEffect(() => {
    loadEngineers();
    loadIncidents();
  }, [loadEngineers, loadIncidents]);

  // Refresco automático: estatus de ISM e incidentes cambian desde otros navegadores
  usePolling(
    useCallback(() => {
      loadEngineers(true);
      loadIncidents(true);
    }, [loadEngineers, loadIncidents]),
    8000,
  );

  const availableEngineers = useMemo(
    () => engineers.filter((eng) => normalizeText(eng.estatus) === 'mesa' || !eng.estatus),
    [engineers],
  );

  const inAttentionIncidents = useMemo(
    () => incidents.filter((inc) => normalizeStatus(inc.estatus) === 'ENATENCION' || normalizeStatus(inc.estatus) === 'EN ATENCION'),
    [incidents],
  );

  const pendingIncidents = useMemo(
    () => incidents.filter((incident) => normalizeStatus(incident.estatus) === 'PENDIENTE'),
    [incidents],
  );

  const staffStatusCounts = useMemo(() => {
    const counts = { mesa: 0, campo: 0, comida: 0, proyecto: 0, sinReportar: 0, vacaciones: 0 };
    engineers.forEach((engineer) => {
      const status = normalizeStatus(engineer.estatus || 'MESA');
      if (!status || ['MESA', 'ENMESA', 'DISPONIBLE'].includes(status)) counts.mesa += 1;
      else if (['CAMPO', 'ENCAMPO'].includes(status)) counts.campo += 1;
      else if (['COMIDA', 'ENCOMIDA'].includes(status)) counts.comida += 1;
      else if (['PROYECTO', 'ENPROYECTO'].includes(status)) counts.proyecto += 1;
      else if (status === 'VACACIONES') counts.vacaciones += 1;
      else counts.sinReportar += 1;
    });
    return counts;
  }, [engineers]);

  const statusCards = [
    { id: 'mesa', label: t('statusMesa'), value: loadingEngineers ? '—' : staffStatusCounts.mesa, color: '#1D6FB8', lightColor: '#EAF2FA', icon: <GroupsOutlined /> },
    { id: 'campo', label: t('statusCampo'), value: loadingEngineers ? '—' : staffStatusCounts.campo, color: '#0E9F6E', lightColor: '#E9F9F1', icon: <LocationOnOutlined /> },
    { id: 'comida', label: t('statusComida'), value: loadingEngineers ? '—' : staffStatusCounts.comida, color: '#D97706', lightColor: '#FDF3E3', icon: <RestaurantOutlined /> },
    { id: 'proyecto', label: t('statusProyecto'), value: loadingEngineers ? '—' : staffStatusCounts.proyecto, color: '#6D5BB8', lightColor: '#EFEDFA', icon: <BusinessCenterOutlined /> },
    { id: 'sin-reportar', label: t('statusSinReportar'), value: loadingEngineers ? '—' : staffStatusCounts.sinReportar, color: '#C0392B', lightColor: '#FDECEA', icon: <WarningAmberOutlined /> },
    { id: 'vacaciones', label: t('statusVacaciones'), value: loadingEngineers ? '—' : staffStatusCounts.vacaciones, color: '#64748B', lightColor: '#EEF2F6', icon: <WbSunnyOutlined /> },
  ];

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
    const engineerId = selectedEngineer || location.state?.engineerId || '';
    if (!engineerId) {
      setMessage({ severity: 'warning', text: tx('Selecciona un agente ISM/MESA disponible.', 'Select an available ISM/Desk agent.') });
      return;
    }
    if (!selectedIncidentToAssign) {
      setMessage({ severity: 'warning', text: tx('Selecciona un incidente pendiente para asignar.', 'Select a pending incident to assign.') });
      return;
    }

    try {
      const userStored = JSON.parse(localStorage.getItem('execon_usuario') || '{}');
      await apiRequest(`/incidentes/${selectedIncidentToAssign}`, {
        method: 'PUT',
        body: JSON.stringify({
          idIsmAsignado: engineerId,
          estatus: 'EN ATENCION',
          asignadoPor: userStored.id || null,
        }),
      }, tx('No se pudo asignar el onsite.', 'Could not assign the onsite.'));

      setMessage({ severity: 'success', text: tx('Incidente asignado correctamente al agente.', 'Incident assigned successfully.') });
      setSelectedIncidentToAssign('');
      setSelectedEngineer('');
      if (location.state?.engineerId) {
        navigate(location.pathname, { replace: true, state: null });
      }
      loadIncidents();
      loadEngineers();
    } catch {
      setMessage({ severity: 'error', text: tx('No se pudo asignar el onsite. Revisa los datos e inténtalo de nuevo.', 'The onsite could not be assigned. Check the details and try again.') });
    }
  };

  const handleSaveIncident = async (event) => {
    event.preventDefault();
    if (writeLock.current) return;

    const folio = incidentForm.folio.trim();
    const resumen = incidentForm.resumen.trim();

    if (!folio || !resumen) {
      setFormError(tx('Folio y resumen son obligatorios.', 'Ticket and summary are required.'));
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
      }, tx('No fue posible guardar el incidente.', 'Could not save the incident.'));

      setOpenCreateModal(false);
      setIncidentForm({ ...EMPTY_INCIDENT_FORM });
      setMessage({ severity: 'success', text: tx(`Incidente ${folio} registrado y asignado exitosamente.`, `Incident ${folio} created and assigned successfully.`) });
      await Promise.all([loadIncidents(), loadEngineers()]);
    } catch (error) {
      setFormError(error.message || tx('Error al guardar el incidente.', 'Could not save the incident.'));
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
      <Box sx={{ width: '100%', minWidth: 0, pt: 0.25, pb: 2 }}>
        {message && (
          <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        {section !== 'general' && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mb: 1.5, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography component="h1" sx={{ color: 'text.primary', fontSize: '1.05rem', fontWeight: 800 }}>
                {section === 'onsite'
                  ? tx('Asignación de onsite', 'Onsite assignment')
                  : tx('Validación de incidentes', 'Incident review')}
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                {section === 'onsite'
                  ? tx('Revisa incidentes pendientes y asigna un agente disponible.', 'Review pending incidents and assign an available agent.')
                  : tx('Consulta y valida la información de los incidentes registrados.', 'Review and validate logged incident details.')}
              </Typography>
            </Box>
            <Button
              startIcon={<ArrowBackOutlined />}
              onClick={() => navigate('/distribuidor')}
              sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 700 }}
            >
              {tx('Vista General', 'Overview')}
            </Button>
          </Stack>
        )}

        <StatusSummaryCards cards={statusCards} />

        {section === 'general' && (
          <Paper sx={{ ...panelSx, p: 1.75, mb: 1.5 }}>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#173B66', mb: 0.5 }}>
              {tx('Acciones rápidas de distribución', 'Quick Distribution Actions')}
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.82rem', mb: 1.5 }}>
              {tx('Valida incidentes, consulta onsites pendientes o registra uno nuevo.', 'Review incidents, check pending onsites, or create a new incident.')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<SendOutlined />}
                onClick={() => navigate('/distribuidor/onsite')}
                sx={{ bgcolor: '#003359', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#002642' } }}
              >
                {tx('Ver onsites para asignar', 'View onsites to assign')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<AssignmentOutlined />}
                onClick={() => navigate('/distribuidor/incidentes')}
                sx={{ borderColor: '#003359', color: '#003359', fontWeight: 800, textTransform: 'none' }}
              >
                {tx('Validar incidentes', 'Review incidents')}
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddOutlined />}
                onClick={() => setOpenCreateModal(true)}
                sx={{ borderColor: '#D9E2EC', color: '#173B66', fontWeight: 800, textTransform: 'none' }}
              >
                {tx('Nuevo incidente', 'New incident')}
              </Button>
              <Button
                variant="text"
                startIcon={<RefreshOutlined />}
                onClick={reloadData}
                disabled={isLoading}
                sx={{ color: '#173B66', fontWeight: 800, textTransform: 'none' }}
              >
                {isLoading ? tx('Actualizando...', 'Refreshing...') : tx('Actualizar', 'Refresh')}
              </Button>
            </Stack>
          </Paper>
        )}

        {/* 1. SECCIÓN VISTA GENERAL */}
        {section === 'general' && (
          <>
            {/* CONTROL DE DISPONIBILIDAD Y HORARIOS */}
            <Paper sx={{ ...panelSx, p: 1.75, mb: 1.5 }}>
              <Typography sx={{ color: '#173B66', fontSize: '0.95rem', fontWeight: 800, mb: 1 }}>
                {tx('Turnos y disponibilidad', 'Shifts & Availability')}
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    minWidth: 780,
                    borderCollapse: 'collapse',
                    '& th': {
                      py: 0.9,
                      px: 1.25,
                      textAlign: 'left',
                      bgcolor: '#F8FAFC',
                      color: '#64748B',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      borderBottom: '1px solid #E7EDF4',
                    },
                    '& td': {
                      py: 0.85,
                      px: 1.25,
                      color: '#334155',
                      fontSize: '0.84rem',
                      borderBottom: '1px solid #EEF2F6',
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th>{tx('Agente ISM/MESA', 'ISM/Desk agent')}</th>
                      <th>{tx('Estatus actual', 'Current status')}</th>
                      <th>{tx('Horario / Turno', 'Schedule / Shift')}</th>
                      <th>{tx('Correo', 'Email')}</th>
                      <th>{tx('Acción directa', 'Quick action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engineers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                          {tx('No hay agentes registrados en la base de datos.', 'No agents are registered.')}
                        </td>
                      </tr>
                    ) : (
                      engineers.map((eng) => {
                        const isAvailable = normalizeText(eng.estatus) === 'mesa' || !eng.estatus;
                        const shiftSchedule = getShiftSchedule(eng, isEnglish);
                        return (
                          <tr key={eng.id}>
                            <td style={{ fontWeight: 700, color: '#173B66' }}>{eng.nombre}</td>
                            <td>
                              <Chip
                                size="small"
                                label={getEngineerStatus(eng, isEnglish)}
                                sx={{
                                  bgcolor: isAvailable ? '#ECFDF3' : '#F1F5F9',
                                  color: isAvailable ? '#168A4A' : '#64748B',
                                  fontWeight: 800,
                                }}
                              />
                            </td>
                            <td>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <ScheduleOutlined sx={{ fontSize: 16, color: '#64748B' }} />
                                <Typography sx={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                                  {shiftSchedule}
                                </Typography>
                              </Stack>
                            </td>
                            <td>{eng.correo || tx('Sin correo', 'No email')}</td>
                            <td>
                              <Button
                                size="small"
                                variant="text"
                                disabled={!isAvailable}
                                onClick={() => {
                                  navigate('/distribuidor/onsite', { state: { engineerId: eng.id } });
                                }}
                                sx={{ textTransform: 'none', fontWeight: 800, color: '#003359' }}
                              >
                                {tx('Asignar onsite', 'Assign onsite')}
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
            <Paper sx={{ ...panelSx, p: 1.75, mb: 1.5 }}>
              <Typography sx={{ color: '#173B66', fontSize: '0.95rem', fontWeight: 800, mb: 1 }}>
                {tx('Incidentes en atención', 'Incidents in progress')}
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    minWidth: 850,
                    borderCollapse: 'collapse',
                    '& th': {
                      py: 0.9,
                      px: 1.25,
                      textAlign: 'left',
                      bgcolor: '#F8FAFC',
                      color: '#64748B',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      borderBottom: '1px solid #E7EDF4',
                    },
                    '& td': {
                      py: 0.85,
                      px: 1.25,
                      color: '#334155',
                      fontSize: '0.84rem',
                      borderBottom: '1px solid #EEF2F6',
                    },
                  }}
                >
                  <thead>
                    <tr>
                      <th>{tx('Folio', 'Ticket')}</th>
                      <th>{tx('Cliente / Compañía', 'Customer / Company')}</th>
                      <th>{tx('Plaza / Ubicación', 'Branch / Location')}</th>
                      <th>{tx('Resumen del servicio', 'Service summary')}</th>
                      <th>{tx('ISM/MESA asignado', 'Assigned ISM/Desk')}</th>
                      <th>{tx('Atendido por', 'Handled by')}</th>
                      <th>{tx('Estatus', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inAttentionIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                          {tx('No hay incidentes en atención actualmente.', 'There are no incidents in progress.')}
                        </td>
                      </tr>
                    ) : (
                      inAttentionIncidents.map((inc) => (
                        <tr key={inc.id ?? inc.folio}>
                          <td style={{ fontWeight: 800, color: '#173B66' }}>{inc.folio}</td>
                          <td style={{ fontWeight: 600 }}>{inc.compania || '—'}</td>
                          <td>{getIncidentLocation(inc)}</td>
                          <td>{getIncidentSummary(inc)}</td>
                          <td style={{ fontWeight: 700, color: '#003359' }}>{inc.ismMesa || tx('Sin asignar', 'Unassigned')}</td>
                          <td>{inc.asignadoPorNombre || inc.atendidoPor || tx('Supervisor / Distribuidor', 'Supervisor / Distributor')}</td>
                          <td>
                            <Chip
                              size="small"
                              label={tx('En atención', 'In progress')}
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

          </>
        )}

        {/* 2. SECCIÓN INCIDENTES LOGGEADOS */}
        {section === 'incidentes' && (
          <Paper sx={{ ...panelSx, p: 1.75 }}>
            <Tabs
              value={priorityTab}
              onChange={(_, value) => setPriorityTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2, borderBottom: '1px solid #E7EDF4', '& .MuiTabs-indicator': { bgcolor: '#003359' } }}
            >
              <Tab value="TODOS" label={tx('Todos', 'All')} sx={{ textTransform: 'none', fontWeight: 800 }} />
              {['P1', 'P2', 'P3', 'P4', 'P5'].map((p) => (
                <Tab key={p} value={p} label={p} sx={{ fontWeight: 800 }} />
              ))}
            </Tabs>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
              <TextField
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder={t('distLoggedSearch')}
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
                <InputLabel id="status-filter-label">{tx('Estatus', 'Status')}</InputLabel>
                <Select
                  labelId="status-filter-label"
                  label={tx('Estatus', 'Status')}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="TODOS">{tx('Todos los estatus', 'All statuses')}</MenuItem>
                  <MenuItem value="PENDIENTE">{tx('Pendientes', 'Pending')}</MenuItem>
                  <MenuItem value="EN ATENCION">{tx('En atención', 'In progress')}</MenuItem>
                  <MenuItem value="FINALIZADO">{tx('Finalizados', 'Completed')}</MenuItem>
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
                    <th>{tx('Fecha', 'Date')}</th>
                    <th>{tx('Folio', 'Ticket')}</th>
                    <th>{tx('Prioridad', 'Priority')}</th>
                    <th>{tx('Incidente / Resumen', 'Incident / Summary')}</th>
                    <th>{tx('Plaza / Ubicación', 'Branch / Location')}</th>
                    <th>{tx('ISM/MESA asignado', 'Assigned ISM/Desk')}</th>
                    <th>{tx('Estatus', 'Status')}</th>
                    <th>{tx('Acción', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                        <AssignmentOutlined sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                        <Typography sx={{ fontWeight: 800, color: '#475569' }}>
                          {tx('No hay incidentes para esta categoría.', 'No incidents match this category.')}
                        </Typography>
                      </td>
                    </tr>
                  ) : (
                    filteredIncidents.map((inc) => {
                      const st = getStatusStyle(inc.estatus, isEnglish);
                      return (
                        <tr key={inc.id ?? inc.folio}>
                          <td>{inc.fecha || '—'}</td>
                          <td style={{ fontWeight: 800, color: '#173B66' }}>{inc.folio}</td>
                          <td>
                            <Chip size="small" label={normalizePriority(inc.prioridad)} sx={{ fontWeight: 800, bgcolor: '#F1F5F9' }} />
                          </td>
                          <td>{getIncidentSummary(inc)}</td>
                          <td>{getIncidentLocation(inc)}</td>
                          <td>{inc.ismMesa || tx('Sin asignar', 'Unassigned')}</td>
                          <td>
                            <Chip size="small" label={st.label} sx={{ bgcolor: st.background, color: st.color, fontWeight: 800 }} />
                          </td>
                          <td>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => setSelectedIncidentForReview(inc)}
                              sx={{ fontWeight: 800, textTransform: 'none' }}
                            >
                              {tx('Validar', 'Review')}
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

        {/* 3. SECCIÓN ASIGNACIÓN DE ONSITE */}
        {section === 'onsite' && (
          <Box>
            <Paper ref={assignmentFormRef} sx={{ ...panelSx, p: 1.5, mb: 1.5 }}>
              <Typography sx={{ mb: 1.25, color: '#173B66', fontSize: '0.92rem', fontWeight: 800 }}>
                {tx('Asignar incidente pendiente', 'Assign a pending incident')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25, alignItems: 'center' }}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="assign-eng-select">{tx('ISM disponible', 'Available ISM')}</InputLabel>
                  <Select
                    labelId="assign-eng-select"
                    label={tx('ISM disponible', 'Available ISM')}
                    value={selectedEngineer || location.state?.engineerId || ''}
                    onChange={(e) => {
                      setSelectedEngineer(e.target.value);
                      if (location.state?.engineerId) {
                        navigate(location.pathname, { replace: true, state: null });
                      }
                    }}
                    sx={{ height: 40 }}
                  >
                    <MenuItem value="">{tx('Selecciona un técnico disponible', 'Select an available technician')}</MenuItem>
                    {availableEngineers.map((eng) => (
                      <MenuItem key={eng.id} value={eng.id}>
                        {eng.nombre} ({tx('En mesa', 'At desk')})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="assign-inc-select">{tx('Incidente pendiente', 'Pending incident')}</InputLabel>
                  <Select
                    labelId="assign-inc-select"
                    label={tx('Incidente pendiente', 'Pending incident')}
                    value={selectedIncidentToAssign}
                    onChange={(e) => setSelectedIncidentToAssign(e.target.value)}
                    sx={{ height: 40 }}
                  >
                    <MenuItem value="">{tx('Selecciona un incidente pendiente', 'Select a pending incident')}</MenuItem>
                    {pendingIncidents.map((inc) => (
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
                  {tx('Asignar onsite', 'Assign onsite')}
                </Button>
              </Box>
            </Paper>

            <Paper sx={{ ...panelSx, p: 1.75 }}>
              <Typography sx={{ color: '#173B66', fontSize: '0.92rem', fontWeight: 800, mb: 1 }}>
                {tx('Onsites pendientes por asignar', 'Pending onsites to assign')} ({pendingIncidents.length})
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    minWidth: 760,
                    borderCollapse: 'collapse',
                    '& th': { py: 0.9, px: 1.25, textAlign: 'left', bgcolor: '#F8FAFC', color: '#64748B', fontSize: '0.76rem', fontWeight: 800, borderBottom: '1px solid #E7EDF4' },
                    '& td': { py: 0.85, px: 1.25, color: '#334155', fontSize: '0.82rem', borderBottom: '1px solid #EEF2F6' },
                  }}
                >
                  <thead>
                    <tr>
                      <th>{tx('Folio', 'Ticket')}</th>
                      <th>{tx('Cliente / Compañía', 'Customer / Company')}</th>
                      <th>{tx('Ubicación', 'Location')}</th>
                      <th>{tx('Resumen', 'Summary')}</th>
                      <th>{tx('Prioridad', 'Priority')}</th>
                      <th>{tx('Acción', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: '#94A3B8' }}>
                          {tx('No hay onsites pendientes por asignar.', 'There are no pending onsites to assign.')}
                        </td>
                      </tr>
                    ) : pendingIncidents.map((incident) => (
                      <tr key={incident.id}>
                        <td style={{ fontWeight: 800, color: '#173B66' }}>{incident.folio}</td>
                        <td>{incident.compania || incident.clienteNombre || '—'}</td>
                        <td>{getIncidentLocation(incident) || '—'}</td>
                        <td>{getIncidentSummary(incident)}</td>
                        <td>
                          <Chip size="small" label={normalizePriority(incident.prioridad)} sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 800 }} />
                        </td>
                        <td>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedIncidentToAssign(incident.id);
                              assignmentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            sx={{ textTransform: 'none', fontWeight: 800 }}
                          >
                            {tx('Seleccionar', 'Select')}
                          </Button>
                        </td>
                      </tr>
                    ))}
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
                    <th>{tx('Folio', 'Ticket')}</th>
                    <th>{tx('Cliente / Compañía', 'Customer / Company')}</th>
                    <th>{tx('Plaza / Ubicación', 'Branch / Location')}</th>
                    <th>{tx('Resumen del servicio', 'Service summary')}</th>
                    <th>{tx('ISM/MESA asignado', 'Assigned ISM/Desk')}</th>
                    <th>{tx('Atendido por', 'Handled by')}</th>
                    <th>{tx('Estatus', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {inAttentionIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                        {tx('No hay incidentes en atención activa en este momento.', 'There are no active incidents right now.')}
                      </td>
                    </tr>
                  ) : (
                    inAttentionIncidents.map((inc) => (
                      <tr key={inc.id ?? inc.folio}>
                        <td style={{ fontWeight: 800, color: '#173B66' }}>{inc.folio}</td>
                        <td style={{ fontWeight: 600 }}>{inc.compania || '—'}</td>
                        <td>{getIncidentLocation(inc)}</td>
                        <td>{getIncidentSummary(inc)}</td>
                        <td style={{ fontWeight: 700, color: '#003359' }}>{inc.ismMesa || tx('Sin asignar', 'Unassigned')}</td>
                        <td>{inc.asignadoPorNombre || inc.atendidoPor || tx('Supervisor / Distribuidor', 'Supervisor / Distributor')}</td>
                        <td>
                          <Chip
                            size="small"
                            label={tx('En atención', 'In progress')}
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
                    <th>{tx('Agente ISM/MESA', 'ISM/Desk agent')}</th>
                    <th>{tx('Estatus actual', 'Current status')}</th>
                    <th>{tx('Horario / Turno', 'Schedule / Shift')}</th>
                    <th>{tx('Correo', 'Email')}</th>
                    <th>{tx('Acción', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {engineers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                        {tx('No hay agentes registrados en la base de datos.', 'No agents are registered.')}
                      </td>
                    </tr>
                  ) : (
                    engineers.map((eng) => {
                      const isAvailable = normalizeText(eng.estatus) === 'mesa' || !eng.estatus;
                      const shiftSchedule = getShiftSchedule(eng, isEnglish);
                      return (
                        <tr key={eng.id}>
                          <td style={{ fontWeight: 700, color: '#173B66' }}>{eng.nombre}</td>
                          <td>
                            <Chip
                              size="small"
                              label={getEngineerStatus(eng, isEnglish)}
                              sx={{
                                bgcolor: isAvailable ? '#ECFDF3' : '#F1F5F9',
                                color: isAvailable ? '#168A4A' : '#64748B',
                                fontWeight: 800,
                              }}
                            />
                          </td>
                          <td>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                              <ScheduleOutlined sx={{ fontSize: 16, color: '#64748B' }} />
                              <Typography sx={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                                {shiftSchedule}
                              </Typography>
                            </Stack>
                          </td>
                          <td>{eng.correo || tx('Sin correo', 'No email')}</td>
                          <td>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={!isAvailable}
                              onClick={() => {
                                navigate('/distribuidor/onsite', { state: { engineerId: eng.id } });
                              }}
                              sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#003359' }}
                            >
                              {tx('Asignar onsite', 'Assign onsite')}
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

        {selectedIncidentForReview && (
          <Dialog
            open={Boolean(selectedIncidentForReview)}
            onClose={() => setSelectedIncidentForReview(null)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle sx={{ color: '#173B66', fontWeight: 800 }}>
              {tx('Validar incidente', 'Review incident')} · {selectedIncidentForReview.folio}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
                  {[
                    [tx('Cliente / Compañía', 'Customer / Company'), selectedIncidentForReview.compania || selectedIncidentForReview.clienteNombre || '—'],
                    [tx('Plaza / Ubicación', 'Branch / Location'), getIncidentLocation(selectedIncidentForReview) || '—'],
                    [tx('ISM/MESA asignado', 'Assigned ISM/Desk'), selectedIncidentForReview.ismMesa || tx('Sin asignar', 'Unassigned')],
                    [tx('Prioridad', 'Priority'), normalizePriority(selectedIncidentForReview.prioridad)],
                  ].map(([label, value]) => (
                    <Paper key={label} sx={{ ...panelSx, p: 1.25, boxShadow: 'none' }}>
                      <Typography sx={{ color: '#64748B', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>
                        {label}
                      </Typography>
                      <Typography sx={{ mt: 0.3, color: 'text.primary', fontSize: '0.86rem', fontWeight: 700 }}>
                        {value}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
                <Box>
                  <Typography sx={{ mb: 0.5, color: '#64748B', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    {tx('Estatus', 'Status')}
                  </Typography>
                  <Chip
                    size="small"
                    label={getStatusStyle(selectedIncidentForReview.estatus, isEnglish).label}
                    sx={{
                      bgcolor: getStatusStyle(selectedIncidentForReview.estatus).background,
                      color: getStatusStyle(selectedIncidentForReview.estatus).color,
                      fontWeight: 800,
                    }}
                  />
                </Box>
                <Box>
                  <Typography sx={{ mb: 0.5, color: '#64748B', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    {tx('Resumen', 'Summary')}
                  </Typography>
                  <Paper sx={{ ...panelSx, p: 1.25, boxShadow: 'none' }}>
                    {getIncidentSummary(selectedIncidentForReview) || '—'}
                  </Paper>
                </Box>
                <Box>
                  <Typography sx={{ mb: 0.5, color: '#64748B', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    {tx('Descripción', 'Description')}
                  </Typography>
                  <Paper sx={{ ...panelSx, p: 1.25, boxShadow: 'none', whiteSpace: 'pre-wrap' }}>
                    {selectedIncidentForReview.descripcion || tx('Sin descripción adicional.', 'No additional description.')}
                  </Paper>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 1.5 }}>
              <Button onClick={() => setSelectedIncidentForReview(null)}>
                {tx('Cerrar', 'Close')}
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* MODAL CREAR INCIDENTE */}
        <Dialog open={openCreateModal} onClose={() => setOpenCreateModal(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: '#173B66' }}>{tx('Registrar incidente Onsite', 'Log onsite incident')}</DialogTitle>
          <Box component="form" onSubmit={handleSaveIncident}>
            <DialogContent dividers>
              <Stack spacing={2}>
                {formError && <Alert severity="error">{formError}</Alert>}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label={tx('Folio / Ticket', 'Ticket ID')}
                    value={incidentForm.folio}
                    onChange={(e) => setIncidentForm({ ...incidentForm, folio: e.target.value })}
                    required
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label={tx('Compañía / Cliente', 'Company / Customer')}
                    value={incidentForm.compania}
                    onChange={(e) => setIncidentForm({ ...incidentForm, compania: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label={tx('Plaza / Municipio', 'Branch / Municipality')}
                    placeholder={tx('Ej. Monterrey / San Pedro', 'e.g. Monterrey / San Pedro')}
                    value={incidentForm.plaza}
                    onChange={(e) => setIncidentForm({ ...incidentForm, plaza: e.target.value })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label={tx('Sitio / Ubicación', 'Site / Location')}
                    placeholder={tx('Ej. CEDIS Principal', 'e.g. Main distribution center')}
                    value={incidentForm.nombreSitio}
                    onChange={(e) => setIncidentForm({ ...incidentForm, nombreSitio: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="form-eng-label">{tx('Asignar a ISM/MESA', 'Assign to ISM/Desk')}</InputLabel>
                    <Select
                      labelId="form-eng-label"
                      label={tx('Asignar a ISM/MESA', 'Assign to ISM/Desk')}
                      value={incidentForm.idIsmAsignado}
                      onChange={(e) => setIncidentForm({ ...incidentForm, idIsmAsignado: e.target.value })}
                    >
                      <MenuItem value="">{tx('Sin asignar (Pendiente)', 'Unassigned (Pending)')}</MenuItem>
                      {availableEngineers.map((eng) => (
                        <MenuItem key={eng.id} value={eng.id}>
                          {eng.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel id="form-prio-label">{tx('Prioridad', 'Priority')}</InputLabel>
                    <Select
                      labelId="form-prio-label"
                      label={tx('Prioridad', 'Priority')}
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
                  label={tx('Resumen del problema', 'Issue summary')}
                  value={incidentForm.resumen}
                  onChange={(e) => setIncidentForm({ ...incidentForm, resumen: e.target.value })}
                  required
                  fullWidth
                  size="small"
                />
                <TextField
                  label={tx('Descripción técnica', 'Technical description')}
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
                {tx('Cancelar', 'Cancel')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={savingIncident}
                sx={{ bgcolor: '#003359', fontWeight: 800, '&:hover': { bgcolor: '#002642' } }}
              >
                {savingIncident ? tx('Guardando...', 'Saving...') : tx('Crear incidente', 'Create incident')}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Box>
    </DistribuidorLayout>
  );
}

export default DistributorOverviewPage;