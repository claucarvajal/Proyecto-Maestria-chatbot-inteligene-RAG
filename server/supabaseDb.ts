import { getSupabaseClient } from './supabasePgvector.js';
import { Conjunto, Residente, CarteraExpensas, PQRSTicket } from '../src/types/index.js';
import {
  CONJUNTOS_DATA,
  RESIDENTES_DATA,
  CARTERA_DATA,
  INITIAL_TICKETS,
} from './database.js';

let inMemoryTickets: PQRSTicket[] = [...INITIAL_TICKETS];
let inMemoryCartera: Record<string, CarteraExpensas> = { ...CARTERA_DATA };

export interface SupabaseHealthReport {
  isConfigured: boolean;
  connected: boolean;
  urlProvided: boolean;
  keyProvided: boolean;
  tables: {
    conjuntos: number;
    residentes: number;
    cartera_expensas: number;
    pqrs_tickets: number;
    documentos_conjunto: number;
    documents_embeddings: number;
  };
  sampleResidentes: { cedula: string; nombre: string; torre: string; apto: string }[];
  errorMessage?: string;
  source: 'supabase' | 'local_fallback';
}

/**
 * Checks connectivity and counts live rows in Supabase tables
 */
export async function getSupabaseHealthReport(): Promise<SupabaseHealthReport> {
  const client = getSupabaseClient();
  const hasUrl = Boolean(process.env.SUPABASE_URL);
  const hasKey = Boolean(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!client) {
    return {
      isConfigured: false,
      connected: false,
      urlProvided: hasUrl,
      keyProvided: hasKey,
      tables: {
        conjuntos: CONJUNTOS_DATA.length,
        residentes: RESIDENTES_DATA.length,
        cartera_expensas: Object.keys(inMemoryCartera).length,
        pqrs_tickets: inMemoryTickets.length,
        documentos_conjunto: 1,
        documents_embeddings: 8,
      },
      sampleResidentes: RESIDENTES_DATA.map((r) => ({
        cedula: r.cedula,
        nombre: r.nombre,
        torre: r.torre,
        apto: r.apto,
      })),
      source: 'local_fallback',
    };
  }

  try {
    // Probe residents
    const { data: resData, error: resErr } = await client
      .from('residentes')
      .select('cedula, nombre, torre, apto')
      .limit(10);

    if (resErr) {
      return {
        isConfigured: true,
        connected: false,
        urlProvided: hasUrl,
        keyProvided: hasKey,
        tables: {
          conjuntos: 0,
          residentes: 0,
          cartera_expensas: 0,
          pqrs_tickets: 0,
          documentos_conjunto: 0,
          documents_embeddings: 0,
        },
        sampleResidentes: [],
        errorMessage: resErr.message,
        source: 'local_fallback',
      };
    }

    // Row counts
    let parentDocCount = 0;
    try {
      const docRes = await client.from('documentos_conjunto').select('*', { count: 'exact', head: true });
      parentDocCount = docRes.count ?? 0;
    } catch {
      parentDocCount = 0;
    }

    const [cCount, crCount, tCount, dCount] = await Promise.all([
      client.from('conjuntos').select('*', { count: 'exact', head: true }),
      client.from('cartera_expensas').select('*', { count: 'exact', head: true }),
      client.from('pqrs_tickets').select('*', { count: 'exact', head: true }),
      client.from('documents_embeddings').select('*', { count: 'exact', head: true }),
    ]);

    return {
      isConfigured: true,
      connected: true,
      urlProvided: hasUrl,
      keyProvided: hasKey,
      tables: {
        conjuntos: cCount.count ?? 0,
        residentes: resData?.length ?? 0,
        cartera_expensas: crCount.count ?? 0,
        pqrs_tickets: tCount.count ?? 0,
        documentos_conjunto: parentDocCount,
        documents_embeddings: dCount.count ?? 0,
      },
      sampleResidentes: (resData || []).map((r: any) => ({
        cedula: r.cedula,
        nombre: r.nombre,
        torre: r.torre,
        apto: r.apto,
      })),
      source: 'supabase',
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      connected: false,
      urlProvided: hasUrl,
      keyProvided: hasKey,
      tables: {
        conjuntos: 0,
        residentes: 0,
        cartera_expensas: 0,
        pqrs_tickets: 0,
        documentos_conjunto: 0,
        documents_embeddings: 0,
      },
      sampleResidentes: [],
      errorMessage: err.message || 'Error conectando a Supabase',
      source: 'local_fallback',
    };
  }
}

/**
 * Fetches all conjuntos from Supabase or fallback
 */
export async function fetchConjuntos(): Promise<Conjunto[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('conjuntos').select('*');
      if (!error && data && data.length > 0) {
        return data.map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          nit: c.nit,
          direccion: c.direccion,
          ciudad: c.ciudad,
          totalUnidades: Number(c.total_unidades || 100),
          administrador: c.administrador || 'Administración P.H.',
          telefonoAdmin: c.telefono_admin || '',
          emailAdmin: c.email_admin || '',
        }));
      }
    } catch (e) {
      console.warn('Fallback a conjuntos locales:', e);
    }
  }
  return CONJUNTOS_DATA;
}

/**
 * Fetches a single residente by cédula from Supabase or fallback,
 * optionally validating that they belong to a specific conjunto.
 */
export async function fetchResidenteByCedula(cedula: string, conjuntoId?: string): Promise<Residente | null> {
  const cleanCedula = String(cedula).trim();
  const client = getSupabaseClient();

  if (client) {
    try {
      let query = client
        .from('residentes')
        .select('*')
        .eq('cedula', cleanCedula);

      if (conjuntoId) {
        query = query.eq('conjunto_id', conjuntoId);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          conjuntoId: data.conjunto_id || conjuntoId || 'conjunto-1',
          cedula: data.cedula,
          nombre: data.nombre,
          email: data.email || `${data.nombre.toLowerCase().replace(/\s+/g, '.')}@email.com`,
          telefono: data.telefono || 'No registrado',
          torre: data.torre,
          apto: data.apto,
          tipo: data.tipo || 'Propietario',
          alicuota: Number(data.alicuota || 0.85),
          mascotas: data.mascotas || 'No registra mascotas',
          vehiculoPlaca: data.vehiculo_placa || 'No registra vehículo',
          parqueadero: 'Asignado en P.H.',
        };
      }
    } catch (e) {
      console.warn('Fallback a residente local:', e);
    }
  }

  const found = RESIDENTES_DATA.find((r) => {
    const matchesCedula = r.cedula === cleanCedula;
    const matchesConjunto = !conjuntoId || r.conjuntoId === conjuntoId;
    return matchesCedula && matchesConjunto;
  });

  return found || null;
}

/**
 * Checks if a resident exists in ANY conjunto to provide helpful feedback if
 * they are logging into the wrong property.
 */
export async function findResidenteOwnership(cedula: string): Promise<{ residente: Residente; conjuntoNombre?: string } | null> {
  const cleanCedula = String(cedula).trim();
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('residentes')
        .select('*, conjuntos(nombre)')
        .eq('cedula', cleanCedula)
        .maybeSingle();

      if (!error && data) {
        return {
          residente: {
            id: data.id,
            conjuntoId: data.conjunto_id || 'conjunto-1',
            cedula: data.cedula,
            nombre: data.nombre,
            email: data.email || '',
            telefono: data.telefono || '',
            torre: data.torre,
            apto: data.apto,
            tipo: data.tipo || 'Propietario',
            alicuota: Number(data.alicuota || 0.85),
            mascotas: data.mascotas || '',
            vehiculoPlaca: data.vehiculo_placa || '',
            parqueadero: 'P.H.',
          },
          conjuntoNombre: data.conjuntos?.nombre,
        };
      }
    } catch (e) {
      // fallback
    }
  }

  const localRes = RESIDENTES_DATA.find((r) => r.cedula === cleanCedula);
  if (localRes) {
    const conj = CONJUNTOS_DATA.find((c) => c.id === localRes.conjuntoId);
    return {
      residente: localRes,
      conjuntoNombre: conj?.nombre,
    };
  }

  return null;
}

/**
 * Fetches available resident summaries filtered by conjuntoId
 */
export async function fetchAvailableResidentesSummary(conjuntoId?: string): Promise<{ cedula: string; nombre: string; unidad: string; estado: string }[]> {
  const client = getSupabaseClient();

  if (client) {
    try {
      let query = client.from('residentes').select('*');
      if (conjuntoId) {
        query = query.eq('conjunto_id', conjuntoId);
      }

      const { data: resList, error } = await query;
      if (!error && Array.isArray(resList)) {
        if (resList.length === 0) {
          return [];
        }
        const { data: carList } = await client.from('cartera_expensas').select('cedula, estado');
        const carteraMap = new Map((carList || []).map((c: any) => [c.cedula, c.estado]));

        return resList.map((r: any) => ({
          cedula: r.cedula,
          nombre: r.nombre,
          unidad: `${r.torre} Apto ${r.apto}`,
          estado: carteraMap.get(r.cedula) || 'Al día',
        }));
      }
    } catch (e) {
      console.warn('Fallback a lista de residentes local:', e);
    }
  }

  const filtered = conjuntoId
    ? RESIDENTES_DATA.filter((r) => r.conjuntoId === conjuntoId)
    : RESIDENTES_DATA;

  return filtered.map((r) => ({
    cedula: r.cedula,
    nombre: r.nombre,
    unidad: `${r.torre} Apto ${r.apto}`,
    estado: inMemoryCartera[r.cedula]?.estado || 'Al día',
  }));
}

/**
 * Fetches cartera information by resident cédula from Supabase or fallback
 */
export async function fetchCarteraByCedula(cedula: string): Promise<CarteraExpensas | null> {
  const cleanCedula = String(cedula).trim();
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('cartera_expensas')
        .select('*')
        .eq('cedula', cleanCedula)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          residenteId: data.residente_id,
          cedula: data.cedula,
          mesPeriodo: data.mes_periodo || 'Septiembre 2026',
          cuotaOrdinaria: Number(data.cuota_ordinaria || 0),
          cuotaExtraordinaria: Number(data.cuota_extraordinaria || 0),
          totalMora: Number(data.total_mora || 0),
          mesesMora: Number(data.meses_mora || 0),
          interesesMora: Number(data.intereses_mora || 0),
          descuentoProntoPago: Number(data.descuento_pronto_pago || 0),
          totalPagar: Number(data.total_pagar || 0),
          fechaLimiteDescuento: data.fecha_limite_descuento || '10 de Septiembre de 2026',
          fechaVencimiento: data.fecha_vencimiento || '30 de Septiembre de 2026',
          estado: data.estado || 'Al día',
          alicuota: 0.85,
          historialPagos: [
            {
              id: 'p-supa-1',
              fecha: '05/08/2026',
              concepto: 'Administración Agosto 2026',
              valor: Number(data.cuota_ordinaria || 350000),
              referencia: 'PSE-Supabase-OK',
              estado: 'Aprobado',
            },
          ],
        };
      }
    } catch (e) {
      console.warn('Fallback a cartera local:', e);
    }
  }

  return inMemoryCartera[cleanCedula] || null;
}

/**
 * Fetches tickets for a resident from Supabase or fallback,
 * strictly scoped to the specified conjuntoId and cédula.
 */
export async function fetchTicketsForResidente(cedula: string, conjuntoId?: string): Promise<PQRSTicket[]> {
  const cleanCedula = String(cedula).trim();
  const client = getSupabaseClient();

  if (client) {
    try {
      let query = client
        .from('pqrs_tickets')
        .select('*')
        .eq('cedula', cleanCedula);

      if (conjuntoId) {
        query = query.eq('conjunto_id', conjuntoId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((d: any) => ({
          id: d.id,
          codigo: d.codigo,
          conjuntoId: d.conjunto_id,
          residenteId: d.cedula,
          residenteNombre: d.residente_nombre,
          unidad: `${d.torre} Apto ${String(d.apto || '').replace(/^Apto\s*/i, '')}`,
          categoria: d.categoria,
          descripcion: d.descripcion,
          prioridad: d.prioridad,
          estado: d.estado,
          slaHoras: Number(d.sla_horas || 48),
          fechaCreacion: d.created_at ? new Date(d.created_at).toISOString().replace('T', ' ').slice(0, 16) : '2026-09-07 10:00',
          respuestaAdmin: d.respuesta_admin,
        }));
      }
    } catch (e) {
      console.warn('Fallback a tickets locales:', e);
    }
  }

  const res = RESIDENTES_DATA.find((r) => r.cedula === cleanCedula);
  return inMemoryTickets.filter((t) => {
    const matchesCedula = (res && t.residenteId === res.id) ||
                          t.residenteId === cleanCedula ||
                          (t as any).cedula === cleanCedula;
    const matchesConjunto = !conjuntoId || t.conjuntoId === conjuntoId;
    return matchesCedula && matchesConjunto;
  });
}

/**
 * Computes the next guaranteed sequential PQRS ticket code
 */
async function generateNextPQRSCode(client: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  let maxSeq = 100;

  if (client) {
    try {
      const { data, error } = await client
        .from('pqrs_tickets')
        .select('codigo');

      if (!error && data && Array.isArray(data)) {
        for (const item of data) {
          const match = String(item.codigo).match(/PQRS-\d{4}-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) {
              maxSeq = num;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error calculando correlativo de tickets en Supabase:', err);
    }
  }

  for (const item of inMemoryTickets) {
    const match = String(item.codigo).match(/PQRS-\d{4}-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `PQRS-${currentYear}-${nextSeq.toString().padStart(3, '0')}`;
}

/**
 * Inserts a new PQRS ticket into Supabase and in-memory cache
 */
export async function createPQRSTicket(
  conjuntoId: string,
  residente: Residente,
  categoria: PQRSTicket['categoria'],
  descripcion: string,
  prioridad: PQRSTicket['prioridad'] = 'Media'
): Promise<PQRSTicket> {
  const validPriorities: PQRSTicket['prioridad'][] = ['Baja', 'Media', 'Alta', 'Urgente'];
  const safePrioridad: PQRSTicket['prioridad'] = validPriorities.includes(prioridad) ? prioridad : 'Media';
  const slaHoras = safePrioridad === 'Urgente' ? 4 : safePrioridad === 'Alta' ? 24 : safePrioridad === 'Baja' ? 72 : 48;
  const client = getSupabaseClient();
  const safeConjuntoId = (conjuntoId === 'conjunto-1' || conjuntoId === 'conjunto-2' || conjuntoId === 'conjunto-3')
    ? conjuntoId
    : (residente.conjuntoId || 'conjunto-1');

  let codigo = await generateNextPQRSCode(client);
  const cleanApto = String(residente.apto || '').replace(/^Apto\s*/i, '');

  const ticket: PQRSTicket = {
    id: `tk-${Date.now()}`,
    codigo,
    conjuntoId: safeConjuntoId,
    residenteId: residente.id,
    residenteNombre: residente.nombre,
    unidad: `${residente.torre} Apto ${cleanApto}`,
    categoria: categoria || 'Mantenimiento / Daños',
    descripcion: descripcion.trim() || 'Reporte de novedad en la copropiedad',
    prioridad: safePrioridad,
    estado: 'Radicado',
    slaHoras,
    fechaCreacion: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };

  // 1. Try inserting directly into Supabase (with automatic collision retry)
  if (client) {
    let inserted = false;
    let attempts = 0;

    while (!inserted && attempts < 3) {
      attempts++;
      try {
        const { data, error } = await client
          .from('pqrs_tickets')
          .insert({
            codigo,
            conjunto_id: safeConjuntoId,
            cedula: String(residente.cedula).trim(),
            residente_nombre: residente.nombre,
            torre: residente.torre,
            apto: cleanApto,
            categoria: ticket.categoria,
            descripcion: ticket.descripcion,
            prioridad: safePrioridad,
            estado: 'Radicado',
            sla_horas: slaHoras,
          })
          .select()
          .single();

        if (error) {
          console.error(`Error Supabase insertando PQRS (intento ${attempts}):`, error);
          if (error.code === '23505') {
            // Duplicate code - generate next higher code and retry
            const match = String(codigo).match(/PQRS-\d{4}-(\d+)/);
            const currentNum = match ? parseInt(match[1], 10) : 100;
            codigo = `PQRS-${new Date().getFullYear()}-${(currentNum + 1).toString().padStart(3, '0')}`;
            ticket.codigo = codigo;
            continue;
          }
          break;
        }

        if (data) {
          ticket.id = data.id;
          ticket.codigo = data.codigo;
          if (data.created_at) {
            ticket.fechaCreacion = new Date(data.created_at).toISOString().replace('T', ' ').slice(0, 16);
          }
          inserted = true;
          console.log('✅ Ticket PQRS insertado exitosamente en Supabase:', ticket.codigo, 'ID:', ticket.id);
        }
      } catch (e) {
        console.error('Excepción al insertar ticket en Supabase:', e);
        break;
      }
    }
  }

  // 2. Also keep in-memory for instant reactivity
  (ticket as any).cedula = String(residente.cedula).trim();
  inMemoryTickets.unshift(ticket);
  return ticket;
}

/**
 * Registers a payment or clears mora in Supabase and local cache
 */
export async function processPaymentInDb(cedula: string, valor: number): Promise<CarteraExpensas | null> {
  const client = getSupabaseClient();
  const current = await fetchCarteraByCedula(cedula);

  if (!current) return null;

  const updated: CarteraExpensas = {
    ...current,
    totalMora: 0,
    mesesMora: 0,
    interesesMora: 0,
    estado: 'Al día',
    totalPagar: current.cuotaOrdinaria - current.descuentoProntoPago,
    historialPagos: [
      {
        id: `p-${Date.now()}`,
        fecha: new Date().toLocaleDateString('es-CO'),
        concepto: 'Pago de expensas y liquidación de mora',
        valor,
        referencia: `PSE-${Math.floor(100000 + Math.random() * 900000)}`,
        estado: 'Aprobado',
      },
      ...current.historialPagos,
    ],
  };

  if (client) {
    try {
      await client
        .from('cartera_expensas')
        .update({
          total_mora: 0,
          meses_mora: 0,
          intereses_mora: 0,
          estado: 'Al día',
          total_pagar: updated.totalPagar,
        })
        .eq('cedula', cedula);
    } catch (e) {
      console.warn('Error actualizando pago en Supabase:', e);
    }
  }

  inMemoryCartera[cedula] = updated;
  return updated;
}
