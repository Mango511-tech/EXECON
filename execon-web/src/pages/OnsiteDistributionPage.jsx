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
  const rem = minutes % 60;
  return hours > 0 ? `${hours}h ${rem}m` : `${rem}m`;
}

function getStatusStyle(status) {
  const clean = String(status || '').trim().toUpperCase();
  if (clean === 'PENDIENTE') return { label: 'Pendiente', background: '#FFF7ED', color: '#C2410C' };
  if (clean === 'EN ATENCION' || clean === 'ENATENCION') return { label: 'En atención', background: '#ECFDF3', color: '#168A4A' };
  if (clean === 'FINALIZADO') return { label: 'Finalizado', background: '#EAF4FF', color: '#1664A7' };
  return { label: status || 'Pendiente', background: '#F1F5F9', color: '#64748B' };
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

    // Buscar si el incidente ya existe en la lista
    const targetIncident = incidents.find(
      (i) => String(i.folio).trim().toLowerCase() === incidentSearch.trim().toLowerCase()
    );

    if (targetIncident) {
      // Si existe, lo actualiza a 'EN ATENCION' y le asigna el agente
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
      // Si no existe, abre el modal pre-llenado con el folio y el agente
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
              xl: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <MetricCard
            icon={<PersonOutlineOutlined />}
            label="Disponibles en mesa"
            value={summary.disponibles}
            color="#1674B7"
            background="#EAF4FF"
          />
          <MetricCard
            icon={<AddTaskOutlined />}
            label="Onsites pendientes"
            value={summary.pendientes}
            color="#E67817"
            background="#FFF7ED"
          />
          <MetricCard
            icon={<HeadsetMicOutlined />}
            label="En atención"
            value={summary.enAtencion}
            color="#168A4A"
            background="#ECFDF3"
          />
          <MetricCard
            icon={<AccessTimeOutlined />}
            label="Tiempo promedio"
            value={formatDuration(summary.averageMinutes)}
            color="#6A45B5"
            background="#F3EEFF"
          />
        </Box>

        {/* ASIGNACIÓN DE ONSITE */}
        <Paper
          sx={{
            p: 2.25,
            mb: 1.5,
            border: '1px solid #E7EDF4',
            borderRadius: 1.5,
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Typography sx={{ color: '#173B66', fontSize: '1.1rem', fontWeight: 800 }}>
              Asignación y registro de Onsite
            </Typography>

            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              onClick={() => {
                setIncidentForm(EMPTY_INCIDENT_FORM);
                setIsEditing(false);
                setOpenModal(true);
              }}
              sx={{
                bgcolor: '#003359',
                color: '#FFFFFF',
                fontWeight: 800,
                textTransform: 'none',
                minHeight: 40,
                px: 2,
                '&:hover': { bgcolor: '#002642' },
              }}
            >
              Crear incidente
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                lg: 'minmax(290px, 0.85fr) minmax(460px, 1.6fr) auto',
              },
              gap: 1.75,
              alignItems: 'start',
            }}
          >
            <Box>
              <Typography sx={{ mb: 0.8, color: '#475569', fontSize: '0.9rem', fontWeight: 800 }}>
                ISM/MESA disponible
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel id="engineer-select-label">Selecciona un agente</InputLabel>
                <Select
                  labelId="engineer-select-label"
                  value={selectedEngineer}
                  label="Selecciona un agente"
                  onChange={(e) => setSelectedEngineer(e.target.value)}
                  disabled={loadingEngineers}
                  sx={{ minHeight: 48, fontSize: '0.9rem' }}
                >
                  <MenuItem value="">Sin seleccionar</MenuItem>
                  {engineers.map((eng) => (
                    <MenuItem key={eng.id} value={eng.id}>
                      {eng.nombre} {String(eng.estatus || '').toLowerCase() === 'mesa' ? '(Disponible)' : `(${eng.estatus})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Typography sx={{ mb: 0.8, color: '#475569', fontSize: '0.9rem', fontWeight: 800 }}>
                Buscar incidente por folio
              </Typography>
              <TextField
                value={incidentSearch}
                onChange={(e) => setIncidentSearch(e.target.value)}
                placeholder="Escribe el folio del ticket (Ej. 123131313)..."
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <SearchOutlined sx={{ color: '#64748B', fontSize: 22 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: 48 } }}
              />
            </Box>

            <Button
              variant="contained"
              startIcon={<SendOutlined />}
              onClick={handleAssignOnsiteDirect}
              sx={{
                mt: { xs: 0, lg: 3.6 },
                minHeight: 48,
                px: 2.5,
                bgcolor: '#003359',
                textTransform: 'none',
                fontSize: '0.9rem',
                fontWeight: 800,
                '&:hover': { bgcolor: '#002642' },
              }}
            >
              Asignar onsite
            </Button>
          </Box>
        </Paper>

        {message && (
          <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 1.5 }}>
            {message.text}
          </Alert>
        )}

        {/* TABLA CONCENTRADORA */}
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
              py: 1.5,
              borderBottom: '1px solid #E7EDF4',
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', lg: 'center' },
              gap: 1.5,
            }}
          >
            <Typography sx={{ color: '#173B66', fontSize: '1.1rem', fontWeight: 800 }}>
              Tabla concentradora de Onsite
            </Typography>

            <Stack direction="row" spacing={1}>
              <TextField
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Buscar por folio, incidente o ubicación..."
                size="small"
                sx={{ minWidth: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { minHeight: 42 } }}
              />

              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ minHeight: 42 }}
                >
                  <MenuItem value="TODOS">Todos los estatus</MenuItem>
                  <MenuItem value="PENDIENTE">Pendientes</MenuItem>
                  <MenuItem value="EN ATENCION">En atención</MenuItem>
                  <MenuItem value="FINALIZADO">Finalizados</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                minWidth: 900,
                borderCollapse: 'collapse',
                '& th': {
                  py: 1.25,
                  px: 1.5,
                  color: '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  bgcolor: '#F7F9FC',
                  borderBottom: '1px solid #E7EDF4',
                },
                '& td': {
                  py: 1.15,
                  px: 1.5,
                  color: '#475569',
                  fontSize: '0.84rem',
                  borderBottom: '1px solid #EEF2F6',
                },
              }}
            >
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Folio</th>
                  <th>Incidente / Resumen</th>
                  <th>Ubicación</th>
                  <th>ISM/MESA Asignado</th>
                  <th>Estatus</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingIncidents ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                      <CircularProgress size={26} />
                    </td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                      <AssignmentOutlined sx={{ color: '#CBD5E1', fontSize: 38 }} />
                      <Typography sx={{ color: '#64748B', fontWeight: 800, mt: 1 }}>
                        No hay incidencias Onsite registradas
                      </Typography>
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => {
                    const st = getStatusStyle(inc.estatus);
                    return (
                      <tr key={inc.id ?? inc.folio}>
                        <td>{inc.fecha}</td>
                        <td style={{ fontWeight: 800, color: '#173B66' }}>{inc.folio}</td>
                        <td>{inc.incidente || inc.resumen}</td>
                        <td>{inc.ubicacion}</td>
                        <td style={{ fontWeight: inc.ismMesa ? 700 : 400, color: inc.ismMesa ? '#003359' : '#94A3B8' }}>
                          {inc.ismMesa || 'Sin asignar'}
                        </td>
                        <td>
                          <Chip
                            size="small"
                            label={st.label}
                            sx={{ bgcolor: st.background, color: st.color, fontWeight: 800 }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Tooltip title="Editar incidente / Cambiar asignación">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEdit(inc)}
                              sx={{ color: '#003359', '&:hover': { bgcolor: '#EAF4FF' } }}
                            >
                              <EditOutlined fontSize="small" />
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
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: '#173B66' }}>
            {isEditing ? `Editar Incidente #${incidentForm.folio}` : 'Registrar Incidente Onsite (ITSM)'}
          </DialogTitle>
          <Box component="form" onSubmit={handleSaveIncident}>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Folio / Ticket"
                    value={incidentForm.folio}
                    onChange={(e) => setIncidentForm({ ...incidentForm, folio: e.target.value })}
                    required
                    fullWidth
                    size="small"
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
                  placeholder="Instrucciones o detalles para el ingeniero..."
                  value={incidentForm.descripcion}
                  onChange={(e) => setIncidentForm({ ...incidentForm, descripcion: e.target.value })}
                  multiline
                  minRows={3}
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenModal(false)} disabled={savingIncident}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={savingIncident}
                sx={{ bgcolor: '#003359', fontWeight: 800, '&:hover': { bgcolor: '#002642' } }}
              >
                {savingIncident ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear incidente'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}

function MetricCard({ icon, label, value, color, background }) {
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
            '& svg': { fontSize: 27 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ color: '#334155', fontSize: '0.94rem', fontWeight: 700 }}>
            {label}
          </Typography>
          <Typography sx={{ mt: 0.65, color, fontSize: '1.78rem', fontWeight: 800 }}>
            {value}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ position: 'absolute', right: 0, bottom: 0, left: 0, height: 4, bgcolor: color }} />
    </Paper>
  );
}

export default OnsiteDistributionPage;