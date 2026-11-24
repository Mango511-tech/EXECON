import { DownloadOutlined, RefreshOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
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
import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '../api/client';
import usePolling from '../hooks/usePolling';
import DashboardLayout from '../layouts/DashboardLayout';

const JORNADA_MINUTOS = 9 * 60;

const cardSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(10,37,64,.12)',
};

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatMinutes(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function Kpi({ label, value, color }) {
  return (
    <Paper sx={{ ...cardSx, p: 1.75 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.6, color, fontSize: '1.7rem', fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
    </Paper>
  );
}

export default function WorkHoursPage() {
  const [fecha, setFecha] = useState(hoy());
  const [filtro, setFiltro] = useState('todos');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get('/jornada/horas', { params: { fecha } });
      setRows(Array.isArray(response.data?.data) ? response.data.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'No fue posible consultar las horas de jornada.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    load();
  }, [load]);

  // Solo se refresca solo cuando se mira el día de hoy
  usePolling(
    useCallback(() => {
      if (fecha === hoy()) load(true);
    }, [fecha, load]),
    30000,
  );

  const conRegistro = useMemo(() => rows.filter((r) => r.entrada), [rows]);
  const cumplieron = conRegistro.filter((r) => r.cumplio).length;
  const noCumplieron = conRegistro.length - cumplieron;
  const promedio = conRegistro.length
    ? conRegistro.reduce((sum, r) => sum + r.minutos, 0) / conRegistro.length
    : 0;

  const visibles = rows.filter((r) => {
    if (filtro === 'cumplieron') return r.entrada && r.cumplio;
    if (filtro === 'no') return !r.entrada || !r.cumplio;
    return true;
  });

  const exportar = () => {
    const header = ['Ingeniero', 'Fecha', 'Entrada', 'Salida', 'Comida (min)', 'Horas de jornada', 'Cumplió 9 h'];
    const lines = visibles.map((r) => [
      r.nombre, fecha, r.entrada || '', r.salida || (r.enCurso ? 'En curso' : ''), r.comidaMin,
      formatMinutes(r.minutos), r.entrada ? (r.cumplio ? 'Sí' : 'No') : 'Sin registro',
    ]);
    const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `horas_jornada_${fecha}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <Box sx={{ pt: 1, pb: 3 }}>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.25, mb: 1.75 }}>
          <Kpi label="Ingenieros con registro" value={conRegistro.length} color="#003359" />
          <Kpi label="Cumplieron 9 h" value={cumplieron} color="#16A34A" />
          <Kpi label="No cumplieron" value={noCumplieron} color="#D97706" />
          <Kpi label="Promedio de horas" value={formatMinutes(promedio)} color="#1D6FB8" />
        </Box>

        <Paper sx={{ ...cardSx, p: { xs: 1.5, md: 2 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, color: '#003359', fontSize: '1.05rem' }}>Horas de jornada por ingeniero</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                Tiempo entre entrada y salida (la comida cuenta dentro de las 9 h) contra la jornada completa.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              <TextField
                size="small"
                type="date"
                value={fecha}
                onChange={(e) => e.target.value && setFecha(e.target.value)}
                slotProps={{ htmlInput: { max: hoy() } }}
              />
              <Select size="small" value={filtro} onChange={(e) => setFiltro(e.target.value)} sx={{ minWidth: 150 }}>
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="cumplieron">Cumplieron</MenuItem>
                <MenuItem value="no">No cumplieron</MenuItem>
              </Select>
              <Button size="small" variant="outlined" startIcon={<RefreshOutlined />} onClick={() => load()}>Actualizar</Button>
              <Button size="small" variant="contained" startIcon={<DownloadOutlined />} onClick={exportar} sx={{ bgcolor: '#003359' }}>
                Exportar
              </Button>
            </Stack>
          </Stack>

          {loading ? (
            <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress size={26} /></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    {['Ingeniero', 'Entrada', 'Salida', 'Comida', 'Horas de jornada', 'Avance de 9 h', 'Resultado'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.74rem', color: '#475569' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibles.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No hay registros para mostrar.</TableCell></TableRow>
                  )}
                  {visibles.map((r) => {
                    const pct = Math.min(100, Math.round((r.minutos / JORNADA_MINUTOS) * 100));
                    return (
                      <TableRow key={r.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{r.nombre}</TableCell>
                        <TableCell>{r.entrada || '—'}</TableCell>
                        <TableCell>{r.salida || (r.enCurso ? 'En curso' : '—')}</TableCell>
                        <TableCell>{r.comidaMin ? `${r.comidaMin} min` : '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{r.entrada ? formatMinutes(r.minutos) : '—'}</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{ flex: 1, height: 7, borderRadius: 4, bgcolor: '#E2E8F0', '& .MuiLinearProgress-bar': { bgcolor: r.cumplio ? '#16A34A' : '#D97706' } }}
                            />
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, width: 38 }}>{pct}%</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {!r.entrada ? (
                            <Chip size="small" label="Sin registro" sx={{ bgcolor: '#EEF2F6', color: '#64748B', fontWeight: 700 }} />
                          ) : r.cumplio ? (
                            <Chip size="small" label="Cumplió" sx={{ bgcolor: '#E9F9F1', color: '#0E9F6E', fontWeight: 700 }} />
                          ) : (
                            <Chip size="small" label={r.enCurso ? 'En curso' : 'No cumplió'} sx={{ bgcolor: '#FDF3E3', color: '#B45309', fontWeight: 700 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </DashboardLayout>
  );
}
