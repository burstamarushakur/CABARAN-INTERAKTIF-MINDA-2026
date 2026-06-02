import jsPDF from 'jspdf';

// Supabase locked certificate templates
const PENYERTAAN_TEMPLATE_URL = 'https://mfctlmzwautifbtsusse.supabase.co/storage/v1/object/public/cim-media/penyertaan.jpg?v=latest20260531';
const PENCAPAIAN_TEMPLATE_URL = 'https://mfctlmzwautifbtsusse.supabase.co/storage/v1/object/public/cim-media/pencapaian.jpg?v=latest20260531';

/**
 * Safely fetches an image and coverts it to JPEG Base64
 */
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
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image from URL: ${url}`));
    img.src = url;
  });
};

/**
 * Sanitizes filename to remove dangerous characters, replacing spaces with underscores
 */
const sanitizeFilename = (name: string): string => {
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
};

/**
 * Fits the given text to maximum width by adjusting font size dynamically
 */
export const fitTextToWidth = (
  doc: jsPDF,
  text: string,
  maxWidth: number,
  initialFontSize: number,
  minFontSize: number = 12
): number => {
  let fontSize = initialFontSize;
  doc.setFontSize(fontSize);
  while (doc.getTextWidth(text) > maxWidth && fontSize > minFontSize) {
    fontSize -= 1;
    doc.setFontSize(fontSize);
  }
  return fontSize;
};

/**
 * Just trims and upper-cases the input IC / MyKid / MyKad string, preserving dashes if present but not adding them automatically.
 */
export const formatIcNumber = (ic?: string): string => {
  if (!ic) return '';
  return ic.trim().toUpperCase();
};

/**
 * Converts a numeric rank to the official Malay achievement text string.
 */
const getAchievementText = (rank?: number | null | string): string => {
  if (rank === undefined || rank === null) return 'KEDUDUKAN CEMERLANG';
  const val = Number(rank);
  switch (val) {
    case 1: return 'JOHAN KESELURUHAN';
    case 2: return 'NAIB JOHAN KESELURUHAN';
    case 3: return 'TEMPAT KETIGA KESELURUHAN';
    case 4: return 'TEMPAT KEEMPAT KESELURUHAN';
    case 5: return 'TEMPAT KELIMA KESELURUHAN';
    default: return 'KEDUDUKAN CEMERLANG';
  }
};

/**
 * Internal helper to build the jsPDF document containing the certificate layout
 */
const buildCertificateDoc = async (
  studentName: string,
  certificateType: 'participation' | 'achievement' = 'participation',
  achievementRank?: number | null,
  icNumber?: string
): Promise<jsPDF> => {
  // Use exact landscape 16:9 dimensions recommended: 297mm x 171mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [297, 171]
  });

  const width = 297;
  const height = 171;

  const templateUrl = certificateType === 'achievement' ? PENCAPAIAN_TEMPLATE_URL : PENYERTAAN_TEMPLATE_URL;

  // Load template image safely as Base64.
  // Throws a friendly developer/user error instead of silently falling back.
  let bgBase64: string;
  try {
    bgBase64 = await fetchImageAsBase64(templateUrl);
  } catch (err) {
    console.warn(`Failed to load certificate template from ${templateUrl}:`, err);
    throw new Error('Template sijil gagal dimuatkan. Sila semak fail template sijil.');
  }

  // Draw template background (Exact fit)
  doc.addImage(bgBase64, 'JPEG', 0, 0, width, height);

  // Use a classy serif font that blends beautifully with the design
  doc.setFont('times', 'bold');

  // Format the IC
  const formattedRealIc = formatIcNumber(icNumber);

  if (certificateType === 'achievement') {
    // -----------------------------------------------------------------
    // SIJIL PENCAPAIAN DESIGN OVERLYA
    // -----------------------------------------------------------------
    
    // 1. Student full name
    // Place Name: Center-aligned, x = width/2, y = 70 mm
    doc.setTextColor(28, 63, 36); // Matching forest green theme color
    const uppercaseName = String(studentName || '').toUpperCase();
    fitTextToWidth(doc, uppercaseName, 180, 24, 12);
    doc.text(uppercaseName, width / 2, 70, { align: 'center' });

    // 2. Student MyKid/MyKad
    // Place MyKid: Center-aligned, x = width/2, y = 80 mm
    doc.setFont('times', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0); // Solid black matching other texts
    doc.text(formattedRealIc, width / 2, 80, { align: 'center' });

    // 3. Achievement ranking
    // Place Achievement Label: Center-aligned, x = width/2, y = 116 mm
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(190, 110, 0); // Elegant Golden Amber
    const achievementText = getAchievementText(achievementRank);
    doc.text(achievementText, width / 2, 116, { align: 'center' });

  } else {
    // -----------------------------------------------------------------
    // SIJIL PENYERTAAN DESIGN OVERLYA
    // -----------------------------------------------------------------

    // 1. Student full name
    // Place Name: Center-aligned, x = width/2, y = 74 mm
    doc.setTextColor(28, 63, 36); // Forest Green
    const uppercaseName = String(studentName || '').toUpperCase();
    fitTextToWidth(doc, uppercaseName, 180, 24, 12);
    doc.text(uppercaseName, width / 2, 74, { align: 'center' });

    // 2. Student MyKid/MyKad
    // Place MyKid: Center-aligned, x = width/2, y = 85 mm
    doc.setFont('times', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0); // Solid Black
    doc.text(formattedRealIc, width / 2, 85, { align: 'center' });
  }

  return doc;
};

/**
 * Master certificate generator function
 */
export const generateCertificate = async (
  studentName: string,
  schoolName: string, // Kept signature for backwards-compatibility
  scorePercent: number, // Kept signature for backwards-compatibility
  certificateType: 'participation' | 'achievement' = 'participation',
  achievementRank?: number | null,
  icNumber?: string
) => {
  const doc = await buildCertificateDoc(studentName, certificateType, achievementRank, icNumber);
  
  // Save/Download the file with beautifully sanitized filename
  const fileSafeName = sanitizeFilename(studentName);
  const filePrefix = certificateType === 'achievement' ? 'Sijil_Pencapaian' : 'Sijil_Penyertaan';
  doc.save(`${filePrefix}_${fileSafeName}.pdf`);
};

/**
 * In-memory certificate generator returning Blob for zip packaging
 */
export const generateCertificateBlob = async (
  studentName: string,
  certificateType: 'participation' | 'achievement' = 'participation',
  achievementRank?: number | null,
  icNumber?: string
): Promise<Blob> => {
  const doc = await buildCertificateDoc(studentName, certificateType, achievementRank, icNumber);
  return doc.output('blob');
};

// Types corresponding to wrapper functions
interface StudentData {
  student_name: string;
  real_ic_number?: string;
  ic_number?: string;
  ic_masked?: string;
  masked_ic?: string;
}

/**
 * Wrapper for participation certificate downloads
 */
export const generateParticipationCertificatePdf = async (studentData: StudentData) => {
  const ic = studentData.real_ic_number || studentData.ic_number || studentData.ic_masked || studentData.masked_ic || '';
  await generateCertificate(studentData.student_name, '', 100, 'participation', null, ic);
};

/**
 * Wrapper for achievement certificate downloads
 */
export const generateAchievementCertificatePdf = async (studentData: StudentData, achievementRank: number | null | string) => {
  const ic = studentData.real_ic_number || studentData.ic_number || studentData.ic_masked || studentData.masked_ic || '';
  const rank = achievementRank !== null ? Number(achievementRank) : null;
  await generateCertificate(studentData.student_name, '', 100, 'achievement', rank, ic);
};
