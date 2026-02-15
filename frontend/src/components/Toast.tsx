import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const Toast = ({ message, type, onClose, duration = 4000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={24} className="text-white" />,
    error: <XCircle size={24} className="text-white" />,
    warning: <AlertCircle size={24} className="text-white" />,
    info: <Info size={24} className="text-white" />
  };

  const colors = {
    success: 'from-green-500 to-green-600',
    error: 'from-red-500 to-red-600',
    warning: 'from-orange-500 to-orange-600',
    info: 'from-blue-500 to-blue-600'
  };

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] animate-fadeIn pointer-events-auto">
      <div className={`bg-gradient-to-r ${colors[type]} rounded-2xl shadow-2xl p-6 min-w-[320px] max-w-md border-2 border-white/30 backdrop-blur-xl relative overflow-hidden`}>
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
        
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            {icons[type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg leading-tight">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition-all duration-200"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
          <div 
            className="h-full bg-white/60 transition-all ease-linear"
            style={{ 
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`
            }}
          ></div>
        </div>
      </div>
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default Toast;
