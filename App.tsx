
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NoteLine, EditorSettings, FontFamily } from './types';
import Toolbar from './components/Toolbar';
import { translationService } from './services/geminiService';
import { jsPDF } from 'jspdf';

const STORAGE_KEY = 'lingonotes-history';

const App: React.FC = () => {
  const [settings, setSettings] = useState<EditorSettings>({
    fontFamily: FontFamily.SANS,
    fontSize: 18,
    isBold: false,
    isItalic: false,
    sourceLang: 'English',
    targetLang: 'German'
  });

  const [notes, setNotes] = useState<NoteLine[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [currentInput, setCurrentInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persistence logic
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  // Auto-scroll to bottom when new notes are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes]);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = currentInput.trim();
      if (!text) return;

      const newLineId = crypto.randomUUID();
      
      const newNote: NoteLine = {
        id: newLineId,
        original: text,
        translation: '',
        isTranslating: true
      };
      setNotes(prev => [...prev, newNote]);
      setCurrentInput('');

      try {
        const res = await fetch("/api/translate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text,
    sourceLang: settings.sourceLang,
    targetLang: settings.targetLang,
  }),
});

if (!res.ok) {
  throw new Error(`Proxy error: ${res.status}`);
}

const data = await res.json();
const translated = data.translation || 'No translation returned';

setNotes(prev => prev.map(note =>
  note.id === newLineId
    ? { ...note, translation: translated, isTranslating: false }
    : note
));
      } catch (err) {
        setNotes(prev => prev.map(note => 
          note.id === newLineId 
            ? { ...note, translation: 'Error translating', isTranslating: false } 
            : note
        ));
      }
    }
  }, [currentInput, settings.sourceLang, settings.targetLang]);

  const removeNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleClear = () => {
    if (window.confirm("Clear all your notes? This cannot be undone.")) {
      setNotes([]);
    }
  };

  const exportNotes = (format: 'txt' | 'pdf' | 'doc') => {
    if (notes.length === 0) {
      alert("No notes to export!");
      return;
    }

    const title = `LingoNotes AI - ${settings.targetLang} to ${settings.sourceLang}`;
    const timestamp = new Date().toLocaleString();

    if (format === 'txt') {
      const content = notes.map(n => `${n.original} -> ${n.translation || '...'}`).join('\n');
      const blob = new Blob([`${title}\nExported on: ${timestamp}\n\n${content}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lingonotes_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } 
    else if (format === 'doc') {
      const content = notes.map(n => `<p><b>${n.original}</b> &mdash; <i>${n.translation || '...'}</i></p>`).join('');
      const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${title}</title></head>
        <body style="font-family: sans-serif;">
          <h1>${title}</h1>
          <p>Exported on: ${timestamp}</p>
          <hr/>
          ${content}
        </body>
        </html>
      `;
      const blob = new Blob([html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lingonotes_${Date.now()}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    }
    else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(title, 20, 20);
      doc.setFontSize(10);
      doc.text(`Exported on: ${timestamp}`, 20, 28);
      
      doc.setFontSize(12);
      let y = 40;
      notes.forEach((n, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const line = `${i + 1}. ${n.original} -> ${n.translation || '...'}`;
        doc.text(line, 20, y);
        y += 10;
      });
      doc.save(`lingonotes_${Date.now()}.pdf`);
    }
  };

  const editorStyle = {
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize}px`,
    fontWeight: settings.isBold ? 'bold' : 'normal',
    fontStyle: settings.isItalic ? 'italic' : 'normal',
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800">
      <Toolbar settings={settings} setSettings={setSettings} onClear={handleClear} onExport={exportNotes} />

      <main className="flex-grow flex flex-col overflow-hidden max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex-grow bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col overflow-hidden">
          
          {/* Notes History Area */}
          <div 
            ref={scrollRef}
            className="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-4"
          >
            {notes.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18.477 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-lg font-medium">Your learning history is saved</p>
                <p className="text-sm">Enter phrases in {settings.targetLang} to get started</p>
              </div>
            )}
            
            {notes.map((note) => (
              <div 
                key={note.id} 
                className="group flex flex-col p-4 bg-slate-50 hover:bg-white hover:shadow-md transition-all duration-200 rounded-xl border border-transparent hover:border-slate-100 relative"
                style={editorStyle}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-grow">
                    <span className="text-slate-900">{note.original}</span>
                    <span className="mx-2 text-slate-400 opacity-50">—</span>
                    {note.isTranslating ? (
                      <span className="text-slate-400 animate-pulse italic">Translating...</span>
                    ) : (
                      <span className="text-blue-600 font-medium">{note.translation}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => removeNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-slate-50/50 border-t border-slate-100">
            <div className="relative group">
              <textarea
                ref={inputRef}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Write something in ${settings.targetLang}...`}
                rows={1}
                className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm resize-none"
                style={{
                  ...editorStyle,
                  minHeight: '60px',
                  maxHeight: '200px'
                }}
              />
              <div className="absolute right-4 bottom-4 flex items-center gap-2 pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <span className="text-[10px] font-bold tracking-widest uppercase">Press Enter to Translate</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center text-slate-400 text-xs">
        &copy; 2024 LingoNotes AI • Your notes are stored locally on this device.
      </footer>
    </div>
  );
};

export default App;
