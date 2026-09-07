import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  Filter,
  Sliders,
  Layers,
  Sparkles,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  X,
  Compass,
  GraduationCap,
  Eye,
  Info,
  Move
} from 'lucide-react';
import { LearningUnit, CognitiveLevelId, COGNITIVE_LEVELS } from '../../learnTypes';
import { MathView } from '../common/MathView';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AssistantContextObject } from '../../types';

interface GraphNode {
  id: string;
  type: 'unit' | 'concept' | 'axiom';
  title: string;
  subtitle?: string;
  category: string;
  difficulty?: string;
  mastery: number; // 0 - 100
  unitId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  latex?: string;
  unitRef?: LearningUnit;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'satellite' | 'prerequisite' | 'related';
  label?: string;
}

interface LearnKnowledgeGraphProps {
  learningUnits: LearningUnit[];
  activeUnitId: string | null;
  onSelectUnit: (unitId: string) => void;
  onOpenStudyUnit: (unitId: string) => void;
}

// Category palette for Obsidian nodes
const CATEGORY_COLORS: Record<string, string> = {
  'Attention & Architecture': '#38bdf8', // sky-400
  'Linear Algebra': '#818cf8', // indigo-400
  'Information Theory': '#34d399', // emerald-400
  'Optimization & Calculus': '#fbbf24', // amber-400
  'LLM Reasoning & Alignment': '#c084fc', // purple-400
  'General Math': '#f472b6' // pink-400
};

export const LearnKnowledgeGraph: React.FC<LearnKnowledgeGraphProps> = ({
  learningUnits,
  activeUnitId,
  onSelectUnit,
  onOpenStudyUnit
}) => {
  const { addAttachedContext, setIsDockOpen } = useWorkspace();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Performance & simulation refs (zero React re-renders during high-frequency interaction)
  const viewportRef = useRef<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);

  const hoveredNodeIdRef = useRef<string | null>(null);
  const selectedNodeRef = useRef<GraphNode | null>(null);
  const draggedNodeRef = useRef<GraphNode | null>(null);

  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const nodeIndexRef = useRef<Map<string, GraphNode>>(new Map());

  const alphaRef = useRef<number>(1.0);
  const isSimulatingRef = useRef<boolean>(true);
  const animFrameRef = useRef<number | null>(null);
  const renderPendingRef = useRef<boolean>(false);

  // React state for UI controls only
  const [scaleDisplay, setScaleDisplay] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [colorMode, setColorMode] = useState<'category' | 'mastery'>('category');
  const [showSatellites, setShowSatellites] = useState(true);
  const [repulsionStrength, setRepulsionStrength] = useState(700);
  const [linkDistance, setLinkDistance] = useState(90);
  const [showSettings, setShowSettings] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    learningUnits.forEach(u => set.add(u.category));
    return ['All', ...Array.from(set)];
  }, [learningUnits]);

  // Connected nodes map for fast neighbor queries during hover
  const connectedMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    linksRef.current.forEach(l => {
      if (!map.has(l.source)) map.set(l.source, new Set());
      if (!map.has(l.target)) map.set(l.target, new Set());
      map.get(l.source)!.add(l.target);
      map.get(l.target)!.add(l.source);
    });
    return map;
  }, [showSatellites, learningUnits]);

  // Wake up physics simulation
  const wakeSimulation = useCallback((initialAlpha = 0.5) => {
    alphaRef.current = Math.max(alphaRef.current, initialAlpha);
    if (!isSimulatingRef.current) {
      isSimulatingRef.current = true;
    }
  }, []);

  // Request high performance canvas render on next animation frame
  const requestRender = useCallback(() => {
    if (!renderPendingRef.current) {
      renderPendingRef.current = true;
      requestAnimationFrame(() => {
        renderPendingRef.current = false;
        renderCanvas();
      });
    }
  }, []);

  // Graph Data Construction
  useEffect(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const total = learningUnits.length;
    const phi = (1 + Math.sqrt(5)) / 2;

    learningUnits.forEach((unit, idx) => {
      const theta = 2 * Math.PI * idx * phi;
      const r = Math.sqrt(idx + 1) * 120;
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;

      const baseColor =
        colorMode === 'category'
          ? CATEGORY_COLORS[unit.category] || '#94a3b8'
          : unit.progress.understanding >= 80
          ? '#10b981'
          : unit.progress.understanding >= 50
          ? '#f59e0b'
          : '#ef4444';

      const unitNode: GraphNode = {
        id: unit.id,
        type: 'unit',
        title: unit.title,
        subtitle: unit.description,
        category: unit.category,
        difficulty: unit.difficulty,
        mastery: unit.progress.understanding,
        unitId: unit.id,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 18,
        color: baseColor,
        unitRef: unit
      };
      nodes.push(unitNode);

      if (showSatellites) {
        unit.remembering.keyTerms.slice(0, 3).forEach((term, tIdx) => {
          const satAngle = (tIdx / 3) * Math.PI * 2 + idx;
          const satDist = 45;
          const satNode: GraphNode = {
            id: `${unit.id}-term-${term.id}`,
            type: 'concept',
            title: term.term,
            subtitle: term.definition,
            category: unit.category,
            mastery: unit.progress.remembering,
            unitId: unit.id,
            x: x + Math.cos(satAngle) * satDist,
            y: y + Math.sin(satAngle) * satDist,
            vx: 0,
            vy: 0,
            radius: 8,
            color: baseColor,
            latex: term.symbolLatex
          };
          nodes.push(satNode);
          links.push({
            source: unit.id,
            target: satNode.id,
            type: 'satellite'
          });
        });

        unit.remembering.axiomsAndIdentities.slice(0, 2).forEach((ax, aIdx) => {
          const axAngle = (aIdx / 2) * Math.PI * 2 + idx + Math.PI / 4;
          const axDist = 55;
          const axNode: GraphNode = {
            id: `${unit.id}-ax-${ax.id}`,
            type: 'axiom',
            title: ax.name,
            subtitle: ax.statement,
            category: unit.category,
            mastery: unit.progress.analyzing,
            unitId: unit.id,
            x: x + Math.cos(axAngle) * axDist,
            y: y + Math.sin(axAngle) * axDist,
            vx: 0,
            vy: 0,
            radius: 9,
            color: '#38bdf8',
            latex: ax.latex
          };
          nodes.push(axNode);
          links.push({
            source: unit.id,
            target: axNode.id,
            type: 'satellite'
          });
        });
      }
    });

    for (let i = 0; i < learningUnits.length; i++) {
      for (let j = i + 1; j < learningUnits.length; j++) {
        const uA = learningUnits[i];
        const uB = learningUnits[j];
        const sharedTags = uA.tags.filter(t => uB.tags.includes(t));
        const sharedFields = uA.mathFields.filter(f => uB.mathFields.includes(f));

        if (sharedTags.length > 0 || sharedFields.length > 0) {
          links.push({
            source: uA.id,
            target: uB.id,
            type: 'related',
            label: sharedFields[0] || sharedTags[0]
          });
        }
      }
    }

    nodesRef.current = nodes;
    linksRef.current = links;

    // Cache node map
    const newMap = new Map<string, GraphNode>();
    nodes.forEach(n => newMap.set(n.id, n));
    nodeIndexRef.current = newMap;

    // Center viewport initially if offset is 0,0
    if (containerRef.current && viewportRef.current.x === 0 && viewportRef.current.y === 0) {
      const { clientWidth, clientHeight } = containerRef.current;
      viewportRef.current.x = clientWidth / 2;
      viewportRef.current.y = clientHeight / 2;
    }

    wakeSimulation(1.0);
  }, [learningUnits, showSatellites, colorMode, wakeSimulation]);

  // Keep selected node synchronized with activeUnitId
  useEffect(() => {
    if (activeUnitId) {
      const match = nodesRef.current.find(n => n.id === activeUnitId && n.type === 'unit');
      if (match) {
        setSelectedNode(match);
        selectedNodeRef.current = match;
        requestRender();
      }
    }
  }, [activeUnitId, requestRender]);

  // Render Frame onto Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Viewport transform
    const { x: offX, y: offY, scale } = viewportRef.current;
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    const activeInspectId = hoveredNodeIdRef.current || selectedNodeRef.current?.id || null;
    const neighborSet = activeInspectId ? connectedMap.get(activeInspectId) : null;
    const nodeIndex = nodeIndexRef.current;

    // A. Draw Links
    const links = linksRef.current;
    const linkLen = links.length;
    for (let i = 0; i < linkLen; i++) {
      const link = links[i];
      const s = nodeIndex.get(link.source);
      const t = nodeIndex.get(link.target);
      if (!s || !t) continue;

      const isDirectLink =
        activeInspectId && (link.source === activeInspectId || link.target === activeInspectId);
      const isDimmed = activeInspectId && !isDirectLink;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);

      if (link.type === 'satellite') {
        ctx.strokeStyle = isDirectLink
          ? 'rgba(99, 102, 241, 0.7)'
          : isDimmed
          ? 'rgba(148, 163, 184, 0.05)'
          : 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = isDirectLink ? 1.5 : 1;
        ctx.setLineDash([2, 3]);
      } else {
        ctx.strokeStyle = isDirectLink
          ? 'rgba(56, 189, 248, 0.85)'
          : isDimmed
          ? 'rgba(148, 163, 184, 0.06)'
          : 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = isDirectLink ? 2.2 : 1.1;
        ctx.setLineDash([]);
      }

      ctx.stroke();
    }
    ctx.setLineDash([]);

    // B. Draw Nodes
    const nodes = nodesRef.current;
    const nodeLen = nodes.length;
    for (let i = 0; i < nodeLen; i++) {
      const node = nodes[i];
      const isSelected = selectedNodeRef.current?.id === node.id;
      const isHovered = hoveredNodeIdRef.current === node.id;
      const isConnected = neighborSet ? neighborSet.has(node.id) : false;
      const isDirectFocus = isSelected || isHovered;

      const isQueryMatch =
        searchQuery.trim().length > 0 &&
        (node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const isCategoryMatch =
        selectedCategory === 'All' || node.category === selectedCategory;

      const isDimmed =
        (activeInspectId && !isDirectFocus && !isConnected) ||
        (searchQuery.trim().length > 0 && !isQueryMatch) ||
        !isCategoryMatch;

      const alpha = isDimmed ? 0.16 : 1.0;

      // Subtle Glow for Units or Focused Nodes
      if ((node.type === 'unit' || isDirectFocus || isQueryMatch) && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `${node.color}33`;
        ctx.fill();
      }

      // Base Node
      ctx.beginPath();
      if (node.type === 'axiom') {
        const r = node.radius;
        ctx.moveTo(node.x, node.y - r * 1.2);
        ctx.lineTo(node.x + r * 1.2, node.y);
        ctx.lineTo(node.x, node.y + r * 1.2);
        ctx.lineTo(node.x - r * 1.2, node.y);
        ctx.closePath();
      } else {
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      }

      ctx.fillStyle = node.color;
      ctx.globalAlpha = alpha;
      ctx.fill();

      // Border Outline
      ctx.strokeStyle = isDirectFocus
        ? '#ffffff'
        : isSelected
        ? '#38bdf8'
        : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = isDirectFocus ? 2.5 : 1;
      ctx.stroke();

      // Circular Mastery Ring for Major Units
      if (node.type === 'unit' && !isDimmed) {
        const ringRadius = node.radius + 3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        const startAngle = -Math.PI / 2;
        const progressAngle = startAngle + (node.mastery / 100) * (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(node.x, node.y, ringRadius, startAngle, progressAngle);
        ctx.strokeStyle = node.mastery >= 80 ? '#10b981' : node.color;
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;

      // Labels
      const shouldDrawLabel =
        node.type === 'unit' || isDirectFocus || isQueryMatch || scale > 1.2;

      if (shouldDrawLabel && !isDimmed) {
        ctx.font = `${node.type === 'unit' ? 'bold 11px' : '9px'} sans-serif`;
        const text =
          node.title.length > 24 && node.type === 'unit'
            ? `${node.title.slice(0, 22)}…`
            : node.title;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const labelY = node.y + node.radius + (node.type === 'unit' ? 14 : 10);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(node.x - textWidth / 2 - 4, labelY - 9, textWidth + 8, 14, 3);
        ctx.fill();

        ctx.fillStyle = isDirectFocus ? '#ffffff' : '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(text, node.x, labelY + 2);
      }
    }

    ctx.restore();
  }, [connectedMap, searchQuery, selectedCategory]);

  // Physics Simulation Loop with Cooling (stops when stable!)
  useEffect(() => {
    let lastTime = performance.now();

    const tick = (now: number) => {
      // If alpha cooled and not dragging, pause simulation to eliminate CPU lag
      if (alphaRef.current < 0.003 && !draggedNodeRef.current) {
        isSimulatingRef.current = false;
        renderCanvas();
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Exponential cooling
      alphaRef.current *= 0.95;
      const alpha = alphaRef.current;

      const nodes = nodesRef.current;
      const links = linksRef.current;
      const nodeIndex = nodeIndexRef.current;
      const draggedNode = draggedNodeRef.current;
      const len = nodes.length;

      // 1. Coulomb Repulsion between all pairs
      for (let i = 0; i < len; i++) {
        const nA = nodes[i];
        for (let j = i + 1; j < len; j++) {
          const nB = nodes[j];
          const dx = nB.x - nA.x;
          const dy = nB.y - nA.y;
          const distSq = dx * dx + dy * dy + 0.1;
          if (distSq > 250000) continue; // Skip distant pairs
          const dist = Math.sqrt(distSq);

          const minDist = nA.radius + nB.radius + 15;
          const force =
            (repulsionStrength * (nA.type === 'unit' && nB.type === 'unit' ? 2 : 0.8) * alpha) /
            distSq;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (nA !== draggedNode) {
            nA.vx -= fx;
            nA.vy -= fy;
          }
          if (nB !== draggedNode) {
            nB.vx += fx;
            nB.vy += fy;
          }

          if (dist < minDist) {
            const overlap = (minDist - dist) * 0.4;
            const pushX = (dx / dist) * overlap;
            const pushY = (dy / dist) * overlap;
            if (nA !== draggedNode) {
              nA.x -= pushX;
              nA.y -= pushY;
            }
            if (nB !== draggedNode) {
              nB.x += pushX;
              nB.y += pushY;
            }
          }
        }
      }

      // 2. Hooke's Spring Law for links
      const linkLen = links.length;
      for (let i = 0; i < linkLen; i++) {
        const link = links[i];
        const s = nodeIndex.get(link.source);
        const t = nodeIndex.get(link.target);
        if (!s || !t) continue;

        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const targetDist = link.type === 'satellite' ? 45 : linkDistance;
        const springK = (link.type === 'satellite' ? 0.08 : 0.035) * alpha;
        const delta = dist - targetDist;
        const force = delta * springK;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (s !== draggedNode) {
          s.vx += fx;
          s.vy += fy;
        }
        if (t !== draggedNode) {
          t.vx -= fx;
          t.vy -= fy;
        }
      }

      // 3. Center Gravity & Velocity integration
      const centerGravity = 0.008 * alpha;
      for (let i = 0; i < len; i++) {
        const n = nodes[i];
        if (n === draggedNode) continue;

        n.vx -= n.x * centerGravity;
        n.vy -= n.y * centerGravity;

        n.vx *= 0.86;
        n.vy *= 0.86;

        n.x += n.vx;
        n.y += n.vy;
      }

      // 4. Render to Canvas
      renderCanvas();

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [repulsionStrength, linkDistance, renderCanvas]);

  // Coordinate conversion without React state dependencies
  const screenToGraph = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = screenX - rect.left;
    const clientY = screenY - rect.top;
    const { x: offX, y: offY, scale } = viewportRef.current;
    return {
      x: (clientX - offX) / scale,
      y: (clientY - offY) / scale
    };
  }, []);

  // Mouse Handlers - High Performance
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = screenToGraph(e.clientX, e.clientY);

    const hit = [...nodesRef.current].reverse().find(n => {
      const dx = n.x - coords.x;
      const dy = n.y - coords.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    if (hit) {
      draggedNodeRef.current = hit;
      selectedNodeRef.current = hit;
      setSelectedNode(hit);
      wakeSimulation(0.6);
      if (hit.unitRef) {
        onSelectUnit(hit.unitRef.id);
      }
    } else {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - viewportRef.current.x,
        y: e.clientY - viewportRef.current.y
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const coords = screenToGraph(e.clientX, e.clientY);
      draggedNodeRef.current.x = coords.x;
      draggedNodeRef.current.y = coords.y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      wakeSimulation(0.3);
      requestRender();
      return;
    }

    if (isPanningRef.current) {
      viewportRef.current.x = e.clientX - panStartRef.current.x;
      viewportRef.current.y = e.clientY - panStartRef.current.y;
      requestRender();
      return;
    }

    // Hover test without component re-render
    const coords = screenToGraph(e.clientX, e.clientY);
    const hit = [...nodesRef.current].reverse().find(n => {
      const dx = n.x - coords.x;
      const dy = n.y - coords.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    const newHoverId = hit ? hit.id : null;
    if (hoveredNodeIdRef.current !== newHoverId) {
      hoveredNodeIdRef.current = newHoverId;
      requestRender();
    }
  };

  const handleMouseUp = () => {
    draggedNodeRef.current = null;
    isPanningRef.current = false;
  };

  // Wheel Zoom with smooth scaling
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const currentScale = viewportRef.current.scale;
    const newScale = Math.min(Math.max(currentScale * zoomFactor, 0.35), 2.8);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    viewportRef.current.x =
      mouseX - (mouseX - viewportRef.current.x) * (newScale / currentScale);
    viewportRef.current.y =
      mouseY - (mouseY - viewportRef.current.y) * (newScale / currentScale);
    viewportRef.current.scale = newScale;

    setScaleDisplay(newScale);
    requestRender();
  };

  const handleResetView = () => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      viewportRef.current.scale = 1.0;
      viewportRef.current.x = clientWidth / 2;
      viewportRef.current.y = clientHeight / 2;
      setScaleDisplay(1.0);
      wakeSimulation(0.5);
      requestRender();
    }
  };

  // Resize canvas when container size changes
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;

      requestRender();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [requestRender]);

  const handleAskAiAboutNode = () => {
    if (!selectedNode) return;
    setIsDockOpen(true);
    const ctx: AssistantContextObject = {
      type: 'artifact',
      id: `graph-${selectedNode.id}`,
      label: selectedNode.title,
      secondaryLabel: `Concept Node: ${selectedNode.category}`,
      metadata: {
        formula: selectedNode.latex || '',
        description: selectedNode.subtitle || '',
        mastery: `${selectedNode.mastery}%`
      }
    };
    addAttachedContext(ctx);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-13rem)] min-h-[500px] bg-slate-950 rounded-2xl overflow-hidden border border-[var(--color-rule)] select-none shadow-sm"
    >
      {/* 60FPS Hardware Accelerated Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs text-slate-200 shadow-lg">
          <Search size={13} className="text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              requestRender();
            }}
            placeholder="Search concepts or math fields..."
            className="bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none w-44"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                requestRender();
              }}
              className="text-slate-400 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category Pill Selector */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-lg text-xs shadow-lg">
          <Filter size={12} className="text-slate-400 ml-1.5" />
          <select
            value={selectedCategory}
            onChange={e => {
              setSelectedCategory(e.target.value);
              requestRender();
            }}
            className="bg-transparent text-slate-300 font-mono text-[0.6875rem] focus:outline-none cursor-pointer pr-1"
          >
            {categories.map(cat => (
              <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Physics Controls Toggle */}
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded-lg border backdrop-blur-md text-xs flex items-center gap-1 shadow-lg transition-colors ${
            showSettings
              ? 'bg-sky-500 border-sky-400 text-white'
              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Force-directed Physics Settings"
        >
          <Sliders size={13} />
          <span className="text-[0.6875rem] font-mono">Forces</span>
        </button>
      </div>

      {/* Physics & Visualization Controls Drawer */}
      {showSettings && (
        <div className="absolute top-16 left-4 z-30 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-2xl flex flex-col gap-3.5 text-xs text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-mono uppercase font-bold text-[0.6875rem] tracking-wider text-slate-400">
              Graph Engine Settings
            </span>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[0.6875rem] font-mono text-slate-400">Node Palette</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-800/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setColorMode('category')}
                className={`py-1 rounded text-center font-medium transition-colors ${
                  colorMode === 'category' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Category
              </button>
              <button
                type="button"
                onClick={() => setColorMode('mastery')}
                className={`py-1 rounded text-center font-medium transition-colors ${
                  colorMode === 'mastery' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mastery %
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs">Show Concept Satellites</span>
            <input
              type="checkbox"
              checked={showSatellites}
              onChange={e => setShowSatellites(e.target.checked)}
              className="accent-sky-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[0.6875rem] font-mono text-slate-400">
              <span>Repulsion Force</span>
              <span>{repulsionStrength}</span>
            </div>
            <input
              type="range"
              min="200"
              max="1600"
              step="50"
              value={repulsionStrength}
              onChange={e => {
                setRepulsionStrength(Number(e.target.value));
                wakeSimulation(0.6);
              }}
              className="accent-sky-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[0.6875rem] font-mono text-slate-400">
              <span>Link Distance</span>
              <span>{linkDistance}px</span>
            </div>
            <input
              type="range"
              min="40"
              max="180"
              step="5"
              value={linkDistance}
              onChange={e => {
                setLinkDistance(Number(e.target.value));
                wakeSimulation(0.6);
              }}
              className="accent-sky-500"
            />
          </div>
        </div>
      )}

      {/* Floating Zoom & Fit Buttons (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl text-slate-300 shadow-lg">
        <button
          type="button"
          onClick={() => {
            viewportRef.current.scale = Math.min(viewportRef.current.scale * 1.15, 2.8);
            setScaleDisplay(viewportRef.current.scale);
            requestRender();
          }}
          className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <span className="text-[0.6875rem] font-mono px-1 text-slate-400">
          {Math.round(scaleDisplay * 100)}%
        </span>
        <button
          type="button"
          onClick={() => {
            viewportRef.current.scale = Math.max(viewportRef.current.scale * 0.85, 0.35);
            setScaleDisplay(viewportRef.current.scale);
            requestRender();
          }}
          className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <div className="w-[1px] h-3.5 bg-slate-800" />
        <button
          type="button"
          onClick={handleResetView}
          className="p-1.5 hover:bg-slate-800 rounded-lg hover:text-white transition-colors"
          title="Reset View"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Interactive Node Inspector Drawer (Right Side) */}
      {selectedNode && (
        <aside
          draggable={true}
          onDragStart={e => {
            const ctx: AssistantContextObject = {
              type: 'artifact',
              id: `graph-${selectedNode.id}`,
              label: selectedNode.title,
              secondaryLabel: `Concept Node: ${selectedNode.category}`,
              metadata: {
                formula: selectedNode.latex || '',
                description: selectedNode.subtitle || '',
                mastery: `${selectedNode.mastery}%`
              }
            };
            e.dataTransfer.setData('application/json', JSON.stringify(ctx));
            e.dataTransfer.setData(
              'text/plain',
              `Concept: ${selectedNode.title}\nFormula: ${selectedNode.latex || ''}\n${selectedNode.subtitle || ''}`
            );
          }}
          className="absolute top-4 bottom-4 right-4 z-20 w-84 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-5 flex flex-col justify-between overflow-y-auto text-slate-200 animate-in fade-in slide-in-from-right-4 duration-200"
        >
          <div className="flex flex-col gap-4">
            {/* Header & Drag to AI Handle */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[0.625rem] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${selectedNode.color}20`,
                      borderColor: `${selectedNode.color}40`,
                      color: selectedNode.color
                    }}
                  >
                    {selectedNode.type === 'unit'
                      ? 'Learning Unit'
                      : selectedNode.type === 'axiom'
                      ? 'Core Axiom'
                      : 'Key Concept'}
                  </span>
                  <span className="text-[0.625rem] font-mono text-slate-400 flex items-center gap-1">
                    <Move size={10} className="text-sky-400" />
                    <span>Drag to AI</span>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1 leading-snug">
                  {selectedNode.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedNode(null);
                  selectedNodeRef.current = null;
                  requestRender();
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Rendered Math Formula with KaTeX */}
            {selectedNode.latex && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <MathView
                  math={selectedNode.latex}
                  block={true}
                  label="Mathematical Formula"
                  contextId={`graph-math-${selectedNode.id}`}
                />
              </div>
            )}

            {/* Description */}
            {selectedNode.subtitle && (
              <p className="text-xs text-slate-400 leading-relaxed">
                {selectedNode.subtitle}
              </p>
            )}

            {/* Bloom Levels Breakdown if Unit */}
            {selectedNode.unitRef && (
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Mastery Score</span>
                  <span className="font-bold text-emerald-400">{selectedNode.mastery}%</span>
                </div>

                <div className="flex flex-col gap-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[0.625rem] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Cognitive Levels
                  </span>
                  {(Object.keys(COGNITIVE_LEVELS) as CognitiveLevelId[]).map(lvlId => {
                    const meta = COGNITIVE_LEVELS[lvlId];
                    const score = selectedNode.unitRef!.progress[lvlId];
                    return (
                      <div key={lvlId} className="flex items-center justify-between text-xs gap-2">
                        <span className="text-slate-400 text-[0.6875rem] font-mono truncate max-w-[100px]">
                          {meta.name}
                        </span>
                        <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${score}%`,
                                backgroundColor: selectedNode.color
                              }}
                            />
                          </div>
                          <span className="text-[0.6875rem] font-mono text-slate-300 w-7 text-right">
                            {score}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAskAiAboutNode}
              className="w-full py-2 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles size={13} />
              <span>Discuss Node with AI</span>
            </button>

            {selectedNode.type === 'unit' && (
              <button
                type="button"
                onClick={() => onOpenStudyUnit(selectedNode.unitId)}
                className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-mono font-medium flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <span>Study Unit Architecture</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};
