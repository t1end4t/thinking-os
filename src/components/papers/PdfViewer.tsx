import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, ExternalLink, Loader2 } from 'lucide-react';
import { PaperHighlight } from '../../types';
import './reader.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

export interface PdfSelection {
  text: string;
  rect: { top: number; left: number; width: number; height: number };
  pageNumber: number;
  rects: NonNullable<PaperHighlight['rects']>;
}

type PageRegistration = { element: HTMLDivElement; viewport: pdfjsLib.PageViewport };
type FitMode = 'custom' | 'width' | 'page';

function PdfPage({ document, pageNumber, scale, rotation, fitMode, size, highlights, register, scrollRoot }: {
  document: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  rotation: number;
  fitMode: FitMode;
  size: { width: number; height: number };
  highlights: PaperHighlight[];
  register: (pageNumber: number, registration: PageRegistration | null) => void;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<pdfjsLib.PDFPageProxy | null>(null);
  const [nearby, setNearby] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    document.getPage(pageNumber).then(value => {
      if (!cancelled) setPage(value);
    }).catch(reason => { if (!cancelled) setError(String(reason)); });
    return () => { cancelled = true; };
  }, [document, pageNumber]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => setNearby(entries[0].isIntersecting), {
      root: scrollRoot.current, rootMargin: '1000px'
    });
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [scrollRoot]);

  const base = page?.getViewport({ scale: 1, rotation });
  const fittedScale = base ? Math.min((size.width - 32) / base.width,
    fitMode === 'page' ? (size.height - 32) / base.height : Infinity) : scale;
  const actualScale = fitMode === 'custom' ? scale : Math.max(0.1, fittedScale);
  const viewport = page?.getViewport({ scale: actualScale, rotation });

  useEffect(() => {
    if (!page || !nearby || !canvasRef.current || !textRef.current || !elementRef.current) return;
    const canvas = canvasRef.current;
    const container = textRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    const currentViewport = page.getViewport({ scale: actualScale, rotation });
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(currentViewport.width * pixelRatio);
    canvas.height = Math.ceil(currentViewport.height * pixelRatio);
    container.replaceChildren();
    setReady(false);
    setError('');
    let cancelled = false;
    const renderTask = page.render({ canvasContext: context, viewport: currentViewport,
      transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
    const textLayer = new pdfjsLib.TextLayer({
      textContentSource: page.streamTextContent(), container, viewport: currentViewport
    });
    Promise.all([renderTask.promise, textLayer.render()]).then(() => {
      if (cancelled) return;
      register(pageNumber, { element: elementRef.current!, viewport: currentViewport });
      setReady(true);
    }).catch(reason => { if (!cancelled) setError(String(reason)); });
    return () => {
      cancelled = true;
      register(pageNumber, null);
      renderTask.cancel();
      textLayer.cancel();
      container.replaceChildren();
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [page, nearby, actualScale, rotation, pageNumber, register]);

  return (
    <div ref={elementRef} className="pdf-page" data-page-number={pageNumber} aria-label={`Page ${pageNumber}`}
      style={{ width: viewport?.width || Math.max(100, size.width - 32), height: viewport?.height || size.height,
        '--scale-factor': actualScale } as React.CSSProperties}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <div ref={textRef} className="pdf-text-layer" />
      {nearby && ready && viewport && highlights.flatMap(highlight => (highlight.rects || [])
        .filter(rect => rect.pageNumber === pageNumber).map((rect, index) => {
          const [left, top, right, bottom] = viewport.convertToViewportRectangle(rect.coordinates);
          return <div key={`${highlight.id}-${index}`} className="pdf-highlight" data-highlight-id={highlight.id}
            style={{ left: Math.min(left, right), top: Math.min(top, bottom), width: Math.abs(right - left),
              height: Math.abs(bottom - top), background: `var(--highlight-${highlight.color || 'amber'})` }} />;
        }))}
      {error ? <div className="pdf-page-status" role="alert">Page {pageNumber}: {error}</div>
        : (!nearby || !ready) && <div className="pdf-page-status">Page {pageNumber} · Loading…</div>}
    </div>
  );
}

export function PdfViewer({ pdfUrl, highlights = [], onTextSelect, onClearSelection, title }: {
  pdfUrl: string;
  highlights?: PaperHighlight[];
  onTextSelect: (selection: PdfSelection) => void;
  onClearSelection: () => void;
  title?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef(new Map<number, PageRegistration>());
  const [document, setDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState<FitMode>('width');
  const [error, setError] = useState('');
  const [size, setSize] = useState({ width: 800, height: 900 });
  const register = useCallback((pageNumber: number, registration: PageRegistration | null) => {
    if (registration) pagesRef.current.set(pageNumber, registration);
    else pagesRef.current.delete(pageNumber);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDocument(null);
    setError('');
    setCurrentPage(1);
    const task = pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`
    });
    task.promise.then(value => { if (!cancelled) setDocument(value); })
      .catch(reason => { if (!cancelled) setError(String(reason)); });
    return () => { cancelled = true; void task.destroy(); };
  }, [pdfUrl]);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return onClearSelection();
    const range = selection.getRangeAt(0);
    const start = range.startContainer.parentElement?.closest('.pdf-text-layer');
    const end = range.endContainer.parentElement?.closest('.pdf-text-layer');
    const text = selection.toString().trim();
    if (!start || !end || !containerRef.current?.contains(start) || !containerRef.current.contains(end)
      || !text || text.length > 5000) return onClearSelection();
    const rects: PdfSelection['rects'] = [];
    const seen = new Set<string>();
    for (const [pageNumber, { element, viewport }] of pagesRef.current) {
      const layer = element.querySelector('.pdf-text-layer');
      if (!layer || !range.intersectsNode(layer)) continue;
      const pageRange = range.cloneRange();
      if (!layer.contains(range.startContainer)) pageRange.setStart(layer, 0);
      if (!layer.contains(range.endContainer)) pageRange.setEnd(layer, layer.childNodes.length);
      const bounds = element.getBoundingClientRect();
      for (const rect of pageRange.getClientRects()) {
        const left = Math.max(rect.left, bounds.left);
        const top = Math.max(rect.top, bounds.top);
        const right = Math.min(rect.right, bounds.right);
        const bottom = Math.min(rect.bottom, bounds.bottom);
        if (right - left < 1 || bottom - top < 1) continue;
        const [startX, startY] = viewport.convertToPdfPoint(left - bounds.left, top - bounds.top);
        const [endX, endY] = viewport.convertToPdfPoint(right - bounds.left, bottom - bounds.top);
        const key = [pageNumber, startX, startY, endX, endY].map(value => value.toFixed(2)).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        rects.push({ pageNumber, coordinates: [startX, startY, endX, endY] });
      }
    }
    rects.sort((first, second) => first.pageNumber - second.pageNumber);
    if (!rects.length) return onClearSelection();
    onTextSelect({ text, rect: range.getBoundingClientRect(), pageNumber: rects[0].pageNumber, rects });
  }, [onTextSelect, onClearSelection]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const changed = () => { clearTimeout(timeout); timeout = setTimeout(handleSelection, 100); };
    window.document.addEventListener('selectionchange', changed);
    return () => { clearTimeout(timeout); window.document.removeEventListener('selectionchange', changed); };
  }, [handleSelection]);

  const navigate = (pageNumber: number) => {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > (document?.numPages || 0)) return;
    containerRef.current?.querySelector<HTMLElement>(`[data-page-number="${pageNumber}"]`)
      ?.scrollIntoView({ block: 'start' });
    setCurrentPage(pageNumber);
    onClearSelection();
  };
  const zoom = (delta: number) => {
    const actualScale = pagesRef.current.get(currentPage)?.viewport.scale || scale;
    setScale(Math.max(0.25, Math.min(3, actualScale + delta)));
    setFitMode('custom');
    onClearSelection();
  };

  return (
    <div className="pdf-reader">
      <div className="pdf-controls" aria-label="PDF controls">
        <div>
          <button onClick={() => navigate(currentPage - 1)} disabled={currentPage <= 1} title="Previous Page"><ChevronLeft size={16} /></button>
          <input aria-label="Page number" type="number" min={1} max={document?.numPages || 1} value={currentPage}
            onChange={event => navigate(Number(event.target.value))} />
          <span className="font-mono">/ {document?.numPages || '…'}</span>
          <button onClick={() => navigate(currentPage + 1)} disabled={!document || currentPage >= document.numPages} title="Next Page"><ChevronRight size={16} /></button>
        </div>
        <div>
          <button onClick={() => zoom(-0.15)} title="Zoom Out"><ZoomOut size={16} /></button>
          <span className="font-mono">{fitMode === 'custom' ? `${Math.round(scale * 100)}%` : fitMode === 'width' ? 'Fit width' : 'Fit page'}</span>
          <button onClick={() => zoom(0.15)} title="Zoom In"><ZoomIn size={16} /></button>
          <button aria-pressed={fitMode === 'width'} onClick={() => { setFitMode('width'); onClearSelection(); }}>Fit Width</button>
          <button aria-pressed={fitMode === 'page'} onClick={() => { setFitMode('page'); onClearSelection(); }}>Fit Page</button>
          <button title="Rotate Page" onClick={() => { setRotation(value => (value + 90) % 360); onClearSelection(); }}><RotateCw size={16} /></button>
        </div>
        <div>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" title="Open PDF in new tab"><ExternalLink size={16} /></a>
          <a href={pdfUrl} download={`${title || 'paper'}.pdf`} title="Download PDF"><Download size={16} /></a>
        </div>
      </div>
      <div ref={containerRef} className="pdf-scroll" onPointerUp={handleSelection} onKeyUp={handleSelection}
        onScroll={() => {
          onClearSelection();
          const root = containerRef.current;
          if (!root) return;
          const top = root.getBoundingClientRect().top;
          const closest = [...root.querySelectorAll<HTMLElement>('.pdf-page')]
            .find(element => element.getBoundingClientRect().bottom > top + Math.min(100, root.clientHeight / 4));
          if (closest) setCurrentPage(Number(closest.dataset.pageNumber));
        }}>
        {error ? <div className="pdf-message" role="alert"><strong>Unable to preview this PDF</strong><p>{error}</p>
          <p>The source may block access. Open the original or upload a local copy.</p>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">Open original PDF</a></div>
          : !document ? <div className="pdf-message" role="status"><Loader2 className="animate-spin" /> Loading PDF…</div>
          : Array.from({ length: document.numPages }, (_, index) => <PdfPage key={index + 1} document={document}
            pageNumber={index + 1} scale={scale} rotation={rotation} fitMode={fitMode} size={size}
            highlights={highlights} register={register} scrollRoot={containerRef} />)}
      </div>
    </div>
  );
}
