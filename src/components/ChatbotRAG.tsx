import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Database,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  CreditCard,
  Ticket,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { Residente, Conjunto, CarteraExpensas, RAGMessage, VectorChunk, Administrador } from '../types/index.js';

interface ChatbotRAGProps {
  residente: Residente | null;
  administrador?: Administrador | null;
  isAdmin?: boolean;
  conjunto: Conjunto | null;
  cartera: CarteraExpensas | null;
  onOpenCartera: () => void;
  onOpenPQRS: () => void;
  onOpenSupabase: () => void;
  onOpenLogin: (defaultRole?: 'RESIDENTE' | 'ADMIN') => void;
  onOpenDocuments?: () => void;
  initialQuery?: string | null;
  onClearInitialQuery?: () => void;
}

export const ChatbotRAG: React.FC<ChatbotRAGProps> = ({
  residente,
  administrador,
  isAdmin = false,
  conjunto,
  cartera,
  onOpenCartera,
  onOpenPQRS,
  onOpenSupabase,
  onOpenLogin,
  onOpenDocuments,
  initialQuery,
  onClearInitialQuery,
}) => {
  const [messages, setMessages] = useState<RAGMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [expandedTelemetry, setExpandedTelemetry] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Trigger query if passed from Document Ingestion Modal
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  // Initialize welcoming message when resident or administrator changes
  useEffect(() => {
    if (isAdmin && administrador) {
      setMessages([
        {
          id: `welcome-admin-${administrador.id}`,
          role: 'assistant',
          content:
            `Bienvenido(a) **${administrador.nombre}** (Administrador(a) Principal del **${conjunto?.nombre || 'la copropiedad'}**).\n\n` +
            `🛡️ **Credenciales de Administración Verificadas.** Tienes habilitado el acceso completo a la base normativa, consulta de la Ley 675 de 2001 y el **permiso exclusivo para subir e indexar nuevos reglamentos** a la base de datos de vectores pgvector.\n\n` +
            `¿Deseas consultar algún artículo reglamentario, verificar sanciones, o revisar la base de conocimientos?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intent: 'GENERAL',
        },
      ]);
      return;
    }

    if (!residente) {
      setMessages([
        {
          id: 'welcome-anon',
          role: 'assistant',
          content: `Bienvenido al sistema inteligente de gestión de propiedad horizontal con arquitectura RAG.\n\nPara acceder a consultas personalizadas sobre sus **expensas comunes, estado de mora, acuerdos o radicar solicitudes**, por favor autentíquese con su número de documento. Si es el **Administrador**, inicie sesión para habilitar la carga de reglamentos.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    const isAlDia = cartera?.estado === 'Al día';
    const isMora = cartera?.estado === 'En mora';

    const welcomeContent =
      `Bienvenido Sr(a). **${residente.nombre}**. He sincronizado su perfil con la base de datos de administración del **${conjunto?.nombre || 'conjunto'}**.\n\n` +
      `Usted se encuentra registrado en la unidad **${residente.torre} - ${residente.apto}** (Coeficiente: ${residente.alicuota}%).\n` +
      (isAlDia
        ? `✅ **Estado de Cartera:** Su cuenta se encuentra **Al día** para el periodo ${cartera?.mesPeriodo}. Valor cuota con descuento de pronto pago: **$${cartera?.totalPagar.toLocaleString('es-CO')} COP** (válido hasta el ${cartera?.fechaLimiteDescuento}).`
        : isMora
        ? `⚠️ **Estado de Cartera:** Su cuenta presenta **${cartera?.mesesMora} meses en mora** con un total adeudado de **$${cartera?.totalPagar.toLocaleString('es-CO')} COP** (incluyendo intereses moratorios tasados según el Art. 30 de la Ley 675).`
        : `📋 **Estado de Cartera:** Cuenta con un acuerdo de pago vigente por **$${cartera?.totalPagar.toLocaleString('es-CO')} COP**.`) +
      `\n\n¿En qué puedo asistirle hoy respecto al reglamento interno, horarios de mudanza, tenencia de mascotas o sus gastos comunes?`;

    setMessages([
      {
        id: `welcome-${residente.id}`,
        role: 'assistant',
        content: welcomeContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        financialData: cartera || undefined,
        intent: 'GENERAL',
      },
    ]);
  }, [residente, administrador, isAdmin, cartera, conjunto]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue.trim();
    if (!query || isSending) return;

    if (!residente && !administrador) {
      onOpenLogin();
      return;
    }

    const userMessage: RAGMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          cedula: residente?.cedula || '',
          conjuntoId: conjunto?.id || 'conjunto-1',
          history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const assistantMsg: RAGMessage = await response.json();
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error enviando consulta RAG:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Ocurrió una interrupción al conectar con el motor RAG de pgvector. Por favor verifique su conexión e intente nuevamente.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const toggleTelemetry = (msgId: string) => {
    setExpandedTelemetry((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const suggestionPills = [
    { label: '¿Cuál es mi saldo actual y tengo mora?', icon: CreditCard },
    { label: '¿Cuántas quejas o reclamos tengo radicados?', icon: Ticket },
    { label: '¿Qué normas y horarios rigen la piscina y el uso de gorro?', icon: BookOpen },
    { label: '¿Cuáles son las sanciones por ruido después de las 11 PM?', icon: BookOpen },
    { label: '¿Puedo tener mascota y qué requisitos hay?', icon: BookOpen },
    { label: '¿Cuáles son los horarios de mudanza y depósito?', icon: Clock },
    { label: '¿Cómo reservo el salón social o el BBQ?', icon: HelpCircle },
    { label: 'Reportar fuga de agua en mi pasillo', icon: AlertTriangle },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 lg:p-8 space-y-4 max-w-5xl mx-auto w-full">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 sm:pr-4 custom-scrollbar">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isExpanded = Boolean(expandedTelemetry[msg.id]);
          const topChunk = msg.chunks && msg.chunks.length > 0 ? msg.chunks[0] : null;

          return (
            <div
              key={msg.id}
              className={`flex space-x-3 sm:space-x-4 max-w-[92%] sm:max-w-[85%] ${
                isUser ? 'self-end ml-auto flex-row-reverse space-x-reverse' : ''
              } animate-in fade-in duration-200`}
            >
              {/* Avatar */}
              {!isUser ? (
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-700">
                  AI
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-blue-900/30">
                  {residente ? residente.nombre.slice(0, 2).toUpperCase() : 'US'}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-3 ${
                  isUser
                    ? 'bg-blue-600 rounded-tr-none text-white shadow-lg shadow-blue-900/20'
                    : 'bg-[#1A1D24] rounded-tl-none border border-slate-800 text-slate-200 shadow-sm'
                }`}
              >
                {/* Semantic search grounding badge for AI */}
                {!isUser && topChunk && (
                  <div className="flex items-center space-x-2 text-[10px] text-blue-400 font-mono bg-blue-950/40 px-2.5 py-1 rounded-md w-fit border border-blue-800/40">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                    <span>
                      RAG: Búsqueda Semántica en {topChunk.documento} (Similitud: {topChunk.similarity.toFixed(3)})
                    </span>
                  </div>
                )}

                {/* Body Content */}
                <div className="whitespace-pre-wrap space-y-2">
                  {msg.content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="leading-relaxed">
                      {renderFormattedText(paragraph, isUser)}
                    </p>
                  ))}
                </div>

                {/* Intent Action Buttons if relevant */}
                {!isUser && (msg.financialData || msg.ticketData || msg.ticketsList) && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                    {msg.financialData && (
                      <button
                        onClick={onOpenCartera}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#111318] hover:bg-slate-800 text-sky-400 border border-slate-700/60 font-medium transition-colors text-[11px]"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Ver Liquidación Detallada</span>
                      </button>
                    )}
                    {msg.ticketData && (
                      <button
                        onClick={onOpenPQRS}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#111318] hover:bg-slate-800 text-amber-400 border border-slate-700/60 font-medium transition-colors text-[11px]"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Seguimiento Ticket {msg.ticketData.codigo}</span>
                      </button>
                    )}
                    {msg.ticketsList && (
                      <button
                        onClick={onOpenPQRS}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#111318] hover:bg-slate-800 text-purple-400 border border-purple-800/60 font-medium transition-colors text-[11px]"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Consultar Bandeja PQRS ({msg.ticketsList.length})</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Source & Telemetry Footer in Assistant Bubble */}
                {!isUser && (
                  <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                    <div className="flex items-center space-x-3">
                      {topChunk && (
                        <span className="flex items-center">
                          <span className="mr-1 text-slate-400">Fuente:</span>
                          <span className="text-slate-300 font-medium">{topChunk.articulo}</span>
                        </span>
                      )}
                      {msg.latency && (
                        <span className="flex items-center font-mono">
                          <span className="mr-1 text-slate-400">Latencia RAG:</span>
                          <span className="text-blue-400">{msg.latency.totalMs}ms</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {msg.latency && (
                        <button
                          onClick={() => toggleTelemetry(msg.id)}
                          className="text-slate-400 hover:text-white transition-colors flex items-center space-x-1 font-mono"
                        >
                          <span>{isExpanded ? 'Ocultar Métricas' : 'Ver Métricas'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                      <span className="text-slate-500 font-mono">{msg.timestamp}</span>
                    </div>
                  </div>
                )}

                {/* Telemetry Drawer */}
                {!isUser && isExpanded && msg.latency && (
                  <div className="p-3 rounded-xl bg-[#0A0B0E] text-slate-300 font-mono text-[10px] space-y-1.5 border border-slate-800 animate-in fade-in duration-150">
                    <div className="flex justify-between text-blue-400 font-bold border-b border-slate-800 pb-1">
                      <span>DESGLOSE PIPELINE RAG (MAESTRÍA)</span>
                      <span>{msg.latency.totalMs} ms</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="bg-[#111318] p-1.5 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[9px]">Embedding</span>
                        <span className="text-emerald-400 font-bold">{msg.latency.embeddingMs} ms</span>
                      </div>
                      <div className="bg-[#111318] p-1.5 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[9px]">pgvector Query</span>
                        <span className="text-emerald-400 font-bold">{msg.latency.vectorSearchMs} ms</span>
                      </div>
                      <div className="bg-[#111318] p-1.5 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[9px]">Gemini 3.8 Flash</span>
                        <span className="text-blue-400 font-bold">{msg.latency.llmInferenceMs} ms</span>
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-400 pt-1 flex justify-between">
                      <span>Herramienta: <b className="text-white">{msg.toolUsed || 'RAG Grounding'}</b></span>
                      <span>Confianza: <b className="text-emerald-400">{((msg.ragConfidence || 0.88) * 100).toFixed(1)}%</b></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex space-x-3 sm:space-x-4 items-center animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-700">
              AI
            </div>
            <div className="p-4 rounded-2xl rounded-tl-none bg-[#1A1D24] border border-slate-800 flex items-center space-x-2.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span>Recuperando vectores en pgvector y consultando Gemini 3.8...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Question Chips */}
      <div className="overflow-x-auto flex gap-2 pb-1 no-scrollbar flex-shrink-0 items-center">
        {onOpenDocuments && isAdmin && (
          <button
            onClick={onOpenDocuments}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-950/50 hover:bg-amber-950/80 text-amber-300 hover:text-amber-200 border border-amber-800/60 transition-colors whitespace-nowrap shadow-xs flex-shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Subir Reglamento RAG (Admin)</span>
          </button>
        )}
        {suggestionPills.map((pill, idx) => {
          const Icon = pill.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSendMessage(pill.label)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#111318] hover:bg-[#1A1D24] hover:border-slate-700 text-slate-300 hover:text-white border border-slate-800/80 transition-colors whitespace-nowrap shadow-xs flex-shrink-0"
            >
              <Icon className="w-3.5 h-3.5 text-blue-400" />
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input Form matching Sophisticated Dark Spec */}
      <div className="relative flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              residente
                ? 'Consulte sobre reglamentos, gastos comunes, mora o radicación de novedades...'
                : 'Identifíquese con su cédula para consultar información personalizada...'
            }
            className="w-full bg-[#111318] border border-slate-800 rounded-2xl py-3.5 sm:py-4 px-6 pr-16 focus:outline-hidden focus:border-blue-500/50 transition-all text-xs sm:text-sm shadow-2xl text-slate-100 placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending}
            className="absolute right-3 top-2 sm:top-2.5 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-500 disabled:opacity-40 transition-colors shadow-lg shadow-blue-900/30 cursor-pointer"
            title="Enviar consulta"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Technical footer status badges */}
        <div className="flex items-center justify-center mt-3 space-x-6 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>pgvector sync: active</span>
          </div>
          <div className="flex items-center space-x-1.5 hidden sm:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            <span>LangChain Memory: BufferWindow</span>
          </div>
          <div className="flex items-center space-x-1.5 hidden md:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>LLM: Gemini 3.8 Flash</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function renderFormattedText(text: string, isUser: boolean) {
  const parts = text.split(/(\*\*.*?\*\*|\`.*?\`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={index}
          className={isUser ? 'font-bold text-white' : 'font-bold text-white'}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className={`px-1 py-0.5 rounded font-mono text-[11px] ${
            isUser ? 'bg-blue-700 text-white' : 'bg-slate-800 text-blue-400 border border-slate-700'
          }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
