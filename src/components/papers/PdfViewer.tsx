import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  Download,
  ExternalLink,
  Layers,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { PaperHighlight } from '../../types';

// Configure worker for PDF.js v4
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface PdfViewerProps {
  pdfUrl: string;
  highlights?: PaperHighlight[];
  onTextSelect: (selection: {
    text: string;
    rect: { top: number; left: number; width: number; height: number };
    pageNumber: number;
  }) => void;
  onClearSelection?: () => void;
  title?: string;
  onSwitchToPreprint?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfUrl,
  highlights = [],
  onTextSelect,
  onClearSelection,
  title,
  onSwitchToPreprint
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<boolean>(false);
  const [isContinuous, setIsContinuous] = useState<boolean>(false);
  const [fitMode, setFitMode] = useState<'custom' | 'width' | 'page'>('width');

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`
    });

    loadingTask.promise
      .then(doc => {
        if (isCancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setLoading(false);
      })
      .catch(err => {
        if (isCancelled) return;
        console.warn('PDF.js load error:', err);
        setError(err.message || 'Could not render PDF directly.');
        setLoading(false);
      });

    return () => {
      isCancelled = true;
      loadingTask.destroy();
    };
  }, [pdfUrl]);

  // Render current page
  const renderSinglePage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    setRenderProgress(true);

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Determine responsive scale
      let finalScale = scale;
      if (fitMode === 'width' && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48;
        const unscaledViewport = page.getViewport({ scale: 1, rotation });
        finalScale = Math.max(0.6, Math.min(2.5, containerWidth / unscaledViewport.width));
      } else if (fitMode === 'page' && containerRef.current) {
        const containerHeight = containerRef.current.clientHeight - 80;
        const unscaledViewport = page.getViewport({ scale: 1, rotation });
        finalScale = Math.max(0.6, Math.min(2.5, containerHeight / unscaledViewport.height));
      }

      const viewport = page.getViewport({ scale: finalScale, rotation });
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      // Render PDF page canvas
      await page.render({
        canvasContext: ctx,
        viewport
      }).promise;

      ctx.restore();

      // Render Text Layer for native selection
      if (textLayerRef.current) {
        const textContainer = textLayerRef.current;
        textContainer.innerHTML = '';
        textContainer.style.width = `${Math.floor(viewport.width)}px`;
        textContainer.style.height = `${Math.floor(viewport.height)}px`;

        const textContent = await page.getTextContent();

        try {
          // PDF.js v4 TextLayer class
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textContainer,
            viewport
          });
          await textLayer.render();
        } catch {
          // Fallback manual text span generator
          for (const item of textContent.items as any[]) {
            if (!item.str) continue;
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const span = document.createElement('span');
            span.textContent = item.str;
            span.style.left = `${tx[4]}px`;
            span.style.top = `${tx[5] - item.height * finalScale}px`;
            span.style.fontSize = `${Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1])}px`;
            span.style.fontFamily = item.fontName || 'sans-serif';
            textContainer.appendChild(span);
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Page render error:', err);
      }
    } finally {
      setRenderProgress(false);
    }
  }, [pdfDoc, currentPage, scale, rotation, fitMode]);

  useEffect(() => {
    renderSinglePage();
  }, [renderSinglePage]);

  // Handle Text Selection over PDF
  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }
    const selectedText = selection.toString().trim();
    if (selectedText.length > 0 && selectedText.length < 5000) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          onTextSelect({
            text: selectedText,
            rect: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            },
            pageNumber: currentPage
          });
        }
      } catch (e) {
        console.warn('Selection rect error:', e);
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handleZoomIn = () => {
    setFitMode('custom');
    setScale(s => Math.min(2.5, Number((s + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setScale(s => Math.max(0.5, Number((s - 0.15).toFixed(2))));
  };

  const handleRotate = () => {
    setRotation(r => (r + 90) % 360);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 text-slate-100 select-none">
      {/* Top PDF Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 border-b border-slate-700/80 shrink-0 text-xs gap-3">
        {/* Page Nav */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            title="Previous Page"
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 font-mono text-slate-300">
            <input
              type="number"
              min={1}
              max={totalPages || 1}
              value={currentPage}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= totalPages) setCurrentPage(val);
              }}
              className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-white focus:outline-none focus:border-teal-500"
            />
            <span className="text-slate-500">/</span>
            <span>{totalPages || '...'}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            title="Next Page"
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Display Modes */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono text-xs w-12 text-center text-slate-300">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            onClick={() => setFitMode(m => (m === 'width' ? 'custom' : 'width'))}
            className={`px-2 py-0.5 rounded font-sans transition-colors ${
              fitMode === 'width' ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40' : 'hover:bg-slate-700 text-slate-300'
            }`}
          >
            Fit Width
          </button>

          <button
            onClick={() => setFitMode(m => (m === 'page' ? 'custom' : 'page'))}
            className={`px-2 py-0.5 rounded font-sans transition-colors ${
              fitMode === 'page' ? 'bg-teal-600/30 text-teal-300 border border-teal-500/40' : 'hover:bg-slate-700 text-slate-300'
            }`}
          >
            Fit Page
          </button>

          <button
            onClick={handleRotate}
            title="Rotate Page"
            className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors ml-1"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right actions: Pre-print reader view & Download */}
        <div className="flex items-center gap-2">
          {onSwitchToPreprint && (
            <button
              onClick={onSwitchToPreprint}
              title="Switch to Academic Preprint Text View"
              className="px-2.5 py-1 rounded bg-slate-700/80 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>Preprint View</span>
            </button>
          )}

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new window"
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href={pdfUrl}
            download={`${title || 'paper'}.pdf`}
            title="Download PDF"
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main PDF Canvas & Text Layer Container */}
      <div
        ref={containerRef}
        onMouseUp={handleSelection}
        className="flex-1 overflow-auto flex justify-center items-start p-6 relative bg-slate-950/60 selection:bg-amber-300/40 select-text"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            <span className="text-sm font-mono">Initializing vector PDF engine...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center max-w-md p-6 bg-slate-800/90 border border-slate-700 rounded-lg text-center gap-3 my-12">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <div className="text-sm font-medium text-slate-200">Unable to preview PDF directly</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This external server may restrict cross-origin iframe embedding, or the file URL requires direct access.
            </p>
            <div className="flex gap-2 mt-2">
              {onSwitchToPreprint && (
                <button
                  onClick={onSwitchToPreprint}
                  className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-xs font-medium text-white transition-colors"
                >
                  Read in Preprint View
                </button>
              )}
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1"
              >
                <span>Open in Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="relative shadow-2xl bg-white rounded border border-slate-700/60 overflow-hidden mb-12">
            {/* The rendered Canvas */}
            <canvas ref={canvasRef} className="block select-none pointer-events-none" />

            {/* The Text Selection Layer */}
            <div
              ref={textLayerRef}
              className="pdf-text-layer absolute inset-0 overflow-hidden pointer-events-auto select-text text-transparent opacity-100"
              style={{
                lineHeight: 1,
                userSelect: 'text',
                WebkitUserSelect: 'text'
              }}
            />

            {/* Visual Overlays for saved highlights on this page */}
            {highlights
              .filter(h => !h.pageNumber || h.pageNumber === currentPage)
              .map(h => (
                <div
                  key={h.id}
                  title={`Highlight: "${h.text.slice(0, 80)}..."`}
                  className="absolute pointer-events-none bg-amber-400/25 border-b border-amber-500/40 rounded-sm"
                />
              ))}

            {renderProgress && (
              <div className="absolute top-2 right-2 bg-slate-900/80 px-2 py-1 rounded text-[10px] font-mono text-teal-300 flex items-center gap-1 backdrop-blur-sm pointer-events-none">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Rendering...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global CSS injection for PDF.js text layer */}
      <style>{`
        .pdf-text-layer > span, .pdf-text-layer > div {
          color: transparent !important;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }
        .pdf-text-layer ::selection {
          background: rgba(251, 191, 36, 0.45) !important;
        }
      `}</style>
    </div>
  );
};
