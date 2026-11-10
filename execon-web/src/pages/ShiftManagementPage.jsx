import {
  AccessTimeOutlined,
  AssignmentIndOutlined,
  CalendarMonthOutlined,
  CheckCircleOutlined,
  GroupOutlined,
  MoreTimeOutlined,
  RefreshOutlined,
} from '@mui/icons-material';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
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

import { useCallback, useEffect, useState } from 'react';

import api from '../api/client';
import DashboardLayout from '../layouts/DashboardLayout';

const DIAS = [
  { valor: 1, nombre: 'Lunes', corto: 'Lun' },
  { valor: 2, nombre: 'Martes', corto: 'Mar' },
  { valor: 3, nombre: 'Miércoles', corto: 'Mié' },
  { valor: 4, nombre: 'Jueves', corto: 'Jue' },
  { valor: 5, nombre: 'Viernes', corto: 'Vie' },
  { valor: 6, nombre: 'Sábado', corto: 'Sáb' },
  { valor: 7, nombre: 'Domingo', corto: 'Dom' },
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
  minHeight: 34,
  borderColor: T.border,
  borderRadius: 2,
  color: T.text2,
  textTransform: 'none',
  fontSize: '0.78rem',
  fontWeight: 700,
  '&:hover': { borderColor: T.primary, bgcolor: T.head },
};

function nuevoHorario() {
  return {
    nombre: '',
    horaInicio: '',
    horaFin: '',
    diasSemana: [1, 2, 3, 4, 5],
  };
}

function nuevaAsignacion() {
  return {
    idIngeniero: '',
    idTurno: '',
    fechaInicio: '',
    fechaFin: '',
    motivo: '',
  };
}

function normalizarRol(rol) {
  const valor = String(rol || '').trim().toLowerCase();

  const equivalencias = {
    supervisor_administrador: 'supervisor',
    ingeniero: 'ism/mesa',
    ism_mesa: 'ism/mesa',
  };

  return equivalencias[valor] || valor;
}

function obtenerMensajeError(error) {
  if (error.response?.status === 401) {
    return (
      'Tu sesión no es válida o expiró. ' +
      'Cierra sesión e inicia sesión nuevamente.'
    );
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.request && !error.response) {
    return (
      'No fue posible conectar con la API. ' +
      'Comprueba que el backend esté encendido.'
    );
  }

  return error.message || 'No fue posible completar la operación.';
}

function mostrarDias(dias) {
  if (!Array.isArray(dias)) return 'Sin días';

  const valores = new Set(dias.map(Number));

  return DIAS
    .filter((dia) => valores.has(dia.valor))
    .map((dia) => dia.corto)
    .join(', ');
}

function mostrarFecha(fecha) {
  if (!fecha) return 'Sin fecha final';

  const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');

  return anio && mes && dia
    ? `${dia}/${mes}/${anio}`
    : String(fecha);
}

function ShiftManagementPage() {
  const [turnos, setTurnos] = useState([]);
  const [ingenieros, setIngenieros] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);

  const [horario, setHorario] = useState(nuevoHorario);
  const [asignacion, setAsignacion] = useState(nuevaAsignacion);

  const [cargando, setCargando] = useState(true);
  const [datosListos, setDatosListos] = useState(false);
  const [autorizado, setAutorizado] = useState(false);

  const [guardandoHorario, setGuardandoHorario] = useState(false);
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  const [errorCarga, setErrorCarga] = useState('');
  const [mensaje, setMensaje] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setDatosListos(false);
    setAutorizado(false);
    setErrorCarga('');

    setTurnos([]);
    setIngenieros([]);
    setAsignaciones([]);

    try {
      const perfilResponse = await api.get('/auth/me');
      const perfil = perfilResponse.data?.data;
      const rol = normalizarRol(perfil?.rol);

      if (!['admin', 'supervisor'].includes(rol)) {
        setErrorCarga(
          'Solo un administrador o supervisor puede administrar turnos.',
        );
        return;
      }

      setAutorizado(true);

      const [
        turnosResponse,
        usuariosResponse,
        asignacionesResponse,
      ] = await Promise.all([
        api.get('/turnos'),
        api.get('/usuarios'),
        api.get('/turnos/asignaciones'),
      ]);

      const listaTurnos = turnosResponse.data?.data;
      const listaUsuarios = usuariosResponse.data?.data;
      const listaAsignaciones = asignacionesResponse.data?.data;

      if (
        !Array.isArray(listaTurnos) ||
        !Array.isArray(listaUsuarios) ||
        !Array.isArray(listaAsignaciones)
      ) {
        throw new Error('La API devolvió una respuesta inesperada.');
      }

      setTurnos(listaTurnos);

      setIngenieros(
        listaUsuarios.filter(
          (usuario) =>
            normalizarRol(usuario.rol) === 'ism/mesa' &&
            usuario.estatus === 'ACTIVO',
        ),
      );

      setAsignaciones(listaAsignaciones);
      setDatosListos(true);
    } catch (error) {
      setErrorCarga(obtenerMensajeError(error));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const ocupado =
    cargando || guardandoHorario || guardandoAsignacion;

  const formularioDeshabilitado =
    ocupado || !autorizado || !datosListos;

  const turnosActivos = turnos.filter((turno) => turno.activo);

  const cruzaMedianoche = Boolean(
    horario.horaInicio &&
    horario.horaFin &&
    horario.horaFin < horario.horaInicio,
  );

  function cambiarHorario(campo, valor) {
    setHorario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function cambiarAsignacion(campo, valor) {
    setAsignacion((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function alternarDia(valor) {
    setHorario((actual) => {
      const seleccionados = actual.diasSemana.includes(valor)
        ? actual.diasSemana.filter((dia) => dia !== valor)
        : [...actual.diasSemana, valor];

      return {
        ...actual,
        diasSemana: seleccionados.sort((a, b) => a - b),
      };
    });
  }

  function manejarErrorGuardado(error) {
    setMensaje({
      severity: 'error',
      texto: obtenerMensajeError(error),
    });

    if ([401, 403].includes(error.response?.status)) {
      setAutorizado(false);
      setDatosListos(false);
      setTurnos([]);
      setIngenieros([]);
      setAsignaciones([]);
      setErrorCarga(obtenerMensajeError(error));
    }
  }

  async function crearHorario(event) {
    event.preventDefault();

    if (formularioDeshabilitado) return;

    setMensaje(null);

    if (!horario.nombre.trim()) {
      setMensaje({
        severity: 'warning',
        texto: 'Escribe el nombre del horario.',
      });
      return;
    }

    if (!horario.horaInicio || !horario.horaFin) {
      setMensaje({
        severity: 'warning',
        texto: 'Selecciona las horas de entrada y salida.',
      });
      return;
    }

    if (horario.horaInicio === horario.horaFin) {
      setMensaje({
        severity: 'warning',
        texto: 'La entrada y la salida deben ser diferentes.',
      });
      return;
    }

    if (horario.diasSemana.length === 0) {
      setMensaje({
        severity: 'warning',
        texto: 'Selecciona al menos un día de trabajo.',
      });
      return;
    }

    setGuardandoHorario(true);

    try {
      const response = await api.post('/turnos', {
        nombre: horario.nombre.trim(),
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin,
        diasSemana: horario.diasSemana,
      });

      setHorario(nuevoHorario());

      setMensaje({
        severity: 'success',
        texto: response.data?.message || 'Horario creado correctamente.',
      });

      await cargarDatos();
    } catch (error) {
      manejarErrorGuardado(error);
    } finally {
      setGuardandoHorario(false);
    }
  }

  async function asignarHorario(event) {
    event.preventDefault();

    if (formularioDeshabilitado) return;

    setMensaje(null);

    if (
      !asignacion.idIngeniero ||
      !asignacion.idTurno ||
      !asignacion.fechaInicio
    ) {
      setMensaje({
        severity: 'warning',
        texto: 'Selecciona ISM/MESA, horario y fecha inicial.',
      });
      return;
    }

    if (!asignacion.motivo.trim()) {
      setMensaje({
        severity: 'warning',
        texto: 'Escribe el motivo de la asignación.',
      });
      return;
    }

    if (
      asignacion.fechaFin &&
      asignacion.fechaFin < asignacion.fechaInicio
    ) {
      setMensaje({
        severity: 'warning',
        texto: 'La fecha final no puede ser anterior a la inicial.',
      });
      return;
    }

    setGuardandoAsignacion(true);

    try {
      const response = await api.post('/turnos/asignaciones', {
        idIngeniero: Number(asignacion.idIngeniero),
        idTurno: Number(asignacion.idTurno),
        fechaInicio: asignacion.fechaInicio,
        fechaFin: asignacion.fechaFin || null,
        motivo: asignacion.motivo.trim(),
      });

      setAsignacion(nuevaAsignacion());

      setMensaje({
        severity: 'success',
        texto:
          response.data?.message || 'Horario asignado correctamente.',
      });

      await cargarDatos();
    } catch (error) {
      manejarErrorGuardado(error);
    } finally {
      setGuardandoAsignacion(false);
    }
  }

  return (
    <DashboardLayout>
      <Box sx={{ pt: 1, pb: 3 }}>
        {/* ALERTAS DE ERROR O ESTADO */}
        {mensaje && (
          <Alert
            severity={mensaje.severity}
            onClose={() => setMensaje(null)}
            sx={{ mb: 2.5, borderRadius: 2.5, fontSize: '0.86rem' }}
          >
            {mensaje.texto}
          </Alert>
        )}

        {errorCarga && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5, fontSize: '0.86rem' }}>
            {errorCarga} Los formularios permanecerán deshabilitados hasta
            verificar la sesión y cargar los datos correctamente.
          </Alert>
        )}

        {/* KPIs SUPERIORES CON ANIMACIÓN */}
        {autorizado && datosListos && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
              mb: 3,
            }}
          >
            <ShiftMetricCard
              icon={<AccessTimeOutlined />}
              label="Horarios registrados"
              value={turnos.length}
              subtitle="Plantillas de jornada"
              color="#1D6FB8"
              background="#EAF2FA"
            />

            <ShiftMetricCard
              icon={<GroupOutlined />}
              label="ISM/MESA activos"
              value={ingenieros.length}
              subtitle="Cuentas habilitadas"
              color="#0E9F6E"
              background="#E9F9F1"
            />

            <ShiftMetricCard
              icon={<CalendarMonthOutlined />}
              label="Asignaciones registradas"
              value={asignaciones.length}
              subtitle="Vigentes en el periodo"
              color="#6D5BD0"
              background="#EFEDFA"
            />
          </Box>
        )}

        {cargando && (
          <Paper elevation={0} sx={{ ...cardSx, p: 3, mb: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
              <CircularProgress size={22} />
              <Typography sx={{ color: T.text3, fontSize: '0.86rem' }}>
                Verificando sesión y cargando horarios…
              </Typography>
            </Stack>
          </Paper>
        )}

        {/* FORMULARIOS LADO A LADO CON ALTURA EQUILIBRADA */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'repeat(2, minmax(0, 1fr))',
            },
            gap: 2.5,
            alignItems: 'stretch',
            mb: 3.5,
          }}
        >
          {/* FORMULARIO: CREAR HORARIO */}
          <Paper
            component="form"
            onSubmit={crearHorario}
            elevation={0}
            sx={{ ...cardSx, display: 'flex', flexDirection: 'column' }}
          >
            <CardHead title="Crear horario">
              <Chip
                size="small"
                label="Plantilla"
                sx={{
                  bgcolor: '#EAF2FA',
                  color: T.link,
                  fontWeight: 700,
                  fontSize: '0.72rem',
                }}
              />
            </CardHead>

            <Box sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Stack spacing={2} sx={{ flex: 1 }}>
                <Box>
                  <Typography sx={labelSx}>Nombre del horario *</Typography>
                  <TextField
                    placeholder="Ejemplo: Nocturno entre semana"
                    value={horario.nombre}
                    onChange={(event) =>
                      cambiarHorario('nombre', event.target.value)
                    }
                    required
                    fullWidth
                    size="small"
                    disabled={formularioDeshabilitado}
                    slotProps={{
                      htmlInput: { maxLength: 100 },
                    }}
                    sx={inputSx}
                  />
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                    },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography sx={labelSx}>Hora de entrada *</Typography>
                    <TextField
                      type="time"
                      value={horario.horaInicio}
                      onChange={(event) =>
                        cambiarHorario('horaInicio', event.target.value)
                      }
                      required
                      fullWidth
                      size="small"
                      disabled={formularioDeshabilitado}
                      slotProps={{
                        htmlInput: { step: 60 },
                      }}
                      sx={inputSx}
                    />
                  </Box>

                  <Box>
                    <Typography sx={labelSx}>Hora de salida *</Typography>
                    <TextField
                      type="time"
                      value={horario.horaFin}
                      onChange={(event) =>
                        cambiarHorario('horaFin', event.target.value)
                      }
                      required
                      fullWidth
                      size="small"
                      disabled={formularioDeshabilitado}
                      slotProps={{
                        htmlInput: { step: 60 },
                      }}
                      sx={inputSx}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography sx={labelSx}>Días de inicio de jornada</Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: 1,
                    }}
                  >
                    {DIAS.map((dia) => {
                      const activo = horario.diasSemana.includes(dia.valor);
                      return (
                        <Box
                          key={dia.valor}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (!formularioDeshabilitado) alternarDia(dia.valor);
                          }}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.6,
                            p: 1,
                            borderRadius: 2,
                            border: `1.5px solid ${activo ? T.link : T.border}`,
                            bgcolor: activo ? '#EAF2FA' : '#FFFFFF',
                            color: activo ? T.link : T.text3,
                            cursor: formularioDeshabilitado ? 'not-allowed' : 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              borderColor: activo ? T.link : '#CBD5E1',
                              bgcolor: activo ? '#EAF2FA' : T.head,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: activo ? T.link : '#CBD5E1',
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: activo ? 800 : 600,
                              lineHeight: 1,
                            }}
                          >
                            {dia.corto}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>

                {cruzaMedianoche && (
                  <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.8rem' }}>
                    Este horario termina al día siguiente (+1 día). Los días
                    seleccionados corresponden al inicio de la jornada.
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  disableElevation
                  startIcon={
                    guardandoHorario ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <MoreTimeOutlined />
                    )
                  }
                  disabled={formularioDeshabilitado}
                  sx={{
                    minHeight: 44,
                    borderRadius: 2,
                    bgcolor: T.primary,
                    textTransform: 'none',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    mt: 'auto',
                    pt: 1,
                    '&:hover': { bgcolor: '#002642' },
                  }}
                >
                  {guardandoHorario ? 'Guardando...' : 'Guardar horario'}
                </Button>
              </Stack>
            </Box>
          </Paper>

          {/* FORMULARIO: ASIGNAR HORARIO */}
          <Paper
            component="form"
            onSubmit={asignarHorario}
            elevation={0}
            sx={{ ...cardSx, display: 'flex', flexDirection: 'column' }}
          >
            <CardHead title="Asignar horario a ISM/MESA">
              <Chip
                size="small"
                label="Asignación"
                sx={{
                  bgcolor: '#EFEDFA',
                  color: '#6D5BD0',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                }}
              />
            </CardHead>

            <Box sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Stack spacing={2} sx={{ flex: 1 }}>
                <Box>
                  <Typography sx={labelSx}>ISM / MESA *</Typography>
                  <FormControl
                    fullWidth
                    size="small"
                    required
                    disabled={
                      formularioDeshabilitado ||
                      ingenieros.length === 0
                    }
                  >
                    <Select
                      value={asignacion.idIngeniero}
                      displayEmpty
                      onChange={(event) =>
                        cambiarAsignacion('idIngeniero', event.target.value)
                      }
                      renderValue={(selected) => {
                        if (!selected) {
                          return (
                            <Typography sx={{ color: T.text3, fontSize: '0.86rem' }}>
                              Selecciona un agente…
                            </Typography>
                          );
                        }
                        const ing = ingenieros.find(
                          (i) => String(i.id) === String(selected),
                        );
                        return (
                          <Typography sx={{ color: T.text, fontSize: '0.86rem', fontWeight: 600 }}>
                            {ing?.nombreCompleto || selected}
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
                      {ingenieros.map((ingeniero) => (
                        <MenuItem
                          key={ingeniero.id}
                          value={String(ingeniero.id)}
                          sx={{ fontSize: '0.86rem' }}
                        >
                          {ingeniero.nombreCompleto}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box>
                  <Typography sx={labelSx}>Horario *</Typography>
                  <FormControl
                    fullWidth
                    size="small"
                    required
                    disabled={
                      formularioDeshabilitado ||
                      turnosActivos.length === 0
                    }
                  >
                    <Select
                      value={asignacion.idTurno}
                      displayEmpty
                      onChange={(event) =>
                        cambiarAsignacion('idTurno', event.target.value)
                      }
                      renderValue={(selected) => {
                        if (!selected) {
                          return (
                            <Typography sx={{ color: T.text3, fontSize: '0.86rem' }}>
                              Selecciona una plantilla de horario…
                            </Typography>
                          );
                        }
                        const t = turnosActivos.find(
                          (turno) => String(turno.id) === String(selected),
                        );
                        return (
                          <Typography sx={{ color: T.text, fontSize: '0.86rem', fontWeight: 600 }}>
                            {t ? `${t.nombre} (${t.horaInicio}–${t.horaFin})` : selected}
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
                      {turnosActivos.map((turno) => (
                        <MenuItem
                          key={turno.id}
                          value={String(turno.id)}
                          sx={{ fontSize: '0.86rem' }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontSize: '0.86rem', fontWeight: 600 }}>
                              {turno.nombre}
                            </Typography>
                            <Typography sx={{ fontSize: '0.78rem', color: T.text3 }}>
                              {turno.horaInicio}–{turno.horaFin}
                              {turno.cruzaMedianoche ? ' (+1 día)' : ''}
                            </Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                    },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography sx={labelSx}>Fecha inicial *</Typography>
                    <TextField
                      type="date"
                      value={asignacion.fechaInicio}
                      onChange={(event) =>
                        cambiarAsignacion('fechaInicio', event.target.value)
                      }
                      required
                      fullWidth
                      size="small"
                      disabled={formularioDeshabilitado}
                      sx={inputSx}
                    />
                  </Box>

                  <Box>
                    <Typography sx={labelSx}>
                      Fecha final <span style={{ color: T.text3, fontWeight: 400 }}>(opcional)</span>
                    </Typography>
                    <TextField
                      type="date"
                      value={asignacion.fechaFin}
                      onChange={(event) =>
                        cambiarAsignacion('fechaFin', event.target.value)
                      }
                      fullWidth
                      size="small"
                      disabled={formularioDeshabilitado}
                      placeholder="Vacía: vigencia indefinida"
                      slotProps={{
                        htmlInput: {
                          min: asignacion.fechaInicio || undefined,
                        },
                      }}
                      sx={inputSx}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography sx={labelSx}>Motivo de la asignación *</Typography>
                  <TextField
                    placeholder="Razón o proyecto por el que se asigna el turno…"
                    value={asignacion.motivo}
                    onChange={(event) =>
                      cambiarAsignacion('motivo', event.target.value)
                    }
                    multiline
                    minRows={2}
                    required
                    fullWidth
                    size="small"
                    disabled={formularioDeshabilitado}
                    slotProps={{
                      htmlInput: { maxLength: 2000 },
                    }}
                    sx={inputSx}
                  />
                  <Typography sx={{ mt: 0.75, color: T.text3, fontSize: '0.7rem' }}>
                    La fecha final incluye las jornadas que comienzan ese día, aunque terminen al día siguiente.
                  </Typography>
                </Box>

                {datosListos && ingenieros.length === 0 && (
                  <Alert severity="warning" sx={{ borderRadius: 2, fontSize: '0.8rem' }}>
                    No hay usuarios activos con rol ISM/MESA.
                  </Alert>
                )}

                {datosListos && turnosActivos.length === 0 && (
                  <Alert severity="warning" sx={{ borderRadius: 2, fontSize: '0.8rem' }}>
                    Primero crea un horario para poder asignarlo.
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  disableElevation
                  startIcon={
                    guardandoAsignacion ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <AssignmentIndOutlined />
                    )
                  }
                  disabled={
                    formularioDeshabilitado ||
                    ingenieros.length === 0 ||
                    turnosActivos.length === 0
                  }
                  sx={{
                    minHeight: 44,
                    borderRadius: 2,
                    bgcolor: T.primary,
                    textTransform: 'none',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    mt: 'auto',
                    pt: 1,
                    '&:hover': { bgcolor: '#002642' },
                  }}
                >
                  {guardandoAsignacion ? 'Asignando...' : 'Guardar asignación'}
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Box>

        {/* TABLAS INFERIORES */}
        {autorizado && datosListos && (
          <Stack spacing={3.5}>
            {/* TABLA: HORARIOS REGISTRADOS */}
            <Paper elevation={0} sx={cardSx}>
              <CardHead title="Horarios registrados">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={cargarDatos}
                  disabled={ocupado}
                  startIcon={
                    cargando ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <RefreshOutlined fontSize="small" />
                    )
                  }
                  sx={outlineBtnSx}
                >
                  {cargando ? 'Actualizando...' : 'Actualizar datos'}
                </Button>
              </CardHead>

              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 780, borderCollapse: 'collapse' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: T.head }}>
                      <TableCell sx={thSx}>Nombre</TableCell>
                      <TableCell sx={thSx}>Entrada</TableCell>
                      <TableCell sx={thSx}>Salida</TableCell>
                      <TableCell sx={thSx}>Días de inicio</TableCell>
                      <TableCell sx={thSx}>Zona horaria</TableCell>
                      <TableCell sx={thSx}>Estado</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {turnos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 5, textAlign: 'center' }}>
                          <EmptyStateText
                            title="Todavía no hay horarios registrados"
                            subtitle="Crea una plantilla con el formulario de la izquierda."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      turnos.map((turno) => (
                        <TableRow
                          key={turno.id}
                          sx={{
                            '&:hover': { bgcolor: '#FBFDFE' },
                            '& td': { borderBottom: '1px solid #EEF2F6', py: 1.4, fontSize: '0.84rem' },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 700, color: T.text }}>
                            {turno.nombre}
                          </TableCell>

                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: T.link }}>
                            {turno.horaInicio}
                          </TableCell>

                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: T.link }}>
                            {turno.horaFin}
                            {turno.cruzaMedianoche && (
                              <Chip
                                size="small"
                                label="+1 día"
                                sx={{
                                  ml: 1,
                                  height: 20,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  bgcolor: '#F1F5F9',
                                  color: T.text2,
                                }}
                              />
                            )}
                          </TableCell>

                          <TableCell sx={{ color: T.text2 }}>
                            {mostrarDias(turno.diasSemana)}
                          </TableCell>

                          <TableCell sx={{ color: T.text3, fontSize: '0.78rem' }}>
                            {turno.zonaHoraria}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={turno.activo ? 'Activo' : 'Inactivo'}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                bgcolor: turno.activo ? '#E9F9F1' : '#F1F5F9',
                                color: turno.activo ? '#0E9F6E' : T.text3,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* TABLA: ASIGNACIONES REGISTRADAS */}
            <Paper elevation={0} sx={cardSx}>
              <CardHead title="Asignaciones registradas" />

              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 1050, borderCollapse: 'collapse' }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: T.head }}>
                      <TableCell sx={thSx}>ISM / MESA</TableCell>
                      <TableCell sx={thSx}>Horario</TableCell>
                      <TableCell sx={thSx}>Horas</TableCell>
                      <TableCell sx={thSx}>Días de inicio</TableCell>
                      <TableCell sx={thSx}>Desde</TableCell>
                      <TableCell sx={thSx}>Hasta</TableCell>
                      <TableCell sx={thSx}>Estado</TableCell>
                      <TableCell sx={thSx}>Asignado por</TableCell>
                      <TableCell sx={thSx}>Motivo</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {asignaciones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ py: 5, textAlign: 'center' }}>
                          <EmptyStateText
                            title="Todavía no hay asignaciones registradas"
                            subtitle="Asigna un horario a un agente con el formulario superior."
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      asignaciones.map((registro) => (
                        <TableRow
                          key={registro.id}
                          sx={{
                            '&:hover': { bgcolor: '#FBFDFE' },
                            '& td': { borderBottom: '1px solid #EEF2F6', py: 1.4, fontSize: '0.84rem' },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 700, color: T.text }}>
                            {registro.ingeniero}
                          </TableCell>

                          <TableCell sx={{ color: T.text }}>
                            {registro.turno}
                          </TableCell>

                          <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontWeight: 700, color: T.link }}>
                            {registro.horaInicio}–{registro.horaFin}
                            {registro.cruzaMedianoche && (
                              <Chip
                                size="small"
                                label="+1 día"
                                sx={{
                                  ml: 0.75,
                                  height: 20,
                                  fontSize: '0.62rem',
                                  fontWeight: 700,
                                  bgcolor: '#F1F5F9',
                                  color: T.text2,
                                }}
                              />
                            )}
                          </TableCell>

                          <TableCell sx={{ color: T.text2 }}>
                            {mostrarDias(registro.diasSemana)}
                          </TableCell>

                          <TableCell sx={{ whiteSpace: 'nowrap', color: T.text2 }}>
                            {mostrarFecha(registro.fechaInicio)}
                          </TableCell>

                          <TableCell sx={{ whiteSpace: 'nowrap', color: T.text2 }}>
                            {mostrarFecha(registro.fechaFin)}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={registro.cancelada ? 'Cancelada' : 'Vigente'}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                bgcolor: registro.cancelada ? '#F1F5F9' : '#EAF2FA',
                                color: registro.cancelada ? T.text3 : T.link,
                              }}
                            />
                          </TableCell>

                          <TableCell sx={{ color: T.text3, fontSize: '0.78rem' }}>
                            {registro.nombreAsignador}
                          </TableCell>

                          <TableCell sx={{ minWidth: 200, color: T.text2, fontSize: '0.8rem' }}>
                            {registro.motivo}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Stack>
        )}
      </Box>
    </DashboardLayout>
  );
}

/* ---------- Componentes auxiliares ---------- */

const thSx = {
  px: 2.5,
  py: 1.25,
  color: T.text3,
  fontSize: '0.66rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textAlign: 'left',
  textTransform: 'uppercase',
  borderBottom: `1px solid ${T.border}`,
  whiteSpace: 'nowrap',
};

function CardHead({ title, children }) {
  return (
    <Box
      sx={{
        px: 2.5,
        minHeight: 56,
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
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

function ShiftMetricCard({ icon, label, value, subtitle, color, background }) {
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

function EmptyStateText({ title, subtitle }) {
  return (
    <Box sx={{ py: 2 }}>
      <CheckCircleOutlined sx={{ color: '#CBD5E1', fontSize: 34, mb: 0.5 }} />
      <Typography sx={{ color: T.text2, fontSize: '0.88rem', fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography sx={{ color: T.text3, fontSize: '0.72rem', mt: 0.25 }}>
        {subtitle}
      </Typography>
    </Box>
  );
}

export default ShiftManagementPage;