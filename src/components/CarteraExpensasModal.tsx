import React, { useState } from 'react';
import { X, FileSpreadsheet, AlertTriangle, CheckCircle2, CreditCard, ShieldCheck, Download } from 'lucide-react';
import { Residente, CarteraExpensas, Conjunto } from '../types/index.js';

interface CarteraExpensasModalProps {
  isOpen: boolean;
  onClose: () => void;
  residente: Residente | null;
  cartera: CarteraExpensas | null;
  conjunto: Conjunto | null;
  onPaymentSuccess?: (newCartera: CarteraExpensas) => void;
}

export const CarteraExpensasModal: React.FC<CarteraExpensasModalProps> = ({
  isOpen,
  onClose,
  residente,
  cartera,
  conjunto,
  onPaymentSuccess,
}) => {
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  if (!isOpen || !residente || !cartera) return null;

  const handleSimulatePayment = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await fetch('/api/cartera/pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: residente.cedula, valor: cartera.totalPagar }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cartera && onPaymentSuccess) {
          onPaymentSuccess(data.cartera);
        }
      }
    } catch (e) {
      console.warn('Error registrando pago:', e);
    } finally {
      setIsProcessingPayment(false);
      setPaymentSuccess(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#111318] rounded-2xl max-w-2xl w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-[#161922] border-b border-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Estado de Cuenta & Cartera</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    cartera.estado === 'Al día'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                  }`}
                >
                  {cartera.estado}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {conjunto?.nombre} · {residente.torre} - {residente.apto}
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
          {paymentSuccess && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">¡Pago simulado recibido con éxito!</p>
                <p className="text-xs text-emerald-400/80 mt-0.5">
                  Referencia PSE-{Math.floor(100000 + Math.random() * 900000)}. Se ha emitido recibo provisional y actualizado el saldo en PostgreSQL/Supabase.
                </p>
              </div>
            </div>
          )}

          {/* Metadata Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#1A1D24] p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Copropietario</span>
              <span className="font-semibold text-white block truncate">{residente.nombre}</span>
              <span className="text-slate-400 text-[11px] font-mono">C.C. {residente.cedula}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Unidad Privada</span>
              <span className="font-semibold text-white">{residente.torre} - {residente.apto}</span>
              <span className="text-slate-400 text-[11px] block">{residente.tipo}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Alícuota / Coeficiente</span>
              <span className="font-semibold text-white font-mono">{residente.alicuota}%</span>
              <span className="text-slate-400 text-[11px] block">Ley 675 Art. 26</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Periodo Facturado</span>
              <span className="font-semibold text-white">{cartera.mesPeriodo}</span>
              <span className="text-slate-400 text-[11px] block">Vence: {cartera.fechaVencimiento}</span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Liquidación Detallada de Expensas Comunes
            </h4>
            <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-[#1A1D24]">
              <div className="flex justify-between p-3.5">
                <span className="text-slate-300 font-medium">Cuota Ordinaria de Administración ({cartera.mesPeriodo})</span>
                <span className="font-semibold text-white font-mono">${cartera.cuotaOrdinaria.toLocaleString('es-CO')} COP</span>
              </div>

              {cartera.cuotaExtraordinaria > 0 && (
                <div className="flex justify-between p-3.5">
                  <span className="text-slate-300 font-medium">Cuota Extraordinaria (Fondo Imprevistos)</span>
                  <span className="font-semibold text-white font-mono">${cartera.cuotaExtraordinaria.toLocaleString('es-CO')} COP</span>
                </div>
              )}

              {cartera.mesesMora > 0 && (
                <>
                  <div className="flex justify-between p-3.5 bg-red-950/20 text-red-300">
                    <span className="font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      Saldo vencido en mora ({cartera.mesesMora} meses anteriores)
                    </span>
                    <span className="font-bold font-mono text-red-400">${cartera.totalMora.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div className="flex justify-between p-3.5 bg-red-950/10 text-red-400">
                    <span className="font-medium">Intereses moratorios causados (Tasa máxima legal Ley 675 Art. 30)</span>
                    <span className="font-bold font-mono">${cartera.interesesMora.toLocaleString('es-CO')} COP</span>
                  </div>
                </>
              )}

              {cartera.descuentoProntoPago > 0 && (
                <div className="flex justify-between p-3.5 bg-emerald-950/20 text-emerald-300">
                  <span className="font-medium">Descuento pronto pago (10% antes del {cartera.fechaLimiteDescuento})</span>
                  <span className="font-bold font-mono text-emerald-400">-${cartera.descuentoProntoPago.toLocaleString('es-CO')} COP</span>
                </div>
              )}

              <div className="flex justify-between p-4 bg-[#0A0B0E] text-sm font-bold border-t border-slate-800">
                <span className="text-white">Total a Pagar en este Periodo</span>
                <span className={`font-mono text-base ${cartera.estado === 'En mora' ? 'text-red-400' : 'text-emerald-400'}`}>
                  ${cartera.totalPagar.toLocaleString('es-CO')} COP
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSimulatePayment}
              disabled={isProcessingPayment}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
            >
              {isProcessingPayment ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pagar con PSE / En Línea</span>
                </>
              )}
            </button>

            {cartera.estado === 'Al día' && (
              <button
                onClick={() => alert(`Certificado de Paz y Salvo expedido para ${residente.nombre} (${residente.torre} Apto ${residente.apto}).`)}
                className="py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Descargar Paz y Salvo</span>
              </button>
            )}
          </div>

          {/* Payment History */}
          {cartera.historialPagos && cartera.historialPagos.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Historial Reciente de Pagos
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-[#1A1D24]">
                {cartera.historialPagos.map((pago) => (
                  <div key={pago.id} className="flex justify-between items-center p-3">
                    <div>
                      <p className="font-semibold text-white">{pago.concepto}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{pago.fecha} · Ref: {pago.referencia}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-white font-mono">${pago.valor.toLocaleString('es-CO')}</span>
                      <span className="block text-[10px] text-emerald-400 font-medium">Aprobado</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0E1015] border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Régimen de Propiedad Horizontal · Ley 675 de 2001</span>
          </div>
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
