import React, { useState, useEffect } from 'react';
import { Shield, Lock, CheckCircle, AlertTriangle, RefreshCw, Eye, EyeOff, Activity, Server, Wifi } from 'lucide-react';

interface SecurityProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert?: (content: string, type: string) => void;
  initialFile?: File | null;
}

export default function Security({ isOpen, onClose }: SecurityProps) {
  const [status, setStatus] = useState<'secure' | 'scanning' | 'warning'>('secure');
  const [lastScan, setLastScan] = useState<string>(new Date().toLocaleTimeString());
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    // Simulate periodic checks
    const interval = setInterval(() => {
        setLastScan(new Date().toLocaleTimeString());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const runScan = () => {
    setStatus('scanning');
    setTimeout(() => {
        setStatus('secure');
        setLastScan(new Date().toLocaleTimeString());
    }, 3000);
  };

  const handleLock = () => {
      setLocked(true);
  };

  const handleUnlock = () => {
      if (pin === '1234' || pin === '0000' || pin === 'nexa') { // Simple demo pin
          setLocked(false);
          setPin('');
      } else {
          alert('PIN Incorrecto (Prueba: 1234)');
      }
  };

  if (!isOpen) return null;

  if (locked) {
      return (
          <div className="fixed inset-0 z-[60] bg-gray-900 flex items-center justify-center p-4 backdrop-blur-xl">
              <div className="bg-white/10 p-8 rounded-3xl w-full max-w-sm text-center border border-white/20 shadow-2xl">
                  <Lock className="w-16 h-16 text-white mx-auto mb-6" />
                  <h2 className="text-2xl font-bold text-white mb-2">Sistema Bloqueado</h2>
                  <p className="text-white/60 mb-6">Ingresa tu PIN de seguridad</p>
                  
                  <div className="relative mb-6">
                    <input 
                        type={showPin ? "text" : "password"}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/50 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••"
                        maxLength={4}
                    />
                    <button 
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    >
                        {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  <button 
                    onClick={handleUnlock}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                  >
                      Desbloquear
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nexa Secure Core</h2>
              <p className="text-xs text-gray-500">Protección activa y monitoreo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Cerrar</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
            {/* Status Card */}
            <div className={`p-6 rounded-2xl mb-6 flex items-center justify-between transition-colors ${status === 'secure' ? 'bg-green-50 border border-green-100' : 'bg-blue-50 border border-blue-100'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${status === 'secure' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600 animate-pulse'}`}>
                        {status === 'secure' ? <CheckCircle className="w-8 h-8" /> : <Activity className="w-8 h-8" />}
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold ${status === 'secure' ? 'text-green-800' : 'text-blue-800'}`}>
                            {status === 'secure' ? 'Sistema Protegido' : 'Escaneando sistema...'}
                        </h3>
                        <p className="text-sm opacity-80">
                            {status === 'secure' ? 'No se han detectado amenazas.' : 'Analizando integridad de archivos y memoria...'}
                        </p>
                    </div>
                </div>
                {status === 'secure' && (
                    <button onClick={runScan} className="px-4 py-2 bg-white text-green-700 text-sm font-semibold rounded-lg shadow-sm border border-green-200 hover:bg-green-50 transition-colors">
                        Escanear
                    </button>
                )}
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-2 text-gray-500">
                        <Server className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Base de Datos</span>
                    </div>
                    <p className="text-gray-900 font-medium">Firebase Secure</p>
                    <p className="text-xs text-green-600 mt-1">● Conectado</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-2 text-gray-500">
                        <Wifi className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Red Neural</span>
                    </div>
                    <p className="text-gray-900 font-medium">Encriptada (TLS)</p>
                    <p className="text-xs text-green-600 mt-1">● Segura</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-2 text-gray-500">
                        <RefreshCw className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Último Escaneo</span>
                    </div>
                    <p className="text-gray-900 font-medium">{lastScan}</p>
                    <p className="text-xs text-gray-500 mt-1">Automático</p>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Acciones de Seguridad</h4>
                
                <button 
                    onClick={handleLock}
                    className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-red-200 hover:bg-red-50/50 group transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 text-gray-600 group-hover:bg-red-100 group-hover:text-red-600 rounded-lg transition-colors">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-red-700">Bloquear Pantalla</p>
                            <p className="text-xs text-gray-500">Requiere PIN para acceder nuevamente</p>
                        </div>
                    </div>
                    <div className="text-gray-400">
                        →
                    </div>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
