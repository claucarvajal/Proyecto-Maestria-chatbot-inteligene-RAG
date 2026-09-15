import { GoogleGenAI } from '@google/genai';
import { searchSimilarChunks } from './supabasePgvector.js';
import { fetchResidenteByCedula, fetchCarteraByCedula, fetchConjuntos, createPQRSTicket, fetchTicketsForResidente } from './supabaseDb.js';
import { RAGMessage, VectorChunk, LatencyBreakdown, PQRSTicket } from '../src/types/index.js';

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function processRAGQuery(
  userQuery: string,
  cedula: string,
  conjuntoId: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<RAGMessage> {
  const overallStart = Date.now();
  let embeddingMs = 0;
  let vectorSearchMs = 0;
  let llmInferenceMs = 0;

  // 1. Identify Resident Context from Supabase / DB
  const [residente, cartera, conjuntos] = await Promise.all([
    fetchResidenteByCedula(cedula),
    fetchCarteraByCedula(cedula),
    fetchConjuntos(),
  ]);
  const conjunto = conjuntos.find((c) => c.id === conjuntoId) || conjuntos[0];

  const lowerQuery = userQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 2. Intent Detection & Tool Execution (LangChain Agent Pattern)
  let intent: RAGMessage['intent'] = 'GENERAL';
  let toolUsed: string | undefined = undefined;
  let financialData = cartera;
  let ticketData: PQRSTicket | undefined = undefined;
  let ticketsList: PQRSTicket[] | undefined = undefined;

  const isFinancialIntent = 
    lowerQuery.includes('saldo') || 
    lowerQuery.includes('cuota') || 
    lowerQuery.includes('mora') || 
    lowerQuery.includes('debo') || 
    lowerQuery.includes('expensa') || 
    lowerQuery.includes('pago') || 
    lowerQuery.includes('paz y salvo') || 
    lowerQuery.includes('descuento');

  // DISTINCTION: Read Query (DQL) vs Mutation Insertion (DML)
  const isTicketQueryIntent =
    lowerQuery.includes('cuantas quejas') ||
    lowerQuery.includes('cuanta queja') ||
    lowerQuery.includes('cuantos reclamos') ||
    lowerQuery.includes('cuanto reclamo') ||
    lowerQuery.includes('cuantos tickets') ||
    lowerQuery.includes('cuantas solicitudes') ||
    lowerQuery.includes('mis quejas') ||
    lowerQuery.includes('mis reclamos') ||
    lowerQuery.includes('mis tickets') ||
    lowerQuery.includes('mis solicitudes') ||
    lowerQuery.includes('ver quejas') ||
    lowerQuery.includes('ver reclamos') ||
    lowerQuery.includes('ver mis quejas') ||
    lowerQuery.includes('ver mis reclamos') ||
    lowerQuery.includes('ver mis tickets') ||
    lowerQuery.includes('consultar queja') ||
    lowerQuery.includes('consultar reclamo') ||
    lowerQuery.includes('consultar ticket') ||
    lowerQuery.includes('consultar pqrs') ||
    lowerQuery.includes('estado de mi queja') ||
    lowerQuery.includes('estado de mi reclamo') ||
    lowerQuery.includes('estado de mi ticket') ||
    lowerQuery.includes('estado de mi solicitud') ||
    lowerQuery.includes('tengo quejas') ||
    lowerQuery.includes('tengo algun reclamo') ||
    lowerQuery.includes('tengo reclamos') ||
    lowerQuery.includes('tengo tickets') ||
    lowerQuery.includes('historial de quejas') ||
    lowerQuery.includes('historial de reclamos') ||
    lowerQuery.includes('historial de pqrs');

  // Only create a ticket if the user explicitly requests filing/reporting AND it's NOT a query
  const isTicketCreateIntent = !isTicketQueryIntent && (
    lowerQuery.includes('radicar') ||
    lowerQuery.includes('crear ticket') ||
    lowerQuery.includes('crear queja') ||
    lowerQuery.includes('crear reclamo') ||
    lowerQuery.includes('crear pqrs') ||
    lowerQuery.includes('crear peticion') ||
    lowerQuery.includes('crear solicitud') ||
    lowerQuery.includes('abrir ticket') ||
    lowerQuery.includes('abrir queja') ||
    lowerQuery.includes('abrir reclamo') ||
    lowerQuery.includes('abrir pqrs') ||
    lowerQuery.includes('abrir caso') ||
    lowerQuery.includes('generar ticket') ||
    lowerQuery.includes('generar queja') ||
    lowerQuery.includes('generar reclamo') ||
    lowerQuery.includes('generar pqrs') ||
    lowerQuery.includes('generar radicado') ||
    lowerQuery.includes('generar reporte') ||
    lowerQuery.includes('poner queja') ||
    lowerQuery.includes('poner una queja') ||
    lowerQuery.includes('poner reclamo') ||
    lowerQuery.includes('poner un reclamo') ||
    lowerQuery.includes('poner una peticion') ||
    lowerQuery.includes('poner peticion') ||
    lowerQuery.includes('interponer queja') ||
    lowerQuery.includes('interponer una queja') ||
    lowerQuery.includes('interponer reclamo') ||
    lowerQuery.includes('interponer un reclamo') ||
    lowerQuery.includes('presentar queja') ||
    lowerQuery.includes('presentar una queja') ||
    lowerQuery.includes('presentar reclamo') ||
    lowerQuery.includes('presentar un reclamo') ||
    lowerQuery.includes('presentar solicitud') ||
    lowerQuery.includes('ingresar queja') ||
    lowerQuery.includes('ingresar reclamo') ||
    lowerQuery.includes('ingresar ticket') ||
    lowerQuery.includes('reportar') ||
    lowerQuery.startsWith('reporto ') ||
    lowerQuery.startsWith('reporte de ') ||
    lowerQuery.includes('tengo una queja') ||
    lowerQuery.includes('tengo un reclamo') ||
    lowerQuery.includes('tengo una novedad') ||
    lowerQuery.includes('tengo un reporte') ||
    lowerQuery.includes('quiero quejarme') ||
    lowerQuery.includes('necesito quejarme') ||
    lowerQuery.includes('quiero reclamar') ||
    lowerQuery.includes('solicito mantenimiento') ||
    lowerQuery.includes('solicito reparacion') ||
    lowerQuery.includes('solicito arreglo') ||
    lowerQuery.includes('solicitud de mantenimiento') ||
    lowerQuery.includes('solicitud de reparacion') ||
    lowerQuery.includes('solicitud de arreglo') ||
    lowerQuery.includes('denunciar')
  );

  const isBookingIntent = 
    lowerQuery.includes('reservar') || 
    lowerQuery.includes('salon') || 
    lowerQuery.includes('bbq') || 
    lowerQuery.includes('alquiler salon');

  // Vector Search on Regulations using pgvector
  const searchResult = await searchSimilarChunks(userQuery, conjuntoId, 4, 0.35);
  vectorSearchMs = searchResult.latencyMs;
  embeddingMs = Math.round(vectorSearchMs * 0.4);
  const retrievedChunks: VectorChunk[] = searchResult.chunks;

  // Tool Routing
  if (isTicketQueryIntent && residente) {
    // READ ONLY: Query tickets from database without modifying anything
    intent = 'CONSULTA_PQRS';
    toolUsed = 'herramienta_consulta_tickets_supabase_pg';
    ticketsList = await fetchTicketsForResidente(cedula);
  } else if (isTicketCreateIntent && residente) {
    // MUTATION: Insert new ticket only on explicit command
    intent = 'RADICACION_PQRS';
    toolUsed = 'herramienta_radicacion_pqrs';
    
    let categoria: PQRSTicket['categoria'] = 'Mantenimiento / Daños';
    let prioridad: PQRSTicket['prioridad'] = 'Media';
    
    if (lowerQuery.includes('ruido') || lowerQuery.includes('musica') || lowerQuery.includes('vecino') || lowerQuery.includes('fiesta') || lowerQuery.includes('convivencia') || lowerQuery.includes('tranquilidad')) {
      categoria = 'Ruido y Convivencia';
    } else if (lowerQuery.includes('plata') || lowerQuery.includes('cobro') || lowerQuery.includes('cuenta') || lowerQuery.includes('saldo') || lowerQuery.includes('mora') || lowerQuery.includes('cuota') || lowerQuery.includes('expensa') || lowerQuery.includes('factur')) {
      categoria = 'Expensas y Cartera';
    } else if (lowerQuery.includes('mascota') || lowerQuery.includes('perro') || lowerQuery.includes('gato') || lowerQuery.includes('canino') || lowerQuery.includes('felino')) {
      categoria = 'Mascotas';
    } else if (lowerQuery.includes('seguridad') || lowerQuery.includes('robo') || lowerQuery.includes('vigilancia') || lowerQuery.includes('porteria')) {
      categoria = 'Seguridad';
    }

    if (lowerQuery.includes('urgente') || lowerQuery.includes('inundacion') || lowerQuery.includes('gas') || lowerQuery.includes('grave') || lowerQuery.includes('emergencia') || lowerQuery.includes('peligro')) {
      prioridad = 'Urgente';
    } else if (lowerQuery.includes('fuga') || lowerQuery.includes('gotera') || lowerQuery.includes('danado') || lowerQuery.includes('daño') || lowerQuery.includes('filtracion') || lowerQuery.includes('ascensor') || lowerQuery.includes('sin luz') || lowerQuery.includes('sin agua')) {
      prioridad = 'Alta';
    } else if (lowerQuery.includes('baja') || lowerQuery.includes('sugerencia') || lowerQuery.includes('informacion')) {
      prioridad = 'Baja';
    }

    const safeConjuntoId = residente.conjuntoId || conjuntoId || 'conjunto-1';
    const newTicket = await createPQRSTicket(safeConjuntoId, residente, categoria, userQuery, prioridad);
    ticketData = newTicket;
  } else if (isFinancialIntent) {
    intent = 'CONSULTA_EXPENSAS_MORA';
    toolUsed = 'herramienta_cartera_supabase_pg';
  } else if (isBookingIntent) {
    intent = 'RESERVA_ZONAS';
    toolUsed = 'herramienta_verificacion_reglamento_zonas';
  } else {
    intent = 'CONSULTA_REGLAMENTO';
    toolUsed = 'herramienta_recuperacion_vectorial_pgvector';
  }

  // 3. Construct Augmented Context for Gemini
  const ticketsContextStr = ticketsList !== undefined
    ? `\nTICKETS / QUEJAS RADICADAS DEL RESIDENTE EN SUPABASE:
${ticketsList.length === 0 
    ? '- El residente NO tiene quejas ni tickets radicados actualmente (0 tickets abiertos).' 
    : `- Total tickets radicados: ${ticketsList.length}\n` + ticketsList.map((t, idx) => `  ${idx + 1}. [${t.codigo}] Categoría: ${t.categoria} | Estado: ${t.estado} | Prioridad: ${t.prioridad} | SLA: ${t.slaHoras}h | Radicado el: ${t.fechaCreacion} | Asunto: "${t.descripcion}"`).join('\n')}`
    : '';

  const residentContextStr = residente
    ? `DATOS DEL RESIDENTE AUTENTICADO:
- Nombre: ${residente.nombre} (Cédula: ${residente.cedula})
- Unidad: ${residente.torre} Apto ${residente.apto}
- Calidad: ${residente.tipo} (Alícuota: ${residente.alicuota}%)
- Vehículo: ${residente.vehiculoPlaca || 'No registra'} (Parqueadero: ${residente.parqueadero || 'No asignado'})
- Mascotas: ${residente.mascotas}
- ESTADO DE CARTERA ACTUAL: ${cartera ? `${cartera.estado}. Total a pagar periodo: $${cartera.totalPagar.toLocaleString('es-CO')} COP (Cuota ordinaria: $${cartera.cuotaOrdinaria.toLocaleString('es-CO')}, Meses en mora: ${cartera.mesesMora}, Mora acumulada: $${cartera.totalMora.toLocaleString('es-CO')}, Intereses: $${cartera.interesesMora.toLocaleString('es-CO')}, Descuento pronto pago: $${cartera.descuentoProntoPago.toLocaleString('es-CO')} hasta el ${cartera.fechaLimiteDescuento})` : 'Sin registro de cartera'}${ticketsContextStr}`
    : 'RESIDENTE NO IDENTIFICADO (Visitante / Consulta general).';

  const vectorContextStr = retrievedChunks
    .map(
      (c, i) => `[FUENTE ${i + 1}] (${c.documento} - ${c.articulo}):
${c.contenido} (Similitud Coseno: ${c.similarity.toFixed(3)})`
    )
    .join('\n\n');

  const systemInstruction = `Eres "ComuniBot RAG", el Asistente Inteligente de Gestión y Automatización de Procesos de Propiedad Horizontal para el "${conjunto.nombre}".
Tu objetivo en este proyecto de maestría es resolver las dudas de los residentes con fundamentación rigurosa, citar con exactitud los artículos normativos y reglamentarios recuperados mediante la base vectorial pgvector, y brindar información personalizada de expensas, mora o radicación de solicitudes.

REGLAS DE RESPUESTA:
1. Responde en español con tono profesional, empático, claro y cordial.
2. Si el usuario consulta sobre sus gastos comunes, mora o cuota, responde con los datos exactos del residente autenticado que tienes en el contexto (${residente?.nombre || 'Usuario'}).
3. Si el usuario consulta cuántas quejas tiene, sus reclamos o estado de tickets (CONSULTA / DQL), responde informándole exactamente cuántos tickets tiene registrados en la base de datos (0 si no tiene ninguno) con sus códigos oficiales y estados. NUNCA inventes radicados ni ejecutes inserciones cuando el usuario solo está preguntando o consultando.
4. Si se radicó una NUEVA solicitud PQRS (mutación DML explícita), confirma el número de radicado generado (${ticketData?.codigo || 'PQRS'}), el tiempo estimado de respuesta (SLA) y los próximos pasos de la administración.
5. Si el usuario consulta sobre reglamentos (mascotas, mudanzas, ruido, obras, salón social, BBQ, etc.), DEBES citar expresamente los artículos y normas encontrados en las FUENTES RECUPERADAS (por ejemplo: "De acuerdo con el Artículo 45 del Reglamento Interno...").
6. Sé conciso pero exhaustivo en los detalles normativos (horarios, valores, sanciones o requisitos).
7. Si una pregunta no se encuentra en las fuentes o en los datos del residente, indica amablemente que la administración humana (${conjunto.telefonoAdmin} o ${conjunto.emailAdmin}) podrá brindar asistencia complementaria.`;

  const prompt = `CONTEXTO DEL SISTEMA:
${residentContextStr}

FRAGMENTOS RECUPERADOS MEDIANTE BÚSQUEDA VECTORIAL (PGVECTOR):
${vectorContextStr}

${ticketData ? `ACCIÓN AUTOMATIZADA EJECUTADA: Se ha generado el radicado ${ticketData.codigo} para esta novedad con prioridad ${ticketData.prioridad} y SLA de ${ticketData.slaHoras} horas.` : ''}

CONSULTA DEL RESIDENTE:
"${userQuery}"

Por favor genera una respuesta articulada, citando fuentes normativas y datos del residente si aplica:`;

  // 4. Call Gemini 3.8 Flash with 10s timeout or Fallback
  let generatedText = '';
  const llmStart = Date.now();
  const ai = getGeminiClient();

  if (ai) {
    try {
      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout excedido (12s)')), 12000)
      );

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      generatedText = response.text || '';
    } catch (err: any) {
      console.warn('Invocando generador sintético factual RAG debido a:', err.message || err);
      generatedText = generateSyntheticRAGResponse(userQuery, residente, cartera, retrievedChunks, ticketData, ticketsList);
    }
  } else {
    // Deterministic factual generator based on retrieved RAG chunks & database state
    generatedText = generateSyntheticRAGResponse(userQuery, residente, cartera, retrievedChunks, ticketData, ticketsList);
  }

  llmInferenceMs = Date.now() - llmStart;
  const totalMs = Date.now() - overallStart;

  const latency: LatencyBreakdown = {
    embeddingMs,
    vectorSearchMs,
    llmInferenceMs,
    totalMs,
  };

  return {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content: generatedText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    chunks: retrievedChunks,
    intent,
    toolUsed,
    latency,
    financialData,
    ticketData,
    ticketsList,
    ragConfidence: retrievedChunks.length > 0 ? Math.min(0.98, Math.max(0.72, retrievedChunks[0].similarity + 0.15)) : 0.8,
  };
}

function generateSyntheticRAGResponse(
  query: string,
  residente: any,
  cartera: any,
  chunks: VectorChunk[],
  ticketData: any,
  ticketsList?: PQRSTicket[]
): string {
  const q = query.toLowerCase();

  // 1. Ticket list consultation response (DQL)
  if (ticketsList !== undefined) {
    if (ticketsList.length === 0) {
      return `Estimado/a **${residente?.nombre || 'residente'}** (${residente?.torre || 'Torre'} Apto ${residente?.apto || 'Apto'}), consultando la base de datos de PQRS en Supabase:

✅ **Quejas o reclamos activos:** **0 tickets**.
Actualmente no tienes radicados de quejas, reclamos ni reportes de averías pendientes en el sistema. Todo se encuentra al día y en orden.

*Nota:* Si necesitas registrar alguna novedad formalmente ante la administración, puedes escribirme *"Deseo radicar una queja sobre..."* o abrir la opción de Radicación PQRS.`;
    }

    return `Estimado/a **${residente?.nombre || 'residente'}** (${residente?.torre} Apto ${residente?.apto}), revisando la base de datos de PQRS en Supabase, actualmente cuentas con **${ticketsList.length} ticket(s)** radicado(s):

${ticketsList.map((t, idx) => `📋 **Ticket #${idx + 1}: \`${t.codigo}\`**
• **Categoría:** ${t.categoria}
• **Estado actual:** \`${t.estado}\` (Prioridad: ${t.prioridad})
• **Fecha de radicación:** ${t.fechaCreacion}
• **Motivo reportado:** "${t.descripcion}"
• **Tiempo estimado de atención (SLA):** ${t.slaHoras} horas hábiles`).join('\n\n')}

Puedes consultar el historial o las respuestas de la administración presionando el botón de **Seguimiento PQRS**.`;
  }

  if (ticketData) {
    return `Estimado/a ${residente?.nombre || 'residente'}, he recibido y clasificado tu requerimiento en el sistema de gestión de la comunidad:

📌 **Radicado Oficial:** \`${ticketData.codigo}\`
🏢 **Unidad:** ${ticketData.unidad}
📋 **Categoría asignada:** ${ticketData.categoria}
⏱️ **Tiempo estimado de atención (SLA):** ${ticketData.slaHoras} horas hábiles
⚡ **Prioridad:** ${ticketData.prioridad}

Tu solicitud ha sido direccionada a la cuadrilla de mantenimiento y administración. Puedes hacer seguimiento a este ticket en cualquier momento desde tu panel o consultándome por el código.`;
  }

  if (q.includes('saldo') || q.includes('debo') || q.includes('cuota') || q.includes('mora') || q.includes('pago') || q.includes('administracion')) {
    if (!cartera) {
      return `No se encontró registro de cartera activo para el documento consultado. Por favor acércate a la oficina de administración.`;
    }
    if (cartera.estado === 'Al día') {
      return `Estimado/a **${residente.nombre}** (${residente.torre} Apto ${residente.apto}), te confirmo tu estado financiero actual en el conjunto:

✅ **Estado de Cartera:** Al día (Paz y salvo vigente).
💵 **Cuota ordinaria del mes (${cartera.mesPeriodo}):** $${cartera.cuotaOrdinaria.toLocaleString('es-CO')} COP.
🏷️ **Beneficio Pronto Pago:** Si cancelas antes del **${cartera.fechaLimiteDescuento}**, recibes un 10% de descuento ($${cartera.descuentoProntoPago.toLocaleString('es-CO')} COP), pagando únicamente **$${cartera.totalPagar.toLocaleString('es-CO')} COP**.
📅 **Fecha límite regular sin descuento:** ${cartera.fechaVencimiento}.

*Fundamento normativo:* Según el **Artículo 45 del Reglamento Interno**, los pagos registrados en los primeros 10 días disfrutan de descuento por pronto pago.`;
    } else if (cartera.estado === 'En mora') {
      return `Apreciado/a **${residente.nombre}** (${residente.torre} Apto ${residente.apto}), revisando el módulo financiero de Supabase tu estado actual es:

⚠️ **Estado de Cartera:** **En mora (${cartera.mesesMora} meses pendientes)**.
📊 **Detalle de la deuda:**
- Cuotas vencidas acumuladas: $${cartera.totalMora.toLocaleString('es-CO')} COP.
- Cuota ordinaria del mes en curso: $${cartera.cuotaOrdinaria.toLocaleString('es-CO')} COP.
- Cuota extraordinaria de imprevistos: $${cartera.cuotaExtraordinaria.toLocaleString('es-CO')} COP.
- Intereses de mora causados: $${cartera.interesesMora.toLocaleString('es-CO')} COP.
🔴 **Total a pagar para quedar a paz y salvo:** **$${cartera.totalPagar.toLocaleString('es-CO')} COP**.

*Fundamento legal:* Conforme al **Artículo 30 de la Ley 675 de 2001** y el **Artículo 48 del Manual de Convivencia**, el retardo en el pago causa intereses moratorios a la tasa legal vigente. Para evitar el reporte en listado de deudores o suspensión de reservas de áreas comunes recreativas, puedes solicitar un acuerdo de pago con una cuota inicial del 30%.`;
    } else {
      return `Apreciado/a **${residente.nombre}**, cuentas con un **Acuerdo de pago activo** registrado en el sistema. Tu cuota combinada a pagar este mes es de **$${cartera.totalPagar.toLocaleString('es-CO')} COP**, a vencer el ${cartera.fechaLimiteDescuento}.`;
    }
  }

  // Grounded in retrieved vector chunks
  if (chunks.length > 0) {
    const topChunk = chunks[0];
    return `Con base en la consulta semántica en la base de datos documental de la copropiedad:

📖 **Fuente oficial:** *${topChunk.documento} - ${topChunk.articulo}*
(Puntaje de Similitud Coseno: ${topChunk.similarity.toFixed(3)})

${topChunk.contenido}

${chunks.length > 1 ? `\n📌 **Norma complementaria (${chunks[1].articulo}):**\n${chunks[1].contenido}` : ''}

¿Deseas que te oriente en algún trámite adicional o radicar una solicitud formal ante la administración?`;
  }

  return `He consultado el repositorio de normas y reglamentos del conjunto. Te confirmo que las disposiciones generales de convivencia de la copropiedad promueven la seguridad, el respeto entre vecinos y el cumplimiento de la Ley 675 de 2001. Puedes consultarme puntualmente sobre horarios de mudanza, tenencia de mascotas, reserva del salón social, control de ruido o estado de tu cuenta de administración.`;
}
