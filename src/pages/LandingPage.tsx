import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Settings, LogIn, FileText, Info, UserPlus, Search } from 'lucide-react';
import { BRANDING } from '../constants/branding';
import { quizService } from '../services/quizService';
import { registrationService } from '../services/registrationService';
import { motion } from 'motion/react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [top5, setTop5] = React.useState<any[] | null>(null);
  const [loadingTop5, setLoadingTop5] = React.useState(true);
  const [regSettings, setRegSettings] = React.useState<{ is_open: boolean; loading: boolean }>({
    is_open: true,
    loading: true
  });
  const [showClosedModal, setShowClosedModal] = React.useState(false);

  React.useEffect(() => {
    const fetchTop5 = async () => {
      try {
        const data = await quizService.getPublicTop5();
        setTop5(data || []);
      } catch (e) {
        console.error('Failed to load top 5:', e);
        setTop5([]);
      } finally {
        setLoadingTop5(false);
      }
    };
    fetchTop5();
  }, []);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await registrationService.getRegistrationSettings();
        setRegSettings({
          is_open: settings.is_open,
          loading: false
        });
      } catch (err) {
        console.error('Failed to load settings:', err);
        setRegSettings({
          is_open: true, // fallback to open, DB trigger protects anyway
          loading: false
        });
      }
    };
    fetchSettings();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: 'spring', 
        stiffness: 100, 
        damping: 15 
      } 
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50 font-sans text-slate-900 relative">
      <main className="flex-1 flex flex-col items-center justify-center relative w-full px-4 py-8 overflow-hidden">
        
        {/* Hero Logos (Vertically Stacked: CIM 2026 above, Logo Unit Koku below - perfectly centered and borderless) */}
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="z-10 text-center mb-6 mt-6 px-6 py-4 flex flex-col items-center justify-center bg-transparent relative"
        >
          <div className="flex flex-col items-center justify-center gap-4 sm:gap-5">
            <motion.img 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              src="https://i.postimg.cc/bJ9vLS0y/CIM-2026.png" 
              alt="Cabaran Interaktif Minda Tahun 2026" 
              className="h-32 sm:h-38 md:h-46 w-auto object-contain transition-all duration-300 mix-blend-multiply drop-shadow-sm hover:drop-shadow-md cursor-pointer"
              referrerPolicy="no-referrer"
            />
            <motion.img 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              src="https://i.postimg.cc/BvxBDPvw/Logo-Unit-Koku.png" 
              alt="Logo Unit Kokurikulum" 
              className="h-12 sm:h-16 md:h-20 w-auto object-contain transition-all duration-300 mix-blend-multiply drop-shadow-xs"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        {/* System Stats (Centered Highlight Strip) */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="z-10 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-8 md:gap-12 text-slate-450 font-bold uppercase tracking-widest text-[10px] sm:text-[10px] mb-8 mx-auto w-full max-w-sm sm:max-w-4xl px-4"
        >
          <div className="bg-white/95 sm:bg-transparent p-3.5 sm:p-0 rounded-[1.25rem] flex-1 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] sm:shadow-none border border-slate-200/80 sm:border-none backdrop-blur-sm sm:backdrop-blur-none">
            <span className="text-blue-950 text-base sm:text-lg md:text-xl mb-0.5 font-black leading-tight font-sans tracking-tight">27 JUN 2026</span>
            TARIKH PROGRAM
          </div>
          <div className="hidden sm:block w-[1px] bg-slate-200 h-10 mt-1"></div>
          <div className="bg-white/95 sm:bg-transparent p-3.5 sm:p-0 rounded-[1.25rem] flex-1 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] sm:shadow-none border border-slate-200/80 sm:border-none backdrop-blur-sm sm:backdrop-blur-none">
            <span className="text-blue-950 text-base sm:text-lg md:text-xl mb-0.5 font-black leading-tight font-sans tracking-tight">08:00 – 18:00</span>
            <span className="text-blue-600 font-extrabold text-[10px] sm:text-[11px] mb-0.5 uppercase tracking-widest">ATAS TALIAN</span>
            MASA MENJAWAB
          </div>
          <div className="hidden sm:block w-[1px] bg-slate-200 h-10 mt-1"></div>
          <div className="bg-white/95 sm:bg-transparent p-3.5 sm:p-0 rounded-[1.25rem] flex-1 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] sm:shadow-none border border-slate-200/80 sm:border-none backdrop-blur-sm sm:backdrop-blur-none">
            <span className="text-blue-950 text-base sm:text-lg md:text-xl mb-0.5 font-black leading-tight font-sans tracking-tight">120 MINIT (2 JAM)</span>
            TEMPOH KUIZ
          </div>
        </motion.div>

        {/* Action Grid wrapper with Absolute Background watermark aligned strictly behind the 4 action cards */}
        <div className="relative w-full max-w-4xl z-10 pb-6 flex justify-center items-center">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] select-none pointer-events-none overflow-hidden z-0">
            <span 
              className="text-[17rem] sm:text-[25rem] md:text-[35rem] font-sans font-black tracking-[0.12em] text-blue-950"
              style={{ 
                WebkitTextStroke: '2px #1e3a8a',
              }}
            >
              CIM
            </span>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full relative z-10 px-4"
          >
            {/* Pendaftaran Sekolah/Peserta */}
            <motion.div 
              variants={itemVariants}
              whileHover={regSettings.is_open ? { y: -8, scale: 1.015, borderColor: '#10b981', boxShadow: '0 25px 45px -15px rgba(16, 185, 129, 0.14)' } : {}}
              whileTap={regSettings.is_open ? { scale: 0.995 } : {}}
              onClick={() => {
                if (regSettings.loading || !regSettings.is_open) return;
                navigate('/registration');
              }}
              className={`bg-white/95 p-7 sm:p-8 rounded-[2rem] border shadow-[0_15px_35px_-8px_rgba(0,0,0,0.02)] group cursor-pointer flex flex-col items-center text-center transition-all duration-300 bg-gradient-to-b from-white to-slate-50/10 relative ${
                regSettings.is_open 
                  ? 'border-slate-200/80 hover:border-emerald-400' 
                  : 'border-slate-200/50 opacity-80 cursor-default'
              }`}
              id="register-card"
            >
              {/* Badge "Pendaftaran Ditutup" */}
              {!regSettings.is_open && !regSettings.loading && (
                <div className="absolute top-4 right-4 bg-red-100 text-red-750 text-[9px] font-extrabold uppercase px-3 py-1 rounded-full border border-red-200 shadow-xs tracking-wider">
                  Ditutup Sementara
                </div>
              )}

              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ring-4 border transition-all duration-300 shadow-[0_4px_12px_rgba(16,185,129,0.05)] ${
                regSettings.is_open
                  ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-600 ring-emerald-50 border-emerald-100/85 group-hover:scale-110 group-hover:from-emerald-600 group-hover:to-emerald-500 group-hover:text-white'
                  : 'bg-slate-100 text-slate-400 ring-slate-50 border-slate-200'
              }`}>
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="text-[19px] font-black text-slate-800 mb-2 transition-colors duration-300 font-sans tracking-tight group-hover:text-emerald-950">
                Pendaftaran Sekolah / Peserta
              </h3>
              <p className="text-[12px] text-slate-450 font-medium leading-relaxed mb-4 flex-1 px-3">
                Butiran sekolah, pendaftaran maklumat guru pengiring, serta pendaftaran kelompok calon penilaian minda.
              </p>

              {/* Display small note if open or closed */}
              {regSettings.is_open ? (
                <p className="text-[10px] text-emerald-600/70 font-semibold mb-3 leading-normal max-w-sm px-2">
                  Pendaftaran ditutup pada 19 Jun 2026 jam 1800 atau lebih awal sekiranya sasaran peserta telah dicapai.
                </p>
              ) : (
                <div className="mb-4 max-w-sm px-2 bg-red-50 border border-red-100 rounded-2xl py-3">
                  <p className="text-[11px] text-red-700 font-black leading-normal uppercase tracking-wide">
                    Pendaftaran ditutup sementara.
                  </p>
                  <p className="text-[10px] text-slate-600 font-bold leading-normal mt-1">
                    Sila hubungi admin melalui WhatsApp pada nombor tertera.
                  </p>
                  <p className="text-[13px] text-red-700 font-black leading-tight mt-2">
                    016-202 2921
                  </p>
                  <p className="text-[10px] text-slate-500 font-extrabold leading-normal mt-0.5 uppercase tracking-widest">
                    Cikgu Asraf
                  </p>
                </div>
              )}

              <motion.button 
                whileHover={regSettings.is_open ? { translateY: -2, boxShadow: '0 8px 25px rgba(16,185,129,0.3)' } : {}}
                whileTap={regSettings.is_open ? { scale: 0.98 } : {}}
                className={`w-full py-3.5 text-white rounded-2xl font-extrabold text-[11px] uppercase tracking-wider transition-all duration-300 border ${
                  regSettings.is_open
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:opacity-95 shadow-md shadow-emerald-600/10 hover:shadow-emerald-500/25 border-emerald-500/10 cursor-pointer rounded-full'
                    : 'bg-red-600 border-red-500 text-white cursor-default shadow-sm shadow-red-600/10 pointer-events-none'
                }`}
                id="btn-register"
                disabled={!regSettings.is_open}
                onClick={(e) => {
                  if (!regSettings.is_open) {
                    e.stopPropagation();
                  }
                }}
              >
                {regSettings.loading ? (
                  "Memuatkan..."
                ) : regSettings.is_open ? (
                  "Daftar Sekarang"
                ) : (
                  <span className="flex flex-col items-center justify-center leading-tight normal-case tracking-normal">
                    <span className="uppercase tracking-wider text-[11px]">Pendaftaran Ditutup Sementara</span>
                    <span className="text-[10px] font-bold mt-1">WhatsApp Admin: 016-202 2921</span>
                    <span className="text-[10px] font-bold">Cikgu Asraf</span>
                  </span>
                )}
              </motion.button>
            </motion.div>

            {/* Semak Status Pendaftaran */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.015, borderColor: '#6366f1', boxShadow: '0 25px 45px -15px rgba(99, 102, 241, 0.14)' }}
              whileTap={{ scale: 0.995 }}
              onClick={() => navigate('/registration/status')}
              className="bg-white/95 p-7 sm:p-8 rounded-[2rem] border border-slate-200/80 shadow-[0_15px_35px_-8px_rgba(0,0,0,0.02)] hover:border-indigo-400 group cursor-pointer flex flex-col items-center text-center transition-all duration-300 bg-gradient-to-b from-white to-slate-50/10"
              id="status-card"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl flex items-center justify-center mb-5 text-indigo-600 ring-4 ring-indigo-50 border border-indigo-100/85 group-hover:scale-110 group-hover:from-indigo-600 group-hover:to-indigo-500 group-hover:text-white transition-all duration-300 shadow-[0_4px_12px_rgba(99,102,241,0.05)]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-[19px] font-black text-slate-800 mb-2 transition-colors duration-300 group-hover:text-indigo-950 font-sans tracking-tight">Semak Status Pendaftaran</h3>
              <p className="text-[12px] text-slate-450 font-medium leading-relaxed mb-6 flex-1 px-3">Semak status pembayaran pendaftaran sekolah, muat turun slip rasmi, dan rujukan senarai kod akses pelajar.</p>
              <motion.button 
                whileHover={{ translateY: -2, boxShadow: '0 8px 25px rgba(99,102,241,0.3)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 hover:opacity-95 text-white rounded-full font-extrabold text-[11px] uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/25 border border-indigo-500/10" 
                id="btn-status"
              >
                Semak Pengesahan
              </motion.button>
            </motion.div>

            {/* Portal Calon */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.015, borderColor: '#1e3a8a', boxShadow: '0 25px 45px -15px rgba(30, 58, 138, 0.14)' }}
              whileTap={{ scale: 0.995 }}
              onClick={() => navigate('/login')}
              className="bg-white/95 p-7 sm:p-8 rounded-[2rem] border border-slate-200/80 shadow-[0_15px_35px_-8px_rgba(0,0,0,0.02)] hover:border-blue-700 group cursor-pointer flex flex-col items-center text-center transition-all duration-300 bg-gradient-to-b from-white to-slate-50/10"
              id="portal-calon-card"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl flex items-center justify-center mb-5 text-blue-600 ring-4 ring-blue-50 border border-blue-100/85 group-hover:scale-110 group-hover:from-blue-900 group-hover:to-blue-800 group-hover:text-white transition-all duration-300 shadow-[0_4px_12px_rgba(30,58,138,0.05)]">
                <LogIn className="w-6 h-6" />
              </div>
              <h3 className="text-[19px] font-black text-slate-800 mb-2 transition-colors duration-300 group-hover:text-blue-950 font-sans tracking-tight">Portal Calon (Mula Jawab)</h3>
              <p className="text-[12px] text-slate-450 font-medium leading-relaxed mb-4 flex-1 px-3">Gunakan kod akses murid unik yang dibekalkan oleh guru pengiring anda untuk mula menjawab kuiz interaktif terpilih.</p>
              <p className="text-[10px] text-blue-600/80 font-bold mb-3 leading-normal max-w-sm px-2">
                Sesi menjawab bermula Jam 0800 hingga Jam 1800.
              </p>
              <motion.button 
                whileHover={{ translateY: -2, boxShadow: '0 8px 25px rgba(30,58,138,0.3)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 hover:opacity-95 text-white rounded-full font-extrabold text-[11px] uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md shadow-blue-950/15 hover:shadow-blue-900/25 border border-blue-900/10 font-sans" 
                id="btn-portal-calon"
              >
                Mula Kuiz
              </motion.button>
            </motion.div>

            {/* Semak Sijil */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.015, borderColor: '#d97706', boxShadow: '0 25px 45px -15px rgba(217, 119, 6, 0.14)' }}
              whileTap={{ scale: 0.995 }}
              onClick={() => navigate('/certificate')}
              className="bg-white/95 p-7 sm:p-8 rounded-[2rem] border border-slate-200/80 shadow-[0_15px_35px_-8px_rgba(0,0,0,0.02)] hover:border-amber-400 group cursor-pointer flex flex-col items-center text-center transition-all duration-300 bg-gradient-to-b from-white to-slate-50/10"
              id="semak-sijil-card"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl flex items-center justify-center mb-5 text-amber-600 ring-4 ring-amber-50 border border-amber-100/85 group-hover:scale-110 group-hover:from-amber-500 group-hover:to-amber-400 group-hover:text-white transition-all duration-300 shadow-[0_4px_12px_rgba(217,119,6,0.05)]">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-[19px] font-black text-slate-800 mb-2 transition-colors duration-300 group-hover:text-amber-950 font-sans tracking-tight">Semak Sijil & Keputusan</h3>
              <p className="text-[12px] text-slate-450 font-medium leading-relaxed mb-6 flex-1 px-3">Semak keputusan markah kuiz anda dengan segera dan muat turun Sijil Penyertaan & e-Sijil Pencapaian rasmi.</p>
              <motion.button 
                whileHover={{ translateY: -2, boxShadow: '0 8px 25px rgba(217,119,6,0.3)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-450 to-orange-500 hover:opacity-95 text-white rounded-full font-extrabold text-[11px] uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md shadow-amber-550/10 hover:shadow-amber-500/25 border border-amber-500/10" 
                id="btn-semak-sijil"
              >
                Semak Keputusan
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* Info Note (Premium Left Block Accent style) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="z-10 w-full max-w-4xl px-4 mb-8"
        >
          <div className="flex items-start gap-4 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[1.75rem] p-5 sm:p-6 text-slate-600 text-xs shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-[5px] h-full bg-blue-600 rounded-l-full"></div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 text-blue-600 border border-blue-105 shadow-xs">
              <Info className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-blue-950 font-bold mb-1 text-[11px] uppercase tracking-widest leading-none">Nota Pendaftaran & Penyertaan</p>
              <p className="font-medium text-slate-500 leading-relaxed sm:text-[13px]">
                Setiap sekolah disyorkan menggunakan satu pendaftaran berkelompok sahaja melalui butang <span className="text-emerald-600 font-bold">Daftar Sekarang</span> di atas. Selepas pembayaran disahkan oleh pihak penganjur, guru pengiring boleh mendapatkan senarai kod akses murid di dalam menu <span className="text-indigo-600 font-bold">Semak Status Pendaftaran</span> menggunakan nombor rujukan & nombor telefon guru yang didaftarkan.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Top 5 Section (Premium structured standings with Gold/Silver/Bronze medal labels) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="z-10 w-full max-w-3xl px-4 mb-12"
        >
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-[0_15px_40px_-15px_rgba(30,41,59,0.05)] p-6 sm:p-8 bg-gradient-to-b from-white to-slate-50/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-100/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-105 rounded-full blur-2xl pointer-events-none"></div>
            
            <h3 className="text-lg font-black text-slate-850 mb-6 flex items-center justify-between pb-3 border-b border-slate-100 font-sans tracking-tight">
              <span className="flex items-center gap-2.5">
                <span className="text-xl">🏆</span> Kedudukan Top 5 Sekolah/Peserta Terbaik
              </span>
              <span className="text-[9px] text-blue-800 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">Public Standings</span>
            </h3>
            
            {loadingTop5 ? (
              <div className="text-slate-400 text-xs italic text-center py-8">
                Sedang memuat keputusan Top 5...
              </div>
            ) : !top5 || top5.length === 0 ? (
              <p className="text-slate-500 text-sm italic text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80 font-medium">
                Keputusan Top 5 akan dipaparkan selepas tempoh kuiz tamat.
              </p>
            ) : (
              <div className="space-y-3 relative z-10">
                {top5.map((student: any, idx: number) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(239, 246, 255, 0.35)', borderLeftColor: '#2563eb' }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white hover:shadow-xs rounded-2xl border-l-[3px] border-l-transparent border-t border-r border-b border-slate-100/80 transition-all duration-250 font-sans"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-xs border ${
                        idx === 0 
                          ? 'bg-gradient-to-br from-amber-100 to-yellow-250 text-amber-900 border-amber-300' 
                          : idx === 1 
                            ? 'bg-gradient-to-br from-slate-100 to-slate-200/85 text-slate-800 border-slate-300' 
                            : idx === 2 
                              ? 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-900 border-orange-200' 
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase block leading-tight">{student.student_name || student.name}</span>
                        <span className="text-[11px] text-slate-400 font-bold uppercase">{student.school_name}</span>
                      </div>
                    </div>
                    
                    <div className="sm:text-right mt-2 sm:mt-0 pl-13 sm:pl-0">
                      <span className="inline-flex px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-[9px] font-black rounded-full uppercase tracking-wider border border-blue-100/50">
                        {student.state}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>


      </main>

      {/* Footer Bar */}
      <footer className="py-4 bg-slate-100 border-t border-slate-200 px-6 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 z-20 shrink-0 text-center sm:text-left">
        <div className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider leading-relaxed">
          <p>© 2026 Cabaran Interaktif Minda • Hak Cipta Terpelihara Unit Kokurikulum, Sek Keb Sg Abong.</p>
          <p className="mt-1 text-slate-400 font-bold">Moderator: Acap Garang, Fendy Kacak & Ana Beb</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/login')}
            className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-400 hover:bg-white hover:text-blue-900 transition-colors shadow-sm bg-transparent cursor-pointer"
            title="Admin panel"
            id="admin-settings-button"
          >
            <Settings className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">ADMIN PANEL</span>
        </div>
      </footer>

      {/* Modal Makluman Pendaftaran Ditutup */}
      {showClosedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative text-center"
          >
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100/50 shadow-xs">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2 font-sans">Pendaftaran Ditutup Sementara</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
              Pendaftaran ditutup sementara. Sila hubungi admin melalui WhatsApp pada nombor <strong className="font-black text-slate-700">016-202 2921 (Cikgu Asraf)</strong>.
            </p>
            <button
              onClick={() => setShowClosedModal(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer"
            >
              Faham
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
