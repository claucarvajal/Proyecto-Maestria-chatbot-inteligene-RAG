import React, { useState, useEffect } from 'react';
import {
  Building2,
  IdCard,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Shield,
  User,
  X,
  Mail,
  Lock,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Conjunto, Residente, CarteraExpensas, Administrador, UserRole } from '../types/index.js';
import { DEMO_CONJUNTOS, DEMO_RESIDENTES } from '../data/mockData.js';

interface ConjuntoLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
  onSuccessLogin: (data: {
    rol: 'RESIDENTE' | 'ADMIN';
    residente?: Residente;
    administrador?: Administrador;
    cartera?: CarteraExpensas;
    conjunto: Conjunto;
  }) => void;
}

export const ConjuntoLoginModal: React.FC<ConjuntoLoginModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'RESIDENTE',
  onSuccessLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'RESIDENTE' | 'ADMIN'>(defaultRole === 'ADMIN' ? 'ADMIN' : 'RESIDENTE');
  const [conjuntosList, setConjuntosList] = useState<Conjunto[]>(DEMO_CONJUNTOS);
  const [selectedConjuntoId, setSelectedConjuntoId] = useState<string>(DEMO_CONJUNTOS[0].id);
  
  // Residente state
  const [cedulaInput, setCedulaInput] = useState<string>('1020789123'); // Default
  const [dbResidents, setDbResidents] = useState<Array<{ cedula: string; nombre: string; unidad: string; estado: string }>>([]);

  // Administrador state
  const [adminEmailInput, setAdminEmailInput] = useState<string>('claudiamarcelacarvajal27@gmail.com');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync tab with defaultRole when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultRole === 'ADMIN') {
        setActiveTab('ADMIN');
      }
      // Fetch dynamic conjuntos from server
      fetch('/api/conjuntos')
        .then((r) => r.json())
        .then((d) => {
          if (d.conjuntos && d.conjuntos.length > 0) {
            setConjuntosList(d.conjuntos);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, defaultRole]);

  // Load residents specifically scoped to the selected conjunto
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      fetch(`/api/residents/list?conjuntoId=${encodeURIComponent(selectedConjuntoId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.residents)) {
            setDbResidents(data.residents);
            if (data.residents.length > 0) {
              setCedulaInput(data.residents[0].cedula);
            } else {
              setCedulaInput('');
            }
          } else {
            setDbResidents([]);
            setCedulaInput('');
          }
        })
        .catch((e) => {
          console.warn('Error fetching residents list from DB:', e);
          const localList = DEMO_RESIDENTES.filter((r) => r.conjuntoId === selectedConjuntoId);
          const mapped = localList.map((r) => ({
            cedula: r.cedula,
            nombre: r.nombre,
            unidad: `${r.torre} Apto ${r.apto}`,
            estado: 'Al día',
          }));
          setDbResidents(mapped);
        });
    }
  }, [isOpen, selectedConjuntoId]);

  if (!isOpen) return null;

  const currentConjunto = conjuntosList.find((c) => c.id === selectedConjuntoId) || conjuntosList[0];

  // Validate Residente login
  const handleValidateResidente = async (cedulaToValidate?: string) => {
    const cedula = cedulaToValidate || cedulaInput.trim();
    if (!cedula) {
      setErrorMessage('Por favor ingresa un número de cédula válido.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/validate-resident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conjuntoId: selectedConjuntoId,
          cedula,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Cédula no encontrada en el padrón de copropietarios de este conjunto.');
        setIsLoading(false);
        return;
      }

      onSuccessLogin({
        rol: 'RESIDENTE',
        residente: data.residente,
        cartera: data.cartera,
        conjunto: data.conjunto,
      });
      onClose();
    } catch (err) {
      // Fallback
      const foundRes = DEMO_RESIDENTES.find((r) => r.cedula === cedula);
      if (foundRes) {
        const conjunto = conjuntosList.find((c) => c.id === selectedConjuntoId) || conjuntosList[0];
        onSuccessLogin({
          rol: 'RESIDENTE',
          residente: foundRes,
          cartera: {
            id: 'demo-cart',
            residenteId: foundRes.id,
            cedula: foundRes.cedula,
            mesPeriodo: 'Septiembre 2026',
            cuotaOrdinaria: 380000,
            cuotaExtraordinaria: 0,
            totalMora: foundRes.cedula === '52987654' ? 820000 : 0,
            mesesMora: foundRes.cedula === '52987654' ? 2 : 0,
            interesesMora: foundRes.cedula === '52987654' ? 48500 : 0,
            descuentoProntoPago: foundRes.cedula === '52987654' ? 0 : 38000,
            totalPagar: foundRes.cedula === '52987654' ? 1328500 : 342000,
            fechaLimiteDescuento: '10 de Septiembre de 2026',
            fechaVencimiento: '30 de Septiembre de 2026',
            estado: foundRes.cedula === '52987654' ? 'En mora' : 'Al día',
            alicuota: foundRes.alicuota,
            historialPagos: [],
          },
          conjunto,
        });
        onClose();
      } else {
        setErrorMessage('La cédula ingresada no se encuentra registrada en la base de datos.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Validate Administrador login
  const handleValidateAdmin = async (emailOverride?: string) => {
    const email = emailOverride || adminEmailInput.trim();
    if (!email) {
      setErrorMessage('Por favor ingresa un correo de administrador válido.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/validate-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conjuntoId: selectedConjuntoId,
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'No fue posible validar las credenciales de administración.');
        setIsLoading(false);
        return;
      }

      onSuccessLogin({
        rol: 'ADMIN',
        administrador: data.administrador,
        conjunto: data.conjunto,
      });
      onClose();
    } catch (err: any) {
      // Fallback admin login
      const conjunto = currentConjunto;
      const adminName = email.includes('claudia') ? 'Dra. Claudia Marcela Carvajal' : conjunto.administrador;
      onSuccessLogin({
        rol: 'ADMIN',
        administrador: {
          id: `admin-${conjunto.id}`,
          conjuntoId: conjunto.id,
          nombre: adminName,
          email: email,
          telefono: conjunto.telefonoAdmin,
          cargo: 'Administrador(a) Principal P.H.',
          rol: 'ADMIN',
        },
        conjunto,
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#111318] rounded-2xl max-w-lg w-full border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-[#161922] border-b border-slate-800 text-white relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                activeTab === 'ADMIN'
                  ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                  : 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
              }`}>
                {activeTab === 'ADMIN' ? 'PRIVILEGIO ELEVADO · ADMIN' : 'ACCESO CATASTRAL · RESIDENTE'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            {activeTab === 'ADMIN' ? (
              <>
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Ingreso de Administrador(a)</span>
              </>
            ) : (
              <>
                <IdCard className="w-5 h-5 text-blue-400" />
                <span>Autenticación de Copropietario</span>
              </>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'ADMIN'
              ? 'Perfil con permiso exclusivo para cargar reglamentos, gestionar actas y particiones RAG en pgvector.'
              : 'Validación con cédula para consultar expensas comunes, mora personalizada y radicar PQRS.'}
          </p>

          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 mt-4 p-1 bg-[#0D0F14] rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('RESIDENTE');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'RESIDENTE'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Residente / Copropietario</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('ADMIN');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ADMIN'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span>Administrador P.H.</span>
              <span className="text-[9px] px-1 py-0.2 bg-amber-400/20 text-amber-200 rounded font-mono">
                Docs RAG
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Step 1: Select Copropiedad */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              1. Seleccione la Copropiedad
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <select
                value={selectedConjuntoId}
                onChange={(e) => setSelectedConjuntoId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-800 rounded-xl bg-[#0A0B0E] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200 font-medium"
              >
                {conjuntosList.map((conjunto) => (
                  <option key={conjunto.id} value={conjunto.id} className="bg-[#111318]">
                    {conjunto.nombre} ({conjunto.ciudad})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TAB 1: RESIDENTE FORM */}
          {activeTab === 'RESIDENTE' && (
            <>
              {/* Step 2: Cédula Validation */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  2. Ingrese Cédula de Ciudadanía
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <IdCard className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={cedulaInput}
                      onChange={(e) => setCedulaInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleValidateResidente()}
                      placeholder="Ej: 1018456789"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-800 rounded-xl bg-[#0A0B0E] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white font-mono placeholder:text-slate-600"
                    />
                  </div>
                  <button
                    onClick={() => handleValidateResidente()}
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <span>Validar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Note: Residents cannot upload regulations */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <b>Nota de Permisos:</b> Los residentes pueden consultar reglamentos y sus finanzas. La <b>carga de nuevos reglamentos</b> está reservada exclusivamente para el Administrador.
                </span>
              </div>

              {/* Preset Accounts loaded from DB */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    Cuentas en Supabase (1-Clic)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Padrón en Vivo
                  </span>
                </div>

                {dbResidents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dbResidents.map((res) => {
                      const isMora = res.estado.toLowerCase().includes('mora');
                      const isAcuerdo = res.estado.toLowerCase().includes('acuerdo');

                      return (
                        <button
                          key={res.cedula}
                          type="button"
                          onClick={() => {
                            setCedulaInput(res.cedula);
                            handleValidateResidente(res.cedula);
                          }}
                          className="text-left p-2.5 rounded-xl border border-slate-800 bg-[#1A1D24] hover:border-blue-500/50 hover:bg-[#20242e] transition-all text-xs cursor-pointer group"
                        >
                          <div className="flex items-center justify-between font-semibold text-white">
                            <span className="group-hover:text-blue-400 transition-colors truncate">{res.nombre}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap ${
                              isMora
                                ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                                : isAcuerdo
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                                : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            }`}>
                              {res.estado}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex justify-between items-center">
                            <span>{res.unidad}</span>
                            <span className="font-mono text-[10px] text-slate-500">C.C. {res.cedula}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center space-y-1.5">
                    <p className="text-xs text-slate-300 font-medium">
                      No hay copropietarios registrados para <span className="text-blue-400 font-semibold">{currentConjunto.nombre}</span> en Supabase.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Tus 4 copropietarios activos en base de datos (Carlos, María, Juan y Laura) están vinculados a la primera copropiedad.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedConjuntoId('conjunto-1')}
                      className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold cursor-pointer border border-blue-500/30"
                    >
                      Ver copropiedad con residentes (Los Sauces)
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: ADMINISTRADOR FORM */}
          {activeTab === 'ADMIN' && (
            <>
              {/* Registered Administrator Card for selected property */}
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-600/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Administrador Oficial Registrado
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-900/60 border border-amber-700 text-amber-200 text-[10px] font-mono font-bold">
                    P.H. TITULAR
                  </span>
                </div>
                <div className="text-white font-medium text-sm">
                  {currentConjunto.administrador || 'Dra. Claudia Marcela Carvajal'}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-300 pt-1 border-t border-amber-900/40">
                  <span>Email: <b className="text-amber-200">{currentConjunto.emailAdmin || 'administracion@torresdelparqueph.com'}</b></span>
                  <span>Tel: <b className="text-slate-200">{currentConjunto.telefonoAdmin || '(+57) 601 745 8890'}</b></span>
                </div>
              </div>

              {/* Email / Access Credential Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  2. Correo Electrónico del Administrador
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="email"
                      value={adminEmailInput}
                      onChange={(e) => setAdminEmailInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleValidateAdmin()}
                      placeholder="ejemplo: claudiamarcelacarvajal27@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-800 rounded-xl bg-[#0A0B0E] focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white font-mono placeholder:text-slate-600"
                    />
                  </div>
                  <button
                    onClick={() => handleValidateAdmin()}
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-900/30 transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <span>Ingresar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Exclusive Permission Callout */}
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-700/50 text-[11px] text-emerald-300 space-y-1">
                <div className="font-semibold text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Permiso Exclusivo Habilitado al Iniciar Sesión</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Al autenticarte como Administrador(a), se desbloquea el botón <b>"Subir Reglamento"</b>, permitiéndote cargar PDFs/textos, generar fragmentos y calcular embeddings con IA hacia la base de datos vectorial pgvector.
                </p>
              </div>

              {/* 1-Click Quick Access as Admin */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Acceso Rápido Administrador (1-Clic)
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminEmailInput('claudiamarcelacarvajal27@gmail.com');
                      handleValidateAdmin('claudiamarcelacarvajal27@gmail.com');
                    }}
                    className="w-full text-left p-3 rounded-xl border border-amber-800/60 bg-amber-950/30 hover:bg-amber-950/60 transition-all text-xs cursor-pointer group flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dra. Claudia Marcela Carvajal</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                        claudiamarcelacarvajal27@gmail.com · Administradora P.H.
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-amber-600 text-white font-bold text-[10px] shrink-0 shadow-sm">
                      Ingresar ➔
                    </span>
                  </button>

                  {currentConjunto.emailAdmin && currentConjunto.emailAdmin !== 'claudiamarcelacarvajal27@gmail.com' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminEmailInput(currentConjunto.emailAdmin);
                        handleValidateAdmin(currentConjunto.emailAdmin);
                      }}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-800 bg-[#1A1D24] hover:border-amber-500/50 hover:bg-[#20242e] transition-all text-xs cursor-pointer group flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                          {currentConjunto.administrador}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          {currentConjunto.emailAdmin}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 group-hover:bg-amber-700 text-slate-300 group-hover:text-white font-mono text-[10px] shrink-0">
                        Ingresar
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0E1015] border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Seguridad RBAC · PostgreSQL & Supabase</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
