import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { adminService } from '../services/adminService';
import { quizService } from '../services/quizService';
import { registrationService } from '../services/registrationService';
import { exportToCSV } from '../utils/csvUtils';
import FeederImportPanel from '../components/FeederImportPanel';
import { 
  LogOut, 
  Download, 
  Search, 
  Users, 
  School, 
  CheckCircle, 
  Clock, 
  Home, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Settings, 
  Award, 
  Loader2, 
  Eye, 
  FileText, 
  CheckCircle2, 
  XOctagon, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, PENDING, BLOCKED
  const [completionFilter, setCompletionFilter] = useState('ALL'); // ALL, COMPLETED, NOT_COMPLETED

  // Registration Control states in Admin
  const [adminRegSettings, setAdminRegSettings] = useState<{ mode: string; deadline: string; is_open: boolean; status_label: string; message: string; loading: boolean }>({
    mode: 'auto',
    deadline: '2026-06-19T18:00:00+08:00',
    is_open: true,
    status_label: 'AUTO',
    message: '',
    loading: true
  });
  const [modalType, setModalType] = useState<'open' | 'closed' | 'auto' | null>(null);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);

  const fetchAdminRegSettings = async () => {
    try {
      const settings = await registrationService.getRegistrationSettings();
      setAdminRegSettings({
        ...settings,
        loading: false
      });
    } catch (err) {
      console.error('Failed to fetch registration settings in admin panel:', err);
      setAdminRegSettings(prev => ({ ...prev, loading: false }));
    }
  };

  const handleUpdateRegistrationMode = async (mode: 'auto' | 'open' | 'closed') => {
    setIsUpdatingMode(true);
    try {
      await registrationService.adminUpdateRegistrationMode(mode);
      setSuccessToast(`Mod pendaftaran berjaya ditukar ke ${mode.toUpperCase()}!`);
      setTimeout(() => setSuccessToast(''), 3000);
      await fetchAdminRegSettings();
    } catch (err: any) {
      console.error('Failed to update registration mode:', err);
      alert(err.message || 'Gagal mengemas kini mod pendaftaran. Sila pastikan SQL Patch telah dijalankan di Supabase SQL Editor anda.');
    } finally {
      setIsUpdatingMode(false);
      setModalType(null);
    }
  };

  useEffect(() => {
    fetchAdminRegSettings();
  }, []);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalRows, setTotalRows] = useState(0);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState('');

  // Session form state
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionStart, setSessionStart] = useState('');
  const [sessionEnd, setSessionEnd] = useState('');
  const [sessionDuration, setSessionDuration] = useState(7200);
  const [sessionIsActive, setSessionIsActive] = useState(true);
  const [updatingSession, setUpdatingSession] = useState(false);
  const [sessionMessage, setSessionMessage] = useState({ text: '', type: '' });

  // Certificate control state
  const [certStatus, setCertStatus] = useState<any>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState('');

  // Tab control
  const [activeSubTab, setActiveSubTab] = useState<'CALON' | 'REGISTRATIONS'>('CALON');

  // Analysis & Sub-tab monitoring states
  const [analysisTab, setAnalysisTab] = useState<'RINGKASAN' | 'NEGERI' | 'PPD' | 'SEKOLAH' | 'SENARAI_CALON'>('RINGKASAN');
  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [expandedStates, setExpandedStates] = useState<{[key: string]: boolean}>({});

  // Sub-filter states for SENARAI_CALON
  const [filterNegeri, setFilterNegeri] = useState('ALL');
  const [filterPpd, setFilterPpd] = useState('ALL');
  const [filterSchool, setFilterSchool] = useState('ALL');

  // Client side pagination for filteredCandidates
  const [calonPage, setCalonPage] = useState(1);
  const calonPageSize = 50;

  const toggleExpand = (key: string) => {
    setExpandedStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Registrations state
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regSearch, setRegSearch] = useState('');
  const [debouncedRegSearch, setDebouncedRegSearch] = useState('');
  const [regStatus, setRegStatus] = useState('ALL'); // ALL, pending, approved, rejected
  const [regPage, setRegPage] = useState(1);
  const [regPageSize, setRegPageSize] = useState(50);
  const [regTotal, setRegTotal] = useState(0);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Selected registration detail modal
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [regDetailLoading, setRegDetailLoading] = useState(false);
  const [regDetailError, setRegDetailError] = useState('');
  const [regDetail, setRegDetail] = useState<any>(null);

  // Approval/Rejection action state
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [allowEarlyAccess, setAllowEarlyAccess] = useState(false);
  const [showRejectFormModal, setShowRejectFormModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Debounce regSearch input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedRegSearch(regSearch);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [regSearch]);

  useEffect(() => {
    setRegPage(1);
  }, [debouncedRegSearch, regStatus, regPageSize]);

  const fetchRegistrations = async (page: number, size: number, search: string, status: string) => {
    setRegLoading(true);
    setRegError('');
    try {
      const offset = (page - 1) * size;
      const res = await registrationService.adminGetRegistrationsPage({
        input_search: search,
        input_status: status,
        input_limit: size,
        input_offset: offset
      });
      setRegistrations(res.rows || []);
      setRegTotal(res.total ?? 0);
    } catch (err: any) {
      console.error('Failed to load registrations:', err);
      setRegError('Gagal memuatkan senarai pendaftaran.');
    } finally {
      setRegLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'REGISTRATIONS') {
      fetchRegistrations(regPage, regPageSize, debouncedRegSearch, regStatus);
    }
  }, [activeSubTab, regPage, regPageSize, debouncedRegSearch, regStatus]);

  const handleOpenDetail = async (id: string) => {
    setSelectedRegId(id);
    setIsDetailModalOpen(true);
    setRegDetailLoading(true);
    setRegDetailError('');
    setRegDetail(null);
    try {
      const data = await registrationService.adminGetRegistrationDetail(id);
      setRegDetail(data);
    } catch (err: any) {
      console.error('Failed to load reg detail:', err);
      setRegDetailError('Gagal memuatkan maklumat pendaftaran.');
    } finally {
      setRegDetailLoading(false);
    }
  };

  const handleViewReceipt = async (path: string) => {
    try {
      const signedUrl = await registrationService.getReceiptSignedUrl(path);
      window.open(signedUrl, '_blank');
    } catch (err: any) {
      alert(err.message || 'Gagal membuka slip bayaran.');
    }
  };

  const handleDownloadReceipt = async (path: string, fileName: string) => {
    try {
      const signedUrl = await registrationService.getReceiptSignedUrl(path);
      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error('CORS or network error');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'slip_bayaran';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      // Fallback inside the sandbox environment if direct fetch fails
      try {
        const signedUrl = await registrationService.getReceiptSignedUrl(path);
        window.open(signedUrl, '_blank');
      } catch (e: any) {
        alert(e.message || 'Gagal mengakses slip bayaran.');
      }
    }
  };

  const handleApproveRegistration = async () => {
    if (!selectedRegId) return;
    setActionLoading(true);
    setActionError('');
    try {
      await registrationService.adminApproveRegistration(selectedRegId, allowEarlyAccess);
      setShowApproveConfirmModal(false);
      
      // Refresh details and registrations list
      if (isDetailModalOpen) {
        try {
          const updated = await registrationService.adminGetRegistrationDetail(selectedRegId);
          setRegDetail(updated);
        } catch (e) {
          console.error('Failed to re-fetch details:', e);
        }
      } else {
        setSelectedRegId(null);
      }
      
      fetchRegistrations(regPage, regPageSize, debouncedRegSearch, regStatus);
      
      // Refresh dashboard stats also
      const statsData = await adminService.getDashboardStats();
      setStats(statsData);

      // Toast feedback
      setSuccessToast("Pendaftaran diluluskan dan kod akses telah dijana.");
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      console.error('Approval failed:', err);
      setActionError(err.message || 'Gagal meluluskan pendaftaran.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRegistration = async () => {
    if (!selectedRegId) return;
    if (!rejectReason.trim()) {
      setActionError('Sila isi sebab penolakan terlebih dahulu.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await registrationService.adminRejectRegistration(selectedRegId, rejectReason);
      setShowRejectFormModal(false);
      
      // Refresh details and registrations list
      if (isDetailModalOpen) {
        try {
          const updated = await registrationService.adminGetRegistrationDetail(selectedRegId);
          setRegDetail(updated);
        } catch (e) {
          console.error('Failed to re-fetch details:', e);
        }
      } else {
        setSelectedRegId(null);
      }
      
      fetchRegistrations(regPage, regPageSize, debouncedRegSearch, regStatus);

      // Refresh stats
      const statsData = await adminService.getDashboardStats();
      setStats(statsData);

      // Toast feedback
      setSuccessToast("Pendaftaran telah ditolak.");
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err: any) {
      console.error('Rejection failed:', err);
      setActionError(err.message || 'Gagal menolak pendaftaran.');
    } finally {
      setActionLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchValue(searchTerm);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }
      fetchData();
    };
    checkAuth();
  }, []);

  const formatToDatetimeLocal = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, leaderData, sessionData, certData] = await Promise.all([
        adminService.getDashboardStats(),
        quizService.getLeaderboard(),
        adminService.getActiveSession(),
        quizService.adminGetCertificateStatus().catch(e => {
          console.error("Failed to load cert status:", e);
          return null;
        })
      ]);

      setStats(statsData);
      setLeaderboard(leaderData || []);
      setCertStatus(certData);
      
      if (sessionData) {
        setActiveSession(sessionData);
        setSessionTitle(sessionData.title);
        setSessionStart(formatToDatetimeLocal(sessionData.start_at));
        setSessionEnd(formatToDatetimeLocal(sessionData.end_at));
        setSessionDuration(sessionData.duration_seconds);
        setSessionIsActive(sessionData.is_active);
      }
    } catch (error) {
      console.error(error);
      alert('Gagal memuatkan data. Sila log masuk semula.');
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchResultsPage = async (page: number, size: number, search: string, status: string, completion: string) => {
    setResultsLoading(true);
    setResultsError('');
    try {
      const offset = (page - 1) * size;
      const res = await adminService.getQuizResultsPage({
        input_search: search,
        input_access_status: status,
        input_completion_status: completion,
        input_limit: size,
        input_offset: offset
      });
      setStudents(res.rows || []);
      setTotalRows(res.total ?? 0);
    } catch (err: any) {
      console.error('Failed to load paginated results:', err);
      setResultsError('Gagal memuatkan keputusan. Sila cuba semula.');
    } finally {
      setResultsLoading(false);
    }
  };

  // Load ALL candidates safely in batches for analysis
  const fetchAllCandidatesForAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      let loadedAll: any[] = [];
      let offset = 0;
      const limit = 200;
      let hasMore = true;
      let loopSafety = 0;

      while (hasMore && loopSafety < 50) { // Safety limit: up to 10k records
        loopSafety++;
        const res = await adminService.getQuizResultsPage({
          input_search: '',
          input_access_status: 'ALL',
          input_completion_status: 'ALL',
          input_limit: limit,
          input_offset: offset
        });
        
        const rows = res.rows || [];
        if (rows.length === 0) {
          hasMore = false;
        } else {
          loadedAll = [...loadedAll, ...rows];
          offset += limit;
          if (loadedAll.length >= res.total || rows.length < limit) {
            hasMore = false;
          }
        }
      }
      setAllCandidates(loadedAll);
    } catch (err) {
      console.error('Failed to load all candidates for analysis:', err);
      setAnalysisError('Data analisis tidak dapat dimuatkan sepenuhnya. Sila cuba semula.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Re-fetch when entering tab
  useEffect(() => {
    if (activeSubTab === 'CALON') {
      fetchAllCandidatesForAnalysis();
    }
  }, [activeSubTab]);

  // Stats summary for RINGKASAN
  const computedStats = useMemo(() => {
    const totalCalon = allCandidates.length;
    let kodAktif = 0;
    let kodPending = 0;
    let selesai = 0;
    let belumMulai = 0;
    let sedangJawab = 0;
    let totalScore = 0;
    let scoreCount = 0;
    const schools = new Set<string>();
    const states = new Set<string>();
    const ppds = new Set<string>();

    allCandidates.forEach(r => {
      const stateVal = (r.state || r.negeri || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const ppdVal = (r.ppd || r.district || r.daerah || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const schoolVal = (r.school_name || r.institute || r.institution || r.institut_sekolah || 'TIDAK DINYATAKAN').trim().toUpperCase();
      
      const accStatus = (r.access_status || r.status_kod || '').trim().toLowerCase();
      if (accStatus === 'active') {
        kodAktif++;
      } else if (accStatus === 'pending' || !accStatus) {
        kodPending++;
      }

      const isCompleted = r.is_completed === true;
      const startedAt = r.started_at;

      if (isCompleted) {
        selesai++;
      } else if (startedAt) {
        sedangJawab++;
      } else {
        belumMulai++;
      }

      const scoreValue = r.score !== undefined && r.score !== null ? Number(r.score) : null;
      if (scoreValue !== null) {
        totalScore += scoreValue;
        scoreCount++;
      }

      if (schoolVal && schoolVal !== 'TIDAK DINYATAKAN') schools.add(schoolVal);
      if (stateVal && stateVal !== 'TIDAK DINYATAKAN') states.add(stateVal);
      if (ppdVal && ppdVal !== 'TIDAK DINYATAKAN') ppds.add(ppdVal);
    });

    const avgScore = scoreCount > 0 ? (totalScore / scoreCount).toFixed(2) : '0.00';

    return {
      totalCalon,
      kodAktif,
      kodPending,
      selesai,
      belumMulai,
      sedangJawab,
      avgScore,
      totalSchools: schools.size,
      totalStates: states.size,
      totalPpds: ppds.size,
    };
  }, [allCandidates]);

  // Grouped structure for Negeri tab
  const dataByNegeri = useMemo(() => {
    const statesMap: { [key: string]: {
      negeri: string;
      students: any[];
      schools: Set<string>;
      kodAktif: number;
      kodPending: number;
      selesai: number;
      belum: number;
      sedang: number;
      totalScore: number;
      scoreCount: number;
      ppdsMap: { [key: string]: {
        ppd: string;
        students: any[];
        schools: Set<string>;
        selesai: number;
        belum: number;
        sedang: number;
        totalScore: number;
        scoreCount: number;
      }}
    }} = {};

    allCandidates.forEach(r => {
      const stateVal = (r.state || r.negeri || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const ppdVal = (r.ppd || r.district || r.daerah || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const schoolVal = (r.school_name || r.institute || r.institution || r.institut_sekolah || 'TIDAK DINYATAKAN').trim().toUpperCase();

      if (!statesMap[stateVal]) {
        statesMap[stateVal] = {
          negeri: stateVal,
          students: [],
          schools: new Set(),
          kodAktif: 0,
          kodPending: 0,
          selesai: 0,
          belum: 0,
          sedang: 0,
          totalScore: 0,
          scoreCount: 0,
          ppdsMap: {}
        };
      }

      const st = statesMap[stateVal];
      st.students.push(r);
      if (schoolVal && schoolVal !== 'TIDAK DINYATAKAN') st.schools.add(schoolVal);

      const accStatus = (r.access_status || r.status_kod || '').trim().toLowerCase();
      if (accStatus === 'active') st.kodAktif++;
      else if (accStatus === 'pending' || !accStatus) st.kodPending++;

      if (r.is_completed) st.selesai++;
      else if (r.started_at) st.sedang++;
      else st.belum++;

      const scoreValue = r.score !== undefined && r.score !== null ? Number(r.score) : null;
      if (scoreValue !== null) {
        st.totalScore += scoreValue;
        st.scoreCount++;
      }

      // ppd nested
      if (!st.ppdsMap[ppdVal]) {
        st.ppdsMap[ppdVal] = {
          ppd: ppdVal,
          students: [],
          schools: new Set(),
          selesai: 0,
          belum: 0,
          sedang: 0,
          totalScore: 0,
          scoreCount: 0
        };
      }

      const pObj = st.ppdsMap[ppdVal];
      pObj.students.push(r);
      if (schoolVal && schoolVal !== 'TIDAK DINYATAKAN') pObj.schools.add(schoolVal);
      if (r.is_completed) pObj.selesai++;
      else if (r.started_at) pObj.sedang++;
      else pObj.belum++;

      if (scoreValue !== null) {
        pObj.totalScore += scoreValue;
        pObj.scoreCount++;
      }
    });

    return Object.values(statesMap).map(st => {
      return {
        negeri: st.negeri,
        totalCalon: st.students.length,
        kodAktif: st.kodAktif,
        kodPending: st.kodPending,
        selesai: st.selesai,
        belum: st.belum,
        sedang: st.sedang,
        avgScore: st.scoreCount > 0 ? (st.totalScore / st.scoreCount).toFixed(2) : '0.00',
        totalSchools: st.schools.size,
        ppds: Object.values(st.ppdsMap).map(p => ({
          ppd: p.ppd,
          totalCalon: p.students.length,
          totalSchools: p.schools.size,
          selesai: p.selesai,
          belum: p.belum,
          sedang: p.sedang,
          avgScore: p.scoreCount > 0 ? (p.totalScore / p.scoreCount).toFixed(2) : '0.00'
        }))
      };
    });
  }, [allCandidates]);

  // Grouped structure for PPD tab
  const dataByPPD = useMemo(() => {
    const ppdsMap: { [key: string]: {
      ppd: string;
      negeri: string;
      students: any[];
      schoolsMap: { [key: string]: {
        schoolName: string;
        schoolCode: string;
        students: any[];
        selesai: number;
        belum: number;
        sedang: number;
        totalScore: number;
        scoreCount: number;
      }}
      kodAktif: number;
      kodPending: number;
      selesai: number;
      belum: number;
      sedang: number;
      totalScore: number;
      scoreCount: number;
    }} = {};

    allCandidates.forEach(r => {
      const stateVal = (r.state || r.negeri || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const ppdVal = (r.ppd || r.district || r.daerah || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const schoolVal = (r.school_name || r.institute || r.institution || r.institut_sekolah || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const codeVal = (r.school_code || '-').trim().toUpperCase();

      const key = `${stateVal}_${ppdVal}`;
      if (!ppdsMap[key]) {
        ppdsMap[key] = {
          ppd: ppdVal,
          negeri: stateVal,
          students: [],
          schoolsMap: {},
          kodAktif: 0,
          kodPending: 0,
          selesai: 0,
          belum: 0,
          sedang: 0,
          totalScore: 0,
          scoreCount: 0
        };
      }

      const pObj = ppdsMap[key];
      pObj.students.push(r);

      const accStatus = (r.access_status || r.status_kod || '').trim().toLowerCase();
      if (accStatus === 'active') pObj.kodAktif++;
      else if (accStatus === 'pending' || !accStatus) pObj.kodPending++;

      if (r.is_completed) pObj.selesai++;
      else if (r.started_at) pObj.sedang++;
      else pObj.belum++;

      const scoreValue = r.score !== undefined && r.score !== null ? Number(r.score) : null;
      if (scoreValue !== null) {
        pObj.totalScore += scoreValue;
        pObj.scoreCount++;
      }

      // Schools nested inside PPD
      const schoolKey = codeVal !== '-' ? codeVal : schoolVal;
      if (!pObj.schoolsMap[schoolKey]) {
        pObj.schoolsMap[schoolKey] = {
          schoolName: schoolVal,
          schoolCode: codeVal,
          students: [],
          selesai: 0,
          belum: 0,
          sedang: 0,
          totalScore: 0,
          scoreCount: 0
        };
      }

      const sch = pObj.schoolsMap[schoolKey];
      sch.students.push(r);
      if (r.is_completed) sch.selesai++;
      else if (r.started_at) sch.sedang++;
      else sch.belum++;

      if (scoreValue !== null) {
        sch.totalScore += scoreValue;
        sch.scoreCount++;
      }
    });

    return Object.values(ppdsMap).map(p => {
      return {
        ppd: p.ppd,
        negeri: p.negeri,
        totalCalon: p.students.length,
        kodAktif: p.kodAktif,
        kodPending: p.kodPending,
        selesai: p.selesai,
        belum: p.belum,
        sedang: p.sedang,
        avgScore: p.scoreCount > 0 ? (p.totalScore / p.scoreCount).toFixed(2) : '0.00',
        totalSchools: Object.keys(p.schoolsMap).length,
        schools: Object.values(p.schoolsMap).map(sch => ({
          schoolName: sch.schoolName,
          schoolCode: sch.schoolCode,
          totalCalon: sch.students.length,
          selesai: sch.selesai,
          belum: sch.belum,
          sedang: sch.sedang,
          avgScore: sch.scoreCount > 0 ? (sch.totalScore / sch.scoreCount).toFixed(2) : '0.00'
        }))
      };
    });
  }, [allCandidates]);

  // Grouped structure for Schools tab
  const dataBySchool = useMemo(() => {
    const schoolsMap: { [key: string]: {
      schoolName: string;
      schoolCode: string;
      negeri: string;
      ppd: string;
      students: any[];
      kodAktif: number;
      kodPending: number;
      selesai: number;
      belum: number;
      sedang: number;
      totalScore: number;
      scoreCount: number;
    }} = {};

    allCandidates.forEach(r => {
      const stateVal = (r.state || r.negeri || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const ppdVal = (r.ppd || r.district || r.daerah || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const schoolVal = (r.school_name || r.institute || r.institution || r.institut_sekolah || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const codeVal = (r.school_code || '-').trim().toUpperCase();

      const key = codeVal !== '-' ? codeVal : schoolVal;
      if (!schoolsMap[key]) {
        schoolsMap[key] = {
          schoolName: schoolVal,
          schoolCode: codeVal,
          negeri: stateVal,
          ppd: ppdVal,
          students: [],
          kodAktif: 0,
          kodPending: 0,
          selesai: 0,
          belum: 0,
          sedang: 0,
          totalScore: 0,
          scoreCount: 0
        };
      }

      const sch = schoolsMap[key];
      sch.students.push(r);

      const accStatus = (r.access_status || r.status_kod || '').trim().toLowerCase();
      if (accStatus === 'active') sch.kodAktif++;
      else if (accStatus === 'pending' || !accStatus) sch.kodPending++;

      if (r.is_completed) sch.selesai++;
      else if (r.started_at) sch.sedang++;
      else sch.belum++;

      const scoreValue = r.score !== undefined && r.score !== null ? Number(r.score) : null;
      if (scoreValue !== null) {
        sch.totalScore += scoreValue;
        sch.scoreCount++;
      }
    });

    return Object.values(schoolsMap).map(sch => {
      return {
        schoolName: sch.schoolName,
        schoolCode: sch.schoolCode,
        negeri: sch.negeri,
        ppd: sch.ppd,
        totalCalon: sch.students.length,
        kodAktif: sch.kodAktif,
        kodPending: sch.kodPending,
        selesai: sch.selesai,
        belum: sch.belum,
        sedang: sch.sedang,
        avgScore: sch.scoreCount > 0 ? (sch.totalScore / sch.scoreCount).toFixed(2) : '0.00',
        students: sch.students
      };
    });
  }, [allCandidates]);

  // Combined filters for SENARAI_CALON tab
  const filteredCandidates = useMemo(() => {
    return allCandidates.filter(r => {
      // 1. Search term filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const name = (r.student_name || r.name || '').toLowerCase();
        const ic = (r.ic_number || r.masked_ic || r.ic_masked || '').toLowerCase();
        const code = (r.access_code || '').toLowerCase();
        const school = (r.school_name || r.institute || '').toLowerCase();
        
        if (!name.includes(query) && !ic.includes(query) && !code.includes(query) && !school.includes(query)) {
          return false;
        }
      }

      // 2. Status Kod Filter
      if (statusFilter !== 'ALL') {
        const accStatus = (r.access_status || r.status_kod || '').trim().toUpperCase();
        if (statusFilter === 'ACTIVE' && accStatus !== 'ACTIVE') return false;
        if (statusFilter === 'PENDING' && accStatus !== 'PENDING' && accStatus !== '') return false;
        if (statusFilter === 'BLOCKED' && accStatus !== 'BLOCKED') return false;
      }

      // 3. Status Kuiz Filter
      if (completionFilter !== 'ALL') {
        if (completionFilter === 'COMPLETED' && !r.is_completed) return false;
        if (completionFilter === 'NOT_COMPLETED' && r.is_completed) return false;
      }

      // 4. Negeri Filter
      if (filterNegeri !== 'ALL') {
        const stateVal = (r.state || r.negeri || 'TIDAK DINYATAKAN').trim().toUpperCase();
        if (stateVal !== filterNegeri) return false;
      }

      // 5. PPD Filter
      if (filterPpd !== 'ALL') {
        const ppdVal = (r.ppd || r.district || r.daerah || 'TIDAK DINYATAKAN').trim().toUpperCase();
        if (ppdVal !== filterPpd) return false;
      }

      // 6. Sekolah Filter
      if (filterSchool !== 'ALL') {
        const schoolVal = (r.school_name || r.institute || r.institution || r.institut_sekolah || 'TIDAK DINYATAKAN').trim().toUpperCase();
        if (schoolVal !== filterSchool) return false;
      }

      return true;
    });
  }, [allCandidates, searchTerm, statusFilter, completionFilter, filterNegeri, filterPpd, filterSchool]);

  // Unique lists of filter variables
  const filterOptions = useMemo(() => {
    const states = new Set<string>();
    const ppds = new Set<string>();
    const schools = new Set<string>();

    allCandidates.forEach(r => {
      const stateVal = (r.state || r.negeri || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const ppdVal = (r.ppd || r.district || r.daerah || 'TIDAK DINYATAKAN').trim().toUpperCase();
      const schoolVal = (r.school_name || r.institute || r.institution || r.institut_sekolah || 'TIDAK DINYATAKAN').trim().toUpperCase();

      if (stateVal) states.add(stateVal);
      if (ppdVal) ppds.add(ppdVal);
      if (schoolVal) schools.add(schoolVal);
    });

    return {
      negeris: Array.from(states).sort(),
      ppds: Array.from(ppds).sort(),
      schools: Array.from(schools).sort()
    };
  }, [allCandidates]);

  // Client pagination
  const totalCalonCount = filteredCandidates.length;
  const paginatedCalon = useMemo(() => {
    const startIndex = (calonPage - 1) * calonPageSize;
    return filteredCandidates.slice(startIndex, startIndex + calonPageSize);
  }, [filteredCandidates, calonPage]);

  // Actions for custom CSV downloads
  const handleExportCalonCSV = () => {
    const rows = filteredCandidates.map(r => ({
      'Nama Murid': (r.student_name || '').toUpperCase(),
      'No. KP': maskICNumber(r.ic_number),
      'Kod Akses': r.access_code || '-',
      'Status Kod': (r.access_status || 'PENDING').toUpperCase(),
      'Status Kuiz': r.is_completed ? 'SELESAI' : r.started_at ? 'MENJAWAB' : 'BELUM',
      'Markah %': r.score !== null && r.score !== undefined ? `${r.score} %` : '-',
      'Masa Mula': r.started_at ? new Date(r.started_at).toLocaleString('ms-MY') : '-',
      'Sekolah': (r.school_name || '').toUpperCase(),
      'Kod Sekolah': (r.school_code || '').toUpperCase(),
      'Negeri': (r.state || 'TIDAK DINYATAKAN').toUpperCase(),
      'PPD / Daerah': (r.ppd || r.district || r.daerah || 'TIDAK DINYATAKAN').toUpperCase()
    }));
    exportToCSV(rows, 'Senarai_Calon_CIM2026');
  };

  const handleExportNegeriCSV = () => {
    const rows = dataByNegeri.map(st => ({
      'Negeri': st.negeri,
      'Jumlah Calon': st.totalCalon,
      'Kod Aktif': st.kodAktif,
      'Kod Pending': st.kodPending,
      'Sudah Selesai': st.selesai,
      'Belum Menjawab': st.belum,
      'Purata Markah': st.avgScore,
      'Bilangan Sekolah': st.totalSchools
    }));
    exportToCSV(rows, 'Ringkasan_Negeri_CIM2026');
  };

  const handleExportSekolahCSV = () => {
    const rows = dataBySchool.map(sch => ({
      'Nama Sekolah': sch.schoolName,
      'Kod Sekolah': sch.schoolCode,
      'Negeri': sch.negeri,
      'PPD / Daerah': sch.ppd,
      'Jumlah Calon': sch.totalCalon,
      'Kod Aktif': sch.kodAktif,
      'Kod Pending': sch.kodPending,
      'Sudah Selesai': sch.selesai,
      'Belum Menjawab': sch.belum,
      'Purata Markah': sch.avgScore
    }));
    exportToCSV(rows, 'Ringkasan_Sekolah_CIM2026');
  };

  // Reset page index on filter or search parameter alterations
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchValue, statusFilter, completionFilter, pageSize]);

  // Load results
  useEffect(() => {
    fetchResultsPage(currentPage, pageSize, debouncedSearchValue, statusFilter, completionFilter);
  }, [currentPage, pageSize, debouncedSearchValue, statusFilter, completionFilter]);

  const handleReleaseCertificates = async () => {
    setReleasing(true);
    setReleaseError('');
    try {
      await quizService.releaseCertificates();
      // Refresh status and stats
      const certData = await quizService.adminGetCertificateStatus();
      setCertStatus(certData);
      setShowReleaseModal(false);
    } catch (error: any) {
      console.error('Error releasing certificates:', error);
      if (error?.message?.includes('QUIZ_NOT_ENDED')) {
        setReleaseError('Sijil hanya boleh direlease selepas tempoh kuiz tamat.');
      } else {
        setReleaseError('Gagal release sijil. Sila cuba semula.');
      }
    } finally {
      setReleasing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const handleExportCSV = async () => {
    try {
      setResultsLoading(true);
      const allData = await adminService.exportQuizResults();
      if (allData && allData.length > 0) {
        exportToCSV(allData, 'Keputusan_Semua_Murid_CIM2026');
      } else {
        alert('Tiada data untuk dieksport.');
      }
    } catch (err: any) {
      console.error('Error exporting CSV:', err);
      alert('Gagal mengeksport CSV. Sila cuba semula.');
    } finally {
      setResultsLoading(false);
    }
  };

  const maskICNumber = (ic: string) => {
    if (!ic) return '-';
    const cleaned = ic.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      const last4 = cleaned.slice(-4);
      return `******${last4}`;
    }
    return ic;
  };

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    setUpdatingSession(true);
    setSessionMessage({ text: '', type: '' });

    try {
      const updated = await adminService.updateSession(activeSession.id, {
        start_at: new Date(sessionStart).toISOString(),
        end_at: new Date(sessionEnd).toISOString(),
        duration_seconds: Number(sessionDuration),
        is_active: sessionIsActive
      });

      setActiveSession(updated);
      setSessionMessage({ text: 'Sesi kuiz berjaya dikemaskini!', type: 'success' });
      
      // Refresh stats in case timer affects counts
      const statsData = await adminService.getDashboardStats();
      setStats(statsData);
    } catch (error: any) {
      setSessionMessage({ text: error.message || 'Gagal mengemaskini sesi.', type: 'error' });
    } finally {
      setUpdatingSession(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center space-y-4">
      <RefreshCw className="w-10 h-10 text-blue-900 animate-spin" />
      <span className="text-slate-500 font-semibold text-sm">Menghubungkan ke Pangkalan Data CIM...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white font-black px-2.5 py-1 text-sm rounded">CIM 2026</span>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">Portal Pentadbir Kuiz</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="flex items-center text-slate-300 hover:text-white cursor-pointer hover:underline text-sm font-medium">
              <Home className="w-4 h-4 mr-1.5" /> Laman Utama
            </button>
            <div className="h-4 w-[1px] bg-slate-700"></div>
            <button onClick={handleLogout} className="flex items-center text-red-400 hover:text-red-300 cursor-pointer text-sm font-medium hover:underline">
              <LogOut className="w-4 h-4 mr-1.5" /> Log Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-8 pb-16">
        
        {/* Stats Section */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Sekolah Terlibat</div>
                  <div className="text-3xl font-black text-slate-800 mt-2">{stats.total_schools}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><School className="w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Calon Pembuka Kod</div>
                  <div className="text-3xl font-black text-slate-800 mt-2">{stats.total_students}</div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Users className="w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Telah Selesai Kuiz</div>
                  <div className="text-3xl font-black text-slate-800 mt-2">{stats.total_completed}</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><CheckCircle className="w-6 h-6" /></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Belum Melengkapkan</div>
                  <div className="text-3xl font-black text-slate-800 mt-2">{stats.total_pending}</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl text-amber-600"><Clock className="w-6 h-6" /></div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Settings and Leaderboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Sesi and Certificate Control */}
          <div className="space-y-6 lg:col-span-1">
            {/* Sesi Kuiz Control Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <Settings className="w-5 h-5 text-blue-900" />
                <h2 className="text-lg font-bold text-slate-800">Tetapan Sesi Kuiz</h2>
              </div>
              {activeSession ? (
                <form onSubmit={handleUpdateSession} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tajuk Sesi</label>
                    <input
                      type="text"
                      disabled
                      value={sessionTitle}
                      placeholder="Nama Sesi Kuiz"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Waktu Mula Kuiz</label>
                    <input
                      type="datetime-local"
                      value={sessionStart}
                      onChange={e => setSessionStart(e.target.value)}
                      required
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Waktu Tamat Kuiz</label>
                    <input
                      type="datetime-local"
                      value={sessionEnd}
                      onChange={e => setSessionEnd(e.target.value)}
                      required
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tempoh Kuiz (Saat)</label>
                    <input
                      type="number"
                      value={sessionDuration}
                      onChange={e => setSessionDuration(Number(e.target.value))}
                      required
                      min={60}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 font-semibold mt-1 block">7200 saat bersamaan 2 jam menjawab.</span>
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="is_active_check"
                      checked={sessionIsActive}
                      onChange={e => setSessionIsActive(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_active_check" className="text-xs font-bold text-slate-600 uppercase tracking-wider select-none cursor-pointer">Sesi Aktif Utama</label>
                  </div>
                  {sessionMessage.text && (
                    <div className={`text-xs p-3 rounded-lg font-medium flex items-start gap-2 ${sessionMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {sessionMessage.type === 'success' ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                      <span>{sessionMessage.text}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={updatingSession}
                    className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 cursor-pointer"
                  >
                    {updatingSession ? 'Mengemaskini...' : 'Simpan Tetapan'}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium">
                  Sesi Kuiz Aktif sedia ada tidak dijumpai. Sila jalankan sql seed template atau pastikan `is_active = true` dipasang dalam data `quiz_sessions`.
                </div>
              )}
            </div>

            {/* Kawalan Sijil Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 font-sans">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <Award className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-bold text-slate-800">Kawalan Sijil</h2>
              </div>
              
              {certStatus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight block">Status Pelepasan</span>
                      <span className={`text-xs font-extrabold mt-1.5 inline-block px-2 py-0.5 rounded-full ${
                        (certStatus.certificates_released || certStatus.released)
                          ? 'bg-emerald-55/60 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-105/60 text-amber-850 border border-amber-200'
                      }`}>
                        {(certStatus.certificates_released || certStatus.released) ? 'Telah Dilepaskan' : 'Belum Dilepaskan'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center flex flex-col justify-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight block font-sans">Sijil Pencapaian</span>
                      <span className="text-xs font-extrabold text-slate-700 mt-1.5 inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full">
                        {certStatus.total_achievement_receivers || certStatus.total_achievement || certStatus.achievement_count || 0} Penerima
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">Peserta Selesai Kuiz:</span>
                      <span className="font-bold text-slate-700">{certStatus.total_completed ?? 0} orang</span>
                    </div>
                    {(certStatus.released_at || certStatus.release_date) ? (
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Tarikh Release:</span>
                        <span className="font-bold text-slate-700 text-right">
                          {(() => {
                            const dateStr = certStatus.released_at || certStatus.release_date;
                            try {
                              return new Date(dateStr).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
                            } catch (e) {
                              return dateStr;
                            }
                          })()}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* ONE Release Button with Confirmation Modal Trigger */}
                  <button
                    onClick={() => {
                      if (!(certStatus.certificates_released || certStatus.released)) {
                        setShowReleaseModal(true);
                      }
                    }}
                    disabled={certStatus.certificates_released || certStatus.released}
                    className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs cursor-pointer ${
                      (certStatus.certificates_released || certStatus.released)
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-700 text-white hover:shadow-md'
                    }`}
                  >
                    {(certStatus.certificates_released || certStatus.released) ? 'Sijil Telah Direlease' : 'Release Sijil'}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                  Sedang memuatkan status kawalan sijil...
                </div>
              )}
            </div>
          </div>

          {/* Top 10 Leaderboard */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Kejuaraan 10 Terbaik Semasa</span>
              <span className="text-[10px] uppercase tracking-widest bg-yellow-100 text-yellow-850 px-2 py-1 rounded font-black">Top 10 Live</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 font-bold uppercase tracking-wider text-slate-400">#</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider text-slate-400">Nama Calon</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider text-slate-400">Sekolah</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider text-slate-400 text-right">Markah %</th>
                    <th className="p-2.5 font-bold uppercase tracking-wider text-slate-400 text-right">Masa Menjawab</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length > 0 ? leaderboard.map((l, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 font-medium">
                      <td className="p-2.5 font-black text-slate-900 text-sm">
                        {idx === 0 ? '🏆 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                      </td>
                      <td className="p-2.5 text-slate-800 text-sm uppercase">{l.student_name}</td>
                      <td className="p-2.5 text-slate-500 uppercase">{l.school_name}</td>
                      <td className="p-2.5 font-black text-blue-900 text-sm text-right">{l.score} %</td>
                      <td className="p-2.5 text-slate-500 text-right font-mono">{l.time_taken_seconds !== null ? (Math.floor(l.time_taken_seconds / 60) + 'm ' + (l.time_taken_seconds % 60) + 's') : '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic">Tiada calon selesai menjawab setakat ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Candidate Monitor Control Panel with sub-tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[650px]">
          
          {/* Sub Tab Switcher */}
          <div className="flex border-b border-slate-100 mb-6 gap-2">
            <button
              onClick={() => setActiveSubTab('CALON')}
              type="button"
              className={`pb-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'CALON'
                  ? 'border-blue-900 text-blue-900'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              Monitor Markah & Status Calon
            </button>
            <button
              onClick={() => setActiveSubTab('REGISTRATIONS')}
              type="button"
              className={`pb-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'REGISTRATIONS'
                  ? 'border-blue-900 text-blue-900'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              Urus Pendaftaran & Sekolah
            </button>
          </div>

          {activeSubTab === 'CALON' ? (
            <>
              {/* Segmented Sub-Sub-Tabs for analysis */}
              <div className="flex flex-wrap border border-slate-200 mb-6 bg-slate-50/80 p-1.5 rounded-2xl gap-1">
                {(['RINGKASAN', 'NEGERI', 'PPD', 'SEKOLAH', 'SENARAI_CALON'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAnalysisTab(t)}
                    type="button"
                    className={`px-4 py-2.5 text-xs font-black rounded-xl transition duration-200 cursor-pointer ${
                      analysisTab === t
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-150'
                    }`}
                  >
                    {t === 'RINGKASAN' && 'Ringkasan'}
                    {t === 'NEGERI' && 'Negeri'}
                    {t === 'PPD' && 'PPD / Daerah'}
                    {t === 'SEKOLAH' && 'Sekolah'}
                    {t === 'SENARAI_CALON' && 'Senarai Calon'}
                  </button>
                ))}
              </div>

              {analysisLoading && allCandidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
                  <span className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Memuatkan data analisis calon...</span>
                </div>
              ) : analysisError ? (
                <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 w-full text-slate-800 text-xs font-semibold mb-6">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <p>Data analisis tidak dapat dimuatkan sepenuhnya. Sila cuba semula.</p>
                </div>
              ) : (
                <>
                  {/* RINGKASAN SUB-TAB */}
                  {analysisTab === 'RINGKASAN' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-xs hover:shadow-xs transition">
                          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Jumlah Calon</div>
                          <div className="text-2xl font-black text-slate-900">{computedStats.totalCalon}</div>
                        </div>
                        <div className="bg-green-50/70 border border-green-200 p-4 rounded-2xl shadow-xs">
                          <div className="text-[10px] text-green-600 font-extrabold uppercase tracking-widest mb-1.5">Kod Aktif</div>
                          <div className="text-2xl font-black text-green-700">{computedStats.kodAktif}</div>
                        </div>
                        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl shadow-xs">
                          <div className="text-[10px] text-amber-600 font-extrabold uppercase tracking-widest mb-1.5">Kod Pending</div>
                          <div className="text-2xl font-black text-amber-700">{computedStats.kodPending}</div>
                        </div>
                        <div className="bg-emerald-55/70 border border-emerald-200 p-4 rounded-2xl shadow-xs">
                          <div className="text-[10px] text-emerald-605 font-extrabold uppercase tracking-widest mb-1.5">Sudah Selesai Kuiz</div>
                          <div className="text-2xl font-black text-emerald-700">{computedStats.selesai}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-xs">
                          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Belum Menjawab</div>
                          <div className="text-2xl font-black text-slate-700">{computedStats.belumMulai}</div>
                        </div>
                        <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl shadow-xs">
                          <div className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest mb-1.5">Sedang Menjawab</div>
                          <div className="text-2xl font-black text-blue-700">{computedStats.sedangJawab}</div>
                        </div>
                        <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-2xl shadow-xs">
                          <div className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest mb-1.5">Purata Markah</div>
                          <div className="text-2xl font-black text-indigo-900">{computedStats.avgScore}%</div>
                        </div>
                        <div className="bg-sky-50/70 border border-sky-200 p-4 rounded-2xl shadow-xs">
                          <div className="text-[10px] text-sky-600 font-extrabold uppercase tracking-widest mb-1.5">Jumlah Sekolah</div>
                          <div className="text-2xl font-black text-sky-900">{computedStats.totalSchools}</div>
                        </div>
                        <div className="bg-violet-50/70 border border-violet-200 p-4 rounded-2xl shadow-xs">
                          <div className="text-[10px] text-violet-600 font-extrabold uppercase tracking-widest mb-1.5">Jumlah Negeri</div>
                          <div className="text-2xl font-black text-violet-900">{computedStats.totalStates}</div>
                        </div>
                        <div className="bg-teal-50/70 border border-teal-200 p-4 rounded-2xl shadow-xs">
                          <div className="text-[10px] text-teal-600 font-extrabold uppercase tracking-widest mb-1.5">Jumlah PPD</div>
                          <div className="text-2xl font-black text-teal-900">{computedStats.totalPpds}</div>
                        </div>
                      </div>

                      {/* Section: Tetapan Pendaftaran (Admin Control Panel) */}
                      <div className="bg-white border border-slate-200/90 rounded-[2rem] p-6 sm:p-8 shadow-xs relative mt-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6 mb-6">
                          <div>
                            <h3 className="text-lg font-black text-slate-800 font-sans tracking-tight mb-1">Tetapan Pendaftaran</h3>
                            <p className="text-xs text-slate-400 font-medium max-w-xl">
                              Had kemasukan pendaftaran kelompok bagi pihak sekolah, guru pengiring dan calon ujian minda secara automatik atau manual.
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              adminRegSettings.is_open 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                              Status Am: {adminRegSettings.is_open ? 'DIBUKA' : 'DITUTUP'}
                            </span>
                            <span className="px-3 py-1.5 rounded-full text-[10px] bg-slate-50 border border-slate-150 text-slate-600 font-black uppercase tracking-wider">
                              Mod: {
                                adminRegSettings.mode === 'open' ? 'BUKA MANUAL' : 
                                adminRegSettings.mode === 'closed' ? 'TUTUP MANUAL' : 'AUTO'
                              }
                            </span>
                          </div>
                        </div>

                        {adminRegSettings.loading ? (
                          <div className="text-slate-400 text-xs italic text-center py-6">
                            Memproses tetapan semasa...
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                            <div className="md:col-span-8 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                                  <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">Status Semasa Pendaftaran</div>
                                  <div className={`text-base font-black uppercase font-sans tracking-tight ${
                                    adminRegSettings.is_open ? 'text-emerald-700' : 'text-red-700'
                                  }`}>
                                    {adminRegSettings.is_open ? '● DIBUKA' : '● DITUTUP'}
                                  </div>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                                  <div className="text-[9px] text-slate-405 font-extrabold uppercase tracking-widest mb-1">Mod Semasa</div>
                                  <div className="text-base font-black text-slate-800 uppercase font-sans tracking-tight">
                                    {adminRegSettings.mode === 'open' && 'BUKA MANUAL'}
                                    {adminRegSettings.mode === 'closed' && 'TUTUP MANUAL'}
                                    {adminRegSettings.mode === 'auto' && 'AUTO'}
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
                                <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Tarikh Tutup Automatik (Sistem)</div>
                                <div className="text-xs font-bold text-slate-700">
                                  19 Jun 2026 jam 1800 (Waktu Malaysia UTC+8)
                                </div>
                                <p className="text-[11px] text-slate-450 leading-relaxed font-medium">
                                  Mod Auto akan menutup pendaftaran secara automatik pada 19 Jun 2026 jam 1800. Admin masih boleh membuka atau menutup pendaftaran secara manual sekiranya perlu.
                                </p>
                              </div>
                            </div>

                            {/* Control Buttons */}
                            <div className="md:col-span-4 flex flex-col gap-2.5 w-full">
                              <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest px-1">Tindakan Manual</div>
                              
                              <button
                                type="button"
                                onClick={() => setModalType('open')}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm text-center"
                              >
                                Buka Pendaftaran
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => setModalType('closed')}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm text-center"
                              >
                                Tutup Pendaftaran
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => setModalType('auto')}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm text-center"
                              >
                                Tetapkan Semula Kepada Auto
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* NEGERI SUB-TAB */}
                  {analysisTab === 'NEGERI' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Analisis Mengikut Negeri</p>
                        <button
                          onClick={handleExportNegeriCSV}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold border transition flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Eksport Ringkasan Negeri
                        </button>
                      </div>

                      <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white">
                        <table className="w-full text-left text-xs text-slate-650">
                          <thead className="bg-slate-50 border-b border-slate-150">
                            <tr>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b">Negeri</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Jumlah Calon</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Kod Aktif</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Kod Pending</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Sudah Selesai</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Belum Mula</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-right">Purata Markah</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Bil. Sekolah</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-right">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dataByNegeri.length > 0 ? (
                              dataByNegeri.map((st, i) => {
                                const isExpanded = !!expandedStates[`negeri_${st.negeri}`];
                                return (
                                  <React.Fragment key={i}>
                                    <tr className="border-b border-slate-100 hover:bg-slate-50 font-bold text-slate-700 whitespace-nowrap">
                                      <td className="p-3 text-sm text-slate-800 uppercase tracking-wide">{st.negeri}</td>
                                      <td className="p-3 text-center text-slate-800 font-mono text-sm">{st.totalCalon}</td>
                                      <td className="p-3 text-center text-green-700 font-mono">{st.kodAktif}</td>
                                      <td className="p-3 text-center text-amber-700 font-mono">{st.kodPending}</td>
                                      <td className="p-3 text-center text-emerald-700 font-mono">{st.selesai}</td>
                                      <td className="p-3 text-center text-slate-400 font-mono">{st.belum}</td>
                                      <td className="p-3 text-right font-black text-blue-900 font-mono text-sm">{st.avgScore}%</td>
                                      <td className="p-3 text-center font-mono">{st.totalSchools}</td>
                                      <td className="p-3 text-right">
                                        <button
                                          type="button"
                                          onClick={() => toggleExpand(`negeri_${st.negeri}`)}
                                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ml-auto"
                                        >
                                          {isExpanded ? (
                                            <>Tutup <ChevronUp className="w-3.5 h-3.5" /></>
                                          ) : (
                                            <>Details <ChevronDown className="w-3.5 h-3.5" /></>
                                          )}
                                        </button>
                                      </td>
                                    </tr>
                                    
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={9} className="bg-slate-50/50 p-4 border-b border-slate-150">
                                          <div className="bg-white border select-none rounded-xl overflow-hidden shadow-xs p-3">
                                            <div className="text-xs font-extrabold text-blue-900 mb-2.5 tracking-wide uppercase">
                                              Pecahan PPD Di Negeri {st.negeri}
                                            </div>
                                            <table className="w-full text-left text-xs text-slate-600">
                                              <thead className="bg-slate-50 text-slate-400 border-b border-slate-100">
                                                <tr>
                                                  <th className="p-2 font-bold uppercase tracking-wider">PPD / Daerah</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-center">Jumlah Calon</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-center">Bil. Sekolah</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-center">Sudah Selesai</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-center">Belum Mula</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-right">Purata Markah</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {st.ppds.length > 0 ? (
                                                  st.ppds.map((pd, index) => (
                                                    <tr key={index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 font-medium whitespace-nowrap">
                                                      <td className="p-2 text-slate-800 font-bold uppercase">{pd.ppd}</td>
                                                      <td className="p-2 text-center text-slate-700 font-semibold font-mono">{pd.totalCalon}</td>
                                                      <td className="p-2 text-center font-mono">{pd.totalSchools}</td>
                                                      <td className="p-2 text-center text-emerald-600 font-mono">{pd.selesai}</td>
                                                      <td className="p-2 text-center text-slate-400 font-mono">{pd.belum}</td>
                                                      <td className="p-2 text-right font-black text-blue-900 font-mono">{pd.avgScore}%</td>
                                                    </tr>
                                                  ))
                                                ) : (
                                                  <tr>
                                                    <td colSpan={6} className="p-2 text-center text-slate-400 italic">Tiada PPD dijumpai.</td>
                                                  </tr>
                                                )}
                                              </tbody>
                                            </table>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={9} className="p-8 text-center text-slate-400 italic">Tiada data negeri ditemui.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* PPD SUB-TAB */}
                  {analysisTab === 'PPD' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Analisis Mengikut PPD / Daerah</p>
                        <button
                          onClick={handleExportNegeriCSV} // reuse existing generator safe for filtering
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold border transition flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Eksport Ringkasan PPD / Daerah
                        </button>
                      </div>

                      <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white">
                        <table className="w-full text-left text-xs text-slate-650">
                          <thead className="bg-slate-50 border-b border-slate-150">
                            <tr>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b">Negeri</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b">PPD / Daerah</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Jumlah Calon</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Bil. Sekolah</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Kod Aktif</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Kod Pending</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Sudah Selesai</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Belum Mula</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-right">Purata Markah</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-right">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dataByPPD.length > 0 ? (
                              dataByPPD.map((p, i) => {
                                const isExpanded = !!expandedStates[`ppd_${p.negeri}_${p.ppd}`];
                                return (
                                  <React.Fragment key={i}>
                                    <tr className="border-b border-slate-100 hover:bg-slate-50 font-bold text-slate-700 whitespace-nowrap">
                                      <td className="p-3 uppercase text-slate-400">{p.negeri}</td>
                                      <td className="p-3 text-sm text-slate-800 uppercase tracking-wide">{p.ppd}</td>
                                      <td className="p-3 text-center text-slate-800 font-mono text-sm">{p.totalCalon}</td>
                                      <td className="p-3 text-center font-mono">{p.totalSchools}</td>
                                      <td className="p-3 text-center text-green-705 font-mono">{p.kodAktif}</td>
                                      <td className="p-3 text-center text-amber-700 font-mono">{p.kodPending}</td>
                                      <td className="p-3 text-center text-emerald-700 font-mono">{p.selesai}</td>
                                      <td className="p-3 text-center text-slate-400 font-mono">{p.belum}</td>
                                      <td className="p-3 text-right font-black text-blue-900 font-mono text-sm">{p.avgScore}%</td>
                                      <td className="p-3 text-right">
                                        <button
                                          type="button"
                                          onClick={() => toggleExpand(`ppd_${p.negeri}_${p.ppd}`)}
                                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ml-auto"
                                        >
                                          {isExpanded ? (
                                            <>Tutup <ChevronUp className="w-3.5 h-3.5" /></>
                                          ) : (
                                            <>Sekolah <ChevronDown className="w-3.5 h-3.5" /></>
                                          )}
                                        </button>
                                      </td>
                                    </tr>

                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={10} className="bg-slate-50/50 p-4 border-b border-slate-150">
                                          <div className="bg-white border rounded-xl overflow-hidden shadow-xs p-3">
                                            <div className="text-xs font-extrabold text-blue-900 mb-2 tracking-wide uppercase">
                                              Senarai Sekolah Di {p.ppd} ({p.negeri})
                                            </div>
                                            <table className="w-full text-left text-xs text-slate-600">
                                              <thead className="bg-slate-50 text-slate-400 border-b">
                                                <tr>
                                                  <th className="p-2 font-bold uppercase tracking-wider">Kod Sekolah</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider">Nama Sekolah</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-center">Jumlah Calon</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-center">Sudah Selesai</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-center">Belum Mula</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-right">Purata Markah</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {p.schools.length > 0 ? (
                                                  p.schools.map((sch, index) => (
                                                    <tr key={index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 font-medium whitespace-nowrap">
                                                      <td className="p-2 text-slate-605 font-mono font-bold uppercase">{sch.schoolCode}</td>
                                                      <td className="p-2 text-slate-800 font-bold uppercase max-w-[250px] truncate">{sch.schoolName}</td>
                                                      <td className="p-2 text-center text-slate-700 font-semibold font-mono">{sch.totalCalon}</td>
                                                      <td className="p-2 text-center text-emerald-600 font-mono">{sch.selesai}</td>
                                                      <td className="p-2 text-center text-slate-400 font-mono">{sch.belum}</td>
                                                      <td className="p-2 text-right font-black text-blue-900 font-mono">{sch.avgScore}%</td>
                                                    </tr>
                                                  ))
                                                ) : (
                                                  <tr>
                                                    <td colSpan={6} className="p-2 text-center text-slate-400 italic">Tiada sekolah dijumpai.</td>
                                                  </tr>
                                                )}
                                              </tbody>
                                            </table>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={10} className="p-8 text-center text-slate-400 italic">Tiada data PPD/Daerah dijumpai.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SEKOLAH SUB-TAB */}
                  {analysisTab === 'SEKOLAH' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Analisis Mengikut Sekolah</p>
                        <button
                          onClick={handleExportSekolahCSV}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold border transition flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Eksport Ringkasan Sekolah
                        </button>
                      </div>

                      <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white">
                        <table className="w-full text-left text-xs text-slate-650">
                          <thead className="bg-slate-50 border-b border-slate-150">
                            <tr>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b">Negeri/PPD</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b">Sekolah</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Jumlah Calon</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Kod Aktif</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Kod Pending</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Sudah Selesai</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-center">Belum Mula</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-right">Purata Markah</th>
                              <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest border-b text-right">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dataBySchool.length > 0 ? (
                              dataBySchool.map((sch, i) => {
                                const isExpanded = !!expandedStates[`school_${sch.schoolCode}_${sch.schoolName}`];
                                return (
                                  <React.Fragment key={i}>
                                    <tr className="border-b border-slate-100 hover:bg-slate-50 font-bold text-slate-700 whitespace-nowrap">
                                      <td className="p-3 uppercase text-slate-400 leading-tight">
                                        <span className="block text-[10px] font-bold text-blue-900">{sch.negeri}</span>
                                        <span className="block text-[9px] text-slate-400 mt-0.5">{sch.ppd}</span>
                                      </td>
                                      <td className="p-3">
                                        <span className="text-slate-800 text-sm font-bold block uppercase truncate max-w-[200px]">{sch.schoolName}</span>
                                        <span className="text-[10px] text-slate-400 font-mono uppercase">{sch.schoolCode}</span>
                                      </td>
                                      <td className="p-3 text-center text-slate-800 font-mono text-sm">{sch.totalCalon}</td>
                                      <td className="p-3 text-center text-green-700 font-mono">{sch.kodAktif}</td>
                                      <td className="p-3 text-center text-amber-700 font-mono">{sch.kodPending}</td>
                                      <td className="p-3 text-center text-emerald-700 font-mono">{sch.selesai}</td>
                                      <td className="p-3 text-center text-slate-400 font-mono">{sch.belum}</td>
                                      <td className="p-3 text-right font-black text-blue-900 font-mono text-sm">{sch.avgScore}%</td>
                                      <td className="p-3 text-right">
                                        <button
                                          type="button"
                                          onClick={() => toggleExpand(`school_${sch.schoolCode}_${sch.schoolName}`)}
                                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ml-auto"
                                        >
                                          {isExpanded ? (
                                            <>Tutup <ChevronUp className="w-3.5 h-3.5" /></>
                                          ) : (
                                            <>Calon <ChevronDown className="w-3.5 h-3.5" /></>
                                          )}
                                        </button>
                                      </td>
                                    </tr>

                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={9} className="bg-slate-50/50 p-4 border-b border-slate-150">
                                          <div className="bg-white border rounded-xl overflow-hidden shadow-xs p-3">
                                            <div className="text-xs font-extrabold text-blue-900 mb-2 tracking-wide uppercase">
                                              Senarai Calon Di {sch.schoolName} ({sch.schoolCode})
                                            </div>
                                            <table className="w-full text-left text-xs text-slate-600">
                                              <thead className="bg-slate-50 text-slate-400 border-b border-slate-100">
                                                <tr>
                                                  <th className="p-2 font-bold uppercase tracking-wider">Nama Murid</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider">No. KP (Masked)</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider">Kod Akses</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-center">Status Kod</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-center">Kertas Kuiz</th>
                                                  <th className="p-2 font-bold uppercase tracking-wider text-right">Markah %</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {sch.students.length > 0 ? (
                                                  sch.students.map((r, index) => (
                                                    <tr key={index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 font-medium whitespace-nowrap">
                                                      <td className="p-2 text-slate-800 font-bold uppercase text-xs">{r.student_name}</td>
                                                      <td className="p-2 text-slate-500 font-mono">{maskICNumber(r.ic_number)}</td>
                                                      <td className="p-2"><span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">{r.access_code}</span></td>
                                                      <td className="p-2 text-center">
                                                        {r.access_status === 'active' ? (
                                                          <span className="bg-green-50 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded border border-green-200">AKTIF</span>
                                                        ) : r.access_status === 'blocked' ? (
                                                          <span className="bg-red-50 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded border border-red-200">BLOCKED</span>
                                                        ) : (
                                                          <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded border">PENDING</span>
                                                        )}
                                                      </td>
                                                      <td className="p-2 text-center">
                                                        {r.is_completed ? (
                                                          <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-100 text-[9px]">Selesai</span>
                                                        ) : r.started_at ? (
                                                          <span className="bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded border border-amber-100 text-[9px]">Menjawab</span>
                                                        ) : (
                                                          <span className="bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded text-[9px]">Belum</span>
                                                        )}
                                                      </td>
                                                      <td className="p-2 font-black text-right text-slate-800 font-mono">
                                                        {r.score !== null ? `${r.score} %` : '-'}
                                                      </td>
                                                    </tr>
                                                  ))
                                                ) : (
                                                  <tr>
                                                    <td colSpan={6} className="p-2 text-center text-slate-400 italic">Tiada calon berdaftar untuk sekolah ini.</td>
                                                  </tr>
                                                )}
                                              </tbody>
                                            </table>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={9} className="p-8 text-center text-slate-400 italic">Tiada data sekolah dijumpai.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SENARAI CALON SUB-TAB */}
                  {analysisTab === 'SENARAI_CALON' && (
                    <>
                      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <h2 className="text-xl font-bold text-slate-800">Senarai Markah & Status Calon</h2>
                          <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">Pemantauan Masa Nyata Sebarang Peperiksaan</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                          {/* Advanced filters */}
                          <select
                            className="p-2 border rounded-lg border-slate-300 text-xs font-bold text-slate-605 bg-white cursor-pointer"
                            value={filterNegeri}
                            onChange={e => setFilterNegeri(e.target.value)}
                          >
                            <option value="ALL">SEMUA NEGERI</option>
                            {filterOptions.negeris.map((n, idx) => (
                              <option key={idx} value={n}>{n}</option>
                            ))}
                          </select>

                          <select
                            className="p-2 border rounded-lg border-slate-300 text-xs font-bold text-slate-605 bg-white cursor-pointer"
                            value={filterPpd}
                            onChange={e => setFilterPpd(e.target.value)}
                          >
                            <option value="ALL">SEMUA PPD</option>
                            {filterOptions.ppds.map((p, idx) => (
                              <option key={idx} value={p}>{p}</option>
                            ))}
                          </select>

                          <select
                            className="p-2 border rounded-lg border-slate-300 text-xs font-bold text-slate-650 bg-white cursor-pointer max-w-[150px] truncate"
                            value={filterSchool}
                            onChange={e => setFilterSchool(e.target.value)}
                          >
                            <option value="ALL">SEMUA SEKOLAH</option>
                            {filterOptions.schools.map((s, idx) => (
                              <option key={idx} value={s}>{s}</option>
                            ))}
                          </select>

                          <select
                            className="p-2 border rounded-lg border-slate-300 text-xs font-bold text-slate-600 bg-white cursor-pointer"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                          >
                            <option value="ALL">SEMUA KOD STATUS</option>
                            <option value="ACTIVE">AKTIF SAHAJA</option>
                            <option value="PENDING">PENDING SAHAJA</option>
                            <option value="BLOCKED">DITAHAN (BLOCKED)</option>
                          </select>

                          <select
                            className="p-2 border rounded-lg border-slate-300 text-xs font-bold text-slate-600 bg-white cursor-pointer"
                            value={completionFilter}
                            onChange={e => setCompletionFilter(e.target.value)}
                          >
                            <option value="ALL">SEMUA STATUS KUIZ</option>
                            <option value="COMPLETED">SELESAI</option>
                            <option value="NOT_COMPLETED">BELUM SELESAI</option>
                          </select>

                          <div className="relative flex-1 sm:w-64 min-w-[180px]">
                            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Cari murid, IC, kod..." 
                              className="w-full pl-9 pr-3 py-2 border rounded-lg border-slate-300 focus:border-blue-500 text-xs font-medium"
                              value={searchTerm}
                              onChange={e => setSearchTerm(e.target.value)}
                            />
                          </div>

                          <button 
                            onClick={handleExportCalonCSV}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center transition cursor-pointer text-xs font-bold uppercase tracking-wider shadow-xs shrink-0"
                          >
                            <Download className="w-4 h-4 mr-1.5" /> Eksport Calon
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-auto border border-slate-100 rounded-xl min-h-[300px] bg-white">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 sticky top-0 shadow-xs z-10 border-b">
                            <tr>
                              <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b">Nama Murid</th>
                              <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b">No. KP (Masked)</th>
                              <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b">Kod Akses</th>
                              <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b">Institut Sekolah</th>
                              <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b">Negeri / PPD</th>
                              <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b text-center">Status Kod</th>
                              <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b text-center">Kertas Kuiz</th>
                              <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b text-right">Markah %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultsLoading ? (
                              <tr>
                                <td colSpan={8} className="p-12 text-center text-slate-500">
                                  <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
                                    <span className="font-semibold text-xs text-slate-550">Memuatkan data senarai...</span>
                                  </div>
                                </td>
                              </tr>
                            ) : paginatedCalon.length > 0 ? (
                              paginatedCalon.map((r, i) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 font-medium whitespace-nowrap">
                                  <td className="p-3 text-slate-800 uppercase text-xs font-bold">{r.student_name}</td>
                                  <td className="p-3 text-slate-500 font-mono">{maskICNumber(r.ic_number)}</td>
                                  <td className="p-3">
                                    <span className="font-mono font-bold text-blue-900 bg-blue-50 rounded inline-block px-2 py-0.5">{r.access_code}</span>
                                  </td>
                                  <td className="p-3 text-slate-600 uppercase max-w-[200px] truncate">{r.school_name}</td>
                                  <td className="p-3 text-slate-400 uppercase leading-none">
                                    <span className="block text-[10px] font-bold text-slate-700">{r.state}</span>
                                    <span className="block text-[9px] text-slate-405 mt-0.5">{r.ppd || 'TIDAK DINYATAKAN'}</span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {r.access_status === 'active' ? (
                                      <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200 uppercase tracking-widest">Aktif</span>
                                    ) : r.access_status === 'blocked' ? (
                                      <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 uppercase tracking-widest">Blocked</span>
                                    ) : (
                                      <span className="bg-slate-50 text-slate-505 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest">Pending</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {r.is_completed ? (
                                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100 uppercase text-[10px]">Selesai</span>
                                    ) : r.started_at ? (
                                      <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-100 uppercase text-[10px]">Menjawab</span>
                                    ) : (
                                      <span className="bg-slate-100 text-slate-505 font-bold px-2 py-0.5 rounded uppercase text-[10px]">Belum</span>
                                    )}
                                  </td>
                                  <td className="p-3 font-black text-right text-sm text-slate-800 font-mono">
                                    {r.score !== null ? `${r.score} %` : '-'}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-400 italic">Tiada data calon ditemui.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 mt-4 text-xs font-semibold text-slate-600 bg-white">
                        <div className="flex items-center gap-2">
                          <span>Paparkan:</span>
                          <span className="text-slate-700 font-bold">50 rekod</span>
                          <span className="text-slate-400 font-medium">Dari {totalCalonCount} padanan ({allCandidates.length} keseluruhan)</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={calonPage <= 1}
                            onClick={() => setCalonPage(prev => Math.max(prev - 1, 1))}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50/50 disabled:text-slate-350 rounded-lg transition font-bold cursor-pointer disabled:cursor-not-allowed border border-slate-200"
                          >
                            Sebelumnya
                          </button>
                          
                          <span className="text-slate-700 font-bold">
                            Halaman {calonPage} daripada {Math.max(1, Math.ceil(totalCalonCount / calonPageSize))}
                          </span>

                          <button
                            type="button"
                            disabled={calonPage >= Math.ceil(totalCalonCount / calonPageSize)}
                            onClick={() => setCalonPage(prev => Math.min(prev + 1, Math.ceil(totalCalonCount / calonPageSize)))}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50/50 disabled:text-slate-350 rounded-lg transition font-bold cursor-pointer disabled:cursor-not-allowed border border-slate-200"
                          >
                            Seterusnya
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            // ==================== TAB: REGISTRATIONS ====================
            <>
              <FeederImportPanel
                onImported={async () => {
                  await fetchRegistrations(regPage, regPageSize, debouncedRegSearch, regStatus);
                  await fetchData();
                }}
              />

              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Urusan Pendaftaran Sekolah & Calon</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">Periksa Slip Bayaran, Luluskan atau Tolak Pendaftaran</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                  {/* Reg status filter */}
                  <select
                    className="p-2 border rounded-lg border-slate-300 text-xs font-bold text-slate-600 bg-white cursor-pointer"
                    value={regStatus}
                    onChange={e => setRegStatus(e.target.value)}
                  >
                    <option value="ALL">SEMUA STATUS DAFTAR</option>
                    <option value="PENDING">PENDING SAHAJA</option>
                    <option value="APPROVED">TELAH DILULUSKAN</option>
                    <option value="REJECTED">TELAH DITOLAK</option>
                  </select>

                  <div className="relative flex-1 sm:w-64 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Cari rujukan, sekolah atau guru..." 
                      className="w-full pl-9 pr-3 py-2.5 border rounded-lg border-slate-300 focus:border-blue-500 text-xs"
                      value={regSearch}
                      onChange={e => setRegSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto border border-slate-100 rounded-xl min-h-[300px]">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 sticky top-0 shadow-xs z-10 border-b">
                    <tr>
                      <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b">No. Rujukan</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b">Sekolah & Kod</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b">Guru (No. Telefon)</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b text-center">Calon</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b">Yuran</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b">Status</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-slate-400 border-b text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regLoading ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
                            <span className="font-semibold text-xs">Memuatkan data pendaftaran...</span>
                          </div>
                        </td>
                      </tr>
                    ) : regError ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-red-600 font-bold text-xs bg-red-50/50">
                          {regError}
                        </td>
                      </tr>
                    ) : registrations.length > 0 ? (
                      registrations.map((r, i) => {
                        const isPending = r.status === 'pending' || r.status === 'PENDING' || r.registration_status === 'pending' || r.registration_status === 'PENDING';
                        return (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 font-medium whitespace-nowrap">
                            <td className="p-3 font-mono font-bold text-slate-800">{r.registration_ref}</td>
                            <td className="p-3">
                              <span className="text-slate-800 font-bold block uppercase truncate max-w-[200px]">{r.school_name}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">{r.school_code} • {r.state}</span>
                            </td>
                            <td className="p-3">
                              <span className="text-slate-800 font-semibold block uppercase">{r.teacher_name}</span>
                              <span className="text-[10px] text-slate-450 font-mono">{r.teacher_phone}</span>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-700">{r.total_students ?? 0} orang</td>
                            <td className="p-3 font-bold text-emerald-700">RM {Number(r.total_fee ?? r.total_amount ?? 0).toFixed(2)}</td>
                            <td className="p-3">
                              {r.status === 'approved' || r.registration_status === 'approved' ? (
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 font-extrabold uppercase tracking-wide">Lulus</span>
                              ) : r.status === 'rejected' || r.registration_status === 'rejected' ? (
                                <span className="bg-red-50 text-red-700 text-[10px] px-2 py-0.5 rounded-full border border-red-200 font-extrabold uppercase tracking-wide">Ditolak</span>
                              ) : (
                                <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-200 font-extrabold uppercase tracking-wide">Pending</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenDetail(r.id)}
                                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Lihat Perincian
                                </button>
                                
                                {isPending && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedRegId(r.id);
                                        setAllowEarlyAccess(false);
                                        setShowApproveConfirmModal(true);
                                      }}
                                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Luluskan
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedRegId(r.id);
                                        setRejectReason('');
                                        setShowRejectFormModal(true);
                                      }}
                                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <XOctagon className="w-3.5 h-3.5" /> Tolak
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400 italic">Tiada rekod pendaftaran ditemui.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Reg Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 mt-4 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Paparkan:</span>
                  <select
                    className="p-1.5 border rounded-md border-slate-200 text-slate-750 bg-white cursor-pointer font-bold focus:ring-1 focus:ring-blue-500"
                    value={regPageSize}
                    onChange={e => setRegPageSize(Number(e.target.value))}
                  >
                    <option value={50}>50 rekod</option>
                    <option value={100}>100 rekod</option>
                    <option value={200}>200 rekod</option>
                  </select>
                  <span className="text-slate-400 font-medium">Dari {regTotal} pendaftaran keseluruhan</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={regPage <= 1 || regLoading}
                    onClick={() => setRegPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50/50 disabled:text-slate-350 rounded-lg transition font-bold cursor-pointer disabled:cursor-not-allowed border border-slate-200"
                  >
                    Sebelumnya
                  </button>
                  
                  <span className="text-slate-700 font-bold">
                    Halaman {regPage} daripada {Math.max(1, Math.ceil(regTotal / regPageSize))}
                  </span>

                  <button
                    type="button"
                    disabled={regPage >= Math.ceil(regTotal / regPageSize) || regLoading}
                    onClick={() => setRegPage(prev => Math.min(prev + 1, Math.ceil(regTotal / regPageSize)))}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50/50 disabled:text-slate-350 rounded-lg transition font-bold cursor-pointer disabled:cursor-not-allowed border border-slate-200"
                  >
                    Seterusnya
                  </button>
                </div>
              </div>
            </>
          )}

        </div>

      </main>

      {/* Confirmation Modal for Release Sijil */}
      {showReleaseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">Release Sijil?</h3>
            <div className="my-6">
              <p className="text-sm text-slate-600 leading-relaxed text-justify">
                Tindakan ini akan membenarkan semua peserta yang telah selesai kuiz memuat turun Sijil Penyertaan. Sistem juga akan menjana dan membekukan Top 5 keseluruhan untuk Sijil Pencapaian. Teruskan?
              </p>
              
              {releaseError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-650">
                  {releaseError}
                </div>
              )}
            </div>
            
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReleaseModal(false);
                  setReleaseError('');
                }}
                disabled={releasing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold rounded-lg text-sm transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReleaseCertificates}
                disabled={releasing}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-sm transition tracking-wide cursor-pointer flex items-center gap-2"
              >
                {releasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Melepas...
                  </>
                ) : (
                  'Ya, Release Sijil'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Pendaftaran Modal (Lihat Butiran) */}
      {isDetailModalOpen && selectedRegId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full my-8 p-6 sm:p-8 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {(() => {
              const registration = regDetail?.registration;
              const studentsList = regDetail?.students || [];
              return (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-6 gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <School className="w-5 h-5 text-blue-950" /> Perincian Pendaftaran
                      </h3>
                      {registration && (
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-mono font-bold">
                          <span className="text-slate-500">RUJUKAN:</span>
                          <span className="text-blue-900 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100">{registration.registration_ref}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-500">STATUS:</span>
                          {registration.registration_status === 'approved' ? (
                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase text-[10px]">Lulus</span>
                          ) : registration.registration_status === 'rejected' ? (
                            <span className="bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200 uppercase text-[10px]">Ditolak</span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200 uppercase text-[10px]">Pending</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                      {registration?.registration_status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRejectReason('');
                              setShowRejectFormModal(true);
                            }}
                            className="px-3.5 py-1.5 bg-red-650 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs uppercase"
                          >
                            <XOctagon className="w-3.5 h-3.5" /> Tolak Pendaftaran
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAllowEarlyAccess(false);
                              setShowApproveConfirmModal(true);
                            }}
                            className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs uppercase"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Luluskan & Jana Kod
                          </button>
                        </div>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRegId(null);
                          setRegDetail(null);
                          setIsDetailModalOpen(false);
                          setActionError('');
                        }}
                        className="text-slate-400 hover:text-slate-600 font-bold p-2 text-xl cursor-pointer ml-2 self-center"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {regDetailLoading ? (
                    <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
                      <span className="text-sm font-semibold text-slate-500">Memuatkan butiran pendaftaran...</span>
                    </div>
                  ) : regDetailError ? (
                    <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-sm font-bold text-red-650">
                      {regDetailError}
                    </div>
                  ) : registration ? (
                    <div className="flex-1 overflow-y-auto pr-1 space-y-6 text-left">
                      {/* 2-Column Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-150">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2 font-mono">Maklumat Sekolah</h4>
                          <ul className="text-sm space-y-1.5 text-slate-700 font-medium">
                            <li>Nama Sekolah: <strong className="text-slate-900 uppercase font-bold">{registration.school_name}</strong></li>
                            <li>Kod Sekolah: <strong className="text-slate-900 font-mono font-bold uppercase">{registration.school_code}</strong></li>
                            <li>PPD / Daerah: <strong className="text-slate-900 uppercase">{registration.ppd || '-'}</strong></li>
                            <li>Negeri: <strong className="text-slate-900 uppercase">{registration.state}</strong></li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2 font-mono">Maklumat Guru Pengiring</h4>
                          <ul className="text-sm space-y-1.5 text-slate-700 font-medium font-semibold">
                            <li>Nama Guru: <strong className="text-slate-900 uppercase">{registration.teacher_name}</strong></li>
                            <li>No. Telefon: <strong className="text-slate-900 font-mono">{registration.teacher_phone}</strong></li>
                            <li>Email: <strong className="text-blue-900 break-all">{registration.teacher_email || '-'}</strong></li>
                          </ul>
                        </div>
                      </div>

                      {/* Yuran & File Attachment */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-emerald-50/50 border border-emerald-150 rounded-2xl gap-4">
                        <div>
                          <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider block font-mono">Yuran/Jumlah Keseluruhan</span>
                          <strong className="text-2xl font-black text-emerald-800">
                            RM {Number(registration.total_fee || 0).toFixed(2)}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Bagi {registration.total_students ?? studentsList.length} orang peserta berdaftar</span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                          {registration.receipt_path ? (
                            <div className="flex flex-col gap-1.5 w-full sm:w-auto text-left">
                              <span className="text-xs font-semibold text-slate-600 truncate max-w-[280px] font-mono block">
                                File: <span className="font-bold underline text-blue-900">{registration.receipt_file_name || 'Slip Muat Naik'}</span>
                              </span>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewReceipt(registration.receipt_path)}
                                  className="px-3.5 py-1.5 bg-blue-950 hover:bg-slate-905 text-white font-bold text-xs rounded-xl transition cursor-pointer inline-flex items-center gap-1 shadow-xs uppercase font-mono"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Lihat Slip Bayaran
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadReceipt(registration.receipt_path, registration.receipt_file_name)}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer inline-flex items-center gap-1 shadow-xs uppercase font-mono"
                                >
                                  <Download className="w-3.5 h-3.5" /> Muat Turun Slip Bayaran
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-red-600 font-extrabold bg-red-50 p-2.5 rounded-xl border border-red-150 shadow-2xs font-mono">
                              Tiada fail slip diupload.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Students Table */}
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 font-mono">Senarai Peserta Mendaftar</h4>
                        <div className="border border-slate-150 rounded-2xl overflow-hidden">
                          <table className="w-full text-left text-xs text-slate-650">
                            <thead className="bg-slate-50 border-b">
                              <tr>
                                <th className="p-3 font-bold uppercase tracking-wider text-slate-400 w-12 text-center">Bil</th>
                                <th className="p-3 font-bold uppercase tracking-wider text-slate-400">Nama Penuh Peserta</th>
                                <th className="p-3 font-bold uppercase tracking-wider text-slate-400">MyKid/MyKad</th>
                                <th className="p-3 font-bold uppercase tracking-wider text-slate-400 text-center">Kod Akses</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentsList.length > 0 ? (
                                studentsList.map((st: any, sIdx: number) => {
                                  // Masking rule: Guna st.ic_masked. Jika tiada st.ic_masked, fallback kepada ******** + 4 digit akhir ic_number
                                  const maskedIc = st.ic_masked || (st.ic_number ? ('********' + st.ic_number.slice(-4)) : '********');
                                  return (
                                    <tr key={sIdx} className="border-b border-slate-100 last:border-0 font-medium hover:bg-slate-50/50">
                                      <td className="p-3 text-center text-slate-400 text-xs font-bold font-mono">{sIdx + 1}</td>
                                      <td className="p-3 text-slate-900 font-bold uppercase text-xs">{st.name}</td>
                                      <td className="p-3 font-mono text-slate-700 font-bold tracking-wider">{maskedIc}</td>
                                      <td className="p-3 text-center">
                                        {st.access_code ? (
                                          <span className="font-mono bg-blue-50/50 text-blue-900 rounded font-black px-2 py-0.5 tracking-wider uppercase border border-blue-100">
                                            {st.access_code}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 font-semibold text-[10px] italic">Belum Dijana (Pending)</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={4} className="p-6 text-center text-slate-400 italic font-semibold">Tiada murid berdaftar dalam permohonan ini.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Status Status & Admin Action Panel */}
                      <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-mono">Status Permohonan</span>
                          <div className="flex items-center gap-2 mt-1">
                            {registration.registration_status === 'approved' ? (
                              <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-black rounded-lg text-xs uppercase border border-emerald-250 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Telah Diluluskan
                              </div>
                            ) : registration.registration_status === 'rejected' ? (
                              <div className="px-3 py-1.5 bg-red-50 text-red-800 font-black rounded-lg text-xs uppercase border border-red-250">
                                ✕ Ditolak
                              </div>
                            ) : (
                              <div className="px-3 py-1.5 bg-amber-50 text-amber-850 font-black rounded-lg text-xs uppercase border border-amber-250 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 animate-pulse" /> Menunggu Kelulusan
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions Button Panel */}
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                          {registration.registration_status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectReason('');
                                  setShowRejectFormModal(true);
                                }}
                                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-bold text-xs rounded-xl tracking-wide transition cursor-pointer uppercase font-extrabold flex items-center gap-1.5 shadow-xs"
                              >
                                <XOctagon className="w-4 h-4" /> Tolak Pendaftaran
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAllowEarlyAccess(false);
                                  setShowApproveConfirmModal(true);
                                }}
                                className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl tracking-wide transition cursor-pointer uppercase font-extrabold flex items-center gap-1.5 shadow-xs"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Luluskan & Jana Kod
                              </button>
                            </>
                          )}

                          {registration.registration_status === 'approved' && (
                            <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 uppercase tracking-wide">
                              Pendaftaran diluluskan dan kod akses telah dijana.
                            </div>
                          )}

                          {registration.registration_status === 'rejected' && (
                            <div className="p-3 bg-red-50 text-red-850 border border-red-150 rounded-xl text-xs max-w-md text-justify font-bold leading-relaxed">
                              Sebab Penolakan Guru: <span className="font-semibold text-slate-600 italic block mt-1">"{registration.rejection_reason || registration.reject_reason || 'Ralat maklumat atau dokumen tidak sah'}"</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedRegId(null);
                  setRegDetail(null);
                  setIsDetailModalOpen(false);
                  setActionError('');
                }}
                className="px-5 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer uppercase tracking-wider"
              >
                Tutup Slaid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Approve Registration */}
      {showApproveConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <h3 className="text-xl font-bold text-slate-905 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Sah Lulus Pendaftaran?
            </h3>
            <div className="my-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Tindakan ini akan menjana kod akses kuiz bercorak rawak yang sah bagi seluruh murid dalam borang pendaftaran sekolah ini.
              </p>

              {/* Optional checkbox allow early access */}
              <label className="flex items-start gap-3 p-3 bg-blue-50/50 border border-blue-150 rounded-xl cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowEarlyAccess}
                  onChange={(e) => setAllowEarlyAccess(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-900 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-blue-900 uppercase block tracking-wide">Benarkan Akses Awal</span>
                  <span className="text-slate-500 text-[10px] leading-relaxed block mt-0.5">
                    Membolehkan pelajar memulakan ujian kuiz berjadual melangkaui sekatan waktu semasa sekiranya tarikh rasmi belum bermula.
                  </span>
                </div>
              </label>

              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-650">
                  {actionError}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowApproveConfirmModal(false);
                  setActionError('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold rounded-lg text-sm transition cursor-pointer uppercase text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApproveRegistration}
                disabled={actionLoading}
                className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg text-sm transition tracking-wider cursor-pointer uppercase text-xs flex items-center gap-1.5 shadow-md"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sedang Menjana...
                  </>
                ) : (
                  'Luluskan Pendaftaran'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Form Modal */}
      {showRejectFormModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <h3 className="text-xl font-bold text-red-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <XOctagon className="w-5 h-5 text-red-600" /> Tolak Pendaftaran Sekolah
            </h3>
            <div className="my-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Sila nyatakan sebab penolakan yang kukuh dan munasabah. Guru penganjur akan melihat ulasan bertulis ini semasa pemeriksaan status rujukan pendaftaran.
              </p>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1.5 tracking-wider">Ulasan / Sebab Penolakan</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Dokumen pembayaran kabur, tiada slip disertakan, nama sekolah tidak wujud dsb"
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-red-500 h-28 resize-none uppercase"
                  maxLength={250}
                />
                <span className="text-[9px] text-slate-400 italic block mt-1 tracking-wide">Maksimum 250 aksara secara auto-uppercase</span>
              </div>

              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-650">
                  {actionError}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowRejectFormModal(false);
                  setActionError('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold rounded-lg text-sm transition cursor-pointer uppercase text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRejectRegistration}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs transition tracking-wider cursor-pointer uppercase text-[10px] flex items-center gap-1.5 shadow-md disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sedang Mengemaskini...
                  </>
                ) : (
                  'Tolak Pendaftaran'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Custom Registration Mode Updates */}
      {modalType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150 text-left">
            <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 font-sans tracking-tight">
              {modalType === 'open' && 'Buka Pendaftaran?'}
              {modalType === 'closed' && 'Tutup Pendaftaran?'}
              {modalType === 'auto' && 'Tetapkan Semula Kepada Auto?'}
            </h3>
            
            <div className="my-6">
              <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                {modalType === 'open' && 'Tindakan ini akan membuka semula borang pendaftaran kepada pengguna. Gunakan fungsi ini hanya jika pihak penganjur ingin membenarkan pendaftaran baharu.'}
                {modalType === 'closed' && 'Tindakan ini akan menutup borang pendaftaran kepada pengguna. Button pendaftaran masih dipaparkan, tetapi pengguna tidak boleh meneruskan pendaftaran.'}
                {modalType === 'auto' && 'Sistem akan mengikut tarikh tutup automatik iaitu 19 Jun 2026 jam 1800.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalType(null)}
                disabled={isUpdatingMode}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-colors duration-200 cursor-pointer uppercase tracking-wider text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleUpdateRegistrationMode(modalType)}
                disabled={isUpdatingMode}
                className={`w-full sm:w-auto px-5 py-2.5 text-white font-extrabold rounded-xl text-xs transition-colors duration-200 cursor-pointer uppercase tracking-wider text-center shadow-xs ${
                  modalType === 'closed' 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-100' 
                    : modalType === 'open'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                }`}
              >
                {isUpdatingMode ? 'Sedang Dikemaskini...' : (
                  modalType === 'open' ? 'Ya, Buka Pendaftaran' : 
                  modalType === 'closed' ? 'Ya, Tutup Pendaftaran' : 'Ya, Tetapkan Auto'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {successToast && (
        <div className="fixed bottom-5 right-5 bg-emerald-600 text-white font-bold px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-bottom duration-250 border border-emerald-500 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
    </div>
  );
}
