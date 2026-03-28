
import React, { useState, useRef } from 'react';
import { AppStep, Movie } from './types';
import { MovieTable } from './components/MovieTable';
import { StepIndicator } from './components/StepIndicator';

const Modal: React.FC<{ 
  type: 'privacy' | 'terms' | 'legal' | 'resetConfirm'; 
  onClose: () => void; 
  onConfirm?: () => void; 
}> = ({ type, onClose, onConfirm }) => {
  const content = {
    privacy: { title: "Privacidade", text: "Seus dados permanecem no seu navegador. O processamento é 100% local e seguro." },
    terms: { title: "Termos", text: "Ferramenta para backup pessoal de dados públicos. O Cine Converter não armazena suas informações em servidores próprios." },
    legal: { title: "Aviso", text: "Este projeto é independente e não possui vínculo oficial com plataformas externas de catálogo cinematográfico." },
    resetConfirm: { title: "Reiniciar Processo?", text: "Isso limpará os dados carregados nesta sessão. Você precisará carregar os arquivos JSON novamente.", confirmLabel: "Sim, Reiniciar" }
  }[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 animate-cc-fade">
      <div className="cc-card max-w-lg w-full p-10 space-y-8 border-white/10 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-[#454d55] hover:text-white transition-colors text-xl font-black">⨯</button>
        <div className="space-y-4">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-[#3d7a74]">{content.title}</h2>
          <p className="text-[11px] text-[#8a949e] italic leading-relaxed">{content.text}</p>
        </div>
        <div className="pt-4">
          {type === 'resetConfirm' ? (
            <div className="flex gap-4">
              <button onClick={onConfirm} className="cc-btn-primary flex-1 py-4 rounded-xl text-[10px] bg-red-900/40 hover:bg-red-900/60 border-red-900/20 uppercase font-black">Reiniciar</button>
              <button onClick={onClose} className="flex-1 py-4 border border-white/5 rounded-xl text-[10px] font-black uppercase text-[#454d55] hover:bg-white/5 transition-colors">Cancelar</button>
            </div>
          ) : (
            <button onClick={onClose} className="cc-btn-primary w-full py-4 rounded-xl text-[10px]">Fechar</button>
          )}
        </div>
      </div>
    </div>
  );
};

const AllowPastingBadge: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText('allow pasting');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy}
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-mono transition-all uppercase font-bold tracking-tight mx-1 ${copied ? 'bg-[#3d7a74] border-[#3d7a74] text-white scale-105' : 'bg-white/5 border-white/10 text-[#3d7a74] hover:bg-white/10'}`}
    >
      {copied ? 'Copiado!' : 'allow pasting'}
    </button>
  );
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [extractedMovies, setExtractedMovies] = useState<Movie[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileContents, setFileContents] = useState<{name: string, content: string}[]>([]);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [showModal, setShowModal] = useState<'privacy' | 'terms' | 'legal' | 'resetConfirm' | null>(null);
  const [consent, setConsent] = useState({ account: false, script: false, terms: false });
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
    setError(null);
    if (step === AppStep.INITIAL) setStep(AppStep.CONSENT);
    else if (step === AppStep.CONSENT) {
      if (!consent.account || !consent.script || !consent.terms) {
        setError("Ative todos os protocolos para prosseguir.");
        return;
      }
      setStep(AppStep.EXTRACTION);
    }
    else if (step === AppStep.EXTRACTION) setStep(AppStep.UPLOAD);
  };

  const goBack = () => {
    setError(null);
    const order = [AppStep.INITIAL, AppStep.CONSENT, AppStep.EXTRACTION, AppStep.UPLOAD, AppStep.REVIEW];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const resetSessao = () => {
    setStep(AppStep.INITIAL);
    setExtractedMovies([]);
    setFileContents([]);
    setConsent({ account: false, script: false, terms: false });
    setHasDownloaded(false);
    setError(null);
    setShowModal(null);
  };

  const processFiles = async () => {
    if (fileContents.length === 0) {
      setError("Nenhum arquivo JSON carregado.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      let allMovies: Movie[] = [];
      for (const file of fileContents) {
        const movies = await parseFilmowData(file.content);
        allMovies = [...allMovies, ...movies];
      }
      const uniqueMovies = Array.from(new Map(allMovies.map(m => [m.title.toLowerCase().trim(), m])).values());
      if (uniqueMovies.length > 0) {
        setExtractedMovies(uniqueMovies);
        setStep(AppStep.REVIEW);
      } else {
        setError("Não foi possível encontrar filmes válidos nos arquivos.");
      }
    } catch (err) {
      setError("Falha ao processar os arquivos JSON.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (index: number) => {
    setFileContents(prev => prev.filter((_, i) => i !== index));
  };

  const downloadCSV = () => {
    if (extractedMovies.length === 0) return;
    const headers = "Title,Year,Rating10,WatchedDate\n";
    const rows = extractedMovies.map(m => {
        const cleanTitle = m.title.replace(/\s*\(\d{4}\)$/, "").trim();
        const title = `"${cleanTitle.replace(/"/g, '""')}"`;
        return `${title},${m.year || ""},${m.rating || ""},${m.watchedDate || ""}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cinema_export.csv`;
    link.click();
    setHasDownloaded(true);
  };

  const standardScript = `(async () => {
  const options = {"movies":true,"favorites":true,"ratings":true,"comments":true};
  console.log("%c🎬 [Cine Converter] Iniciando Extração Profunda...", "color: #3d7a74; font-weight: bold; font-size: 18px;");
  
  let allResults = [];
  let page = 1;

  const showNotification = (msg, isError = false) => {
    const div = document.createElement('div');
    div.style = \`position: fixed; top: 20px; right: 20px; z-index: 999999; background: \${isError ? '#721c24' : '#1a1d21'}; color: white; padding: 20px 30px; border-radius: 12px; border: 1px solid \${isError ? '#f5c6cb' : '#3d7a74'}; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: sans-serif; min-width: 300px; animation: slideIn 0.5s ease forwards;\`;
    div.innerHTML = \`<div style="font-weight: 900; text-transform: uppercase; font-size: 10px; margin-bottom: 8px; color: #3d7a74;">Cine Converter</div><div style="font-size: 13px; font-style: italic;">\${msg}</div>\`;
    const style = document.createElement('style');
    style.innerHTML = \`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }\`;
    document.head.appendChild(style);
    document.body.appendChild(div);
    if(!isError) setTimeout(() => div.remove(), 8000);
    return div;
  };

  async function fetchPage(p) {
    const url = new URL(window.location.href);
    url.searchParams.set('pagina', p);
    
    try {
      const response = await fetch(url);
      if (!response.ok) return { items: [], hasNext: false };
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const movieElements = doc.querySelectorAll('.movie_list_item, li.movie_list_item, .poster-container, .film-item');
      const pageMovies = [];
      
      movieElements.forEach(el => {
        const title = el.querySelector('a[title]')?.getAttribute('title') || 
                      el.querySelector('img')?.getAttribute('alt') || 
                      el.querySelector('.title, h3, h2')?.innerText?.trim();
                      
        let rating = "";
        if (options.ratings) {
            const ratingEl = el.querySelector('.tip-rating, .stars-rating, .rating, [title*="estrela"]');
            const rText = ratingEl?.getAttribute('title') || ratingEl?.innerText || "";
            const match = rText.match(/([0-9.,]+)/);
            if (match) {
                const val = parseFloat(match[1].replace(',', '.'));
                rating = (val <= 5 && !rText.includes('/10')) ? (val * 2).toFixed(1) : val.toFixed(1);
            }
        }

        let isFavorite = false;
        if (options.favorites) {
            isFavorite = !!el.querySelector('.icon-heart, .is-favorite, .favorite-active');
        }

        let comment = "";
        if (options.comments) {
            comment = el.querySelector('.comment-text, .user-comment, .quick-review, blockquote')?.innerText?.trim() || "";
        }
        
        if (title) {
          pageMovies.push({ title, rating, isFavorite, comment });
        }
      });
      
      const nextBtn = doc.querySelector('a[rel="next"], .next, .pagination-next, a[href*="pagina="]:last-child');
      return { items: pageMovies, hasNext: !!nextBtn && pageMovies.length > 0 };
    } catch (e) {
      return { items: [], hasNext: false };
    }
  }

  showNotification("🎬 Iniciando extração de dados... Mantenha a aba aberta.");

  while (page <= 500) {
    const result = await fetchPage(page);
    if (result.items.length > 0) {
      allResults = allResults.concat(result.items);
      console.log(\`✅ Pág \${page} | Coletados: \${allResults.length}\`);
    } else break;
    if (!result.hasNext) break;
    page++;
    await new Promise(r => setTimeout(r, 600)); 
  }

  if (allResults.length > 0) {
    const blob = new Blob([JSON.stringify(allResults)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "cinema_data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotification(\`✨ Sucesso! \${allResults.length} filmes capturados. O arquivo 'cinema_data.json' foi baixado automaticamente.\`);
  } else {
    showNotification("⚠️ Nenhum dado foi encontrado. Certifique-se de estar logado e na sua lista de filmes.", true);
  }
})();`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {showModal && <Modal type={showModal} onClose={() => setShowModal(null)} onConfirm={resetSessao} />}

      <header className="h-16 border-b border-white/5 flex items-center px-6 md:px-12 bg-[#0f1113]/95 backdrop-blur-md z-50 shrink-0">
        <div className="max-w-[1200px] mx-auto w-full flex justify-between items-center">
          <button onClick={() => step !== AppStep.INITIAL && setShowModal('resetConfirm')} className="flex items-center gap-3 group">
            <div className="w-2 h-2 bg-[#3d7a74] rounded-full shadow-[0_0_10px_#3d7a74]"></div>
            <span className="font-black text-xs uppercase italic tracking-tighter">CINE<span className="text-[#3d7a74] font-light">CONVERTER</span></span>
          </button>
          <div className="hidden md:block"><StepIndicator currentStep={step} /></div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scroll">
        {step === AppStep.INITIAL && (
          <div className="absolute inset-0 pointer-events-none opacity-[0.05] flex items-center justify-center overflow-hidden">
            <div className="w-[120%] h-[120%] bg-gradient-to-b from-[#3d7a74] via-transparent to-transparent blur-[120px]"></div>
          </div>
        )}

        <div className="w-full max-w-[1000px] mx-auto px-6 md:px-12 py-6 md:py-10 flex flex-col min-h-[calc(100vh-4rem-3.5rem)]">
          {step !== AppStep.INITIAL && (
            <div className="mb-6 shrink-0 animate-cc-fade">
              <button onClick={goBack} className="text-[10px] font-black uppercase tracking-widest text-[#454d55] hover:text-white transition-all bg-white/5 py-1 px-3 rounded-full border border-white/5">← Voltar</button>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center">

            {step === AppStep.INITIAL && (
              <div className="animate-cc-fade text-center flex flex-col items-center gap-10 md:gap-12">
                <div className="flex flex-col items-center gap-4 md:gap-6">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase italic leading-none">
                    MIGRE SEUS <span className="text-[#3d7a74]">FILMES</span>
                  </h1>
                  <p className="text-sm md:text-base text-[#8a949e] font-medium italic opacity-80">
                    Sincronize sua coleção de filmes com o Letterboxd instantaneamente.
                  </p>
                </div>
                <button onClick={handleNext} className="cc-btn-primary px-12 sm:px-16 py-4 sm:py-5 rounded-full text-[10px] sm:text-xs shadow-2xl shadow-[#3d7a74]/10">
                  Começar Agora
                </button>
              </div>
            )}

            {step === AppStep.CONSENT && (
              <div className="animate-cc-fade max-w-md mx-auto w-full">
                <div className="cc-card p-8 sm:p-10 space-y-8 sm:space-y-10">
                  <h2 className="text-xl font-black italic uppercase text-center">Protocolos de Segurança</h2>
                  <div className="space-y-6">
                    {['account', 'script', 'terms'].map((key) => (
                      <div key={key} onClick={() => setConsent(prev => ({ ...prev, [key]: !prev[key as keyof typeof consent] }))} className="flex items-center gap-5 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${consent[key as keyof typeof consent] ? 'bg-[#3d7a74] border-[#3d7a74]' : 'border-white/10'}`}>
                          {consent[key as keyof typeof consent] && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        <span className="text-[10px] text-[#8a949e] group-hover:text-white italic leading-tight uppercase font-black">
                          {key === 'account' ? 'Sou o titular desta conta' : key === 'script' ? 'Compreendo a execução de script local' : 'Aceito os termos de processamento de dados'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {error && <p className="text-[9px] text-red-500 font-black uppercase text-center italic">{error}</p>}
                  <button disabled={!consent.account || !consent.script || !consent.terms} onClick={handleNext} className="cc-btn-primary w-full py-5 rounded-xl text-[10px]">Continuar para Exportação</button>
                </div>
              </div>
            )}

            {step === AppStep.EXTRACTION && (
              <div className="animate-cc-fade w-full flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

                  {/* Guia de Exportação */}
                  <div className="cc-card p-6 flex flex-col border-white/5 h-72 md:h-96">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-[#3d7a74] shrink-0 mb-4">Guia de Exportação</h3>
                    <div className="flex-1 overflow-y-auto custom-scroll space-y-4 pr-1">
                      <div className="space-y-4">
                        {[
                          "Acesse o site na aba 'ASSISTIDOS'.",
                          "Abra o console (F12 ou Inspecionar).",
                          "Copie o código abaixo e cole no console.",
                          "Aguarde o download do arquivo .json.",
                          "Volte aqui e clique no botão abaixo."
                        ].map((t, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <span className="text-[#3d7a74] font-black italic opacity-20 text-2xl leading-none shrink-0">0{i + 1}</span>
                            <p className="text-[11px] text-[#8a949e] italic pt-0.5 leading-relaxed">{t}</p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-[#3d7a74]/5 border border-[#3d7a74]/20 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">🛡️</span>
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-[#3d7a74]">Dica</h4>
                        </div>
                        <p className="text-[9px] text-[#8a949e] italic leading-tight">
                          Se não conseguir colar, use <AllowPastingBadge /> no console.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Código de Extração */}
                  <div className="cc-card p-6 flex flex-col border-white/5 h-72 md:h-96">
                    <div className="flex justify-between items-center shrink-0 mb-4">
                      <h3 className="text-[9px] font-black uppercase tracking-widest text-[#3d7a74]">Código de Extração</h3>
                      <span className="text-[8px] font-mono text-[#454d55]">v2.2.8</span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-white/5 bg-[#0a0c0e]/50 mb-4">
                      <pre className="p-4 font-mono text-[9px] h-full w-full overflow-y-auto custom-scroll text-[#3d7a74] leading-relaxed select-all">
                        {standardScript}
                      </pre>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(standardScript); setScriptCopied(true); setTimeout(() => setScriptCopied(false), 2000); }} className="cc-btn-primary py-3 rounded-xl text-[10px] shrink-0">
                      {scriptCopied ? 'Copiado! ✓' : 'Copiar Código'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button onClick={handleNext} className="cc-btn-secondary w-full sm:w-auto px-12 py-4 rounded-full text-[9px] uppercase font-black italic tracking-widest border border-white/10">
                    Já tenho o arquivo .json →
                  </button>
                </div>
              </div>
            )}

            {step === AppStep.UPLOAD && (
              <div className="animate-cc-fade max-w-xl mx-auto w-full flex flex-col gap-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Processar Arquivo</h2>
                  <p className="text-[11px] text-[#8a949e] italic leading-tight">Converta seu arquivo JSON para um CSV padronizado para o Letterboxd.</p>
                </div>
                <div className="cc-card p-6 sm:p-8 border-2 border-dashed border-white/10 hover:border-[#3d7a74]/40 transition-colors">
                  <button onClick={() => fileInputRef.current?.click()} className="cc-btn-primary w-full py-5 rounded-2xl text-[10px]">
                    + CARREGAR ARQUIVO JSON
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" multiple onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        Array.from(files).forEach((file: File) => {
                          const r = new FileReader();
                          r.onload = (ev) => {
                            setFileContents(prev => [...prev, { name: file.name, content: ev.target?.result as string }]);
                            setError(null);
                          };
                          r.readAsText(file);
                        });
                      }
                    }} />
                  </button>
                </div>
                {fileContents.length > 0 && (
                  <div className="space-y-2">
                    {fileContents.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 animate-cc-fade">
                        <span className="text-[10px] font-bold italic text-white/80 truncate max-w-[80%]">{file.name}</span>
                        <button onClick={() => removeFile(i)} className="text-[#454d55] hover:text-red-500 text-[10px]">⨯</button>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <button onClick={processFiles} disabled={fileContents.length === 0 || isProcessing} className="cc-btn-primary w-full py-5 rounded-2xl text-[10px]">
                    {isProcessing ? "CONVERTENDO..." : "INICIAR CONVERSÃO"}
                  </button>
                  {error && <p className="text-[9px] text-red-500 font-black uppercase text-center mt-2 italic">{error}</p>}
                </div>
              </div>
            )}

            {step === AppStep.REVIEW && (
              <div className="animate-cc-fade w-full flex flex-col gap-6">
                <div className="cc-card p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-8 border-[#3d7a74] shadow-xl">
                  <div>
                    <h2 className="text-xl sm:text-3xl font-black italic uppercase tracking-tighter">Dados Prontos.</h2>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#3d7a74] mt-1 italic">{extractedMovies.length} Filmes Convertidos</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <div className="flex gap-2">
                      <button onClick={downloadCSV} className="flex-1 sm:flex-initial px-6 sm:px-10 py-3 sm:py-4 cc-btn-primary rounded-xl text-[10px] shadow-lg">1. Baixar CSV</button>
                      {hasDownloaded ? (
                        <a href="https://letterboxd.com/import/" target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-initial px-6 sm:px-10 py-3 sm:py-4 bg-[#d68a5e] hover:bg-[#e69a6e] transition-all rounded-xl text-[10px] shadow-lg text-white font-black uppercase text-center tracking-widest italic animate-cc-fade flex items-center justify-center">2. Abrir →</a>
                      ) : (
                        <div className="flex-1 sm:flex-initial px-6 sm:px-10 py-3 sm:py-4 bg-white/5 border border-white/5 rounded-xl text-[9px] text-[#454d55] font-black uppercase text-center tracking-widest italic cursor-not-allowed opacity-50 flex items-center justify-center">Baixe Primeiro</div>
                      )}
                    </div>
                    <button onClick={() => setShowModal('resetConfirm')} className="text-[8px] font-black uppercase text-[#454d55] hover:text-white transition-colors py-1 text-center sm:text-right">Limpar Tudo</button>
                  </div>
                </div>

                <div className="cc-card overflow-hidden border-white/5 h-[420px] sm:h-[520px]">
                  <MovieTable movies={extractedMovies} onRemove={(idx) => setExtractedMovies(prev => prev.filter((_, i) => i !== idx))} />
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      <footer className="shrink-0 border-t border-white/5 bg-[#0a0c0e]/80 py-4">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex flex-col gap-1">
            <button onClick={() => step !== AppStep.INITIAL && setShowModal('resetConfirm')} className="flex items-center gap-3 group">
              <div className="w-2 h-2 bg-[#3d7a74] rounded-full shadow-[0_0_8px_#3d7a74]"></div>
              <span className="font-black text-sm uppercase italic tracking-tighter">CINE<span className="text-[#3d7a74] font-light">CONVERTER</span></span>
            </button>
            <p className="text-[7px] text-[#2c3440] font-black uppercase tracking-widest">v2.2.8 • 2025 Cine Converter</p>
          </div>
          <div className="flex items-center gap-6 sm:gap-8 text-[9px] font-black uppercase tracking-widest text-[#454d55] italic">
            <button onClick={() => setShowModal('privacy')} className="hover:text-white transition-colors border-b border-transparent hover:border-white/10 pb-0.5">Privacidade</button>
            <button onClick={() => setShowModal('terms')} className="hover:text-white transition-colors border-b border-transparent hover:border-white/10 pb-0.5">Termos de Uso</button>
            <button onClick={() => setShowModal('legal')} className="hover:text-white transition-colors border-b border-transparent hover:border-white/10 pb-0.5">Aviso Legal</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
