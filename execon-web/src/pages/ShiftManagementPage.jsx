import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
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

const panelSx = {
  p: { xs: 2, md: 2.5 },
  border: '1px solid #E7EDF4',
  borderRadius: 1.5,
};

const botonSx = {
  minHeight: 44,
  bgcolor: '#003359',
  textTransform: 'none',
  fontWeight: 700,
  '&:hover': {
    bgcolor: '#002642',
  },
};

const tablaSx = {
  minWidth: 780,
  '& th': {
    bgcolor: '#F7F9FC',
    color: '#64748B',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  '& td': {
    color: '#475569',
    borderBottom: '1px solid #EEF2F6',
  },
};

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

function TituloSeccion({ children }) {
  return (
    <Typography
      component="h2"
      sx={{
        mb: 2,
        color: '#173B66',
        fontSize: '1.1rem',
        fontWeight: 800,
      }}
    >
      {children}
    </Typography>
  );
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
    <DashboardLayout
      title="Turnos y disponibilidad"
      subtitle="Administración de horarios de los ISM"
    >
      <Stack spacing={2}>
        <Paper sx={panelSx}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{
              justifyContent: 'space-between',
              alignItems: {
                xs: 'stretch',
                sm: 'center',
              },
            }}
          >
            <Box>
              <Typography
                component="h1"
                sx={{
                  color: '#173B66',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                }}
              >
                Gestión de turnos
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  color: '#64748B',
                  fontSize: '0.9rem',
                }}
              >
                Zona de operación: America/Monterrey.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              onClick={cargarDatos}
              disabled={ocupado}
              sx={{
                textTransform: 'none',
                minHeight: 42,
                flexShrink: 0,
              }}
            >
              {cargando ? 'Actualizando...' : 'Actualizar datos'}
            </Button>
          </Stack>
        </Paper>

        {mensaje && (
          <Alert
            severity={mensaje.severity}
            onClose={() => setMensaje(null)}
          >
            {mensaje.texto}
          </Alert>
        )}

        {errorCarga && (
          <Alert severity="error">
            {errorCarga}
            {' '}
            Los formularios permanecerán deshabilitados hasta
            verificar la sesión y cargar los datos correctamente.
          </Alert>
        )}

        {cargando && (
          <Paper sx={panelSx}>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <CircularProgress size={24} />

              <Typography sx={{ color: '#64748B' }}>
                Verificando sesión y cargando horarios…
              </Typography>
            </Stack>
          </Paper>
        )}

        {autorizado && datosListos && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            {[
              ['Horarios registrados', turnos.length],
              ['ISM/MESA activos', ingenieros.length],
              ['Asignaciones registradas', asignaciones.length],
            ].map(([titulo, cantidad]) => (
              <Paper key={titulo} sx={panelSx}>
                <Typography
                  sx={{
                    color: '#64748B',
                    fontSize: '0.9rem',
                  }}
                >
                  {titulo}
                </Typography>

                <Typography
                  sx={{
                    mt: 1,
                    color: '#173B66',
                    fontSize: '1.8rem',
                    fontWeight: 800,
                  }}
                >
                  {cantidad}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: 'repeat(2, minmax(0, 1fr))',
            },
            gap: 2,
            alignItems: 'start',
          }}
        >
          <Paper
            component="form"
            onSubmit={crearHorario}
            sx={panelSx}
          >
            <TituloSeccion>Crear horario</TituloSeccion>

            <Stack spacing={2}>
              <TextField
                label="Nombre del horario"
                placeholder="Ejemplo: Nocturno entre semana"
                value={horario.nombre}
                onChange={(event) =>
                  cambiarHorario('nombre', event.target.value)
                }
                required
                fullWidth
                disabled={formularioDeshabilitado}
                slotProps={{
                  htmlInput: {
                    maxLength: 100,
                  },
                }}
              />

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
                <TextField
                  label="Hora de entrada"
                  type="time"
                  value={horario.horaInicio}
                  onChange={(event) =>
                    cambiarHorario('horaInicio', event.target.value)
                  }
                  required
                  fullWidth
                  disabled={formularioDeshabilitado}
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                    htmlInput: {
                      step: 60,
                    },
                  }}
                />

                <TextField
                  label="Hora de salida"
                  type="time"
                  value={horario.horaFin}
                  onChange={(event) =>
                    cambiarHorario('horaFin', event.target.value)
                  }
                  required
                  fullWidth
                  disabled={formularioDeshabilitado}
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                    htmlInput: {
                      step: 60,
                    },
                  }}
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: '#475569',
                    fontWeight: 700,
                  }}
                >
                  Días de inicio de jornada
                </Typography>

                <FormGroup row>
                  {DIAS.map((dia) => (
                    <FormControlLabel
                      key={dia.valor}
                      label={dia.nombre}
                      control={
                        <Checkbox
                          checked={horario.diasSemana.includes(
                            dia.valor,
                          )}
                          onChange={() => alternarDia(dia.valor)}
                          disabled={formularioDeshabilitado}
                        />
                      }
                    />
                  ))}
                </FormGroup>
              </Box>

              {cruzaMedianoche && (
                <Alert severity="info">
                  Este horario termina al día siguiente.
                  Los días seleccionados corresponden al inicio
                  de la jornada.
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                disabled={formularioDeshabilitado}
                sx={botonSx}
              >
                {guardandoHorario
                  ? 'Guardando...'
                  : 'Guardar horario'}
              </Button>
            </Stack>
          </Paper>

          <Paper
            component="form"
            onSubmit={asignarHorario}
            sx={panelSx}
          >
            <TituloSeccion>
              Asignar horario a ISM/MESA
            </TituloSeccion>

            <Stack spacing={2}>
              <FormControl
                fullWidth
                required
                disabled={
                  formularioDeshabilitado ||
                  ingenieros.length === 0
                }
              >
                <InputLabel id="turno-ism-label">
                  ISM/MESA
                </InputLabel>

                <Select
                  labelId="turno-ism-label"
                  label="ISM/MESA"
                  value={asignacion.idIngeniero}
                  onChange={(event) =>
                    cambiarAsignacion(
                      'idIngeniero',
                      event.target.value,
                    )
                  }
                >
                  {ingenieros.map((ingeniero) => (
                    <MenuItem
                      key={ingeniero.id}
                      value={String(ingeniero.id)}
                    >
                      {ingeniero.nombreCompleto}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                required
                disabled={
                  formularioDeshabilitado ||
                  turnosActivos.length === 0
                }
              >
                <InputLabel id="turno-horario-label">
                  Horario
                </InputLabel>

                <Select
                  labelId="turno-horario-label"
                  label="Horario"
                  value={asignacion.idTurno}
                  onChange={(event) =>
                    cambiarAsignacion(
                      'idTurno',
                      event.target.value,
                    )
                  }
                >
                  {turnosActivos.map((turno) => (
                    <MenuItem
                      key={turno.id}
                      value={String(turno.id)}
                    >
                      {turno.nombre}
                      {' · '}
                      {turno.horaInicio}–{turno.horaFin}
                      {turno.cruzaMedianoche ? ' (+1 día)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

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
                <TextField
                  label="Fecha inicial"
                  type="date"
                  value={asignacion.fechaInicio}
                  onChange={(event) =>
                    cambiarAsignacion(
                      'fechaInicio',
                      event.target.value,
                    )
                  }
                  required
                  fullWidth
                  disabled={formularioDeshabilitado}
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                />

                <TextField
                  label="Fecha final (opcional)"
                  type="date"
                  value={asignacion.fechaFin}
                  onChange={(event) =>
                    cambiarAsignacion(
                      'fechaFin',
                      event.target.value,
                    )
                  }
                  fullWidth
                  disabled={formularioDeshabilitado}
                  helperText="Vacía: vigencia sin fecha final."
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                    htmlInput: {
                      min: asignacion.fechaInicio || undefined,
                    },
                  }}
                />
              </Box>

              <TextField
                label="Motivo de la asignación"
                value={asignacion.motivo}
                onChange={(event) =>
                  cambiarAsignacion('motivo', event.target.value)
                }
                multiline
                minRows={2}
                required
                fullWidth
                disabled={formularioDeshabilitado}
                slotProps={{
                  htmlInput: {
                    maxLength: 2000,
                  },
                }}
              />

              <Alert severity="info">
                La fecha final incluye las jornadas que comienzan
                ese día, aunque terminen al día siguiente.
              </Alert>

              {datosListos && ingenieros.length === 0 && (
                <Alert severity="warning">
                  No hay usuarios activos con rol ISM/MESA.
                </Alert>
              )}

              {datosListos && turnosActivos.length === 0 && (
                <Alert severity="warning">
                  Primero crea un horario para poder asignarlo.
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                disabled={
                  formularioDeshabilitado ||
                  ingenieros.length === 0 ||
                  turnosActivos.length === 0
                }
                sx={botonSx}
              >
                {guardandoAsignacion
                  ? 'Asignando...'
                  : 'Guardar asignación'}
              </Button>
            </Stack>
          </Paper>
        </Box>

        {autorizado && datosListos && (
          <>
            <Paper sx={panelSx}>
              <TituloSeccion>
                Horarios registrados
              </TituloSeccion>

              <TableContainer>
                <Table size="small" sx={tablaSx}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Entrada</TableCell>
                      <TableCell>Salida</TableCell>
                      <TableCell>Días de inicio</TableCell>
                      <TableCell>Zona horaria</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {turnos.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          align="center"
                          sx={{ py: 4 }}
                        >
                          Todavía no hay horarios registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      turnos.map((turno) => (
                        <TableRow key={turno.id}>
                          <TableCell>
                            {turno.nombre}
                          </TableCell>

                          <TableCell>
                            {turno.horaInicio}
                          </TableCell>

                          <TableCell>
                            {turno.horaFin}

                            {turno.cruzaMedianoche && (
                              <Typography
                                component="span"
                                sx={{
                                  ml: 1,
                                  color: '#1674B7',
                                  fontSize: '0.75rem',
                                }}
                              >
                                +1 día
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            {mostrarDias(turno.diasSemana)}
                          </TableCell>

                          <TableCell>
                            {turno.zonaHoraria}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                turno.activo ? 'Activo' : 'Inactivo'
                              }
                              color={
                                turno.activo ? 'success' : 'default'
                              }
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper sx={panelSx}>
              <TituloSeccion>
                Asignaciones registradas
              </TituloSeccion>

              <Typography
                sx={{
                  mb: 2,
                  color: '#64748B',
                  fontSize: '0.85rem',
                }}
              >
                Esta lista muestra registros de asignación.
                No confirma que el ISM esté disponible en este momento.
              </Typography>

              <TableContainer>
                <Table
                  size="small"
                  sx={{
                    ...tablaSx,
                    minWidth: 1100,
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>ISM/MESA</TableCell>
                      <TableCell>Horario</TableCell>
                      <TableCell>Horas</TableCell>
                      <TableCell>Días de inicio</TableCell>
                      <TableCell>Desde</TableCell>
                      <TableCell>Hasta</TableCell>
                      <TableCell>Registro</TableCell>
                      <TableCell>Asignado por</TableCell>
                      <TableCell>Motivo</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {asignaciones.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          align="center"
                          sx={{ py: 4 }}
                        >
                          Todavía no hay asignaciones registradas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      asignaciones.map((registro) => (
                        <TableRow key={registro.id}>
                          <TableCell>
                            {registro.ingeniero}
                          </TableCell>

                          <TableCell>
                            {registro.turno}
                          </TableCell>

                          <TableCell
                            sx={{ whiteSpace: 'nowrap' }}
                          >
                            {registro.horaInicio}–{registro.horaFin}
                            {registro.cruzaMedianoche
                              ? ' (+1 día)'
                              : ''}
                          </TableCell>

                          <TableCell>
                            {mostrarDias(registro.diasSemana)}
                          </TableCell>

                          <TableCell
                            sx={{ whiteSpace: 'nowrap' }}
                          >
                            {mostrarFecha(registro.fechaInicio)}
                          </TableCell>

                          <TableCell
                            sx={{ whiteSpace: 'nowrap' }}
                          >
                            {mostrarFecha(registro.fechaFin)}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                registro.cancelada
                                  ? 'Cancelada'
                                  : 'No cancelada'
                              }
                              color={
                                registro.cancelada
                                  ? 'default'
                                  : 'info'
                              }
                              variant="outlined"
                            />
                          </TableCell>

                          <TableCell>
                            {registro.nombreAsignador}
                          </TableCell>

                          <TableCell sx={{ minWidth: 200 }}>
                            {registro.motivo}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        <Alert severity="warning">
          El cálculo de disponibilidad actual sigue pendiente.
          Estar “En mesa” o tener una asignación registrada
          no confirma por sí solo que una persona esté dentro
          de turno y sin bloqueos.
        </Alert>
      </Stack>
    </DashboardLayout>
  );
}

export default ShiftManagementPage;