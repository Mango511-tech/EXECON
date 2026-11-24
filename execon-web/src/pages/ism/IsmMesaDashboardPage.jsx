import {
  AccessTimeOutlined,
  EmailOutlined,
  GroupsOutlined,
  LocationOnOutlined,
  PhoneOutlined,
  RestaurantOutlined,
  ScheduleOutlined,
} from '@mui/icons-material';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  MenuItem,
  Select,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import { useCallback, useEffect, useMemo, useState } from 'react';
import usePolling from '../../hooks/usePolling';
import IsmLayout from '../../layouts/IsmLayout';
import { usePreferences } from '../../context/PreferencesContext';
import StatusSummaryCards from '../../components/StatusSummaryCards';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
).replace(/\/+$/, '');

const JORNADA_MINUTOS = 9 * 60;

// Opciones del selector de estatus del ISM (el backend las agrupa en mesa / campo / comida / proyecto / sin reportar)
const ACTIVIDADES = [
  'Offline',
  'Available',
  'Lunch',
  'Break',
  'Asistencia en campo',
  'Atención Grupos de Whatsapp',
  'Atención Correo',
  'Atendiendo Backlog',
  'Capacitación - Reunión',
  'Idle',
  'Outbound Calls',
];

const ACTIVIDAD_POR_ESTATUS = {
  mesa: 'Available',
  campo: 'Asistencia en campo',
  comida: 'Lunch',
  proyecto: 'Capacitación - Reunión',
  sin_reportar: 'Offline',
  vacaciones: 'Offline',
};

async function updateActivityStatus(userId, status, failureMessage) {
  const token = localStorage.getItem('execon_token');
  if (!token || !userId) throw new Error(failureMessage);
  const response = await fetch(`${API_URL}/usuarios/${userId}/estatus-actividad`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ estatus: status }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || failureMessage);
  }
}

function formatSeconds(totalSecs) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatMinutes(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h > 0 ? `${h}h ${rem}m` : `${rem}m`;
}

function getLocalizedStatus(status, isEnglish) {
  const normalized = String(status || '').toUpperCase().replace(/[\s_-]+/g, '');
  if (normalized === 'ENATENCION') return isEnglish ? 'In progress' : 'En atención';
  if (normalized === 'PENDIENTE') return isEnglish ? 'Pending' : 'Pendiente';
  if (normalized === 'FINALIZADO') return isEnglish ? 'Completed' : 'Finalizado';
  return status || (isEnglish ? 'Pending' : 'Pendiente');
}

export default function IsmMesaDashboardPage() {
  const { t, preferences } = usePreferences();
  const isEnglish = preferences.idioma === 'en-US';
  const tx = useCallback((spanish, english) => (isEnglish ? english : spanish), [isEnglish]);

  let userStored = {};
  try {
    const stored = JSON.parse(localStorage.getItem('execon_usuario') || '{}');
    userStored = stored && typeof stored === 'object' ? stored : {};
  } catch {
    userStored = {};
  }
  const userId = userStored.id;

  // Estados de Jornada y Turno
  const [shiftState, setShiftState] = useState('INACTIVO'); // 'ACTIVO', 'COMIDA', 'INACTIVO'
  const [shiftStartMs, setShiftStartMs] = useState(null);
  const [actividad, setActividad] = useState('Offline');
  const [dbStatus, setDbStatus] = useState('sin_reportar');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Estados de Incidentes
  const [incidents, setIncidents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [message, setMessage] = useState(null);

  // Modal Detalle de Incidente
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Contador de jornada: se calcula siempre desde la hora de entrada guardada en la base de datos,
  // por eso no se reinicia si se refresca la página o se abre en otro navegador.
  useEffect(() => {
    if (!shiftStartMs || shiftState === 'INACTIVO') return undefined;
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - shiftStartMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [shiftState, shiftStartMs]);

  const loadIncidents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('execon_token');
      const response = await fetch(`${API_URL}/incidentes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || tx('No fue posible cargar los incidentes.', 'Could not load incidents.'));
      if (!Array.isArray(result.data)) {
        throw new Error(tx('La respuesta de incidentes no es válida.', 'The incidents response is invalid.'));
      }
      setIncidents(result.data);
    } catch (error) {
      if (!silent) setMessage({ severity: 'error', text: error.message || tx('No fue posible cargar los incidentes.', 'Could not load incidents.') });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tx]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Lee mi estatus y mi hora de entrada guardados en la base de datos (sobreviven a recargas y otros navegadores)
  const loadOwnStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const token = localStorage.getItem('execon_token');
      const response = await fetch(`${API_URL}/jornada/mia`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.data) return;
      const { estatus, etiqueta, entradaMs } = result.data;
      setDbStatus(estatus);
      setActividad(ACTIVIDADES.includes(etiqueta) ? etiqueta : ACTIVIDAD_POR_ESTATUS[estatus] || 'Offline');
      if (estatus === 'sin_reportar' || estatus === 'vacaciones') {
        setShiftState('INACTIVO');
        setShiftStartMs(null);
        setElapsedSeconds(0);
      } else {
        setShiftState(estatus === 'comida' ? 'COMIDA' : 'ACTIVO');
        setShiftStartMs(entradaMs || Date.now());
      }
    } catch {
      /* sin conexión: se conserva el estado local */
    }
  }, [userId]);

  useEffect(() => {
    loadOwnStatus();
  }, [loadOwnStatus]);

  // Refresco automático: nuevas asignaciones del distribuidor y estatus propio
  usePolling(
    useCallback(() => {
      loadIncidents(true);
      loadOwnStatus();
    }, [loadIncidents, loadOwnStatus]),
    8000,
  );

  const myIncidents = useMemo(() => {
    return incidents.filter(
      (inc) =>
        Number(inc.id_ism_asignado || inc.idIsmMesa) === Number(userId) ||
        String(inc.ismMesa || '').toLowerCase() === String(userStored.nombreCompleto || '').toLowerCase(),
    );
  }, [incidents, userId, userStored.nombreCompleto]);

  const currentOnsite = useMemo(() => {
    return myIncidents.find((inc) => String(inc.estatus).toUpperCase() === 'EN ATENCION');
  }, [myIncidents]);

  const ownState = currentOnsite
    ? 'campo'
    : dbStatus === 'campo'
      ? 'campo'
      : dbStatus === 'comida'
        ? 'comida'
        : dbStatus === 'mesa' || dbStatus === 'proyecto'
          ? 'mesa'
          : 'sinReportar';
  const statusCards = [
    { id: 'mesa', label: t('statusMesa'), value: ownState === 'mesa' ? 1 : 0, color: '#1D6FB8', lightColor: '#EAF2FA', icon: <GroupsOutlined /> },
    { id: 'campo', label: t('statusCampo'), value: ownState === 'campo' ? 1 : 0, color: '#0E9F6E', lightColor: '#E9F9F1', icon: <LocationOnOutlined /> },
    { id: 'comida', label: t('statusComida'), value: ownState === 'comida' ? 1 : 0, color: '#D97706', lightColor: '#FDF3E3', icon: <RestaurantOutlined /> },
  ];

  // Cambio de estatus desde el selector
  const handleChangeActividad = async (nextActividad) => {
    if (currentOnsite) {
      setMessage({ severity: 'warning', text: tx('Concluye tu onsite en curso antes de cambiar de estatus.', 'Complete your onsite before changing status.') });
      return;
    }
    const previous = actividad;
    setActividad(nextActividad);
    try {
      await updateActivityStatus(
        userId,
        nextActividad,
        tx('No se encontró una sesión válida para actualizar el estado.', 'A valid session is required to update your status.'),
      );
      await loadOwnStatus();
      setMessage({ severity: 'info', text: tx(`Estatus actualizado: ${nextActividad}`, `Status updated: ${nextActividad}`) });
    } catch (error) {
      setActividad(previous);
      setMessage({ severity: 'error', text: error.message });
    }
  };

  // Abrir Detalle de Incidente
  const handleOpenDetail = (inc) => {
    setSelectedIncident(inc);
    setFeedbackText(inc.retroalimentacion || inc.solucion || '');
  };

  // Cambiar Estatus o Concluir Incidente con Retroalimentación
  const handleUpdateIncidentStatus = async (newStatus) => {
    if (!selectedIncident) return;
    setSubmittingStatus(true);
    const endTime = new Date();
    const endTimeStr = endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

    try {
      const token = localStorage.getItem('execon_token');
      const putResponse = await fetch(`${API_URL}/incidentes/${selectedIncident.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          estatus: newStatus,
          fin: newStatus === 'FINALIZADO' ? endTimeStr : undefined,
          idIsmAsignado: newStatus === 'FINALIZADO' ? null : userId,
          descripcion: feedbackText ? `${selectedIncident.descripcion || selectedIncident.resumen}\n[Retroalimentación]: ${feedbackText}` : selectedIncident.descripcion,
        }),
      });
      const putResult = await putResponse.json().catch(() => ({}));
      if (!putResponse.ok) {
        throw new Error(putResult.message || tx('No se pudo actualizar el incidente.', 'Could not update the incident.'));
      }

      if (newStatus === 'FINALIZADO') {
        const newLog = {
          id: selectedIncident.id,
          folio: selectedIncident.folio,
          resumen: selectedIncident.incidente || selectedIncident.resumen,
          cliente: selectedIncident.compania || selectedIncident.clienteNombre || 'Cliente General',
          inicio: selectedIncident.inicio || '09:00',
          fin: endTimeStr,
          duracion: selectedIncident.duracionMinutos ? formatMinutes(selectedIncident.duracionMinutos) : '1h 30m',
          fecha: new Date().toISOString().split('T')[0],
        };
        setActivityLogs((prev) => [newLog, ...prev]);

        // El backend ya regresa al ISM a "mesa" al finalizar; aquí solo se refleja en pantalla
        setShiftState((prev) => (prev === 'INACTIVO' ? 'ACTIVO' : prev));
      }

      setMessage({
        severity: 'success',
        text: tx(
          `Incidente #${selectedIncident.folio} actualizado a: ${getLocalizedStatus(newStatus, false)}`,
          `Incident #${selectedIncident.folio} updated to: ${getLocalizedStatus(newStatus, true)}`,
        ),
      });

      setSelectedIncident(null);
      loadIncidents();
    } catch (error) {
      setMessage({ severity: 'error', text: error.message || tx('No se pudo actualizar el incidente.', 'Could not update the incident.') });
    } finally {
      setSubmittingStatus(false);
    }
  };

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const progressPercent = Math.min(100, Math.round((elapsedMinutes / JORNADA_MINUTOS) * 100));
  const shiftStatusLabel = shiftState === 'INACTIVO'
    ? tx('Fuera de turno', 'Off shift')
    : actividad;
  const shiftStartTime = shiftStartMs
    ? new Date(shiftStartMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <IsmLayout>
      <Box sx={{ pb: 2 }}>
        {message && (
          <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <StatusSummaryCards cards={statusCards} />

        {loading && (
          <CircularProgress
            size={18}
            aria-label={tx('Cargando incidentes', 'Loading incidents')}
            sx={{ mb: 1 }}
          />
        )}

        <Paper
          sx={{
            p: { xs: 1.25, sm: 1.5 },
            mb: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: ownState === 'mesa' ? '#EAF2FA' : ownState === 'comida' ? '#FDF3E3' : ownState === 'campo' ? '#E9F9F1' : '#F1F5F9',
                  color: ownState === 'mesa' ? '#1D6FB8' : ownState === 'comida' ? '#D97706' : ownState === 'campo' ? '#0E9F6E' : '#64748B',
                }}
              >
                <ScheduleOutlined fontSize="small" />
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: 'text.primary' }}>
                  {tx('Jornada', 'Work shift')} · {shiftStatusLabel}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.35 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#173B66', fontVariantNumeric: 'tabular-nums' }}>
                    {formatSeconds(elapsedSeconds)} / 09:00:00
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={progressPercent}
                    sx={{
                      width: { xs: 84, sm: 120 },
                      height: 5,
                      borderRadius: 4,
                      bgcolor: '#E2E8F0',
                      '& .MuiLinearProgress-bar': { bgcolor: '#0F9D58' },
                    }}
                  />
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'text.secondary' }}>
                    {progressPercent}%
                  </Typography>
                  {shiftStartTime && (
                    <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.72rem', color: 'text.secondary' }}>
                      {tx(`Inicio ${shiftStartTime}`, `Started ${shiftStartTime}`)}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>

            <Select
              size="small"
              value={actividad}
              disabled={Boolean(currentOnsite)}
              onChange={(event) => handleChangeActividad(event.target.value)}
              inputProps={{ 'aria-label': tx('Estatus', 'Status') }}
              MenuProps={{ PaperProps: { sx: { maxHeight: 420 } } }}
              sx={{ minWidth: { xs: '100%', sm: 270 }, fontSize: '0.85rem', fontWeight: 700, color: '#003359', bgcolor: '#fff' }}
            >
              {ACTIVIDADES.map((option) => (
                <MenuItem key={option} value={option} sx={{ fontSize: '0.85rem' }}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        </Paper>

        {currentOnsite && (
          <Card sx={{ mb: 1.5, border: '1px solid #B7D7F3', borderRadius: 2, bgcolor: '#F8FBFF' }}>
            <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Chip label={tx('ONSITE EN CURSO', 'ONSITE IN PROGRESS')} color="primary" size="small" sx={{ fontWeight: 800, mb: 0.4 }} />
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: '#173B66' }}>
                    {tx('Folio', 'Ticket')} #{currentOnsite.folio} · {currentOnsite.incidente || currentOnsite.resumen}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748B', mt: 0.2 }}>
                    {tx('Ubicación', 'Location')}: {currentOnsite.ubicacion || tx('CEDIS Principal', 'Main distribution center')}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => handleOpenDetail(currentOnsite)}
                  sx={{ fontWeight: 800, textTransform: 'none', flexShrink: 0 }}
                >
                  {tx('Ver detalle / Concluir', 'View details / Complete')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Paper sx={{ border: '1px solid #E7EDF4', borderRadius: 2, p: { xs: 1.25, sm: 1.75 }, mb: 1.5 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={0.5}
              sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 0.75 }}
            >
              <Typography sx={{ color: '#173B66', fontSize: '0.95rem', fontWeight: 800 }}>
              {tx('Mis incidentes y cola de servicio', 'My incidents and service queue')}
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: '0.75rem' }}>
                {tx('Selecciona un incidente para consultar o actualizar.', 'Select an incident to view or update.')}
              </Typography>
            </Stack>

            <Tabs
              value={tabIndex}
              onChange={(_, val) => setTabIndex(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 1, minHeight: 36, borderBottom: '1px solid #E7EDF4', '& .MuiTabs-indicator': { bgcolor: '#003359' }, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
            >
              <Tab label={`${tx('Asignados', 'Assigned')} (${myIncidents.length})`} sx={{ fontWeight: 800, textTransform: 'none' }} />
              <Tab label={`${tx('Cola general', 'All incidents')} (${incidents.length})`} sx={{ fontWeight: 800, textTransform: 'none' }} />
            </Tabs>

            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', '& th': { py: 1.25, px: 2, textAlign: 'left', bgcolor: '#F8FAFC', color: '#64748B', fontSize: '0.78rem', fontWeight: 800, borderBottom: '1px solid #E7EDF4' }, '& td': { py: 1.2, px: 2, color: '#334155', fontSize: '0.84rem', borderBottom: '1px solid #EEF2F6' } }}>
                <thead>
                  <tr>
                    <th>{tx('Folio', 'Ticket')}</th>
                    <th>{tx('Prioridad', 'Priority')}</th>
                    <th>{tx('Resumen del incidente', 'Incident summary')}</th>
                    <th>{tx('Cliente / Compañía', 'Customer / Company')}</th>
                    <th>{tx('Plaza / Ubicación', 'Branch / Location')}</th>
                    <th>{tx('Estatus', 'Status')}</th>
                    <th>{tx('Acción', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(tabIndex === 0 ? myIncidents : incidents).length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                        {tx('No hay incidentes disponibles en esta sección.', 'No incidents are available in this section.')}
                      </td>
                    </tr>
                  ) : (
                    (tabIndex === 0 ? myIncidents : incidents).map((inc) => (
                      <tr key={inc.id ?? inc.folio}>
                        <td style={{ fontWeight: 800, color: '#173B66' }}>{inc.folio}</td>
                        <td>
                          <Chip size="small" label={inc.prioridad || 'P3'} sx={{ fontWeight: 800, bgcolor: inc.prioridad === 'P1' ? '#FEE2E2' : '#F1F5F9' }} />
                        </td>
                        <td>{inc.incidente || inc.resumen}</td>
                        <td>{inc.compania || inc.clienteNombre || tx('Cliente General', 'General customer')}</td>
                        <td>{inc.ubicacion || tx('CEDIS Principal', 'Main distribution center')}</td>
                        <td>
                          <Chip size="small" label={getLocalizedStatus(inc.estatus, isEnglish)} sx={{ bgcolor: inc.estatus === 'EN ATENCION' ? '#ECFDF3' : '#FFF7ED', color: inc.estatus === 'EN ATENCION' ? '#168A4A' : '#C2410C', fontWeight: 800 }} />
                        </td>
                        <td>
                          <Button size="small" variant="contained" onClick={() => handleOpenDetail(inc)} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#003359' }}>
                            {tx('Abrir', 'Open')}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Box>
            </Box>
        </Paper>

        <Paper sx={{ border: '1px solid #E7EDF4', borderRadius: 2, p: { xs: 1.25, sm: 1.75 } }}>
            <Typography sx={{ color: '#173B66', fontSize: '0.95rem', fontWeight: 800, mb: 0.35 }}>
              {tx('Duración de actividades', 'Activity duration')}
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.75rem', mb: 1 }}>
              {tx('Historial cronológico de servicios atendidos, con horas y tiempo invertido.', 'Chronological service history, including start/end times and time spent.')}
            </Typography>

            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', '& th': { py: 0.9, px: 1.25, textAlign: 'left', bgcolor: '#F8FAFC', color: '#64748B', fontSize: '0.74rem', fontWeight: 800, borderBottom: '1px solid #E7EDF4' }, '& td': { py: 0.85, px: 1.25, color: '#334155', fontSize: '0.8rem', borderBottom: '1px solid #EEF2F6' } }}>
                <thead>
                  <tr>
                    <th>{tx('Fecha', 'Date')}</th>
                    <th>{tx('Folio', 'Ticket')}</th>
                    <th>{tx('Cliente / Compañía', 'Customer / Company')}</th>
                    <th>{tx('Hora de inicio', 'Start time')}</th>
                    <th>{tx('Hora de fin', 'End time')}</th>
                    <th>{tx('Tiempo invertido', 'Time spent')}</th>
                    <th>{tx('Estatus', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {myIncidents.filter((i) => i.estatus === 'FINALIZADO').length === 0 && activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                      <AccessTimeOutlined sx={{ fontSize: 28, mb: 0.5, color: '#CBD5E1' }} />
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#475569' }}>
                          {tx('Aún no has concluido ninguna actividad hoy.', 'You have not completed any activities today.')}
                        </Typography>
                      </td>
                    </tr>
                  ) : (
                    (activityLogs.length > 0 ? activityLogs : myIncidents.filter((i) => i.estatus === 'FINALIZADO')).map((log, idx) => (
                      <tr key={log.id ?? idx}>
                        <td>{log.fecha || tx('Hoy', 'Today')}</td>
                        <td style={{ fontWeight: 800, color: '#173B66' }}>{log.folio}</td>
                        <td>{log.compania || log.cliente || tx('Cliente General', 'General customer')}</td>
                        <td style={{ fontWeight: 700, color: '#168A4A' }}>{log.inicio || '09:00'}</td>
                        <td style={{ fontWeight: 700, color: '#C2410C' }}>{log.fin || '10:45'}</td>
                        <td>
                          <Chip size="small" label={log.duracion || (log.duracionMinutos ? formatMinutes(log.duracionMinutos) : '1h 30m')} sx={{ fontWeight: 800, bgcolor: '#F1F5F9', color: '#003359' }} />
                        </td>
                        <td>
                          <Chip size="small" label={tx('Concluido', 'Completed')} color="success" sx={{ fontWeight: 800 }} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Box>
            </Box>
        </Paper>

        {/* =========================================================
            MODAL DE DETALLE COMPLETO Y RETROALIMENTACIÓN
            ========================================================= */}
        {selectedIncident && (
          <Dialog open={Boolean(selectedIncident)} onClose={() => setSelectedIncident(null)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 900, color: '#173B66' }}>
              {tx('Detalle del incidente', 'Incident details')} #{selectedIncident.folio}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2.5}>
                {/* 1. Datos del Cliente y Ubicación */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Paper sx={{ p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 1.5 }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B' }}>{tx('CLIENTE / COMPAÑÍA', 'CUSTOMER / COMPANY')}</Typography>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#173B66', mt: 0.3 }}>
                      {selectedIncident.compania || selectedIncident.clienteNombre || tx('ENERGIA EOLICA DEL SUR', 'SOUTHERN WIND ENERGY')}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 1.5 }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B' }}>{tx('PLAZA / UBICACIÓN EXACTA', 'BRANCH / EXACT LOCATION')}</Typography>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#173B66', mt: 0.3, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOnOutlined sx={{ fontSize: 18, color: '#1A73E8' }} /> {selectedIncident.ubicacion || selectedIncident.nombreSitio || tx('CEDIS Principal', 'Main distribution center')}
                    </Typography>
                  </Paper>
                </Box>

                {/* 2. Contacto para hablar con el cliente */}
                <Paper sx={{ p: 2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 1.5 }}>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534', mb: 1 }}>
                    {tx('CONTACTO DE SITIO', 'SITE CONTACT')}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                    <Typography sx={{ fontSize: '0.86rem', color: '#15803D', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <PhoneOutlined sx={{ fontSize: 18 }} /> {tx('Tel:', 'Phone:')} +52 81 2345 6789
                    </Typography>
                    <Typography sx={{ fontSize: '0.86rem', color: '#15803D', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <EmailOutlined sx={{ fontSize: 18 }} /> contacto@cliente.com
                    </Typography>
                  </Stack>
                </Paper>

                {/* 3. Descripción Técnica */}
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', mb: 0.5 }}>
                    {tx('DESCRIPCIÓN DEL PROBLEMA', 'ISSUE DESCRIPTION')}
                  </Typography>
                  <Paper sx={{ p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 1.5 }}>
                    <Typography sx={{ fontSize: '0.9rem', color: '#334155' }}>
                      {selectedIncident.descripcion || selectedIncident.incidente || selectedIncident.resumen}
                    </Typography>
                  </Paper>
                </Box>

                {/* 4. Campo de Retroalimentación / Solución Aplicada */}
                <TextField
                  label={tx('Retroalimentación / Solución técnica aplicada por ISM/MESA', 'ISM/Desk feedback / technical resolution')}
                  placeholder={tx('Escribe las acciones realizadas, equipo reemplazado o solución aplicada...', 'Describe the actions taken, replacement equipment, or resolution...')}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Button onClick={() => setSelectedIncident(null)} disabled={submittingStatus}>
                {tx('Cerrar', 'Close')}
              </Button>

              <Stack direction="row" spacing={1.5}>
                {selectedIncident.estatus !== 'EN ATENCION' && (
                  <Button
                    variant="outlined"
                    onClick={() => handleUpdateIncidentStatus('EN ATENCION')}
                    disabled={submittingStatus}
                    sx={{ fontWeight: 800, textTransform: 'none' }}
                  >
                    {tx('Marcar: En atención', 'Mark as in progress')}
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleUpdateIncidentStatus('FINALIZADO')}
                  disabled={submittingStatus}
                  sx={{ fontWeight: 800, textTransform: 'none', px: 2.5 }}
                >
                  {tx('Concluir servicio y liberar', 'Complete service and release')}
                </Button>
              </Stack>
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </IsmLayout>
  );
}