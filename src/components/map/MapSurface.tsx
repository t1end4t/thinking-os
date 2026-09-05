import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { computeMapLayout, LayoutEdge, LayoutNode } from './computeLayout';
import { NodeCard } from './NodeCard';
import { TabHelpTip } from '../common/TabHelpTip';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  GripVertical,
  HelpCircle,
  Sparkles,
  Plus
} from 'lucide-react';

export const MapSurface: React.FC = () => {
  const {
    questions,
    claims,
    evidence,
    links,
    activeTag,
    linkStatusFilter,
    setLinkStatusFilter,
    selectedNodeId,
    setSelectedNodeId,
    selectedLinkId,
    setSelectedLinkId,
    clearSelection,
    setActiveContext,
    addAttachedContext
  } = useWorkspace();

  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 40, y: 30 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover states for dynamic relationship highlighting
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);

  // Compute Layout deterministically
  const layout = useMemo(() => {
    return computeMapLayout(
      questions,
      claims,
      evidence,
      links,
      activeTag,
      linkStatusFilter
    );
  }, [questions, claims, evidence, links, activeTag, linkStatusFilter]);

  // Aggregate link counts by status
  const linkCounts = useMemo(() => {
    const counts = { all: links.length, holds: 0, weak: 0, missing: 0 };
    for (const l of links) {
      if (l.status === 'holds') counts.holds++;
      else if (l.status === 'weak') counts.weak++;
      else if (l.status === 'missing') counts.missing++;
    }
    return counts;
  }, [links]);

  // Zoom limits: Keep zoom between 70% and 150% so text and labels are always sharp, readable and never shrink to blank shapes
  const MIN_SCALE = 0.70;
  const MAX_SCALE = 1.50;

  // Determine Semantic Zoom level:
  // - STRUCTURE: 0.70 <= scale <= 1.15
  // - WORKING: scale > 1.15
  const zoomLevel: 'structure' | 'working' = useMemo(() => {
    if (scale <= 1.15) return 'structure';
    return 'working';
  }, [scale]);

  // Compute Dynamic Relationship Graph for Active Hover/Selection
  // When hovering or selecting any node/edge, all related nodes & edges in its branch light up!
  const { relatedNodeIds, relatedEdgeIds, hasActiveHighlight } = useMemo(() => {
    // Priority: hovered element first, fallback to selected element
    const activeNodeId = hoveredNodeId || (!hoveredLinkId ? selectedNodeId : null);
    const activeLinkId = hoveredLinkId || (!hoveredNodeId ? selectedLinkId : null);

    const rNodes = new Set<string>();
    const rEdges = new Set<string>();

    if (!activeNodeId && !activeLinkId) {
      return { relatedNodeIds: rNodes, relatedEdgeIds: rEdges, hasActiveHighlight: false };
    }

    if (activeNodeId) {
      rNodes.add(activeNodeId);

      // Walk UP (Ancestors)
      const walkUp = (currId: string) => {
        for (const edge of layout.edges) {
          if (edge.targetId === currId) {
            rEdges.add(edge.id);
            if (edge.linkId) rEdges.add(edge.linkId);
            rNodes.add(edge.sourceId);
            walkUp(edge.sourceId);
          }
        }
      };
      walkUp(activeNodeId);

      // Walk DOWN (Descendants)
      const walkDown = (currId: string) => {
        for (const edge of layout.edges) {
          if (edge.sourceId === currId) {
            rEdges.add(edge.id);
            if (edge.linkId) rEdges.add(edge.linkId);
            rNodes.add(edge.targetId);
            walkDown(edge.targetId);
          }
        }
      };
      walkDown(activeNodeId);
    }

    if (activeLinkId) {
      const activeEdge = layout.edges.find(e => e.linkId === activeLinkId || e.id === activeLinkId);
      if (activeEdge) {
        rEdges.add(activeEdge.id);
        if (activeEdge.linkId) rEdges.add(activeEdge.linkId);
        rNodes.add(activeEdge.sourceId);
        rNodes.add(activeEdge.targetId);

        // Walk UP from source
        const walkUp = (currId: string) => {
          for (const edge of layout.edges) {
            if (edge.targetId === currId) {
              rEdges.add(edge.id);
              if (edge.linkId) rEdges.add(edge.linkId);
              rNodes.add(edge.sourceId);
              walkUp(edge.sourceId);
            }
          }
        };
        walkUp(activeEdge.sourceId);

        // Walk DOWN from target
        const walkDown = (currId: string) => {
          for (const edge of layout.edges) {
            if (edge.sourceId === currId) {
              rEdges.add(edge.id);
              if (edge.linkId) rEdges.add(edge.linkId);
              rNodes.add(edge.targetId);
              walkDown(edge.targetId);
            }
          }
        };
        walkDown(activeEdge.targetId);
      }
    }

    return { relatedNodeIds: rNodes, relatedEdgeIds: rEdges, hasActiveHighlight: true };
  }, [hoveredNodeId, hoveredLinkId, selectedNodeId, selectedLinkId, layout.edges]);

  // Fit to screen
  const handleFit = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const paddingX = 80;
    const paddingY = 80;
    const graphWidth = Math.max(layout.bounds.maxX - layout.bounds.minX, 400);
    const graphHeight = Math.max(layout.bounds.maxY - layout.bounds.minY, 300);

    const scaleX = (clientWidth - paddingX * 2) / graphWidth;
    const scaleY = (clientHeight - paddingY * 2) / graphHeight;
    // Bounded fit scale so graphs never fit below MIN_SCALE
    const fitScale = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_SCALE), 1.15);
    
    setScale(fitScale);
    setOffset({
      x: (clientWidth - graphWidth * fitScale) / 2 - layout.bounds.minX * fitScale,
      y: (clientHeight - graphHeight * fitScale) / 2 - layout.bounds.minY * fitScale
    });
  }, [layout.bounds]);

  // Initial view on mount: 100% zoom, graph centered
  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const graphWidth = Math.max(layout.bounds.maxX - layout.bounds.minX, 400);
    const graphHeight = Math.max(layout.bounds.maxY - layout.bounds.minY, 300);
    setOffset({
      x: (clientWidth - graphWidth) / 2 - layout.bounds.minX,
      y: (clientHeight - graphHeight) / 2 - layout.bounds.minY
    });
  }, []);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom with strictly bounded scale
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(Math.max(scale * zoomFactor, MIN_SCALE), MAX_SCALE);

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom centered around mouse
    setOffset(prev => ({
      x: mouseX - (mouseX - prev.x) * (newScale / scale),
      y: mouseY - (mouseY - prev.y) * (newScale / scale)
    }));
    setScale(newScale);
  };

  // Handle Edge Click
  const handleEdgeClick = (edge: LayoutEdge) => {
    if (edge.linkId) {
      setSelectedLinkId(edge.linkId);
      setSelectedNodeId(null);
    }
  };

  // Drag edge into chat dock
  const handleEdgeDragStart = (edge: LayoutEdge, e: React.DragEvent) => {
    e.stopPropagation();
    const linkObj = {
      type: 'link' as const,
      id: edge.linkId || edge.id,
      label: `[LINK] ${edge.sourceId} → ${edge.targetId}`,
      secondaryLabel: edge.userReason ? `Reason: "${edge.userReason.slice(0, 30)}..."` : 'No user reason',
      metadata: {
        linkId: edge.linkId,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        status: edge.status
      }
    };
    e.dataTransfer.setData('application/json', JSON.stringify(linkObj));
    e.dataTransfer.setData('text/plain', `[LINK] ${edge.sourceId} → ${edge.targetId}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Send Edge to Assistant Dock (click or button)
  const handleSendEdgeToDock = (edge: LayoutEdge, e: React.MouseEvent) => {
    e.stopPropagation();
    if (edge.linkId) {
      setSelectedLinkId(edge.linkId);
      const linkObj = {
        type: 'link' as const,
        id: edge.linkId,
        label: `[LINK] ${edge.sourceId} → ${edge.targetId}`,
        secondaryLabel: edge.userReason ? `Reason: "${edge.userReason.slice(0, 35)}..."` : 'No user reason',
        metadata: { linkId: edge.linkId, status: edge.status }
      };
      setActiveContext(linkObj);
      addAttachedContext(linkObj);
    }
  };

  // Handle Node Click
  const handleNodeClick = (node: LayoutNode) => {
    setSelectedNodeId(node.id);
    setSelectedLinkId(null);
    const nodeObj = {
      type: 'node' as const,
      id: node.id,
      label: `[${node.type.toUpperCase()}] ${node.title.slice(0, 30)}...`,
      secondaryLabel: `Type: ${node.type}`
    };
    setActiveContext(nodeObj);
  };

  // Add node to attached context in chat
  const handleAddNodeToContext = (node: LayoutNode, e: React.MouseEvent) => {
    e.stopPropagation();
    addAttachedContext({
      type: 'node',
      id: node.id,
      label: `[${node.type.toUpperCase()}] ${node.title}`,
      secondaryLabel: node.type === 'evidence' ? node.citation : node.tags?.join(', '),
      metadata: {
        nodeType: node.type,
        nodeId: node.id,
        title: node.title
      }
    });
  };

  return (
    <div
      id="map-canvas-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={() => clearSelection()}
      className="relative flex-1 h-full w-full overflow-hidden bg-[var(--color-paper)] select-none cursor-grab active:cursor-grabbing"
    >
      {/* Background Subtle Dot Matrix Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: 'radial-gradient(var(--color-rule) 1.2px, transparent 1.2px)',
          backgroundSize: `${24 * scale}px ${24 * scale}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`
        }}
      />

      {/* Transform Container holding Nodes and SVG Edges */}
      <div
        id="map-canvas-viewport"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          width: layout.bounds.width,
          height: layout.bounds.height
        }}
        className="absolute left-0 top-0 pointer-events-none"
      >
        {/* Column Guides in canvas space */}
        <div
          style={{ left: 80, top: Math.max(layout.bounds.minY - 32, 16) }}
          className="absolute flex items-center gap-1.5 pointer-events-none"
        >
          <span className="font-mono text-[0.75rem] tracking-widest uppercase font-semibold text-[var(--color-ink-muted)] opacity-70">
            QUESTIONS
          </span>
        </div>
        <div
          style={{ left: 580, top: Math.max(layout.bounds.minY - 32, 16) }}
          className="absolute flex items-center gap-1.5 pointer-events-none"
        >
          <span className="font-mono text-[0.75rem] tracking-widest uppercase font-semibold text-[var(--color-ink-muted)] opacity-70">
            CLAIMS
          </span>
        </div>
        <div
          style={{ left: 1060, top: Math.max(layout.bounds.minY - 32, 16) }}
          className="absolute flex items-center gap-1.5 pointer-events-none"
        >
          <span className="font-mono text-[0.75rem] tracking-widest uppercase font-semibold text-[var(--color-ink-muted)] opacity-70">
            EVIDENCE (FINDINGS)
          </span>
        </div>

        {/* SVG Edge Canvas Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          style={{ width: layout.bounds.width, height: layout.bounds.height }}
        >
          {layout.edges.map(edge => {
            const isEdgeSelected = selectedLinkId === edge.linkId;
            const isEdgeHovered = hoveredLinkId === (edge.linkId || edge.id);
            const isEdgeRelated = hasActiveHighlight && (relatedEdgeIds.has(edge.id) || (edge.linkId ? relatedEdgeIds.has(edge.linkId) : false));
            const isEdgeDimmed = hasActiveHighlight && !isEdgeRelated;

            // Edge stroke styling based on strict spec:
            // - holds: green
            // - weak: amber
            // - missing: dashed red
            let strokeColor = 'var(--color-rule)';
            let strokeWidth = 1.6;
            let strokeDasharray = '';
            let opacity = 0.85;

            if (edge.status === 'holds') {
              strokeColor = 'var(--color-holds)';
              strokeWidth = isEdgeHovered ? 3.5 : isEdgeRelated || isEdgeSelected ? 2.6 : 1.6;
              opacity = isEdgeDimmed ? 0.15 : 0.85;
            } else if (edge.status === 'weak') {
              strokeColor = 'var(--color-weak)';
              strokeWidth = isEdgeHovered ? 3.8 : isEdgeRelated || isEdgeSelected ? 3 : 2;
              opacity = isEdgeDimmed ? 0.15 : 1;
            } else if (edge.status === 'missing') {
              strokeColor = 'var(--color-missing)';
              strokeWidth = isEdgeHovered ? 3.8 : isEdgeRelated || isEdgeSelected ? 3 : 2.2;
              strokeDasharray = '6 4';
              opacity = isEdgeDimmed ? 0.15 : 1;
            } else if (edge.isGhost) {
              strokeColor = 'var(--color-rule)';
              strokeDasharray = '4 4';
              opacity = isEdgeDimmed ? 0.1 : 0.5;
            }

            return (
              <g
                key={edge.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredLinkId(edge.linkId || edge.id)}
                onMouseLeave={() => setHoveredLinkId(null)}
              >
                {/* Transparent 16px hit area for easy clicking and hover */}
                <path
                  d={edge.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  className="pointer-events-auto"
                  onClick={e => {
                    e.stopPropagation();
                    handleEdgeClick(edge);
                  }}
                />

                {/* Visible orthogonal elbow edge */}
                <path
                  d={edge.path}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  opacity={opacity}
                  className="transition-all duration-150 pointer-events-none"
                />
              </g>
            );
          })}
        </svg>

        {/* Edge Midpoint Grip / Status Chips - Floating above the line to never obscure it */}
        {layout.edges.map(edge => {
          if (edge.isGhost) return null;
          const isSelected = selectedLinkId === edge.linkId;
          const isEdgeHovered = hoveredLinkId === (edge.linkId || edge.id);
          const isEdgeRelated = hasActiveHighlight && (relatedEdgeIds.has(edge.id) || (edge.linkId ? relatedEdgeIds.has(edge.linkId) : false));
          const isEdgeDimmed = hasActiveHighlight && !isEdgeRelated;

          let statusDot = 'bg-emerald-600 ring-2 ring-emerald-200 dark:ring-emerald-950';
          let statusText = 'text-emerald-700 dark:text-emerald-400';
          if (edge.status === 'weak') {
            statusDot = 'bg-amber-600 ring-2 ring-amber-200 dark:ring-amber-950';
            statusText = 'text-amber-700 dark:text-amber-400';
          } else if (edge.status === 'missing') {
            statusDot = 'bg-rose-600 ring-2 ring-rose-200 dark:ring-rose-950';
            statusText = 'text-rose-700 dark:text-rose-400';
          }

          return (
            <div
              key={`mid-${edge.id}`}
              draggable={true}
              onDragStart={e => handleEdgeDragStart(edge, e)}
              onMouseEnter={() => setHoveredLinkId(edge.linkId || edge.id)}
              onMouseLeave={() => setHoveredLinkId(null)}
              onMouseDown={e => {
                // Prevent canvas drag from conflicting with edge grip
                e.stopPropagation();
              }}
              style={{
                left: edge.midpoint.x,
                top: edge.midpoint.y
              }}
              onClick={e => {
                e.stopPropagation();
                handleEdgeClick(edge);
              }}
              className={`absolute -translate-x-1/2 -translate-y-[calc(100%+4px)] z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full pointer-events-auto cursor-grab active:cursor-grabbing border transition-all duration-150 select-none shadow-2xs ${
                isSelected
                  ? 'bg-[var(--color-surface)] border-[var(--color-ink)] ring-2 ring-[var(--color-ink)]/15 shadow-sm scale-105 z-20'
                  : isEdgeHovered
                  ? 'bg-[var(--color-surface)] border-indigo-500 ring-2 ring-indigo-500/30 scale-105 z-25'
                  : isEdgeRelated
                  ? 'bg-[var(--color-surface)] border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-400/30 shadow-xs z-15'
                  : 'bg-[var(--color-surface)] border-[var(--color-rule)] hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-xs'
              } ${isEdgeDimmed ? 'opacity-20' : 'opacity-100'}`}
              title={`Link: ${edge.status} (Drag to Assistant Dock or click to inspect)`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
              <span className={`font-mono text-[0.7188rem] uppercase tracking-wider font-semibold ${statusText}`}>
                {edge.status}
              </span>

              {/* Grip icon for Assistant Dock */}
              <button
                onClick={e => handleSendEdgeToDock(edge, e)}
                title="Attach link to Assistant context (+ Context)"
                className="hover:text-indigo-600 dark:hover:text-indigo-400 text-[var(--color-ink-muted)] opacity-60 hover:opacity-100 ml-0.5 transition-opacity"
              >
                <GripVertical className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        {/* Node Cards Layer with Dynamic Relationship Highlighting */}
        {layout.nodes.map(node => {
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const isRelated = hasActiveHighlight && relatedNodeIds.has(node.id);
          const isDimmed = hasActiveHighlight && !relatedNodeIds.has(node.id);

          return (
            <NodeCard
              key={node.id}
              node={node}
              zoomLevel={zoomLevel}
              isSelected={isSelected}
              isHovered={isHovered}
              isRelated={isRelated}
              isDimmed={isDimmed}
              onClick={() => handleNodeClick(node)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onAddToContext={e => handleAddNodeToContext(node, e)}
            />
          );
        })}
      </div>

      {/* Floating Zoom & Semantic Level HUD (Bottom-Left) */}
      <div
        id="map-zoom-controls"
        className="absolute bottom-5 left-5 z-20 flex items-center gap-1.5 bg-[var(--color-surface)] border border-[var(--color-rule)] px-3 py-1.5 rounded-lg shadow-sm select-none"
      >
        <button
          onClick={() => setScale(prev => Math.max(prev * 0.9, MIN_SCALE))}
          disabled={scale <= MIN_SCALE}
          title={`Zoom Out (Min: ${Math.round(MIN_SCALE * 100)}%)`}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="font-mono text-[0.8125rem] font-semibold text-[var(--color-ink)] px-1 min-w-[42px] text-center">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={() => setScale(prev => Math.min(prev * 1.1, MAX_SCALE))}
          disabled={scale >= MAX_SCALE}
          title={`Zoom In (Max: ${Math.round(MAX_SCALE * 100)}%)`}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-[var(--color-rule)] mx-1" />

        <button
          onClick={handleFit}
          title="Fit Whole Graph to Screen"
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Semantic Level Pill Badge */}
        <span
          className="ml-1 font-mono text-[0.75rem] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-[var(--color-rule)] text-[var(--color-ink-muted)]"
          title={`Semantic Level: ${zoomLevel.toUpperCase()}`}
        >
          {zoomLevel}
        </span>
      </div>

      {/* Floating Link Status Filter Bar (Top-Left of Graph Canvas) */}
      <div
        id="map-link-filter"
        className="absolute top-4 left-4 z-20 flex items-center bg-[var(--color-surface)]/95 backdrop-blur-xs border border-[var(--color-rule)] rounded-full p-1 shadow-sm select-none gap-1"
      >
        <span className="text-[0.6875rem] font-mono font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] px-2.5">
          Links
        </span>
        <button
          id="status-filter-all"
          onClick={() => setLinkStatusFilter('all')}
          className={`px-2.5 py-1 rounded-full text-[0.75rem] font-mono transition-all ${
            linkStatusFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          All <span className="opacity-65 text-[0.6875rem]">({linkCounts.all})</span>
        </button>
        <button
          id="status-filter-holds"
          onClick={() => setLinkStatusFilter('holds')}
          className={`px-2.5 py-1 rounded-full text-[0.75rem] font-mono flex items-center gap-1.5 transition-all ${
            linkStatusFilter === 'holds'
              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
              : 'text-[var(--color-ink-muted)] hover:text-emerald-600 dark:hover:text-emerald-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Holds <span className="opacity-70 text-[0.6875rem]">({linkCounts.holds})</span>
        </button>
        <button
          id="status-filter-weak"
          onClick={() => setLinkStatusFilter('weak')}
          className={`px-2.5 py-1 rounded-full text-[0.75rem] font-mono flex items-center gap-1.5 transition-all ${
            linkStatusFilter === 'weak'
              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 font-semibold shadow-xs'
              : 'text-[var(--color-ink-muted)] hover:text-amber-600 dark:hover:text-amber-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Weak <span className="opacity-70 text-[0.6875rem]">({linkCounts.weak})</span>
        </button>
        <button
          id="status-filter-missing"
          onClick={() => setLinkStatusFilter('missing')}
          className={`px-2.5 py-1 rounded-full text-[0.75rem] font-mono flex items-center gap-1.5 transition-all ${
            linkStatusFilter === 'missing'
              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 font-semibold shadow-xs'
              : 'text-[var(--color-ink-muted)] hover:text-rose-600 dark:hover:text-rose-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Missing <span className="opacity-70 text-[0.6875rem]">({linkCounts.missing})</span>
        </button>

        <div className="w-px h-4 bg-[var(--color-rule)] mx-1" />

        <TabHelpTip
          title="Argument Map"
          category="Epistemic Graph"
          summary="Interactive graph of questions, claims, and evidence nodes linked by logical relationships."
          tips={[
            "Click & drag canvas to pan; scroll wheel to zoom.",
            "Click any node or link to inspect properties and audit confidence.",
            "Filter links above to isolate Holds, Weak, or Missing connections.",
            "Drag any node or edge into the Assistant Dock to prompt research discussions."
          ]}
          placement="bottom"
          variant="inline"
        />
      </div>

      {/* Interactive Helper Toast Hint */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface)]/90 backdrop-blur-xs border border-[var(--color-rule)] rounded-full text-[0.8125rem] font-mono text-slate-500 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span>Hover to highlight relation branch • Drag node/link to Assistant Dock</span>
      </div>
    </div>
  );
};
