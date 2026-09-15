import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { ChatbotRAG } from './components/ChatbotRAG.js';
import { ConjuntoLoginModal } from './components/ConjuntoLoginModal.js';
import { CarteraExpensasModal } from './components/CarteraExpensasModal.js';
import { PQRSModal } from './components/PQRSModal.js';
import { SupabaseConfigModal } from './components/SupabaseConfigModal.js';
import { DocumentIngestionModal } from './components/DocumentIngestionModal.js';
import { Conjunto, Residente, CarteraExpensas, Administrador, UserRole } from './types/index.js';
import { DEMO_CONJUNTOS, DEMO_RESIDENTES } from './data/mockData.js';
import { Upload, Shield, ShieldCheck, Lock, User, Sparkles, Building2, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [conjunto, setConjunto] = useState<Conjunto>(DEMO_CONJUNTOS[0]);
  const [userRole, setUserRole] = useState<UserRole>('RESIDENTE');
  const [residente, setResidente] = useState<Residente | null>(DEMO_RESIDENTES[0]);
  const [administrador, setAdministrador] = useState<Administrador | null>(null);
  const [cartera, setCartera] = useState<CarteraExpensas | null>(null);

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginDefaultRole, setLoginDefaultRole] = useState<'RESIDENTE' | 'ADMIN'>('RESIDENTE');
  const [isCarteraOpen, setIsCarteraOpen] = useState(false);
  const [isPQRSOpen, setIsPQRSOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [testQueryForChat, setTestQueryForChat] = useState<string | null>(null);

  // Load initial resident & database state
  useEffect(() => {
    const initData = async () => {
      try {
        const res = await fetch('/api/auth/validate-resident', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conjuntoId: 'conjunto-1', cedula: '1020789123' }), // Laura Sofía Sánchez (En mora)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.residente) {
            setResidente(data.residente);
            setUserRole('RESIDENTE');
          }
          if (data.cartera) setCartera(data.cartera);
          if (data.conjunto) setConjunto(data.conjunto);
        }
      } catch (err) {
        console.warn('Error sincronizando datos iniciales con la BD:', err);
      }
    };
    initData();
  }, []);

  const handleSuccessLogin = (data: {
    rol: 'RESIDENTE' | 'ADMIN';
    residente?: Residente;
    administrador?: Administrador;
    cartera?: CarteraExpensas;
    conjunto: Conjunto;
  }) => {
    setUserRole(data.rol);
    setConjunto(data.conjunto);

    if (data.rol === 'ADMIN' && data.administrador) {
      setAdministrador(data.administrador);
      setResidente(null);
      setCartera(null);
    } else if (data.rol === 'RESIDENTE' && data.residente) {
      setResidente(data.residente);
      setAdministrador(null);
      setCartera(data.cartera || null);
    }
  };

  const handleLogout = () => {
    setUserRole('GUEST');
    setResidente(null);
    setAdministrador(null);
    setCartera(null);
    setLoginDefaultRole('RESIDENTE');
    setIsLoginOpen(true);
  };

  const handleOpenLoginWithRole = (role?: 'RESIDENTE' | 'ADMIN') => {
    setLoginDefaultRole(role || 'RESIDENTE');
    setIsLoginOpen(true);
  };

  const isAdmin = userRole === 'ADMIN' && !!administrador;

  return (
    <div className="bg-[#0A0B0E] text-slate-200 font-sans h-screen w-full flex overflow-hidden select-text">
      {/* Left Sidebar - RAG-PH OS Branding, Subir Reglamento (Role-Restricted), User Data and Database & pgvector */}
      <aside className="w-[300px] bg-[#111318] border-r border-slate-800 flex flex-col hidden lg:flex flex-shrink-0">
        {/* Sidebar Header: RAG-PH OS */}
        <div className="p-4 border-b border-slate-800 bg-[#0E1015]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white italic shadow-md shadow-blue-900/30 text-xs flex-shrink-0">
              PH
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-white leading-none">
                RAG-PH OS
              </h1>
              <span className="text-[9px] text-blue-400 font-mono tracking-wider">
                pgvector · Gemini 3.8
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Action: Subir Reglamento / Gestor RAG (ONLY ADMINISTRATOR CAN UPLOAD) */}
          <section>
            {isAdmin ? (
              <button
                onClick={() => setIsDocModalOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold text-amber-200 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 transition-all shadow-sm group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-900/60 border border-amber-600/50 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-bold text-amber-200 leading-snug truncate">Subir Reglamento</p>
                    <p className="text-[10px] text-amber-400 font-normal truncate">Ingesta RAG y Embeddings</p>
                  </div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-800/80 border border-amber-600 text-amber-200 font-mono font-bold">
                  ADMIN
                </span>
              </button>
            ) : (
              <div className="p-3 rounded-xl border border-slate-800 bg-[#14161F] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Lock className="w-4 h-4 text-amber-400/80 shrink-0" />
                    <span className="truncate">Subir Reglamento</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-mono font-semibold">
                    SOLO ADMIN
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Solo el <b>Administrador</b> tiene permiso para subir e indexar reglamentos en pgvector.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenLoginWithRole('ADMIN')}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 hover:text-white text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3 h-3 text-amber-400" />
                  <span>Acceso como Administrador</span>
                </button>
              </div>
            )}
          </section>

          {/* Section 1: Datos de Identidad (Admin or Residente) */}
          <section className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                {isAdmin ? 'Administración P.H.' : 'Datos del Residente'}
              </h2>
              {userRole !== 'GUEST' && (residente || administrador) ? (
                <button
                  onClick={handleLogout}
                  className="text-[10px] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Cambiar
                </button>
              ) : (
                <button
                  onClick={() => handleOpenLoginWithRole('RESIDENTE')}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                >
                  Ingresar
                </button>
              )}
            </div>

            {/* If Admin is logged in */}
            {isAdmin && administrador ? (
              <div className="bg-[#1A1D24] p-3.5 rounded-xl border border-amber-600/40 shadow-sm space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-700 to-amber-950 border border-amber-500/60 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    <ShieldCheck className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{administrador.nombre}</p>
                    <p className="text-[11px] text-amber-400 font-medium truncate">{administrador.cargo}</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0A0B0E] border border-amber-900/40 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500">Copropiedad:</span>
                    <span className="font-semibold text-white truncate max-w-[130px]">{conjunto.nombre}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
                    <span className="text-slate-500">Email:</span>
                    <span className="text-amber-300 font-mono text-[10px] truncate max-w-[140px]" title={administrador.email}>
                      {administrador.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500">Teléfono:</span>
                    <span className="text-slate-300 font-mono text-[10px]">{administrador.telefono}</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[10px] text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Permiso exclusivo activo para cargar reglamentos.</span>
                </div>
              </div>
            ) : residente ? (
              /* If Residente is logged in */
              <div className="bg-[#1A1D24] p-3.5 rounded-xl border border-slate-700/50 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-blue-900 border border-slate-600 flex items-center justify-center text-white font-bold text-xs">
                    {residente.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{residente.nombre}</p>
                    <p className="text-[11px] text-slate-400 font-mono">C.C. {residente.cedula}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#0A0B0E] p-2 rounded-lg border border-slate-800">
                    <p className="text-slate-500 text-[10px]">Unidad</p>
                    <p className="text-white font-mono font-medium truncate">
                      {residente.torre} - {residente.apto}
                    </p>
                  </div>
                  <div className="bg-[#0A0B0E] p-2 rounded-lg border border-slate-800">
                    <p className="text-slate-500 text-[10px]">Estado</p>
                    <p
                      className={`font-mono font-medium ${
                        cartera?.estado === 'Al día'
                          ? 'text-emerald-400'
                          : cartera?.estado === 'En mora'
                          ? 'text-amber-400'
                          : 'text-sky-400'
                      }`}
                    >
                      {cartera?.estado || 'Al día'}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-[10px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Alícuota: <b className="text-white">{residente.alicuota}%</b></span>
                    <button
                      onClick={() => setIsCarteraOpen(true)}
                      className="text-blue-400 hover:text-blue-300 font-medium underline cursor-pointer"
                    >
                      Ver Cartera
                    </button>
                  </div>
                  {residente.email && (
                    <div className="text-[10px] text-slate-400 truncate flex items-center justify-between pt-1 border-t border-slate-800/40">
                      <span className="text-slate-500">Correo en BD:</span>
                      <span className="text-emerald-400 font-mono truncate max-w-[150px]" title={residente.email}>
                        {residente.email}
                      </span>
                    </div>
                  )}
                  {residente.telefono && (
                    <div className="text-[10px] text-slate-400 truncate flex items-center justify-between">
                      <span className="text-slate-500">Teléfono BD:</span>
                      <span className="text-slate-300 font-mono">{residente.telefono}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If logged out / guest */
              <div className="bg-[#1A1D24] p-4 rounded-xl border border-dashed border-slate-700/60 text-center space-y-2">
                <p className="text-xs text-slate-400">No hay usuario autenticado</p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handleOpenLoginWithRole('RESIDENTE')}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Validar Cédula (Copropietario)
                  </button>
                  <button
                    onClick={() => handleOpenLoginWithRole('ADMIN')}
                    className="w-full py-2 px-3 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Acceso Administrador P.H.</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Base de Datos & pgvector */}
          <section className="pt-4 border-t border-slate-800/80">
            <h2 className="text-[11px] text-slate-500 uppercase tracking-wider mb-3 font-bold">
              Base de Datos & pgvector
            </h2>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Motor</span>
                <span className="flex items-center text-blue-400 font-medium text-[11px]">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-1.5 animate-pulse" />
                  Supabase / PostgreSQL
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Extensión</span>
                <span className="text-slate-300 font-mono text-[11px]">pgvector 768-D</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">LLM</span>
                <span className="text-slate-300 font-mono text-[11px]">Gemini 3.8 Flash</span>
              </div>
            </div>
          </section>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden bg-[#0A0B0E]">
        {/* Top Navbar */}
        <Navbar
          conjunto={conjunto}
          residente={residente}
          administrador={administrador}
          isAdmin={isAdmin}
          cartera={cartera}
          onOpenLogin={handleOpenLoginWithRole}
          onOpenCartera={() => setIsCarteraOpen(true)}
          onOpenPQRS={() => setIsPQRSOpen(true)}
          onOpenSupabase={() => setIsSupabaseOpen(true)}
          onOpenDocuments={() => setIsDocModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Chatbot Interface */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatbotRAG
            residente={residente}
            administrador={administrador}
            isAdmin={isAdmin}
            conjunto={conjunto}
            cartera={cartera}
            onOpenCartera={() => setIsCarteraOpen(true)}
            onOpenPQRS={() => setIsPQRSOpen(true)}
            onOpenSupabase={() => setIsSupabaseOpen(true)}
            onOpenLogin={handleOpenLoginWithRole}
            onOpenDocuments={() => setIsDocModalOpen(true)}
            initialQuery={testQueryForChat}
            onClearInitialQuery={() => setTestQueryForChat(null)}
          />
        </div>
      </main>

      {/* 2-Step Authentication Modal (Resident / Administrator) */}
      <ConjuntoLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        defaultRole={loginDefaultRole}
        onSuccessLogin={handleSuccessLogin}
      />

      {/* Financial Cartera & Expensas Breakdown Modal */}
      <CarteraExpensasModal
        isOpen={isCarteraOpen}
        onClose={() => setIsCarteraOpen(false)}
        residente={residente}
        cartera={cartera}
        conjunto={conjunto}
        onPaymentSuccess={(newCartera) => setCartera(newCartera)}
      />

      {/* PQRS Automated Tickets Modal */}
      <PQRSModal
        isOpen={isPQRSOpen}
        onClose={() => setIsPQRSOpen(false)}
        residente={residente}
        conjunto={conjunto}
      />

      {/* pgvector & Supabase Step-by-Step Setup + Full SQL Migration */}
      <SupabaseConfigModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />

      {/* Document Ingestion & Regulation Manager Modal (Admin only allowed to ingest) */}
      <DocumentIngestionModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        conjuntoId={conjunto?.id || 'conjunto-1'}
        isAdmin={isAdmin}
        adminInfo={administrador}
        onOpenLoginAsAdmin={() => handleOpenLoginWithRole('ADMIN')}
        onSelectSampleQuestion={(q) => setTestQueryForChat(q)}
      />
    </div>
  );
}
