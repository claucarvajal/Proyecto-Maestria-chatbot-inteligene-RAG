export interface DocumentChunkSeed {
  id: string;
  documento: string;
  categoria: 'Reglamento Interno' | 'Ley 675 de 2001' | 'Manual de Convivencia' | 'Expensas y Finanzas' | 'Zonas Comunes';
  articulo: string;
  contenido: string;
  keywords: string[];
}

export const KNOWLEDGE_BASE_CHUNKS: DocumentChunkSeed[] = [
  {
    id: 'chunk-expensas-01',
    documento: 'Ley 675 de 2001 - Régimen de Propiedad Horizontal',
    categoria: 'Expensas y Finanzas',
    articulo: 'Art. 29 y 30 - Obligación del pago de expensas comunes e intereses de mora',
    contenido: 'Los propietarios de los bienes de dominio particular están obligados a contribuir al pago de las expensas necesarias causadas por la administración y la prestación de los servicios comunes. El retardo en el pago causará intereses de mora, equivalentes a una y media veces el interés bancario corriente certificado por la Superintendencia Financiera, sin perjuicio de que la asamblea general establezca un interés inferior. Existe solidaridad entre el propietario anterior y el nuevo adquirente, así como entre propietario y tenedor a cualquier título.',
    keywords: ['expensas', 'cuota', 'mora', 'intereses', 'pago', 'retraso', 'obligacion', 'solidaridad']
  },
  {
    id: 'chunk-expensas-02',
    documento: 'Reglamento Interno de Propiedad Horizontal',
    categoria: 'Expensas y Finanzas',
    articulo: 'Art. 45 - Fechas de pago, descuento por pronto pago y mora',
    contenido: 'La cuota ordinaria de administración debe cancelarse en los primeros 10 días calendario de cada mes para acceder a un descuento por pronto pago del 10%. A partir del día 11 y hasta el último día del mes, se paga el valor pleno sin descuento. Si al finalizar el mes el pago no ha sido registrado, a partir del día 1 del mes siguiente se liquidarán intereses de mora a la tasa legal vigente. Los residentes con más de 2 cuotas en mora no podrán gozar de paz y salvo ni reservar zonas recreativas comunes.',
    keywords: ['pronto pago', 'descuento', 'fecha limite', 'vencimiento', 'diez dias', 'cuota ordinaria', 'saldo']
  },
  {
    id: 'chunk-expensas-03',
    documento: 'Manual de Convivencia y Gestión de Cartera',
    categoria: 'Expensas y Finanzas',
    articulo: 'Art. 48 - Consecuencias por mora prolongada y acuerdos de pago',
    contenido: 'Cuando un copropietario acumule 60 o más días en mora, la administración enviará cobro persuasivo. A los 90 días, se publicará en cartelera interna de deudores morosos (conforme a la jurisprudencia constitucional Sentencia C-328 de 2014 que avala publicación interna sin violar hábeas data). Se suspenderá el acceso a zonas sociales y recreativas como gimnasio, BBQ y salón de eventos. El residente puede solicitar un acuerdo de pago con cuota inicial del 30% y diferido hasta 6 meses sin que se suspendan los servicios básicos esenciales.',
    keywords: ['mora', 'cobro juridico', 'deudores', 'cartelera', 'acuerdo de pago', 'suspension', 'zonas sociales']
  },
  {
    id: 'chunk-mascotas-01',
    documento: 'Manual de Convivencia Residencial',
    categoria: 'Manual de Convivencia',
    articulo: 'Art. 18 - Tenencia responsable de animales de compañía',
    contenido: 'Todos los caninos y felinos deben transitar en áreas comunes (pasillos, ascensores, plazoletas y zonas verdes) siempre sujetos mediante traílla o correa y acompañados por un adulto responsable. Los propietarios deben portar bolsa plástica biodegradable para la recolección inmediata de deposiciones fecales y depositarlas en los canecas destinadas para ello. Se prohíbe dejar mascotas solas en balcones ladrando de forma continua o depositando desechos hacia pisos inferiores.',
    keywords: ['mascotas', 'perros', 'gatos', 'correa', 'trailla', 'excrementos', 'balcon', 'ladridos']
  },
  {
    id: 'chunk-mascotas-02',
    documento: 'Manual de Convivencia Residencial',
    categoria: 'Manual de Convivencia',
    articulo: 'Art. 20 - Razas de manejo especial y sanciones por mascotas',
    contenido: 'Los ejemplares caninos clasificados como de manejo especial por la Ley 1801 de 2016 (como Pitbull, Rottweiler, Dóberman, entre otros) deben llevar obligatoriamente bozal y traílla resistente en todas las áreas comunes del conjunto, sin excepción. La no recolección de excrementos o el porte sin correa generará un llamado de atención por escrito. En caso de reincidencia, se impondrá una sanción económica equivalente al 50% de la cuota de administración ordinaria.',
    keywords: ['raza peligrosa', 'manejo especial', 'bozal', 'pitbull', 'sancion mascota', 'multa excrementos']
  },
  {
    id: 'chunk-mudanzas-01',
    documento: 'Reglamento Interno de Propiedad Horizontal',
    categoria: 'Reglamento Interno',
    articulo: 'Art. 32 - Horarios autorizados para trasteos y mudanzas',
    contenido: 'Las mudanzas e ingreso/salida de trasteos únicamente están autorizados de lunes a viernes en el horario de 8:00 a.m. a 5:00 p.m., y los sábados de 8:00 a.m. a 1:00 p.m. Quedan terminantemente prohibidas las mudanzas los días domingos y festivos, así como en horario nocturno. Todo trasteo debe ser notificado por escrito a la administración con al menos 48 horas de anticipación, verificando que la unidad esté a paz y salvo por todo concepto.',
    keywords: ['mudanza', 'trasteo', 'horario mudanza', 'sabado', 'domingo', 'anticipacion', 'paz y salvo']
  },
  {
    id: 'chunk-mudanzas-02',
    documento: 'Reglamento Interno de Propiedad Horizontal',
    categoria: 'Reglamento Interno',
    articulo: 'Art. 34 - Depósito de garantía y protección de ascensores',
    contenido: 'Para realizar un trasteo es requisito obligatorio consignar un depósito de garantía reembolsable de $100.000 COP para cubrir eventuales deterioros en paredes, pintura, puertas o cabina de ascensor. La administración suministrará los protectores acolchados para el ascensor de carga/servicio. Finalizado el trasteo y previa inspección de vigilancia que certifique que no hubo daños, el valor del depósito se devolverá en un plazo máximo de 2 días hábiles.',
    keywords: ['deposito garantia', 'ascensor de carga', 'protector ascensor', 'daños mudanza', 'reembolso']
  },
  {
    id: 'chunk-zonas-01',
    documento: 'Reglamento de Uso de Bienes y Zonas Comunes',
    categoria: 'Zonas Comunes',
    articulo: 'Art. 55 - Alquiler y uso del Salón Social / Comunal',
    contenido: 'El Salón Comunal tiene un costo de alquiler de $120.000 COP para eventos familiares de copropietarios o arrendatarios, más un depósito de garantía reembolsable de $150.000 COP. Aforo máximo permitido: 60 personas sentadas. Horario de préstamo: viernes y sábados hasta las 12:00 a.m. (medianoche); domingos y festivos hasta las 8:00 p.m. Se prohíbe el uso de pólvora, inflables no autorizados o equipos de amplificación de sonido que superen los 60 decibeles.',
    keywords: ['salon comunal', 'salon social', 'alquiler', 'reserva', 'aforo', 'horario fiesta', 'costo salon']
  },
  {
    id: 'chunk-zonas-02',
    documento: 'Reglamento de Uso de Bienes y Zonas Comunes',
    categoria: 'Zonas Comunes',
    articulo: 'Art. 58 - Zona de BBQ y Quiosco Recreativo',
    contenido: 'La zona BBQ debe reservarse con mínimo 3 días de anterioridad en la plataforma del conjunto. La tarifa de uso y limpieza es de $40.000 COP por turno (Turno 1: 11:00 a.m. a 4:00 p.m. / Turno 2: 5:00 p.m. a 10:00 p.m.). El residente es responsable del aseo básico de las parrillas y del apagado completo de carbón para evitar conatos de incendio. Solo pueden reservar residentes al día en expensas.',
    keywords: ['bbq', 'asados', 'zona bbq', 'parrilla', 'reserva bbq', 'turno', 'tarifa bbq']
  },
  {
    id: 'chunk-ruido-01',
    documento: 'Manual de Convivencia Residencial',
    categoria: 'Manual de Convivencia',
    articulo: 'Art. 12 - Control de ruidos, música y niveles de presión sonora',
    contenido: 'El nivel de sonido en el interior de las unidades habitacionales no debe trascender a las zonas comunes ni perturbar el descanso de los vecinos. Se establece horario de descanso obligatorio de 10:00 p.m. a 7:00 a.m. de domingo a jueves, y de 1:00 a.m. a 8:00 a.m. viernes y sábados. El vigilante de turno está facultado para hacer un primer requerimiento verbal; de persistir el ruido, se expedirá informe para imposición de multa del 50% de la cuota ordinaria y remisión al cuadrante de Policía Nacional.',
    keywords: ['ruido', 'musica', 'volumen', 'fiesta', 'descanso', 'horario nocturno', 'policia', 'decibeles']
  },
  {
    id: 'chunk-reformas-01',
    documento: 'Reglamento Interno de Propiedad Horizontal',
    categoria: 'Reglamento Interno',
    articulo: 'Art. 25 - Obras de remodelación y adecuaciones locativas',
    contenido: 'Las remodelaciones internas que generen ruido o manejo de escombros sólo pueden ejecutarse de lunes a viernes de 8:00 a.m. a 5:00 p.m. y sábados de 8:00 a.m. a 12:00 m. No se permite realizar reformas domingos ni festivos. Todo escombro debe sacarse en lonas cerradas por el ascensor de carga protegido y no puede permanecer en zonas de parqueadero ni pasillos. Requiere autorización previa de la administración radicando copia de póliza o ARL de contratistas.',
    keywords: ['obras', 'remodelacion', 'reparaciones', 'taladro', 'escombros', 'contratistas', 'horario obras']
  },
  {
    id: 'chunk-parqueaderos-01',
    documento: 'Reglamento de Parqueaderos y Tráfico Interno',
    categoria: 'Reglamento Interno',
    articulo: 'Art. 62 - Uso de parqueaderos de visitantes y privados',
    contenido: 'Los parqueaderos privados son de uso exclusivo del titular o arrendatario de la unidad. La velocidad máxima de circulación interna es de 10 km/h. Los parqueaderos de visitantes son rotativos; el servicio es gratuito durante las primeras 4 horas continuas; a partir de la 5ta hora se causará una tarifa de $3.000 COP por hora o fracción. Ningún residente puede parquear vehículos de su propiedad en bahías de visitantes.',
    keywords: ['parqueadero', 'estacionamiento', 'visitantes', 'tarifa parqueadero', 'velocidad', 'vehiculo']
  },
  {
    id: 'chunk-pqrs-01',
    documento: 'Procedimiento Institucional de Atención al Residente',
    categoria: 'Manual de Convivencia',
    articulo: 'Art. 70 - Tiempos de respuesta para PQRS y contingencias',
    contenido: 'Toda petición, queja, reclamo o sugerencia radicada formalmente recibirá respuesta oficial en los siguientes plazos máximos: 1) Emergencias y daños locativos que comprometan la seguridad o salubridad: intervención inicial en menos de 4 horas; 2) Consultas de cartera y estados de cuenta: 3 días hábiles; 3) Reclamaciones de convivencia y solicitudes administrativas: 5 días hábiles. El sistema asignará un código único para seguimiento en línea.',
    keywords: ['pqrs', 'queja', 'reclamo', 'daño', 'fuga', 'tiempo de respuesta', 'radicado', 'sla']
  }
];

// In-memory embedding vector mock-generator with 768 dimensions (representing gemini-embedding-2-preview)
// with consistent hashing on semantic keywords and character n-grams to guarantee genuine cosine similarity
export function generateLocalEmbedding(text: string, dimensions = 768): number[] {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const vector = new Array(dimensions).fill(0);
  
  // Semantic feature weights
  const semanticBuckets: Record<string, number[]> = {
    expensas: [0, 50],
    cuota: [5, 55],
    mora: [10, 60],
    pago: [15, 65],
    saldo: [20, 70],
    interes: [25, 75],
    mascota: [80, 130],
    perro: [85, 135],
    bozal: [90, 140],
    excremento: [95, 145],
    mudanza: [150, 200],
    trasteo: [155, 205],
    horario: [160, 210],
    sabado: [165, 215],
    salon: [220, 270],
    fiesta: [225, 275],
    bbq: [230, 280],
    reserva: [235, 285],
    ruido: [290, 340],
    musica: [295, 345],
    volumen: [300, 350],
    obra: [360, 410],
    remodelacion: [365, 415],
    taladro: [370, 420],
    parqueadero: [430, 480],
    visitante: [435, 485],
    carro: [440, 490],
    pqrs: [500, 550],
    daño: [505, 555],
    fuga: [510, 560],
    agua: [515, 565]
  };

  // Populate semantic dimensions
  for (const [kw, indices] of Object.entries(semanticBuckets)) {
    if (normalized.includes(kw)) {
      indices.forEach((idx, step) => {
        vector[idx % dimensions] += 1.5 + (step * 0.2);
        vector[(idx + 13) % dimensions] += 1.1;
      });
    }
  }

  // Populate general n-gram hash dimensions
  for (let i = 0; i < normalized.length - 2; i++) {
    const gram = normalized.substring(i, i + 3);
    let hash = 0;
    for (let j = 0; j < gram.length; j++) {
      hash = ((hash << 5) - hash) + gram.charCodeAt(j);
      hash |= 0;
    }
    const bucket = Math.abs(hash) % dimensions;
    vector[bucket] += 0.45;
  }

  // L2-normalization for cosine distance
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return vector;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
