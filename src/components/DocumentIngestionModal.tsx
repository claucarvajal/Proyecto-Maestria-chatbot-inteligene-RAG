import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  RefreshCw,
  Eye,
  FileCode2,
  X,
  Plus,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  Lock,
  ShieldCheck,
  Shield,
  UserCheck,
  Building2,
} from 'lucide-react';
import { DocumentoConjuntoPadre, VectorChunk, Administrador, Conjunto } from '../types';
import { DEMO_CONJUNTOS } from '../data/mockData';

interface DocumentIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conjuntoId: string;
  isAdmin?: boolean;
  adminInfo?: Administrador | null;
  onOpenLoginAsAdmin?: () => void;
  onSelectSampleQuestion?: (question: string) => void;
}

export const DocumentIngestionModal: React.FC<DocumentIngestionModalProps> = ({
  isOpen,
  onClose,
  conjuntoId,
  isAdmin = false,
  adminInfo = null,
  onOpenLoginAsAdmin,
  onSelectSampleQuestion,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'list' | 'architecture'>('upload');
  const [documents, setDocuments] = useState<DocumentoConjuntoPadre[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentoConjuntoPadre | null>(null);
  const [previewChunks, setPreviewChunks] = useState<VectorChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Target conjunto state for assigning the regulation
  const [targetConjuntoId, setTargetConjuntoId] = useState<string>(conjuntoId || 'conjunto-1');
  const [conjuntosList, setConjuntosList] = useState<Conjunto[]>(DEMO_CONJUNTOS);
  const [filterListConjuntoId, setFilterListConjuntoId] = useState<string>('all');

  // Form State
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<'Reglamento Interno' | 'Manual de Convivencia' | 'Zonas Comunes' | 'Expensas y Finanzas'>('Reglamento Interno');
  const [descripcion, setDescripcion] = useState('');
  const [contenidoCompleto, setContenidoCompleto] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [ingestionResult, setIngestionResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load parent documents
  const loadDocuments = async (filterId?: string) => {
    setLoadingDocs(true);
    try {
      const activeFilter = filterId !== undefined ? filterId : filterListConjuntoId;
      const url = activeFilter && activeFilter !== 'all'
        ? `/api/documents/list?conjuntoId=${encodeURIComponent(activeFilter)}`
        : `/api/documents/list?conjuntoId=all`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.documents) {
        setDocuments(data.documents);
      }
    } catch (e) {
      console.error('Error cargando documentos padre:', e);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTargetConjuntoId(conjuntoId || 'conjunto-1');
      fetch('/api/conjuntos')
        .then((r) => r.json())
        .then((d) => {
          if (d.conjuntos && d.conjuntos.length > 0) {
            setConjuntosList(d.conjuntos);
          }
        })
        .catch(() => {});
      loadDocuments();
      setIngestionResult(null);
      setErrorMsg(null);
    }
  }, [isOpen, conjuntoId]);

  // Load sample full regulation text
  const handleLoadSampleText = async () => {
    try {
      const res = await fetch('/api/documents/sample-text');
      const data = await res.json();
      setTitulo(data.titulo);
      setCategoria(data.categoria as any);
      setDescripcion(data.descripcion);
      setContenidoCompleto(data.text);
      setErrorMsg(null);
    } catch (e) {
      console.error('Error cargando muestra:', e);
    }
  };

  // Handle file drop or selection (.txt, .md)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContenidoCompleto(text);
      if (!titulo) {
        setTitulo(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    };
    reader.readAsText(file);
  };

  // Execute ingestion process
  const handleIngest = async () => {
    if (!isAdmin) {
      setErrorMsg('Acceso Denegado: Solo el Administrador de la copropiedad tiene permisos autorizados para subir o indexar reglamentos.');
      return;
    }

    if (!titulo.trim() || !contenidoCompleto.trim()) {
      setErrorMsg('Por favor indica el título y el contenido completo del reglamento.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setIngestionResult(null);
    setCurrentStep(1); // Step 1: Analizando y estructurando documento padre

    try {
      // Step 2: Particionamiento inteligente
      setTimeout(() => setCurrentStep(2), 600);
      // Step 3: Generación de embeddings con Gemini
      setTimeout(() => setCurrentStep(3), 1200);

      const res = await fetch('/api/documents/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conjuntoId: targetConjuntoId,
          titulo,
          categoria,
          descripcion,
          contenidoCompleto,
          userRole: 'ADMIN',
          adminEmail: adminInfo?.email,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || 'Error al procesar el documento');
      }

      setCurrentStep(4); // Guardado e indexación completa
      setIngestionResult(data);
      await loadDocuments();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error durante la vectorización e ingesta');
    } finally {
      setIsProcessing(false);
    }
  };

  // Preview chunks for a selected document
  const handleViewDocChunks = async (doc: DocumentoConjuntoPadre) => {
    setSelectedDocForPreview(doc);
    setLoadingChunks(true);
    try {
      const docConjunto = doc.conjuntoId || targetConjuntoId || conjuntoId;
      const res = await fetch(`/api/documents/chunks?titulo=${encodeURIComponent(doc.titulo)}&conjuntoId=${encodeURIComponent(docConjunto)}`);
      const data = await res.json();
      setPreviewChunks(data.chunks || []);
    } catch (e) {
      console.error('Error cargando fragmentos:', e);
      setPreviewChunks([]);
    } finally {
      setLoadingChunks(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0F1117] border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#141824]/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Gestor de Reglamentos y Documentos RAG</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Embeddings IA (768d)
                </span>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    Admin: {adminInfo?.nombre?.split(' ')[0] || 'Autorizado'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800/90 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Solo Administrador
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Arquitectura Relacional Padre-Hija (Documento Completo ➔ Particionado Automático ➔ pgvector)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-header Navigation Tabs */}
        <div className="flex items-center px-5 pt-2 border-b border-slate-800 bg-[#0A0C10]/40 text-xs font-medium space-x-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-2 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Subir y Particionar Reglamento</span>
            {!isAdmin && (
              <span className="text-[9px] px-1 py-0.2 bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded font-mono">
                Solo Admin
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3.5 py-2 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Documentos Indexados ({documents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3.5 py-2 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'architecture'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Arquitectura Padre-Hija (Explicación)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: UPLOAD & INGEST */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Educational Banner */}
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-800/40 text-xs text-blue-300 flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-white block">¿Cómo funciona la ingesta real de un reglamento?</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Tú <b>NO necesitas dividir el documento a mano</b>. Subes o pegas el texto completo del reglamento; el servidor lo guarda intacto en la tabla padre <code className="text-blue-300 bg-blue-900/40 px-1 py-0.5 rounded">documentos_conjunto</code>, un algoritmo semántico lo fragmenta por artículos con solapamiento (*overlap*), y la API de Gemini calcula los vectores de 768 dimensiones para guardarlos en <code className="text-blue-300 bg-blue-900/40 px-1 py-0.5 rounded">documents_embeddings</code>.
                  </p>
                </div>
              </div>

              {/* Admin Exclusive Permission Banner */}
              {!isAdmin ? (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Acceso Restringido: Carga Exclusiva para el Administrador</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-900/60 border border-amber-700 text-amber-300 text-[10px] font-mono font-bold">
                      SOLO ADMIN
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Por normatividad legal de Propiedad Horizontal (Ley 675) y control de versiones, <b>únicamente el Administrador de la copropiedad</b> tiene autorización para cargar nuevos reglamentos, actas de asamblea y manuales de convivencia a la base de datos de embeddings.
                  </p>
                  {onOpenLoginAsAdmin && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenLoginAsAdmin();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Iniciar Sesión como Administrador para Cargar</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-600/40 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <b>Permiso Concedido:</b> Sesión activa como <b>{adminInfo?.nombre || 'Administrador(a) P.H.'}</b>. Puedes subir e indexar nuevos documentos reglamentarios.
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-700 text-emerald-200 text-[10px] font-mono font-bold shrink-0 ml-2">
                    ROL: ADMIN
                  </span>
                </div>
              )}

              {/* Ingestion Form */}
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>Asignar a Copropiedad (Conjunto de Destino) *</span>
                  </label>
                  <span className="text-[10px] text-blue-300 font-mono">Partición RAG Aislada</span>
                </div>
                <select
                  value={targetConjuntoId}
                  onChange={(e) => setTargetConjuntoId(e.target.value)}
                  className="w-full bg-[#161922] border border-blue-500/40 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400 font-medium cursor-pointer"
                >
                  {conjuntosList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.ciudad}) — NIT {c.nit}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  El reglamento y sus fragmentos vectorizados se guardarán asignados a esta copropiedad, de modo que sus residentes solo consulten la normativa de su propio conjunto.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Título del Documento *</label>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej: Reglamento Interno de Propiedad Horizontal 2026"
                    className="w-full bg-[#161922] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Categoría Normativa</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    className="w-full bg-[#161922] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Reglamento Interno">Reglamento Interno</option>
                    <option value="Manual de Convivencia">Manual de Convivencia</option>
                    <option value="Zonas Comunes">Zonas Comunes (Piscina, BBQ, Salón)</option>
                    <option value="Expensas y Finanzas">Expensas, Descuentos y Cartera</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Descripción o Versión (Opcional)</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Aprobado en Asamblea General Ordinaria marzo 2026"
                  className="w-full bg-[#161922] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Textarea or File input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <span>Texto Completo del Reglamento *</span>
                    <span className="text-[10px] text-slate-500 font-normal">({contenidoCompleto.length} caracteres)</span>
                  </label>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleLoadSampleText}
                      className="px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-800/40 rounded-lg transition-colors flex items-center space-x-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Cargar Ejemplo Completo (10 Artículos)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 bg-blue-950/30 hover:bg-blue-950/50 border border-blue-800/40 rounded-lg transition-colors flex items-center space-x-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Cargar archivo .txt / .md</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".txt,.md,.text"
                      className="hidden"
                    />
                  </div>
                </div>

                <textarea
                  value={contenidoCompleto}
                  onChange={(e) => setContenidoCompleto(e.target.value)}
                  rows={9}
                  placeholder="Pega aquí el contenido completo del reglamento, manual de convivencia o acta (puede tener múltiples artículos, capítulos o párrafos)..."
                  className="w-full bg-[#161922] border border-slate-800 rounded-lg p-3 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Live Ingestion Steps Tracker (When processing) */}
              {isProcessing && (
                <div className="p-4 rounded-xl bg-[#141824] border border-blue-500/30 space-y-3 animate-pulse">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                      <span>Procesando Ingesta y Vectorización con Gemini...</span>
                    </span>
                    <span className="text-[10px] text-blue-400 font-mono">Paso {currentStep} de 4</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>1. Creando registro en tabla padre <code className="font-mono text-[10px]">documentos_conjunto</code></span>
                    </div>
                    <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>2. Particionamiento inteligente por Artículos con solapamiento semántico</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>3. Generando vectores numéricos de 768 dimensiones con Gemini Embeddings</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${currentStep >= 4 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>4. Insertando fragmentos vectorizados en Supabase <code className="font-mono text-[10px]">documents_embeddings</code></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Ingestion Result Success Banner */}
              {ingestionResult && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span className="font-bold text-sm text-white">¡Reglamento Procesado e Indexado con Éxito!</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {ingestionResult.totalChunks} Chunks Creados
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    {ingestionResult.message}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <span className="text-slate-400 block">Modelo de Embeddings:</span>
                      <span className="text-blue-300 font-mono font-medium">{ingestionResult.modelUsed}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <span className="text-slate-400 block">Sincronización Supabase:</span>
                      <span className="text-emerald-400 font-semibold">
                        {ingestionResult.supabaseSynced ? '✅ Almacenado en PostgreSQL pgvector' : '💾 Guardado en motor RAG activo'}
                      </span>
                    </div>
                  </div>

                  {/* Chunks preview */}
                  {ingestionResult.chunksCreated && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-bold text-slate-300 block">Fragmentos generados en la base vectorial:</span>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {ingestionResult.chunksCreated.map((c: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-[#161922] border border-slate-800 text-[10px] flex items-center justify-between">
                            <div className="truncate mr-2">
                              <span className="text-emerald-400 font-semibold mr-2">#{c.chunkIndex}</span>
                              <span className="text-white font-medium">{c.articulo}</span>
                              <span className="text-slate-400 block text-[9px] truncate">{c.preview}</span>
                            </div>
                            <span className="text-blue-400 font-mono text-[9px] shrink-0">Vector 768d ✓</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Immediate Test Button */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onSelectSampleQuestion) {
                          onSelectSampleQuestion(`¿Qué establece el nuevo reglamento "${titulo}" sobre los horarios y normas principales?`);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow-lg shadow-blue-500/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Probar Pregunta Inmediata en el Chat</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('list')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                    >
                      Ver Todos los Documentos
                    </button>
                  </div>
                </div>
              )}

              {/* Action Button */}
              {!ingestionResult && (
                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Cancelar
                  </button>

                  {!isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenLoginAsAdmin) {
                          onClose();
                          onOpenLoginAsAdmin();
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-900/40 flex items-center space-x-2 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-200" />
                      <span>Ingresar como Administrador para Subir</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isProcessing || !titulo.trim() || !contenidoCompleto.trim()}
                      onClick={handleIngest}
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center space-x-2 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generando Embeddings con Gemini...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Iniciar Particionado y Generar Embeddings</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOCUMENT LIST & CHUNKS */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141824] p-3 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Documentos Padre en la Base de Datos</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Reglamentos almacenados con sus respectivos fragmentos vectorizados por copropiedad.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={filterListConjuntoId}
                    onChange={(e) => {
                      const newFilter = e.target.value;
                      setFilterListConjuntoId(newFilter);
                      loadDocuments(newFilter);
                    }}
                    className="bg-[#1A1D24] border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">🌐 Todas las copropiedades</option>
                    {conjuntosList.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => loadDocuments()}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors border border-slate-700"
                    title="Recargar lista"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingDocs ? (
                <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  <span>Cargando documentos registrados...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">No hay documentos registrados para esta copropiedad aún.</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    Subir el primer reglamento
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const assignedConj = conjuntosList.find((c) => c.id === doc.conjuntoId);
                    return (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-xl bg-[#141824] border border-slate-800 hover:border-slate-700 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-xs">{doc.titulo}</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-950/60 text-blue-300 border border-blue-800/60">
                                <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                                <span>{assignedConj ? assignedConj.nombre : (doc.conjuntoId || 'General')}</span>
                              </span>
                            </div>
                            <span className="text-[11px] text-blue-400 font-medium block">{doc.categoria}</span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {doc.totalChunks} Chunks vectorizados
                            </span>
                            <button
                              onClick={() => handleViewDocChunks(doc)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium flex items-center space-x-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver Chunks</span>
                            </button>
                          </div>
                        </div>

                        {doc.descripcion && (
                          <p className="text-[11px] text-slate-400">{doc.descripcion}</p>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                          <span>ID: <code className="font-mono text-slate-400">{doc.id}</code></span>
                          <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '2026-09-08'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Chunks Inspector Drawer / Modal */}
              {selectedDocForPreview && (
                <div className="p-4 rounded-xl bg-[#0B0D12] border border-blue-500/40 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">Fragmentos Vectoriales (pgvector):</span>
                      <span className="text-[11px] text-blue-400 block truncate">{selectedDocForPreview.titulo}</span>
                    </div>
                    <button
                      onClick={() => setSelectedDocForPreview(null)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Cerrar vista previa
                    </button>
                  </div>

                  {loadingChunks ? (
                    <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      <span>Cargando fragmentos desde la base de datos...</span>
                    </div>
                  ) : previewChunks.length === 0 ? (
                    <p className="text-xs text-slate-500">No se encontraron fragmentos asociados.</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {previewChunks.map((chunk, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-[#141824] border border-slate-800 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-emerald-400">
                              Chunk #{chunk.chunkIndex}: {chunk.articulo}
                            </span>
                            <span className="text-[10px] text-blue-400 font-mono">
                              Vector (768d) ✓
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                            {chunk.contenido}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ARCHITECTURE EXPLANATION */}
          {activeTab === 'architecture' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <span className="font-bold text-white text-sm block">Arquitectura RAG Relacional (Padre - Hija)</span>
                <p className="text-slate-300 text-xs leading-relaxed">
                  En un sistema de inteligencia artificial profesional, <b>ningún humano divide los documentos a mano</b>. Se implementa un modelo relacional en PostgreSQL donde el documento original se preserva íntegro y el sistema genera automáticamente sus representaciones vectoriales.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Parent Table */}
                <div className="p-3.5 rounded-xl bg-[#141824] border border-blue-500/30 space-y-2">
                  <div className="flex items-center space-x-2 text-blue-400">
                    <Database className="w-4 h-4" />
                    <span className="font-bold text-white text-xs">1. Tabla PADRE: documentos_conjunto</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Guarda el documento completo original tal como lo expide la administración o asamblea:
                  </p>
                  <ul className="text-[10px] text-slate-300 font-mono space-y-1 list-disc list-inside">
                    <li><b className="text-white">id:</b> UUID / Text clave primaria</li>
                    <li><b className="text-white">titulo:</b> Nombre del reglamento</li>
                    <li><b className="text-white">categoria:</b> Convivencia, Finanzas, Zonas</li>
                    <li><b className="text-white">contenido_completo:</b> Texto íntegro original</li>
                    <li><b className="text-white">total_chunks:</b> Cantidad de fragmentos</li>
                  </ul>
                </div>

                {/* Child Table */}
                <div className="p-3.5 rounded-xl bg-[#141824] border border-emerald-500/30 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <Layers className="w-4 h-4" />
                    <span className="font-bold text-white text-xs">2. Tabla HIJA: documents_embeddings</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Guarda los fragmentos semánticos con sus vectores para la búsqueda matemática de similitud coseno:
                  </p>
                  <ul className="text-[10px] text-slate-300 font-mono space-y-1 list-disc list-inside">
                    <li><b className="text-white">documento_id:</b> Clave foránea a la tabla padre</li>
                    <li><b className="text-white">articulo:</b> Título del artículo extraído</li>
                    <li><b className="text-white">contenido:</b> Fragmento de ~900 caracteres</li>
                    <li><b className="text-white">embedding:</b> Vector de 768 dimensiones</li>
                    <li><b className="text-white">HNSW Index:</b> Búsqueda en milisegundos</li>
                  </ul>
                </div>
              </div>

              {/* Flow diagram */}
              <div className="p-3 rounded-xl bg-[#0A0C10] border border-slate-800 space-y-2 font-mono text-[11px]">
                <span className="text-slate-400 font-bold block">Flujo de Ejecución en Cada Pregunta del Usuario:</span>
                <div className="text-slate-300 space-y-1 leading-relaxed">
                  <p className="text-blue-400">1. Usuario pregunta: "¿Hasta qué hora se puede hacer fiesta un sábado?"</p>
                  <p className="text-purple-400">2. Gemini Embedding convierte la pregunta en un vector de 768 dimensiones.</p>
                  <p className="text-emerald-400">3. Supabase ejecuta <code className="text-white">match_documents()</code> comparando ángulos (similitud coseno) en milisegundos.</p>
                  <p className="text-amber-400">4. Recupera los 3 artículos más afines del reglamento.</p>
                  <p className="text-slate-200">5. Gemini 3.8 Flash redacta la respuesta citando el artículo exacto del reglamento.</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#141824]/40 flex items-center justify-between text-xs text-slate-400">
          <span>Base de datos: <b className="text-white">Supabase PostgreSQL + pgvector</b></span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
