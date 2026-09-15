import { getSupabaseClient } from './supabasePgvector.js';
import { GoogleGenAI } from '@google/genai';
import { generateLocalEmbedding } from './knowledgeBase.js';
import { DocumentoConjuntoPadre, VectorChunk } from '../src/types/index.js';

let aiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Generates a 768-dimensional vector embedding using Gemini gemini-embedding-001
 * or falls back to local normalized 768-d embedding generator.
 */
export async function generateEmbeddingVector(text: string): Promise<number[]> {
  const ai = getGemini();
  if (ai) {
    try {
      const res = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      });
      if (res.embeddings && res.embeddings[0]?.values && res.embeddings[0].values.length === 768) {
        return res.embeddings[0].values;
      }
    } catch (err: any) {
      console.warn('Fallback a embedding local debido a error en Gemini Embeddings:', err.message || err);
    }
  }
  return generateLocalEmbedding(text);
}

export interface ChunkResult {
  articulo: string;
  contenido: string;
  chunkIndex: number;
}

/**
 * Intelligent RAG Chunking:
 * 1. Checks if the document is structured by "Artículo X", "Capítulo Y", or "Sección Z"
 * 2. If structured, splits by articles to preserve complete legal context.
 * 3. If an article exceeds maxChars (~1100 chars), subdivides it with overlap (150 chars).
 * 4. If plain text without articles, partitions by paragraphs with sliding window.
 */
export function chunkDocumentText(
  text: string,
  maxChars = 1000,
  overlap = 150
): ChunkResult[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const chunks: ChunkResult[] = [];

  // Regex to detect "Artículo N - Título", "Art. N", "Capítulo N", etc.
  const articleRegex = /(?:^|\n)(?=(?:Art[íi]culo|Art\.|Cap[íi]tulo|Secci[óo]n)\s+\d+[\.:\s\-–—]+)/gi;
  const rawSections = trimmed.split(articleRegex).map((s) => s.trim()).filter(Boolean);

  if (rawSections.length > 1) {
    // Structured by articles
    let globalIndex = 1;

    for (const section of rawSections) {
      // Extract the title line
      const lines = section.split('\n');
      const firstLine = lines[0].trim();
      const articleTitle = firstLine.length < 90 ? firstLine : firstLine.slice(0, 85) + '...';

      if (section.length <= maxChars) {
        chunks.push({
          articulo: articleTitle,
          contenido: section,
          chunkIndex: globalIndex++,
        });
      } else {
        // Sub-chunk with overlap
        let start = 0;
        let subIndex = 1;
        while (start < section.length) {
          const end = Math.min(start + maxChars, section.length);
          const chunkBody = section.slice(start, end).trim();
          if (chunkBody.length > 50) {
            chunks.push({
              articulo: `${articleTitle} (Parte ${subIndex})`,
              contenido: chunkBody,
              chunkIndex: globalIndex++,
            });
            subIndex++;
          }
          if (end >= section.length) break;
          start += maxChars - overlap;
        }
      }
    }
    return chunks;
  }

  // Fallback: Paragraph-based sliding window
  const paragraphs = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  let currentChunk = '';
  let chunkIndex = 1;

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length <= maxChars) {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    } else {
      if (currentChunk) {
        chunks.push({
          articulo: `Sección / Fragmento #${chunkIndex}`,
          contenido: currentChunk,
          chunkIndex: chunkIndex++,
        });
      }
      // If a single paragraph is enormous, cut it
      if (para.length > maxChars) {
        let pStart = 0;
        while (pStart < para.length) {
          const pEnd = Math.min(pStart + maxChars, para.length);
          chunks.push({
            articulo: `Sección / Fragmento #${chunkIndex}`,
            contenido: para.slice(pStart, pEnd),
            chunkIndex: chunkIndex++,
          });
          if (pEnd >= para.length) break;
          pStart += maxChars - overlap;
        }
        currentChunk = '';
      } else {
        currentChunk = para;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      articulo: `Sección / Fragmento #${chunkIndex}`,
      contenido: currentChunk,
      chunkIndex: chunkIndex++,
    });
  }

  return chunks;
}

// In-Memory store for parent documents when table is not yet created in Supabase
let IN_MEMORY_PARENT_DOCUMENTS: DocumentoConjuntoPadre[] = [
  {
    id: 'doc-padre-reglamento-base',
    conjuntoId: 'conjunto-1',
    titulo: 'Reglamento Interno y Convivencia Residencial Los Sauces P.H. (Edición 2026)',
    categoria: 'Reglamento Interno',
    descripcion: 'Normativa oficial de propiedad horizontal: mascotas, ruidos, cartera, zonas húmedas y mudanzas.',
    contenidoCompleto: `REGLAMENTO INTERNO DE PROPIEDAD HORIZONTAL RESIDENCIAL LOS SAUCES P.H.
Aprobado en Asamblea General Ordinaria conforme a la Ley 675 de 2001.

Artículo 1. Objeto y Régimen Legal.
El presente reglamento tiene por objeto regular los derechos y obligaciones de copropietarios, tenedores y arrendatarios de Residencial Los Sauces P.H., garantizando la seguridad, salubridad y sana convivencia conforme a la Ley 675 de 2001.

Artículo 2. Horarios de Ruido y Tranquilidad.
Quedan restringidas las emisiones sonoras de alta intensidad en zonas privadas y comunes. Los horarios permitidos para reuniones sociales son: de domingo a jueves hasta las 10:00 PM; viernes, sábados y vísperas de festivo hasta la 1:00 AM. El uso de taladros o reparaciones locativas solo se permite de lunes a viernes de 8:00 AM a 5:00 PM y sábados de 8:00 AM a 1:00 PM.

Artículo 3. Tenencia Responsable de Mascotas y Caninos de Manejo Especial.
Todo canino que transite por zonas comunes deberá ir sujeto con correa y acompañado por un adulto. Los caninos de manejo especial (Ley 1801 de 2016: Pitbull, Rottweiler, etc.) deberán portar obligatoriamente bozal y póliza de responsabilidad civil. Es obligación del tenedor recoger de inmediato las deposiciones.

Artículo 4. Expensas Ordinarias, Descuento y Cobro Moratorio.
Las cuotas ordinarias de administración deben pagarse dentro de los primeros 10 días calendario de cada mes para acceder al 10% de descuento por pronto pago. A partir del día 11 se cobrará tarifa plena. A partir del día 1 del mes siguiente se causarán intereses moratorios calculados a la tasa máxima legal certificada por la Superfinanciera (Art. 30 Ley 675).

Artículo 5. Depósito y Horarios de Mudanzas y Trasteos.
Todo trasteo o mudanza debe programarse ante la administración con mínimo 48 horas de anticipación hábil, consignando un depósito de garantía reembolsable de $100.000 COP para protección de ascensores y pintura. Los horarios autorizados son de lunes a sábado de 8:00 AM a 5:00 PM. No se permiten mudanzas domingos ni festivos.

Artículo 6. Salón Social y Zona BBQ.
La reserva del salón comunal y zona BBQ debe solicitarse con 5 días de anticipación y un depósito de aseo y garantía de $150.000 COP. Los residentes con más de 1 mes de mora en administración no podrán reservar zonas sociales recreativas hasta encontrarse a paz y salvo o suscribir acuerdo de pago.`,
    totalChunks: 6,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Ingests a complete document:
 * 1. Saves parent record in documentos_conjunto
 * 2. Automatically splits into semantic chunks
 * 3. Generates 768-d embeddings for each chunk via Gemini API
 * 4. Inserts all chunks into documents_embeddings
 */
export async function ingestCompleteDocument(params: {
  conjuntoId: string;
  titulo: string;
  categoria: string;
  descripcion?: string;
  contenidoCompleto: string;
}): Promise<{
  success: boolean;
  documentId: string;
  totalChunks: number;
  chunksCreated: Array<{ id: string; articulo: string; chunkIndex: number; preview: string }>;
  supabaseSynced: boolean;
  modelUsed: string;
  message: string;
}> {
  const { conjuntoId, titulo, categoria, descripcion, contenidoCompleto } = params;

  // 1. Chunking
  const chunks = chunkDocumentText(contenidoCompleto, 1000, 150);
  if (chunks.length === 0) {
    throw new Error('El documento no contiene texto suficiente para particionar.');
  }

  const documentId = `doc-${Date.now()}`;
  const client = getSupabaseClient();
  let supabaseSynced = false;

  // 2. Try inserting parent in Supabase documentos_conjunto
  if (client) {
    try {
      const { error: parentErr } = await client.from('documentos_conjunto').insert([
        {
          id: documentId,
          conjunto_id: conjuntoId,
          titulo,
          categoria,
          descripcion: descripcion || '',
          contenido_completo: contenidoCompleto,
          total_chunks: chunks.length,
        },
      ]);
      if (!parentErr) {
        supabaseSynced = true;
      }
    } catch {
      // Table may not exist yet in user's Supabase schema
    }
  }

  // Always keep in local parent cache as well
  IN_MEMORY_PARENT_DOCUMENTS.unshift({
    id: documentId,
    conjuntoId,
    titulo,
    categoria,
    descripcion: descripcion || '',
    contenidoCompleto,
    totalChunks: chunks.length,
    createdAt: new Date().toISOString(),
  });

  // 3. Generate embeddings and insert chunks into documents_embeddings
  const chunksCreated: Array<{ id: string; articulo: string; chunkIndex: number; preview: string }> = [];
  const rowsToInsertInSupabase: any[] = [];

  for (const chunk of chunks) {
    const chunkId = `chunk-${Date.now()}-${chunk.chunkIndex}`;
    // Generate 768-d vector embedding with Gemini API
    const vector = await generateEmbeddingVector(`${chunk.articulo}\n${chunk.contenido}`);

    chunksCreated.push({
      id: chunkId,
      articulo: chunk.articulo,
      chunkIndex: chunk.chunkIndex,
      preview: chunk.contenido.slice(0, 120) + (chunk.contenido.length > 120 ? '...' : ''),
    });

    rowsToInsertInSupabase.push({
      conjunto_id: conjuntoId,
      documento: titulo,
      categoria,
      articulo: chunk.articulo,
      contenido: chunk.contenido,
      embedding: vector,
    });
  }

  // 4. Batch insert into Supabase documents_embeddings
  if (client && rowsToInsertInSupabase.length > 0) {
    try {
      const { data, error } = await client.from('documents_embeddings').insert(rowsToInsertInSupabase);
      if (!error) {
        supabaseSynced = true;
      } else {
        console.warn('Error insertando fragmentos en documents_embeddings:', error.message);
      }
    } catch (e: any) {
      console.warn('Error al conectar con documents_embeddings:', e.message);
    }
  }

  return {
    success: true,
    documentId,
    totalChunks: chunks.length,
    chunksCreated,
    supabaseSynced,
    modelUsed: 'gemini-embedding-001 (768 dimensiones)',
    message: `Documento "${titulo}" particionado con éxito en ${chunks.length} fragmentos con embeddings vectoriales de 768 dimensiones.`,
  };
}

/**
 * Returns the list of parent documents stored
 */
export async function listParentDocuments(conjuntoId?: string): Promise<DocumentoConjuntoPadre[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client.from('documentos_conjunto').select('*');
      if (conjuntoId && conjuntoId !== 'all') {
        query = query.eq('conjunto_id', conjuntoId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          conjuntoId: d.conjunto_id,
          titulo: d.titulo,
          categoria: d.categoria,
          descripcion: d.descripcion,
          contenidoCompleto: d.contenido_completo,
          totalChunks: d.total_chunks || 0,
          createdAt: d.created_at,
        }));
      }
    } catch {
      // fallback to memory
    }
  }

  if (conjuntoId && conjuntoId !== 'all') {
    return IN_MEMORY_PARENT_DOCUMENTS.filter((d) => d.conjuntoId === conjuntoId);
  }
  return IN_MEMORY_PARENT_DOCUMENTS;
}

/**
 * Returns chunks for a specific document
 */
export async function getDocumentChunks(documentoTitulo: string, conjuntoId?: string): Promise<VectorChunk[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client
        .from('documents_embeddings')
        .select('id, documento, categoria, articulo, contenido, created_at, conjunto_id')
        .eq('documento', documentoTitulo);

      if (conjuntoId && conjuntoId !== 'all') {
        query = query.eq('conjunto_id', conjuntoId);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map((item: any, i: number) => ({
          id: item.id,
          documento: item.documento,
          categoria: item.categoria,
          articulo: item.articulo,
          contenido: item.contenido,
          similarity: 1.0,
          chunkIndex: i + 1,
        }));
      }
    } catch {
      // fallback
    }
  }

  return [];
}

/**
 * 1-Click sample regulation with 10 comprehensive articles
 */
export const SAMPLE_FULL_REGLAMENTO_TEXT = `MANUAL DE CONVIVENCIA Y REGLAMENTO INTERNO
RESIDENCIAL LOS SAUCES PROPIEDAD HORIZONTAL
Bogotá D.C. - Vigencia 2026

CAPÍTULO I - OBJETO, ALCANCE Y PRINCIPIOS
Artículo 1. Objeto y Principios Rectores.
El presente reglamento rige las relaciones entre copropietarios, arrendatarios y visitantes de Residencial Los Sauces P.H., fundamentado en el respeto mutuo, la solidaridad social, la prevalencia del interés general sobre el particular y el debido proceso consagrado en la Ley 675 de 2001.

CAPÍTULO II - CONVIVENCIA, NIVELES SONOROS Y TRANQUILIDAD
Artículo 2. Horarios y Límites de Ruido en Unidades Privadas.
Para salvaguardar el descanso de los residentes, los niveles de sonido o música en las unidades privadas no deben superar los 45 decibeles en horario nocturno. Se establecen los siguientes horarios permitidos para reuniones sociales o familiares:
a) De domingo a jueves: hasta las 10:00 PM.
b) Viernes, sábados y vísperas de festivo: hasta la 1:00 AM del día siguiente.
A partir de dicha hora el volumen debe reducirse al mínimo para no perturbar a los vecinos.

Artículo 3. Horarios para Obras, Reformas Locativas y Uso de Taladro.
Cualquier obra de mantenimiento, pintura, carpintería o perforación que genere ruido o vibraciones solo podrá ejecutarse en los siguientes horarios:
- Lunes a viernes: de 8:00 AM a 5:00 PM.
- Sábados: de 8:00 AM a 1:00 PM.
Queda absolutamente prohibido el uso de taladros, martillos o maquinaria ruidosa los domingos y días festivos.

CAPÍTULO III - TENENCIA RESPONSABLE DE MASCOTAS
Artículo 4. Tránsito y Obligaciones de Animales de Compañía.
Todo canino o felino debe transitar en pasillos, ascensores, plazoletas y zonas verdes siempre sujeto con traílla o correa y conducido por un adulto. El propietario o tenedor está obligado a portar bolsa para la recolección inmediata de excretas. Queda prohibido dejar mascotas en balcones ladrando de forma reiterada o arrojar desechos a las fachadas.

Artículo 5. Razas Caninas de Manejo Especial.
Los caninos de manejo especial (clasificados en el Código Nacional de Policía Ley 1801 de 2016, tales como Pitbull, Rottweiler, Dóberman y razas afines) deben portar obligatoriamente bozal y traílla resistente en todas las zonas comunes. Además, el propietario debe registrar ante la administración la póliza de responsabilidad civil extracontractual y el carné de vacunación al día.

CAPÍTULO IV - EXPENSAS COMUNES, CARTERA Y ACUERDOS DE PAGO
Artículo 6. Fechas de Pago, Descuento por Pronto Pago e Intereses Moratorios.
La cuota ordinaria de administración debe cancelarse durante los primeros diez (10) días calendario de cada mes para acceder a un descuento por pronto pago del 10%. A partir del día 11 y hasta el fin de mes, se pagará la tarifa plena. Si no se registra el pago al cierre del mes, desde el primer día del mes siguiente se liquidarán intereses moratorios calculados a la tasa máxima legal vigente certificada por la Superintendencia Financiera (Art. 30 Ley 675 de 2001).

Artículo 7. Restricciones a Morosos y Acuerdos de Pago.
Los copropietarios que adeuden dos (2) o más cuotas de administración no podrán solicitar certificados de paz y salvo ni realizar reservas para el uso de áreas comunes no esenciales (gimnasio, BBQ, salón social). La administración podrá suscribir acuerdos de pago con una cuota inicial mínima del 30% del saldo total adeudado y hasta 6 cuotas mensuales.

CAPÍTULO V - ZONAS COMUNES Y MUDANZAS
Artículo 8. Uso y Reserva del Salón Social y Zona BBQ.
Las reservas deben efectuarse con mínimo cinco (5) días hábiles de antelación ante la administración. El usuario debe consignar un depósito de garantía reembolsable de $150.000 COP para responder por posibles daños en mobiliario o limpieza. El residente solicitante debe estar al día en sus expensas comunes.

Artículo 9. Procedimiento de Trasteos y Mudanzas.
Toda mudanza de ingreso o salida debe notificarse por escrito a la administración con 48 horas de antelación. Se debe consignar un depósito de garantía reembolsable de $100.000 COP para la instalación y uso de los protectores del ascensor de carga. Los horarios autorizados son de lunes a sábado de 8:00 AM a 5:00 PM. No se autorizan trasteos domingos ni festivos.

CAPÍTULO VI - PARQUEADEROS Y RESIDUOS
Artículo 10. Uso de Parqueaderos de Visitantes y Privados.
Los parqueaderos de visitantes son exclusivamente para uso temporal (máximo 6 horas continuas al día). Queda prohibido utilizarlos como estacionamiento fijo de residentes o para vehículos abandonados. No se permite realizar reparaciones mecánicas ni lavado con manguera en las bahías de estacionamiento.`;
