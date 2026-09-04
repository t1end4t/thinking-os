import { Question, Claim, Evidence, Link } from '../../types';

export interface LayoutNode {
  id: string;
  type: 'question' | 'claim' | 'evidence' | 'ghost';
  entityId: string;
  title: string;
  tags?: string[];
  secondary?: string;
  origin?: string;
  form?: string;
  citation?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId?: string;
  isGhost?: boolean;
  ghostType?: 'claim' | 'evidence';
  rejected?: boolean;
}

export interface LayoutEdge {
  id: string;
  linkId?: string;
  sourceId: string;
  targetId: string;
  status: 'holds' | 'weak' | 'missing' | 'unchecked';
  userReason?: string;
  path: string;
  midpoint: { x: number; y: number };
  isGhost?: boolean;
}

export interface ComputedLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
}

const COL_X = {
  question: 80,
  claim: 580,
  evidence: 1060
};

const NODE_WIDTH = {
  question: 340,
  claim: 300,
  evidence: 300,
  ghost: 300
};

const NODE_HEIGHT = {
  question: 130,
  claim: 110,
  evidence: 120,
  ghost: 58
};

export function computeMapLayout(
  questions: Question[],
  claims: Claim[],
  evidence: Evidence[],
  links: Link[],
  activeTag: string,
  linkStatusFilter: string
): ComputedLayout {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  // Filter questions by active tag if needed
  const filteredQuestions = activeTag === 'all'
    ? questions
    : questions.filter(q => q.tags.includes(activeTag));

  let currentGlobalY = 60;
  const Y_GAP_BETWEEN_EVIDENCE = 24;
  const Y_GAP_BETWEEN_QUESTIONS = 70;

  filteredQuestions.forEach(question => {
    // Find claims linked to this question
    const qLinks = links.filter(l => l.kind === 'question-claim' && l.parentId === question.id);
    const qClaims = qLinks
      .map(l => claims.find(c => c.id === l.childId))
      .filter((c): c is Claim => Boolean(c));

    const questionYStart = currentGlobalY;
    const claimLayoutItems: { claim: Claim | null; link?: Link; y: number; isGhost?: boolean }[] = [];

    if (qClaims.length === 0) {
      // Question has NO claims -> Render a Ghost Claim
      const ghostId = `ghost-claim-${question.id}`;
      const ghostY = currentGlobalY;
      nodes.push({
        id: ghostId,
        type: 'ghost',
        entityId: ghostId,
        title: 'No claims attached yet',
        x: COL_X.claim,
        y: ghostY,
        width: NODE_WIDTH.ghost,
        height: NODE_HEIGHT.ghost,
        parentId: question.id,
        isGhost: true,
        ghostType: 'claim'
      });

      // Ghost edge from question to ghost claim
      edges.push(createOrthogonalEdge(
        `edge-${question.id}-${ghostId}`,
        question.id,
        ghostId,
        COL_X.question + NODE_WIDTH.question,
        ghostY + NODE_HEIGHT.question / 2, // will be adjusted
        COL_X.claim,
        ghostY + NODE_HEIGHT.ghost / 2,
        'missing',
        true
      ));

      currentGlobalY += NODE_HEIGHT.ghost + 30;
    } else {
      qClaims.forEach(claim => {
        const cLinks = links.filter(l => l.kind === 'claim-evidence' && l.parentId === claim.id);
        const cEvidence = cLinks
          .map(l => evidence.find(e => e.id === l.childId))
          .filter((e): e is Evidence => Boolean(e));

        const claimYStart = currentGlobalY;
        const evidenceYPositions: number[] = [];

        if (cEvidence.length === 0) {
          // Claim has NO evidence -> Render a Ghost Evidence
          const ghostEvidenceId = `ghost-evidence-${claim.id}`;
          const ghostEvY = currentGlobalY;
          nodes.push({
            id: ghostEvidenceId,
            type: 'ghost',
            entityId: ghostEvidenceId,
            title: 'No evidence linked yet',
            x: COL_X.evidence,
            y: ghostEvY,
            width: NODE_WIDTH.ghost,
            height: NODE_HEIGHT.ghost,
            parentId: claim.id,
            isGhost: true,
            ghostType: 'evidence'
          });
          evidenceYPositions.push(ghostEvY + NODE_HEIGHT.ghost / 2);
          currentGlobalY += NODE_HEIGHT.ghost + Y_GAP_BETWEEN_EVIDENCE;
        } else {
          cEvidence.forEach(ev => {
            const evLink = cLinks.find(l => l.childId === ev.id);
            const evY = currentGlobalY;
            nodes.push({
              id: ev.id,
              type: 'evidence',
              entityId: ev.id,
              title: ev.title,
              origin: ev.origin,
              form: ev.form,
              citation: ev.citation,
              x: COL_X.evidence,
              y: evY,
              width: NODE_WIDTH.evidence,
              height: NODE_HEIGHT.evidence,
              parentId: claim.id
            });
            evidenceYPositions.push(evY + NODE_HEIGHT.evidence / 2);
            currentGlobalY += NODE_HEIGHT.evidence + Y_GAP_BETWEEN_EVIDENCE;
          });
        }

        // Compute Claim Y as center of its evidence/ghost items
        const minEvY = Math.min(...evidenceYPositions);
        const maxEvY = Math.max(...evidenceYPositions);
        const claimY = (minEvY + maxEvY) / 2 - NODE_HEIGHT.claim / 2;

        const qLink = qLinks.find(l => l.childId === claim.id);

        nodes.push({
          id: claim.id,
          type: 'claim',
          entityId: claim.id,
          title: claim.text,
          rejected: claim.rejected,
          x: COL_X.claim,
          y: claimY,
          width: NODE_WIDTH.claim,
          height: NODE_HEIGHT.claim,
          parentId: question.id
        });

        claimLayoutItems.push({
          claim,
          link: qLink,
          y: claimY + NODE_HEIGHT.claim / 2
        });

        // Edges from Claim to its Evidence items
        if (cEvidence.length === 0) {
          const ghostEvidenceId = `ghost-evidence-${claim.id}`;
          edges.push(createOrthogonalEdge(
            `edge-${claim.id}-${ghostEvidenceId}`,
            claim.id,
            ghostEvidenceId,
            COL_X.claim + NODE_WIDTH.claim,
            claimY + NODE_HEIGHT.claim / 2,
            COL_X.evidence,
            minEvY,
            'missing',
            true
          ));
        } else {
          cEvidence.forEach(ev => {
            const evLink = cLinks.find(l => l.childId === ev.id);
            const targetNode = nodes.find(n => n.id === ev.id);
            if (targetNode) {
              edges.push(createOrthogonalEdge(
                evLink ? evLink.id : `edge-${claim.id}-${ev.id}`,
                claim.id,
                ev.id,
                COL_X.claim + NODE_WIDTH.claim,
                claimY + NODE_HEIGHT.claim / 2,
                COL_X.evidence,
                targetNode.y + targetNode.height / 2,
                evLink?.status || 'unchecked',
                false,
                evLink?.userReason,
                evLink?.id
              ));
            }
          });
        }
      });
    }

    // Compute Question Y as center of its claims/ghost items
    let questionY: number;
    if (claimLayoutItems.length > 0) {
      const claimYCenters = claimLayoutItems.map(c => c.y);
      const minCY = Math.min(...claimYCenters);
      const maxCY = Math.max(...claimYCenters);
      questionY = (minCY + maxCY) / 2 - NODE_HEIGHT.question / 2;
    } else {
      questionY = questionYStart;
    }

    nodes.push({
      id: question.id,
      type: 'question',
      entityId: question.id,
      title: question.title,
      tags: question.tags,
      x: COL_X.question,
      y: questionY,
      width: NODE_WIDTH.question,
      height: NODE_HEIGHT.question
    });

    // Add Edges from Question to Claims
    claimLayoutItems.forEach(item => {
      if (item.claim) {
        edges.push(createOrthogonalEdge(
          item.link ? item.link.id : `edge-${question.id}-${item.claim.id}`,
          question.id,
          item.claim.id,
          COL_X.question + NODE_WIDTH.question,
          questionY + NODE_HEIGHT.question / 2,
          COL_X.claim,
          item.y,
          item.link?.status || 'unchecked',
          false,
          item.link?.userReason,
          item.link?.id
        ));
      }
    });

    currentGlobalY += Y_GAP_BETWEEN_QUESTIONS;
  });

  // Filter edges if status filter applied
  const finalEdges = linkStatusFilter === 'all'
    ? edges
    : edges.filter(e => e.status === linkStatusFilter);

  // Compute bounding box
  const minX = nodes.length > 0 ? Math.min(...nodes.map(n => n.x)) : 80;
  const minY = nodes.length > 0 ? Math.min(...nodes.map(n => n.y)) : 40;
  const allX = nodes.map(n => n.x + n.width);
  const allY = nodes.map(n => n.y + n.height);
  const maxX = Math.max(1480, ...allX) + 120;
  const maxY = Math.max(720, ...allY) + 100;

  return {
    nodes,
    edges: finalEdges,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX,
      height: maxY
    }
  };
}

/**
 * Creates orthogonal elbow path: [M x1 y1] -> [L midX y1] -> [L midX y2] -> [L x2 y2]
 * with rounded corner (radius 14px max).
 * The label/midpoint is placed on the incoming horizontal branch to the child (x2, y2)
 * so that the vertical trunk remains completely clear and sibling labels do not overlap.
 */
function createOrthogonalEdge(
  id: string,
  sourceId: string,
  targetId: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  status: 'holds' | 'weak' | 'missing' | 'unchecked',
  isGhost = false,
  userReason?: string,
  linkId?: string
): LayoutEdge {
  const midX = x1 + (x2 - x1) * 0.45;
  const dy = y2 > y1 ? 1 : -1;
  const deltaY = Math.abs(y1 - y2);
  const maxR = 14;
  const r = Math.max(2, Math.min(maxR, deltaY / 2, (x2 - x1) / 6));

  let path = '';
  let labelX: number;
  let labelY: number;

  if (deltaY < 3) {
    // Direct horizontal line
    path = `M ${x1} ${y1} L ${x2} ${y2}`;
    labelX = (x1 + x2) / 2;
    labelY = y1;
  } else {
    // Soft curved orthogonal elbow
    path = `M ${x1} ${y1} ` +
      `L ${midX - r} ${y1} ` +
      `Q ${midX} ${y1}, ${midX} ${y1 + r * dy} ` +
      `L ${midX} ${y2 - r * dy} ` +
      `Q ${midX} ${y2}, ${midX + r} ${y2} ` +
      `L ${x2} ${y2}`;

    // Place label on the horizontal branch entering the child node
    // Leaving the vertical trunk at midX completely visible without clutter
    labelX = midX + (x2 - midX) * 0.5;
    labelY = y2;
  }

  return {
    id,
    linkId: linkId || id,
    sourceId,
    targetId,
    status,
    userReason,
    path,
    midpoint: { x: labelX, y: labelY },
    isGhost
  };
}
