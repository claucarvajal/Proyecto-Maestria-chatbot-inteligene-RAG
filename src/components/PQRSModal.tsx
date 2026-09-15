import React, { useState, useEffect } from 'react';
import { X, AlertCircle, PlusCircle, Clock, CheckCircle2, Sparkles, Send } from 'lucide-react';
import { Residente, PQRSTicket, Conjunto } from '../types/index.js';

interface PQRSModalProps {
  isOpen: boolean;
  onClose: () => void;
  residente: Residente | null;
  conjunto: Conjunto | null;
}

export const PQRSModal: React.FC<PQRSModalProps> = ({
  isOpen,
  onClose,
  residente,
  conjunto,
}) => {
  const [tickets, setTickets] = useState<PQRSTicket[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [categoria, setCategoria] = useState<PQRSTicket['categoria']>('Mantenimiento / Daños');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<PQRSTicket['prioridad']>('Media');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && residente) {
      fetchTickets();
      setFormError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, residente?.cedula, conjunto?.id]);

  const fetchTickets = async () => {
    if (!residente) return;
    try {
      const activeConjuntoId = conjunto?.id || residente.conjuntoId || 'conjunto-1';
      const res = await fetch(`/api/pqrs/${residente.cedula}?conjuntoId=${encodeURIComponent(activeConjuntoId)}`);
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.warn('Error cargando tickets:', err);
    }
  };

  if (!isOpen || !residente) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      setFormError('Por favor ingrese la descripción de la novedad.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/pqrs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conjuntoId: conjunto?.id || residente.conjuntoId || 'conjunto-1',
          cedula: residente.cedula,
          categoria,
          descripcion: descripcion.trim(),
          prioridad,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.ticket) {
        setTickets((prev) => [data.ticket, ...prev]);
        setDescripcion('');
        setShowNewForm(false);
        setSuccessMsg(`✅ Radicado exitoso: ${data.ticket.codigo} (Guardado en Supabase)`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        setFormError(data.error || 'No fue posible radicar el ticket. Intente nuevamente.');
      }
    } catch (err: any) {
      console.error('Error creando ticket:', err);
      setFormError('Error de comunicación con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#111318] rounded-2xl max-w-2xl w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-[#161922] border-b border-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Gestión y Radicación de PQRS</h3>
              <p className="text-xs text-slate-400">
                {conjunto?.nombre ? (
                  <span className="text-blue-400 font-medium">{conjunto.nombre}</span>
                ) : (
                  'Automatización de solicitudes'
                )} · Trazabilidad de SLA por copropiedad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-xs">
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Solicitudes Radicadas ({tickets.length})
            </h4>
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{showNewForm ? 'Ver Listado' : 'Radicar Nueva Novedad'}</span>
            </button>
          </div>

          {/* New Ticket Form */}
          {showNewForm && (
            <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-[#1A1D24] border border-slate-700/80 space-y-3">
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                  {formError}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Triaje y radicación con asignación de SLA</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Categoría</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-800 bg-[#0A0B0E] text-slate-200"
                  >
                    <option value="Mantenimiento / Daños">Mantenimiento / Daños (Fugas, Luces, Ascensor)</option>
                    <option value="Ruido y Convivencia">Ruido y Convivencia</option>
                    <option value="Expensas y Cartera">Expensas y Cartera</option>
                    <option value="Seguridad">Seguridad</option>
                    <option value="Mascotas">Mascotas</option>
                    <option value="Otro">Otro requerimiento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Urgencia / Prioridad</label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-800 bg-[#0A0B0E] text-slate-200"
                  >
                    <option value="Baja">Baja (SLA: 72 horas)</option>
                    <option value="Media">Media (SLA: 48 horas)</option>
                    <option value="Alta">Alta (SLA: 24 horas)</option>
                    <option value="Urgente">Urgente (SLA: 4 horas)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Descripción detallada</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalle la novedad técnica o de convivencia ocurrida..."
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-800 bg-[#0A0B0E] text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>{isSubmitting ? 'Radicando...' : 'Emitir Radicado'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Ticket list */}
          {tickets.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
              No tiene requerimientos radicados. También puede emitirlos directamente conversando con el chatbot RAG.
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-800 bg-[#1A1D24] hover:border-slate-700 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded text-[11px] border border-blue-900/40">
                        {t.codigo}
                      </span>
                      <span className="text-white font-semibold">{t.categoria}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        t.estado === 'Solucionado'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : t.estado === 'En Revisión'
                          ? 'bg-sky-950/80 text-sky-400 border border-sky-800/60'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                      }`}
                    >
                      {t.estado}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{t.descripcion}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        SLA: {t.slaHoras}h
                      </span>
                      <span>Prioridad: <b className="text-slate-300">{t.prioridad}</b></span>
                    </div>
                    <span className="font-mono">{t.fechaCreacion}</span>
                  </div>

                  {t.respuestaAdmin && (
                    <div className="mt-2 p-2.5 rounded-lg bg-[#111318] border border-emerald-900/40 text-emerald-300 text-[11px]">
                      <span className="font-bold block text-emerald-400">Respuesta de la Administración:</span>
                      {t.respuestaAdmin}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0E1015] border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <span>Regulado por tiempos de respuesta del Manual de Convivencia</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-[#1A1D24] hover:bg-slate-800 font-medium text-slate-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
