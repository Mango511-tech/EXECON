import { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  AssignmentOutlined,
  RefreshOutlined,
  SendOutlined,
} from '@mui/icons-material';

import api from '../../api/client';
import DistributorLayout from '../../layouts/DistributorLayout';

function OnsiteAssignmentPage() {
  const [engineers, setEngineers] = useState([]);
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEngineers() {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/ingenieros', {
          signal: controller.signal,
        });

        if (!Array.isArray(response.data?.data)) {
          throw new Error(
            'El servidor no devolvió una lista válida de ISM.',
          );
        }

        if (controller.signal.aborted) return;

        setEngineers(response.data.data);
      } catch (requestError) {
        if (controller.signal.aborted) return;

        setEngineers([]);
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            'No fue posible cargar los ISM.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadEngineers();

    return () => controller.abort();
  }, [reloadKey]);

  const availableEngineers = useMemo(
    () =>
      engineers.filter(
        (engineer) =>
          String(engineer.estatus || '')
            .trim()
            .toLowerCase() === 'mesa',
      ),
    [engineers],
  );

  useEffect(() => {
    if (
      selectedEngineer &&
      !availableEngineers.some(
        (engineer) => String(engineer.id) === selectedEngineer,
      )
    ) {
      setSelectedEngineer('');
    }
  }, [availableEngineers, selectedEngineer]);

  return (
    <DistributorLayout

    >
      <Stack spacing={2}>

        {error && <Alert severity="error">{error}</Alert>}

        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            border: '1px solid #E7EDF4',
            borderRadius: 1.5,
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Typography
              component="h1"
              sx={{
                color: '#173B66',
                fontSize: '1.2rem',
                fontWeight: 800,
              }}
            >
              Asignación de onsite
            </Typography>

            <Button
              type="button"
              startIcon={<RefreshOutlined />}
              disabled={loading}
              onClick={() => setReloadKey((value) => value + 1)}
              sx={{ textTransform: 'none' }}
            >
              Actualizar ISM
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(240px, 1fr) minmax(280px, 1.5fr)',
              },
              gap: 2,
            }}
          >
            <Box>
              <FormControl
                fullWidth
                size="small"
                disabled={
                  loading ||
                  Boolean(error) ||
                  availableEngineers.length === 0
                }
              >
                <InputLabel id="onsite-engineer-label">
                  ISM disponible
                </InputLabel>

                <Select
                  labelId="onsite-engineer-label"
                  label="ISM disponible"
                  value={selectedEngineer}
                  onChange={(event) =>
                    setSelectedEngineer(event.target.value)
                  }
                >
                  {availableEngineers.map((engineer) => (
                    <MenuItem
                      key={engineer.id}
                      value={String(engineer.id)}
                    >
                      {engineer.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mt: 1.5 }}>
                {loading ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >
                    <CircularProgress size={20} />

                    <Typography
                      sx={{ color: '#64748B', fontSize: '0.85rem' }}
                    >
                      Cargando ISM…
                    </Typography>
                  </Stack>
                ) : error ? (
                  <Typography
                    sx={{ color: '#64748B', fontSize: '0.85rem' }}
                  >
                    No se pudo comprobar la disponibilidad.
                  </Typography>
                ) : availableEngineers.length === 0 ? (
                  <Typography
                    sx={{ color: '#64748B', fontSize: '0.85rem' }}
                  >
                    No hay ISM con estado “En mesa”.
                  </Typography>
                ) : (
                  <Typography
                    sx={{ color: '#64748B', fontSize: '0.85rem' }}
                  >
                    ISM con estado “En mesa”:
                    {' '}
                    {availableEngineers.length}
                  </Typography>
                )}
              </Box>
            </Box>

            <TextField
              label="Incidente de Ivanti"
              placeholder="Fuente de incidentes pendiente"
              fullWidth
              size="small"
              disabled
              helperText="La selección se habilitará cuando conectemos los incidentes."
            />
          </Box>

          <Alert severity="warning" sx={{ mt: 2 }}>
            El filtro actual utiliza únicamente el estado “En mesa”.
            La validación de turno y las autorizaciones del supervisor
            todavía están pendientes.
          </Alert>

          <Button
            variant="contained"
            startIcon={<SendOutlined />}
            disabled
            sx={{
              mt: 2,
              textTransform: 'none',
              bgcolor: '#003359',
            }}
          >
            Asignar onsite
          </Button>

          <Typography
            sx={{
              mt: 1,
              color: '#64748B',
              fontSize: '0.8rem',
            }}
          >
            Asignación deshabilitada hasta conectar y validar el
            guardado en el backend.
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: { xs: 2, md: 3 },
            border: '1px solid #E7EDF4',
            borderRadius: 1.5,
          }}
        >
          <Typography
            sx={{
              color: '#173B66',
              fontSize: '1.1rem',
              fontWeight: 800,
            }}
          >
            Tabla concentradora de onsite
          </Typography>

          <Box
            sx={{
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 1,
            }}
          >
            <AssignmentOutlined
              sx={{ fontSize: 44, color: '#CBD5E1' }}
            />

            <Typography
              sx={{ color: '#475569', fontWeight: 700 }}
            >
              Consulta de onsite pendiente de conexión
            </Typography>

            <Typography
              sx={{ color: '#64748B', fontSize: '0.85rem' }}
            >
              Esta pantalla todavía no consulta los onsite
              existentes en PostgreSQL.
            </Typography>
          </Box>
        </Paper>
      </Stack>
    </DistributorLayout>
  );
}

export default OnsiteAssignmentPage;