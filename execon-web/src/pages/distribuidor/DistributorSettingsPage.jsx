import { useEffect, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import { useSearchParams } from 'react-router-dom';

import api from '../../api/client';
import DistributorLayout from '../../layouts/DistributorLayout';

const SECCIONES = [
  { value: 'perfil', label: 'Mi cuenta' },
  { value: 'tema', label: 'Tema de color' },
  { value: 'idioma', label: 'Idioma' },
  { value: 'preferencias', label: 'Preferencias' },
];

const PREFERENCE_KEYS = [
  'tema',
  'idioma',
  'notificaciones',
  'recordatoriosOnsite',
  'confirmarCierreSesion',
  'registrosPorPagina',
];

function errorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function DistributorSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedSection = searchParams.get('seccion');

  const section = SECCIONES.some(
    (item) => item.value === requestedSection,
  )
    ? requestedSection
    : 'perfil';

  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(null);

  const [passwords, setPasswords] = useState({
    actual: '',
    nueva: '',
    confirmar: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const busy = Boolean(saving);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      setLoading(true);
      setLoadError('');
      setMessage(null);

      try {
        const [profileResponse, preferencesResponse] =
          await Promise.all([
            api.get('/auth/me', {
              signal: controller.signal,
            }),
            api.get('/auth/preferencias', {
              signal: controller.signal,
            }),
          ]);

        const user = profileResponse.data?.data;
        const prefs = preferencesResponse.data?.data;

        if (
          !user ||
          !prefs ||
          !PREFERENCE_KEYS.every((key) => key in prefs)
        ) {
          throw new Error(
            'El servidor devolvió una configuración incompleta.',
          );
        }

        if (controller.signal.aborted) return;

        setProfile({
          nombreCompleto: user.nombreCompleto || '',
          correo: user.correo || '',
          rol: user.rol || '',
        });

        setPreferences({
          tema: prefs.tema,
          idioma: prefs.idioma,
          notificaciones: prefs.notificaciones,
          recordatoriosOnsite: prefs.recordatoriosOnsite,
          confirmarCierreSesion: prefs.confirmarCierreSesion,
          registrosPorPagina: Number(prefs.registrosPorPagina),
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setProfile(null);
        setPreferences(null);

        setLoadError(
          errorMessage(
            error,
            'No fue posible cargar la configuración.',
          ),
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => controller.abort();
  }, [reloadKey]);

  const changeSection = (_, value) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('seccion', value);
    setSearchParams(nextParams);
    setMessage(null);
  };

  const updateProfile = (key, value) => {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updatePreference = (key, value) => {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updatePassword = (key, value) => {
    setPasswords((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    if (busy || !profile) return;

    const nombreCompleto = profile.nombreCompleto.trim();
    const correo = profile.correo.trim().toLowerCase();

    if (!nombreCompleto || !correo) {
      setMessage({
        severity: 'warning',
        text: 'Nombre y correo son obligatorios.',
      });
      return;
    }

    setSaving('perfil');
    setMessage(null);

    try {
      const response = await api.patch('/auth/mi-perfil', {
        nombreCompleto,
        correo,
      });

      const user = response.data?.data;

      if (!user) {
        throw new Error(
          'El servidor no devolvió el perfil actualizado.',
        );
      }

      setProfile({
        nombreCompleto: user.nombreCompleto,
        correo: user.correo,
        rol: user.rol,
      });

      // Actualiza la información local, no el token.
      try {
        const previous = JSON.parse(
          localStorage.getItem('execon_usuario') || 'null',
        );

        localStorage.setItem(
          'execon_usuario',
          JSON.stringify({
            ...(previous || {}),
            id: user.id,
            nombreCompleto: user.nombreCompleto,
            correo: user.correo,
            rol: user.rol,
          }),
        );

        setMessage({
          severity: 'success',
          text: 'Perfil actualizado correctamente.',
        });
      } catch {
        setMessage({
          severity: 'warning',
          text:
            'El perfil se guardó, pero no se pudo actualizar la información local. Cierra sesión y vuelve a entrar.',
        });
      }
    } catch (error) {
      setMessage({
        severity: 'error',
        text: errorMessage(
          error,
          'No fue posible actualizar el perfil.',
        ),
      });
    } finally {
      setSaving('');
    }
  };

  const savePreferences = async (event) => {
    event.preventDefault();

    if (busy || !preferences) return;

    setSaving('preferencias');
    setMessage(null);

    try {
      // El backend requiere todos los campos, también al
      // guardar únicamente tema o idioma.
      const response = await api.patch('/auth/preferencias', {
        tema: preferences.tema,
        idioma: preferences.idioma,
        notificaciones: preferences.notificaciones,
        recordatoriosOnsite: preferences.recordatoriosOnsite,
        confirmarCierreSesion: preferences.confirmarCierreSesion,
        registrosPorPagina: Number(
          preferences.registrosPorPagina,
        ),
      });

      const prefs = response.data?.data;

      if (
        !prefs ||
        !PREFERENCE_KEYS.every((key) => key in prefs)
      ) {
        throw new Error(
          'El servidor no devolvió las preferencias completas.',
        );
      }

      setPreferences({
        tema: prefs.tema,
        idioma: prefs.idioma,
        notificaciones: prefs.notificaciones,
        recordatoriosOnsite: prefs.recordatoriosOnsite,
        confirmarCierreSesion: prefs.confirmarCierreSesion,
        registrosPorPagina: Number(prefs.registrosPorPagina),
      });

      setMessage({
        severity: 'success',
        text: 'Preferencias guardadas correctamente.',
      });
    } catch (error) {
      setMessage({
        severity: 'error',
        text: errorMessage(
          error,
          'No fue posible guardar las preferencias.',
        ),
      });
    } finally {
      setSaving('');
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();

    if (busy) return;

    if (!passwords.actual || !passwords.nueva) {
      setMessage({
        severity: 'warning',
        text: 'Ingresa tu contraseña actual y la nueva.',
      });
      return;
    }

    if (passwords.nueva.length < 8) {
      setMessage({
        severity: 'warning',
        text: 'La nueva contraseña debe tener al menos 8 caracteres.',
      });
      return;
    }

    if (passwords.nueva !== passwords.confirmar) {
      setMessage({
        severity: 'warning',
        text: 'La confirmación no coincide con la nueva contraseña.',
      });
      return;
    }

    setSaving('contrasena');
    setMessage(null);

    try {
      await api.patch('/auth/cambiar-contrasena', {
        contrasenaActual: passwords.actual,
        nuevaContrasena: passwords.nueva,
      });

      setPasswords({
        actual: '',
        nueva: '',
        confirmar: '',
      });

      setMessage({
        severity: 'success',
        text: 'Contraseña actualizada correctamente.',
      });
    } catch (error) {
      setMessage({
        severity: 'error',
        text: errorMessage(
          error,
          'No fue posible cambiar la contraseña.',
        ),
      });
    } finally {
      setSaving('');
    }
  };

  return (
    <DistributorLayout
  >
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
            Configuración de mi cuenta
          </Typography>

          <Typography
            sx={{ mt: 0.5, color: '#64748B', fontSize: '0.9rem' }}
          >
            Estos ajustes solo corresponden a tu cuenta.
          </Typography>
        </Box>

        <Tabs
          value={section}
          onChange={changeSection}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Secciones de configuración"
          sx={{
            px: 1,
            borderBottom: '1px solid #E7EDF4',
          }}
        >
          {SECCIONES.map((item) => (
            <Tab
              key={item.value}
              value={item.value}
              label={item.label}
              disabled={busy}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
              }}
            />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {message && (
            <Alert
              severity={message.severity}
              onClose={() => setMessage(null)}
              sx={{ mb: 2 }}
            >
              {message.text}
            </Alert>
          )}

          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={22} />
              <Typography>Cargando configuración…</Typography>
            </Stack>
          ) : loadError ? (
            <Stack spacing={2}>
              <Alert severity="error">{loadError}</Alert>

              <Button
                onClick={() => setReloadKey((value) => value + 1)}
                sx={{ alignSelf: 'flex-start' }}
              >
                Reintentar
              </Button>
            </Stack>
          ) : (
            <Box sx={{ maxWidth: 650 }}>
              {section === 'perfil' && (
                <Stack spacing={3}>
                  <Box component="form" onSubmit={saveProfile}>
                    <Stack spacing={2}>
                      <Typography
                        sx={{ color: '#173B66', fontWeight: 800 }}
                      >
                        Datos personales
                      </Typography>

                      <TextField
                        label="Nombre completo"
                        value={profile.nombreCompleto}
                        onChange={(event) =>
                          updateProfile(
                            'nombreCompleto',
                            event.target.value,
                          )
                        }
                        disabled={busy}
                        required
                        fullWidth
                        inputProps={{ maxLength: 150 }}
                      />

                      <TextField
                        label="Correo electrónico"
                        type="email"
                        value={profile.correo}
                        onChange={(event) =>
                          updateProfile('correo', event.target.value)
                        }
                        disabled={busy}
                        required
                        fullWidth
                      />

                      <TextField
                        label="Rol"
                        value={profile.rol}
                        fullWidth
                        InputProps={{ readOnly: true }}
                        helperText="El rol lo administra el supervisor."
                      />

                      <Button
                        type="submit"
                        variant="contained"
                        disabled={busy}
                        sx={{
                          alignSelf: 'flex-start',
                          textTransform: 'none',
                          bgcolor: '#003359',
                        }}
                      >
                        {saving === 'perfil'
                          ? 'Guardando…'
                          : 'Guardar perfil'}
                      </Button>
                    </Stack>
                  </Box>

                  <Box
                    component="form"
                    onSubmit={changePassword}
                    sx={{
                      pt: 3,
                      borderTop: '1px solid #E7EDF4',
                    }}
                  >
                    <Stack spacing={2}>
                      <Typography
                        sx={{ color: '#173B66', fontWeight: 800 }}
                      >
                        Cambiar contraseña
                      </Typography>

                      <TextField
                        label="Contraseña actual"
                        type="password"
                        autoComplete="current-password"
                        value={passwords.actual}
                        onChange={(event) =>
                          updatePassword('actual', event.target.value)
                        }
                        disabled={busy}
                        required
                        fullWidth
                      />

                      <TextField
                        label="Nueva contraseña"
                        type="password"
                        autoComplete="new-password"
                        value={passwords.nueva}
                        onChange={(event) =>
                          updatePassword('nueva', event.target.value)
                        }
                        disabled={busy}
                        required
                        fullWidth
                        helperText="Mínimo 8 caracteres."
                      />

                      <TextField
                        label="Confirmar nueva contraseña"
                        type="password"
                        autoComplete="new-password"
                        value={passwords.confirmar}
                        onChange={(event) =>
                          updatePassword(
                            'confirmar',
                            event.target.value,
                          )
                        }
                        disabled={busy}
                        required
                        fullWidth
                      />

                      <Button
                        type="submit"
                        variant="contained"
                        disabled={busy}
                        sx={{
                          alignSelf: 'flex-start',
                          textTransform: 'none',
                          bgcolor: '#003359',
                        }}
                      >
                        {saving === 'contrasena'
                          ? 'Actualizando…'
                          : 'Actualizar contraseña'}
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              )}

              {section !== 'perfil' && (
                <Box component="form" onSubmit={savePreferences}>
                  <Stack spacing={2}>
                    {section === 'tema' && (
                      <>
                        <TextField
                          select
                          label="Tema de color"
                          value={preferences.tema}
                          onChange={(event) =>
                            updatePreference(
                              'tema',
                              event.target.value,
                            )
                          }
                          disabled={busy}
                          fullWidth
                        >
                          <MenuItem value="claro">Claro</MenuItem>
                          <MenuItem value="oscuro">Oscuro</MenuItem>
                          <MenuItem value="sistema">
                            Usar tema del sistema
                          </MenuItem>
                        </TextField>

                        <Alert severity="info">
                          La elección se guardará en tu cuenta.
                          Su aplicación visual global está pendiente.
                        </Alert>
                      </>
                    )}

                    {section === 'idioma' && (
                      <>
                        <TextField
                          select
                          label="Idioma"
                          value={preferences.idioma}
                          onChange={(event) =>
                            updatePreference(
                              'idioma',
                              event.target.value,
                            )
                          }
                          disabled={busy}
                          fullWidth
                        >
                          <MenuItem value="es-MX">
                            Español — México
                          </MenuItem>
                          <MenuItem value="en-US">
                            English — United States
                          </MenuItem>
                        </TextField>

                        <Alert severity="info">
                          La elección se guardará en tu cuenta.
                          La traducción de las pantallas está pendiente.
                        </Alert>
                      </>
                    )}

                    {section === 'preferencias' && (
                      <>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.notificaciones}
                              disabled={busy}
                              onChange={(_, checked) =>
                                updatePreference(
                                  'notificaciones',
                                  checked,
                                )
                              }
                            />
                          }
                          label="Recibir notificaciones"
                        />

                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.recordatoriosOnsite}
                              disabled={busy}
                              onChange={(_, checked) =>
                                updatePreference(
                                  'recordatoriosOnsite',
                                  checked,
                                )
                              }
                            />
                          }
                          label="Recordatorios de onsite"
                        />

                        <FormControlLabel
                          control={
                            <Switch
                              checked={
                                preferences.confirmarCierreSesion
                              }
                              disabled={busy}
                              onChange={(_, checked) =>
                                updatePreference(
                                  'confirmarCierreSesion',
                                  checked,
                                )
                              }
                            />
                          }
                          label="Confirmar antes de cerrar sesión"
                        />

                        <TextField
                          select
                          label="Registros por página"
                          value={preferences.registrosPorPagina}
                          onChange={(event) =>
                            updatePreference(
                              'registrosPorPagina',
                              Number(event.target.value),
                            )
                          }
                          disabled={busy}
                          fullWidth
                        >
                          {[10, 20, 50].map((value) => (
                            <MenuItem key={value} value={value}>
                              {value}
                            </MenuItem>
                          ))}
                        </TextField>

                        <Alert severity="info">
                          Estos valores se guardan en PostgreSQL.
                          Los avisos, recordatorios, confirmación de
                          cierre y tablas deben conectarse a estas
                          preferencias para utilizarlas.
                        </Alert>
                      </>
                    )}

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={busy}
                      sx={{
                        alignSelf: 'flex-start',
                        textTransform: 'none',
                        bgcolor: '#003359',
                      }}
                    >
                      {saving === 'preferencias'
                        ? 'Guardando…'
                        : 'Guardar preferencias'}
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </DistributorLayout>
  );
}

export default DistributorSettingsPage;