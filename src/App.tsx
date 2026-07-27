import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Download, MessageCircle, X } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import StudentLoginPage from './pages/StudentLoginPage';
import QuizInstructionsPage from './pages/QuizInstructionsPage';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import CheckCertificatePage from './pages/CheckCertificatePage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import RegistrationPage from './pages/RegistrationPage';
import RegistrationStatusPage from './pages/RegistrationStatusPage';

function AppContent() {
  const location = useLocation();
  const [showAnnouncement, setShowAnnouncement] = React.useState(true);
  const shouldShowAnnouncement = location.pathname === '/' && showAnnouncement;

  React.useEffect(() => {
    if (!shouldShowAnnouncement) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldShowAnnouncement]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<StudentLoginPage />} />
        <Route path="/instructions" element={<QuizInstructionsPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/certificate" element={<CheckCertificatePage />} />
        <Route path="/registration" element={<RegistrationPage />} />
        <Route path="/registration/status" element={<RegistrationStatusPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      </Routes>

      {shouldShowAnnouncement && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="certificate-announcement-title"
        >
          <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-white/20 bg-white shadow-[0_30px_90px_-20px_rgba(15,23,42,0.65)] sm:rounded-[2rem]">
            <button
              type="button"
              onClick={() => setShowAnnouncement(false)}
              className="absolute right-3 top-3 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-md transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:right-5 sm:top-5"
              aria-label="Tutup makluman"
              title="Tutup"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="shrink-0 bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-800 px-5 pb-6 pt-7 text-center text-white sm:px-12 sm:pb-8 sm:pt-9">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-inner sm:h-14 sm:w-14">
                <Download className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-blue-200 sm:text-xs">
                Makluman Rasmi Cabaran Interaktif Minda 2026
              </p>
              <h2
                id="certificate-announcement-title"
                className="px-8 text-xl font-black uppercase leading-tight tracking-tight sm:px-12 sm:text-3xl"
              >
                Sijil Boleh Mula Dimuat Turun Sekarang
              </h2>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-9 sm:py-7">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-6">
                <p className="text-[12px] font-bold uppercase leading-6 text-slate-700 sm:text-[13px] sm:leading-7">
                  Atas permintaan dari kebanyakan sekolah dan nasihat dari pihak PPD, pihak penganjur akan membuka akses muat turun sijil sementara menunggu Surat Pengiktirafan PAJSK dari BSKK. Akses untuk muat turun sijil akan dibuka sehingga <span className="font-black text-blue-950">31 Ogos 2026</span>.
                </p>
                <p className="mt-4 text-[12px] font-bold uppercase leading-6 text-slate-700 sm:text-[13px] sm:leading-7">
                  Surat Pengiktirafan PAJSK akan dihantar ke Group Community WhatsApp Cabaran Interaktif Minda 2026 Rasmi dan boleh dimuat turun di sana. Kepada yang belum sertai, boleh klik pautan yang disediakan. Bagi yang sudah sertai, tunggu makluman berkaitan surat nanti di dalam Group Community.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                  href="https://chat.whatsapp.com/JlC0LfB61lqEOgiiuSmwWL"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-center text-[11px] font-black uppercase leading-4 tracking-wide text-white shadow-md shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                >
                  <MessageCircle className="h-5 w-5 shrink-0" />
                  Group Community WhatsApp 1
                </a>
                <a
                  href="https://chat.whatsapp.com/JIEnBC8vgsJBEdKpM5TxH7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-center text-[11px] font-black uppercase leading-4 tracking-wide text-white shadow-md shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                >
                  <MessageCircle className="h-5 w-5 shrink-0" />
                  Group Community WhatsApp 2
                </a>
              </div>

              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-center sm:px-6">
                <p className="text-[11px] font-black uppercase leading-5 tracking-wide text-red-800 sm:text-xs sm:leading-6">
                  Tolong sertai salah satu sahaja bagi memberi ruang kepada guru pengiring, ibu bapa atau penjaga yang lain untuk sertai bagi mendapatkan makluman.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
