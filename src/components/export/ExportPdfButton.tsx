import { useState } from 'react';
import { motion } from 'framer-motion';
import { exportToPdf } from '../../lib/exportPdf';

interface Props {
  elementId: string;
  filename?: string;
  label?: string;
}

export function ExportPdfButton({ elementId, filename = 'report.pdf', label = 'PDF' }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToPdf(elementId, filename);
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/90 bg-white/15 hover:bg-white/25 rounded-lg backdrop-blur-sm transition-colors disabled:opacity-50"
    >
      {exporting ? (
        <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      {label}
    </motion.button>
  );
}
