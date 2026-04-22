'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Star, Heart, ShoppingBag, Wand2, RefreshCw, MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import Markdown from 'react-markdown';

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

interface Recommendation {
  productName: string;
  description: string;
  priceCOP: number;
  reason: string;
}

export default function TodopolisMagicForm() {
  const [mode, setMode] = useState<'welcome' | 'form' | 'chat_loading' | 'chat'>('welcome');
  
  // Form State
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, mode, isChatLoading]);

  const handleStartForm = () => {
    setMode('form');
    setStep(1);
    setAnswers([]);
    setRecommendation(null);
    setError(null);
  };

  const handleStartChat = () => {
    setMode('chat_loading');
    
    setTimeout(() => {
      setMode('chat');
      setChatMessages([{ role: 'model', text: '¡Hola hermosa! ✨ Soy Luna, tu asesora mágica en Todopolis. ¿En qué te puedo ayudar hoy? ¿Buscas algo para ti, un regalito, o solo quieres vitrinear?' }]);
      
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        chatRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction: `Eres Luna, la asesora mágica y súper empática de "Todopolis" (una tienda que vende de todo, enfocada principalmente en mujeres). Tu objetivo es ayudar a las clientas a encontrar su producto ideal y guiarlas suavemente hacia la compra, como si fueras su mejor amiga dándoles un consejo.

REGLAS DE ESTILO (¡MUY IMPORTANTE!):
- Escribe SIEMPRE en párrafos muy cortos (máximo 1 o 2 oraciones por párrafo).
- Tu tono debe ser 100% humano, conversacional, cálido y natural. Como si estuvieras chateando por WhatsApp con una amiga.
- Usa emojis, pero sin exagerar.
- NO uses listas largas ni formatos robóticos.

MANEJO DE VENTAS Y OBJECIONES:
- Haz preguntas suaves para entender qué busca (ocasión, gustos, presupuesto).
- Cuando recomiendes algo, inventa un producto realista de Todopolis (maquillaje, decoración, accesorios, ropa, etc.) y da el precio aproximado en pesos colombianos (ej. $45.000 COP).
- Si la clienta tiene dudas u objeciones (ej. "está muy caro", "no sé si lo necesito"), sé comprensiva. Valida sus sentimientos ("Te entiendo perfecto, a veces pasa..."), y ofrécele una alternativa más económica o recuérdale el valor emocional del producto.
- Lleva la conversación de forma natural hasta que la clienta decida comprar.`
          }
        });
      }
    }, 2500);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      if (!chatRef.current) throw new Error("Chat no inicializado");
      const response = await chatRef.current.sendMessage({ message: userMsg });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'model', text: '¡Ay! Se me cruzaron los cables mágicos por un segundito. 🙈 ¿Me repites lo último porfa?' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (step < QUESTIONS.length) {
      setStep(step + 1);
    } else {
      setStep(QUESTIONS.length + 1); // Loading step
      await generateRecommendation(newAnswers);
    }
  };

  const generateRecommendation = async (userAnswers: string[]) => {
    setIsGenerating(true);
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API Key no configurada');
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
        Eres el asistente mágico de ventas de "Todopolis", una tienda que vende "de todo" pero enfocada principalmente en mujeres.
        Tu objetivo es recomendar un producto ideal basándote en las respuestas de la usuaria a un cuestionario mágico.
        
        Respuestas de la usuaria:
        1. ¿Cómo te sientes hoy?: ${userAnswers[0]}
        2. ¿Para qué ocasión estás buscando algo?: ${userAnswers[1]}
        3. Color que la representa hoy: ${userAnswers[2]}
        4. Presupuesto aproximado: ${userAnswers[3]}

        Inventa un producto realista pero atractivo que encaje perfectamente con sus respuestas. 
        Debe ser algo que una tienda variada ("Todopolis") vendería (ej. maquillaje, decoración, accesorios, gadgets de belleza, ropa, etc.).
        
        Devuelve un JSON con la siguiente estructura:
        {
          "productName": "Nombre atractivo del producto",
          "description": "Una descripción mágica y persuasiva del producto",
          "priceCOP": 45000,
          "reason": "Por qué este producto es perfecto para ella basado en sus respuestas"
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              description: { type: Type.STRING },
              priceCOP: { type: Type.NUMBER },
              reason: { type: Type.STRING },
            },
            required: ['productName', 'description', 'priceCOP', 'reason'],
          },
        },
      });

      const resultText = response.text;
      if (resultText) {
        const result = JSON.parse(resultText) as Recommendation;
        setRecommendation(result);
        setStep(QUESTIONS.length + 2); // Result step
      } else {
        throw new Error('No se pudo generar la recomendación');
      }
    } catch (err) {
      console.error(err);
      setError('Ups, nuestra varita mágica falló. Por favor, inténtalo de nuevo.');
      setMode('welcome');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-200/50 blur-3xl mix-blend-multiply opacity-70 animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-200/50 blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-rose-200/50 blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-4000" />
      </div>

      <div className="w-full max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {/* WELCOME SCREEN */}
          {mode === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-8 bg-white/60 backdrop-blur-xl p-8 sm:p-12 rounded-3xl shadow-xl border border-white/50"
            >
              <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full text-white shadow-lg mb-4">
                <Wand2 className="w-10 h-10" />
              </div>
              <h1 className="text-5xl sm:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-800 to-pink-600">
                Todopolis
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
                Donde la magia encuentra lo que necesitas. ¿Cómo prefieres que te ayudemos a encontrar tu producto ideal hoy?
              </p>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <button
                  onClick={handleStartForm}
                  className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full hover:from-purple-500 hover:to-pink-400 hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                >
                  <Sparkles className="w-5 h-5 mr-2 group-hover:animate-spin" />
                  <span>Cuestionario Mágico</span>
                </button>
                
                <button
                  onClick={handleStartChat}
                  className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-purple-700 transition-all duration-200 bg-white border-2 border-purple-200 rounded-full hover:bg-purple-50 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-200"
                >
                  <MessageCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  <span>Hablar con Asesora</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* CHAT LOADING */}
          {mode === 'chat_loading' && (
            <motion.div
              key="chat_loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center space-y-8 bg-white/60 backdrop-blur-xl p-12 rounded-3xl shadow-xl border border-white/50 flex flex-col items-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-purple-400 blur-xl opacity-50 rounded-full animate-pulse" />
                <Sparkles className="w-16 h-16 text-pink-500 animate-spin-slow relative z-10" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-serif font-bold text-slate-800">
                  Despertando la magia...
                </h2>
                <p className="text-slate-500 font-medium">
                  Buscando a tu hada madrina de compras en Todopolis.
                </p>
              </div>
            </motion.div>
          )}

          {/* CHAT INTERFACE */}
          {mode === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 w-full h-[600px] flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-purple-100 bg-white/50 flex items-center shadow-sm z-10">
                <button 
                  onClick={() => setMode('welcome')} 
                  className="p-2 hover:bg-purple-100 rounded-full text-purple-600 transition-colors"
                  aria-label="Volver"
                >
                  <ArrowLeft className="w-5 h-5"/>
                </button>
                <div className="ml-3 flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white shadow-md">
                    <Sparkles className="w-5 h-5"/>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-bold text-slate-800 leading-tight">Luna</h3>
                    <p className="text-xs text-purple-500 font-medium">Tu asesora mágica ✨</p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {chatMessages.map((msg, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-br-sm' 
                        : 'bg-white border border-purple-100 text-slate-700 rounded-bl-sm'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <div className="prose prose-sm prose-purple max-w-none">
                          <Markdown>{msg.text}</Markdown>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {isChatLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white border border-purple-100 rounded-2xl rounded-bl-sm p-4 shadow-sm flex space-x-2 items-center h-12">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-purple-100 flex gap-2 items-center">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  className="flex-1 bg-slate-50 border border-purple-200 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                />
                <button 
                  type="submit" 
                  disabled={isChatLoading || !chatInput.trim()} 
                  className="bg-gradient-to-r from-purple-600 to-pink-500 text-white p-3.5 rounded-full hover:shadow-lg hover:shadow-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          )}

          {/* FORM STEPS 1-4: QUESTIONS */}
          {mode === 'form' && step > 0 && step <= QUESTIONS.length && (
            <motion.div
              key={`question-${step}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="bg-white/70 backdrop-blur-xl p-6 sm:p-10 rounded-3xl shadow-xl border border-white/50 relative"
            >
              <button 
                onClick={() => setMode('welcome')} 
                className="absolute top-6 left-6 p-2 hover:bg-purple-100 rounded-full text-purple-600 transition-colors"
                aria-label="Volver"
              >
                <ArrowLeft className="w-5 h-5"/>
              </button>

              <div className="flex flex-col items-center mb-8 mt-2">
                <span className="text-sm font-bold text-purple-500 uppercase tracking-wider mb-4">
                  Pregunta {step} de {QUESTIONS.length}
                </span>
                <div className="flex gap-1">
                  {QUESTIONS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i < step ? 'w-6 bg-purple-500' : 'w-2 bg-purple-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-800 mb-8 leading-tight text-center">
                {QUESTIONS[step - 1].question}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {QUESTIONS[step - 1].options.map((option, index) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(option.text)}
                      className="group flex flex-col items-center justify-center p-6 text-center bg-white rounded-2xl border-2 border-purple-100 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-200 mb-4">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-medium text-slate-700 group-hover:text-purple-900">
                        {option.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* FORM STEP 5: LOADING */}
          {mode === 'form' && step === QUESTIONS.length + 1 && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center space-y-8 bg-white/60 backdrop-blur-xl p-12 rounded-3xl shadow-xl border border-white/50 flex flex-col items-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-pink-400 blur-xl opacity-50 rounded-full animate-pulse" />
                <Wand2 className="w-16 h-16 text-purple-600 animate-bounce relative z-10" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-serif font-bold text-slate-800">
                  La magia está ocurriendo...
                </h2>
                <p className="text-slate-500 font-medium">
                  Buscando en los rincones de Todopolis tu producto perfecto.
                </p>
              </div>
            </motion.div>
          )}

          {/* FORM STEP 6: RESULT */}
          {mode === 'form' && step === QUESTIONS.length + 2 && recommendation && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, type: 'spring' }}
              className="bg-white/80 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl shadow-2xl border border-white/60 overflow-hidden relative"
            >
              {/* Confetti/Sparkles effect behind content */}
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-100 to-transparent opacity-50 pointer-events-none" />
              
              <div className="relative z-10 text-center space-y-6">
                <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-pink-100 text-pink-700 font-bold text-sm tracking-wide uppercase mb-2">
                  ¡Tu Match Perfecto! ✨
                </div>
                
                <h2 className="text-4xl sm:text-5xl font-serif font-bold text-slate-900 leading-tight">
                  {recommendation.productName}
                </h2>
                
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
                  {formatPrice(recommendation.priceCOP)}
                </div>

                <div className="bg-purple-50/80 rounded-2xl p-6 text-left space-y-4 border border-purple-100">
                  <div>
                    <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider mb-2 flex items-center">
                      <Star className="w-4 h-4 mr-2 text-purple-500" />
                      Por qué te encantará
                    </h3>
                    <p className="text-slate-700 leading-relaxed">
                      {recommendation.description}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-purple-200/50">
                    <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider mb-2 flex items-center">
                      <Heart className="w-4 h-4 mr-2 text-pink-500" />
                      Nuestra razón mágica
                    </h3>
                    <p className="text-slate-600 italic">
                      &quot;{recommendation.reason}&quot;
                    </p>
                  </div>
                </div>

                <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="flex-1 inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-slate-900 rounded-full hover:bg-slate-800 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Comprar Ahora
                  </button>
                  <button 
                    onClick={() => setMode('welcome')}
                    className="inline-flex items-center justify-center px-8 py-4 font-bold text-slate-700 transition-all duration-200 bg-white border-2 border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Volver al inicio
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
