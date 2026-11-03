import {
  CalendarMonthOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  EventAvailableOutlined,
  EventBusyOutlined,
  InfoOutlined,
  WorkOutlineOutlined,
} from '@mui/icons-material';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import dayjs from 'dayjs';
import 'dayjs/locale/es-mx';
import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardLayout from '../layouts/DashboardLayout';

dayjs.locale('es-mx');

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const EMPTY_FORM = {
  agente: '',
  tipo: 'VACACIONES',
  fechaInicio: '',
  fechaFin: '',
  comentario: '',
};

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function PlanningPage() {
  const [agents, setAgents] = useState([]);
  const [planningEvents, setPlanningEvents] = useState([]);
  const [periodSummaryRows, setPeriodSummaryRows] = useState([]);

  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingPlanning, setLoadingPlanning] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [savingPlanning, setSavingPlanning] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [calendarDate, setCalendarDate] = useState(dayjs());
  const [periodStart, setPeriodStart] = useState(
    dayjs().startOf('month').format('YYYY-MM-DD'),
  );
  const [periodEnd, setPeriodEnd] = useState(
    dayjs().endOf('month').format('YYYY-MM-DD'),
  );
  const [message, setMessage] = useState(null);

  const calendarMonthStart = useMemo(
    () => calendarDate.startOf('month').format('YYYY-MM-DD'),
    [calendarDate],
  );

  const calendarMonthEnd = useMemo(
    () => calendarDate.endOf('month').format('YYYY-MM-DD'),
    [calendarDate],
  );

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);

    try {
      const response = await fetch(`${API_URL}/ingenieros`);
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || 'No fue posible cargar los ISM/MESA.');
      }

      setAgents(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setAgents([]);
      setMessage({
        severity: 'error',
        text: error.message || 'No fue posible cargar los ISM/MESA.',
      });
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  const loadPlanningEvents = useCallback(async () => {
    setLoadingPlanning(true);

    try {
      const searchParams = new URLSearchParams({
        inicio: calendarMonthStart,
        fin: calendarMonthEnd,
      });

      const response = await fetch(
        `${API_URL}/planeacion?${searchParams.toString()}`,
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || 'No fue posible cargar los registros de planeación.',
        );
      }

      setPlanningEvents(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setPlanningEvents([]);
      setMessage({
        severity: 'error',
        text: error.message || 'No fue posible cargar los registros de planeación.',
      });
    } finally {
      setLoadingPlanning(false);
    }
  }, [calendarMonthStart, calendarMonthEnd]);

  const loadPeriodSummary = useCallback(async () => {
    if (!periodStart || !periodEnd || periodEnd < periodStart) {
      setPeriodSummaryRows([]);
      setLoadingSummary(false);
      return;
    }

    setLoadingSummary(true);

    try {
      const searchParams = new URLSearchParams({
        inicio: periodStart,
        fin: periodEnd,
      });

      const response = await fetch(
        `${API_URL}/planeacion/resumen?${searchParams.toString()}`,
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || 'No fue posible obtener el resumen de planeación.',
        );
      }

      setPeriodSummaryRows(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setPeriodSummaryRows([]);
      setMessage({
        severity: 'error',
        text: error.message || 'No fue posible obtener el resumen de planeación.',
      });
    } finally {
      setLoadingSummary(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    loadPlanningEvents();
  }, [loadPlanningEvents]);

  useEffect(() => {
    loadPeriodSummary();
  }, [loadPeriodSummary]);

  const calendarDays = useMemo(() => {
    const firstDay = calendarDate.startOf('month');
    const daysInMonth = calendarDate.daysInMonth();

    return Array.from({ length: daysInMonth }, (_, index) => {
      return firstDay.add(index, 'day');
    });
  }, [calendarDate]);

  const summary = useMemo(() => {
    const today = dayjs().startOf('day');
    const weekEnd = today.endOf('week');
    const monthStart = calendarDate.startOf('month');
    const monthEnd = calendarDate.endOf('month');

    const projectsThisWeek = planningEvents.filter((event) => {
      if (event.tipo !== 'PROYECTO') return false;
      const start = dayjs(event.fechaInicio);
      const end = dayjs(event.fechaFin);
      return (
        start.isBefore(weekEnd.add(1, 'day')) &&
        end.isAfter(today.subtract(1, 'day'))
      );
    }).length;

    const vacationsThisMonth = planningEvents.filter((event) => {
      if (event.tipo !== 'VACACIONES') return false;
      const start = dayjs(event.fechaInicio);
      const end = dayjs(event.fechaFin);
      return (
        start.isBefore(monthEnd.add(1, 'day')) &&
        end.isAfter(monthStart.subtract(1, 'day'))
      );
    }).length;

    const totalDaysOut = planningEvents.reduce((total, event) => {
      const start = dayjs(event.fechaInicio);
      const end = dayjs(event.fechaFin);
      const visibleStart = start.isBefore(monthStart) ? monthStart : start;
      const visibleEnd = end.isAfter(monthEnd) ? monthEnd : end;
      const days = visibleEnd.diff(visibleStart, 'day') + 1;
      return total + Math.max(0, days);
    }, 0);

    return {
      projectsThisWeek,
      vacationsThisMonth,
      totalDaysOut,
    };
  }, [planningEvents, calendarDate]);

  const handleFormChange = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleSavePlanning = async (event) => {
    event.preventDefault();

    if (loadingAgents) {
      setMessage({
        severity: 'info',
        text: 'Espera un momento mientras se cargan los ISM/MESA.',
      });
      return;
    }

    if (!form.agente || !form.tipo || !form.fechaInicio || !form.fechaFin) {
      setMessage({
        severity: 'error',
        text: 'Completa ISM/MESA, tipo, fecha de inicio y fecha de fin.',
      });
      return;
    }

    if (form.fechaFin < form.fechaInicio) {
      setMessage({
        severity: 'error',
        text: 'La fecha de fin no puede ser anterior a la fecha de inicio.',
      });
      return;
    }

    setSavingPlanning(true);

    try {
      const response = await fetch(`${API_URL}/planeacion`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agenteId: Number(form.agente),
          tipo: form.tipo,
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          comentario: form.comentario.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || 'No fue posible guardar el registro de planeación.',
        );
      }

      setForm(EMPTY_FORM);
      setMessage({
        severity: 'success',
        text: result.message || 'Planeación registrada correctamente.',
      });

      await Promise.all([loadPlanningEvents(), loadPeriodSummary()]);
    } catch (error) {
      setMessage({
        severity: 'error',
        text: error.message || 'No fue posible guardar el registro de planeación.',
      });
    } finally {
      setSavingPlanning(false);
    }
  };

  const changeCalendarMonth = (direction) => {
    setCalendarDate((currentDate) => {
      if (direction === 'PREV') {
        return currentDate.subtract(1, 'month');
      }
      return currentDate.add(1, 'month');
    });
  };

  const resetToToday = () => {
    setCalendarDate(dayjs());
  };

  const handleApplyPeriod = async () => {
    if (!periodStart || !periodEnd || periodEnd < periodStart) {
      setMessage({
        severity: 'error',
        text: 'Selecciona un periodo válido para consultar el resumen.',
      });
      return;
    }

    await loadPeriodSummary();
    setMessage({
      severity: 'info',
      text: 'El resumen se actualizó con el periodo seleccionado.',
    });
  };

  const handleExport = async () => {
    if (!periodStart || !periodEnd || periodEnd < periodStart) {
      setMessage({
        severity: 'error',
        text: 'Selecciona un periodo válido antes de exportar.',
      });
      return;
    }

    setExporting(true);

    try {
      const searchParams = new URLSearchParams({
        inicio: periodStart,
        fin: periodEnd,
      });

      const response = await fetch(
        `${API_URL}/planeacion/exportar?${searchParams.toString()}`,
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || 'No fue posible exportar a Excel.');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);
      const filename =
        filenameMatch?.[1] || `planeacion_${periodStart}_${periodEnd}.xlsx`;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setMessage({
        severity: 'success',
        text: 'El archivo de Excel se descargó correctamente.',
      });
    } catch (error) {
      setMessage({
        severity: 'error',
        text: error.message || 'No fue posible exportar la planeación a Excel.',
      });
    } finally {
      setExporting(false);
    }
  };

  const getEventPosition = (planningEvent) => {
    const monthStart = calendarDate.startOf('month');
    const monthEnd = calendarDate.endOf('month');
    const eventStart = dayjs(planningEvent.fechaInicio);
    const eventEnd = dayjs(planningEvent.fechaFin);

    const visibleStart = eventStart.isBefore(monthStart)
      ? monthStart
      : eventStart;
    const visibleEnd = eventEnd.isAfter(monthEnd) ? monthEnd : eventEnd;

    const startIndex = visibleStart.diff(monthStart, 'day');
    const duration = visibleEnd.diff(visibleStart, 'day') + 1;

    return {
      startIndex,
      duration,
    };
  };

  return (
    <DashboardLayout>
      <Box sx={{ pb: 3 }}>
        {/* TARJETAS SUPERIORES */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <PlanningMetricCard
            icon={<WorkOutlineOutlined />}
            label="En proyecto esta semana"
            value={summary.projectsThisWeek}
            color="#168A4A"
            background="#ECFDF3"
          />

          <PlanningMetricCard
            icon={<EventBusyOutlined />}
            label="En vacaciones este mes"
            value={summary.vacationsThisMonth}
            color="#1674B7"
            background="#EAF4FF"
          />

          <PlanningMetricCard
            icon={<CalendarMonthOutlined />}
            label="Total días fuera"
            value={summary.totalDaysOut}
            color="#6A45B5"
            background="#F3EEFF"
          />
        </Box>

        {/* FORMULARIO */}
        <Paper
          component="form"
          onSubmit={handleSavePlanning}
          sx={{
            p: 2.25,
            mb: 1.5,
            border: '1px solid #E7EDF4',
            borderRadius: 1.5,
          }}
        >
          <Typography
            sx={{
              mb: 1.75,
              color: '#173B66',
              fontSize: '1.1rem',
              fontWeight: 800,
            }}
          >
            Registro de vacaciones y proyectos
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(220px, 0.9fr) minmax(280px, 1.1fr) minmax(280px, 1fr)',
              },
              gap: 1.5,
              alignItems: 'end',
            }}
          >
            <FormControl
              fullWidth
              size="small"
              disabled={loadingAgents || savingPlanning}
            >
              <InputLabel id="planning-agent-label">ISM/MESA</InputLabel>
              <Select
                labelId="planning-agent-label"
                value={form.agente}
                label="ISM/MESA"
                onChange={(event) =>
                  handleFormChange('agente', event.target.value)
                }
                sx={{
                  minHeight: 48,
                  fontSize: '0.9rem',
                }}
              >
                {loadingAgents ? (
                  <MenuItem value="" disabled>
                    Cargando ISM/MESA...
                  </MenuItem>
                ) : agents.length === 0 ? (
                  <MenuItem value="" disabled>
                    No hay ISM/MESA disponibles
                  </MenuItem>
                ) : (
                  agents.map((agent) => (
                    <MenuItem
                      key={agent.id}
                      value={String(agent.id)}
                      sx={{ fontSize: '0.9rem' }}
                    >
                      {agent.nombre}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl
              component="fieldset"
              disabled={savingPlanning}
              sx={{ px: 0.5 }}
            >
              <Typography
                sx={{
                  mb: 0.7,
                  color: '#475569',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                }}
              >
                Tipo
              </Typography>
              <RadioGroup
                row
                value={form.tipo}
                onChange={(event) =>
                  handleFormChange('tipo', event.target.value)
                }
                sx={{
                  minHeight: 48,
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'nowrap',
                  gap: 1,
                }}
              >
                <FormControlLabel
                  value="VACACIONES"
                  control={<Radio size="small" />}
                  label="Vacaciones"
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': {
                      color: '#475569',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                    },
                  }}
                />
                <FormControlLabel
                  value="PROYECTO"
                  control={<Radio size="small" />}
                  label="En proyecto"
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': {
                      color: '#475569',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                    },
                  }}
                />
              </RadioGroup>
            </FormControl>

            <TextField
              label="Comentario"
              placeholder="Escribe un comentario opcional"
              value={form.comentario}
              onChange={(event) =>
                handleFormChange('comentario', event.target.value)
              }
              fullWidth
              size="small"
              disabled={savingPlanning}
              sx={{
                '& .MuiOutlinedInput-root': {
                  minHeight: 48,
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.9rem',
                },
              }}
            />
          </Box>

          <Box
            sx={{
              mt: 1.6,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'minmax(260px, 1fr) minmax(260px, 1fr) auto',
              },
              gap: 1.5,
              alignItems: 'end',
            }}
          >
            <DateField
              label="Fecha inicio"
              value={form.fechaInicio}
              disabled={savingPlanning}
              onChange={(value) => handleFormChange('fechaInicio', value)}
            />

            <DateField
              label="Fecha fin"
              value={form.fechaFin}
              disabled={savingPlanning}
              onChange={(value) => handleFormChange('fechaFin', value)}
            />

            <Button
              type="submit"
              variant="contained"
              startIcon={
                savingPlanning ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <EventAvailableOutlined />
                )
              }
              disabled={loadingAgents || savingPlanning}
              sx={{
                minHeight: 48,
                minWidth: 210,
                px: 2.25,
                bgcolor: '#003359',
                textTransform: 'none',
                fontSize: '0.9rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: '#002642',
                },
              }}
            >
              {savingPlanning ? 'Guardando...' : 'Guardar registro'}
            </Button>
          </Box>
        </Paper>

        {message && (
          <Alert
            severity={message.severity}
            onClose={() => setMessage(null)}
            sx={{ mb: 1.5, fontSize: '0.9rem' }}
          >
            {message.text}
          </Alert>
        )}

        {/* CALENDARIO */}
        <Paper
          sx={{
            mb: 1.5,
            border: '1px solid #E7EDF4',
            borderRadius: 1.5,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.4,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              gap: 1.25,
              borderBottom: '1px solid #E7EDF4',
            }}
          >
            <Typography
              sx={{
                color: '#173B66',
                fontSize: '1.1rem',
                fontWeight: 800,
              }}
            >
              Calendario de disponibilidad
            </Typography>

            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              justifyContent={{ xs: 'space-between', md: 'flex-end' }}
            >
              <LegendItem color="#EAF7EF" label="Disponible" />
              <LegendItem color="#1A73E8" label="Vacaciones" />
              <LegendItem color="#F6AA61" label="Proyecto" />
            </Stack>
          </Box>

          <Box sx={{ p: 2 }}>
            <Stack
              direction="row"
              spacing={0.9}
              alignItems="center"
              sx={{ mb: 1.25 }}
            >
              <Button
                size="small"
                disabled={loadingPlanning}
                onClick={() => changeCalendarMonth('PREV')}
                sx={{
                  minWidth: 36,
                  minHeight: 38,
                  color: '#64748B',
                  fontSize: '1rem',
                  textTransform: 'none',
                }}
              >
                ‹
              </Button>

              <Typography
                sx={{
                  minWidth: 170,
                  color: '#334155',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  textTransform: 'capitalize',
                  textAlign: 'center',
                }}
              >
                {MONTHS[calendarDate.month()]} {calendarDate.year()}
              </Typography>

              <Button
                size="small"
                disabled={loadingPlanning}
                onClick={() => changeCalendarMonth('NEXT')}
                sx={{
                  minWidth: 36,
                  minHeight: 38,
                  color: '#64748B',
                  fontSize: '1rem',
                  textTransform: 'none',
                }}
              >
                ›
              </Button>

              <Button
                size="small"
                disabled={loadingPlanning}
                onClick={resetToToday}
                sx={{
                  ml: 0.5,
                  minWidth: 52,
                  minHeight: 38,
                  px: 1,
                  color: '#64748B',
                  border: '1px solid #E2E8F0',
                  borderRadius: 0.7,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                }}
              >
                Hoy
              </Button>
            </Stack>

            <Box sx={{ overflowX: 'auto' }}>
              <Box
                sx={{
                  minWidth: 980,
                  borderTop: '1px solid #E7EDF4',
                  borderLeft: '1px solid #E7EDF4',
                }}
              >
                {/* Cabecera de Días */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `180px repeat(${calendarDays.length}, minmax(30px, 1fr))`,
                  }}
                >
                  <Box
                    sx={{
                      minHeight: 48,
                      display: 'flex',
                      alignItems: 'center',
                      px: 1.5,
                      bgcolor: '#F7F9FC',
                      borderRight: '1px solid #E7EDF4',
                      borderBottom: '1px solid #E7EDF4',
                    }}
                  >
                    <Typography
                      sx={{
                        color: '#64748B',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                      }}
                    >
                      ISM/MESA
                    </Typography>
                  </Box>

                  {calendarDays.map((day) => (
                    <Box
                      key={day.format('YYYY-MM-DD')}
                      sx={{
                        minHeight: 48,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor:
                          day.day() === 0 || day.day() === 6
                            ? '#FAFCFE'
                            : '#F7F9FC',
                        borderRight: '1px solid #E7EDF4',
                        borderBottom: '1px solid #E7EDF4',
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#475569',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                        }}
                      >
                        {day.date()}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.1,
                          color: '#94A3B8',
                          fontSize: '0.55rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        {day.format('dd')}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Filas de Ingenieros */}
                {loadingAgents || loadingPlanning ? (
                  <Box
                    sx={{
                      minHeight: 165,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.8,
                      borderRight: '1px solid #E7EDF4',
                      borderBottom: '1px solid #E7EDF4',
                      bgcolor: '#FFFFFF',
                    }}
                  >
                    <CircularProgress size={30} />
                    <Typography
                      sx={{
                        color: '#94A3B8',
                        fontSize: '0.82rem',
                      }}
                    >
                      Cargando información de planeación...
                    </Typography>
                  </Box>
                ) : agents.length === 0 ? (
                  <Box
                    sx={{
                      minHeight: 165,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.8,
                      borderRight: '1px solid #E7EDF4',
                      borderBottom: '1px solid #E7EDF4',
                      bgcolor: '#FFFFFF',
                    }}
                  >
                    <CalendarMonthOutlined
                      sx={{ color: '#CBD5E1', fontSize: 38 }}
                    />
                    <Typography
                      sx={{
                        color: '#64748B',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                      }}
                    >
                      No hay ISM/MESA activos registrados
                    </Typography>
                  </Box>
                ) : (
                  agents.map((agent) => (
                    <PlanningTimelineRow
                      key={agent.id}
                      agent={agent}
                      events={planningEvents.filter(
                        (pe) => Number(pe.agenteId) === Number(agent.id),
                      )}
                      calendarDays={calendarDays}
                      getEventPosition={getEventPosition}
                    />
                  ))
                )}
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* RESUMEN POR PERIODO */}
        <Paper
          sx={{
            border: '1px solid #E7EDF4',
            borderRadius: 1.5,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.4,
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              alignItems: { xs: 'stretch', lg: 'center' },
              justifyContent: 'space-between',
              gap: 1.25,
              borderBottom: '1px solid #E7EDF4',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <Typography
                sx={{
                  color: '#173B66',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                Resumen por periodo
              </Typography>

              <TextField
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                size="small"
                disabled={loadingSummary || exporting}
                sx={{
                  width: { xs: '100%', sm: 180 },
                  '& .MuiOutlinedInput-root': { minHeight: 46 },
                  '& .MuiInputBase-input': { fontSize: '0.86rem' },
                }}
              />

              <Typography sx={{ color: '#94A3B8', textAlign: 'center' }}>
                a
              </Typography>

              <TextField
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                size="small"
                disabled={loadingSummary || exporting}
                sx={{
                  width: { xs: '100%', sm: 180 },
                  '& .MuiOutlinedInput-root': { minHeight: 46 },
                  '& .MuiInputBase-input': { fontSize: '0.86rem' },
                }}
              />

              <Button
                size="small"
                variant="outlined"
                disabled={loadingSummary || exporting}
                onClick={handleApplyPeriod}
                sx={{
                  minHeight: 46,
                  borderColor: '#E2E8F0',
                  color: '#475569',
                  textTransform: 'none',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                }}
              >
                Aplicar
              </Button>
            </Stack>

            <Button
              size="small"
              variant="outlined"
              startIcon={
                exporting ? (
                  <CircularProgress size={17} color="inherit" />
                ) : (
                  <DownloadOutlined />
                )
              }
              disabled={exporting}
              onClick={handleExport}
              sx={{
                minHeight: 46,
                borderColor: '#B7DEC5',
                color: '#168A4A',
                textTransform: 'none',
                fontSize: '0.86rem',
                fontWeight: 700,
                '&:hover': {
                  borderColor: '#86C89B',
                  bgcolor: '#F0FDF4',
                },
              }}
            >
              {exporting ? 'Exportando...' : 'Exportar a Excel'}
            </Button>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                minWidth: 720,
                borderCollapse: 'collapse',
                '& th': {
                  px: 1.75,
                  py: 1.15,
                  color: '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  bgcolor: '#F7F9FC',
                  borderBottom: '1px solid #E7EDF4',
                },
                '& td': {
                  px: 1.75,
                  py: 1,
                  color: '#475569',
                  fontSize: '0.84rem',
                  borderBottom: '1px solid #EEF2F6',
                },
              }}
            >
              <thead>
                <tr>
                  <th>ISM/MESA</th>
                  <th style={{ textAlign: 'center' }}>Días vacaciones</th>
                  <th style={{ textAlign: 'center' }}>Días en proyecto</th>
                  <th style={{ textAlign: 'center' }}>Total días fuera</th>
                </tr>
              </thead>
              <tbody>
                {loadingSummary ? (
                  <tr>
                    <td colSpan={4}>
                      <Box
                        sx={{
                          minHeight: 145,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CircularProgress size={28} />
                      </Box>
                    </td>
                  </tr>
                ) : periodSummaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <Box
                        sx={{
                          minHeight: 145,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.75,
                          textAlign: 'center',
                        }}
                      >
                        <CheckCircleOutlined
                          sx={{ color: '#CBD5E1', fontSize: 34 }}
                        />
                        <Typography
                          sx={{
                            color: '#64748B',
                            fontSize: '0.9rem',
                            fontWeight: 800,
                          }}
                        >
                          No hay información para este periodo
                        </Typography>
                      </Box>
                    </td>
                  </tr>
                ) : (
                  periodSummaryRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Typography
                          sx={{
                            color: '#334155',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                          }}
                        >
                          {row.nombre}
                        </Typography>
                      </td>
                      <td style={{ textAlign: 'center' }}>{row.vacaciones}</td>
                      <td style={{ textAlign: 'center' }}>{row.proyecto}</td>
                      <td
                        style={{
                          color: '#173B66',
                          fontWeight: 800,
                          textAlign: 'center',
                        }}
                      >
                        {row.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Box>
          </Box>

          <Box
            sx={{
              px: 1.75,
              py: 1.1,
              display: 'flex',
              alignItems: 'center',
              gap: 0.9,
              borderTop: '1px solid #E7EDF4',
              bgcolor: '#FAFCFE',
            }}
          >
            <InfoOutlined
              sx={{ color: '#1674B7', fontSize: 21, flexShrink: 0 }}
            />
            <Typography sx={{ color: '#64748B', fontSize: '0.78rem' }}>
              Las vacaciones y proyectos se guardan en PostgreSQL. El calendario,
              resumen y archivo Excel se generan con información persistente.
            </Typography>
          </Box>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}

function DateField({ label, value, onChange, disabled }) {
  return (
    <Box>
      <Typography
        sx={{
          mb: 0.7,
          color: '#475569',
          fontSize: '0.9rem',
          fontWeight: 800,
        }}
      >
        {label}
      </Typography>
      <TextField
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        fullWidth
        required
        disabled={disabled}
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            minHeight: 48,
          },
          '& .MuiInputBase-input': {
            fontSize: '0.9rem',
          },
        }}
      />
    </Box>
  );
}

function PlanningMetricCard({ icon, label, value, color, background }) {
  return (
    <Paper
      sx={{
        position: 'relative',
        height: 108,
        overflow: 'hidden',
        border: '1px solid #E7EDF4',
        borderRadius: 1.5,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
      }}
    >
      <Box
        sx={{
          height: '100%',
          p: 1.55,
          display: 'flex',
          alignItems: 'center',
          gap: 1.65,
        }}
      >
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
            '& svg': {
              fontSize: 27,
            },
          }}
        >
          {icon}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              color: '#334155',
              fontSize: '0.94rem',
              lineHeight: 1.1,
              fontWeight: 700,
            }}
          >
            {label}
          </Typography>

          <Typography
            sx={{
              mt: 0.65,
              color,
              fontSize: '1.78rem',
              lineHeight: 1,
              fontWeight: 800,
            }}
          >
            {value}
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

function LegendItem({ color, label }) {
  return (
    <Stack direction="row" spacing={0.65} alignItems="center">
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: 0.3,
          bgcolor: color,
        }}
      />
      <Typography sx={{ color: '#64748B', fontSize: '0.76rem' }}>
        {label}
      </Typography>
    </Stack>
  );
}

/* COMPONENTE CON LA TIPOGRAFÍA Y ALTURA MEJORADA */
function PlanningTimelineRow({
  agent,
  events,
  calendarDays,
  getEventPosition,
}) {
  return (
    <Box
      sx={{
        minHeight: 48,
        display: 'grid',
        gridTemplateColumns: `180px repeat(${calendarDays.length}, minmax(30px, 1fr))`,
        borderBottom: '1px solid #E7EDF4',
      }}
    >
      <Box
        sx={{
          minHeight: 48,
          display: 'flex',
          alignItems: 'center',
          px: 1.5,
          borderRight: '1px solid #E7EDF4',
          bgcolor: '#FFFFFF',
        }}
      >
        <Typography
          noWrap
          sx={{
            maxWidth: 160,
            color: '#334155',
            fontSize: '0.82rem',
            fontWeight: 800,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {agent.nombre}
        </Typography>
      </Box>

      <Box
        sx={{
          gridColumn: `span ${calendarDays.length}`,
          minHeight: 48,
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: `repeat(${calendarDays.length}, minmax(30px, 1fr))`,
          bgcolor: '#FAFDFB',
          backgroundImage:
            'linear-gradient(to right, #E7EDF4 1px, transparent 1px)',
          backgroundSize: `calc(100% / ${calendarDays.length}) 100%`,
        }}
      >
        {events.map((event) => {
          const position = getEventPosition(event);
          const isVacation = event.tipo === 'VACACIONES';

          return (
            <Box
              key={event.id}
              title={`${event.agente}: ${
                isVacation ? 'Vacaciones' : 'Proyecto'
              }`}
              sx={{
                gridColumn: `${position.startIndex + 1} / span ${position.duration}`,
                alignSelf: 'center',
                zIndex: 1,
                minWidth: 0,
                height: 28,
                mx: 0.2,
                px: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderRadius: 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                bgcolor: isVacation ? '#1A73E8' : '#F6AA61',
                color: '#FFFFFF',
              }}
            >
              <Typography
                noWrap
                sx={{
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {isVacation ? 'Vacaciones' : 'Proyecto'}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default PlanningPage;