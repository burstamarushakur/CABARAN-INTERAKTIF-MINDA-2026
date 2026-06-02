import React from 'react';

export default function Header() {
  return (
    <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-10 flex items-center justify-center shadow-xs" id="app-header">
      <img 
        src="https://i.postimg.cc/bJ9vLS0y/CIM-2026.png" 
        alt="Cabaran Interaktif Minda Tahun 2026" 
        className="h-16 w-auto object-contain mix-blend-multiply"
        referrerPolicy="no-referrer"
      />
    </header>
  );
}

