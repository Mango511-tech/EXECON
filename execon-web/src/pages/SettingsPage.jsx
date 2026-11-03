import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, FormControl, FormControlLabel,
  InputLabel, MenuItem, Paper, Radio, RadioGroup, Select, Stack, Switch,
  TextField, Typography } from '@mui/material';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../api/client';
import { usePreferences } from '../context/PreferencesContext';

const SECTIONS = ['cuenta', 'apariencia', 'idioma', 'preferencias', 'seguridad'];
const LABELS = {
  'es-MX': ['Mi cuenta', 'Apariencia', 'Idioma', 'Preferencias', 'Seguridad'],
  'en-US': ['My account', 'Appearance', 'Language', 'Preferences', 'Security'],
};
function errorText(error) {
  if (error.response?.status === 401) return 'Sesión no válida. Cierra sesión y vuelve a ingresar. / Invalid session. Please sign in again.';
  return error.response?.data?.message || error.message || 'No fue posible completar la operación.';
}
const cardSx = { p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 };

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('seccion');
  const section = SECTIONS.includes(requested) ? requested : 'cuenta';
  const { preferences, loading, error, savePreferences, reloadPreferences } = usePreferences();
  const [draft, setDraft] = useState(preferences);
  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState('');
  const [accountRevision, setAccountRevision] = useState(0);
  const [password, setPassword] = useState({ actual: '', nueva: '', confirmar: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const en = preferences.idioma === 'en-US';
  const text = (es, english) => en ? english : es;
  const labels = LABELS[preferences.idioma] || LABELS['es-MX'];

  useEffect(() => { setDraft(preferences); }, [preferences]);
  useEffect(() => {
    let active = true;
    setAccountLoading(true);
    setAccountError('');
    api.get('/auth/me').then(({ data }) => {
      if (!data?.data) throw new Error('Respuesta de perfil inválida.');
      if (active) setAccount(data.data);
    }).catch((err) => { if (active) setAccountError(errorText(err)); })
      .finally(() => { if (active) setAccountLoading(false); });
    return () => { active = false; };
  }, [accountRevision]);

  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  async function submitPreferences(event) {
    event.preventDefault();
    setBusy(true); setMessage(null);
    try {
      await savePreferences(draft);
      setMessage({ severity: 'success', text: text('Preferencias guardadas en tu cuenta.', 'Preferences saved to your account.') });
    } catch (err) { setMessage({ severity: 'error', text: errorText(err) }); }
    finally { setBusy(false); }
  }
  async function submitAccount(event) {
    event.preventDefault();
    if (!account?.nombreCompleto?.trim() || !account?.correo?.trim()) return;
    setBusy(true); setMessage(null);
    try {
      const { data } = await api.patch('/auth/mi-perfil', {
        nombreCompleto: account.nombreCompleto.trim(), correo: account.correo.trim(),
      });
      if (!data?.data) throw new Error('Respuesta de perfil inválida.');
      setAccount(data.data);
      // Conserva los campos de sesión existentes; no cambia el token.
      try {
        const previous = JSON.parse(localStorage.getItem('execon_usuario') || 'null');
        if (Number(previous?.id) === Number(data.data.id)) {
          localStorage.setItem('execon_usuario', JSON.stringify({ ...previous, ...data.data }));
        }
      } catch { /* El perfil de PostgreSQL ya se guardó. */ }
      setMessage({ severity: 'success', text: text('Perfil guardado en PostgreSQL.', 'Profile saved to PostgreSQL.') });
    } catch (err) { setMessage({ severity: 'error', text: errorText(err) }); }
    finally { setBusy(false); }
  }
  async function submitPassword(event) {
    event.preventDefault(); setMessage(null);
    if (password.nueva !== password.confirmar) {
      setMessage({ severity: 'error', text: text('Las contraseñas no coinciden.', 'Passwords do not match.') }); return;
    }
    if (password.nueva.length < 8 || new TextEncoder().encode(password.nueva).length > 72) {
      setMessage({ severity: 'error', text: text('Usa al menos 8 caracteres y como máximo 72 bytes UTF-8.', 'Use at least 8 characters and at most 72 UTF-8 bytes.') }); return;
    }
    if (password.actual === password.nueva) {
      setMessage({ severity: 'error', text: text('La nueva contraseña debe ser diferente.', 'The new password must be different.') }); return;
    }
    setBusy(true);
    try {
      await api.patch('/auth/cambiar-contrasena', {
        contrasenaActual: password.actual, nuevaContrasena: password.nueva,
      });
      setPassword({ actual: '', nueva: '', confirmar: '' });
      setMessage({ severity: 'success', text: text('Contraseña actualizada.', 'Password updated.') });
    } catch (err) { setMessage({ severity: 'error', text: errorText(err) }); }
    finally { setBusy(false); }
  }
  const prefsDisabled = loading || Boolean(error) || busy;
  return <DashboardLayout title={text('Configuración', 'Settings')}>
    <Stack spacing={2}>
      <Typography component="h1" variant="h5">{text('Configuración', 'Settings')}</Typography>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {loading && <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><CircularProgress size={22} /><Typography>{text('Cargando preferencias…', 'Loading preferences…')}</Typography></Stack>}
      {error && <Alert severity="error" action={<Button disabled={busy || loading} onClick={reloadPreferences}>{text('Reintentar', 'Retry')}</Button>}>{error}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '230px minmax(0,1fr)' }, gap: 2, alignItems: 'start' }}>
        <Paper sx={cardSx}><Stack spacing={1}>{SECTIONS.map((id, index) =>
          <Button key={id} disabled={busy} variant={section === id ? 'contained' : 'text'}
            sx={{ justifyContent: 'flex-start' }} onClick={() => {
              setParams((current) => { const next = new URLSearchParams(current); next.set('seccion', id); return next; });
              setMessage(null);
            }}>{labels[index]}</Button>)}</Stack></Paper>
        <Paper sx={cardSx}>
          <Typography component="h2" variant="h6" sx={{ mb: 2 }}>{labels[SECTIONS.indexOf(section)]}</Typography>
          {section === 'cuenta' && <>
            {accountLoading ? <CircularProgress size={26} /> : accountError ?
              <Alert severity="error" action={<Button onClick={() => setAccountRevision((n) => n + 1)}>{text('Reintentar', 'Retry')}</Button>}>{accountError}</Alert> : account &&
              <Stack component="form" spacing={2} onSubmit={submitAccount}>
                <TextField label={text('Nombre completo', 'Full name')} value={account.nombreCompleto || ''} required disabled={busy}
                  onChange={(event) => setAccount((current) => ({ ...current, nombreCompleto: event.target.value }))} />
                <TextField label={text('Correo electrónico', 'Email address')} type="email" value={account.correo || ''} required disabled={busy}
                  onChange={(event) => setAccount((current) => ({ ...current, correo: event.target.value }))} />
                <TextField label={text('Rol', 'Role')} value={account.rol || ''} disabled />
                <Button variant="contained" type="submit" disabled={busy}>{busy ? text('Guardando…', 'Saving…') : text('Guardar perfil', 'Save profile')}</Button>
              </Stack>}
          </>}
          {['apariencia','idioma','preferencias'].includes(section) &&
            <Stack component="form" spacing={2} onSubmit={submitPreferences}>
              {section === 'apariencia' && <>
                <RadioGroup value={draft.tema} onChange={(event) => change('tema', event.target.value)}>
                  {[['claro',text('Claro','Light')],['oscuro',text('Oscuro','Dark')],['sistema',text('Sistema','System')]].map(([value,label]) =>
                    <FormControlLabel key={value} value={value} label={label} disabled={prefsDisabled} control={<Radio />} />)}
                </RadioGroup>
                <Alert severity="info">{text('Se aplica al guardar. Las pantallas con colores fijos aún requieren adaptación al tema.', 'Applied on save. Screens with fixed colors still require theme adaptation.')}</Alert>
              </>}
              {section === 'idioma' && <>
                <FormControl fullWidth disabled={prefsDisabled}><InputLabel id="settings-language">{text('Idioma','Language')}</InputLabel>
                  <Select labelId="settings-language" label={text('Idioma','Language')} value={draft.idioma} onChange={(event) => change('idioma',event.target.value)}>
                    <MenuItem value="es-MX">Español (México)</MenuItem><MenuItem value="en-US">English (United States)</MenuItem>
                  </Select></FormControl>
                <Alert severity="info">{text('Esta entrega traduce Configuración y los textos estándar de Material UI. Las demás pantallas aún no tienen traducciones.', 'This update translates Settings and standard Material UI messages. Other screens are not translated yet.')}</Alert>
              </>}
              {section === 'preferencias' && <>
                {[
                  ['notificaciones',text('Notificaciones del sistema','System notifications')],
                  ['recordatoriosOnsite',text('Recordatorios de onsite','Onsite reminders')],
                  ['confirmarCierreSesion',text('Confirmar cierre de sesión','Confirm sign out')],
                ].map(([key,label]) => <FormControlLabel key={key} label={label} disabled={prefsDisabled}
                  control={<Switch checked={draft[key]} onChange={(event) => change(key,event.target.checked)} />} />)}
                <FormControl fullWidth disabled={prefsDisabled}><InputLabel id="settings-rows">{text('Registros por página','Rows per page')}</InputLabel>
                  <Select labelId="settings-rows" label={text('Registros por página','Rows per page')} value={draft.registrosPorPagina} onChange={(event) => change('registrosPorPagina', Number(event.target.value))}>
                    {[10,20,50].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                  </Select></FormControl>
                <Alert severity="warning">{text('La paginación se aplica en Gestión de Usuarios. Notificaciones, recordatorios y confirmación de salida se guardan, pero sus componentes aún deben conectarse.', 'Pagination applies to User Management. Notifications, reminders and sign-out confirmation are saved, but their components still need integration.')}</Alert>
              </>}
              <Button variant="contained" type="submit" disabled={prefsDisabled}>{busy ? text('Guardando…','Saving…') : text('Guardar preferencias','Save preferences')}</Button>
            </Stack>}
          {section === 'seguridad' && <Stack component="form" spacing={2} onSubmit={submitPassword}>
            {[
              ['actual',text('Contraseña actual','Current password'),'current-password'],
              ['nueva',text('Nueva contraseña','New password'),'new-password'],
              ['confirmar',text('Confirmar nueva contraseña','Confirm new password'),'new-password'],
            ].map(([key,label,autoComplete]) => <TextField key={key} label={label} type="password" autoComplete={autoComplete} required disabled={busy}
              value={password[key]} onChange={(event) => setPassword((current) => ({ ...current, [key]: event.target.value }))}
              slotProps={{ htmlInput: { minLength: key === 'actual' ? undefined : 8 } }} />)}
            <Button variant="contained" type="submit" disabled={busy}>{busy ? text('Guardando…','Saving…') : text('Cambiar contraseña','Change password')}</Button>
          </Stack>}
        </Paper>
      </Box>
    </Stack>
  </DashboardLayout>;
}
