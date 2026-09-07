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
  Info
} from 'lucide-react';
import { LearningUnit, CognitiveLevelId, COGNITIVE_LEVELS } from '../../learnTypes';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport transformation
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Performance & simulation refs
  const viewportRef = useRef<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);

  // Node selection & hover
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<GraphNode | null>(null);

  const hoveredNodeIdRef = useRef<string | null>(null);
  const selectedNodeRef = useRef<GraphNode | null>(null);
  const draggedNodeRef = useRef<GraphNode | null>(null);

  // Filters & display settings
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [colorMode, setColorMode] = useState<'category' | 'mastery'>('category');
  const [showSatellites, setShowSatellites] = useState(true);
  const [repulsionStrength, setRepulsionStrength] = useState(800);
  const [linkDistance, setLinkDistance] = useState(90);
  const [showSettings, setShowSettings] = useState(false);

  const searchQueryRef = useRef('');
  const selectedCategoryRef = useRef('All');
  const colorModeRef = useRef<'category' | 'mastery'>('category');

  // Physics animation loop reference & alpha cooling
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const nodeMapRef = useRef<Map<string, GraphNode>>(new Map());
  const connectedMapRef = useRef<Map<string, Set<string>>>(new Map());

  const animFrameRef = useRef<number | null>(null);
  const isSimulatingRef = useRef(false);
  const alphaRef = useRef(1.0);
  const lastTimeRef = useRef(0);
  const renderPendingRef = useRef(false);

  // Synchronize state with refs for zero-lag render access
  useEffect(() => {
    hoveredNodeIdRef.current = hoveredNodeId;
  }, [hoveredNodeId]);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    draggedNodeRef.current = draggedNode;
  }, [draggedNode]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

  useEffect(() => {
    colorModeRef.current = colorMode;
  }, [colorMode]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(learningUnits.map(u => u.category));
    return ['All', ...Array.from(set)];
  }, [learningUnits]);

  // Build Graph Nodes & Links
  useEffect(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Pre-calculate positions in an organic circular layout
    const totalUnits = learningUnits.length;
    const centerRadius = Math.max(160, totalUnits * 45);

    learningUnits.forEach((unit, idx) => {
      const angle = (idx / totalUnits) * 2 * Math.PI;
      const x = Math.cos(angle) * centerRadius + (Math.random() - 0.5) * 40;
      const y = Math.sin(angle) * centerRadius + (Math.random() - 0.5) * 40;

      const { remembering, understanding, applying, analyzing, evaluating, creating } = unit.progress;
      const avgMastery = Math.round(
        (remembering + understanding + applying + analyzing + evaluating + creating) / 6
      );

      let color = CATEGORY_COLORS[unit.category] || '#60a5fa';
      if (colorMode === 'mastery') {
        if (avgMastery >= 80) color = '#10b981'; // green
        else if (avgMastery >= 40) color = '#38bdf8'; // blue
        else if (avgMastery > 0) color = '#f59e0b'; // amber
        else color = '#94a3b8'; // slate
      }

      // Unit Main Node
      nodes.push({
        id: unit.id,
        type: 'unit',
        title: unit.title,
        subtitle: `${unit.category} • ${unit.difficulty}`,
        category: unit.category,
        difficulty: unit.difficulty,
        mastery: avgMastery,
        unitId: unit.id,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 20 + Math.round((avgMastery / 100) * 10),
        color,
        unitRef: unit
      });

      // Satellites: Key Terms & Axioms
      if (showSatellites) {
        unit.remembering.keyTerms.slice(0, 3).forEach((term, tIdx) => {
          const satAngle = angle + ((tIdx + 1) / 4) * Math.PI - Math.PI / 4;
          const satDist = 55 + Math.random() * 25;
          const satId = `${unit.id}-term-${term.id}`;
          nodes.push({
            id: satId,
            type: 'concept',
            title: term.term,
            subtitle: term.mnemonic || 'Key Concept',
            category: unit.category,
            mastery: term.recallRating === 'easy' ? 100 : term.recallRating === 'good' ? 75 : 40,
            unitId: unit.id,
            x: x + Math.cos(satAngle) * satDist,
            y: y + Math.sin(satAngle) * satDist,
            vx: 0,
            vy: 0,
            radius: 8,
            color: colorMode === 'mastery' ? (term.recallRating === 'easy' ? '#10b981' : '#38bdf8') : color,
            latex: term.symbolLatex,
            unitRef: unit
          });

          links.push({
            source: unit.id,
            target: satId,
            type: 'satellite'
          });
        });

        unit.remembering.axiomsAndIdentities.slice(0, 2).forEach((axiom, aIdx) => {
          const satAngle = angle + ((aIdx + 2) / 3) * Math.PI;
          const satDist = 65 + Math.random() * 20;
          const satId = `${unit.id}-axiom-${axiom.id}`;
          nodes.push({
            id: satId,
            type: 'axiom',
            title: axiom.name,
            subtitle: 'Axiom & Identity',
            category: unit.category,
            mastery: 80,
            unitId: unit.id,
            x: x + Math.cos(satAngle) * satDist,
            y: y + Math.sin(satAngle) * satDist,
            vx: 0,
            vy: 0,
            radius: 9,
            color: colorMode === 'mastery' ? '#10b981' : '#f59e0b',
            latex: axiom.latex,
            unitRef: unit
          });

          links.push({
            source: unit.id,
            target: satId,
            type: 'satellite'
          });
        });
      }
    });

    // Inter-unit links (Prerequisites & Thematic relations)
    for (let i = 0; i < learningUnits.length; i++) {
      for (let j = i + 1; j < learningUnits.length; j++) {
        const uA = learningUnits[i];
        const uB = learningUnits[j];

        // Shared category or shared math fields
        const sharedFields = uA.mathFields.filter(f => uB.mathFields.includes(f));
        const sharedTags = uA.tags.filter(t => uB.tags.includes(t));

        if (sharedFields.length > 0 || sharedTags.length > 0 || uA.category === uB.category) {
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

    // Center viewport initially if offset is 0,0
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setOffset({ x: clientWidth / 2, y: clientHeight / 2 });
    }
  }, [learningUnits, showSatellites, colorMode]);

  // Keep selected node synchronized with activeUnitId
  useEffect(() => {
    if (activeUnitId) {
      const match = nodesRef.current.find(n => n.id === activeUnitId && n.type === 'unit');
      if (match) setSelectedNode(match);
    }
  }, [activeUnitId]);

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

  // Physics Simulation Loop
  useEffect(() => {
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const nodes = nodesRef.current;
      const links = linksRef.current;

      const nodeIndex = new Map<string, GraphNode>();
      nodes.forEach(n => nodeIndex.set(n.id, n));

      // 1. Coulomb Repulsion between all pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nA = nodes[i];
          const nB = nodes[j];
          const dx = nB.x - nA.x;
          const dy = nB.y - nA.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);

          const minDist = nA.radius + nB.radius + 15;
          const force = (repulsionStrength * (nA.type === 'unit' && nB.type === 'unit' ? 2 : 0.8)) / distSq;

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

          // Elastic collision if overlapping
          if (dist < minDist) {
            const overlap = minDist - dist;
            const pushX = (dx / dist) * overlap * 0.4;
            const pushY = (dy / dist) * overlap * 0.4;
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
      links.forEach(link => {
        const s = nodeIndex.get(link.source);
        const t = nodeIndex.get(link.target);
        if (!s || !t) return;

        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const targetDist = link.type === 'satellite' ? 45 : linkDistance;
        const springK = link.type === 'satellite' ? 0.08 : 0.035;
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
      });

      // 3. Center Gravity & Velocity integration
      const centerGravity = 0.008;
      nodes.forEach(n => {
        if (n === draggedNode) return;

        // Pull gently to origin (0, 0)
        n.vx -= n.x * centerGravity;
        n.vy -= n.y * centerGravity;

        // Friction damping
        n.vx *= 0.86;
        n.vy *= 0.86;

        n.x += n.vx;
        n.y += n.vy;
      });

      // 4. Render to Canvas
      renderCanvas();

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [repulsionStrength, linkDistance, draggedNode, hoveredNodeId, selectedNode, searchQuery, selectedCategory]);

  // Render Frame
  const renderCanvas = () => {
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

    // Apply viewport transform (pan & zoom)
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const activeInspectId = hoveredNodeId || selectedNode?.id || null;
    const neighborSet = activeInspectId ? connectedMap.get(activeInspectId) : null;

    const nodeIndex = new Map<string, GraphNode>();
    nodesRef.current.forEach(n => nodeIndex.set(n.id, n));

    // A. Draw Links
    linksRef.current.forEach(link => {
      const s = nodeIndex.get(link.source);
      const t = nodeIndex.get(link.target);
      if (!s || !t) return;

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
          ? 'rgba(148, 163, 184, 0.06)'
          : 'rgba(148, 163, 184, 0.18)';
        ctx.lineWidth = isDirectLink ? 1.5 : 1;
        ctx.setLineDash([2, 3]);
      } else {
        ctx.strokeStyle = isDirectLink
          ? 'rgba(56, 189, 248, 0.85)'
          : isDimmed
          ? 'rgba(148, 163, 184, 0.08)'
          : 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = isDirectLink ? 2.5 : 1.2;
        ctx.setLineDash([]);
      }

      ctx.stroke();
      ctx.setLineDash([]);
    });

    // B. Draw Nodes
    nodesRef.current.forEach(node => {
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNodeId === node.id;
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
        (!isCategoryMatch);

      const alpha = isDimmed ? 0.18 : 1.0;

      // Glow Aura for Major Units or Focused Nodes
      if ((node.type === 'unit' || isDirectFocus || isQueryMatch) && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 1.5, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          node.x,
          node.y,
          node.radius * 0.7,
          node.x,
          node.y,
          node.radius * 1.6
        );
        grad.addColorStop(0, `${node.color}55`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw Base Node Body
      ctx.beginPath();
      if (node.type === 'axiom') {
        // Diamond for Axioms
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
        ctx.lineWidth = 2;
        ctx.stroke();

        // Progress segment
        const startAngle = -Math.PI / 2;
        const progressAngle = startAngle + (node.mastery / 100) * (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(node.x, node.y, ringRadius, startAngle, progressAngle);
        ctx.strokeStyle = node.mastery >= 80 ? '#10b981' : node.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;

      // C. Draw Node Labels
      const shouldDrawLabel =
        node.type === 'unit' ||
        isDirectFocus ||
        isQueryMatch ||
        scale > 1.2;

      if (shouldDrawLabel && !isDimmed) {
        ctx.font = `${node.type === 'unit' ? 'bold 11px' : '9px'} "Inter", system-ui, -apple-system, sans-serif`;
        const text = node.title.length > 26 && node.type === 'unit'
          ? `${node.title.slice(0, 24)}…`
          : node.title;
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const labelY = node.y + node.radius + (node.type === 'unit' ? 14 : 10);

        // Pill background behind text for readability
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(
          node.x - textWidth / 2 - 4,
          labelY - 9,
          textWidth + 8,
          14,
          3
        );
        ctx.fill();

        ctx.fillStyle = isDirectFocus ? '#ffffff' : '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(text, node.x, labelY + 2);
      }
    });

    ctx.restore();
  };

  // Resize canvas when container changes
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

      renderCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Screen to Graph Coordinates conversion
  const screenToGraph = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = screenX - rect.left;
      const clientY = screenY - rect.top;
      return {
        x: (clientX - offset.x) / scale,
        y: (clientY - offset.y) / scale
      };
    },
    [offset, scale]
  );

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = screenToGraph(e.clientX, e.clientY);

    // Check hit test on nodes (reverse order to pick topmost)
    const hit = [...nodesRef.current].reverse().find(n => {
      const dx = n.x - coords.x;
      const dy = n.y - coords.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    if (hit) {
      setDraggedNode(hit);
      setSelectedNode(hit);
      if (hit.unitRef) {
        onSelectUnit(hit.unitRef.id);
      }
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNode) {
      const coords = screenToGraph(e.clientX, e.clientY);
      draggedNode.x = coords.x;
      draggedNode.y = coords.y;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
      return;
    }

    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    // Hover test
    const coords = screenToGraph(e.clientX, e.clientY);
    const hit = [...nodesRef.current].reverse().find(n => {
      const dx = n.x - coords.x;
      const dy = n.y - coords.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    setHoveredNodeId(hit ? hit.id : null);
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setIsPanning(false);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(Math.max(scale * zoomFactor, 0.35), 2.8);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom towards cursor position
    const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
    const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  // Center & Fit View
  const handleResetView = () => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setScale(1.0);
      setOffset({ x: clientWidth / 2, y: clientHeight / 2 });
    }
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalUnits = learningUnits.length;
    let totalScore = 0;
    let masteredCount = 0;

    learningUnits.forEach(u => {
      const avg = Math.round(
        (u.progress.remembering +
          u.progress.understanding +
          u.progress.applying +
          u.progress.analyzing +
          u.progress.evaluating +
          u.progress.creating) / 6
      );
      totalScore += avg;
      if (avg >= 80) masteredCount++;
    });

    const avgMastery = totalUnits > 0 ? Math.round(totalScore / totalUnits) : 0;
    const totalConcepts = learningUnits.reduce(
      (acc, u) => acc + u.remembering.keyTerms.length + u.remembering.axiomsAndIdentities.length,
      0
    );

    return { totalUnits, avgMastery, masteredCount, totalConcepts };
  }, [learningUnits]);

  return (
    <div
      ref={containerRef}
      id="obsidian-knowledge-graph-container"
      className="relative w-full h-full flex overflow-hidden bg-slate-950 select-none"
    >
      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full block ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Search & Filter HUD */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search concepts, axioms, units..."
              className="bg-transparent text-xs text-slate-100 placeholder:text-slate-500 w-44 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="w-px h-4 bg-slate-800" />

          {/* Category Dropdown/Pills */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-xs no-scrollbar">
            {categories.slice(0, 4).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[0.6875rem] font-mono whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-sky-500 text-white font-medium shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-slate-800" />

          {/* Physics & Display Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1 rounded-md text-xs transition-colors ${
              showSettings ? 'text-sky-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Graph settings"
          >
            <Sliders size={14} />
          </button>
        </div>

        {/* Right: Knowledge Metrics Banner */}
        <div className="hidden lg:flex items-center gap-4 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 px-4 py-1.5 rounded-xl shadow-lg font-mono text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-500">Units:</span>
            <span className="font-bold text-white">{metrics.totalUnits}</span>
          </div>
          <div className="w-px h-3 bg-slate-800" />
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-500">Concepts:</span>
            <span className="font-bold text-sky-400">{metrics.totalConcepts}</span>
          </div>
          <div className="w-px h-3 bg-slate-800" />
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-500">Mastered:</span>
            <span className="font-bold text-emerald-400">{metrics.masteredCount}</span>
          </div>
          <div className="w-px h-3 bg-slate-800" />
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-500">Average:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-emerald-400">{metrics.avgMastery}%</span>
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${metrics.avgMastery}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Popover (Obsidian Style) */}
      {showSettings && (
        <div className="absolute top-16 left-4 z-30 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-2xl flex flex-col gap-3.5 text-xs text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-mono uppercase font-bold text-[0.6875rem] tracking-wider text-slate-400">
              Graph Controls
            </span>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X size={14} />
            </button>
          </div>

          {/* Color Mode */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.6875rem] font-mono text-slate-400">Node Color By</label>
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

          {/* Satellites Toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs">Show Concept Satellites</span>
            <input
              type="checkbox"
              checked={showSatellites}
              onChange={e => setShowSatellites(e.target.checked)}
              className="accent-sky-500 rounded cursor-pointer"
            />
          </div>

          {/* Repulsion Force Slider */}
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
              onChange={e => setRepulsionStrength(Number(e.target.value))}
              className="accent-sky-500"
            />
          </div>

          {/* Link Distance Slider */}
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
              onChange={e => setLinkDistance(Number(e.target.value))}
              className="accent-sky-500"
            />
          </div>
        </div>
      )}

      {/* Floating Zoom & Reset HUD (Bottom-Left) */}
      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg select-none text-slate-300 text-xs">
        <button
          type="button"
          onClick={() => setScale(prev => Math.max(prev * 0.85, 0.35))}
          title="Zoom Out"
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ZoomOut size={15} />
        </button>

        <span className="font-mono font-semibold px-1 min-w-[42px] text-center text-slate-200">
          {Math.round(scale * 100)}%
        </span>

        <button
          type="button"
          onClick={() => setScale(prev => Math.min(prev * 1.15, 2.8))}
          title="Zoom In"
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ZoomIn size={15} />
        </button>

        <div className="w-px h-3.5 bg-slate-800 mx-0.5" />

        <button
          type="button"
          onClick={handleResetView}
          title="Center Graph"
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Node Inspector Drawer (Right Side) */}
      {selectedNode && (
        <aside className="absolute top-4 bottom-4 right-4 z-20 w-80 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-5 flex flex-col justify-between overflow-y-auto text-slate-200 animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex flex-col gap-1">
                <span
                  className="text-[0.6875rem] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border w-fit"
                  style={{
                    backgroundColor: `${selectedNode.color}20`,
                    borderColor: `${selectedNode.color}40`,
                    color: selectedNode.color
                  }}
                >
                  {selectedNode.type === 'unit' ? 'Learning Unit' : selectedNode.type === 'axiom' ? 'Core Axiom' : 'Key Concept'}
                </span>
                <h3 className="text-sm font-bold text-white mt-1 leading-snug">
                  {selectedNode.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* LaTeX Equation if present */}
            {selectedNode.latex && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-xs text-sky-300 overflow-x-auto">
                <span className="text-[0.625rem] text-slate-500 block mb-1 uppercase tracking-wider">Formula / Representation</span>
                <code className="break-all">{selectedNode.latex}</code>
              </div>
            )}

            {/* Subtitle / Description */}
            {selectedNode.subtitle && (
              <p className="text-xs text-slate-400 leading-relaxed">
                {selectedNode.subtitle}
              </p>
            )}

            {/* Unit Details & Bloom Levels Breakdown */}
            {selectedNode.unitRef && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Mastery Score</span>
                  <span className="font-bold text-emerald-400">{selectedNode.mastery}%</span>
                </div>

                {/* 6 Bloom Levels Progress */}
                <div className="flex flex-col gap-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[0.6875rem] font-mono text-slate-400 uppercase tracking-wider mb-1">
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

                {/* Prerequisites */}
                {selectedNode.unitRef.prerequisites.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[0.6875rem] font-mono text-slate-400 uppercase tracking-wider">
                      Prerequisites ({selectedNode.unitRef.prerequisites.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.unitRef.prerequisites.map((prereq, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/60 text-[0.6875rem] text-slate-300"
                        >
                          {prereq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Footer: Study Button */}
          {selectedNode.unitRef && (
            <div className="pt-4 mt-4 border-t border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onOpenStudyUnit(selectedNode.unitRef!.id)}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-colors"
              >
                <span>Study in Cognitive Ladder</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </aside>
      )}
    </div>
  );
};
