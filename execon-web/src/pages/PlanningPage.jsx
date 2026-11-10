import {
  CalendarMonthOutlined,
  ChevronLeft,
  ChevronRight,
  DownloadOutlined,
  EventAvailableOutlined,
  EventBusyOutlined,
  InboxOutlined,
  WorkOutlineOutlined,
} from '@mui/icons-material';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
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
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/* ---------- Tokens del sistema de diseño ---------- */
const T = {
  bg: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  text2: '#475569',
  text3: '#94A3B8',
  primary: '#003359',
  link: '#155E9C',
  head: '#F8FAFC',
  seg: '#EEF2F6',
  vac: '#1D6FB8',
  proj: '#F59E0B',
  red: '#C0392B',
};

const cardSx = {
  bgcolor: '#FFFFFF',
  border: `1px solid ${T.border}`,
  borderRadius: 2.5,
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
  overflow: 'hidden',
};

const labelSx = {
  display: 'block',
  mb: 0.75,
  color: T.text3,
  fontSize: '0.66rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 44,
    borderRadius: 2,
    bgcolor: '#FFFFFF',
    fontSize: '0.86rem',
    '& fieldset': { borderColor: T.border },
    '&:hover fieldset': { borderColor: '#CBD5E1' },
    '&.Mui-focused fieldset': { borderColor: T.primary },
  },
};

const outlineBtnSx = {
  minHeight: 38,
  borderColor: T.border,
  borderRadius: 2,
  color: T.text2,
  textTransform: 'none',
  fontSize: '0.8rem',
  fontWeight: 700,
  '&:hover': { borderColor: T.primary, bgcolor: T.head },
};

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
      label: `${visibleStart.format('DD')}–${visibleEnd.format('DD MMM')}`,
    };
  };

  const todayColumn = dayjs().isSame(calendarDate, 'month')
    ? dayjs().date()
    : null;

  return (
    <DashboardLayout>
      <Box sx={{ pt: 1, pb: 3 }}>
        {/* KPIs CON ANIMACIÓN DE ELEVACIÓN Y SOMBRA */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 2,
            mb: 3,
          }}
        >
          <PlanningMetricCard
            icon={<WorkOutlineOutlined />}
            label="En proyecto esta semana"
            value={summary.projectsThisWeek}
            subtitle="Asignaciones activas"
            color="#6D5BD0"
            background="#EFEDFA"
          />

          <PlanningMetricCard
            icon={<EventBusyOutlined />}
            label="En vacaciones este mes"
            value={summary.vacationsThisMonth}
            subtitle={`${MONTHS[calendarDate.month()]} ${calendarDate.year()}`}
            color="#1D6FB8"
            background="#EAF2FA"
          />

          <PlanningMetricCard
            icon={<CalendarMonthOutlined />}
            label="Total días fuera"
            value={summary.totalDaysOut}
            subtitle="Acumulado del mes"
            color="#0E9F6E"
            background="#E9F9F1"
          />
        </Box>

        {/* FORMULARIO DE REGISTRO */}
        <Paper
          component="form"
          onSubmit={handleSavePlanning}
          elevation={0}
          sx={{ ...cardSx, mb: 3.5 }}
        >
          <CardHead title="Registro de vacaciones y proyectos" />

          <Box sx={{ p: 2.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '1.2fr 1fr 1.4fr',
                },
                gap: 2,
                alignItems: 'end',
              }}
            >
              <Box>
                <Typography sx={labelSx}>ISM / MESA</Typography>
                <FormControl
                  fullWidth
                  size="small"
                  disabled={loadingAgents || savingPlanning}
                >
                  <InputLabel id="planning-agent-label" shrink={false} sx={{ display: 'none' }}>
                    ISM/MESA
                  </InputLabel>
                  <Select
                    labelId="planning-agent-label"
                    value={form.agente}
                    displayEmpty
                    onChange={(event) =>
                      handleFormChange('agente', event.target.value)
                    }
                    renderValue={(selected) => {
                      if (!selected) {
                        return (
                          <Typography sx={{ color: T.text3, fontSize: '0.86rem' }}>
                            Selecciona un ISM/MESA
                          </Typography>
                        );
                      }
                      const found = agents.find((a) => String(a.id) === String(selected));
                      return (
                        <Typography sx={{ color: T.text, fontSize: '0.86rem', fontWeight: 600 }}>
                          {found?.nombre || selected}
                        </Typography>
                      );
                    }}
                    sx={{
                      minHeight: 44,
                      borderRadius: 2,
                      fontSize: '0.86rem',
                      '& fieldset': { borderColor: T.border },
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
                          sx={{ fontSize: '0.86rem' }}
                        >
                          {agent.nombre}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Typography sx={labelSx}>Tipo de registro</Typography>
                <SegmentedControl
                  value={form.tipo}
                  disabled={savingPlanning}
                  onChange={(value) => handleFormChange('tipo', value)}
                  options={[
                    { value: 'VACACIONES', label: 'Vacaciones' },
                    { value: 'PROYECTO', label: 'En proyecto' },
                  ]}
                />
              </Box>

              <Box>
                <Typography sx={labelSx}>Comentario</Typography>
                <TextField
                  placeholder="Motivo o referencia del periodo…"
                  value={form.comentario}
                  onChange={(event) =>
                    handleFormChange('comentario', event.target.value)
                  }
                  fullWidth
                  size="small"
                  disabled={savingPlanning}
                  sx={inputSx}
                />
              </Box>
            </Box>

            <Box
              sx={{
                mt: 2,
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'minmax(220px, 1fr) minmax(220px, 1fr) auto',
                },
                gap: 2,
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
                disableElevation
                startIcon={
                  savingPlanning ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <EventAvailableOutlined />
                  )
                }
                disabled={loadingAgents || savingPlanning}
                sx={{
                  minHeight: 44,
                  minWidth: 200,
                  px: 2.5,
                  borderRadius: 2,
                  bgcolor: T.primary,
                  textTransform: 'none',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: '#002642' },
                }}
              >
                {savingPlanning ? 'Guardando...' : 'Guardar registro'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {message && (
          <Alert
            severity={message.severity}
            onClose={() => setMessage(null)}
            sx={{ mb: 2.5, borderRadius: 2.5, fontSize: '0.86rem' }}
          >
            {message.text}
          </Alert>
        )}

        {/* CALENDARIO CON ENCABEZADO 100% ALINEADO */}
        <Paper elevation={0} sx={{ ...cardSx, mb: 3.5 }}>
          <Box
            sx={{
              px: 2.5,
              minHeight: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            {/* Título de la tarjeta */}
            <Typography
              sx={{
                color: T.text,
                fontSize: '0.8rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              Calendario de disponibilidad
            </Typography>

            {/* Selector de mes al centro */}
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                size="small"
                disabled={loadingPlanning}
                onClick={() => changeCalendarMonth('PREV')}
                sx={{ border: `1px solid ${T.border}`, borderRadius: 2, width: 32, height: 32 }}
              >
                <ChevronLeft fontSize="small" />
              </IconButton>

              <Typography
                sx={{
                  minWidth: 155,
                  color: T.text,
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                }}
              >
                {MONTHS[calendarDate.month()]} {calendarDate.year()}
              </Typography>

              <IconButton
                size="small"
                disabled={loadingPlanning}
                onClick={() => changeCalendarMonth('NEXT')}
                sx={{ border: `1px solid ${T.border}`, borderRadius: 2, width: 32, height: 32 }}
              >
                <ChevronRight fontSize="small" />
              </IconButton>

              <Button
                size="small"
                variant="outlined"
                disabled={loadingPlanning}
                onClick={resetToToday}
                sx={{ ...outlineBtnSx, minHeight: 32, px: 1.5, ml: 0.5 }}
              >
                Hoy
              </Button>
            </Stack>

            {/* Leyenda a la derecha con spacing limpio */}
            <Stack direction="row" spacing={3} alignItems="center">
              <LegendItem color={T.vac} label="Vacaciones" />
              <LegendItem color={T.proj} label="Proyecto" />
              <LegendItem color={T.red} label="Hoy" />
            </Stack>
          </Box>

          <Box sx={{ p: 2, overflowX: 'auto' }}>
            <Box
              sx={{
                minWidth: 980,
                border: `1px solid ${T.border}`,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {/* Cabecera de días */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `180px repeat(${calendarDays.length}, minmax(30px, 1fr))`,
                  bgcolor: T.head,
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <Box
                  sx={{
                    px: 1.75,
                    py: 1.1,
                    display: 'flex',
                    alignItems: 'center',
                    borderRight: `1px solid ${T.border}`,
                  }}
                >
                  <Typography
                    sx={{
                      color: T.text3,
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ISM / MESA
                  </Typography>
                </Box>

                {calendarDays.map((day) => {
                  const isWeekend = day.day() === 0 || day.day() === 6;
                  const isToday = day.isSame(dayjs(), 'day');

                  return (
                    <Box
                      key={day.format('YYYY-MM-DD')}
                      sx={{
                        py: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isToday ? '#FDECEA' : 'transparent',
                      }}
                    >
                      <Typography
                        sx={{
                          color: isToday ? T.red : isWeekend ? T.text3 : T.text2,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                        }}
                      >
                        {day.date()}
                      </Typography>
                      <Typography
                        sx={{
                          color: T.text3,
                          fontSize: '0.56rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {day.format('dd')}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              {/* Filas */}
              {loadingAgents || loadingPlanning ? (
                <EmptyState minHeight={165}>
                  <CircularProgress size={30} />
                  <Typography sx={{ color: T.text3, fontSize: '0.82rem' }}>
                    Cargando información de planeación...
                  </Typography>
                </EmptyState>
              ) : agents.length === 0 ? (
                <EmptyState minHeight={165}>
                  <CalendarMonthOutlined sx={{ color: '#CBD5E1', fontSize: 38 }} />
                  <Typography sx={{ color: T.text2, fontSize: '0.9rem', fontWeight: 700 }}>
                    No hay ISM/MESA activos registrados
                  </Typography>
                </EmptyState>
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
                    todayColumn={todayColumn}
                  />
                ))
              )}
            </Box>
          </Box>
        </Paper>

        {/* RESUMEN POR PERIODO CON "a" CENTRADA Y ALINEADA */}
        <Paper elevation={0} sx={cardSx}>
          <CardHead title="Resumen por periodo">
            <Stack
              direction="row"
              alignItems="center"
              gap={2}
              flexWrap="wrap"
            >
              <TextField
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                size="small"
                disabled={loadingSummary || exporting}
                sx={{
                  ...inputSx,
                  width: 175,
                  '& .MuiOutlinedInput-root': {
                    ...inputSx['& .MuiOutlinedInput-root'],
                    minHeight: 38,
                  },
                }}
              />

              <Typography
                sx={{
                  color: T.text3,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  px: 0.5,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                a
              </Typography>

              <TextField
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                size="small"
                disabled={loadingSummary || exporting}
                sx={{
                  ...inputSx,
                  width: 175,
                  '& .MuiOutlinedInput-root': {
                    ...inputSx['& .MuiOutlinedInput-root'],
                    minHeight: 38,
                  },
                }}
              />

              <Button
                size="small"
                variant="outlined"
                disabled={loadingSummary || exporting}
                onClick={handleApplyPeriod}
                sx={{ ...outlineBtnSx, px: 2, ml: 1 }}
              >
                Aplicar
              </Button>

              <Button
                size="small"
                variant="contained"
                disableElevation
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
                  minHeight: 38,
                  borderRadius: 2,
                  bgcolor: '#0E9F6E',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  px: 2.25,
                  ml: 1,
                  '&:hover': { bgcolor: '#067A55' },
                }}
              >
                {exporting ? 'Exportando...' : 'Exportar a Excel'}
              </Button>
            </Stack>
          </CardHead>

          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                minWidth: 720,
                borderCollapse: 'collapse',
                '& th': {
                  px: 2.5,
                  py: 1.25,
                  color: T.text3,
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  bgcolor: T.head,
                  borderBottom: `1px solid ${T.border}`,
                },
                '& td': {
                  px: 2.5,
                  py: 1.25,
                  color: T.text2,
                  fontSize: '0.84rem',
                  borderBottom: '1px solid #EEF2F6',
                },
                '& tbody tr:hover': { bgcolor: '#FBFDFE' },
              }}
            >
              <thead>
                <tr>
                  <th>ISM / MESA</th>
                  <th style={{ textAlign: 'center' }}>Días vacaciones</th>
                  <th style={{ textAlign: 'center' }}>Días en proyecto</th>
                  <th style={{ textAlign: 'center' }}>Total días fuera</th>
                </tr>
              </thead>
              <tbody>
                {loadingSummary ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState minHeight={145}>
                        <CircularProgress size={28} />
                      </EmptyState>
                    </td>
                  </tr>
                ) : periodSummaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState minHeight={145}>
                        <InboxOutlined sx={{ color: '#CBD5E1', fontSize: 34 }} />
                        <Typography sx={{ color: T.text2, fontSize: '0.9rem', fontWeight: 700 }}>
                          No hay información para este periodo
                        </Typography>
                        <Typography sx={{ color: T.text3, fontSize: '0.72rem' }}>
                          Ajusta las fechas y presiona Aplicar.
                        </Typography>
                      </EmptyState>
                    </td>
                  </tr>
                ) : (
                  periodSummaryRows.map((row) => {
                    const vac = Number(row.vacaciones) || 0;
                    const proj = Number(row.proyecto) || 0;

                    return (
                      <tr key={row.id}>
                        <td>
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            <AgentAvatar name={row.nombre} />
                            <Typography
                              sx={{ color: T.text, fontSize: '0.84rem', fontWeight: 700 }}
                            >
                              {row.nombre}
                            </Typography>
                          </Stack>
                        </td>
                        <td style={{ textAlign: 'center' }}>{row.vacaciones}</td>
                        <td style={{ textAlign: 'center' }}>{row.proyecto}</td>
                        <td style={{ textAlign: 'center' }}>
                          <Chip
                            size="small"
                            label={`${row.total} ${Number(row.total) === 1 ? 'día' : 'días'}`}
                            sx={{
                              bgcolor: vac >= proj ? '#EAF2FA' : '#FDF3E3',
                              color: vac >= proj ? T.link : '#B45309',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          />
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
    </DashboardLayout>
  );
}

/* ---------- Componentes auxiliares ---------- */

function CardHead({ title, children }) {
  return (
    <Box
      sx={{
        px: 2.5,
        minHeight: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <Typography
        sx={{
          color: T.text,
          fontSize: '0.8rem',
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        {title}
      </Typography>

      {children && (
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

function SegmentedControl({ value, onChange, options, disabled }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        p: 0.5,
        bgcolor: T.seg,
        borderRadius: 2.5,
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {options.map((option) => {
        const active = value === option.value;

        return (
          <Box
            key={option.value}
            role="button"
            tabIndex={0}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onChange(option.value);
              }
            }}
            sx={{
              flex: 1,
              px: 1.5,
              py: 0.9,
              borderRadius: 2,
              bgcolor: active ? '#FFFFFF' : 'transparent',
              boxShadow: active ? '0 1px 3px rgba(15, 23, 42, 0.12)' : 'none',
              color: active ? T.primary : T.text2,
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: active ? 700 : 600,
              textAlign: 'center',
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {option.label}
          </Box>
        );
      })}
    </Box>
  );
}

function DateField({ label, value, onChange, disabled }) {
  return (
    <Box>
      <Typography sx={labelSx}>{label}</Typography>
      <TextField
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        fullWidth
        required
        disabled={disabled}
        size="small"
        sx={inputSx}
      />
    </Box>
  );
}

function AgentAvatar({ name, size = 28 }) {
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #1D6FB8, #14406A)',
        fontSize: size * 0.4,
        fontWeight: 700,
      }}
    >
      {String(name || '?').charAt(0).toUpperCase()}
    </Avatar>
  );
}

function EmptyState({ minHeight, children }) {
  return (
    <Box
      sx={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.75,
        textAlign: 'center',
        bgcolor: '#FFFFFF',
      }}
    >
      {children}
    </Box>
  );
}

/* KPI CON ANIMACIÓN DE ELEVACIÓN Y SOMBRA DE VISTA GENERAL */
function PlanningMetricCard({ icon, label, value, subtitle, color, background }) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        p: 2.25,
        bgcolor: background,
        border: '1px solid transparent',
        borderRadius: 2.5,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
        cursor: 'default',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.12)',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 36,
          height: 36,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 2,
          bgcolor: '#FFFFFF',
          color,
          '& svg': { fontSize: 20 },
        }}
      >
        {icon}
      </Box>

      <Typography
        sx={{
          pr: 5,
          color: T.text2,
          fontSize: '0.66rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt: 0.5,
          color: T.text,
          fontSize: '2rem',
          fontWeight: 800,
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>

      <Typography sx={{ color: T.text3, fontSize: '0.75rem' }}>
        {subtitle}
      </Typography>
    </Paper>
  );
}

function LegendItem({ color, label }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color }} />
      <Typography sx={{ color: T.text2, fontSize: '0.75rem', fontWeight: 600 }}>
        {label}
      </Typography>
    </Stack>
  );
}

function PlanningTimelineRow({
  agent,
  events,
  calendarDays,
  getEventPosition,
  todayColumn,
}) {
  const totalDays = events.reduce(
    (sum, event) => sum + getEventPosition(event).duration,
    0,
  );

  return (
    <Box
      sx={{
        minHeight: 56,
        display: 'grid',
        gridTemplateColumns: `180px repeat(${calendarDays.length}, minmax(30px, 1fr))`,
        borderBottom: '1px solid #EEF2F6',
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: '#FBFDFE' },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ px: 1.75, py: 1, borderRight: '1px solid #EEF2F6' }}
      >
        <AgentAvatar name={agent.nombre} size={26} />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            noWrap
            sx={{
              maxWidth: 120,
              color: T.text,
              fontSize: '0.78rem',
              fontWeight: 700,
            }}
          >
            {agent.nombre}
          </Typography>
          <Typography sx={{ color: T.text3, fontSize: '0.66rem' }}>
            {totalDays > 0 ? `${totalDays} días fuera` : 'Disponible'}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          gridColumn: `span ${calendarDays.length}`,
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: `repeat(${calendarDays.length}, minmax(30px, 1fr))`,
          alignItems: 'center',
          backgroundImage:
            'linear-gradient(to right, #EEF2F6 1px, transparent 1px)',
          backgroundSize: `calc(100% / ${calendarDays.length}) 100%`,
        }}
      >
        {todayColumn && (
          <Box
            sx={{
              gridColumn: `${todayColumn} / span 1`,
              gridRow: 1,
              position: 'relative',
              alignSelf: 'stretch',
              zIndex: 3,
              pointerEvents: 'none',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '50%',
                width: 2.5,
                transform: 'translateX(-50%)',
                bgcolor: T.red,
                borderRadius: 1,
                boxShadow: '0 0 8px rgba(192, 57, 43, 0.5)',
              }}
            />
          </Box>
        )}

        {events.map((event) => {
          const position = getEventPosition(event);
          const isVacation = event.tipo === 'VACACIONES';

          return (
            <Box
              key={event.id}
              title={`${event.agente || agent.nombre}: ${
                isVacation ? 'Vacaciones' : 'Proyecto'
              } (${event.fechaInicio} a ${event.fechaFin})${
                event.comentario ? ` · ${event.comentario}` : ''
              }`}
              sx={{
                gridColumn: `${position.startIndex + 1} / span ${position.duration}`,
                gridRow: 1,
                zIndex: 2,
                minWidth: 0,
                height: 24,
                mx: '1px',
                px: 1.1,
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                borderRadius: '7px',
                background: isVacation
                  ? 'linear-gradient(90deg, #1D6FB8, #155E9C)'
                  : 'linear-gradient(90deg, #F59E0B, #D97706)',
                boxShadow: isVacation
                  ? '0 3px 8px -2px rgba(29, 111, 184, 0.5)'
                  : '0 3px 8px -2px rgba(217, 119, 6, 0.5)',
              }}
            >
              <Typography
                noWrap
                sx={{
                  color: '#FFFFFF',
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}
              >
                {isVacation ? 'Vacaciones' : 'Proyecto'}
                {position.duration > 4 ? ` · ${position.label}` : ''}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default PlanningPage;