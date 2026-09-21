import { useState } from 'react';
import { ArrowUpDown, Search, Target } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CLAIM_STATE_CONFIGS } from '../../utils/claimState';

interface ClaimLedgerProps {
  onSelectClaim: (claimId: string) => void;
  onInspectClaim: (claimId: string) => void;
}

type SortField = 'id' | 'state' | 'evidence';

export function ClaimLedger({ onSelectClaim, onInspectClaim }: ClaimLedgerProps) {
  const { claims, evidence, links, claimLifecycleStates, activeClaimId, setActiveClaimId } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [descending, setDescending] = useState(false);
  const query = searchQuery.trim().toLowerCase();
  const rows = claims.filter(claim => claim.text.toLowerCase().includes(query) || claim.id.toLowerCase().includes(query)).map(claim => {
    const linkedIds = new Set(links.filter(link => link.kind === 'claim-evidence' && link.parentId === claim.id).map(link => link.childId));
    return {
      claim,
      state: claim.rejected ? 'retired' as const : claimLifecycleStates[claim.id] || 'candidate',
      evidence: evidence.filter(item => linkedIds.has(item.id))
    };
  }).sort((first, second) => {
    const order = sortField === 'evidence' ? first.evidence.length - second.evidence.length
      : sortField === 'state' ? first.state.localeCompare(second.state)
        : first.claim.id.localeCompare(second.claim.id, undefined, { numeric: true });
    return descending ? -order : order;
  });
  const sort = (field: SortField) => {
    setDescending(field === sortField ? !descending : false);
    setSortField(field);
  };
  const headers: { field: SortField; label: string }[] = [
    { field: 'id', label: 'Claim' },
    { field: 'state', label: 'State' },
    { field: 'evidence', label: 'Linked evidence' }
  ];

  return (
    <section aria-label="Claims" className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-paper)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule)] bg-[var(--color-surface)] px-5 py-3">
        <div>
          <h2 className="text-xs font-semibold">Claims · {rows.length} of {claims.length}</h2>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Review coverage and declared conditions. Counts do not measure evidence quality.</p>
        </div>
        <label className="flex max-w-full items-center gap-2 text-xs">
          <Search size={14} aria-hidden="true" />
          <input aria-label="Search claims" placeholder="Search claim text or ID…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="argument-input min-w-0" />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto" tabIndex={0} role="region" aria-label="Claims table">
        <table className="w-full min-w-[680px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[var(--color-surface)] text-[var(--color-ink-muted)]">
            <tr>
              <th scope="col" className="w-12 px-3 py-3">Scope</th>
              {headers.map(header => (
                <th key={header.field} scope="col" className="px-3 py-3" aria-sort={sortField === header.field ? descending ? 'descending' : 'ascending' : 'none'}>
                  <button type="button" className="flex items-center gap-1" onClick={() => sort(header.field)}>{header.label}<ArrowUpDown size={12} aria-hidden="true" /></button>
                </th>
              ))}
              <th scope="col" className="px-3 py-3">Declared falsification condition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-rule)]">
            {!rows.length && <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--color-ink-muted)]">No claims found.</td></tr>}
            {rows.map(row => {
              const config = CLAIM_STATE_CONFIGS[row.state];
              const scoped = activeClaimId === row.claim.id;
              return (
                <tr key={row.claim.id} className={scoped ? 'bg-[var(--accent-indigo-soft)]' : ''}>
                  <td className="px-3 py-3">
                    <button type="button" className="argument-micro-btn" title={scoped ? 'Clear active scope' : `Set scope to ${row.claim.id}`} aria-label={`Set scope to ${row.claim.id}`} aria-pressed={scoped} onClick={() => { setActiveClaimId(scoped ? null : row.claim.id); onSelectClaim(row.claim.id); }}><Target size={14} /></button>
                  </td>
                  <td className="max-w-sm px-3 py-3">
                    <button type="button" className="text-left hover:underline" onClick={() => onInspectClaim(row.claim.id)}>
                      <span className="block font-mono text-[var(--color-ink-muted)]">{row.claim.id}</span>
                      <span className="mt-1 block whitespace-pre-wrap">{row.claim.text}</span>
                    </button>
                  </td>
                  <td className="px-3 py-3"><span className={`inline-flex rounded border px-2 py-1 font-mono ${config.badgeClass}`}>{config.label}</span></td>
                  <td className="px-3 py-3 font-mono">
                    <span className="block">Literature: {row.evidence.filter(item => item.origin === 'literature').length}</span>
                    <span className="block">Experiment: {row.evidence.filter(item => item.origin === 'experiment').length}</span>
                    <span className="block">Reasoning: {row.evidence.filter(item => item.origin === 'own_reasoning').length}</span>
                  </td>
                  <td className="max-w-xs whitespace-pre-wrap px-3 py-3">{row.claim.failureThreshold?.trim() || <span className="text-[var(--color-ink-muted)]">Not declared</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
