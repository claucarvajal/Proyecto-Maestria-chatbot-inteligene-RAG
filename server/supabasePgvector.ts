import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { KNOWLEDGE_BASE_CHUNKS, generateLocalEmbedding, cosineSimilarity } from './knowledgeBase.js';
import { VectorChunk } from '../src/types/index.js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  // Support both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.warn('Error inicializando cliente de Supabase:', err);
      return null;
    }
  }
  return supabaseClient;
}

// Pre-compute embeddings for local vector storage fallback
interface InMemoryVectorRecord {
  id: string;
  documento: string;
  categoria: 'Reglamento Interno' | 'Ley 675 de 2001' | 'Manual de Convivencia' | 'Expensas y Finanzas' | 'Zonas Comunes';
  articulo: string;
  contenido: string;
  embedding: number[];
  chunkIndex: number;
}

const LOCAL_VECTOR_STORE: InMemoryVectorRecord[] = KNOWLEDGE_BASE_CHUNKS.map((chunk, idx) => ({
  id: chunk.id,
  documento: chunk.documento,
  categoria: chunk.categoria,
  articulo: chunk.articulo,
  contenido: chunk.contenido,
  embedding: generateLocalEmbedding(`${chunk.articulo} ${chunk.contenido} ${chunk.keywords.join(' ')}`),
  chunkIndex: idx + 1,
}));

export async function searchSimilarChunks(
  query: string,
  conjuntoId: string,
  topK = 4,
  minSimilarity = 0.30
): Promise<{ chunks: VectorChunk[]; mode: 'supabase_pgvector' | 'local_pgvector_engine'; latencyMs: number }> {
  const startTime = Date.now();
  let queryVector: number[];
  
  try {
    const { generateEmbeddingVector } = await import('./documentIngestion.js');
    queryVector = await generateEmbeddingVector(query);
  } catch {
    queryVector = generateLocalEmbedding(query);
  }

  const client = getSupabaseClient();

  // If Supabase is configured, attempt RPC call to match_documents
  if (client) {
    try {
      const { data, error } = await client.rpc('match_documents', {
        query_embedding: queryVector,
        match_threshold: minSimilarity,
        match_count: topK,
        filter_conjunto: conjuntoId,
      });

      if (!error && data && Array.isArray(data) && data.length > 0) {
        const chunks: VectorChunk[] = data.map((item: any, i: number) => ({
          id: item.id || `supa-${i}`,
          documento: item.documento,
          categoria: item.categoria,
          articulo: item.articulo,
          contenido: item.contenido,
          similarity: Number(item.similarity || 0.85),
          chunkIndex: i + 1,
        }));
        return {
          chunks,
          mode: 'supabase_pgvector',
          latencyMs: Date.now() - startTime,
        };
      }
    } catch (e) {
      console.warn('Fallback a motor pgvector local debido a respuesta de Supabase:', e);
    }
  }

  // Local vector search with genuine cosine similarity
  const localQueryVector = generateLocalEmbedding(query);
  const scored = LOCAL_VECTOR_STORE.map((doc) => {
    const similarity = cosineSimilarity(localQueryVector, doc.embedding);
    return {
      id: doc.id,
      documento: doc.documento,
      categoria: doc.categoria,
      articulo: doc.articulo,
      contenido: doc.contenido,
      similarity: Number(similarity.toFixed(4)),
      chunkIndex: doc.chunkIndex,
    };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  const filtered = scored.filter((item) => item.similarity >= minSimilarity).slice(0, topK);

  return {
    chunks: filtered.length > 0 ? filtered : scored.slice(0, 2),
    mode: 'local_pgvector_engine',
    latencyMs: Date.now() - startTime,
  };
}

export function getAllIndexedChunks(): VectorChunk[] {
  return LOCAL_VECTOR_STORE.map((c) => ({
    id: c.id,
    documento: c.documento,
    categoria: c.categoria,
    articulo: c.articulo,
    contenido: c.contenido,
    similarity: 1.0,
    chunkIndex: c.chunkIndex,
  }));
}

export const SUPABASE_SQL_MIGRATION = `-- ====================================================================
-- SCRIPT DE MIGRACIÓN Y POBLACIÓN INTEGRAL PARA SUPABASE (POSTGRESQL + PGVECTOR)
-- Copia y pega TODO este script en el SQL Editor de tu proyecto en Supabase
-- y presiona RUN. Creará la extensión vectorial, tablas, datos iniciales y la función RAG.
-- ====================================================================

-- 1. Habilitar la extensión vectorial pgvector en PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabla principal de conjuntos residenciales
CREATE TABLE IF NOT EXISTS conjuntos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nit TEXT NOT NULL,
  direccion TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  total_unidades INT NOT NULL,
  administrador TEXT,
  telefono_admin TEXT,
  email_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de residentes y copropietarios
CREATE TABLE IF NOT EXISTS residentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conjunto_id TEXT REFERENCES conjuntos(id),
  cedula TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  torre TEXT NOT NULL,
  apto TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('Propietario', 'Propietaria', 'Arrendatario', 'Arrendataria')),
  alicuota NUMERIC(5,4) NOT NULL,
  mascotas TEXT,
  vehiculo_placa TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla de cartera, expensas y mora
CREATE TABLE IF NOT EXISTS cartera_expensas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  residente_id UUID REFERENCES residentes(id),
  cedula TEXT NOT NULL,
  mes_periodo TEXT NOT NULL,
  cuota_ordinaria NUMERIC(12,2) NOT NULL,
  cuota_extraordinaria NUMERIC(12,2) DEFAULT 0,
  total_mora NUMERIC(12,2) DEFAULT 0,
  meses_mora INT DEFAULT 0,
  intereses_mora NUMERIC(12,2) DEFAULT 0,
  descuento_pronto_pago NUMERIC(12,2) DEFAULT 0,
  total_pagar NUMERIC(12,2) NOT NULL,
  fecha_limite_descuento TEXT,
  fecha_vencimiento TEXT,
  estado TEXT CHECK (estado IN ('Al día', 'En mora', 'Acuerdo de pago')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabla de PQRS (Peticiones, Quejas, Reclamos y Solicitudes)
CREATE TABLE IF NOT EXISTS pqrs_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  conjunto_id TEXT REFERENCES conjuntos(id),
  cedula TEXT NOT NULL,
  residente_nombre TEXT NOT NULL,
  torre TEXT NOT NULL,
  apto TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  prioridad TEXT CHECK (prioridad IN ('Baja', 'Media', 'Alta', 'Urgente')),
  estado TEXT CHECK (estado IN ('Radicado', 'En Revisión', 'Solucionado')) DEFAULT 'Radicado',
  sla_horas INT NOT NULL DEFAULT 48,
  respuesta_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabla PADRE de Documentos (Reglamentos Completos, Manuales de Convivencia, Actas)
CREATE TABLE IF NOT EXISTS documentos_conjunto (
  id TEXT PRIMARY KEY,
  conjunto_id TEXT REFERENCES conjuntos(id),
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT,
  contenido_completo TEXT NOT NULL,
  total_chunks INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabla HIJA vectorial para RAG (Fragmentos / Chunks con Embeddings de 768 dimensiones)
CREATE TABLE IF NOT EXISTS documents_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id TEXT REFERENCES documentos_conjunto(id) ON DELETE CASCADE,
  conjunto_id TEXT REFERENCES conjuntos(id),
  documento TEXT NOT NULL,
  categoria TEXT NOT NULL,
  articulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Si la tabla documents_embeddings ya fue creada previamente, añadir columna documento_id:
ALTER TABLE documents_embeddings ADD COLUMN IF NOT EXISTS documento_id TEXT REFERENCES documentos_conjunto(id) ON DELETE CASCADE;

-- 8. Deshabilitar RLS temporalmente o conceder acceso público para pruebas
ALTER TABLE conjuntos DISABLE ROW LEVEL SECURITY;
ALTER TABLE residentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE cartera_expensas DISABLE ROW LEVEL SECURITY;
ALTER TABLE pqrs_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_conjunto DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents_embeddings DISABLE ROW LEVEL SECURITY;

-- 8. Índice HNSW de alta velocidad para búsqueda de similitud coseno
CREATE INDEX IF NOT EXISTS documents_embeddings_hnsw_idx 
ON documents_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- 9. Procedimiento almacenado (RPC) para recuperación semántica RAG
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.35,
  match_count int DEFAULT 5,
  filter_conjunto text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  documento text,
  categoria text,
  articulo text,
  contenido text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.documento,
    de.categoria,
    de.articulo,
    de.contenido,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM documents_embeddings de
  WHERE (filter_conjunto IS NULL OR de.conjunto_id = filter_conjunto)
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ====================================================================
-- POBLACIÓN DE DATOS INICIALES (SEMILLA DE DEMOSTRACIÓN)
-- ====================================================================

-- Conjuntos
INSERT INTO conjuntos (id, nombre, nit, direccion, ciudad, total_unidades, administrador, telefono_admin, email_admin)
VALUES 
  ('conjunto-1', 'Residencial Los Sauces P.H.', '900.542.118-4', 'Calle 140 # 15-28', 'Bogotá D.C.', 180, 'Dra. Andrea Morales', '310 445 8899', 'admin@saucesph.com'),
  ('conjunto-2', 'Torres de San Felipe P.H.', '830.123.774-1', 'Carrera 43A # 18S-90', 'Medellín', 240, 'Arq. Jorge Ramírez', '315 889 0011', 'admin@sanfelipeph.com')
ON CONFLICT (id) DO NOTHING;

-- Residentes
INSERT INTO residentes (id, conjunto_id, cedula, nombre, email, telefono, torre, apto, tipo, alicuota, mascotas, vehiculo_placa)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'conjunto-1', '1018456789', 'Carlos Mendoza', 'carlos.mendoza@email.com', '312 456 7890', 'Torre 2', 'Apto 401', 'Propietario', 0.8500, '1 perro Golden Retriever (Toby)', 'ABC-123'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'conjunto-1', '52987654', 'María Fernanda Gómez', 'mf.gomez@email.com', '320 876 5432', 'Torre 1', 'Apto 203', 'Propietaria', 0.9200, 'Ninguna', 'XYZ-789'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'conjunto-1', '80321456', 'Juan Camilo Restrepo', 'juan.restrepo@email.com', '315 321 6549', 'Torre 3', 'Apto 502', 'Arrendatario', 0.7800, '2 gatos persas', 'MNO-456')
ON CONFLICT (cedula) DO NOTHING;

-- Cartera de expensas
INSERT INTO cartera_expensas (residente_id, cedula, mes_periodo, cuota_ordinaria, cuota_extraordinaria, total_mora, meses_mora, intereses_mora, descuento_pronto_pago, total_pagar, fecha_limite_descuento, fecha_vencimiento, estado)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '1018456789', 'Septiembre 2026', 380000, 0, 0, 0, 0, 38000, 342000, '10 de Septiembre de 2026', '30 de Septiembre de 2026', 'Al día'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '52987654', 'Septiembre 2026', 460000, 0, 820000, 2, 48500, 0, 1328500, '10 de Septiembre de 2026', '30 de Septiembre de 2026', 'En mora'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '80321456', 'Septiembre 2026', 350000, 0, 0, 0, 0, 35000, 315000, '10 de Septiembre de 2026', '30 de Septiembre de 2026', 'Al día')
ON CONFLICT DO NOTHING;

-- Radicados PQRS iniciales
INSERT INTO pqrs_tickets (codigo, conjunto_id, cedula, residente_nombre, torre, apto, categoria, descripcion, prioridad, estado, sla_horas, respuesta_admin)
VALUES
  ('PQRS-2026-081', 'conjunto-1', '1018456789', 'Carlos Mendoza', 'Torre 2', 'Apto 401', 'Mantenimiento / Daños', 'Gotera constante en la tubería del ducto del pasillo del piso 4.', 'Media', 'En Revisión', 48, 'Técnico de plomería programado para el martes 8:00 AM.'),
  ('PQRS-2026-094', 'conjunto-1', '52987654', 'María Fernanda Gómez', 'Torre 1', 'Apto 203', 'Expensas y Cartera', 'Solicitud formal de acuerdo de pago en 3 cuotas para saldo en mora.', 'Alta', 'En Revisión', 24, 'Comité de convivencia y administración revisando propuesta.'),
  ('PQRS-2026-062', 'conjunto-1', '80321456', 'Juan Camilo Restrepo', 'Torre 3', 'Apto 502', 'Ruido y Convivencia', 'Música con alto volumen en Torre 3 Apto 501 después de las 11:30 PM el sábado.', 'Media', 'Solucionado', 48, 'Se emitió amonestación preventiva al residente infractor.')
ON CONFLICT (codigo) DO NOTHING;

-- Base de Conocimiento Normativo (Documentos para RAG)
INSERT INTO documents_embeddings (conjunto_id, documento, categoria, articulo, contenido)
VALUES
  ('conjunto-1', 'Reglamento Interno Los Sauces', 'Manual de Convivencia', 'Artículo 45: Horarios de Tranquilidad y Ruidos', 'Queda terminantemente prohibido generar ruidos molestos, música a alto volumen, fiestas estrepitosas o reparaciones locativas entre las 10:00 PM y las 7:00 AM de lunes a viernes, y hasta las 8:00 AM fines de semana y festivos. Las infracciones acarrean llamado de atención escrito en primera instancia y multas sucesivas equivalentes al valor de una (1) cuota ordinaria de administración en caso de reincidencia.'),
  ('conjunto-1', 'Reglamento Interno Los Sauces', 'Manual de Convivencia', 'Artículo 52: Tenencia Responsable de Mascotas', 'Se permite la tenencia de animales domésticos siempre y cuando no perturben la seguridad y tranquilidad comunitaria. En áreas comunes los perros deben circular obligatoriamente con traílla o correa y acompañados por un adulto. Las razas de manejo especial o potencialmente peligrosas (Pitbull, Rottweiler, Dóberman) deben portar bozal y póliza de responsabilidad civil vigente según el Código Nacional de Seguridad y Convivencia Ciudadana.'),
  ('conjunto-1', 'Reglamento Interno Los Sauces', 'Manual de Convivencia', 'Artículo 63: Mudanzas, Trasteos y Depósito', 'Las mudanzas e ingreso o egreso de muebles pesados únicamente podrán efectuarse de lunes a sábado en el horario comprendido entre las 8:00 AM y las 5:00 PM. No se permiten mudanzas los domingos ni festivos. El copropietario o arrendatario debe notificar a la administración con mínimo cuarenta y ocho (48) horas de anticipación, estar a paz y salvo por todo concepto de administración y constituir un depósito reembolsable de garantía de $200.000 COP por eventuales daños en ascensores o pasillos.'),
  ('conjunto-1', 'Reglamento Interno Los Sauces', 'Expensas y Finanzas', 'Artículo 78: Cuotas de Administración y Sanción Moratoria', 'Las expensas comunes ordinarias deben cancelarse dentro de los primeros diez (10) días calendario de cada mes para tener derecho al diez por ciento (10%) de descuento por pronto pago. A partir del primer día del mes siguiente se causarán intereses moratorios calculados a una y media veces el interés bancario corriente certificado por la Superintendencia Financiera de Colombia, en estricto cumplimiento del Artículo 30 de la Ley 675 de 2001.'),
  ('conjunto-1', 'Reglamento Interno Los Sauces', 'Zonas Comunes', 'Artículo 89: Salón Comunal y Zona BBQ', 'Para el uso del salón comunal y zona BBQ, el residente debe solicitar la reserva a través de la administración con mínimo ocho (8) días de anticipación. Se requiere un depósito de garantía reembolsable de $150.000 COP para responder por aseo o daños en mobiliario. El horario máximo de uso es hasta la 1:00 AM los viernes y sábados.')
ON CONFLICT DO NOTHING;
`;
