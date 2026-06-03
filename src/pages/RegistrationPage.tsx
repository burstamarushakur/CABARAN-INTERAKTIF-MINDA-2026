import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  UserPlus, 
  Upload, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Info, 
  FileCheck, 
  Copy, 
  Printer, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { registrationService } from '../services/registrationService';
import { jsPDF } from 'jspdf';
import { motion } from 'motion/react';
import { PPD_BY_STATE } from '../data/ppdList';

const fetchImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } else {
          reject(new Error('Failed to get 2d context'));
        }
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

// Constant for BSKK official letter
const BSKK_LETTER_URL = "https://mfctlmzwautifbtsusse.supabase.co/storage/v1/object/sign/surat%20bskk/20260520_CABARAN_INTERAKTIF_MINDA_TAHUN_2026_ANJURAN_SEKOLAH_KEBANGSAAN%20(1).pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lMWExYWU0MC03OTM2LTQyZDctYjVkMS02NWQzNDNiOWMwYzYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdXJhdCBic2trLzIwMjYwNTIwX0NBQkFSQU5fSU5URVJBS1RJRl9NSU5EQV9UQUhVTl8yMDI2X0FOSlVSQU5fU0VLT0xBSF9LRUJBTkdTQUFOICgxKS5wZGYiLCJpYXQiOjE3ODAxMjU3OTcsImV4cCI6MTgxMTY2MTc5N30.SIvOZPoPBKvYQ8AtjxCupW_c_Wm69NGyx7FAKpW1aoI"; 

const REGISTRATION_DRAFT_KEY = 'cim_registration_draft';

interface RegistrationDraft {
  step: number;
  consented: boolean;
  state: string;
  ppd: string;
  schoolName: string;
  schoolCode: string;
  teacherName: string;
  teacherPhone: string;
  teacherEmail: string;
  students: StudentInput[];
}

const defaultStudentRows: StudentInput[] = [{ name: '', ic_number: '' }];


const STATES = [
  'JOHOR', 'KEDAH', 'KELANTAN', 'MELAKA', 'NEGERI SEMBILAN', 'PAHANG', 
  'PERAK', 'PERLIS', 'PULAU PINANG', 'SABAH', 'SARAWAK', 'SELANGOR', 
  'TERENGGANU', 'WILAYAH PERSEKUTUAN KUALA LUMPUR', 
  'WILAYAH PERSEKUTUAN LABUAN', 'WILAYAH PERSEKUTUAN PUTRAJAYA'
];

interface StudentInput {
  name: string;
  ic_number: string;
}

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State - Step 2 (School & Teacher)
  const [state, setState] = useState('');
  const [ppd, setPpd] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');

  // Form State - Step 3 (Students list)
  const [students, setStudents] = useState<StudentInput[]>(defaultStudentRows);

  // Form State - Step 4 (File upload)
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Success State - Step 5
  const [successData, setSuccessData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Step 1 read consent
  const [consented, setConsented] = useState(false);

  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(REGISTRATION_DRAFT_KEY);
      if (!savedDraft) {
        setDraftRestored(true);
        return;
      }

      const parsed = JSON.parse(savedDraft) as RegistrationDraft;
      if (!parsed || typeof parsed !== 'object') {
        sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
        setDraftRestored(true);
        return;
      }

      setStep(Math.min(Math.max(Number(parsed.step || 1), 1), 4));
      setConsented(Boolean(parsed.consented));
      setState(String(parsed.state || ''));
      setPpd(String(parsed.ppd || ''));
      setSchoolName(String(parsed.schoolName || ''));
      setSchoolCode(String(parsed.schoolCode || ''));
      setTeacherName(String(parsed.teacherName || ''));
      setTeacherPhone(String(parsed.teacherPhone || '').replace(/\D/g, ''));
      setTeacherEmail(String(parsed.teacherEmail || '').toLowerCase());
      setStudents(
        Array.isArray(parsed.students) && parsed.students.length > 0
          ? parsed.students.map((student) => ({
              name: String(student.name || '').toUpperCase(),
              ic_number: String(student.ic_number || '').replace(/\D/g, '').slice(0, 12)
            }))
          : defaultStudentRows
      );
    } catch (err) {
      console.warn('Unable to restore registration draft:', err);
      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
    } finally {
      setDraftRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!draftRestored || step === 5) return;

    const draft: RegistrationDraft = {
      step,
      consented,
      state,
      ppd,
      schoolName,
      schoolCode,
      teacherName,
      teacherPhone,
      teacherEmail,
      students
    };

    try {
      sessionStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(draft));
    } catch (err) {
      console.warn('Unable to save registration draft:', err);
    }
  }, [draftRestored, step, consented, state, ppd, schoolName, schoolCode, teacherName, teacherPhone, teacherEmail, students]);

  const handleClearDraft = () => {
    try {
      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
    } catch (err) {
      console.warn('Unable to clear registration draft:', err);
    }

    setStep(1);
    setErrorMsg('');
    setConsented(false);
    setState('');
    setPpd('');
    setSchoolName('');
    setSchoolCode('');
    setTeacherName('');
    setTeacherPhone('');
    setTeacherEmail('');
    setStudents(defaultStudentRows);
    setReceiptFile(null);
  };

  // Auto clean states on transition or input
  const handleTeacherPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // Digits only
    setTeacherPhone(val);
  };

  const handleStudentNameChange = (idx: number, name: string) => {
    const list = [...students];
    list[idx].name = name.toUpperCase();
    setStudents(list);
  };

  const handleStudentICChange = (idx: number, ic: string) => {
    const list = [...students];
    list[idx].ic_number = ic.replace(/\D/g, ''); // Digits only
    setStudents(list);
  };

  const addStudentRow = () => {
    setStudents([...students, { name: '', ic_number: '' }]);
  };

  const removeStudentRow = (idx: number) => {
    if (students.length === 1) return;
    const list = students.filter((_, i) => i !== idx);
    setStudents(list);
  };

  // Step 2 validation
  const validateStep2 = () => {
    if (!state) return 'Sila pilih Negeri.';
    if (!ppd.trim()) return 'Sila pilih PPD.';
    if (!schoolName.trim()) return 'Sila isi nama Sekolah.';
    if (!schoolCode.trim()) return 'Sila isi kod Sekolah.';
    if (!teacherName.trim()) return 'Sila isi nama Guru Pengiring.';
    if (!teacherPhone.trim() || teacherPhone.length < 10) {
      return 'Sila isi nombor telefon Guru Pengiring yang sah (sekurang-kurangnya 10 digit angka).';
    }
    return '';
  };

  // Step 3 validation
  const validateStep3 = () => {
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      if (!s.name.trim()) return `Sila isi nama penuh bagi murid ke-${i + 1}`;
      if (!s.ic_number.trim() || s.ic_number.length !== 12) {
        return `Sila isi nombor MyKid/MyKad yang betul (12 digit angka) bagi murid ke-${i + 1} ("${s.name || 'tiada nama'}").`;
      }
    }

    // Check duplicate ICs in local input
    const icNumbers = students.map(s => s.ic_number);
    const uniqueICs = new Set(icNumbers);
    if (uniqueICs.size !== icNumbers.length) {
      return 'Terdapat nombor MyKid/MyKad yang bertindih (duplicate) dalam senarai pendaftaran anda.';
    }

    return '';
  };

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!consented) {
        setErrorMsg('Sila tandakan persetujuan membaca makluman terlebih dahulu.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const err = validateStep3();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep(prev => Math.max(1, prev - 1));
  };

  // File choice hook
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Format fail tidak sah. Hanya format PDF, JPG, JPEG, dan PNG diterima.');
      setReceiptFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran fail melebihi had 5MB. Sila guna fail yang lebih kecil.');
      setReceiptFile(null);
      return;
    }

    setReceiptFile(file);
  };

  // Submit flow
  const handleSubmit = async () => {
    setErrorMsg('');
    if (!receiptFile) {
      setErrorMsg('Sila muat naik slip pembayaran penyertaan terlebih dahulu.');
      return;
    }

    setLoading(true);
    let uploadedReceiptPath = '';
    try {
      // 1. Upload receipt file
      const uploadRes = await registrationService.uploadReceipt(schoolCode.trim().toUpperCase(), receiptFile);
      uploadedReceiptPath = uploadRes.path;

      // 2. Submit RPC
      const registrationMetadata = await registrationService.submitRegistration({
        input_state: state.toUpperCase(),
        input_ppd: ppd.trim().toUpperCase(),
        input_school_name: schoolName.trim().toUpperCase(),
        input_school_code: schoolCode.trim().toUpperCase(),
        input_teacher_name: teacherName.trim().toUpperCase(),
        input_teacher_phone: teacherPhone,
        input_teacher_email: teacherEmail ? teacherEmail.trim().toLowerCase() : null,
        input_receipt_path: uploadRes.path,
        input_receipt_file_name: uploadRes.fileName,
        input_students: students.map(s => ({
          name: s.name.trim().toUpperCase(),
          ic_number: s.ic_number.trim()
        }))
      });

      try {
        sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
      } catch (storageErr) {
        console.warn('Unable to clear registration draft after submit:', storageErr);
      }

      setSuccessData(registrationMetadata);
      setStep(5);
    } catch (err: any) {
      console.error('Submission failed:', err);
      if (uploadedReceiptPath) {
        await registrationService.deleteUploadedReceipt(uploadedReceiptPath);
      }
      setErrorMsg(err.message || 'Gagal menghantar pendaftaran. Sila semak maklumat dan cuba semula.');
    } finally {
      setLoading(false);
    }
  };

  // Copy ref helper
  const handleCopyRef = () => {
    if (!successData || !successData.registration_ref) return;
    navigator.clipboard.writeText(successData.registration_ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!successData) return;
    
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'normal');
    
    // Header letterhead with Logo and titles
    try {
      const imgBase64 = await fetchImageAsBase64("https://i.postimg.cc/bJ9vLS0y/CIM-2026.png");
      doc.addImage(imgBase64, 'PNG', 15, 10, 22, 22);
      
      doc.setTextColor(30, 58, 138); // Blue-900
      doc.setFontSize(11.5);
      doc.setFont('Helvetica', 'bold');
      doc.text('SLIP PENDAFTARAN CABARAN INTERAKTIF MINDA TAHUN 2026', 42, 16);
      
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.text('Slip ini merupakan bukti pendaftaran dan rujukan semakan status pendaftaran.', 42, 22);
      doc.text('Anjuran: Sekolah Kebangsaan Sungai Abong & PIBG SK Sungai Abong', 42, 27);
    } catch (err) {
      console.warn('Failed to load logo in PDF, rendering text only:', err);
      doc.setTextColor(30, 58, 138); // Blue-900
      doc.setFontSize(11.5);
      doc.setFont('Helvetica', 'bold');
      doc.text('SLIP PENDAFTARAN CABARAN INTERAKTIF MINDA TAHUN 2026', 15, 16);
      
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.text('Slip ini merupakan bukti pendaftaran dan rujukan semakan status pendaftaran.', 15, 22);
      doc.text('Anjuran: Sekolah Kebangsaan Sungai Abong & PIBG SK Sungai Abong', 15, 27);
    }

    // Divider line
    doc.setDrawColor(30, 58, 138); // Blue-900
    doc.setLineWidth(0.8);
    doc.line(15, 34, 195, 34);

    // Box for No. Rujukan Pendaftaran
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(15, 38, 180, 22, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(15, 38, 180, 22, 'S');

    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.text('NO. RUJUKAN PENDAFTARAN', 20, 44);

    doc.setTextColor(22, 101, 52); // emerald-800
    doc.setFontSize(15);
    doc.setFont('Helvetica', 'bold');
    doc.text(successData.registration_ref || '-', 20, 53);

    // Section 1: Maklumat Sekolah & Guru Pengiring
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.text('MAKLUMAT SEKOLAH & GURU PENGIRING', 15, 66);

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(15, 68, 195, 68);

    doc.setFontSize(9);
    let y = 75;
    const schoolDetails = [
      ['Negeri', state],
      ['Pejabat Pendidikan Daerah (PPD)', ppd],
      ['Nama Sekolah', schoolName],
      ['Kod Sekolah', schoolCode],
      ['Nama Guru Pengiring', teacherName],
      ['No. Telefon Guru', teacherPhone],
      ['Status Pendaftaran', 'MENUNGGU SEMAKAN']
    ];

    schoolDetails.forEach(([label, value]) => {
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(String(label) + ':', 15, y);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(String(value || '-').toUpperCase(), 75, y);
      y += 6.5;
    });

    // Section 2: Maklumat Bayaran
    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('MAKLUMAT BAYARAN', 15, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;

    const paymentDetails = [
      ['Kadar Bayaran', 'RM 10.00 seorang'],
      ['Jumlah Murid', `${students.length} orang`],
      ['Jumlah Bayaran', `RM ${totalPayment.toFixed(2)}`],
      ['Nama Bank', 'BANK ISLAM'],
      ['No. Akaun', '01023010038679'],
      ['Nama Pemegang Akaun', 'PIBG SK SG ABONG'],
      ['Rujukan Bayaran', 'RUJUKAN: KOD SEKOLAH-CONTOH JBA5095']
    ];

    paymentDetails.forEach(([label, value]) => {
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(String(label) + ':', 15, y);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(String(value).toUpperCase(), 75, y);
      y += 6.5;
    });

    // Section 3: Senarai Murid / Peserta Yang Didaftarkan
    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('SENARAI MURID / PESERTA YANG DIDAFTARKAN', 15, y);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;

    // Drawn table header
    doc.setFillColor(241, 14, 18); // fallback text size helper color/visual back
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(15, y - 4, 180, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('BIL', 18, y - 0.5);
    doc.text('NAMA PENUH MURID', 30, y - 0.5);
    doc.text('MYKID / MYKAD', 140, y - 0.5);

    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    students.forEach((stud, index) => {
      // mask IC
      const ic = stud.ic_number;
      const maskedIc = ic.length >= 4 ? `********${ic.slice(-4)}` : ic;
      
      doc.text(String(index + 1), 18, y + 6);
      doc.text(stud.name.toUpperCase(), 30, y + 6);
      doc.text(maskedIc, 140, y + 6);
      y += 7.5;

      // Page break check
      if (y > 260) {
        doc.addPage();
        y = 20;
        
        // Redraw table header on new page
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y - 4, 180, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('BIL', 18, y - 0.5);
        doc.text('NAMA PENUH MURID', 30, y - 0.5);
        doc.text('MYKID / MYKAD', 140, y - 0.5);

        doc.setFontSize(9);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
      }
    });

    // Footnote
    y += 10;
    if (y > 250) {
      doc.addPage();
      y = 30;
    }

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(15, y, 195, y);
    y += 6;

    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text('Penting:', 15, y);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    
    const textLines = doc.splitTextToSize(
      'Sila simpan slip pendaftaran ini. No. Rujukan Pendaftaran diperlukan untuk menyemak status pendaftaran dan mendapatkan kod akses murid selepas bayaran disahkan oleh pihak penganjur.',
      160
    );
    doc.text(textLines, 30, y);

    doc.save(`Slip_Pendaftaran_${schoolCode}_CIM2026.pdf`);
  };

  const totalPayment = students.length * 10;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Mini top bar header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 py-3 px-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="https://i.postimg.cc/bJ9vLS0y/CIM-2026.png" 
            alt="CIM 2026" 
            className="h-10 w-auto object-contain mix-blend-multiply"
          />
          <div>
            <span className="text-xs font-bold text-blue-900 block tracking-tight uppercase">Portal Pendaftaran</span>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Cabaran Interaktif Minda 2026</span>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 tracking-tight transition cursor-pointer"
        >
          Laman Utama
        </button>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
        
        {/* Wizard Progression Stats */}
        {step < 5 && (
          <div className="mb-10 flex items-center justify-between px-2">
            {[
              { num: 1, text: 'Taklimat' },
              { num: 2, text: 'Sekolah' },
              { num: 3, text: 'Daftar Calon' },
              { num: 4, text: 'Pembayaran' }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center flex-1 relative">
                {/* Connector Line */}
                {s.num > 1 && (
                  <div className={`absolute left-0 right-1/2 top-4 h-[2px] -translate-y-1/2 -z-10 ${
                    step >= s.num ? 'bg-emerald-600' : 'bg-slate-200'
                  }`} />
                )}
                {s.num < 4 && (
                  <div className={`absolute left-1/2 right-0 top-4 h-[2px] -translate-y-1/2 -z-10 ${
                    step > s.num ? 'bg-emerald-600' : 'bg-slate-200'
                  }`} />
                )}

                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                  step === s.num 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100' 
                    : step > s.num 
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-600' 
                      : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  {s.num}
                </div>
                <span className={`text-[10px] font-bold mt-2 uppercase tracking-tight text-center ${
                  step === s.num ? 'text-emerald-700' : 'text-slate-400'
                }`}>
                  {s.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span className="text-xs font-bold text-red-800 leading-relaxed">{errorMsg}</span>
          </div>
        )}
        {step < 5 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-900">Draf pendaftaran disimpan sementara pada pelayar ini.</p>
                <p className="text-[11px] text-blue-700 font-semibold mt-1">Jika halaman refresh, maklumat yang telah ditaip akan dipulihkan. Fail resit perlu dipilih semula sebelum dihantar.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="px-3 py-2 bg-white hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Padam Draf
            </button>
          </div>
        )}

        {/* ==================== STEP 1: TAKLIMAT ==================== */}
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8"
          >
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-emerald-600 rounded-full inline-block" />
              Sila Baca Makluman Penting Sebelum Pendaftaran
            </h2>

            <div className="space-y-6 text-xs text-slate-600 font-medium leading-relaxed mb-8">
              <div className="border-l-4 border-slate-200 pl-4 py-1">
                <h3 className="font-bold text-slate-900 text-sm mb-1">1. Maklumat Murid Hendaklah Lengkap Dan Tepat</h3>
                <p>
                  Pihak sekolah/guru pengiring perlu memastikan semua maklumat murid telah lengkap, khususnya nama penuh murid dan nombor MyKid/MyKad. Maklumat ini amat penting bagi tujuan penyediaan sijil penyertaan dan sijil pencapaian. Sebarang kesilapan maklumat yang diberikan adalah di bawah tanggungjawab pihak sekolah/guru pengiring dan tidak boleh dipertanggungjawabkan kepada pihak penganjur.
                </p>
              </div>

              <div className="border-l-4 border-slate-200 pl-4 py-1">
                <h3 className="font-bold text-slate-900 text-sm mb-1">2. Pembayaran Hendaklah Dibuat Terlebih Dahulu</h3>
                <p className="mb-2">
                  Pembayaran hendaklah dibuat terlebih dahulu sebelum pendaftaran.
                  Sila pastikan bayaran penyertaan telah dibuat sebelum mengisi borang pendaftaran. Kadar bayaran penyertaan ialah RM10.00 bagi setiap murid/peserta. Jumlah bayaran adalah berdasarkan bilangan murid yang didaftarkan oleh pihak sekolah.
                </p>
                <div className="bg-slate-50 border border-slate-250 p-4 rounded-2xl space-y-1.5 mt-2 max-w-md">
                  <p className="font-bold text-slate-800 text-[11px]"><span className="text-slate-400 uppercase text-[9px] block tracking-wider font-semibold font-mono">Nama Bank</span> BANK ISLAM</p>
                  <p className="font-bold text-slate-800 text-[11px] font-mono"><span className="text-slate-400 uppercase text-[9px] block tracking-wider font-semibold">No. Akaun</span> 01023010038679</p>
                  <p className="font-bold text-slate-800 text-[11px]"><span className="text-slate-400 uppercase text-[9px] block tracking-wider font-semibold font-mono">Nama Pemegang Akaun</span> PIBG SK SG ABONG</p>
                  <p className="font-bold text-slate-800 text-[11px] font-mono"><span className="text-slate-400 uppercase text-[9px] block tracking-wider font-semibold">Rujukan Bayaran</span> RUJUKAN: KOD SEKOLAH-CONTOH JBA5095</p>
                </div>
              </div>

              <div className="border-l-4 border-slate-200 pl-4 py-1">
                <h3 className="font-bold text-slate-900 text-sm mb-1">3. Maklumat Guru Pengiring Hendaklah Boleh Dihubungi</h3>
                <p>
                  Guru pengiring perlu memastikan maklumat yang diberikan seperti nama, nombor telefon dan emel adalah tepat bagi memudahkan pihak penganjur menghubungi sekolah sekiranya terdapat sebarang isu berkaitan pendaftaran, kod unik kuiz, sijil atau perkara lain yang berkaitan.
                </p>
              </div>

              <div className="border-l-4 border-slate-200 pl-4 py-1">
                <h3 className="font-bold text-slate-900 text-sm mb-1">4. Pendaftaran Berkelompok Sekolahan</h3>
                <p>
                  Pihak penganjur sangat menggalakkan agar setiap sekolah hanya menggunakan satu pendaftaran sahaja. Perkara ini bertujuan untuk memudahkan urusan semakan peserta, penghantaran kod unik untuk menjawab kuiz serta pengurusan sijil penyertaan dan sijil pencapaian.
                </p>
              </div>

              <div className="border-l-4 border-slate-200 pl-4 py-1">
                <h3 className="font-bold text-slate-900 text-sm mb-1">5. Pentadbiran Sijil Dan Pengesahan BSKK</h3>
                <p>
                  Sijil penyertaan dan sijil pencapaian akan boleh dimuat turun setelah pihak penganjur menerima pengesahan penganjuran daripada Bahagian Sukan, Kokurikulum dan Kesenian (BSKK), Kementerian Pendidikan Malaysia (KPM).
                </p>
              </div>

              <div className="border-l-4 border-slate-200 pl-4 py-1">
                <h3 className="font-bold text-slate-900 text-sm mb-1">6. Sijil Pencapaian Peserta Terbaik</h3>
                <p>
                  Sijil pencapaian akan diberikan kepada 5 orang peserta yang memperoleh markah tertinggi dan menjawab kuiz dalam tempoh masa terpantas.
                </p>
              </div>

              <div className="border-l-4 border-slate-200 pl-4 py-1">
                <h3 className="font-bold text-slate-900 text-sm mb-1">7. Saluran Hubungan</h3>
                <p>
                  Sebarang makluman berkaitan sijil, kod unik kuiz atau perkara lain yang berkaitan akan disampaikan melalui guru pengiring yang telah didaftarkan dalam borang pendaftaran.
                </p>
              </div>

              <div className="border-l-4 border-red-200 pl-4 py-1 bg-red-50/30 rounded-r-xl pr-3">
                <h3 className="font-bold text-red-950 text-sm mb-1">8. Tempoh Menjawab Kuiz</h3>
                <p className="text-red-900">
                  Tempoh menjawab kuiz adalah selama 2 jam bagi setiap peserta. Walau bahaimanapun, sesi menjawab kuiz akan tamat sepenuhnya pada jam 6.00 petang. Peserta yang mula menjawab lewat perlu memastikan kuiz dihantar sebelum waktu tamat tersebut. Selepas jam 6.00 petang, sistem akan menamatkan sesi menjawab secara automatik.
                </p>
              </div>
            </div>

            {/* BSKK section info */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 mb-8 text-xs font-semibold">
              <h4 className="text-slate-850 font-bold mb-2 uppercase tracking-wide">Surat Maklum Balas BSKK</h4>
              <p className="text-slate-500 mb-4 leading-relaxed font-semibold">
                Pihak penganjur telah menerima maklum balas daripada pihak Bahagian Sukan, Kokurikulum dan Kesenian (BSKK), Kementerian Pendidikan Malaysia berhubung pelaksanaan Cabaran Interaktif Minda Tahun 2026. Guru pengiring boleh merujuk surat maklum balas tersebut sebagai rujukan penganjuran.
              </p>
              
              {BSKK_LETTER_URL ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <motion.a 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    href={BSKK_LETTER_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg flex items-center justify-center text-[11px] font-bold transition-all text-center px-2"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 shrink-0" /> Lihat Surat Maklum Balas BSKK
                  </motion.a>
                  <motion.a 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    href={BSKK_LETTER_URL} 
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all border border-slate-200 text-center px-2"
                  >
                    Muat Turun Surat Maklum Balas BSKK
                  </motion.a>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-bold text-[11px] uppercase tracking-wide text-center">
                  ⚠️ Surat maklum balas BSKK akan dimuat naik oleh pihak penganjur dalam masa terdekat.
                </div>
              )}
            </div>

            {/* Checkbox input required */}
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={consented} 
                  onChange={(e) => setConsented(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 bg-slate-100 border-slate-300 rounded-sm focus:ring-emerald-500 focus:ring-2 mt-0.5"
                />
                <span className="text-[11px] sm:text-xs font-semibold text-slate-700 leading-relaxed uppercase tracking-tight">
                  Saya telah membaca dan memahami makluman penting sebelum membuat pendaftaran.
                </span>
              </label>
            </div>

            <motion.button 
              whileHover={{ scale: consented ? 1.01 : 1 }}
              whileTap={{ scale: consented ? 0.99 : 1 }}
              type="button"
              onClick={handleNextStep}
              disabled={!consented}
              className="w-full py-3 bg-emerald-600 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-xs hover:shadow-md"
            >
              Teruskan Serta Merta <ChevronRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}

        {/* ==================== STEP 2: MAKLUMAT SEKOLAH ==================== */}
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8"
          >
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-emerald-600 rounded-full inline-block" />
              Butiran Sekolah & Guru Pengiring
            </h2>

            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleNextStep(); }}>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">1. Pilih Negeri *</label>
                <select 
                  className="w-full p-3 border rounded-xl border-slate-300 text-xs font-bold bg-white text-slate-755 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    setPpd('');
                  }}
                >
                  <option value="">-- PILIH NEGERI --</option>
                  {STATES.map((st) => (
                     <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">2. Pejabat Pendidikan Daerah (PPD) *</label>
                <select 
                  className="w-full p-3 border rounded-xl border-slate-300 text-xs font-bold bg-white text-slate-755 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                  value={ppd}
                  onChange={(e) => setPpd(e.target.value)}
                  disabled={!state}
                >
                  <option value="">{state ? "-- PILIH PPD --" : "Pilih negeri terlebih dahulu"}</option>
                  {state && PPD_BY_STATE[state]?.map((ppdName) => (
                    <option key={ppdName} value={ppdName}>{ppdName}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                  Sila pilih PPD daripada senarai rasmi bagi memastikan data pendaftaran seragam.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">3. Nama Sekolah *</label>
                <input 
                  type="text" 
                  placeholder="CONTOH SEK KEB SG ABONG"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value.toUpperCase())}
                  className="w-full p-3 border rounded-xl border-slate-300 text-xs font-bold text-slate-755 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">4. Kod Sekolah *</label>
                <input 
                  type="text" 
                  placeholder="CONTOH JBA5095"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                  className="w-full p-3 border rounded-xl border-slate-300 text-xs font-bold text-slate-755 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="border-t border-slate-100 pt-5 mt-5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">5. Nama Guru Pengiring *</label>
                <input 
                  type="text" 
                  placeholder="CIKGU AHMAD AFFENDY BIN MOHAMED TAHIR"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value.toUpperCase())}
                  className="w-full p-3 border rounded-xl border-slate-300 text-xs font-bold text-slate-755 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">6. No. Telefon Panggilan Suara & WhatsApp *</label>
                <input 
                  type="text" 
                  placeholder="0123456789"
                  value={teacherPhone}
                  onChange={handleTeacherPhoneChange}
                  className="w-full p-3 border rounded-xl border-slate-300 text-xs font-bold text-slate-755 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 font-semibold block mt-1 uppercase tracking-wider">Hanya angka dibenarkan (tanpa "-" atau ruangan kosong).</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">7. Emel Guru Pengiring (Pilihan)</label>
                <input 
                  type="email" 
                  placeholder="contoh@email.com"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value.toLowerCase())}
                  className="w-full p-3 border rounded-xl border-slate-300 text-xs font-bold text-slate-755 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <motion.button 
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200 shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" /> Kembali
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs hover:shadow-md"
                >
                  Daftar Murid <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ==================== STEP 3: DAFTAR MURID ==================== */}
        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8"
          >
            <div className="mb-6 pb-4 border-b">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-600 rounded-full inline-block" />
                Daftar Murid / Peserta
              </h2>
            </div>

            <p className="text-xs text-slate-450 font-semibold mb-6 uppercase tracking-wider">
              Masukkan nama penuh & MyKid/MyKad (tanpa meletakkan tanda "-") bagi setiap calon murid.
            </p>

            <div className="space-y-4">
              {students.map((stud, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-250 rounded-2xl flex flex-col sm:flex-row gap-3 relative">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Penuh Calon {idx + 1}</label>
                    <input 
                      type="text"
                      placeholder="ZURIANA BINTI KAMARUDIN"
                      value={stud.name}
                      onChange={(e) => handleStudentNameChange(idx, e.target.value)}
                      className="w-full p-2.5 border rounded-lg border-slate-300 text-xs font-bold text-slate-755 uppercase focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:w-60">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">MyKid / MyKad (12 Digit)</label>
                    <input 
                      type="text"
                      placeholder="200220015566"
                      value={stud.ic_number}
                      maxLength={12}
                      onChange={(e) => handleStudentICChange(idx, e.target.value)}
                      className="w-full p-2.5 border rounded-lg border-slate-300 text-xs font-bold text-slate-755 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {students.length > 1 && (
                    <div className="flex items-end justify-end sm:pb-1">
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => removeStudentRow(idx)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition cursor-pointer"
                        title="Buang calon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Button Tambah Murid di bawah senarai field murid */}
            <div className="mt-4 flex justify-end">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={addStudentRow}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Tambah Murid
              </motion.button>
            </div>

            {/* Kotak Maklumat Bayaran Penyertaan */}
            <div className="mt-8 p-5 bg-blue-50/40 border border-blue-200 rounded-3xl text-left">
              <h4 className="text-xs font-black uppercase text-blue-900 tracking-wider mb-2 font-mono">Maklumat Bayaran Penyertaan</h4>
              <p className="text-xs text-slate-600 mb-4 font-medium leading-relaxed">
                Kadar bayaran penyertaan ialah RM10.00 bagi setiap murid/peserta. Sila pastikan pembayaran telah dibuat sebelum meneruskan pendaftaran dan memuat naik resit pembayaran.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-blue-100 text-xs font-medium">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">Nama Bank</span>
                  <strong className="text-slate-900 font-bold text-xs">BANK ISLAM</strong>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">No. Akaun</span>
                  <strong className="text-slate-900 font-mono font-bold text-xs">01023010038679</strong>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">Nama Pemegang Akaun</span>
                  <strong className="text-slate-900 font-bold text-xs">PIBG SK SG ABONG</strong>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">Rujukan Bayaran</span>
                  <strong className="text-slate-900 font-bold text-xs text-blue-900 font-mono">RUJUKAN: KOD SEKOLAH-CONTOH JBA5095</strong>
                </div>
                
                <div className="border-t border-slate-100 pt-3 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">Jumlah Murid</span>
                    <strong className="text-slate-950 font-black text-sm">{students.length} Orang</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">Kadar Bayaran</span>
                    <strong className="text-slate-950 font-black text-sm">RM 10.00 Seorang</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block font-mono">Jumlah Bayaran Semasa</span>
                    <strong className="text-emerald-700 font-black text-lg">RM {(students.length * 10).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
              <motion.button 
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                type="button"
                onClick={handlePrevStep}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200 shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                type="button"
                onClick={handleNextStep}
                className="flex-1 py-3 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-center shadow-xs hover:shadow-md"
              >
                <span className="line-clamp-2">Daftar Murid dan Muat Naik Resit Pembayaran</span> <ChevronRight className="w-4 h-4 shrink-0" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ==================== STEP 4: UPLOAD PAYMENT SLIP ==================== */}
        {step === 4 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8"
          >
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-emerald-600 rounded-full inline-block" />
              Muat Naik Slip Bayaran
            </h2>

            {!receiptFile && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-amber-800 leading-relaxed">
                  Sila pilih semula fail resit pembayaran sebelum menghantar pendaftaran. Atas faktor keselamatan pelayar, fail resit tidak boleh dipulihkan selepas halaman refresh.
                </p>
              </div>
            )}

            {/* School & Price configuration summary */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border rounded-2xl p-4 sm:p-5 mb-6 text-xs font-semibold">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sekolah</span>
                <span className="text-slate-800 font-extrabold uppercase">{schoolName} ({schoolCode})</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jumlah Calon</span>
                <span className="text-slate-800 font-extrabold uppercase">{students.length} Pelajar</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Negeri & PPD</span>
                <span className="text-slate-850 font-bold uppercase">{state} • {ppd}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Yuran Keseluruhan</span>
                <span className="text-emerald-700 font-black">RM {totalPayment.toFixed(2)}</span>
              </div>
              <div className="col-span-2 border-t pt-2 mt-1">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Rujukan Bayaran</span>
                <span className="text-blue-900 font-black font-mono">RUJUKAN: KOD SEKOLAH-CONTOH JBA5095</span>
              </div>
            </div>

            {/* File drag area */}
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl bg-slate-50/50 p-6 sm:p-8 flex flex-col items-center justify-center text-center transition mb-6">
              <Upload className="w-10 h-10 text-slate-400 mb-4 animate-bounce" style={{ animationDuration: '3s' }} />
              <p className="text-xs text-slate-600 font-bold mb-1">
                Pilih atau seret fail slip bayaran anda ke mari
              </p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase mb-4">
                Format Diterima: .pdf, .jpg, .jpeg, .png (Maksimum 5MB)
              </p>

              <motion.label 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs"
              >
                Pilih Fail
                <input 
                  type="file" 
                  accept=".pdf, .jpg, .jpeg, .png"
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </motion.label>

              {receiptFile && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2"
                >
                  <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-emerald-900 block truncate max-w-xs">{receiptFile.name}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <motion.button 
                whileHover={{ scale: loading ? 1 : 1.015 }}
                whileTap={{ scale: loading ? 1 : 0.985 }}
                type="button"
                disabled={loading}
                onClick={handlePrevStep}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 border border-slate-200 disabled:opacity-50 shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali
              </motion.button>
              <motion.button 
                whileHover={{ scale: (loading || !receiptFile) ? 1 : 1.015 }}
                whileTap={{ scale: (loading || !receiptFile) ? 1 : 0.985 }}
                type="button"
                disabled={loading || !receiptFile}
                onClick={handleSubmit}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs hover:shadow-md disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" /> Mengirim...
                  </>
                ) : (
                  <>
                    Hantar Pendaftaran <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ==================== STEP 5: SUCCESS! ==================== */}
        {step === 5 && successData && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-6 border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-black text-slate-800 mb-2">Pendaftaran Berjaya Dihantar</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed font-medium">
              Permohonan pendaftaran anda telah berjaya dihantar ke sistem penganjur. Sila simpan No. Rujukan di bawah untuk semakan status dan perolehan kod kuiz.
            </p>

            {/* Reference Number Card */}
            <div className="w-full bg-slate-50 border rounded-2xl p-5 mb-6">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block mb-2">Nombor Rujukan Pendaftaran</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-800 tracking-wide font-mono select-all select-all select-all">
                {successData.registration_ref || 'CIM-2026-PENDING'}
              </span>

              <div className="flex items-center justify-center gap-4 mt-4">
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCopyRef}
                  type="button"
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border rounded-lg text-xs font-bold text-slate-700 transition flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Copy className="w-4 h-4" /> {copied ? 'Telah Disalin!' : 'Salin Nombor'}
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDownloadPDF}
                  type="button"
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border rounded-lg text-xs font-bold text-slate-700 transition flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Muat Turun Slip Pendaftaran
                </motion.button>
              </div>
            </div>

            {/* Info Box untuk Guru Pengiring */}
            <div className="w-full p-5 bg-blue-50/75 border border-blue-200 rounded-2xl flex items-start gap-3.5 text-left mb-8 shadow-xs">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-2 w-full">
                <h4 className="text-xs sm:text-sm font-black text-blue-900 uppercase tracking-wide">
                  Makluman Penting Kepada Guru Pengiring
                </h4>
                <div className="text-xs text-slate-700 leading-relaxed font-medium space-y-2.5">
                  <p>
                    Sila simpan <span className="font-extrabold text-blue-950">No. Rujukan Pendaftaran</span> ini dengan baik. <span className="font-extrabold text-blue-950">No. Rujukan Pendaftaran</span> ini diperlukan untuk membuat semakan status pendaftaran melalui menu “<span className="font-semibold text-blue-950">Semak Status Pendaftaran</span>”.
                  </p>
                  <p>
                    Selepas <span className="font-extrabold text-blue-950">bayaran disemak dan diluluskan</span> oleh pihak penganjur, guru pengiring boleh melihat serta <span className="font-extrabold text-blue-950">memuat turun senarai kod akses murid</span> yang telah didaftarkan melalui menu tersebut. Kod akses berkenaan hendaklah <span className="font-extrabold text-blue-950">diberikan kepada murid/peserta</span> untuk digunakan semasa menjawab kuiz.
                  </p>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="w-full flex flex-col sm:flex-row gap-2">
              <motion.button 
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate('/registration/status')}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer shadow-sm"
              >
                Semak Status Pendaftaran
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate('/')}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl transition border border-slate-200 cursor-pointer shadow-xs"
              >
                Laman Utama
              </motion.button>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
