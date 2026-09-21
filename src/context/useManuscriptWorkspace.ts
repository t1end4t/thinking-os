import { useCallback, useEffect, useState, useMemo } from 'react';
import { EMPTY_MANUSCRIPT, INITIAL_MANUSCRIPT, INITIAL_MANUSCRIPTS_VAULT } from '../data/initialManuscript';
import {
  CitationItem,
  ManuscriptDocument,
  ManuscriptMeta,
  ManuscriptSection,
  SynthesisArtifact
} from '../manuscriptTypes';

const MANUSCRIPT_STORAGE_KEY = 'thinking_os_manuscript';
const MANUSCRIPT_VAULT_STORAGE_KEY = 'thinking_os_manuscript_vault';
const ACTIVE_MANUSCRIPT_ID_KEY = 'thinking_os_active_manuscript_id';

export interface ManuscriptWorkspaceValue {
  manuscript: ManuscriptDocument;
  manuscripts: ManuscriptDocument[];
  activeManuscriptId: string;
  setManuscript: React.Dispatch<React.SetStateAction<ManuscriptDocument>>;
  switchManuscript: (id: string) => void;
  createManuscript: (meta?: Partial<ManuscriptMeta>) => ManuscriptDocument;
  duplicateManuscript: (id: string) => ManuscriptDocument;
  deleteManuscript: (id: string) => void;
  updateManuscriptMeta: (metaUpdates: Partial<ManuscriptMeta>) => void;
  updateManuscriptSection: (sectionId: string, updates: Partial<ManuscriptSection>) => void;
  addManuscriptSection: (afterSectionId?: string) => string;
  removeManuscriptSection: (sectionId: string) => void;
  reorderManuscriptSections: (sections: ManuscriptSection[]) => void;
  attachArtifactToSection: (sectionId: string, artifactId: string) => void;
  detachArtifactFromSection: (sectionId: string, artifactId: string) => void;
  attachClaimToSection: (sectionId: string, claimId: string) => void;
  detachClaimFromSection: (sectionId: string, claimId: string) => void;
  attachCitationToSection: (sectionId: string, citationKey: string) => void;
  detachCitationFromSection: (sectionId: string, citationKey: string) => void;
  addSynthesisArtifact: (artifact: Omit<SynthesisArtifact, 'id' | 'createdAt'>) => SynthesisArtifact;
  removeSynthesisArtifact: (artifactId: string) => void;
  addCitation: (citation: CitationItem) => void;
  removeCitation: (key: string) => void;
  resetManuscriptToSample: () => void;
  clearManuscript: () => void;
}

type SectionAttachmentField =
  | 'attachedArtifactIds'
  | 'attachedClaimIds'
  | 'attachedCitationKeys';

const loadInitialVault = (): { vault: ManuscriptDocument[]; activeId: string } => {
  try {
    const savedVault = localStorage.getItem(MANUSCRIPT_VAULT_STORAGE_KEY);
    if (savedVault) {
      const parsed = JSON.parse(savedVault);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const activeId = localStorage.getItem(ACTIVE_MANUSCRIPT_ID_KEY) || parsed[0].id || 'doc-1';
        return { vault: parsed, activeId };
      }
    }

    // Legacy fallback to single manuscript
    const savedLegacy = localStorage.getItem(MANUSCRIPT_STORAGE_KEY);
    if (savedLegacy) {
      const parsedLegacy = JSON.parse(savedLegacy) as Partial<ManuscriptDocument>;
      if (parsedLegacy.meta && Array.isArray(parsedLegacy.sections)) {
        const legacyDoc: ManuscriptDocument = {
          ...(parsedLegacy as ManuscriptDocument),
          id: (parsedLegacy as any).id || 'doc-1',
          createdAt: (parsedLegacy as any).createdAt || Date.now()
        };
        return { vault: [legacyDoc], activeId: legacyDoc.id || 'doc-1' };
      }
    }

    return { vault: INITIAL_MANUSCRIPTS_VAULT, activeId: 'doc-1' };
  } catch (error) {
    console.warn('Failed to parse saved manuscript vault, using default vault:', error);
    return { vault: INITIAL_MANUSCRIPTS_VAULT, activeId: 'doc-1' };
  }
};

export const useManuscriptWorkspace = (): ManuscriptWorkspaceValue => {
  const initial = useMemo(loadInitialVault, []);
  const [manuscripts, setManuscripts] = useState<ManuscriptDocument[]>(initial.vault);
  const [activeManuscriptId, setActiveManuscriptId] = useState<string>(initial.activeId);

  // Active manuscript derived from vault, or fallback to first document
  const manuscript = useMemo(() => {
    const found = manuscripts.find(m => m.id === activeManuscriptId);
    return found || manuscripts[0] || EMPTY_MANUSCRIPT;
  }, [manuscripts, activeManuscriptId]);

  // Persist vault to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(MANUSCRIPT_VAULT_STORAGE_KEY, JSON.stringify(manuscripts));
      // Also persist legacy key for backward compatibility
      if (manuscript) {
        localStorage.setItem(MANUSCRIPT_STORAGE_KEY, JSON.stringify(manuscript));
      }
    } catch (error) {
      console.warn('Failed to save manuscript vault to localStorage:', error);
    }
  }, [manuscripts, manuscript]);

  // Persist active id
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_MANUSCRIPT_ID_KEY, activeManuscriptId);
    } catch (error) {
      console.warn('Failed to save active manuscript id:', error);
    }
  }, [activeManuscriptId]);

  // Direct setManuscript for backward compatibility
  const setManuscript: React.Dispatch<React.SetStateAction<ManuscriptDocument>> = useCallback(action => {
    setManuscripts(previous => {
      const currentDoc = previous.find(m => m.id === activeManuscriptId) || previous[0] || EMPTY_MANUSCRIPT;
      const nextDoc = typeof action === 'function' ? action(currentDoc) : action;
      return previous.map(m => m.id === nextDoc.id ? nextDoc : m);
    });
  }, [activeManuscriptId]);

  const switchManuscript = useCallback((id: string) => {
    const exists = manuscripts.some(m => m.id === id);
    if (exists) {
      setActiveManuscriptId(id);
    }
  }, [manuscripts]);

  const createManuscript = useCallback((metaOverrides?: Partial<ManuscriptMeta>) => {
    const newId = `doc-${Date.now()}`;
    const newDoc: ManuscriptDocument = {
      id: newId,
      createdAt: Date.now(),
      meta: {
        title: metaOverrides?.title || 'Untitled Manuscript',
        subtitle: metaOverrides?.subtitle || '',
        authors: metaOverrides?.authors || [{ name: 'Research Author', affiliation: 'Thinking OS Laboratory' }],
        abstract: metaOverrides?.abstract || '',
        keywords: metaOverrides?.keywords || [],
        targetVenue: metaOverrides?.targetVenue || 'ICLR 2025',
        status: metaOverrides?.status || 'drafting',
        lastEditedAt: Date.now()
      },
      sections: [
        {
          id: `sec-${Date.now()}-1`,
          sectionNumber: '1',
          title: 'Introduction & Problem Formulation',
          narrativeGoal: 'Argumentation: Define the scientific problem and state the core research questions.',
          argumentRole: 'hook_motivation',
          content: '',
          attachedClaimIds: [],
          attachedCitationKeys: [],
          attachedArtifactIds: [],
          targetWordCount: 500,
          isExpanded: true
        }
      ],
      artifacts: [],
      citations: []
    };

    setManuscripts(previous => [newDoc, ...previous]);
    setActiveManuscriptId(newId);
    return newDoc;
  }, []);

  const duplicateManuscript = useCallback((id: string) => {
    const target = manuscripts.find(m => m.id === id);
    if (!target) return EMPTY_MANUSCRIPT;

    const clonedId = `doc-${Date.now()}`;
    const clonedDoc: ManuscriptDocument = {
      ...JSON.parse(JSON.stringify(target)),
      id: clonedId,
      createdAt: Date.now(),
      meta: {
        ...target.meta,
        title: `${target.meta.title} (Copy)`,
        lastEditedAt: Date.now()
      }
    };

    setManuscripts(previous => [clonedDoc, ...previous]);
    setActiveManuscriptId(clonedId);
    return clonedDoc;
  }, [manuscripts]);

  const deleteManuscript = useCallback((id: string) => {
    setManuscripts(previous => {
      if (previous.length <= 1) {
        alert('You must have at least one manuscript in your vault.');
        return previous;
      }
      const remaining = previous.filter(m => m.id !== id);
      if (activeManuscriptId === id) {
        setActiveManuscriptId(remaining[0].id || 'doc-1');
      }
      return remaining;
    });
  }, [activeManuscriptId]);

  const updateManuscriptMeta = useCallback((metaUpdates: Partial<ManuscriptMeta>) => {
    setManuscripts(previous =>
      previous.map(doc => {
        if (doc.id !== activeManuscriptId) return doc;
        return {
          ...doc,
          meta: { ...doc.meta, ...metaUpdates, lastEditedAt: Date.now() }
        };
      })
    );
  }, [activeManuscriptId]);

  const updateManuscriptSection = useCallback((sectionId: string, updates: Partial<ManuscriptSection>) => {
    setManuscripts(previous =>
      previous.map(doc => {
        if (doc.id !== activeManuscriptId) return doc;
        return {
          ...doc,
          meta: { ...doc.meta, lastEditedAt: Date.now() },
          sections: doc.sections.map(section =>
            section.id === sectionId ? { ...section, ...updates } : section
          )
        };
      })
    );
  }, [activeManuscriptId]);

  const addManuscriptSection = useCallback((afterSectionId?: string) => {
    const newId = `sec-${Date.now()}`;
    setManuscripts(previous =>
      previous.map(doc => {
        if (doc.id !== activeManuscriptId) return doc;
        const newSection: ManuscriptSection = {
          id: newId,
          sectionNumber: `${doc.sections.length + 1}`,
          title: 'New Section',
          narrativeGoal: 'Argumentation: Establish the dialectic objective and core hypothesis of this section.',
          argumentRole: 'methodology_system',
          content: '',
          attachedClaimIds: [],
          attachedCitationKeys: [],
          attachedArtifactIds: [],
          targetWordCount: 500,
          isExpanded: true
        };
        const afterIndex = afterSectionId
          ? doc.sections.findIndex(section => section.id === afterSectionId)
          : -1;
        const sections = [...doc.sections];
        sections.splice(afterIndex === -1 ? sections.length : afterIndex + 1, 0, newSection);
        return {
          ...doc,
          meta: { ...doc.meta, lastEditedAt: Date.now() },
          sections
        };
      })
    );
    return newId;
  }, [activeManuscriptId]);

  const removeManuscriptSection = useCallback((sectionId: string) => {
    setManuscripts(previous =>
      previous.map(doc => {
        if (doc.id !== activeManuscriptId) return doc;
        return {
          ...doc,
          meta: { ...doc.meta, lastEditedAt: Date.now() },
          sections: doc.sections.filter(section => section.id !== sectionId)
        };
      })
    );
  }, [activeManuscriptId]);

  const reorderManuscriptSections = useCallback((sections: ManuscriptSection[]) => {
    setManuscripts(previous =>
      previous.map(doc => {
        if (doc.id !== activeManuscriptId) return doc;
        return {
          ...doc,
          meta: { ...doc.meta, lastEditedAt: Date.now() },
          sections
        };
      })
    );
  }, [activeManuscriptId]);

  const updateSectionAttachment = useCallback((
    sectionId: string,
    field: SectionAttachmentField,
    value: string,
    attach: boolean
  ) => {
    setManuscripts(previous =>
      previous.map(doc => {
        if (doc.id !== activeManuscriptId) return doc;
        return {
          ...doc,
          sections: doc.sections.map(section => {
            if (section.id !== sectionId) return section;
            const values = section[field];
            if (attach && values.includes(value)) return section;
            return {
              ...section,
              [field]: attach ? [...values, value] : values.filter(item => item !== value)
            };
          })
        };
      })
    );
  }, [activeManuscriptId]);

  const attachArtifactToSection = useCallback((sectionId: string, artifactId: string) => {
    updateSectionAttachment(sectionId, 'attachedArtifactIds', artifactId, true);
  }, [updateSectionAttachment]);

  const detachArtifactFromSection = useCallback((sectionId: string, artifactId: string) => {
    updateSectionAttachment(sectionId, 'attachedArtifactIds', artifactId, false);
  }, [updateSectionAttachment]);

  const attachClaimToSection = useCallback((sectionId: string, claimId: string) => {
    updateSectionAttachment(sectionId, 'attachedClaimIds', claimId, true);
  }, [updateSectionAttachment]);

  const detachClaimFromSection = useCallback((sectionId: string, claimId: string) => {
    updateSectionAttachment(sectionId, 'attachedClaimIds', claimId, false);
  }, [updateSectionAttachment]);

  const attachCitationToSection = useCallback((sectionId: string, citationKey: string) => {
    updateSectionAttachment(sectionId, 'attachedCitationKeys', citationKey, true);
  }, [updateSectionAttachment]);

  const detachCitationFromSection = useCallback((sectionId: string, citationKey: string) => {
    updateSectionAttachment(sectionId, 'attachedCitationKeys', citationKey, false);
  }, [updateSectionAttachment]);

  const addSynthesisArtifact = useCallback((artifact: Omit<SynthesisArtifact, 'id' | 'createdAt'>) => {
    const newArtifact: SynthesisArtifact = {
      ...artifact,
      id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now()
    };
    setManuscripts(previous =>
      previous.map(doc => {
        if (doc.id !== activeManuscriptId) return doc;
        return {
          ...doc,
          artifacts: [newArtifact, ...doc.artifacts]
        };
      })
    );
    return newArtifact;
  }, [activeManuscriptId]);

  const removeSynthesisArtifact = useCallback((artifactId: string) => {
    setManuscripts(previous =>
      previous.map(doc => {
        if (doc.id !== activeManuscriptId) return doc;
        return {
          ...doc,
          artifacts: doc.artifacts.filter(artifact => artifact.id !== artifactId),
          sections: doc.sections.map(section => ({
            ...section,
            attachedArtifactIds: section.attachedArtifactIds.filter(id => id !== artifactId)
          }))
        };
      })
    );
  }, [activeManuscriptId]);

  const addCitation = useCallback((citation: CitationItem) => {
    setManuscripts(previous =>
      previous.map(doc => {
        if (doc.id !== activeManuscriptId) return doc;
        return {
          ...doc,
          citations: doc.citations.some(item => item.key === citation.key)
            ? doc.citations.map(item => item.key === citation.key ? citation : item)
            : [...doc.citations, citation]
        };
      })
    );
  }, [activeManuscriptId]);

  const removeCitation = useCallback((key: string) => {
    setManuscripts(previous =>
      previous.map(doc => {
        if (doc.id !== activeManuscriptId) return doc;
        return {
          ...doc,
          citations: doc.citations.filter(citation => citation.key !== key),
          sections: doc.sections.map(section => ({
            ...section,
            attachedCitationKeys: section.attachedCitationKeys.filter(citationKey => citationKey !== key)
          }))
        };
      })
    );
  }, [activeManuscriptId]);

  const resetManuscriptToSample = useCallback(() => {
    setManuscripts(INITIAL_MANUSCRIPTS_VAULT);
    setActiveManuscriptId('doc-1');
    localStorage.setItem(MANUSCRIPT_VAULT_STORAGE_KEY, JSON.stringify(INITIAL_MANUSCRIPTS_VAULT));
    localStorage.setItem(MANUSCRIPT_STORAGE_KEY, JSON.stringify(INITIAL_MANUSCRIPT));
    localStorage.setItem(ACTIVE_MANUSCRIPT_ID_KEY, 'doc-1');
  }, []);

  const clearManuscript = useCallback(() => {
    setManuscripts(previous =>
      previous.map(doc => {
        if (doc.id !== activeManuscriptId) return doc;
        return {
          ...EMPTY_MANUSCRIPT,
          id: doc.id,
          createdAt: doc.createdAt || Date.now()
        };
      })
    );
  }, [activeManuscriptId]);

  return {
    manuscript,
    manuscripts,
    activeManuscriptId,
    setManuscript,
    switchManuscript,
    createManuscript,
    duplicateManuscript,
    deleteManuscript,
    updateManuscriptMeta,
    updateManuscriptSection,
    addManuscriptSection,
    removeManuscriptSection,
    reorderManuscriptSections,
    attachArtifactToSection,
    detachArtifactFromSection,
    attachClaimToSection,
    detachClaimFromSection,
    attachCitationToSection,
    detachCitationFromSection,
    addSynthesisArtifact,
    removeSynthesisArtifact,
    addCitation,
    removeCitation,
    resetManuscriptToSample,
    clearManuscript
  };
};
