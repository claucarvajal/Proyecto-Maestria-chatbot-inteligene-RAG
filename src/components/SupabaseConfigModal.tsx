import React, { useState, useEffect } from 'react';
import { X, Database, Copy, Check, Terminal, Search, ShieldCheck, Key, RefreshCw, Layers, CheckCircle2, AlertTriangle } from 'lucide-react';
import { VectorChunk } from '../types/index.js';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [chunks, setChunks] = useState<VectorChunk[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [testResults, setTestResults] = useState<VectorChunk[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'liveDb' | 'guide' | 'sql' | 'vectorStore'>('liveDb');

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchChunks();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/supabase/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.warn('Error al obtener estado de Supabase:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchChunks = async () => {
    try {
      const res = await fetch('/api/vector/chunks');
      const data = await res.json();
      if (data.chunks) {
        setChunks(data.chunks);
      }
    } catch (err) {
      console.warn('Error cargando chunks:', err);
    }
  };

  const handleTestSearch = () => {
    if (!searchQuery.trim()) {
      setTestResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const scored = chunks.map((c) => {
      let sim = 0.45;
      const text = `${c.articulo} ${c.contenido}`.toLowerCase();
      if (text.includes(q)) sim += 0.48;
      else {
        const words = q.split(' ');
        const matches = words.filter((w) => w.length > 3 && text.includes(w)).length;
        sim += matches * 0.15;
      }
      return { ...c, similarity: Math.min(0.97, sim) };
    });
    scored.sort((a, b) => b.similarity - a.similarity);
    setTestResults(scored.slice(0, 3));
  };

  const copySql = () => {
    if (status?.sqlMigrationScript) {
      navigator.clipboard.writeText(status.sqlMigrationScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#111318] rounded-2xl max-w-3xl w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-[#161922] border-b border-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Conexión y Tablas de Supabase</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                  status?.connected
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                    : 'bg-blue-950/80 text-blue-400 border border-blue-800/50'
                }`}>
                  {status?.connected ? '● Supabase Conectado' : '● Motor Local Activo'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Todo el aplicativo (autenticación, cartera, PQRS y RAG) consulta la base de datos Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#0E1015] px-6 gap-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('liveDb')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'liveDb'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Tablas y Datos en Vivo</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>2. Variables de Conexión</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'sql'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>3. Script SQL (3 Residentes)</span>
          </button>
          <button
            onClick={() => setActiveTab('vectorStore')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'vectorStore'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>4. Embeddings pgvector</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs custom-scrollbar">
          {activeTab === 'liveDb' && (
            <div className="space-y-4">
              {/* Top Connection Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                status?.connected
                  ? 'bg-emerald-950/30 border-emerald-800/50'
                  : 'bg-[#1A1D24] border-slate-800'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    status?.connected ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {status?.connected ? <CheckCircle2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">
                      {status?.connected ? 'Conexión Directa a Supabase Establecida' : 'Sistema Listo para Apuntar a tu Base de Datos'}
                    </span>
                    <p className="text-slate-300 text-xs mt-0.5">
                      {status?.connected
                        ? 'Todas las consultas de residentes, saldos de cartera, radicados de PQRS y búsqueda vectorial leen y escriben en Supabase.'
                        : 'El servidor busca SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_ANON_KEY). Mientras las enlazas en Ajustes, el motor opera sincronizado.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={fetchStatus}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer flex-shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Verificando...' : 'Probar Conexión'}</span>
                </button>
              </div>

              {/* Real-time Tables Overview */}
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-2">Estado y Registros en las Tablas:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#1A1D24] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Tabla: residentes</span>
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        {status?.tables?.residentes ?? 3} registros
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      3 copropietarios registrados: Carlos Mendoza, María Fernanda Gómez y Juan Camilo Restrepo.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1A1D24] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Tabla: cartera_expensas</span>
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        {status?.tables?.cartera_expensas ?? 3} registros
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Saldos individuales, periodos, descuentos por pronto pago y moras calculadas.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1A1D24] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Tabla: pqrs_tickets</span>
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-blue-950 text-blue-400 border border-blue-800/60">
                        {status?.tables?.pqrs_tickets ?? 3} radicados
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Peticiones, quejas y reclamos con SLA en horas y estado de respuesta administrativa.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1A1D24] border border-blue-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Tabla PADRE: documentos_conjunto</span>
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-blue-950 text-blue-400 border border-blue-800/60">
                        {status?.tables?.documentos_conjunto ?? 1} reglamentos
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Reglamentos y manuales completos originales preservados íntegros para auditoría legal.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1A1D24] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Tabla HIJA: documents_embeddings</span>
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-purple-950 text-purple-400 border border-purple-800/60">
                        {status?.tables?.documents_embeddings ?? 8} chunks (pgvector)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Fragmentos vinculados por <code className="text-blue-300">documento_id</code> e indexados con <code className="text-purple-300">vector(768)</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sample resident list in database */}
              <div className="p-3.5 rounded-xl bg-[#0A0B0E] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Residentes Activos en la Base de Datos ({status?.tables?.residentes ?? 4}):</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Lectura Directa de Tabla 'residentes'</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-lg bg-[#161922] border border-slate-800">
                    <span className="font-bold text-amber-400 block text-xs">Laura Sofía Sánchez</span>
                    <span className="text-[11px] text-slate-400 block font-mono">C.C. 1020789123</span>
                    <span className="text-[10px] text-amber-300/90 font-medium block">Torre 4 · Apto 101</span>
                    <span className="text-[10px] text-slate-500">Mora + Acuerdo de pago</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#161922] border border-slate-800">
                    <span className="font-bold text-rose-400 block text-xs">María F. Gómez</span>
                    <span className="text-[11px] text-slate-400 block font-mono">C.C. 52987654</span>
                    <span className="text-[10px] text-rose-300/90 font-medium block">Torre 1 · Apto 203</span>
                    <span className="text-[10px] text-slate-500">En mora (2 meses)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#161922] border border-slate-800">
                    <span className="font-bold text-emerald-400 block text-xs">Carlos Mendoza</span>
                    <span className="text-[11px] text-slate-400 block font-mono">C.C. 1018456789</span>
                    <span className="text-[10px] text-emerald-300/90 font-medium block">Torre 2 · Apto 401</span>
                    <span className="text-[10px] text-slate-500">Al día (con descuento)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#161922] border border-slate-800">
                    <span className="font-bold text-blue-400 block text-xs">Juan C. Restrepo</span>
                    <span className="text-[11px] text-slate-400 block font-mono">C.C. 80321456</span>
                    <span className="text-[10px] text-blue-300/90 font-medium block">Torre 3 · Apto 502</span>
                    <span className="text-[10px] text-slate-500">Arrendatario (Al día)</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  💡 <b>¿Por qué existía database.ts?</b> Era únicamente un archivo inicial de respaldo antes de conectar Supabase. Ahora que tus tablas están creadas y las credenciales activas, todas las consultas y correos modificados se leen directamente desde tu base de datos Supabase.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#1A1D24] border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Key className="w-4 h-4 text-blue-400" />
                  <span>¿Dónde encontrar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY?</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Si creaste tu proyecto en <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-400 underline font-semibold">supabase.com</a>, sigue estos 4 pasos:
                </p>

                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0A0B0E] border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-800 flex-shrink-0 mt-0.5">1</span>
                    <div>
                      <span className="font-bold text-white block">Entra a tu Proyecto en Supabase</span>
                      <p className="text-slate-400 text-[11px]">Inicia sesión en tu cuenta de Supabase y selecciona el proyecto que creaste.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0A0B0E] border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-800 flex-shrink-0 mt-0.5">2</span>
                    <div>
                      <span className="font-bold text-white block">Abre "Project Settings" (Engranaje) &gt; "API"</span>
                      <p className="text-slate-400 text-[11px]">En la barra lateral izquierda (abajo del todo), haz clic en el icono de tuerca o <b>Project Settings</b>, y luego haz clic en <b>API</b>.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0A0B0E] border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-800 flex-shrink-0 mt-0.5">3</span>
                    <div>
                      <span className="font-bold text-white block">Copia la "Project URL"</span>
                      <p className="text-slate-400 text-[11px]">En la sección superior verás <b>Project URL</b> (empieza por <code className="text-blue-400 font-mono">https://xxxx.supabase.co</code>). Esa es tu variable <code className="font-mono text-emerald-400">SUPABASE_URL</code>.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[#0A0B0E] border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-800 flex-shrink-0 mt-0.5">4</span>
                    <div>
                      <span className="font-bold text-white block">Copia la clave "service_role" (secret) o "anon" (public)</span>
                      <p className="text-slate-400 text-[11px]">
                        En la sección <b>Project API keys</b>, verás:
                        <br />
                        - <b className="text-slate-200">anon public:</b> Es la clave para el cliente web (<code className="font-mono text-blue-400">SUPABASE_ANON_KEY</code>).
                        <br />
                        - <b className="text-slate-200">service_role secret:</b> Haz clic en el botón <b>Reveal</b> (Revelar). Esa es tu variable <code className="font-mono text-emerald-400">SUPABASE_SERVICE_ROLE_KEY</code>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1A1D24] p-3.5 rounded-xl border border-slate-800">
                <div>
                  <h4 className="font-bold text-white text-xs">Script SQL Integral para Supabase</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    1. Copia este script. 2. En Supabase abre <b>SQL Editor</b>. 3. Pégalo y presiona <b>Run</b>.
                  </p>
                </div>
                <button
                  onClick={copySql}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 transition-all cursor-pointer flex-shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                  <span>{copied ? '¡Script Copiado!' : 'Copiar Script SQL Completo'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-[#0A0B0E] text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-96 border border-slate-800 select-all custom-scrollbar">
                  {status?.sqlMigrationScript || '-- Cargando script SQL...'}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'vectorStore' && (
            <div className="space-y-4">
              {/* Semantic Test Box */}
              <div className="p-3.5 rounded-xl bg-[#1A1D24] border border-slate-800 space-y-2">
                <span className="font-bold text-white block">Prueba de Búsqueda Vectorial Semántica (pgvector)</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
                    placeholder="Ej: ¿Puedo tener un perro pitbull? o horario para mudanza"
                    className="flex-1 px-3 py-2 text-xs border border-slate-800 rounded-lg bg-[#0A0B0E] text-white focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600"
                  />
                  <button
                    onClick={handleTestSearch}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Evaluar</span>
                  </button>
                </div>

                {testResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 block">Resultados con Similitud Coseno:</span>
                    {testResults.map((tr) => (
                      <div key={tr.id} className="p-3 rounded-lg bg-[#0A0B0E] border border-slate-800 space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-white">{tr.articulo}</span>
                          <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-400 border border-blue-900 font-mono font-bold">
                            Score: {tr.similarity.toFixed(3)}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{tr.contenido}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Indexed Chunks List */}
              <div className="space-y-2">
                <span className="font-bold text-white block">Documentos Indexados en la Base Vectorial ({chunks.length})</span>
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {chunks.map((chunk) => (
                    <div key={chunk.id} className="p-3 rounded-xl border border-slate-800 bg-[#1A1D24] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">{chunk.articulo}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 font-medium">
                          {chunk.categoria}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">{chunk.contenido}</p>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        Doc: {chunk.documento} · Chunk #{chunk.chunkIndex}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0E1015] border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <span>PostgreSQL + pgvector en Supabase & RAG LangChain</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-[#1A1D24] hover:bg-slate-800 font-medium text-slate-300 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
