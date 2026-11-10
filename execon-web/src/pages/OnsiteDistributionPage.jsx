import {
  AccessTimeOutlined,
  AddOutlined,
  AddTaskOutlined,
  AssignmentOutlined,
  EditOutlined,
  HeadsetMicOutlined,
  PersonOutlineOutlined,
  SearchOutlined,
  SendOutlined,
} from '@mui/icons-material';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
).replace(/\/+$/, '');

const TOKENS = {
  primary: '#003359',
  border: '#E2E8F0',
  divider: '#EDF2F7',
  text: '#0F172A',
  text2: '#475569',
  text3: '#94A3B8',
  cardShadow: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -12px rgba(10,37,64,.12)',
};

const EMPTY_INCIDENT_FORM = {
  id: null,
  folio: '',
  idSitio: '',
  nombreSitio: '',
  plaza: '',
  municipio: '',
  estado: '',
  compania: '',
  servicio: '',
  resumen: '',
  descripcion: '',
  prioridad: '3',
  idIsmAsignado: '',
};

function formatDuration(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(m / 60);
  const rem = m % 60;
  return hours > 0 ? `${hours}h ${rem}m` : `${rem}m`;
}

/* Chips de estatus con punto de color (estilo boceto) */
function getStatusStyle(status) {
  const clean = String(status || '').trim().toUpperCase();
  if (clean === 'PENDIENTE') return { label: 'Pendiente', background: '#FDF3E3', color: '#92400E' };
  if (clean === 'EN ATENCION' || clean === 'ENATENCION') return { label: 'En atención', background: '#E9F9F1', color: '#067A55' };
  if (clean === 'FINALIZADO') return { label: 'Finalizado', background: '#EAF2FA', color: '#155E9C' };
  return { label: status || 'Pendiente', background: '#EEF2F6', color: '#475569' };
}

/* ===================== COMPONENTES DE DISEÑO ===================== */

/* Tarjeta KPI (estilo boceto: etiqueta mayúscula, número grande, icono tintado) */
function KpiCard({ icon, label, value, sub, color, background }) {
  return (
    <Paper
      sx={{
        height: 118,
        overflow: 'hidden',
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 2.5,
        boxShadow: TOKENS.cardShadow,
        p: 1.75,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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
          {label}
        </Typography>

        <Box
          sx={{
            width: 36,
            height: 36,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 1.75,
            bgcolor: background,
            color,
            flexShrink: 0,
            '& svg': { fontSize: 19 },
          }}
        >
          {icon}
        </Box>
      </Box>

      <Typography
        sx={{
          color,
          fontSize: '1.7rem',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </Typography>

      <Typography sx={{ mt: 0.5, color: TOKENS.text3, fontSize: '0.64rem', fontWeight: 500 }}>
        {sub}
      </Typography>
    </Paper>
  );
}

/* Encabezado de página con acción principal */
function PageHeader({ title, subtitle, action }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ mb: 2.5 }}
    >
      <Box>
        <Typography sx={{ color: TOKENS.text, fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          {title}
        </Typography>
        <Typography sx={{ color: TOKENS.text3, fontSize: '0.78rem', mt: 0.4 }}>
          {subtitle}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
}

/* Encabezado de tarjeta de sección */
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

/* Indicador de pasos de la asignación */
function AssignStepper({ hasAgent, hasFolio }) {
  const steps = [
    { n: 1, label: 'Seleccionar agente', done: hasAgent },
    { n: 2, label: 'Ingresar folio', done: hasFolio },
    { n: 3, label: 'Confirmar', done: hasAgent && hasFolio },
  ];

  return (
    <Stack direction="row" alignItems="center" spacing={1.2}>
      {steps.map((step, index) => (
        <Stack key={step.n} direction="row" alignItems="center" spacing={1.2}>
          <Stack direction="row" alignItems="center" spacing={0.7}>
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.62rem',
                fontWeight: 700,
                bgcolor: step.done ? '#E9F9F1' : TOKENS.primary,
                color: step.done ? '#067A55' : '#FFFFFF',
                transition: 'all 200ms ease',
              }}
            >
              {step.n}
            </Box>
            <Typography
              sx={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: step.done ? '#067A55' : TOKENS.text3,
                whiteSpace: 'nowrap',
              }}
            >
              {step.label}
            </Typography>
          </Stack>
          {index < steps.length - 1 && (
            <Box sx={{ width: 16, height: 1.5, bgcolor: '#CBD5E1', borderRadius: 2 }} />
          )}
        </Stack>
      ))}
    </Stack>
  );
}

/* Etiqueta pequeña de campo dentro de las tarjetas punteadas */
function FieldLabel({ text }) {
  return (
    <Typography
      sx={{
        mb: 1,
        fontSize: '0.64rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: TOKENS.text3,
      }}
    >
      {text}
    </Typography>
  );
}

function OnsiteDistributionPage() {
  const [engineers, setEngineers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loadingEngineers, setLoadingEngineers] = useState(true);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [message, setMessage] = useState(null);

  // Modal Crear / Editar Incidente
  const [openModal, setOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [incidentForm, setIncidentForm] = useState(EMPTY_INCIDENT_FORM);
  const [savingIncident, setSavingIncident] = useState(false);

  const loadEngineers = useCallback(async () => {
    setLoadingEngineers(true);
    try {
      const token = localStorage.getItem('execon_token');
      const response = await fetch(`${API_URL}/ingenieros`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'No fue posible cargar los agentes.');
      setEngineers(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setEngineers([]);
      setMessage({ severity: 'error', text: error.message || 'Error al cargar agentes.' });
    } finally {
      setLoadingEngineers(false);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    setLoadingIncidents(true);
    try {
      const token = localStorage.getItem('execon_token');
      const response = await fetch(`${API_URL}/incidentes`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(result.data)) {
        setIncidents(result.data);
      } else {
        setIncidents([]);
      }
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

  const availableEngineers = useMemo(() => {
    return engineers.filter((e) => String(e.estatus || '').toLowerCase() === 'mesa' || !e.estatus);
  }, [engineers]);

  const filteredIncidents = useMemo(() => {
    const normalized = tableSearch.trim().toLowerCase();
    return incidents.filter((item) => {
      const matchSearch =
        !normalized ||
        item.folio?.toLowerCase().includes(normalized) ||
        item.incidente?.toLowerCase().includes(normalized) ||
        item.resumen?.toLowerCase().includes(normalized) ||
        item.ismMesa?.toLowerCase().includes(normalized) ||
        item.ubicacion?.toLowerCase().includes(normalized);

      const matchStatus = statusFilter === 'TODOS' || item.estatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [incidents, tableSearch, statusFilter]);

  const summary = useMemo(() => {
    const disponibles = availableEngineers.length;
    const pendientes = incidents.filter((i) => i.estatus === 'PENDIENTE').length;
    const enAtencion = incidents.filter((i) => i.estatus === 'EN ATENCION' || i.estatus === 'ENATENCION').length;
    const finalizados = incidents.filter((i) => i.estatus === 'FINALIZADO').length;
    const totalDurationMinutes = incidents.reduce((acc, curr) => acc + (curr.duracionMinutos || 0), 0);
    const averageMinutes = incidents.length > 0 ? Math.round(totalDurationMinutes / incidents.length) : 0;

    return { disponibles, pendientes, enAtencion, finalizados, averageMinutes };
  }, [availableEngineers, incidents]);

  // ASIGNAR ONSITE DIRECTAMENTE DESDE EL PANEL SUPERIOR
  const handleAssignOnsiteDirect = async () => {
    if (!selectedEngineer) {
      setMessage({ severity: 'warning', text: 'Selecciona un agente ISM/MESA disponible.' });
      return;
    }
    if (!incidentSearch.trim()) {
      setMessage({ severity: 'warning', text: 'Escribe el folio del incidente a asignar.' });
      return;
    }

    const targetIncident = incidents.find(
      (i) => String(i.folio).trim().toLowerCase() === incidentSearch.trim().toLowerCase()
    );

    if (targetIncident) {
      try {
        const token = localStorage.getItem('execon_token');
        const response = await fetch(`${API_URL}/incidentes/${targetIncident.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            idIsmAsignado: selectedEngineer,
            estatus: 'EN ATENCION',
          }),
        });

        if (!response.ok) throw new Error('No se pudo asignar el incidente.');
        setMessage({ severity: 'success', text: `Incidente #${targetIncident.folio} asignado exitosamente (Estatus: En atención).` });
        setSelectedEngineer('');
        setIncidentSearch('');
        loadIncidents();
        loadEngineers();
      } catch (err) {
        setMessage({ severity: 'error', text: err.message || 'Error al asignar incidente.' });
      }
    } else {
      setIncidentForm({
        ...EMPTY_INCIDENT_FORM,
        folio: incidentSearch.trim(),
        idIsmAsignado: selectedEngineer,
      });
      setIsEditing(false);
      setOpenModal(true);
    }
  };

  // CREAR O EDITAR INCIDENTE MEDIANTE MODAL
  const handleSaveIncident = async (e) => {
    e.preventDefault();
    if (!incidentForm.folio.trim() || !incidentForm.resumen.trim()) {
      setMessage({ severity: 'error', text: 'Folio y resumen son obligatorios.' });
      return;
    }

    setSavingIncident(true);
    try {
      const userStored = JSON.parse(localStorage.getItem('execon_usuario') || '{}');
      const token = localStorage.getItem('execon_token');

      const url = isEditing ? `${API_URL}/incidentes/${incidentForm.id}` : `${API_URL}/incidentes`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...incidentForm,
          asignadoPor: userStored.id || null,
          estatus: incidentForm.idIsmAsignado ? 'EN ATENCION' : 'PENDIENTE',
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'No fue posible guardar el incidente.');

      setMessage({
        severity: 'success',
        text: isEditing
          ? `Incidente #${incidentForm.folio} actualizado correctamente.`
          : `Incidente #${incidentForm.folio} registrado correctamente.`,
      });

      setOpenModal(false);
      setIncidentForm(EMPTY_INCIDENT_FORM);
      setIsEditing(false);
      loadIncidents();
      loadEngineers();
    } catch (err) {
      setMessage({ severity: 'error', text: err.message || 'Error al guardar incidente.' });
    } finally {
      setSavingIncident(false);
    }
  };

  const handleOpenEdit = (incident) => {
    setIncidentForm({
      id: incident.id,
      folio: incident.folio || '',
      idSitio: incident.idSitio || '',
      nombreSitio: incident.ubicacion || incident.nombreSitio || '',
      plaza: incident.plaza || '',
      municipio: incident.municipio || '',
      estado: incident.estado || '',
      compania: incident.compania || '',
      servicio: incident.servicio || '',
      resumen: incident.incidente || incident.resumen || '',
      descripcion: incident.descripcion || '',
      prioridad: incident.prioridad ? String(incident.prioridad).replace(/^P/i, '') : '3',
      idIsmAsignado: incident.idIsmMesa || incident.id_ism_asignado || '',
    });
    setIsEditing(true);
    setOpenModal(true);
  };

  const selectedEngineerName = useMemo(() => {
    const eng = availableEngineers.find((e) => String(e.id) === String(selectedEngineer));
    return eng?.nombre || null;
  }, [availableEngineers, selectedEngineer]);

  return (
    <DashboardLayout>
      <Box sx={{ pb: 3 }}>
        {/* ENCABEZADO DE PÁGINA */}
        <PageHeader
          title="Distribución de Onsite"
          subtitle="Registro, asignación y seguimiento de servicios en campo"
          action={
            <Button
              variant="outlined"
              startIcon={<AddOutlined />}
              onClick={() => {
                setIncidentForm(EMPTY_INCIDENT_FORM);
                setIsEditing(false);
                setOpenModal(true);
              }}
              sx={{
                borderColor: TOKENS.primary,
                color: TOKENS.primary,
                fontWeight: 700,
                textTransform: 'none',
                minHeight: 40,
                px: 2,
                borderRadius: 1.5,
                '&:hover': {
                  bgcolor: '#EAF2FA',
                  borderColor: '#00223D',
                },
              }}
            >
              Crear incidente
            </Button>
          }
        />

        {/* TARJETAS KPI */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 1.5,
            mb: 2.5,
          }}
        >
          <KpiCard
            icon={<PersonOutlineOutlined />}
            label="Disponibles en mesa"
            value={summary.disponibles}
            sub="Listos para recibir asignación"
            color="#155E9C"
            background="#EAF2FA"
          />
          <KpiCard
            icon={<AddTaskOutlined />}
            label="Onsites pendientes"
            value={summary.pendientes}
            sub="Sin técnico asignado"
            color="#92400E"
            background="#FDF3E3"
          />
          <KpiCard
            icon={<HeadsetMicOutlined />}
            label="En atención"
            value={summary.enAtencion}
            sub="Servicios activos ahora"
            color="#067A55"
            background="#E9F9F1"
          />
          <KpiCard
            icon={<AccessTimeOutlined />}
            label="Tiempo promedio"
            value={formatDuration(summary.averageMinutes)}
            sub="Duración de atención"
            color="#5546A5"
            background="#EFEDFA"
          />
        </Box>

        {/* ASIGNACIÓN RÁPIDA DE ONSITE */}
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
            title="Asignación rápida de Onsite"
            hint="Vincula un incidente con un técnico disponible en tres pasos"
          >
            <AssignStepper
              hasAgent={Boolean(selectedEngineer)}
              hasFolio={Boolean(incidentSearch.trim())}
            />
          </CardHead>

          <Box
            sx={{
              p: 2.25,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                lg: 'minmax(260px, 1fr) minmax(300px, 1.25fr) auto',
              },
              gap: 1.75,
              alignItems: 'stretch',
            }}
          >
            {/* Paso 1: Agente disponible */}
            <Box
              sx={{
                border: '1.5px dashed #C7D5E4',
                borderRadius: 2,
                p: 1.75,
                bgcolor: '#FBFDFE',
              }}
            >
              <FieldLabel text="ISM / MESA disponible" />
              <FormControl fullWidth size="small">
                <InputLabel id="engineer-select-label">Selecciona un agente</InputLabel>
                <Select
                  labelId="engineer-select-label"
                  value={selectedEngineer}
                  label="Selecciona un agente"
                  onChange={(e) => setSelectedEngineer(e.target.value)}
                  disabled={loadingEngineers}
                  sx={{
                    bgcolor: '#F8FAFC',
                    borderRadius: 1.5,
                    fontSize: '0.85rem',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: TOKENS.border },
                  }}
                >
                  <MenuItem value="">Sin seleccionar</MenuItem>
                  {availableEngineers.map((eng) => (
                    <MenuItem key={eng.id} value={eng.id}>
                      {eng.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography sx={{ mt: 1, fontSize: '0.68rem', color: TOKENS.text3 }}>
                Solo se muestran agentes en estatus “En mesa”.
              </Typography>
            </Box>

            {/* Paso 2: Folio del incidente */}
            <Box
              sx={{
                border: '1.5px dashed #C7D5E4',
                borderRadius: 2,
                p: 1.75,
                bgcolor: '#FBFDFE',
              }}
            >
              <FieldLabel text="Incidente por folio" />
              <TextField
                value={incidentSearch}
                onChange={(e) => setIncidentSearch(e.target.value)}
                placeholder="Ej. 2038164"
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    sx: {
                      fontFamily: '"Cascadia Code", "Consolas", monospace',
                      letterSpacing: '0.03em',
                      fontSize: '0.9rem',
                    },
                    endAdornment: (
                      <InputAdornment position="end">
                        <SearchOutlined sx={{ color: TOKENS.text3, fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#F8FAFC',
                    borderRadius: 1.5,
                  },
                }}
              />
              <Typography sx={{ mt: 1, fontSize: '0.68rem', color: TOKENS.text3 }}>
                Si el folio no existe, se abrirá el formulario para registrarlo.
              </Typography>
            </Box>

            {/* Paso 3: Confirmar */}
            <Button
              variant="contained"
              startIcon={<SendOutlined />}
              onClick={handleAssignOnsiteDirect}
              disabled={loadingEngineers}
              sx={{
                minHeight: 48,
                px: 3,
                alignSelf: 'center',
                bgcolor: TOKENS.primary,
                textTransform: 'none',
                fontSize: '0.88rem',
                fontWeight: 700,
                borderRadius: 1.5,
                boxShadow: '0 6px 14px -6px rgba(0,51,89,.5)',
                '&:hover': { bgcolor: '#00223D' },
                '&.Mui-disabled': { bgcolor: '#94A3B8' },
              }}
            >
              Asignar onsite
            </Button>
          </Box>
        </Paper>

        {message && (
          <Alert
            severity={message.severity}
            onClose={() => setMessage(null)}
            sx={{ mb: 2, borderRadius: 2, fontSize: '0.85rem' }}
          >
            {message.text}
          </Alert>
        )}

        {/* TABLA CONCENTRADORA */}
        <Paper
          sx={{
            border: `1px solid ${TOKENS.border}`,
            borderRadius: 2.5,
            overflow: 'hidden',
            boxShadow: TOKENS.cardShadow,
          }}
        >
          <CardHead
            title="Tabla concentradora de Onsite"
            hint={`${filteredIncidents.length} de ${incidents.length} servicios registrados`}
          >
            <TextField
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Buscar por folio, incidente o ubicación…"
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined sx={{ fontSize: 17, color: TOKENS.text3 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                minWidth: { xs: '100%', sm: 280 },
                '& .MuiOutlinedInput-root': {
                  height: 36,
                  fontSize: '0.8rem',
                  bgcolor: '#F8FAFC',
                  borderRadius: 1.25,
                },
              }}
            />
            <Select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{
                height: 36,
                minWidth: 165,
                fontSize: '0.8rem',
                fontWeight: 500,
                color: TOKENS.text2,
                bgcolor: '#F8FAFC',
                borderRadius: 1.25,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: TOKENS.border },
              }}
            >
              <MenuItem value="TODOS">Todos los estatus</MenuItem>
              <MenuItem value="PENDIENTE">Pendientes</MenuItem>
              <MenuItem value="EN ATENCION">En atención</MenuItem>
              <MenuItem value="FINALIZADO">Finalizados</MenuItem>
            </Select>
          </CardHead>

          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                minWidth: 900,
                borderCollapse: 'collapse',
                '& th': {
                  py: 1.25,
                  px: 1.75,
                  color: TOKENS.text3,
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  bgcolor: '#F8FAFC',
                  borderBottom: `1px solid ${TOKENS.border}`,
                },
                '& td': {
                  py: 1.35,
                  px: 1.75,
                  color: TOKENS.text2,
                  fontSize: '0.82rem',
                  borderBottom: `1px solid ${TOKENS.divider}`,
                },
                '& tbody tr:hover td': { bgcolor: '#F8FAFC' },
              }}
            >
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Folio</th>
                  <th>Incidente / Resumen</th>
                  <th>Ubicación</th>
                  <th>ISM/MESA asignado</th>
                  <th>Estatus</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingIncidents ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                      <CircularProgress size={26} />
                    </td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                      <AssignmentOutlined sx={{ color: '#CBD5E1', fontSize: 34 }} />
                      <Typography sx={{ color: TOKENS.text2, fontWeight: 700, mt: 1, fontSize: '0.88rem' }}>
                        No hay incidencias Onsite registradas
                      </Typography>
                      <Typography sx={{ color: TOKENS.text3, mt: 0.5, fontSize: '0.78rem' }}>
                        Crea un incidente con el botón “Crear incidente” para verlo aquí.
                      </Typography>
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => {
                    const st = getStatusStyle(inc.estatus);
                    const ismName = inc.ismMesa || '';
                    return (
                      <tr key={inc.id ?? inc.folio}>
                        <td>{inc.fecha}</td>
                        <td>
                          <Typography
                            sx={{
                              fontFamily: '"Cascadia Code", "Consolas", monospace',
                              fontWeight: 600,
                              color: '#155E9C',
                              fontSize: '0.8rem',
                            }}
                          >
                            {inc.folio}
                          </Typography>
                        </td>
                        <td>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: TOKENS.text }}>
                            {inc.incidente || inc.resumen}
                          </Typography>
                          {inc.descripcion && (
                            <Typography sx={{ fontSize: '0.72rem', color: TOKENS.text3, mt: 0.25 }}>
                              {inc.descripcion.length > 70
                                ? `${inc.descripcion.slice(0, 70)}…`
                                : inc.descripcion}
                            </Typography>
                          )}
                        </td>
                        <td>{inc.ubicacion}</td>
                        <td>
                          {ismName ? (
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Avatar
                                sx={{
                                  width: 26,
                                  height: 26,
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #0E9F6E, #067A55)',
                                }}
                              >
                                {ismName.trim().charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: TOKENS.text }}>
                                {ismName}
                              </Typography>
                            </Stack>
                          ) : (
                            <Typography sx={{ fontSize: '0.8rem', color: TOKENS.text3 }}>
                              Sin asignar
                            </Typography>
                          )}
                        </td>
                        <td>
                          <Chip
                            size="small"
                            label={st.label}
                            sx={{
                              bgcolor: st.background,
                              color: st.color,
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              borderRadius: '20px',
                              '& .MuiChip-label': { display: 'flex', alignItems: 'center' },
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Tooltip title="Editar incidente / Cambiar asignación">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEdit(inc)}
                              sx={{
                                color: TOKENS.text2,
                                border: `1px solid ${TOKENS.border}`,
                                borderRadius: 1.5,
                                width: 30,
                                height: 30,
                                '&:hover': {
                                  color: TOKENS.primary,
                                  bgcolor: '#EAF2FA',
                                  borderColor: '#BFD3E8',
                                },
                              }}
                            >
                              <EditOutlined sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Box>
          </Box>
        </Paper>

        {/* MODAL CREAR / EDITAR INCIDENTE */}
        <Dialog
          open={openModal}
          onClose={() => setOpenModal(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ fontWeight: 700, color: TOKENS.text, fontSize: '1.05rem', pb: 1 }}>
            {isEditing ? `Editar Incidente #${incidentForm.folio}` : 'Registrar Incidente Onsite (ITSM)'}
          </DialogTitle>
          <Box component="form" onSubmit={handleSaveIncident}>
            <DialogContent dividers sx={{ py: 2.5 }}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Folio / Ticket"
                    value={incidentForm.folio}
                    onChange={(e) => setIncidentForm({ ...incidentForm, folio: e.target.value })}
                    required
                    fullWidth
                    size="small"
                    slotProps={{
                      input: {
                        sx: { fontFamily: '"Cascadia Code", "Consolas", monospace', fontWeight: 600 },
                      },
                    }}
                  />
                  <TextField
                    label="Compañía / Cliente"
                    placeholder="Escribe la compañía o cliente"
                    value={incidentForm.compania}
                    onChange={(e) => setIncidentForm({ ...incidentForm, compania: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Sitio / Ubicación"
                    placeholder="Ej. CEDIS Puerto Escondido"
                    value={incidentForm.nombreSitio}
                    onChange={(e) =>
                      setIncidentForm({
                        ...incidentForm,
                        nombreSitio: e.target.value,
                        idSitio: e.target.value,
                      })
                    }
                    fullWidth
                    size="small"
                  />

                  <FormControl fullWidth size="small">
                    <InputLabel id="modal-ism-label">Asignar a ISM/MESA</InputLabel>
                    <Select
                      labelId="modal-ism-label"
                      value={incidentForm.idIsmAsignado}
                      label="Asignar a ISM/MESA"
                      onChange={(e) => setIncidentForm({ ...incidentForm, idIsmAsignado: e.target.value })}
                    >
                      <MenuItem value="">Sin asignar (Pendiente)</MenuItem>
                      {engineers.map((eng) => (
                        <MenuItem key={eng.id} value={eng.id}>
                          {eng.nombre} {String(eng.estatus || '').toLowerCase() === 'mesa' ? '(Disponible)' : `(${eng.estatus})`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <TextField
                  label="Resumen del problema (Summary)"
                  placeholder="Ej. Equipo sin conexión a switch"
                  value={incidentForm.resumen}
                  onChange={(e) => setIncidentForm({ ...incidentForm, resumen: e.target.value })}
                  required
                  fullWidth
                  size="small"
                />

                <TextField
                  label="Descripción técnica detallada"
                  placeholder="Instrucciones o detalles para el ingeniero…"
                  value={incidentForm.descripcion}
                  onChange={(e) => setIncidentForm({ ...incidentForm, descripcion: e.target.value })}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button
                onClick={() => setOpenModal(false)}
                disabled={savingIncident}
                sx={{ textTransform: 'none', fontWeight: 600, color: TOKENS.text2 }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={savingIncident}
                startIcon={savingIncident ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{
                  bgcolor: TOKENS.primary,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 1.5,
                  boxShadow: '0 6px 14px -6px rgba(0,51,89,.5)',
                  '&:hover': { bgcolor: '#00223D' },
                }}
              >
                {savingIncident ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear incidente'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}

export default OnsiteDistributionPage;