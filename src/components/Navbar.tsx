import React from 'react';
import { Database, FileSpreadsheet, AlertCircle, UserCheck, ShieldCheck, Shield, Upload } from 'lucide-react';
import { Conjunto, Residente, CarteraExpensas, Administrador } from '../types/index.js';

interface NavbarProps {
  conjunto: Conjunto | null;
  residente: Residente | null;
  administrador?: Administrador | null;
  isAdmin?: boolean;
  cartera: CarteraExpensas | null;
  onOpenLogin: (defaultRole?: 'RESIDENTE' | 'ADMIN') => void;
  onOpenCartera: () => void;
  onOpenPQRS: () => void;
  onOpenSupabase: () => void;
  onOpenDocuments?: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  conjunto,
  residente,
  administrador,
  isAdmin = false,
  cartera,
  onOpenLogin,
  onOpenCartera,
  onOpenPQRS,
  onOpenSupabase,
  onOpenDocuments,
  onLogout,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 bg-[#0A0B0E]/80 backdrop-blur-md sticky top-0 z-20 flex-shrink-0">
      {/* Left Info: Status Tag & Conjunto */}
      <div className="flex items-center space-x-3 min-w-0">
        {isAdmin && administrador ? (
          <span className="px-2.5 py-1 bg-amber-950/80 border border-amber-700/70 rounded text-[10px] font-mono text-amber-300 font-bold tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            ADMIN_ACTIVO
          </span>
        ) : residente ? (
          <span className="px-2.5 py-1 bg-blue-950/80 border border-blue-800/60 rounded text-[10px] font-mono text-blue-300 tracking-wider">
            RESIDENTE
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-slate-800/90 border border-slate-700/60 rounded text-[10px] font-mono text-slate-400 tracking-wider">
            MODO_INVITADO
          </span>
        )}

        <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-white truncate">
            {conjunto ? conjunto.nombre : 'Consulta de Reglamentos y Cartera'}
          </p>
          <p className="text-[10px] text-slate-400 hidden sm:block truncate">
            {conjunto?.ciudad ? `${conjunto.ciudad} · ${conjunto.direccion}` : 'Propiedad Horizontal P.H.'}
          </p>
        </div>
      </div>

      {/* Center Shortcuts */}
      <div className="hidden md:flex items-center space-x-2">
        <button
          onClick={onOpenSupabase}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span>Configurar Supabase / SQL</span>
        </button>

        {/* Exclusive button for Administrator: Subir Reglamento RAG */}
        {isAdmin && onOpenDocuments && (
          <button
            onClick={onOpenDocuments}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 transition-colors cursor-pointer shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Subir Reglamento (Admin RAG)</span>
          </button>
        )}

        {residente && (
          <>
            <button
              onClick={onOpenCartera}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
              <span>Expensas y Saldo</span>
            </button>

            <button
              onClick={onOpenPQRS}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>PQRS y Novedades</span>
            </button>
          </>
        )}
      </div>

      {/* Right User Action */}
      <div className="flex items-center space-x-2.5">
        {isAdmin && administrador ? (
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-2 bg-amber-950/30 border border-amber-800/50 rounded-full py-1 px-3">
              <Shield className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-semibold text-amber-200 truncate max-w-[140px]">
                {administrador.nombre}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="text-xs bg-slate-800 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-full font-bold hover:bg-slate-700 hover:text-white transition-colors flex items-center space-x-1 shadow-sm cursor-pointer"
            >
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : residente ? (
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-2 bg-[#111318] border border-slate-800 rounded-full py-1 px-3">
              <span className="text-xs font-medium text-slate-300">
                {residente.torre} {residente.apto}
              </span>
              <span className={`w-2 h-2 rounded-full ${cartera?.estado === 'Al día' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>

            <button
              onClick={onLogout}
              className="text-xs bg-white text-black px-4 py-1.5 rounded-full font-bold hover:bg-slate-200 transition-colors flex items-center space-x-1 shadow-sm cursor-pointer"
            >
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenLogin('ADMIN')}
              className="text-xs bg-amber-950/60 border border-amber-800/60 text-amber-300 px-3 py-1.5 rounded-full font-bold hover:bg-amber-900/60 hover:text-white transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Shield className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Soy</span> Administrador
            </button>

            <button
              onClick={() => onOpenLogin('RESIDENTE')}
              className="text-xs bg-blue-600 text-white px-3.5 py-1.5 rounded-full font-bold hover:bg-blue-500 transition-colors flex items-center space-x-1.5 shadow-md shadow-blue-900/30 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Ingreso Residente</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
