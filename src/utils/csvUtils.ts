import Papa from 'papaparse';

export const exportToCSV = (data: any[], filename: string) => {
  const sanitizeCellValue = (val: any): any => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
        return `'${val}`;
      }
    }
    return val;
  };

  const sanitizedData = data.map(row => {
    if (Array.isArray(row)) {
      return row.map(sanitizeCellValue);
    } else if (row && typeof row === 'object') {
      const newRow: any = {};
      for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
          newRow[key] = sanitizeCellValue(row[key]);
        }
      }
      return newRow;
    }
    return row;
  });

  const csv = Papa.unparse(sanitizedData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
