'use client';

import { useState } from 'react';
import { Heart, Star, ShoppingBag, Sparkles, ArrowLeft, Wand2 } from 'lucide-react';
import { LucyAvatar } from './lucy-avatar';
import { LucyProductCard } from './lucy-product-card';

const QUESTIONS = [
  {
    id: 1,
    question: '¿Cómo te sientes hoy?',
    options: [
      { text: 'Cansada y necesito relax', icon: Heart },
      { text: 'Inspirada y creativa', icon: Star },
      { text: 'Práctica y ocupada', icon: ShoppingBag },
      { text: 'Con ganas de consentirme', icon: Sparkles },
    ],
  },
  {
    id: 2,
    question: '¿Para qué ocasión estás buscando algo?',
    options: [
      { text: 'Para mi hogar', icon: ShoppingBag },
      { text: 'Para mi rutina de belleza', icon: Sparkles },
      { text: 'Para un regalo especial', icon: Heart },
      { text: 'Para mi día a día', icon: Star },
    ],
  },
  {
    id: 3,
    question: 'Si tuvieras que elegir un color que te represente hoy, ¿cuál sería?',
    options: [
      { text: 'Tonos pastel y suaves', icon: Heart },
      { text: 'Colores vibrantes y alegres', icon: Star },
      { text: 'Neutros elegantes', icon: ShoppingBag },
      { text: 'Brillantes y metálicos', icon: Sparkles },
    ],
  },
  {
    id: 4,
    question: '¿Cuál es tu presupuesto aproximado?',
    options: [
      { text: 'Menos de $50.000 COP', icon: ShoppingBag },
      { text: 'Entre $50.000 y $150.000 COP', icon: Star },
      { text: 'No tengo límite si me enamora', icon: Heart },
    ],
  },
];

interface LucyMagicFormProps {
  sessionId: string;
  onBack: () => void;
}

type FormMode = 'questions' | 'loading' | 'result';

export function LucyMagicForm({ sessionId, onBack }: LucyMagicFormProps) {
  const [step, setStep] = useState(0); // 0-indexed
  const [answers, setAnswers] = useState<string[]>([]);
  const [formMode, setFormMode] = useState<FormMode>('questions');
  const [result, setResult] = useState<{ lucyMessage: string; product: any } | null>(null);
  const [error, setError] = useState('');

  const currentQuestion = QUESTIONS[step];
  const progress = ((step) / QUESTIONS.length) * 100;

  const handleAnswer = async (answer: string) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // Last answer — call API
      setFormMode('loading');
      try {
        const res = await fetch('/api/lucy-recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: newAnswers, sessionId }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResult(data);
        setFormMode('result');
      } catch {
        setError('¡Ay! Algo salió mal. Inténtalo de nuevo.');
        setFormMode('questions');
        setStep(0);
        setAnswers([]);
      }
    }
  };

  const handleReset = () => {
    setStep(0);
    setAnswers([]);
    setResult(null);
    setError('');
    setFormMode('questions');
  };

  // LOADING STATE
  if (formMode === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFB4AC] to-[#EDD2F3] flex items-center justify-center shadow-lg animate-pulse">
            <Wand2 className="w-9 h-9 text-white animate-bounce" />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-[#FFB4AC]/30 animate-ping" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-xl text-foreground mb-1">La magia está ocurriendo...</h3>
          <p className="text-sm text-foreground/60">Lucy está buscando tu match perfecto ✨</p>
        </div>
      </div>
    );
  }

  // RESULT STATE
  if (formMode === 'result' && result) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDD2F3]/30 shrink-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-[#FFD5E5]/40 text-foreground/60 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <p className="font-bold text-sm text-foreground">Tu match mágico ✨</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
          {/* Lucy message */}
          <div className="flex gap-2 mb-4">
            <LucyAvatar size="sm" className="mt-1 shrink-0" />
            <div className="bg-white border border-[#EDD2F3]/40 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm text-sm text-foreground leading-relaxed">
              {result.lucyMessage}
            </div>
          </div>

          {/* Product card */}
          {result.product && <LucyProductCard product={result.product} />}

          {!result.product && (
            <div className="text-center py-6 text-sm text-foreground/50">
              Estamos ampliando nuestro catálogo. ¡Pronto más opciones para ti!
            </div>
          )}

          {/* Reset */}
          <button
            onClick={handleReset}
            className="w-full mt-4 py-2.5 rounded-full border border-[#EDD2F3]/60 text-sm text-foreground/60 hover:bg-[#FFF5F8] hover:text-foreground transition-colors"
          >
            Repetir cuestionario
          </button>
        </div>
      </div>
    );
  }

  // QUESTIONS STATE
  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="px-4 pt-4 pb-3 border-b border-[#EDD2F3]/30 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={step === 0 ? onBack : () => { setStep(step - 1); setAnswers(answers.slice(0, -1)); }}
            className="p-1.5 rounded-full hover:bg-[#FFD5E5]/40 text-foreground/60 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-[#F43F5E] uppercase tracking-wider">
            Cuestionario Mágico
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#EDD2F3]/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FFB4AC] to-[#EDD2F3] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[11px] text-foreground/40 mt-1">
          Pregunta {step + 1} de {QUESTIONS.length}
        </p>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
        {error && (
          <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-3">{error}</p>
        )}

        <h3 className="font-serif font-bold text-lg text-foreground mb-4 leading-snug">
          {currentQuestion.question}
        </h3>

        <div className="grid grid-cols-1 gap-2.5">
          {currentQuestion.options.map((option, idx) => {
            const Icon = option.icon;
            return (
              <button
                key={idx}
                onClick={() => handleAnswer(option.text)}
                className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border-2 border-[#EDD2F3]/30 hover:border-[#FFB4AC] hover:bg-[#FFF5F8] transition-all duration-200 text-left"
              >
                <div className="w-9 h-9 shrink-0 rounded-xl bg-[#FFD5E5]/50 group-hover:bg-gradient-to-br group-hover:from-[#FFB4AC] group-hover:to-[#EDD2F3] flex items-center justify-center transition-all duration-200">
                  <Icon className="w-4 h-4 text-[#F43F5E] group-hover:text-white transition-colors" />
                </div>
                <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
