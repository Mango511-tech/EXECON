import {
  AccessTimeFilledOutlined,
  AccessTimeOutlined,
  AssignmentOutlined,
  CheckCircleOutlined,
  DirectionsRunOutlined,
  EmailOutlined,
  FiberManualRecord,
  LocationOnOutlined,
  LockClockOutlined,
  PhoneOutlined,
  PlayArrowOutlined,
  RestaurantOutlined,
  ScheduleOutlined,
  StopOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import IsmLayout from '../../layouts/IsmLayout';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
).replace(/\/+$/, '');

const JORNADA_MINUTOS = 9 * 60;

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

function getStatusStyle(status) {
  const clean = String(status || '').trim().toUpperCase();
  if (clean === 'PENDIENTE') return { label: 'Pendiente', background: '#FFF7ED', color: '#C2410C' };
  if (clean === 'EN ATENCION' || clean === 'ENATENCION') return { label: 'En atención', background: '#ECFDF3', color: '#168A4A' };
  if (clean === 'FINALIZADO') return { label: 'Finalizado', background: '#EAF4FF', color: '#1664A7' };
  return { label: status || 'Pendiente', background: '#F1F5F9', color: '#64748B' };
}

export default function IsmMesaDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname.replace(/\/+$/, '');

  const section =
    pathname === '/ism/turnos'
      ? 'turnos'
      : pathname === '/ism/incidentes'
        ? 'incidentes'
        : pathname === '/ism/duracion'
          ? 'duracion'
          : 'general';

  const userStored = JSON.parse(localStorage.getItem('execon_usuario') || '{}');
  const userId = userStored.id;

  // Estados de Jornada y Turno
  const [shiftState, setShiftState] = useState('INACTIVO'); // 'ACTIVO', 'COMIDA', 'INACTIVO'
  const [shiftStartTime, setShiftStartTime] = useState(null);
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

  // Contador de Jornada
  useEffect(() => {
    let interval = null;
    if (shiftState === 'ACTIVO' || shiftState === 'COMIDA') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [shiftState]);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('execon_token');
      const response = await fetch(`${API_URL}/incidentes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (response.ok && Array.isArray(result.data)) {
        setIncidents(result.data);
      }
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

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

  // Turno Handlers
  const handleStartShift = async () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setShiftStartTime(timeStr);
    setShiftState('ACTIVO');

    try {
      const token = localStorage.getItem('execon_token');
      await fetch(`${API_URL}/usuarios/${userId}/estatus-actividad`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estatus: 'mesa' }),
      }).catch(() => {});
    } catch {}

    setMessage({ severity: 'success', text: `Jornada iniciada a las ${timeStr}. Estado: Disponible en mesa.` });
  };

  const handleToggleMeal = async () => {
    const nextState = shiftState === 'ACTIVO' ? 'COMIDA' : 'ACTIVO';
    setShiftState(nextState);

    try {
      const token = localStorage.getItem('execon_token');
      await fetch(`${API_URL}/usuarios/${userId}/estatus-actividad`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estatus: nextState === 'COMIDA' ? 'comida' : 'mesa' }),
      }).catch(() => {});
    } catch {}

    setMessage({
      severity: 'info',
      text: nextState === 'COMIDA' ? 'Pausa registrada: En hora de comida.' : 'Reanudado: Disponible en mesa.',
    });
  };

  const handleEndShift = () => {
    if (window.confirm('¿Confirmas que deseas finalizar tu turno de 9 horas?')) {
      setShiftState('INACTIVO');
      setMessage({ severity: 'warning', text: 'Turno finalizado con éxito.' });
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
    const endTimeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const token = localStorage.getItem('execon_token');
      await fetch(`${API_URL}/incidentes/${selectedIncident.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          estatus: newStatus,
          fin: newStatus === 'FINALIZADO' ? endTimeStr : undefined,
          idIsmAsignado: newStatus === 'FINALIZADO' ? null : userId,
          descripcion: feedbackText ? `${selectedIncident.descripcion || selectedIncident.resumen}\n[Retroalimentación]: ${feedbackText}` : selectedIncident.descripcion,
        }),
      });

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

        // Regresar a mesa
        await fetch(`${API_URL}/usuarios/${userId}/estatus-actividad`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ estatus: 'mesa' }),
        }).catch(() => {});
      }

      setMessage({
        severity: 'success',
        text: `Incidente #${selectedIncident.folio} actualizado a: ${newStatus}`,
      });

      setSelectedIncident(null);
      loadIncidents();
    } catch {
      setMessage({ severity: 'error', text: 'No se pudo actualizar el incidente.' });
    } finally {
      setSubmittingStatus(false);
    }
  };

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const progressPercent = Math.min(100, Math.round((elapsedMinutes / JORNADA_MINUTOS) * 100));

  return (
    <IsmLayout>
      <Box sx={{ pb: 3 }}>
        {message && (
          <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        {/* =========================================================
            1. SECCIÓN: REGISTRO DE TURNO (ARRIBA)
            ========================================================= */}
        {section === 'turnos' && (
          <Paper sx={{ p: 3, border: '1px solid #E7EDF4', borderRadius: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <ScheduleOutlined sx={{ color: '#003359', fontSize: 30 }} />
              <Typography sx={{ color: '#173B66', fontSize: '1.25rem', fontWeight: 800 }}>
                Control y Registro de Turno Laboral (Meta: 9 Horas)
              </Typography>
            </Stack>
            <Typography sx={{ color: '#64748B', fontSize: '0.88rem', mb: 3 }}>
              Registra tu inicio de jornada, salidas a comida y cierre de turno reglamentario.
            </Typography>

            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Card sx={{ border: '1px solid #E2E8F0', borderRadius: 2, p: 2 }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>
                    TIEMPO TRANSCURRIDO HOY
                  </Typography>
                  <Typography sx={{ fontSize: '2.5rem', fontWeight: 900, color: '#003359', fontFamily: 'monospace', my: 1 }}>
                    {formatSeconds(elapsedSeconds)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={progressPercent}
                      sx={{ flex: 1, height: 10, borderRadius: 1, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: '#0F9D58' } }}
                    />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: '#173B66' }}>
                      {progressPercent}%
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8', mt: 1 }}>
                    {shiftStartTime ? `Jornada iniciada a las ${shiftStartTime}` : 'Turno no iniciado'}
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  {shiftState === 'INACTIVO' ? (
                    <Button
                      size="large"
                      variant="contained"
                      startIcon={<PlayArrowOutlined />}
                      onClick={handleStartShift}
                      sx={{ bgcolor: '#003359', fontWeight: 800, textTransform: 'none', py: 1.5, fontSize: '1rem' }}
                    >
                      Iniciar jornada laboral (9 hrs)
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="large"
                        variant="outlined"
                        startIcon={<RestaurantOutlined />}
                        onClick={handleToggleMeal}
                        sx={{
                          fontWeight: 800,
                          textTransform: 'none',
                          py: 1.2,
                          borderColor: shiftState === 'COMIDA' ? '#0F9D58' : '#F29900',
                          color: shiftState === 'COMIDA' ? '#0F9D58' : '#F29900',
                        }}
                      >
                        {shiftState === 'COMIDA' ? 'Regresar de comida (Reanudar en mesa)' : 'Registrar salida a comida'}
                      </Button>
                      <Button
                        size="large"
                        variant="contained"
                        color="error"
                        startIcon={<StopOutlined />}
                        onClick={handleEndShift}
                        sx={{ fontWeight: 800, textTransform: 'none', py: 1.2 }}
                      >
                        Finalizar jornada de hoy
                      </Button>
                    </>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* =========================================================
            2. SECCIÓN: VISTA GENERAL (RESUMEN OPERATIVO)
            ========================================================= */}
        {section === 'general' && (
          <>
            {/* Tarjeta de estado de turno compacta */}
            <Paper sx={{ p: 2, mb: 2.5, border: '1px solid #E7EDF4', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: shiftState === 'ACTIVO' ? '#ECFDF3' : '#F1F5F9', color: shiftState === 'ACTIVO' ? '#168A4A' : '#64748B' }}>
                  <DirectionsRunOutlined />
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 800, color: '#173B66', fontSize: '0.95rem' }}>
                    Estado actual: {shiftState === 'ACTIVO' ? 'En mesa (Disponible)' : shiftState === 'COMIDA' ? 'En comida' : 'Fuera de turno'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                    Tiempo acumulado: {formatSeconds(elapsedSeconds)} / 9 hrs
                  </Typography>
                </Box>
              </Stack>
              <Button variant="outlined" size="small" onClick={() => navigate('/ism/turnos')} sx={{ textTransform: 'none', fontWeight: 800 }}>
                Gestionar turno
              </Button>
            </Paper>

            {/* Servicio Onsite activo si existe */}
            {currentOnsite && (
              <Card sx={{ mb: 2.5, border: '2px solid #1A73E8', borderRadius: 2, bgcolor: '#F8FBFF' }}>
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                      <Chip label="ONSITE EN CURSO" color="primary" size="small" sx={{ fontWeight: 900, mb: 0.5 }} />
                      <Typography sx={{ fontSize: '1.05rem', fontWeight: 900, color: '#173B66' }}>
                        Ticket #{currentOnsite.folio} - {currentOnsite.incidente || currentOnsite.resumen}
                      </Typography>
                      <Typography sx={{ fontSize: '0.82rem', color: '#64748B', mt: 0.3 }}>
                        Ubicación: {currentOnsite.ubicacion || 'CEDIS Principal'}
                      </Typography>
                    </Box>
                    <Button variant="contained" color="success" onClick={() => handleOpenDetail(currentOnsite)} sx={{ fontWeight: 800, textTransform: 'none', px: 2.5 }}>
                      Ver detalle / Concluir
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Resumen de Mis Incidentes */}
            <Paper sx={{ border: '1px solid #E7EDF4', borderRadius: 2, p: 2.5 }}>
              <Typography sx={{ color: '#173B66', fontSize: '1.1rem', fontWeight: 800, mb: 1 }}>
                Mis incidentes asignados ({myIncidents.length})
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: '0.85rem', mb: 2 }}>
                Da clic en cualquier ticket para revisar la información del cliente y actualizar el avance.
              </Typography>

              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', '& th': { py: 1.2, px: 1.5, textAlign: 'left', bgcolor: '#F8FAFC', color: '#64748B', fontSize: '0.78rem', fontWeight: 800, borderBottom: '1px solid #E7EDF4' }, '& td': { py: 1.15, px: 1.5, color: '#334155', fontSize: '0.84rem', borderBottom: '1px solid #EEF2F6' } }}>
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Prioridad</th>
                      <th>Resumen del servicio</th>
                      <th>Ubicación</th>
                      <th>Estatus</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                          No tienes incidentes asignados actualmente.
                        </td>
                      </tr>
                    ) : (
                      myIncidents.map((inc) => (
                        <tr key={inc.id ?? inc.folio}>
                          <td style={{ fontWeight: 800, color: '#173B66' }}>{inc.folio}</td>
                          <td>
                            <Chip size="small" label={inc.prioridad || 'P3'} sx={{ fontWeight: 800, bgcolor: inc.prioridad === 'P1' ? '#FEE2E2' : '#F1F5F9' }} />
                          </td>
                          <td>{inc.incidente || inc.resumen}</td>
                          <td>{inc.ubicacion || 'CEDIS Principal'}</td>
                          <td>
                            <Chip size="small" label={inc.estatus || 'PENDIENTE'} sx={{ bgcolor: inc.estatus === 'EN ATENCION' ? '#ECFDF3' : '#FFF7ED', color: inc.estatus === 'EN ATENCION' ? '#168A4A' : '#C2410C', fontWeight: 800 }} />
                          </td>
                          <td>
                            <Button size="small" variant="outlined" startIcon={<VisibilityOutlined />} onClick={() => handleOpenDetail(inc)} sx={{ textTransform: 'none', fontWeight: 800 }}>
                              Ver detalle
                            </Button>
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

        {/* =========================================================
            3. SECCIÓN: MIS INCIDENTES (TABLA COMPLETA CON DETALLE)
            ========================================================= */}
        {section === 'incidentes' && (
          <Paper sx={{ border: '1px solid #E7EDF4', borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ color: '#173B66', fontSize: '1.2rem', fontWeight: 800, mb: 1 }}>
              Mis incidentes y cola de servicio
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.86rem', mb: 2.5 }}>
              Selecciona cualquier incidente para consultar los datos de contacto, ubicación y registrar la solución.
            </Typography>

            <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} sx={{ mb: 2, borderBottom: '1px solid #E7EDF4', '& .MuiTabs-indicator': { bgcolor: '#003359' } }}>
              <Tab label={`Mis incidentes asignados (${myIncidents.length})`} sx={{ fontWeight: 800, textTransform: 'none' }} />
              <Tab label={`Cola general de incidentes (${incidents.length})`} sx={{ fontWeight: 800, textTransform: 'none' }} />
            </Tabs>

            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', '& th': { py: 1.25, px: 2, textAlign: 'left', bgcolor: '#F8FAFC', color: '#64748B', fontSize: '0.78rem', fontWeight: 800, borderBottom: '1px solid #E7EDF4' }, '& td': { py: 1.2, px: 2, color: '#334155', fontSize: '0.84rem', borderBottom: '1px solid #EEF2F6' } }}>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Prioridad</th>
                    <th>Resumen del incidente</th>
                    <th>Cliente / Compañía</th>
                    <th>Plaza / Ubicación</th>
                    <th>Estatus</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {(tabIndex === 0 ? myIncidents : incidents).length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                        No hay incidentes disponibles en esta sección.
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
                        <td>{inc.compania || inc.clienteNombre || 'Cliente General'}</td>
                        <td>{inc.ubicacion || 'CEDIS Principal'}</td>
                        <td>
                          <Chip size="small" label={inc.estatus || 'PENDIENTE'} sx={{ bgcolor: inc.estatus === 'EN ATENCION' ? '#ECFDF3' : '#FFF7ED', color: inc.estatus === 'EN ATENCION' ? '#168A4A' : '#C2410C', fontWeight: 800 }} />
                        </td>
                        <td>
                          <Button size="small" variant="contained" onClick={() => handleOpenDetail(inc)} sx={{ textTransform: 'none', fontWeight: 800, bgcolor: '#003359' }}>
                            Abrir
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Box>
            </Box>
          </Paper>
        )}

        {/* =========================================================
            4. SECCIÓN: DURACIÓN DE ACTIVIDADES
            ========================================================= */}
        {section === 'duracion' && (
          <Paper sx={{ border: '1px solid #E7EDF4', borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ color: '#173B66', fontSize: '1.2rem', fontWeight: 800, mb: 1 }}>
              Tiempo en duración de actividades
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.86rem', mb: 2.5 }}>
              Registro cronológico de servicios atendidos: hora de inicio, finalización y lapso de tiempo invertido.
            </Typography>

            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', '& th': { py: 1.25, px: 2, textAlign: 'left', bgcolor: '#F8FAFC', color: '#64748B', fontSize: '0.78rem', fontWeight: 800, borderBottom: '1px solid #E7EDF4' }, '& td': { py: 1.2, px: 2, color: '#334155', fontSize: '0.84rem', borderBottom: '1px solid #EEF2F6' } }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Folio</th>
                    <th>Cliente / Compañía</th>
                    <th>Hora de inicio</th>
                    <th>Hora de fin</th>
                    <th>Tiempo invertido</th>
                    <th>Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {myIncidents.filter((i) => i.estatus === 'FINALIZADO').length === 0 && activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                        <AccessTimeOutlined sx={{ fontSize: 40, mb: 1, color: '#CBD5E1' }} />
                        <Typography sx={{ fontWeight: 800, color: '#475569' }}>
                          Aún no has concluido ninguna actividad hoy.
                        </Typography>
                      </td>
                    </tr>
                  ) : (
                    (activityLogs.length > 0 ? activityLogs : myIncidents.filter((i) => i.estatus === 'FINALIZADO')).map((log, idx) => (
                      <tr key={log.id ?? idx}>
                        <td>{log.fecha || 'Hoy'}</td>
                        <td style={{ fontWeight: 800, color: '#173B66' }}>{log.folio}</td>
                        <td>{log.compania || log.cliente || 'Cliente General'}</td>
                        <td style={{ fontWeight: 700, color: '#168A4A' }}>{log.inicio || '09:00'}</td>
                        <td style={{ fontWeight: 700, color: '#C2410C' }}>{log.fin || '10:45'}</td>
                        <td>
                          <Chip size="small" label={log.duracion || (log.duracionMinutos ? formatMinutes(log.duracionMinutos) : '1h 30m')} sx={{ fontWeight: 800, bgcolor: '#F1F5F9', color: '#003359' }} />
                        </td>
                        <td>
                          <Chip size="small" label="Concluido" color="success" sx={{ fontWeight: 800 }} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Box>
            </Box>
          </Paper>
        )}

        {/* =========================================================
            MODAL DE DETALLE COMPLETO Y RETROALIMENTACIÓN
            ========================================================= */}
        {selectedIncident && (
          <Dialog open={Boolean(selectedIncident)} onClose={() => setSelectedIncident(null)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 900, color: '#173B66' }}>
              Detalle del Incidente #{selectedIncident.folio}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2.5}>
                {/* 1. Datos del Cliente y Ubicación */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Paper sx={{ p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 1.5 }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B' }}>CLIENTE / COMPAÑÍA</Typography>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#173B66', mt: 0.3 }}>
                      {selectedIncident.compania || selectedIncident.clienteNombre || 'ENERGIA EOLICA DEL SUR'}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 1.5 }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B' }}>PLAZA / UBICACIÓN EXACTA</Typography>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#173B66', mt: 0.3, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOnOutlined sx={{ fontSize: 18, color: '#1A73E8' }} /> {selectedIncident.ubicacion || selectedIncident.nombreSitio || 'CEDIS Principal'}
                    </Typography>
                  </Paper>
                </Box>

                {/* 2. Contacto para hablar con el cliente */}
                <Paper sx={{ p: 2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 1.5 }}>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534', mb: 1 }}>
                    CONTACTO DE SITIO
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                    <Typography sx={{ fontSize: '0.86rem', color: '#15803D', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <PhoneOutlined sx={{ fontSize: 18 }} /> Tel: +52 81 2345 6789
                    </Typography>
                    <Typography sx={{ fontSize: '0.86rem', color: '#15803D', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <EmailOutlined sx={{ fontSize: 18 }} /> contacto@cliente.com
                    </Typography>
                  </Stack>
                </Paper>

                {/* 3. Descripción Técnica */}
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', mb: 0.5 }}>
                    DESCRIPCIÓN DEL PROBLEMA
                  </Typography>
                  <Paper sx={{ p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 1.5 }}>
                    <Typography sx={{ fontSize: '0.9rem', color: '#334155' }}>
                      {selectedIncident.descripcion || selectedIncident.incidente || selectedIncident.resumen}
                    </Typography>
                  </Paper>
                </Box>

                {/* 4. Campo de Retroalimentación / Solución Aplicada */}
                <TextField
                  label="Retroalimentación / Solución técnica aplicada por ISM/MESA"
                  placeholder="Escribe las acciones realizadas, equipo reemplazado o solución aplicada..."
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
                Cerrar
              </Button>

              <Stack direction="row" spacing={1.5}>
                {selectedIncident.estatus !== 'EN ATENCION' && (
                  <Button
                    variant="outlined"
                    onClick={() => handleUpdateIncidentStatus('EN ATENCION')}
                    disabled={submittingStatus}
                    sx={{ fontWeight: 800, textTransform: 'none' }}
                  >
                    Marcar: En atención
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleUpdateIncidentStatus('FINALIZADO')}
                  disabled={submittingStatus}
                  sx={{ fontWeight: 800, textTransform: 'none', px: 2.5 }}
                >
                  Concluir servicio y liberar
                </Button>
              </Stack>
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </IsmLayout>
  );
}