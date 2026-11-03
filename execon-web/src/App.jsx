import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import OnsiteDistributionPage from './pages/OnsiteDistributionPage';
import PlanningPage from './pages/PlanningPage';
import SettingsPage from './pages/SettingsPage';
import ShiftManagementPage from './pages/ShiftManagementPage';
import UserManagementPage from './pages/UserManagementPage';

import DistributorOverviewPage from './pages/distribuidor/DistributorOverviewPage';
import DistributorSettingsPage from './pages/distribuidor/DistributorSettingsPage';

import IsmMesaDashboardPage from './pages/ism/IsmMesaDashboardPage';

// Configuración de roles autorizados
const ROLES_SUPERVISOR = ['supervisor', 'admin'];
const ROLES_DISTRIBUIDOR = ['distribuidor', 'distribuidoronsite', 'distribuidor_onsite'];
const ROLES_ISM = ['ism/mesa', 'ism_mesa', 'ingeniero', 'ism'];

function obtenerSesion() {
  const token = localStorage.getItem('execon_token');

  try {
    const usuario = JSON.parse(
      localStorage.getItem('execon_usuario') || 'null',
    );

    return {
      token,
      usuario,
      rol: String(usuario?.rol || '').trim().toLowerCase(),
    };
  } catch {
    return {
      token,
      usuario: null,
      rol: '',
    };
  }
}

function obtenerRutaInicial(rol) {
  if (ROLES_ISM.includes(rol)) {
    return '/ism';
  }

  if (ROLES_DISTRIBUIDOR.includes(rol)) {
    return '/distribuidor';
  }

  if (ROLES_SUPERVISOR.includes(rol)) {
    return '/dashboard';
  }

  return '/sin-acceso';
}

function RutaProtegida({ children, rolesPermitidos }) {
  const location = useLocation();
  const { token, usuario, rol } = obtenerSesion();

  if (!token || !usuario || !rol) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (!rolesPermitidos.includes(rol)) {
    return (
      <Navigate
        to={obtenerRutaInicial(rol)}
        replace
      />
    );
  }

  return children;
}

function RutaPublica({ children }) {
  const { token, usuario, rol } = obtenerSesion();

  if (token && usuario && rol) {
    return (
      <Navigate
        to={obtenerRutaInicial(rol)}
        replace
      />
    );
  }

  return children;
}

function RedireccionInicial() {
  const { token, usuario, rol } = obtenerSesion();

  return (
    <Navigate
      to={
        token && usuario && rol
          ? obtenerRutaInicial(rol)
          : '/login'
      }
      replace
    />
  );
}

function SinAccesoPage() {
  const { token, usuario, rol } = obtenerSesion();

  if (!token || !usuario || !rol) {
    return <Navigate to="/login" replace />;
  }

  if (
    ROLES_SUPERVISOR.includes(rol) ||
    ROLES_DISTRIBUIDOR.includes(rol) ||
    ROLES_ISM.includes(rol)
  ) {
    return (
      <Navigate
        to={obtenerRutaInicial(rol)}
        replace
      />
    );
  }

  const cerrarSesion = () => {
    localStorage.removeItem('execon_token');
    localStorage.removeItem('execon_usuario');
    window.location.replace('/login');
  };

  return (
    <main style={{ padding: 32, fontFamily: 'sans-serif' }}>
      <h1>Sin acceso al portal web</h1>
      <p>
        Tu rol no tiene una vista web habilitada. Contacta al administrador si necesitas acceso.
      </p>
      <button
        type="button"
        onClick={cerrarSesion}
        style={{
          padding: '8px 16px',
          backgroundColor: '#003359',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        Cerrar sesión
      </button>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RutaPublica>
            <LoginPage />
          </RutaPublica>
        }
      />

      {/* =========================================================
          1. VISTAS DEL SUPERVISOR / ADMINISTRADOR
          ========================================================= */}
      <Route
        path="/dashboard"
        element={
          <RutaProtegida rolesPermitidos={ROLES_SUPERVISOR}>
            <DashboardPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/distribucion-onsite"
        element={
          <RutaProtegida rolesPermitidos={ROLES_SUPERVISOR}>
            <OnsiteDistributionPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/planeacion"
        element={
          <RutaProtegida rolesPermitidos={ROLES_SUPERVISOR}>
            <PlanningPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/turnos"
        element={
          <RutaProtegida rolesPermitidos={ROLES_SUPERVISOR}>
            <ShiftManagementPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/usuarios"
        element={
          <RutaProtegida rolesPermitidos={ROLES_SUPERVISOR}>
            <UserManagementPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/configuracion"
        element={
          <RutaProtegida rolesPermitidos={ROLES_SUPERVISOR}>
            <SettingsPage />
          </RutaProtegida>
        }
      />

      {/* =========================================================
          2. VISTAS DEL DISTRIBUIDOR
          ========================================================= */}
      <Route
        path="/distribuidor"
        element={
          <RutaProtegida rolesPermitidos={ROLES_DISTRIBUIDOR}>
            <DistributorOverviewPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/distribuidor/incidentes"
        element={
          <RutaProtegida rolesPermitidos={ROLES_DISTRIBUIDOR}>
            <DistributorOverviewPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/distribuidor/onsite"
        element={
          <RutaProtegida rolesPermitidos={ROLES_DISTRIBUIDOR}>
            <DistributorOverviewPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/distribuidor/en-atencion"
        element={
          <RutaProtegida rolesPermitidos={ROLES_DISTRIBUIDOR}>
            <DistributorOverviewPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/distribuidor/turnos"
        element={
          <RutaProtegida rolesPermitidos={ROLES_DISTRIBUIDOR}>
            <DistributorOverviewPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/distribuidor/configuracion"
        element={
          <RutaProtegida rolesPermitidos={ROLES_DISTRIBUIDOR}>
            <DistributorSettingsPage />
          </RutaProtegida>
        }
      />

      {/* =========================================================
          3. VISTAS DE ISM / MESA (NUEVAS)
          ========================================================= */}
      <Route
        path="/ism"
        element={
          <RutaProtegida rolesPermitidos={ROLES_ISM}>
            <IsmMesaDashboardPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/ism/incidentes"
        element={
          <RutaProtegida rolesPermitidos={ROLES_ISM}>
            <IsmMesaDashboardPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/ism/turnos"
        element={
          <RutaProtegida rolesPermitidos={ROLES_ISM}>
            <IsmMesaDashboardPage />
          </RutaProtegida>
        }
      />

      <Route
        path="/ism/duracion"
        element={
          <RutaProtegida rolesPermitidos={ROLES_ISM}>
            <IsmMesaDashboardPage />
          </RutaProtegida>
        }
      />

      {/* =========================================================
          4. REDIRECCIONES Y FALLBACKS
          ========================================================= */}
      <Route path="/sin-acceso" element={<SinAccesoPage />} />
      <Route path="/" element={<RedireccionInicial />} />
      <Route path="*" element={<RedireccionInicial />} />
    </Routes>
  );
}

export default App;