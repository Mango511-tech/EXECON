BEGIN;

ALTER TABLE public.incidentes
  ADD COLUMN IF NOT EXISTS folio VARCHAR(100),
  ADD COLUMN IF NOT EXISTS resumen TEXT,
  ADD COLUMN IF NOT EXISTS compania VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nombre_sitio VARCHAR(255),
  ADD COLUMN IF NOT EXISTS plaza VARCHAR(255),
  ADD COLUMN IF NOT EXISTS municipio VARCHAR(255),
  ADD COLUMN IF NOT EXISTS estado VARCHAR(255),
  ADD COLUMN IF NOT EXISTS id_ism_asignado INTEGER,
  ADD COLUMN IF NOT EXISTS asignado_por INTEGER,
  ADD COLUMN IF NOT EXISTS estatus VARCHAR(40) DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS hora_fin VARCHAR(20),
  ADD COLUMN IF NOT EXISTS duracion_minutos INTEGER DEFAULT 0;

UPDATE public.incidentes
SET folio = 'INC-' || id::TEXT
WHERE folio IS NULL OR BTRIM(folio) = '';

UPDATE public.incidentes
SET resumen = descripcion
WHERE resumen IS NULL;

UPDATE public.incidentes
SET compania = cliente_nombre
WHERE compania IS NULL;

UPDATE public.incidentes
SET estatus = 'PENDIENTE'
WHERE estatus IS NULL OR BTRIM(estatus) = '';

UPDATE public.incidentes
SET duracion_minutos = 0
WHERE duracion_minutos IS NULL;

ALTER TABLE public.incidentes
  ALTER COLUMN folio SET NOT NULL,
  ALTER COLUMN estatus SET DEFAULT 'PENDIENTE',
  ALTER COLUMN duracion_minutos SET DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS incidentes_folio_unique_idx
  ON public.incidentes (folio);

COMMIT;
