import {
  CheckCircleOutlined,
  HistoryOutlined,
  LocationOnOutlined,
  NotificationsActiveOutlined,
  PlayArrowOutlined,
  RestaurantOutlined,
  StopOutlined,
  TimerOutlined,
  WorkOutlineOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePolling from '../../hooks/usePolling';
import IsmLayout from '../../layouts/IsmLayout';
import { usePreferences } from '../../context/PreferencesContext';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
const JORNADA_MIN = 9 * 60;

const PRIORITY = {
  P1: { color: '#B91C1C', bg: '#FDECEA', es: 'Crítica', en: 'Critical' },
  P2: { color: '#C2410C', bg: '#FFF1E6', es: 'Alta', en: 'High' },
  P3: { color: '#B45309', bg: '#FEF6E0', es: 'Media', en: 'Medium' },
  P4: { color: '#1D6FB8', bg: '#EAF2FA', es: 'Baja', en: 'Low' },
  P5: { color: '#64748B', bg: '#EEF2F6', es: 'Mínima', en: 'Minimal' },
};

const STATE_UI = {
  mesa: { es: 'En mesa · Disponible', en: 'At desk · Available', color: '#1D6FB8', bg: '#EAF2FA' },
  campo: { es: 'En campo', en: 'In the field', color: '#0E9F6E', bg: '#E9F9F1' },
  comida: { es: 'En comida', en: 'At lunch', color: '#D97706', bg: '#FDF3E3' },
  sinReportar: { es: 'Jornada sin iniciar', en: 'Shift not started', color: '#64748B', bg: '#EEF2F6' },
};

const cardSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 3,
  boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(10,37,64,.12)',
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
  if (!response.ok) throw new Error(result.message || failureMessage);
}

const pad = (n) => String(n).padStart(2, '0');

function formatClock(totalSecs) {
  const s = Math.max(0, Math.floor(totalSecs));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function formatMinutes(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function incidentStartMs(inc) {
  if (!inc?.fecha || !inc?.inicio) return null;
  const ms = new Date(`${inc.fecha}T${inc.inicio}:00`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function readHistory(key) {
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const norm = (s) => String(s || '').toUpperCase().replace(/[\s_-]+/g, '');

function PriorityChip({ value, isEnglish }) {
  const p = PRIORITY[value] || PRIORITY.P3;
  return (
    <Chip
      size="small"
      label={`${value || 'P3'} · ${isEnglish ? p.en : p.es}`}
      sx={{ bgcolor: p.bg, color: p.color, fontWeight: 700, borderRadius: 1.5 }}
    />
  );
}

function Info({ label, value }) {
  return (
    <Box>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }}>{value || '—'}</Typography>
    </Box>
  );
}

function Kpi({ icon, color, value, label }) {
  return (
    <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: '#F7F9FC' }}>
      <Box sx={{ color, display: 'flex', '& svg': { fontSize: 18 } }}>{icon}</Box>
      <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2, mt: 0.5 }}>{value}</Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>{label}</Typography>
    </Box>
  );
}

export default function IsmMesaDashboardPage() {
  const { preferences } = usePreferences();
  const isEnglish = preferences.idioma === 'en-US';
  const tx = useCallback((es, en) => (isEnglish ? en : es), [isEnglish]);

  const user = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('execon_usuario') || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch {
      return {};
    }
  }, []);
  const userId = user.id;
  const firstName = String(user.nombreCompleto || user.nombre || '').trim().split(' ')[0];
  const startKey = `execon_jornada_inicio_${userId}`;
  const historyKey = `execon_historial_${userId}_${localDateKey()}`;

  const [shiftState, setShiftState] = useState('INACTIVO');
  const [shiftStartMs, setShiftStartMs] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [incidents, setIncidents] = useState([]);
  const [history, setHistory] = useState(() => readHistory(historyKey));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [newAssignment, setNewAssignment] = useState(null);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const knownIds = useRef(null);

  // Reloj
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadIncidents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('execon_token');
      const response = await fetch(`${API_URL}/incidentes`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data)) {
        throw new Error(result.message || tx('No fue posible cargar los incidentes.', 'Could not load incidents.'));
      }
      setIncidents(result.data);
    } catch (error) {
      if (!silent) setMessage({ severity: 'error', text: error.message });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tx]);

  const loadOwnStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const token = localStorage.getItem('execon_token');
      const response = await fetch(`${API_URL}/ingenieros`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(result.data)) return;
      const me = result.data.find((e) => Number(e.id) === Number(userId));
      const saved = String(me?.estatus || '').toLowerCase();
      if (saved === 'mesa' || saved === 'campo' || saved === 'comida') {
        setShiftState(saved === 'comida' ? 'COMIDA' : 'ACTIVO');
        let start = Number(localStorage.getItem(startKey));
        if (!start) {
          start = me?.actualizadoEn ? new Date(me.actualizadoEn).getTime() : Date.now();
          localStorage.setItem(startKey, String(start));
        }
        setShiftStartMs(start);
      } else {
        setShiftState('INACTIVO');
        setShiftStartMs(null);
        localStorage.removeItem(startKey);
      }
    } catch {
      /* sin conexión: se conserva el estado local */
    }
  }, [userId, startKey]);

  useEffect(() => {
    loadIncidents();
    loadOwnStatus();
  }, [loadIncidents, loadOwnStatus]);

  usePolling(
    useCallback(() => {
      loadIncidents(true);
      loadOwnStatus();
    }, [loadIncidents, loadOwnStatus]),
    8000,
  );

  const mine = useMemo(
    () => incidents.filter((inc) => Number(inc.idIsmMesa) === Number(userId)),
    [incidents, userId],
  );
  const current = useMemo(() => mine.find((i) => norm(i.estatus) === 'ENATENCION'), [mine]);
  const queue = useMemo(
    () =>
      mine
        .filter((i) => norm(i.estatus) === 'PENDIENTE')
        .sort((a, b) => String(a.prioridad).localeCompare(String(b.prioridad)) || a.id - b.id),
    [mine],
  );

  // Aviso de nuevas asignaciones
  useEffect(() => {
    const ids = new Set(mine.map((i) => i.id));
    if (knownIds.current) {
      const fresh = mine.filter((i) => !knownIds.current.has(i.id) && norm(i.estatus) === 'PENDIENTE');
      if (fresh.length) setNewAssignment(fresh[0]);
    }
    knownIds.current = ids;
  }, [mine]);

  const ownState = current ? 'campo' : shiftState === 'ACTIVO' ? 'mesa' : shiftState === 'COMIDA' ? 'comida' : 'sinReportar';
  const stateUi = STATE_UI[ownState];

  const elapsedSec = shiftStartMs ? Math.max(0, Math.floor((nowMs - shiftStartMs) / 1000)) : 0;
  const progress = Math.min(100, Math.round((elapsedSec / 60 / JORNADA_MIN) * 100));
  const remainingMin = Math.max(0, JORNADA_MIN - Math.floor(elapsedSec / 60));
  const currentStart = incidentStartMs(current);
  const onsiteSec = currentStart ? Math.max(0, Math.floor((nowMs - currentStart) / 1000)) : 0;
  const fieldMinutesToday = history.reduce((sum, h) => sum + (Number(h.minutos) || 0), 0);

  const saveHistory = (entry) => {
    const next = [entry, ...history];
    setHistory(next);
    localStorage.setItem(historyKey, JSON.stringify(next));
  };

  const errNoSession = tx('No se encontró una sesión válida para actualizar el estado.', 'A valid session is required to update your status.');

  const startShift = async () => {
    try {
      await updateActivityStatus(userId, 'mesa', errNoSession);
    } catch (e) {
      setMessage({ severity: 'error', text: e.message });
      return;
    }
    const now = Date.now();
    localStorage.setItem(startKey, String(now));
    setShiftStartMs(now);
    setShiftState('ACTIVO');
    setMessage({ severity: 'success', text: tx('Jornada iniciada. Ya apareces disponible en mesa.', 'Shift started. You now show as available at the desk.') });
  };

  const toggleMeal = async () => {
    const next = shiftState === 'ACTIVO' ? 'COMIDA' : 'ACTIVO';
    try {
      await updateActivityStatus(userId, next === 'COMIDA' ? 'comida' : 'mesa', errNoSession);
    } catch (e) {
      setMessage({ severity: 'error', text: e.message });
      return;
    }
    setShiftState(next);
  };

  const endShift = async () => {
    if (!window.confirm(tx('¿Confirmas que deseas finalizar tu jornada?', 'Do you want to end your shift?'))) return;
    try {
      await updateActivityStatus(userId, 'sin_reportar', tx('No se pudo registrar el fin de la jornada.', 'Could not record the end of your shift.'));
    } catch (e) {
      setMessage({ severity: 'error', text: e.message });
      return;
    }
    localStorage.removeItem(startKey);
    setShiftState('INACTIVO');
    setShiftStartMs(null);
    setMessage({ severity: 'info', text: tx('Jornada finalizada.', 'Shift ended.') });
  };

  const updateIncident = async (inc, newStatus, text) => {
    setBusy(true);
    const endStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    try {
      const token = localStorage.getItem('execon_token');
      const base = inc.descripcion || inc.resumen || '';
      const response = await fetch(`${API_URL}/incidentes/${inc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          estatus: newStatus,
          fin: newStatus === 'FINALIZADO' ? endStr : undefined,
          idIsmAsignado: newStatus === 'FINALIZADO' ? null : userId,
          descripcion: text ? `${base}\n[Retroalimentación]: ${text}` : inc.descripcion,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || tx('No se pudo actualizar el incidente.', 'Could not update the incident.'));

      if (newStatus === 'FINALIZADO') {
        const start = incidentStartMs(inc);
        saveHistory({
          id: inc.id,
          folio: inc.folio,
          resumen: inc.incidente || inc.resumen,
          cliente: inc.compania,
          ubicacion: inc.ubicacion,
          inicio: inc.inicio,
          fin: endStr,
          minutos: start ? Math.max(1, Math.round((Date.now() - start) / 60000)) : 0,
        });
        setFeedback('');
        setShiftState((prev) => (prev === 'INACTIVO' ? 'ACTIVO' : prev));
      }
      setMessage({
        severity: 'success',
        text: newStatus === 'FINALIZADO'
          ? tx(`Onsite ${inc.folio} concluido. Vuelves a estar disponible.`, `Onsite ${inc.folio} completed. You are available again.`)
          : tx(`Atención de ${inc.folio} iniciada.`, `Attention to ${inc.folio} started.`),
      });
      setSelected(null);
      setNewAssignment(null);
      loadIncidents(true);
    } catch (e) {
      setMessage({ severity: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const canStartIncident = shiftState === 'ACTIVO' && !current;
  const startBlockedReason = current
    ? tx('Ya tienes un onsite en curso', 'You already have an onsite in progress')
    : shiftState === 'COMIDA'
      ? tx('Termina tu comida primero', 'Finish your break first')
      : tx('Inicia tu jornada primero', 'Start your shift first');

  const startTime = shiftStartMs
    ? new Date(shiftStartMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <IsmLayout>
      <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
        {message && (
          <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2, borderRadius: 2 }}>
            {message.text}
          </Alert>
        )}

        {newAssignment && (
          <Alert
            icon={<NotificationsActiveOutlined />}
            severity="warning"
            sx={{ mb: 2, borderRadius: 2, alignItems: 'center' }}
            onClose={() => setNewAssignment(null)}
            action={
              <Button color="inherit" size="small" onClick={() => { setSelected(newAssignment); setFeedback(''); }}>
                {tx('Ver', 'View')}
              </Button>
            }
          >
            {tx('Te asignaron un nuevo onsite:', 'You were assigned a new onsite:')} <b>{newAssignment.folio}</b> · {newAssignment.ubicacion}
          </Alert>
        )}

        {/* Cabecera de jornada */}
        <Paper
          sx={{
            ...cardSx,
            p: { xs: 2.25, md: 3 },
            mb: 2.5,
            color: '#fff',
            border: 'none',
            background: 'linear-gradient(135deg, #003359 0%, #145A86 100%)',
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 220 }}>
              <Typography sx={{ opacity: 0.8, fontSize: '0.85rem' }}>
                {tx('Hola', 'Hello')}{firstName ? `, ${firstName}` : ''}
              </Typography>
              <Chip
                icon={ownState === 'campo' ? <LocationOnOutlined /> : ownState === 'comida' ? <RestaurantOutlined /> : <WorkOutlineOutlined />}
                label={isEnglish ? stateUi.en : stateUi.es}
                sx={{ mt: 0.75, bgcolor: stateUi.bg, color: stateUi.color, fontWeight: 700, '& .MuiChip-icon': { color: stateUi.color } }}
              />
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: { xs: '2.2rem', md: '2.8rem' }, fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {formatClock(elapsedSec)}
              </Typography>
              <Typography sx={{ opacity: 0.75, fontSize: '0.8rem', mt: 0.5 }}>
                {shiftStartMs
                  ? tx(`Inicio ${startTime} · faltan ${formatMinutes(remainingMin)}`, `Started ${startTime} · ${formatMinutes(remainingMin)} left`)
                  : tx('Aún no inicias tu jornada de 9 h', 'Your 9 h shift has not started')}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {shiftState === 'INACTIVO' ? (
                <Button size="large" variant="contained" color="secondary" startIcon={<PlayArrowOutlined />} onClick={startShift} sx={{ fontWeight: 700 }}>
                  {tx('Iniciar jornada', 'Start shift')}
                </Button>
              ) : (
                <>
                  <Tooltip title={current ? tx('No puedes pausar con un onsite en curso', 'You cannot pause during an onsite') : ''}>
                    <span>
                      <Button
                        variant="contained"
                        disabled={Boolean(current)}
                        startIcon={<RestaurantOutlined />}
                        onClick={toggleMeal}
                        sx={{ bgcolor: '#fff', color: '#003359', '&:hover': { bgcolor: '#E8EEF4' } }}
                      >
                        {shiftState === 'COMIDA' ? tx('Terminar comida', 'End break') : tx('Salir a comer', 'Lunch break')}
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title={current ? tx('Concluye tu onsite antes de salir', 'Complete your onsite before leaving') : ''}>
                    <span>
                      <Button
                        variant="outlined"
                        disabled={Boolean(current)}
                        startIcon={<StopOutlined />}
                        onClick={endShift}
                        sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)', '&:hover': { borderColor: '#fff' } }}
                      >
                        {tx('Finalizar jornada', 'End shift')}
                      </Button>
                    </span>
                  </Tooltip>
                </>
              )}
            </Stack>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mt: 2.5, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,.2)', '& .MuiLinearProgress-bar': { bgcolor: '#8CC63F' } }}
          />
        </Paper>

        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' }, alignItems: 'start' }}>
          <Stack spacing={2.5}>
            {current ? (
              <Paper sx={{ ...cardSx, p: 3, borderColor: '#0E9F6E', borderWidth: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={tx('ONSITE EN CURSO', 'ONSITE IN PROGRESS')} sx={{ bgcolor: '#E9F9F1', color: '#0E9F6E', fontWeight: 800 }} />
                      <PriorityChip value={current.prioridad} isEnglish={isEnglish} />
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600 }}>{current.folio}</Typography>
                    </Stack>
                    <Typography variant="h5" sx={{ mt: 1.25 }}>{current.incidente}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontSize: '1.9rem', fontWeight: 700, color: '#0E9F6E', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {formatClock(onsiteSec)}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{tx('tiempo en sitio', 'time on site')}</Typography>
                  </Box>
                </Stack>

                <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mt: 2.5 }}>
                  <Info label={tx('Cliente', 'Client')} value={current.compania} />
                  <Info label={tx('Ubicación', 'Location')} value={current.ubicacion} />
                  <Info label={tx('Asignado por', 'Assigned by')} value={current.asignadoPor} />
                </Box>

                {current.descripcion && (
                  <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                    {current.descripcion}
                  </Typography>
                )}

                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  sx={{ mt: 2.5 }}
                  label={tx('Retroalimentación / solución aplicada', 'Feedback / solution applied')}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  color="success"
                  disabled={busy || feedback.trim().length < 5}
                  startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <CheckCircleOutlined />}
                  onClick={() => updateIncident(current, 'FINALIZADO', feedback.trim())}
                  sx={{ mt: 1.5, fontWeight: 700 }}
                >
                  {tx('Concluir onsite', 'Complete onsite')}
                </Button>
                {feedback.trim().length < 5 && (
                  <Typography sx={{ mt: 0.75, fontSize: '0.75rem', color: 'text.secondary', textAlign: 'center' }}>
                    {tx('Escribe qué se hizo para poder concluir.', 'Describe what was done to complete it.')}
                  </Typography>
                )}
              </Paper>
            ) : (
              <Paper sx={{ ...cardSx, p: 3.5, textAlign: 'center', bgcolor: '#FAFCFE' }}>
                <Box sx={{ width: 56, height: 56, mx: 'auto', mb: 1.5, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: stateUi.bg, color: stateUi.color }}>
                  <WorkOutlineOutlined />
                </Box>
                <Typography variant="h6" sx={{ color: '#003359', fontWeight: 700 }}>
                  {shiftState === 'INACTIVO'
                    ? tx('Inicia tu jornada para recibir onsites', 'Start your shift to receive onsites')
                    : shiftState === 'COMIDA'
                      ? tx('Estás en tu pausa de comida', 'You are on your lunch break')
                      : queue.length
                        ? tx('Tienes onsites esperando', 'You have onsites waiting')
                        : tx('Disponible · esperando asignación', 'Available · waiting for assignment')}
                </Typography>
                <Typography sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.9rem' }}>
                  {queue.length
                    ? tx(`Tienes ${queue.length} en cola. Elige uno para comenzar.`, `You have ${queue.length} in queue. Pick one to start.`)
                    : tx('Esta pantalla se actualiza sola cuando el distribuidor te asigne uno.', 'This screen updates automatically when the dispatcher assigns one.')}
                </Typography>
              </Paper>
            )}

            <Paper sx={{ ...cardSx, p: { xs: 2, md: 2.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#003359' }}>
                  {tx('Mi cola de onsites', 'My onsite queue')}
                </Typography>
                <Chip size="small" label={queue.length} sx={{ fontWeight: 700 }} />
              </Stack>

              {loading ? (
                <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={26} /></Box>
              ) : queue.length === 0 ? (
                <Typography sx={{ color: 'text.secondary', py: 2, fontSize: '0.9rem' }}>
                  {tx('No tienes onsites pendientes.', 'You have no pending onsites.')}
                </Typography>
              ) : (
                <Stack spacing={1.25}>
                  {queue.map((inc) => {
                    const p = PRIORITY[inc.prioridad] || PRIORITY.P3;
                    return (
                      <Box
                        key={inc.id}
                        sx={{
                          display: 'flex',
                          gap: 1.5,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          p: 1.5,
                          borderRadius: 2.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderLeft: `5px solid ${p.color}`,
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 220, cursor: 'pointer' }} onClick={() => { setSelected(inc); setFeedback(''); }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <PriorityChip value={inc.prioridad} isEnglish={isEnglish} />
                            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 600 }}>{inc.folio}</Typography>
                          </Stack>
                          <Typography sx={{ fontWeight: 600, mt: 0.5 }}>{inc.incidente}</Typography>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                            {inc.compania} · {inc.ubicacion}
                          </Typography>
                        </Box>
                        <Button size="small" variant="text" onClick={() => { setSelected(inc); setFeedback(''); }}>
                          {tx('Detalle', 'Details')}
                        </Button>
                        <Tooltip title={canStartIncident ? '' : startBlockedReason}>
                          <span>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={!canStartIncident || busy}
                              startIcon={<PlayArrowOutlined />}
                              onClick={() => updateIncident(inc, 'EN ATENCION', '')}
                            >
                              {tx('Iniciar', 'Start')}
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Paper>
          </Stack>

          <Stack spacing={2.5}>
            <Paper sx={{ ...cardSx, p: 2.25 }}>
              <Typography sx={{ fontWeight: 700, color: '#003359', mb: 1.5 }}>{tx('Mi día', 'My day')}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
                <Kpi icon={<CheckCircleOutlined />} color="#0E9F6E" value={history.length} label={tx('Concluidos', 'Completed')} />
                <Kpi icon={<WorkOutlineOutlined />} color="#D97706" value={queue.length} label={tx('En cola', 'Queued')} />
                <Kpi icon={<TimerOutlined />} color="#1D6FB8" value={formatMinutes(fieldMinutesToday)} label={tx('En campo', 'In field')} />
                <Kpi icon={<HistoryOutlined />} color="#6D5BB8" value={`${progress}%`} label={tx('Jornada', 'Shift')} />
              </Box>
            </Paper>

            <Paper sx={{ ...cardSx, p: 2.25 }}>
              <Typography sx={{ fontWeight: 700, color: '#003359', mb: 1.5 }}>{tx('Historial de hoy', "Today's history")}</Typography>
              {history.length === 0 ? (
                <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                  {tx('Aquí verás los onsites que concluyas hoy.', "You'll see the onsites you complete today here.")}
                </Typography>
              ) : (
                <Stack spacing={1.25}>
                  {history.map((h) => (
                    <Box key={h.id} sx={{ pl: 1.5, borderLeft: '3px solid #8CC63F' }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{h.folio} · {h.resumen}</Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {h.cliente} · {h.inicio}–{h.fin} · {formatMinutes(h.minutos)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        </Box>
      </Box>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        {selected && (
          <>
            <DialogTitle>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <PriorityChip value={selected.prioridad} isEnglish={isEnglish} />
                <span>{selected.folio}</span>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{selected.incidente}</Typography>
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: '1fr 1fr', mb: 2 }}>
                <Info label={tx('Cliente', 'Client')} value={selected.compania} />
                <Info label={tx('Ubicación', 'Location')} value={selected.ubicacion} />
                <Info label={tx('Asignado por', 'Assigned by')} value={selected.asignadoPor} />
                <Info label={tx('Registrado', 'Logged')} value={`${selected.fecha} ${selected.inicio}`} />
              </Box>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                {selected.descripcion || selected.resumen || tx('Sin descripción.', 'No description.')}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setSelected(null)}>{tx('Cerrar', 'Close')}</Button>
              {norm(selected.estatus) === 'PENDIENTE' && (
                <Tooltip title={canStartIncident ? '' : startBlockedReason}>
                  <span>
                    <Button
                      variant="contained"
                      disabled={!canStartIncident || busy}
                      startIcon={<PlayArrowOutlined />}
                      onClick={() => updateIncident(selected, 'EN ATENCION', '')}
                    >
                      {tx('Iniciar atención', 'Start attention')}
                    </Button>
                  </span>
                </Tooltip>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </IsmLayout>
  );
}
