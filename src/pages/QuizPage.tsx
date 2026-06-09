import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import QuestionMedia from '../components/QuestionMedia';
import { quizService } from '../services/quizService';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle, Clock, Home } from 'lucide-react';

const QUIZ_CONTENT_VERSION = "2026-06-05-latest-media-v3";

const clearOldQuizCacheForAccessCode = (accessCode: string) => {
  if (!accessCode) return;
  
  const toRemoveLocal = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(accessCode) && !key.includes(QUIZ_CONTENT_VERSION)) {
      toRemoveLocal.push(key);
    }
  }
  toRemoveLocal.forEach(k => localStorage.removeItem(k));

  const toRemoveSession = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key === 'cim2026_active_quiz_session') {
      toRemoveSession.push(key);
    } else if (key && key.includes(accessCode) && !key.includes(QUIZ_CONTENT_VERSION)) {
      toRemoveSession.push(key);
    }
  }
  toRemoveSession.forEach(k => sessionStorage.removeItem(k));
};

const clearAllQuizCacheForAccessCode = (accessCode: string) => {
  if (!accessCode) return;
  const toRemoveLocal = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === 'cim2026_active_quiz_session' || (key && key.includes(accessCode))) {
      toRemoveLocal.push(key);
    }
  }
  toRemoveLocal.forEach(k => localStorage.removeItem(k));

  const toRemoveSession = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key === 'cim2026_active_quiz_session' || (key && key.includes(accessCode))) {
      toRemoveSession.push(key);
    }
  }
  toRemoveSession.forEach(k => sessionStorage.removeItem(k));
};

export default function QuizPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = (location.state || {}) as { accessCode?: string; studentData?: any };

  // Helper getters to fallback to legacy cache gracefully for users answering right now
  const getActiveSessionKey = (ac: string) => `quiz_session_${ac}_${QUIZ_CONTENT_VERSION}`;

  const persistedSession = (() => {
    try {
      // Find matching session in new versioned keys
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('quiz_session_') && key.includes(QUIZ_CONTENT_VERSION)) {
          return JSON.parse(sessionStorage.getItem(key) || 'null');
        }
      }
      // Fallback
      const saved = sessionStorage.getItem('cim2026_active_quiz_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();
  const accessCode = routeState.accessCode || persistedSession?.accessCode || '';
  const studentData = routeState.studentData || persistedSession?.studentData || null;

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Memuatkan kuiz...');
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!accessCode || !studentData) return;

    try {
      sessionStorage.setItem(getActiveSessionKey(accessCode), JSON.stringify({ accessCode, studentData }));
    } catch (err) {
      console.warn('Unable to persist active quiz session:', err);
    }
  }, [accessCode, studentData]);

  useEffect(() => {
    if (!accessCode) return;
    const initQuiz = async () => {
      try {
        setLoadingText('Memuatkan soalan terkini...');
        // FIRST: Validate attempt state to know if we arrived here fresh or resuming
        const dbState = await quizService.validateAccessCode(accessCode);
        const isFreshAttempt = !dbState.started_at && !dbState.completed_at && !dbState.is_completed;

        if (isFreshAttempt) {
          // If the attempt has truly never started, clean up old cache safely
          clearOldQuizCacheForAccessCode(accessCode);
        }

        const startData = await quizService.startQuiz(accessCode);
        const qData = await quizService.getQuestions(accessCode);
        
        if (!qData || qData.length === 0) {
          throw new Error('Tiada soalan ditemui.');
        }

        // Fisher-Yates Shuffling Helper
        const shuffleArray = <T,>(array: T[]): T[] => {
          const arr = [...array];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        };

        // Determine Cache Keys
        const oldShuffleKey = `cim2026_shuffled_questions_${accessCode}`;
        const newShuffleKey = `quiz_sequence_${accessCode}_${QUIZ_CONTENT_VERSION}`;
        
        // Use old key ONLY if we are resuming and it actually exists. Default to new key.
        const sessionShuffleKey = (!isFreshAttempt && sessionStorage.getItem(oldShuffleKey)) 
          ? oldShuffleKey 
          : newShuffleKey;

        // Stable Randomization cache per participant access code
        let finalQuestions = [];
        const cachedShuffled = sessionStorage.getItem(sessionShuffleKey);

        if (cachedShuffled) {
          try {
            finalQuestions = JSON.parse(cachedShuffled);
          } catch (e) {
            console.error('Failed to parse cached shuffled questions:', e);
          }
        }

        if (!finalQuestions || finalQuestions.length === 0) {
          // Shuffle question order
          const shuffledQs = shuffleArray(qData);

          // Shuffle answer options for each question independently
          finalQuestions = shuffledQs.map((q: any) => {
            if (q.options && Array.isArray(q.options)) {
              return {
                ...q,
                options: shuffleArray(q.options)
              };
            }
            return q;
          });

          // Store shuffled state for page refresh stability
          try {
            sessionStorage.setItem(sessionShuffleKey, JSON.stringify(finalQuestions));
          } catch (cacheErr) {
            console.warn('Failed to cache shuffled questions in sessionStorage:', cacheErr);
          }
        }

        setQuestions(finalQuestions);

        // Load saved answers from localStorage if available
        const oldAnswersKey = `cim2026_answers_${accessCode}`;
        const newAnswersKey = `quiz_answers_${accessCode}_${QUIZ_CONTENT_VERSION}`;
        const storageKey = (!isFreshAttempt && localStorage.getItem(oldAnswersKey)) 
          ? oldAnswersKey 
          : newAnswersKey;
          
        const savedDataStr = localStorage.getItem(storageKey);
        let loadedAnswers: Record<string, number> = {};
        if (savedDataStr) {
          try {
            const parsed = JSON.parse(savedDataStr);
            if (parsed && typeof parsed === 'object' && parsed.accessCode === accessCode && parsed.answers) {
              setAnswers(parsed.answers);
              loadedAnswers = parsed.answers;
            } else {
              localStorage.removeItem(storageKey);
            }
          } catch (e) {
            console.error('Failed to parse saved answers from localStorage:', e);
            localStorage.removeItem(storageKey);
          }
        }
        
        // Calculate remaining time safely based on started_at
        const startedAt = new Date(startData.out_started_at).getTime();
        const durationMs = startData.out_duration_seconds * 1000;
        const endTime = startedAt + durationMs;
        const now = new Date().getTime();
        let remaining = Math.floor((endTime - now) / 1000);
        
        if (remaining <= 0) {
          remaining = 0;
          setTimeLeft(0);
          setError('Masa menjawab telah tamat.');
          
          // Auto submit whatever was answered/loaded
          setIsSubmitting(true);
          try {
            const formattedAnswers = Object.entries(loadedAnswers).map(([qId, oIdx]) => ({
              question_id: qId,
              selected_option_index: oIdx as number
            }));
            const res = await quizService.submitQuiz(accessCode, formattedAnswers);
            clearAllQuizCacheForAccessCode(accessCode);
            navigate('/result', { state: { studentData, result: res } });
            return;
          } catch (submitErr) {
            console.error('Automatic submission failed on expired quiz', submitErr);
          }
        } else {
          setTimeLeft(remaining);
        }
      } catch (err: any) {
        setError(err.message || 'Gagal memuatkan kuiz.');
      } finally {
        setLoading(false);
      }
    };

    initQuiz();
  }, [accessCode]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz(true);
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitting]);

  // Scroll to layout top on index change for smooth UX
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitting) return;
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionId]: optionIndex };
      
      // Save instantly to localStorage
      // Fallback gracefully: if the legacy key exists (continuing session), use it. Else use new key
      const oldKey = `cim2026_answers_${accessCode}`;
      const newKey = `quiz_answers_${accessCode}_${QUIZ_CONTENT_VERSION}`;
      const storageKey = localStorage.getItem(oldKey) ? oldKey : newKey;

      try {
        const saveData = {
          accessCode,
          savedAt: new Date().toISOString(),
          answers: newAnswers
        };
        localStorage.setItem(storageKey, JSON.stringify(saveData));
      } catch (err) {
        console.error('Failed to autosave answers to localStorage:', err);
      }
      return newAnswers;
    });
  };

  const onClickSubmitHandler = () => {
    if (isSubmitting) return;
    const answeredCount = questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== null).length;
    const hasUnanswered = answeredCount < questions.length;
    if (hasUnanswered) {
      setShowWarningModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const formattedAnswers = Object.entries(answers).map(([qId, oIdx]) => ({
        question_id: qId,
        selected_option_index: oIdx as number
      }));

      const res = await quizService.submitQuiz(accessCode, formattedAnswers);
      
      // Success: delete saved answers from localStorage and cached session
      clearAllQuizCacheForAccessCode(accessCode);

      navigate('/result', { state: { studentData, result: res } });
    } catch (err: any) {
      console.error('Submission error:', err);
      const errMsg = err.message || '';
      if (errMsg.includes('TIME_EXPIRED') || errMsg.includes('tamat') || timeLeft === 0) {
        setSubmitError('Masa menjawab telah tamat.');
      } else {
        setSubmitError('Gagal menghantar kuiz. Sila cuba semula.');
      }
      setIsSubmitting(false);
    }
  };

  const handleSubmitQuiz = async (force: boolean = false) => {
    if (force) {
      setIsSubmitting(true);
      try {
        const formattedAnswers = Object.entries(answers).map(([qId, oIdx]) => ({
          question_id: qId,
          selected_option_index: oIdx as number
        }));

        const res = await quizService.submitQuiz(accessCode, formattedAnswers);
        
        // Success: delete saved answers from localStorage and session
        clearAllQuizCacheForAccessCode(accessCode);

        navigate('/result', { state: { studentData, result: res } });
      } catch (err: any) {
        console.error('Forced submission error:', err);
        const errMsg = err.message || '';
        if (errMsg.includes('TIME_EXPIRED') || errMsg.includes('tamat') || force) {
          setSubmitError('Masa menjawab telah tamat.');
        } else {
          setSubmitError('Gagal menghantar kuiz secara automatik. Sila cuba semula.');
        }
        setIsSubmitting(false);
      }
    } else {
      onClickSubmitHandler();
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'j ' : ''}${m}m ${s}s`;
  };

  if (!accessCode) return <Navigate to="/login" replace />;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      <span className="text-slate-600 font-semibold">{loadingText}</span>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
       <div className="bg-white p-8 rounded-2xl border border-red-200 text-center text-red-600 shadow-sm max-w-md w-full">
         <p className="font-semibold text-lg mb-4">{error}</p>
         <button
           onClick={() => navigate('/')}
           className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
         >
           Kembali ke Laman Utama
         </button>
       </div>
    </div>
  );

  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== null).length;
  const hasUnanswered = answeredCount < questions.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      
      {/* Top Bar for Quiz */}
      <div className="bg-white sticky top-0 z-10 border-b shadow-xs">
        <div className="max-w-5xl mx-auto p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (window.confirm('Adakah anda pasti mahu kembali ke Laman Utama? Semua kemajuan kuiz semasa akan disimpan pada peranti ini, tetapi anda mesti log masuk semula untuk menyambung.')) {
                  navigate('/');
                }
              }}
              className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4 mr-1" /> Keluar
            </button>
            <div className="hidden sm:block h-4 w-[1px] bg-slate-200"></div>
            <div className="font-semibold text-slate-700">Soalan {currentIndex + 1} / {questions.length}</div>
          </div>
          <div className="flex items-center text-lg font-bold text-red-600 bg-red-50 px-4 py-2 rounded-lg font-mono">
            <Clock className="w-5 h-5 mr-2" />
            {timeLeft !== null ? formatTime(timeLeft) : '--'}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6">
        {/* Main Question Area */}
        <div className="flex-1">
          <div className="mb-4 bg-amber-50 border border-amber-250 rounded-xl px-4 py-2.5 text-xs text-slate-700 flex items-center gap-2 font-semibold">
            <span className="font-bold text-amber-900 shrink-0">⚠️ Peringatan:</span>
            <span>Sesi menjawab akan tamat sepenuhnya pada jam 6.00 petang. Sila pastikan kuiz dihantar sebelum waktu tamat.</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-4">
              {currentQuestion.category}
            </span>
            <h2 className="text-xl sm:text-2xl font-medium text-slate-800 leading-relaxed mb-6">
              {currentIndex + 1}. {currentQuestion.text}
            </h2>

            <QuestionMedia 
              key={`${currentQuestion.id}-${currentQuestion.media_url || ''}`}
              mediaType={currentQuestion.media_type} 
              mediaUrl={currentQuestion.media_url} 
              caption={currentQuestion.media_caption} 
            />

            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((opt: any) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(currentQuestion.id, opt.option_index)}
                  disabled={isSubmitting}
                  className={`w-full text-left p-4 rounded-xl border-2 transition ${
                    answers[currentQuestion.id] === opt.option_index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                      answers[currentQuestion.id] === opt.option_index ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300'
                    }`}>
                      {answers[currentQuestion.id] === opt.option_index && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    <span className="text-slate-700 text-lg">{opt.option_text}</span>
                  </div>
                </button>
              ))}
            </div>

            {submitError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-600 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-200">
                <span>{submitError}</span>
                <button onClick={() => setSubmitError('')} className="text-red-800 hover:text-red-955 font-bold ml-2">×</button>
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0 || isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl font-semibold transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 mr-1" /> Kembali
              </button>
              
              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-45 rounded-xl font-semibold transition shadow-sm cursor-pointer"
                >
                  Seterusnya <ArrowRight className="w-5 h-5 ml-1" />
                </button>
              ) : (
                <div className="w-full sm:w-auto flex flex-col items-center sm:items-end">
                  <button
                    onClick={onClickSubmitHandler}
                    disabled={isSubmitting || hasUnanswered}
                    className={`w-full sm:px-8 py-3 rounded-xl font-bold text-lg text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                      hasUnanswered
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    <CheckCircle className="w-5 h-5" /> Hantar Kuiz
                  </button>
                  {hasUnanswered && (
                    <span className="text-xs text-red-500 font-semibold mt-1.5 text-right w-full block">
                      Jawab semua soalan sebelum menghantar kuiz.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Question Nav */}
        <div className="md:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-24">
            <h3 className="font-semibold text-slate-700 mb-2 text-center">Navigasi Soalan</h3>
            <p className="text-xs text-slate-400 mb-4 text-center">
              Dijawab: <span className="font-bold text-slate-700">{answeredCount}</span> / {questions.length}
            </p>
            <div className="grid grid-cols-5 gap-2 max-h-[460px] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                return (
                  <button
                    key={q.id}
                    onClick={() => !isSubmitting && setCurrentIndex(idx)}
                    disabled={isSubmitting}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer ${
                      currentIndex === idx 
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 ring-offset-1 z-10'
                        : isAnswered
                          ? 'bg-green-600 text-white border border-green-750'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="warning-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-xl">
              ⚠️
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Soalan Belum Lengkap</h3>
            <p className="text-slate-650 text-sm mb-6 leading-relaxed">
              Masih ada soalan belum dijawab. Sila lengkapkan semua soalan dahulu.
            </p>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition duration-150 cursor-pointer shadow-xs"
            >
              Kembali Menjawab
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="confirm-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Hantar Kuiz?</h3>
            <p className="text-slate-650 text-sm mb-6 leading-relaxed">
              Pastikan semua jawapan telah disemak. Selepas dihantar, jawapan tidak boleh diubah.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="w-full sm:order-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition duration-150 cursor-pointer"
              >
                Semak Semula
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmModal(false);
                  await handleFinalSubmit();
                }}
                disabled={isSubmitting}
                className="w-full sm:order-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Menghantar...
                  </>
                ) : (
                  'Ya, Hantar Kuiz'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
