import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline, useMediaQuery } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';
import api from '../api/client';
import { createDynamicTheme } from '../theme/dynamicTheme';

const Context = createContext(null);

export const DEFAULT_PREFERENCES = {
  tema: 'claro',
  idioma: 'es-MX',
  notificaciones: true,
  recordatoriosOnsite: true,
  confirmarCierreSesion: true,
  registrosPorPagina: 10,
};

export const translations = {
  'es-MX': {
    navGeneral: 'Vista General',
    navDistribution: 'Distribución de Onsite',
    navPlanning: 'Planeación',
    navShifts: 'Turnos y disponibilidad',
    navUsers: 'Gestión de Usuarios',
    navConfig: 'Configuración',
    navLogout: 'Cerrar sesión',
    userRoleAdmin: 'Supervisor / Admin',
    dashTitle: 'Vista General',
    statusMesa: 'En mesa',
    statusCampo: 'En campo',
    statusComida: 'En comida',
    statusProyecto: 'En proyecto',
    statusSinReportar: 'Sin reportar',
    statusVacaciones: 'En vacaciones',
    trendsTitle: 'Disponibilidad y tendencias',
    dailyAvailability: 'Disponibilidad por día',
    recurrenceTitle: 'Reincidencia por estatus',
    volumetryTitle: 'Volumetría de ISM/MESA',
    btnMonth: 'Mes',
    btnWeek: 'Semana',
    btnDay: 'Día',
    allSites: 'Todos los sitios',
    searchPlaceholder: 'Buscar...',
    onsiteTitle: 'Asignación y registro de Onsite',
    createIncident: 'Crear incidente',
    assignOnsite: 'Asignar onsite',
    availableAgent: 'ISM/MESA disponible',
    searchIncident: 'Buscar incidente',
    tableOnsiteTitle: 'Tabla concentradora de Onsite',
  },
  'en-US': {
    navGeneral: 'Overview',
    navDistribution: 'Onsite Distribution',
    navPlanning: 'Planning',
    navShifts: 'Shifts & Availability',
    navUsers: 'User Management',
    navConfig: 'Settings',
    navLogout: 'Sign out',
    userRoleAdmin: 'Supervisor / Admin',
    dashTitle: 'Overview',
    statusMesa: 'At desk',
    statusCampo: 'In field',
    statusComida: 'At lunch',
    statusProyecto: 'In project',
    statusSinReportar: 'Unreported',
    statusVacaciones: 'On vacation',
    trendsTitle: 'Availability and Trends',
    dailyAvailability: 'Daily Availability',
    recurrenceTitle: 'Recurrence by Status',
    volumetryTitle: 'ISM/Desk Volumetry',
    btnMonth: 'Month',
    btnWeek: 'Week',
    btnDay: 'Day',
    allSites: 'All sites',
    searchPlaceholder: 'Search...',
    onsiteTitle: 'Onsite Assignment & Log',
    createIncident: 'Create incident',
    assignOnsite: 'Assign onsite',
    availableAgent: 'Available ISM/Desk',
    searchIncident: 'Search incident',
    tableOnsiteTitle: 'Onsite Summary Table',
  },
};

function clean(data) {
  return {
    tema: ['claro', 'oscuro', 'sistema'].includes(data?.tema) ? data.tema : 'claro',
    idioma: data?.idioma === 'en-US' ? 'en-US' : 'es-MX',
    notificaciones: typeof data?.notificaciones === 'boolean' ? data.notificaciones : true,
    recordatoriosOnsite: typeof data?.recordatoriosOnsite === 'boolean' ? data.recordatoriosOnsite : true,
    confirmarCierreSesion: typeof data?.confirmarCierreSesion === 'boolean' ? data.confirmarCierreSesion : true,
    registrosPorPagina: [10, 20, 50].includes(Number(data?.registrosPorPagina))
      ? Number(data.registrosPorPagina)
      : 10,
  };
}

export function PreferencesProvider({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('execon_token');
  const [record, setRecord] = useState({ token: null, data: DEFAULT_PREFERENCES });
  const [loadState, setLoadState] = useState({ token: null, loading: false, error: '' });
  const [revision, setRevision] = useState(0);

  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const preferences = record.token === token ? record.data : DEFAULT_PREFERENCES;
  const loading = Boolean(token) && (loadState.token !== token || loadState.loading);
  const error = loadState.token === token ? loadState.error : '';

  useEffect(() => {
    let active = true;
    if (!token) {
      setRecord({ token: null, data: DEFAULT_PREFERENCES });
      setLoadState({ token: null, loading: false, error: '' });
      return () => {
        active = false;
      };
    }

    setLoadState({ token, loading: true, error: '' });
    api
      .get('/auth/preferencias')
      .then(({ data }) => {
        if (!data?.success || !data.data) {
          if (active) setRecord({ token, data: DEFAULT_PREFERENCES });
          return;
        }
        if (active) setRecord({ token, data: clean(data.data) });
      })
      .catch((err) => {
        if (active) {
          // Si da 401 o no existe el endpoint, usa DEFAULT sin lanzar error crítico
          setRecord({ token, data: DEFAULT_PREFERENCES });
          setLoadState({
            token,
            loading: false,
            error: err.response?.status === 401 ? '' : (err.response?.data?.message || err.message),
          });
        }
      })
      .finally(() => {
        if (active) setLoadState((current) => ({ ...current, loading: false }));
      });

    return () => {
      active = false;
    };
  }, [token, revision]);

  const mode =
    preferences.tema === 'sistema'
      ? systemDark
        ? 'dark'
        : 'light'
      : preferences.tema === 'oscuro'
      ? 'dark'
      : 'light';

  const theme = useMemo(
    () => createDynamicTheme(mode, preferences.idioma),
    [mode, preferences.idioma],
  );

  useEffect(() => {
    document.documentElement.lang = preferences.idioma;
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode, preferences.idioma, location.pathname]);

  async function savePreferences(next) {
    if (!token) return;
    const payload = clean(next);
    try {
      const { data } = await api.patch('/auth/preferencias', payload);
      if (localStorage.getItem('execon_token') === token && data?.data) {
        setRecord({ token, data: clean(data.data) });
      }
      return data;
    } catch {
      setRecord({ token, data: payload });
    }
  }

  const t = (key, params = {}) => {
    const currentLang = preferences.idioma === 'en-US' ? 'en-US' : 'es-MX';
    let text = translations[currentLang]?.[key] || translations['es-MX']?.[key] || key;
    Object.keys(params).forEach((k) => {
      text = text.replace(`{${k}}`, params[k]);
    });
    return text;
  };

  return (
    <Context.Provider
      value={{
        preferences,
        loading,
        error,
        t,
        isDark: mode === 'dark',
        savePreferences,
        reloadPreferences: () => setRevision((n) => n + 1),
      }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Context.Provider>
  );
}

export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('Falta PreferencesProvider en main.jsx.');
  return value;
}