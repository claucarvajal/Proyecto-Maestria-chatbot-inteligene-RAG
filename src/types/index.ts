export interface Conjunto {
  id: string;
  nombre: string;
  nit: string;
  direccion: string;
  ciudad: string;
  totalUnidades: number;
  administrador: string;
  telefonoAdmin: string;
  emailAdmin: string;
}

export type UserRole = 'RESIDENTE' | 'ADMIN' | 'GUEST';

export interface Administrador {
  id: string;
  conjuntoId: string;
  nombre: string;
  email: string;
  telefono: string;
  cargo: string;
  rol: 'ADMIN';
}

export interface Residente {
  id: string;
  conjuntoId: string;
  cedula: string;
  nombre: string;
  email: string;
  telefono: string;
  torre: string;
  apto: string;
  tipo: 'Propietario' | 'Propietaria' | 'Arrendatario' | 'Arrendataria';
  alicuota: number; // Porcentaje de coeficiente ej: 0.85%
  mascotas: string;
  vehiculoPlaca?: string;
  parqueadero?: string;
}

export interface PagoHistorial {
  id: string;
  fecha: string;
  concepto: string;
  valor: number;
  referencia: string;
  estado: 'Aprobado' | 'Pendiente';
}

export interface CarteraExpensas {
  id: string;
  residenteId: string;
  cedula: string;
  mesPeriodo: string;
  cuotaOrdinaria: number;
  cuotaExtraordinaria: number;
  totalMora: number;
  mesesMora: number;
  interesesMora: number;
  descuentoProntoPago: number;
  totalPagar: number;
  fechaLimiteDescuento: string;
  fechaVencimiento: string;
  estado: 'Al día' | 'En mora' | 'Acuerdo de pago';
  historialPagos: PagoHistorial[];
  alicuota: number;
}

export interface VectorChunk {
  id: string;
  documento: string;
  categoria: 'Reglamento Interno' | 'Ley 675 de 2001' | 'Manual de Convivencia' | 'Expensas y Finanzas' | 'Zonas Comunes';
  articulo: string;
  contenido: string;
  similarity: number; // Cosine similarity (0 to 1)
  chunkIndex: number;
}

export interface LatencyBreakdown {
  embeddingMs: number;
  vectorSearchMs: number;
  llmInferenceMs: number;
  totalMs: number;
}

export interface RAGMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  chunks?: VectorChunk[];
  intent?: 'CONSULTA_REGLAMENTO' | 'CONSULTA_EXPENSAS_MORA' | 'RADICACION_PQRS' | 'CONSULTA_PQRS' | 'RESERVA_ZONAS' | 'GENERAL';
  toolUsed?: string;
  latency?: LatencyBreakdown;
  financialData?: Partial<CarteraExpensas>;
  ticketData?: Partial<PQRSTicket>;
  ticketsList?: PQRSTicket[];
  ragConfidence?: number;
}

export interface PQRSTicket {
  id: string;
  codigo: string;
  conjuntoId: string;
  residenteId: string;
  residenteNombre: string;
  unidad: string;
  categoria: 'Mantenimiento / Daños' | 'Ruido y Convivencia' | 'Expensas y Cartera' | 'Seguridad' | 'Mascotas' | 'Otro';
  descripcion: string;
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  estado: 'Radicado' | 'En Revisión' | 'Asignado a Cuadrilla' | 'Solucionado';
  slaHoras: number;
  fechaCreacion: string;
  respuestaAdmin?: string;
}

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  urlProvided: boolean;
  pgvectorExtensionActive: boolean;
  tablesReady: boolean;
  totalVectorChunks: number;
  mode: 'supabase_pgvector' | 'local_pgvector_engine';
}

export interface DocumentoConjuntoPadre {
  id: string;
  conjuntoId: string;
  titulo: string;
  categoria: string;
  descripcion?: string;
  contenidoCompleto: string;
  totalChunks: number;
  createdAt: string;
}
