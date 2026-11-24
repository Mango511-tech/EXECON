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
    navHours: 'Horas de jornada',
    navUsers: 'Gestión de Usuarios',
    navConfig: 'Configuración',
    navLogout: 'Cerrar sesión',
    confirmSignOut: '¿Confirmas que deseas cerrar sesión?',
    userRoleAdmin: 'Supervisor / Admin',
    userRoleDistributor: 'Distribuidor',
    userRoleIsm: 'ISM / Mesa',
    navOperations: 'Operación',
    navPersonnel: 'Personal',
    navAdministration: 'Administración',
    navLoggedIncidents: 'Incidentes loggeados',
    navOnsiteAssignment: 'Asignación de onsite',
    navInAttention: 'Incidentes en atención',
    navIsmShift: 'Registro de turno',
    navIsmIncidents: 'Mis incidentes',
    navIsmDuration: 'Duración de actividades',
    settingsAppearance: 'Tema de color',
    settingsLanguage: 'Idioma / Language',
    settingsAdvanced: 'Configuración avanzada',
    languageSpanish: 'Español',
    languageEnglish: 'English',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    themeSystem: 'Sistema',
    ismOverviewTitle: 'Centro de trabajo ISM',
    ismOverviewDescription: 'Consulta tu jornada, administra los incidentes asignados y revisa tus actividades.',
    ismTabOverview: 'Resumen',
    ismTabShift: 'Mi turno',
    ismTabIncidents: 'Incidentes',
    ismTabDuration: 'Duración',
    distributorTitle: 'Panel del distribuidor',
    distributorOverviewDescription: 'Supervisa la disponibilidad de ISM y el estado de los incidentes.',
    distAvailableDesk: 'Disponibles en mesa',
    distPendingOnsites: 'Onsites pendientes',
    distInAttention: 'En atención',
    distAverageDuration: 'Tiempo promedio',
    distAvailabilityTitle: 'Disponibilidad y horarios de los ISM/MESA',
    distLoggedSearch: 'Buscar por folio, cliente, resumen o ubicación...',
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
    navHours: 'Work hours',
    navUsers: 'User Management',
    navConfig: 'Settings',
    navLogout: 'Sign out',
    confirmSignOut: 'Are you sure you want to sign out?',
    userRoleAdmin: 'Supervisor / Admin',
    userRoleDistributor: 'Distributor',
    userRoleIsm: 'ISM / Desk',
    navOperations: 'Operations',
    navPersonnel: 'People',
    navAdministration: 'Administration',
    navLoggedIncidents: 'Logged incidents',
    navOnsiteAssignment: 'Onsite assignment',
    navInAttention: 'Incidents in progress',
    navIsmShift: 'Shift log',
    navIsmIncidents: 'My incidents',
    navIsmDuration: 'Activity duration',
    settingsAppearance: 'Color theme',
    settingsLanguage: 'Language',
    settingsAdvanced: 'Advanced settings',
    languageSpanish: 'Spanish',
    languageEnglish: 'English',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    ismOverviewTitle: 'ISM Work Center',
    ismOverviewDescription: 'Review your shift, manage assigned incidents, and track completed activities.',
    ismTabOverview: 'Overview',
    ismTabShift: 'My shift',
    ismTabIncidents: 'Incidents',
    ismTabDuration: 'Duration',
    distributorTitle: 'Distributor dashboard',
    distributorOverviewDescription: 'Monitor ISM availability and incident status.',
    distAvailableDesk: 'Available at desk',
    distPendingOnsites: 'Pending onsite visits',
    distInAttention: 'In progress',
    distAverageDuration: 'Average duration',
    distAvailabilityTitle: 'ISM/Desk availability and schedules',
    distLoggedSearch: 'Search by ticket, customer, summary, or location...',
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
    document.documentElement.style.setProperty('--app-background', mode === 'dark' ? '#0B0F19' : '#F8FAFC');
    document.documentElement.style.setProperty('--app-foreground', mode === 'dark' ? '#F1F5F9' : '#0F172A');
    document.documentElement.style.setProperty('--app-muted', mode === 'dark' ? '#94A3B8' : '#64748B');
    document.documentElement.style.setProperty('--app-paper', mode === 'dark' ? '#111827' : '#FFFFFF');
    document.documentElement.style.setProperty('--app-border', mode === 'dark' ? '#1E293B' : '#E2E8F0');
    document.documentElement.style.setProperty('--app-table-header', mode === 'dark' ? '#172033' : '#F8FAFC');
    document.documentElement.style.setProperty('--app-row-hover', mode === 'dark' ? '#162033' : '#F8FBFF');
  }, [mode, preferences.idioma, location.pathname]);

  async function savePreferences(next) {
    if (!token) throw new Error('Se requiere una sesión para guardar preferencias.');
    const payload = clean(next);
    const previous = preferences;
    if (localStorage.getItem('execon_token') === token) {
      setRecord({ token, data: payload });
    }
    try {
      const { data } = await api.patch('/auth/preferencias', payload);
      if (!data?.data) throw new Error('El servidor no devolvió las preferencias guardadas.');
      if (localStorage.getItem('execon_token') === token) {
        setRecord({ token, data: clean(data.data) });
      }
      return data;
    } catch (error) {
      if (localStorage.getItem('execon_token') === token) {
        setRecord({ token, data: previous });
      }
      throw error;
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