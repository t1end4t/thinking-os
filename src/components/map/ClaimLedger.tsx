import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Claim, ClaimLifecycleState } from '../../types';
import { CLAIM_STATE_CONFIGS } from '../../utils/claimState';
import {
  Target,
  FlaskConical,
  Compass,
  ArrowUpDown,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Sparkles
} from 'lucide-react';

interface ClaimLedgerProps {
  onSelectClaim: (claimId: string) => void;
  onInspectClaim: (claimId: string) => void;
}

export const ClaimLedger: React.FC<ClaimLedgerProps> = ({
  onSelectClaim,
  onInspectClaim
}) => {
  const {
    claims,
    evidence,
    links,
    experiments,
    reproductions,
    alternatives,
    claimLifecycleStates,
    activeClaimId,
    setActiveClaimId
  } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'id' | 'state' | 'ownEvidence' | 'litEvidence' | 'alts'>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Compute table rows
  const rows = useMemo(() => {
    return claims.map(claim => {
      const state: ClaimLifecycleState | 'retired' = claim.rejected
        ? 'retired'
        : (claimLifecycleStates[claim.id] || 'candidate');

      // Evidence breakdown
      const linkedEvidenceIds = links
        .filter(l => l.kind === 'claim-evidence' && l.parentId === claim.id)
        .map(l => l.childId);
      const claimEvidence = evidence.filter(e => linkedEvidenceIds.includes(e.id));
      const litCount = claimEvidence.filter(e => e.origin === 'literature').length;
      const ownCount = claimEvidence.filter(e => e.origin === 'experiment' || e.origin === 'own_reasoning').length;

      // Instrument presence: reproduction record or instrument experiment exists
      const hasReproduction = reproductions.some(r => r.claimId === claim.id);
      const hasExperiment = experiments.some(e => e.claimId === claim.id);
      const hasInstrument = hasReproduction || hasExperiment;

      // Alternatives breakdown
      const claimAlts = alternatives.filter(a => a.claimId === claim.id);
      const openAlts = claimAlts.filter(a => a.state === 'open').length;

      // Falsification threshold heuristic (numbers, percentages, or bounds in statement)
      const thresholdMatch = claim.text.match(/(\b\d+(\.\d+)?%|\b\d+(\.\d+)?\s*(ms|sec|kb|mb|gb|tokens|queries|x)\b|(<|>|<=|>=)\s*\d+(\.\d+)?)/i);
      const threshold = thresholdMatch ? thresholdMatch[0] : 'Qualitative threshold';

      return {
        claim,
        state,
        threshold,
        hasInstrument,
        reproductionCount: reproductions.filter(r => r.claimId === claim.id).length,
        litCount,
        ownCount,
        totalEvidence: claimEvidence.length,
        totalAlts: claimAlts.length,
        openAlts,
        isScoped: activeClaimId === claim.id
      };
    });
  }, [claims, evidence, experiments, reproductions, alternatives, claimLifecycleStates, activeClaimId]);

  // Filter rows by search
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = row.claim.text.toLowerCase().includes(q);
        const idMatch = row.claim.id.toLowerCase().includes(q);
        if (!textMatch && !idMatch) return false;
      }
      return true;
    });
  }, [rows, searchQuery]);

  // Sort rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'id') {
        cmp = a.claim.id.localeCompare(b.claim.id, undefined, { numeric: true });
      } else if (sortField === 'state') {
        cmp = a.state.localeCompare(b.state);
      } else if (sortField === 'ownEvidence') {
        cmp = a.ownCount - b.ownCount;
      } else if (sortField === 'litEvidence') {
        cmp = a.litCount - b.litCount;
      } else if (sortField === 'alts') {
        cmp = a.openAlts - b.openAlts;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[var(--color-paper)] overflow-hidden">
      {/* Ledger Controls Bar */}
      <div className="px-5 py-3 border-b border-[var(--color-rule)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[var(--color-ink)]">
            Claims Ledger
          </span>
          <span className="text-[0.6875rem] font-mono text-[var(--color-ink-muted)] pl-2 border-l border-[var(--color-rule)]">
            Showing {sortedRows.length} of {claims.length} claims
          </span>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search claim text or ID..."
            className="w-full pl-8 pr-2.5 py-1 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-lg text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* Ledger Table Canvas */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-rule)] z-10 text-[0.6875rem] font-mono text-[var(--color-ink-muted)] uppercase select-none">
            <tr>
              <th className="py-2.5 px-4 font-bold w-12 text-center">Scope</th>
              <th
                onClick={() => handleSort('id')}
                className="py-2.5 px-4 font-bold cursor-pointer hover:text-[var(--color-ink)]"
              >
                <div className="flex items-center gap-1">
                  <span>Claim / Statement</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('state')}
                className="py-2.5 px-3 font-bold cursor-pointer hover:text-[var(--color-ink)] w-36"
              >
                <div className="flex items-center gap-1">
                  <span>State</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-bold w-32">Threshold</th>
              <th className="py-2.5 px-3 font-bold w-28 text-center">Instrument</th>
              <th
                onClick={() => handleSort('ownEvidence')}
                className="py-2.5 px-3 font-bold cursor-pointer hover:text-[var(--color-ink)] w-28 text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Evidence</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('alts')}
                className="py-2.5 px-3 font-bold cursor-pointer hover:text-[var(--color-ink)] w-28 text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Alternatives</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-bold w-20 text-center">Inspect</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--color-rule)] text-xs font-sans">
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[var(--color-ink-muted)] font-mono">
                  No claims found matching current search.
                </td>
              </tr>
            ) : (
              sortedRows.map(row => {
                const stateCfg = CLAIM_STATE_CONFIGS[row.state as ClaimLifecycleState] || {
                  label: 'Retired',
                  badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
                  dotClass: 'bg-rose-500',
                  description: 'Claim has been retired or falsified.'
                };

                return (
                  <tr
                    key={row.claim.id}
                    className={`hover:bg-[var(--color-surface)]/70 transition-colors ${
                      row.isScoped ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                    }`}
                  >
                    {/* Scope toggle button */}
                    <td className="py-2.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (row.isScoped) {
                            setActiveClaimId(null);
                          } else {
                            setActiveClaimId(row.claim.id);
                          }
                        }}
                        title={row.isScoped ? 'Clear active scope' : 'Set as active claim scope across workspace'}
                        className={`p-1 rounded hover:bg-[var(--color-paper)] transition-colors ${
                          row.isScoped
                            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-[var(--color-ink-muted)] hover:text-indigo-500'
                        }`}
                      >
                        <Target className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Claim ID & Statement */}
                    <td className="py-2.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[0.6875rem] font-bold text-indigo-600 dark:text-indigo-400">
                            {row.claim.id}
                          </span>
                          {row.isScoped && (
                            <span className="font-mono text-[0.5625rem] uppercase px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-700">
                              Active Scope
                            </span>
                          )}
                        </div>
                        <p className="text-[0.8125rem] text-[var(--color-ink)] leading-snug line-clamp-2">
                          {row.claim.text}
                        </p>
                      </div>
                    </td>

                    {/* State Badge */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[0.625rem] font-bold uppercase border ${stateCfg.badgeClass}`}
                        title={stateCfg.description}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${stateCfg.dotClass}`} />
                        {stateCfg.label}
                      </span>
                    </td>

                    {/* Threshold */}
                    <td className="py-2.5 px-3 font-mono text-[0.6875rem] text-[var(--color-ink)]">
                      <span className="bg-[var(--color-surface)] px-1.5 py-0.5 rounded border border-[var(--color-rule)]">
                        {row.threshold}
                      </span>
                    </td>

                    {/* Instrument Present */}
                    <td className="py-2.5 px-3 text-center font-mono text-[0.6875rem]">
                      {row.hasInstrument ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Missing
                        </span>
                      )}
                    </td>

                    {/* Evidence Counts */}
                    <td className="py-2.5 px-3 text-center font-mono text-[0.6875rem]">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          title="Own experiment evidence"
                          className={`px-1 rounded ${
                            row.ownCount > 0 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-[var(--color-ink-muted)]'
                          }`}
                        >
                          Own: {row.ownCount}
                        </span>
                        <span className="text-[var(--color-rule)]">|</span>
                        <span
                          title="Literature evidence"
                          className={`px-1 rounded ${
                            row.litCount > 0 ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-muted)]'
                          }`}
                        >
                          Lit: {row.litCount}
                        </span>
                      </div>
                    </td>

                    {/* Alternatives Count */}
                    <td className="py-2.5 px-3 text-center font-mono text-[0.6875rem]">
                      {row.totalAlts === 0 ? (
                        <span className="text-[var(--color-ink-muted)]">0</span>
                      ) : (
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            row.openAlts > 0
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {row.openAlts} open / {row.totalAlts}
                        </span>
                      )}
                    </td>

                    {/* Inspect button */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onInspectClaim(row.claim.id)}
                        className="p-1 rounded hover:bg-[var(--color-paper)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                        title="Inspect in detail view"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
