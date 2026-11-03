import { useState } from 'react';

import {
  Alert,
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';

import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';

import DistributorLayout from '../../layouts/DistributorLayout';

const PRIORIDADES = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'P1', label: 'P1' },
  { value: 'P2', label: 'P2' },
  { value: 'P3', label: 'P3' },
  { value: 'P4', label: 'P4' },
  { value: 'P5', label: 'P5' },
];

function LoggedIncidentsPage() {
  const [prioridad, setPrioridad] = useState('TODOS');

  return (
    <DistributorLayout
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        La integración con Ivanti está pendiente. Esta pantalla
        todavía no recibe incidentes ni permite asignarlos.
      </Alert>

      <Paper
        sx={{
          border: '1px solid #E7EDF4',
          borderRadius: 1.5,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2.5 }}>
          <Typography
            component="h1"
            sx={{
              color: '#173B66',
              fontSize: '1.2rem',
              fontWeight: 800,
            }}
          >
            Incidentes loggeados
          </Typography>

          <Typography
            sx={{
              mt: 0.75,
              color: '#64748B',
              fontSize: '0.9rem',
            }}
          >
            Aquí se mostrarán los incidentes provenientes de Ivanti.
            P1 representa la prioridad más alta.
          </Typography>
        </Box>

        <Tabs
          value={prioridad}
          onChange={(_, value) => setPrioridad(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Prioridad de los incidentes"
          sx={{
            px: 1,
            borderBottom: '1px solid #E7EDF4',
            '& .MuiTabs-indicator': {
              bgcolor: '#003359',
            },
          }}
        >
          {PRIORIDADES.map((item) => (
            <Tab
              key={item.value}
              value={item.value}
              label={item.label}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                color: '#64748B',
                '&.Mui-selected': {
                  color: '#003359',
                },
              }}
            />
          ))}
        </Tabs>

        <Box
          sx={{
            minHeight: 260,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 1,
          }}
        >
          <AssignmentOutlined
            sx={{
              fontSize: 46,
              color: '#CBD5E1',
            }}
          />

          <Typography
            sx={{
              color: '#475569',
              fontWeight: 700,
            }}
          >
            Fuente de incidentes pendiente de conexión
          </Typography>

          <Typography
            sx={{
              color: '#64748B',
              fontSize: '0.9rem',
              maxWidth: 520,
            }}
          >
            {prioridad === 'TODOS'
              ? 'Cuando conectemos Ivanti, podrás consultar los incidentes por prioridad.'
              : `Cuando conectemos Ivanti, aquí se mostrarán los incidentes con prioridad ${prioridad}.`}
          </Typography>
        </Box>
      </Paper>
    </DistributorLayout>
  );
}

export default LoggedIncidentsPage;