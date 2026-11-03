const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        'No fue posible obtener la información del dashboard.',
    );
  }

  return data?.data ?? data;
}

function buildQuery(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : '';
}

export const dashboardService = {
  getResumen({ fecha, sitioId } = {}) {
    return request(
      `/dashboard/resumen${buildQuery({
        fecha,
        sitio_id: sitioId,
      })}`,
    );
  },

  getDisponibilidad({ fechaInicio, fechaFin, sitioId } = {}) {
    return request(
      `/dashboard/disponibilidad${buildQuery({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        sitio_id: sitioId,
      })}`,
    );
  },

  getReincidencia({ fechaInicio, fechaFin, sitioId } = {}) {
    return request(
      `/dashboard/reincidencia${buildQuery({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        sitio_id: sitioId,
      })}`,
    );
  },

  getVolumetria({ periodo, fecha, sitioId, estatus } = {}) {
    return request(
      `/dashboard/volumetria${buildQuery({
        periodo: periodo?.toLowerCase(),
        fecha,
        sitio_id: sitioId,
        estatus,
      })}`,
    );
  },

  getSitios() {
    return request('/catalogos/sitios');
  },
};