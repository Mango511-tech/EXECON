import { Navigate, Outlet, useLocation } from 'react-router-dom';

function ProtectedRoute() {
  const location = useLocation();

  const token = localStorage.getItem('execon_token');

  /*
    Si NO hay token:
    - no renderiza las páginas privadas
    - envía al usuario a /login
    - guarda la página que intentaba visitar
  */
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  /*
    Si SÍ hay token:
    Outlet renderiza la ruta hija solicitada.
    Ejemplo:
    /dashboard -> <DashboardPage />
    /planeacion -> <PlanningPage />
  */
  return <Outlet />;
}

export default ProtectedRoute;