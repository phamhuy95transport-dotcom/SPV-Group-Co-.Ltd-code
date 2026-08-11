import React from 'react';
import { X, Sparkles, Quote } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: string;
  userName: string;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, quote, userName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute top-0 right-0 p-4">
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-amber-200 to-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50 transform -rotate-6">
            <Sparkles className="w-8 h-8 text-amber-700" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800">
              Chào ngày mới, {userName}!
            </h2>
            <p className="text-slate-500 font-medium">Chúc bạn một ngày làm việc tràn đầy năng lượng.</p>
          </div>

          <div className="relative bg-amber-50/50 border border-amber-100 rounded-2xl p-6 mt-4">
            <Quote className="absolute top-3 left-3 w-8 h-8 text-amber-200/50 transform -scale-x-100" />
            <p className="relative z-10 text-lg font-medium text-amber-900 italic leading-relaxed">
              "{quote}"
            </p>
            <Quote className="absolute bottom-3 right-3 w-8 h-8 text-amber-200/50" />
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
          >
            Bắt đầu làm việc
          </button>
        </div>
      </div>
    </div>
  );
};
