import {
  BusinessCenterOutlined,
  GroupsOutlined,
  LocationOnOutlined,
  RestaurantOutlined,
  SentimentDissatisfiedOutlined,
  TodayOutlined,
  WarningAmberOutlined,
  WbSunnyOutlined,
} from '@mui/icons-material';

import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
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

const STATUS_CONFIG = [
  {
    id: 'mesa',
    field: 'enMesa',
    label: 'En mesa',
    color: '#0F9D58',
    lightColor: '#E9F8EF',
    icon: <GroupsOutlined />,
  },
  {
    id: 'campo',
    field: 'enCampo',
    label: 'En campo',
    color: '#1A73E8',
    lightColor: '#EAF3FF',
    icon: <LocationOnOutlined />,
  },
  {
    id: 'comida',
    field: 'enComida',
    label: 'En comida',
    color: '#F29900',
    lightColor: '#FFF6E8',
    icon: <RestaurantOutlined />,
  },
  {
    id: 'proyecto',
    field: 'enProyecto',
    label: 'En proyecto',
    color: '#7E57C2',
    lightColor: '#F3EEFF',
    icon: <BusinessCenterOutlined />,
  },
  {
    id: 'sin_reportar',
    field: 'sinReportar',
    label: 'Sin reportar',
    color: '#E53935',
    lightColor: '#FFF0F0',
    icon: <WarningAmberOutlined />,
  },
  {
    id: 'vacaciones',
    field: 'vacaciones',
    label: 'En vacaciones',
    color: '#00A7B5',
    lightColor: '#E8FAFC',
    icon: <WbSunnyOutlined />,
  },
];

const STATUS_COLOR_BY_FIELD = {
  enMesa: '#0F9D58',
  enCampo: '#1A73E8',
  enComida: '#F29900',
  enProyecto: '#7E57C2',
  sinReportar: '#E53935',
  vacaciones: '#00A7B5',
};

const RECURRENCE_CONFIG = [
  { id: 'sin_reportar', label: 'Sin reportar', color: '#E53935' },
  { id: 'campo', label: 'En campo', color: '#35A96B' },
  { id: 'comida', label: 'En comida', color: '#F29900' },
  { id: 'proyecto', label: 'En proyecto', color: '#7E57C2' },
  { id: 'mesa', label: 'En mesa', color: '#1A73E8' },
  { id: 'vacaciones', label: 'En vacaciones', color: '#00A7B5' },
];

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

/* =========================================================
   TARJETAS SUPERIORES CON LAS MEDIDAS EXACTAS DE ONSITE (108px)
   ========================================================= */
function StatusCard({ card, isSelected, onClick }) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        position: 'relative',
        height: 108,
        overflow: 'hidden',
        border: isSelected ? `2px solid ${card.color}` : '1px solid #E7EDF4',
        borderRadius: 1.5,
        boxShadow: isSelected
          ? `0 0 0 3px ${card.lightColor}`
          : '0 1px 3px rgba(15, 23, 42, 0.08)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 180ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: card.color,
          boxShadow: '0 5px 14px rgba(15, 23, 42, 0.12)',
        },
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
            bgcolor: card.lightColor,
            color: card.color,
            flexShrink: 0,
            '& svg': { fontSize: 27 },
          }}
        >
          {card.icon}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              color: '#334155',
              fontSize: '0.94rem',
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {card.label}
          </Typography>

          <Typography
            sx={{
              mt: 0.65,
              color: card.color,
              fontSize: '1.78rem',
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {card.value}
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
          bgcolor: card.color,
        }}
      />
    </Paper>
  );
}

function MetricCircle({ percentage }) {
  const safePercentage = Math.max(0, Math.min(Number(percentage) || 0, 100));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = (safePercentage / 100) * circumference;

  return (
    <Box sx={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="7"
        />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="#35A96B"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform="rotate(-90 42 42)"
        />
      </svg>

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Typography
          sx={{
            color: '#237C4E',
            fontWeight: 800,
            fontSize: '0.92rem',
          }}
        >
          {safePercentage}%
        </Typography>
      </Box>
    </Box>
  );
}

function StatusValueCell({ value, field }) {
  const safeValue = Number(value) || 0;

  return (
    <Typography
      sx={{
        color: safeValue > 0 ? STATUS_COLOR_BY_FIELD[field] : '#CBD5E1',
        fontSize: '0.82rem',
        fontWeight: safeValue > 0 ? 800 : 600,
      }}
    >
      {safeValue}
    </Typography>
  );
}

function DashboardPage() {
  const [period, setPeriod] = useState('Mes');
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

  const availabilityOption = useMemo(() => {
    const labels = dashboardData.disponibilidad.map(
      (item) => item.dia || item.fecha || '',
    );

    const values = dashboardData.disponibilidad.map(
      (item) => Number(item.porcentaje ?? item.disponibilidad ?? 0),
    );

    return {
      animationDuration: 600,
      grid: {
        left: 42,
        right: 22,
        top: 30,
        bottom: 28,
      },
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
        axisLine: { lineStyle: { color: '#E2E8F0' } },
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
          lineStyle: { color: '#1A73E8', width: 2.5 },
          itemStyle: { color: '#1A73E8' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(26, 115, 232, 0.22)' },
                { offset: 1, color: 'rgba(26, 115, 232, 0.01)' },
              ],
            },
          },
        },
      ],
    };
  }, [dashboardData.disponibilidad]);

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
      grid: {
        left: 95,
        right: 40,
        top: 22,
        bottom: 28,
      },
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

  const compactAvailabilityOption = useMemo(() => {
    const labels = dashboardData.disponibilidad.map(
      (item) => item.dia || item.fecha || '',
    );

    const values = dashboardData.disponibilidad.map(
      (item) => Number(item.porcentaje ?? item.disponibilidad ?? 0),
    );

    return {
      animation: false,
      grid: {
        left: 0,
        right: 0,
        top: 8,
        bottom: 18,
      },
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
          lineStyle: { width: 2, color: '#35A96B' },
          itemStyle: { color: '#35A96B' },
          areaStyle: { color: 'rgba(53, 169, 107, 0.08)' },
        },
      ],
    };
  }, [dashboardData.disponibilidad]);

  const columns = [
    {
      field: 'ism',
      headerName: 'ISM/MESA',
      minWidth: 220,
      flex: 1.5,
      renderCell: (params) => (
        <Typography
          sx={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: '#173B66',
          }}
        >
          {params.value || 'Sin asignar'}
        </Typography>
      ),
    },
    {
      field: 'tareasCampo',
      headerName: 'Tareas campo',
      minWidth: 115,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => Number(params.value) || 0,
    },
    {
      field: 'incidentesMesa',
      headerName: 'Incidentes cerrados en mesa',
      minWidth: 180,
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
      minWidth: 84,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <StatusValueCell value={params.value} field="enMesa" />
      ),
    },
    {
      field: 'enCampo',
      headerName: 'En campo',
      minWidth: 88,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <StatusValueCell value={params.value} field="enCampo" />
      ),
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
      minWidth: 105,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <StatusValueCell value={params.value} field="sinReportar" />
      ),
    },
    {
      field: 'vacaciones',
      headerName: 'Vacaciones',
      minWidth: 100,
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
      <Box sx={{ width: '100%', pb: 3 }}>
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, fontSize: '0.85rem' }}
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

        {/* 1. TARJETAS DE ESTADO SUPERIORES (IGUAL A ONSITE) */}
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
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
            border: '1px solid #E7EDF4',
            borderRadius: 1.5,
            overflow: 'hidden',
            mb: 1.5,
          }}
        >
          <Box sx={{ px: 2, pt: 1.75 }}>
            <Typography
              sx={{
                color: '#183B63',
                fontSize: '0.94rem',
                fontWeight: 800,
              }}
            >
              Disponibilidad y tendencias
            </Typography>
          </Box>

          <Grid container>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 2,
                  borderRight: {
                    xs: 'none',
                    md: '1px solid #E7EDF4',
                  },
                  borderBottom: {
                    xs: '1px solid #E7EDF4',
                    md: 'none',
                  },
                }}
              >
                <Typography
                  sx={{
                    mb: 0.8,
                    fontSize: '0.82rem',
                    color: '#334155',
                    fontWeight: 700,
                  }}
                >
                  Disponibilidad por día
                </Typography>

                <Box sx={{ height: 210 }}>
                  {loading ? (
                    <Box
                      sx={{
                        height: '100%',
                        display: 'grid',
                        placeItems: 'center',
                      }}
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
                    mb: 0.8,
                    fontSize: '0.82rem',
                    color: '#334155',
                    fontWeight: 700,
                  }}
                >
                  Reincidencia por estatus
                </Typography>

                <Box sx={{ height: 210 }}>
                  {loading ? (
                    <Box
                      sx={{
                        height: '100%',
                        display: 'grid',
                        placeItems: 'center',
                      }}
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
            border: '1px solid #E7EDF4',
            borderRadius: 1.5,
            overflow: 'hidden',
            mb: 1.5,
          }}
        >
          <Box
            sx={{
              p: 2,
              pb: 1.5,
              display: 'flex',
              alignItems: { xs: 'flex-start', lg: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: 2,
            }}
          >
            <Typography
              sx={{
                color: '#183B63',
                fontSize: '0.94rem',
                fontWeight: 800,
              }}
            >
              Volumetría de ISM/MESA
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.2}
              sx={{ width: { xs: '100%', lg: 'auto' } }}
            >
              <Stack direction="row" spacing={0.6}>
                {['Mes', 'Semana', 'Día'].map((periodOption) => (
                  <Button
                    key={periodOption}
                    size="small"
                    variant={period === periodOption ? 'contained' : 'text'}
                    onClick={() => setPeriod(periodOption)}
                    sx={{
                      minWidth: 62,
                      py: 0.7,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      borderRadius: 1,
                      color: period === periodOption ? '#FFFFFF' : '#334155',
                      bgcolor:
                        period === periodOption ? '#003359' : 'transparent',
                      '&:hover': {
                        bgcolor:
                          period === periodOption
                            ? '#002642'
                            : 'rgba(0, 51, 89, 0.06)',
                      },
                    }}
                  >
                    {periodOption}
                  </Button>
                ))}
              </Stack>

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={selectedSite}
                  onChange={(event) => setSelectedSite(event.target.value)}
                  disabled={loadingSites}
                  sx={{
                    height: 38,
                    fontSize: '0.82rem',
                    color: '#475569',
                    bgcolor: '#FFFFFF',
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
              </FormControl>

              <TextField
                size="small"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar ISM/MESA..."
                sx={{
                  minWidth: { xs: '100%', sm: 220 },
                  '& .MuiOutlinedInput-root': {
                    height: 38,
                    fontSize: '0.82rem',
                  },
                }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <SentimentDissatisfiedOutlined
                          sx={{
                            fontSize: 18,
                            color: '#94A3B8',
                            transform: 'rotate(180deg)',
                          }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Tooltip title="Actualizar dashboard">
                <span>
                  <IconButton
                    size="small"
                    onClick={loadDashboard}
                    disabled={loading}
                    sx={{
                      border: '1px solid #D9E2EC',
                      borderRadius: 1,
                      width: 38,
                      height: 38,
                      color: '#64748B',
                    }}
                  >
                    <TodayOutlined sx={{ fontSize: 20 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Box>

          <Divider sx={{ borderColor: '#E7EDF4' }} />

          <Box sx={{ height: 260, width: '100%' }}>
            <DataGrid
              rows={filteredRows}
              columns={columns}
              loading={loading}
              hideFooter
              disableRowSelectionOnClick
              rowHeight={34}
              columnHeaderHeight={40}
              getRowId={(row) => row.id ?? row.idIsmMesa ?? row.id_ism_mesa}
              localeText={{
                noRowsLabel: 'No hay información registrada para este periodo.',
              }}
              sx={{
                border: 0,
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#F7F9FC',
                  borderBottom: '1px solid #E7EDF4',
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  color: '#334155',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  whiteSpace: 'normal',
                  lineHeight: 1.15,
                  textAlign: 'center',
                },
                '& .MuiDataGrid-cell': {
                  borderColor: '#EDF1F5',
                  color: '#475569',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: '#F8FBFF',
                },
                '& .MuiDataGrid-footerContainer': {
                  display: 'none',
                },
              }}
            />
          </Box>
        </Paper>

        {/* 4. TARJETAS INFERIORES */}
        <Grid container spacing={1.5} alignItems="stretch">
          <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
            <Paper
              sx={{
                width: '100%',
                minHeight: 110,
                border: '1px solid #E7EDF4',
                borderRadius: 1.5,
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <MetricCircle percentage={disponibilidadEfectiva} />

              <Box sx={{ minWidth: 150 }}>
                <Typography
                  sx={{
                    color: '#183B63',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                  }}
                >
                  Disponibilidad efectiva
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    color: '#64748B',
                    fontSize: '0.76rem',
                  }}
                >
                  Promedio semanal
                </Typography>
              </Box>

              <Box sx={{ height: 75, flex: 1, minWidth: 160 }}>
                <ReactECharts
                  option={compactAvailabilityOption}
                  style={{ height: '100%', width: '100%' }}
                />
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
            <Paper
              sx={{
                width: '100%',
                minHeight: 110,
                border: '1px solid #E7EDF4',
                borderRadius: 1.5,
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Avatar
                variant="rounded"
                sx={{
                  width: 58,
                  height: 58,
                  bgcolor: '#EAF3FF',
                  color: '#1A73E8',
                  borderRadius: 1.5,
                }}
              >
                <GroupsOutlined sx={{ fontSize: 32 }} />
              </Avatar>

              <Box sx={{ minWidth: 130 }}>
                <Stack direction="row" alignItems="baseline" spacing={0.8}>
                  <Typography
                    sx={{
                      color: '#173B66',
                      fontSize: '1.85rem',
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {agentesActivos}
                  </Typography>

                  <Typography
                    sx={{
                      color: '#183B63',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                    }}
                  >
                    Agentes activos
                  </Typography>
                </Stack>

                <Typography
                  sx={{
                    mt: 0.6,
                    color: '#64748B',
                    fontSize: '0.76rem',
                  }}
                >
                  De {agentesTotales} agentes totales
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.6,
                  flex: 1,
                  alignItems: 'center',
                }}
              >
                {Array.from({ length: Math.max(agentesTotales, 1) }).map((_, index) => (
                  <Avatar
                    key={index}
                    sx={{
                      width: 20,
                      height: 20,
                      fontSize: 0,
                      bgcolor: index < agentesActivos ? '#003359' : '#E2E8F0',
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    A
                  </Avatar>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
}

export default DashboardPage;