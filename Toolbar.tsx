
import React, { useState } from 'react';
import { FontFamily, EditorSettings, LANGUAGES } from '../types';

interface ToolbarProps {
  settings: EditorSettings;
  setSettings: React.Dispatch<React.SetStateAction<EditorSettings>>;
  onClear: () => void;
  onExport: (format: 'txt' | 'pdf' | 'doc') => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ settings, setSettings, onClear, onExport }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleToggleBold = () => setSettings(s => ({ ...s, isBold: !s.isBold }));
  const handleToggleItalic = () => setSettings(s => ({ ...s, isItalic: !s.isItalic }));
  const handleFontFamily = (e: React.ChangeEvent<HTMLSelectElement>) => 
    setSettings(s => ({ ...s, fontFamily: e.target.value as FontFamily }));
  const handleFontSize = (delta: number) => 
    setSettings(s => ({ ...s, fontSize: Math.max(8, Math.min(72, s.fontSize + delta)) }));

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-2 border-r pr-4 border-slate-200">
        <select 
          value={settings.fontFamily}
          onChange={handleFontFamily}
          className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5"
        >
          <option value={FontFamily.SANS}>Inter</option>
          <option value={FontFamily.SERIF}>Serif</option>
          <option value={FontFamily.MONO}>Mono</option>
        </select>
      </div>

      <div className="flex items-center gap-2 border-r pr-4 border-slate-200">
        <button 
          onClick={() => handleFontSize(-1)}
          className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
          title="Decrease font size"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        </button>
        <span className="text-sm font-medium w-6 text-center">{settings.fontSize}</span>
        <button 
          onClick={() => handleFontSize(1)}
          className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
          title="Increase font size"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      <div className="flex items-center gap-1 border-r pr-4 border-slate-200">
        <button 
          onClick={handleToggleBold}
          className={`px-3 py-1 rounded text-sm font-bold transition-all ${settings.isBold ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-200'}`}
        >
          B
        </button>
        <button 
          onClick={handleToggleItalic}
          className={`px-3 py-1 rounded text-sm italic transition-all ${settings.isItalic ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-200'}`}
        >
          I
        </button>
      </div>

      <div className="flex items-center gap-2 flex-grow">
        <select 
          value={settings.targetLang}
          onChange={(e) => setSettings(s => ({ ...s, targetLang: e.target.value }))}
          className="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:ring-blue-500 focus:border-blue-500"
        >
          {LANGUAGES.map(lang => <option key={lang.code} value={lang.name}>{lang.name}</option>)}
        </select>
        <span className="text-slate-400">→</span>
        <select 
          value={settings.sourceLang}
          onChange={(e) => setSettings(s => ({ ...s, sourceLang: e.target.value }))}
          className="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-1.5 focus:ring-blue-500 focus:border-blue-500"
        >
          {LANGUAGES.map(lang => <option key={lang.code} value={lang.name}>{lang.name}</option>)}
        </select>
      </div>

      <div className="relative">
        <button 
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 border border-blue-200 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export
        </button>
        {showExportMenu && (
          <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 overflow-hidden">
            <button 
              onClick={() => { onExport('txt'); setShowExportMenu(false); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              Text (.txt)
            </button>
            <button 
              onClick={() => { onExport('pdf'); setShowExportMenu(false); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              PDF (.pdf)
            </button>
            <button 
              onClick={() => { onExport('doc'); setShowExportMenu(false); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              Word (.doc)
            </button>
          </div>
        )}
      </div>

      <button 
        onClick={onClear}
        className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 p-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        Clear
      </button>
    </div>
  );
};

export default Toolbar;
