import {
  BusinessCenterOutlined,
  GroupsOutlined,
  LocationOnOutlined,
  RefreshOutlined,
  RestaurantOutlined,
  SearchOutlined,
  WarningAmberOutlined,
  WbSunnyOutlined,
} from '@mui/icons-material';

import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { DataGrid } from '@mui/x-data-grid';
import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardLayout from '../layouts/DashboardLayout';
import { dashboardService } from '../services/dashboardService';

/* ===================== SISTEMA DE DISEÑO ===================== */
const TOKENS = {
  primary: '#003359',
  border: '#E2E8F0',
  divider: '#EDF2F7',
  text: '#0F172A',
  text2: '#475569',
  text3: '#94A3B8',
  cardShadow: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(10,37,64,.12)',
};

const STATUS_CONFIG = [
  {
    id: 'mesa',
    field: 'enMesa',
    label: 'En mesa',
    sub: 'Disponibles para asignación',
    color: '#1D6FB8',
    lightColor: '#EAF2FA',
    icon: <GroupsOutlined />,
  },
  {
    id: 'campo',
    field: 'enCampo',
    label: 'En campo',
    sub: 'Atendiendo Onsites',
    color: '#0E9F6E',
    lightColor: '#E9F9F1',
    icon: <LocationOnOutlined />,
  },
  {
    id: 'comida',
    field: 'enComida',
    label: 'En comida',
    sub: 'Regreso estimado 45 min',
    color: '#D97706',
    lightColor: '#FDF3E3',
    icon: <RestaurantOutlined />,
  },
  {
    id: 'proyecto',
    field: 'enProyecto',
    label: 'En proyecto',
    sub: 'Asignados a proyectos',
    color: '#6D5BB8',
    lightColor: '#EFEDFA',
    icon: <BusinessCenterOutlined />,
  },
  {
    id: 'sin_reportar',
    field: 'sinReportar',
    label: 'Sin reportar',
    sub: 'Requieren seguimiento',
    color: '#C0392B',
    lightColor: '#FDECEA',
    icon: <WarningAmberOutlined />,
  },
  {
    id: 'vacaciones',
    field: 'vacaciones',
    label: 'En vacaciones',
    sub: 'Programadas en Planeación',
    color: '#64748B',
    lightColor: '#EEF2F6',
    icon: <WbSunnyOutlined />,
  },
];

const STATUS_COLOR_BY_FIELD = {
  enMesa: '#1D6FB8',
  enCampo: '#0E9F6E',
  enComida: '#D97706',
  enProyecto: '#6D5BB8',
  sinReportar: '#C0392B',
  vacaciones: '#64748B',
};

const RECURRENCE_CONFIG = [
  { id: 'sin_reportar', label: 'Sin reportar', color: '#C0392B' },
  { id: 'campo', label: 'En campo', color: '#0E9F6E' },
  { id: 'comida', label: 'En comida', color: '#D97706' },
  { id: 'proyecto', label: 'En proyecto', color: '#6D5BB8' },
  { id: 'mesa', label: 'En mesa', color: '#1D6FB8' },
  { id: 'vacaciones', label: 'En vacaciones', color: '#64748B' },
];

const PERIOD_OPTIONS = ['Semana', 'Mes', 'Día'];

/* ===================== UTILIDADES ===================== */
function formatDateForApi(date) {
  return date.toISOString().split('T')[0];
}

function getWeekRange() {
  const currentDate = new Date();
  const day = currentDate.getDay();
  const differenceToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(currentDate);
  start.setDate(currentDate.getDate() + differenceToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    fechaInicio: formatDateForApi(start),
    fechaFin: formatDateForApi(end),
  };
}

function getInitialDashboardData() {
  return {
    resumen: {
      mesa: 0,
      campo: 0,
      comida: 0,
      proyecto: 0,
      sin_reportar: 0,
      vacaciones: 0,
      agentesActivos: 0,
      agentesTotales: 0,
      disponibilidadEfectiva: 0,
    },
    disponibilidad: [],
    reincidencia: [],
    volumetria: [],
  };
}

/* ===================== COMPONENTES DE DISEÑO ===================== */

/* Tarjeta KPI de estatus (estilo boceto: etiqueta pequeña, número grande, icono tintado) */
function StatusCard({ card, isSelected, onClick }) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        position: 'relative',
        height: 118,
        overflow: 'hidden',
        border: isSelected
          ? `1.5px solid ${card.color}`
          : `1px solid ${TOKENS.border}`,
        borderRadius: 2.5,
        boxShadow: isSelected
          ? `0 0 0 3px ${card.lightColor}, ${TOKENS.cardShadow}`
          : TOKENS.cardShadow,
        bgcolor: isSelected ? card.lightColor : '#FFFFFF',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 180ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px -8px rgba(10,37,64,.18)',
        },
      }}
    >
      <Box sx={{ height: '100%', p: 1.75, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 'auto',
          }}
        >
          <Typography
            sx={{
              color: TOKENS.text3,
              fontSize: '0.66rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              lineHeight: 1.3,
            }}
          >
            {card.label}
          </Typography>

          <Box
            sx={{
              width: 36,
              height: 36,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1.75,
              bgcolor: card.lightColor,
              color: card.color,
              flexShrink: 0,
              '& svg': { fontSize: 19 },
            }}
          >
            {card.icon}
          </Box>
        </Box>

        <Typography
          sx={{
            color: card.color,
            fontSize: '1.7rem',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {card.value}
        </Typography>

        <Typography
          sx={{
            mt: 0.5,
            color: TOKENS.text3,
            fontSize: '0.64rem',
            fontWeight: 500,
          }}
        >
          {card.sub}
        </Typography>
      </Box>
    </Paper>
  );
}

/* Encabezado reutilizable de tarjeta de sección */
function CardHead({ title, hint, children }) {
  return (
    <Box
      sx={{
        px: 2.25,
        pt: 2,
        pb: 1.75,
        borderBottom: `1px solid ${TOKENS.divider}`,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Box>
        <Typography sx={{ color: TOKENS.text, fontSize: '0.9rem', fontWeight: 700 }}>
          {title}
        </Typography>
        {hint && (
          <Typography sx={{ color: TOKENS.text3, fontSize: '0.72rem', mt: 0.3 }}>
            {hint}
          </Typography>
        )}
      </Box>
      {children && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ ml: 'auto', width: { xs: '100%', sm: 'auto' } }}
        >
          {children}
        </Stack>
      )}
    </Box>
  );
}

/* Control segmentado (Semana / Mes / Día) */
function SegmentedControl({ value, onChange }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        bgcolor: '#EEF2F6',
        borderRadius: 1.5,
        p: '3px',
      }}
    >
      {PERIOD_OPTIONS.map((option) => {
        const isActive = value === option;
        return (
          <Button
            key={option}
            size="small"
            disableRipple
            onClick={() => onChange(option)}
            sx={{
              minWidth: 64,
              py: 0.45,
              px: 1.5,
              fontSize: '0.74rem',
              fontWeight: 600,
              borderRadius: 1,
              textTransform: 'none',
              color: isActive ? TOKENS.primary : TOKENS.text2,
              bgcolor: isActive ? '#FFFFFF' : 'transparent',
              boxShadow: isActive ? '0 1px 4px rgba(15,23,42,.12)' : 'none',
              '&:hover': {
                bgcolor: isActive ? '#FFFFFF' : 'rgba(15,23,42,.04)',
              },
            }}
          >
            {option}
          </Button>
        );
      })}
    </Box>
  );
}

/* Anillo de disponibilidad efectiva */
function MetricRing({ percentage }) {
  const safePercentage = Math.max(0, Math.min(Number(percentage) || 0, 100));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = (safePercentage / 100) * circumference;

  return (
    <Box sx={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="#EEF2F6"
          strokeWidth="10"
        />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="#1D6FB8"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform="rotate(-90 55 55)"
        />
      </svg>

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography sx={{ color: TOKENS.text, fontWeight: 800, fontSize: '1.45rem' }}>
          {safePercentage}%
        </Typography>
        <Typography
          sx={{
            color: TOKENS.text3,
            fontWeight: 600,
            fontSize: '0.56rem',
            letterSpacing: '0.08em',
          }}
        >
          PROMEDIO
        </Typography>
      </Box>
    </Box>
  );
}

/* Celda de estatus coloreada para la tabla */
function StatusValueCell({ value, field }) {
  const safeValue = Number(value) || 0;

  return (
    <Typography
      sx={{
        color: safeValue > 0 ? STATUS_COLOR_BY_FIELD[field] : '#CBD5E1',
        fontSize: '0.8rem',
        fontWeight: safeValue > 0 ? 800 : 600,
      }}
    >
      {safeValue}
    </Typography>
  );
}

/* Celda de ISM con avatar de inicial */
function IsmCell({ value }) {
  const name = String(value || 'Sin asignar');
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Avatar
        sx={{
          width: 28,
          height: 28,
          fontSize: '0.72rem',
          fontWeight: 700,
          bgcolor: 'linear-gradient(135deg, #1D6FB8, #14406A)',
          background: 'linear-gradient(135deg, #1D6FB8, #14406A)',
        }}
      >
        {initial}
      </Avatar>
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: TOKENS.text }}>
        {name}
      </Typography>
    </Box>
  );
}

/* ===================== PÁGINA PRINCIPAL ===================== */
function DashboardPage() {
  const [period, setPeriod] = useState('Semana');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedSite, setSelectedSite] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sites, setSites] = useState([]);
  const [dashboardData, setDashboardData] = useState(getInitialDashboardData);
  const [loading, setLoading] = useState(true);
  const [loadingSites, setLoadingSites] = useState(true);
  const [error, setError] = useState('');

  const weekRange = useMemo(() => getWeekRange(), []);

  const statusCards = useMemo(() => {
    return STATUS_CONFIG.map((config) => ({
      ...config,
      value: Number(dashboardData.resumen?.[config.id]) || 0,
    }));
  }, [dashboardData.resumen]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return dashboardData.volumetria.filter((row) => {
      const matchesSearch = String(row.ism || '')
        .toLowerCase()
        .includes(normalizedSearch);

      if (!matchesSearch) return false;
      if (!selectedStatus) return true;

      const statusMap = {
        mesa: 'enMesa',
        campo: 'enCampo',
        comida: 'enComida',
        proyecto: 'enProyecto',
        sin_reportar: 'sinReportar',
        vacaciones: 'vacaciones',
      };

      const fieldName = statusMap[selectedStatus] || selectedStatus;
      return Number(row[fieldName] ?? 0) > 0;
    });
  }, [dashboardData.volumetria, searchTerm, selectedStatus]);

  const loadSites = useCallback(async () => {
    setLoadingSites(true);
    try {
      const response = await dashboardService.getSitios();
      setSites(Array.isArray(response) ? response : []);
    } catch {
      setSites([]);
    } finally {
      setLoadingSites(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    const siteId = selectedSite === 'todos' ? undefined : selectedSite;

    try {
      const [resumen, disponibilidad, reincidencia, volumetria] =
        await Promise.all([
          dashboardService.getResumen({
            fecha: formatDateForApi(new Date()),
            sitioId: siteId,
          }),
          dashboardService.getDisponibilidad({
            fechaInicio: weekRange.fechaInicio,
            fechaFin: weekRange.fechaFin,
            sitioId: siteId,
          }),
          dashboardService.getReincidencia({
            fechaInicio: weekRange.fechaInicio,
            fechaFin: weekRange.fechaFin,
            sitioId: siteId,
          }),
          dashboardService.getVolumetria({
            periodo: period,
            fecha: formatDateForApi(new Date()),
            sitioId: siteId,
          }),
        ]);

      setDashboardData({
        resumen: resumen || getInitialDashboardData().resumen,
        disponibilidad: Array.isArray(disponibilidad) ? disponibilidad : [],
        reincidencia: Array.isArray(reincidencia) ? reincidencia : [],
        volumetria: Array.isArray(volumetria) ? volumetria : [],
      });
    } catch (requestError) {
      setDashboardData(getInitialDashboardData());
      setError(
        requestError.message ||
          'No fue posible cargar la información del dashboard.',
      );
    } finally {
      setLoading(false);
    }
  }, [period, selectedSite, weekRange]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleCardClick = (cardId) => {
    setSelectedStatus((prev) => (prev === cardId ? null : cardId));
  };

  /* ---------- Gráfica de disponibilidad (línea con degradado) ---------- */
  const availabilityOption = useMemo(() => {
    const labels = dashboardData.disponibilidad.map(
      (item) => item.dia || item.fecha || '',
    );

    const values = dashboardData.disponibilidad.map(
      (item) => Number(item.porcentaje ?? item.disponibilidad ?? 0),
    );

    return {
      animationDuration: 600,
      grid: { left: 42, right: 22, top: 30, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#FFFFFF',
        borderColor: '#D8E1EC',
        borderWidth: 1,
        textStyle: { color: '#334155' },
        formatter: (params) => {
          const point = params?.[0];
          if (!point) return 'Sin información';
          return `<strong>${point.axisValue}</strong><br/>Disponibilidad: ${point.value}%`;
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: TOKENS.border } },
        axisLabel: { color: '#64748B', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: { formatter: '{value}%', color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: '#E8EEF5', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: 'Disponibilidad',
          type: 'line',
          smooth: 0.25,
          data: values,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#1D6FB8', width: 2.5 },
          itemStyle: { color: '#1D6FB8', borderColor: '#FFFFFF', borderWidth: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(29, 111, 184, 0.22)' },
                { offset: 1, color: 'rgba(29, 111, 184, 0.01)' },
              ],
            },
          },
        },
      ],
    };
  }, [dashboardData.disponibilidad]);

  /* ---------- Gráfica de reincidencia (barras horizontales) ---------- */
  const recurrenceOption = useMemo(() => {
    const valuesByStatus = new Map(
      dashboardData.reincidencia.map((item) => [
        item.estatus || item.id,
        Number(item.total ?? item.valor ?? item.cantidad ?? 0),
      ]),
    );

    const values = RECURRENCE_CONFIG.map((config) => ({
      value: valuesByStatus.get(config.id) || 0,
      itemStyle: { color: config.color },
    }));

    const maximum = Math.max(
      5,
      ...values.map((item) => Number(item.value) || 0),
    );

    return {
      animationDuration: 600,
      grid: { left: 95, right: 40, top: 22, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#FFFFFF',
        borderColor: '#D8E1EC',
        borderWidth: 1,
        textStyle: { color: '#334155' },
        formatter: (params) => {
          const point = params?.[0];
          if (!point) return 'Sin información';
          return `<strong>${point.name}</strong><br/>Reincidencias: ${point.value}`;
        },
      },
      xAxis: {
        type: 'value',
        max: Math.ceil(maximum / 5) * 5,
        interval: 5,
        axisLabel: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: '#E8EEF5', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: RECURRENCE_CONFIG.map((config) => config.label),
        axisLabel: { color: '#475569', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          barWidth: 10,
          data: values,
          label: {
            show: true,
            position: 'right',
            color: '#334155',
            fontSize: 11,
            fontWeight: 700,
          },
          itemStyle: { borderRadius: [0, 5, 5, 0] },
        },
      ],
    };
  }, [dashboardData.reincidencia]);

  /* ---------- Sparkline compacto de disponibilidad ---------- */
  const compactAvailabilityOption = useMemo(() => {
    const labels = dashboardData.disponibilidad.map(
      (item) => item.dia || item.fecha || '',
    );

    const values = dashboardData.disponibilidad.map(
      (item) => Number(item.porcentaje ?? item.disponibilidad ?? 0),
    );

    return {
      animation: false,
      grid: { left: 0, right: 0, top: 8, bottom: 18 },
      xAxis: {
        type: 'category',
        data: labels,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#64748B', fontSize: 9 },
      },
      yAxis: {
        type: 'value',
        show: false,
        min: 0,
        max: 100,
      },
      series: [
        {
          type: 'line',
          smooth: 0.3,
          data: values,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 2, color: '#1D6FB8' },
          itemStyle: { color: '#1D6FB8' },
          areaStyle: { color: 'rgba(29, 111, 184, 0.08)' },
        },
      ],
    };
  }, [dashboardData.disponibilidad]);

  /* ---------- Columnas de la tabla de volumetría ---------- */
  const columns = [
    {
      field: 'ism',
      headerName: 'ISM / MESA',
      minWidth: 200,
      flex: 1.5,
      renderCell: (params) => <IsmCell value={params.value} />,
    },
    {
      field: 'tareasCampo',
      headerName: 'Tareas campo',
      minWidth: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => Number(params.value) || 0,
    },
    {
      field: 'incidentesMesa',
      headerName: 'Incidentes cerrados',
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => Number(params.value) || 0,
    },
    {
      field: 'onsites',
      headerName: 'Onsites',
      minWidth: 88,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => Number(params.value) || 0,
    },
    {
      field: 'enMesa',
      headerName: 'En mesa',
      minWidth: 88,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => <StatusValueCell value={params.value} field="enMesa" />,
    },
    {
      field: 'enCampo',
      headerName: 'En campo',
      minWidth: 88,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => <StatusValueCell value={params.value} field="enCampo" />,
    },
    {
      field: 'enComida',
      headerName: 'En comida',
      minWidth: 92,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <StatusValueCell value={params.value} field="enComida" />
      ),
    },
    {
      field: 'enProyecto',
      headerName: 'En proyecto',
      minWidth: 98,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <StatusValueCell value={params.value} field="enProyecto" />
      ),
    },
    {
      field: 'sinReportar',
      headerName: 'Sin reportar',
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <StatusValueCell value={params.value} field="sinReportar" />
      ),
    },
    {
      field: 'vacaciones',
      headerName: 'Vacaciones',
      minWidth: 96,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <StatusValueCell value={params.value} field="vacaciones" />
      ),
    },
  ];

  const disponibilidadEfectiva =
    Number(dashboardData.resumen?.disponibilidadEfectiva) || 0;

  const agentesActivos = Number(dashboardData.resumen?.agentesActivos) || 0;
  const agentesTotales = Number(dashboardData.resumen?.agentesTotales) || 0;

  return (
    <DashboardLayout>
      <Box sx={{ width: '100%', pb: 3, zoom: 0.9 }}>
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, fontSize: '0.85rem', borderRadius: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={loadDashboard}
                disabled={loading}
              >
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* 1. TARJETAS KPI DE ESTATUS */}
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          {statusCards.map((card) => (
            <Grid key={card.id} size={{ xs: 12, sm: 6, lg: 4, xl: 2 }}>
              <StatusCard
                card={card}
                isSelected={selectedStatus === card.id}
                onClick={() => handleCardClick(card.id)}
              />
            </Grid>
          ))}
        </Grid>

        {/* 2. GRÁFICAS DE DISPONIBILIDAD Y REINCIDENCIAS */}
        <Paper
          sx={{
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 2.5,
            overflow: 'hidden',
            boxShadow: TOKENS.cardShadow,
            mb: 2.5,
          }}
        >
          <CardHead
            title="Disponibilidad y tendencias"
            hint="Porcentaje de disponibilidad efectiva por día · última semana"
          >
            <SegmentedControl value={period} onChange={setPeriod} />
          </CardHead>

          <Grid container>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 2,
                  borderRight: {
                    xs: 'none',
                    md: `1px solid ${TOKENS.divider}`,
                  },
                  borderBottom: { xs: `1px solid ${TOKENS.divider}`, md: 'none' },
                }}
              >
                <Typography
                  sx={{
                    mb: 1,
                    fontSize: '0.72rem',
                    color: TOKENS.text3,
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                  }}
                >
                  Disponibilidad por día
                </Typography>

                <Box sx={{ height: 210 }}>
                  {loading ? (
                    <Box
                      sx={{ height: '100%', display: 'grid', placeItems: 'center' }}
                    >
                      <CircularProgress size={30} />
                    </Box>
                  ) : (
                    <ReactECharts
                      option={availabilityOption}
                      style={{ height: '100%', width: '100%' }}
                    />
                  )}
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ p: 2 }}>
                <Typography
                  sx={{
                    mb: 1,
                    fontSize: '0.72rem',
                    color: TOKENS.text3,
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                  }}
                >
                  Reincidencia por estatus
                </Typography>

                <Box sx={{ height: 210 }}>
                  {loading ? (
                    <Box
                      sx={{ height: '100%', display: 'grid', placeItems: 'center' }}
                    >
                      <CircularProgress size={30} />
                    </Box>
                  ) : (
                    <ReactECharts
                      option={recurrenceOption}
                      style={{ height: '100%', width: '100%' }}
                    />
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* 3. TABLA DE VOLUMETRÍA DE ISM/MESA */}
        <Paper
          sx={{
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 2.5,
            overflow: 'hidden',
            boxShadow: TOKENS.cardShadow,
            mb: 2.5,
          }}
        >
          <CardHead
            title="Volumetría de ISM/MESA"
            hint={`Actividad y estatus por agente · periodo: ${period.toLowerCase()}`}
          >
            <Select
              size="small"
              value={selectedSite}
              onChange={(event) => setSelectedSite(event.target.value)}
              disabled={loadingSites}
              sx={{
                height: 34,
                minWidth: 170,
                fontSize: '0.78rem',
                fontWeight: 500,
                color: TOKENS.text2,
                bgcolor: '#F8FAFC',
                borderRadius: 1.25,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: TOKENS.border,
                },
              }}
            >
              <MenuItem value="todos">Todos los sitios</MenuItem>

              {sites.map((site) => (
                <MenuItem
                  key={site.id ?? site.id_sitio}
                  value={site.id ?? site.id_sitio}
                >
                  {site.nombre ?? site.nombre_sitio}
                </MenuItem>
              ))}
            </Select>

            <TextField
              size="small"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar ISM/MESA…"
              sx={{
                minWidth: { xs: '100%', sm: 220 },
                '& .MuiOutlinedInput-root': {
                  height: 34,
                  fontSize: '0.78rem',
                  bgcolor: '#F8FAFC',
                  borderRadius: 1.25,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined sx={{ fontSize: 17, color: TOKENS.text3 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Tooltip title="Actualizar dashboard">
              <span>
                <Button
                  onClick={loadDashboard}
                  disabled={loading}
                  sx={{
                    height: 34,
                    minWidth: 34,
                    p: 0,
                    border: `1px solid ${TOKENS.border}`,
                    borderRadius: 1.25,
                    color: TOKENS.text2,
                    bgcolor: '#FFFFFF',
                    '&:hover': { bgcolor: '#F8FAFC' },
                  }}
                >
                  <RefreshOutlined sx={{ fontSize: 17 }} />
                </Button>
              </span>
            </Tooltip>
          </CardHead>

          <Box sx={{ height: 260, width: '100%' }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              loading={loading}
              hideFooter
              disableRowSelectionOnClick
              rowHeight={38}
              columnHeaderHeight={42}
              getRowId={(row) => row.id ?? row.idIsmMesa ?? row.id_ism_mesa}
              localeText={{
                noRowsLabel: 'No hay información registrada para este periodo.',
              }}
              sx={{
                border: 0,
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#F8FAFC',
                  borderBottom: `1px solid ${TOKENS.border}`,
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  color: TOKENS.text3,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  whiteSpace: 'normal',
                  lineHeight: 1.2,
                  textAlign: 'center',
                },
                '& .MuiDataGrid-cell': {
                  borderColor: TOKENS.divider,
                  color: TOKENS.text2,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: '#F8FAFC',
                },
                '& .MuiDataGrid-footerContainer': {
                  display: 'none',
                },
              }}
            />
          </Box>
        </Paper>

        {/* 4. TARJETAS INFERIORES */}
        <Grid container spacing={2} alignItems="stretch">
          <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
            <Paper
              sx={{
                width: '100%',
                border: `1px solid ${TOKENS.border}`,
                borderRadius: 2.5,
                boxShadow: TOKENS.cardShadow,
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                flexWrap: 'wrap',
              }}
            >
              <MetricRing percentage={disponibilidadEfectiva} />

              <Box sx={{ minWidth: 150, flex: 1 }}>
                <Typography
                  sx={{ color: TOKENS.text, fontSize: '0.9rem', fontWeight: 700 }}
                >
                  Disponibilidad efectiva
                </Typography>
                <Typography
                  sx={{ mt: 0.5, color: TOKENS.text3, fontSize: '0.74rem' }}
                >
                  Promedio semanal del equipo
                </Typography>
                <Box sx={{ height: 64, mt: 1.5, minWidth: 160 }}>
                  <ReactECharts
                    option={compactAvailabilityOption}
                    style={{ height: '100%', width: '100%' }}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
            <Paper
              sx={{
                width: '100%',
                border: `1px solid ${TOKENS.border}`,
                borderRadius: 2.5,
                boxShadow: TOKENS.cardShadow,
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                flexWrap: 'wrap',
              }}
            >
              <Avatar
                variant="rounded"
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: '#EAF2FA',
                  color: '#1D6FB8',
                  borderRadius: 2,
                }}
              >
                <GroupsOutlined sx={{ fontSize: 30 }} />
              </Avatar>

              <Box sx={{ minWidth: 130, flex: 1 }}>
                <Stack direction="row" alignItems="baseline" spacing={0.8}>
                  <Typography
                    sx={{
                      color: TOKENS.text,
                      fontSize: '1.9rem',
                      fontWeight: 800,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {agentesActivos}
                  </Typography>
                  <Typography
                    sx={{
                      color: TOKENS.text,
                      fontSize: '0.9rem',
                      fontWeight: 700,
                    }}
                  >
                    Agentes activos
                  </Typography>
                </Stack>

                <Typography
                  sx={{ mt: 0.7, color: TOKENS.text3, fontSize: '0.74rem' }}
                >
                  De {agentesTotales} agentes totales
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 0.6,
                    mt: 1.5,
                    alignItems: 'center',
                  }}
                >
                  {Array.from({ length: Math.max(agentesTotales, 1) }).map(
                    (_, index) => (
                      <Avatar
                        key={index}
                        sx={{
                          width: 22,
                          height: 22,
                          fontSize: 0,
                          bgcolor:
                            index < agentesActivos
                              ? 'linear-gradient(135deg, #1D6FB8, #14406A)'
                              : '#E2E8F0',
                          background:
                            index < agentesActivos
                              ? 'linear-gradient(135deg, #1D6FB8, #14406A)'
                              : '#E2E8F0',
                          border: '1px solid #CBD5E1',
                        }}
                      >
                        A
                      </Avatar>
                    ),
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
}

export default DashboardPage;