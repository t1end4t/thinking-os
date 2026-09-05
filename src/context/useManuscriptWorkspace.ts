import { useCallback, useEffect, useState } from 'react';
import { INITIAL_MANUSCRIPT } from '../data/initialManuscript';
import {
  CitationItem,
  ManuscriptDocument,
  ManuscriptMeta,
  ManuscriptSection,
  SynthesisArtifact
} from '../manuscriptTypes';

const MANUSCRIPT_STORAGE_KEY = 'thinking_os_manuscript';

export interface ManuscriptWorkspaceValue {
  manuscript: ManuscriptDocument;
  setManuscript: React.Dispatch<React.SetStateAction<ManuscriptDocument>>;
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
}

type SectionAttachmentField =
  | 'attachedArtifactIds'
  | 'attachedClaimIds'
  | 'attachedCitationKeys';

const loadInitialManuscript = (): ManuscriptDocument => {
  try {
    const saved = localStorage.getItem(MANUSCRIPT_STORAGE_KEY);
    if (!saved) return INITIAL_MANUSCRIPT;

    const parsed = JSON.parse(saved) as Partial<ManuscriptDocument>;
    if (!parsed.meta || !Array.isArray(parsed.sections)) return INITIAL_MANUSCRIPT;

    const sections = parsed.sections.map(rawSection => {
      const section = rawSection as ManuscriptSection & { narrativeGoal?: unknown };
      if (typeof section.narrativeGoal !== 'string' || !section.narrativeGoal.includes('Biện luận:')) {
        return rawSection;
      }

      const defaultSection = INITIAL_MANUSCRIPT.sections.find(item => item.id === section.id);
      return {
        ...section,
        narrativeGoal: defaultSection?.narrativeGoal
          ?? section.narrativeGoal.replace('Biện luận:', 'Argumentation:')
      };
    });

    return { ...parsed, sections } as ManuscriptDocument;
  } catch (error) {
    console.warn('Failed to parse saved manuscript, using initial data:', error);
    return INITIAL_MANUSCRIPT;
  }
};

export const useManuscriptWorkspace = (): ManuscriptWorkspaceValue => {
  const [manuscript, setManuscript] = useState<ManuscriptDocument>(loadInitialManuscript);

  useEffect(() => {
    try {
      localStorage.setItem(MANUSCRIPT_STORAGE_KEY, JSON.stringify(manuscript));
    } catch (error) {
      console.warn('Failed to save manuscript to localStorage:', error);
    }
  }, [manuscript]);

  const updateManuscriptMeta = useCallback((metaUpdates: Partial<ManuscriptMeta>) => {
    setManuscript(previous => ({
      ...previous,
      meta: { ...previous.meta, ...metaUpdates, lastEditedAt: Date.now() }
    }));
  }, []);

  const updateManuscriptSection = useCallback((sectionId: string, updates: Partial<ManuscriptSection>) => {
    setManuscript(previous => ({
      ...previous,
      meta: { ...previous.meta, lastEditedAt: Date.now() },
      sections: previous.sections.map(section => section.id === sectionId ? { ...section, ...updates } : section)
    }));
  }, []);

  const addManuscriptSection = useCallback((afterSectionId?: string) => {
    const newId = `sec-${Date.now()}`;
    setManuscript(previous => {
      const newSection: ManuscriptSection = {
        id: newId,
        sectionNumber: `${previous.sections.length + 1}`,
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
        ? previous.sections.findIndex(section => section.id === afterSectionId)
        : -1;
      const sections = [...previous.sections];
      sections.splice(afterIndex === -1 ? sections.length : afterIndex + 1, 0, newSection);
      return {
        ...previous,
        meta: { ...previous.meta, lastEditedAt: Date.now() },
        sections
      };
    });
    return newId;
  }, []);

  const removeManuscriptSection = useCallback((sectionId: string) => {
    setManuscript(previous => ({
      ...previous,
      meta: { ...previous.meta, lastEditedAt: Date.now() },
      sections: previous.sections.filter(section => section.id !== sectionId)
    }));
  }, []);

  const reorderManuscriptSections = useCallback((sections: ManuscriptSection[]) => {
    setManuscript(previous => ({
      ...previous,
      meta: { ...previous.meta, lastEditedAt: Date.now() },
      sections
    }));
  }, []);

  const updateSectionAttachment = useCallback((
    sectionId: string,
    field: SectionAttachmentField,
    value: string,
    attach: boolean
  ) => {
    setManuscript(previous => ({
      ...previous,
      sections: previous.sections.map(section => {
        if (section.id !== sectionId) return section;
        const values = section[field];
        if (attach && values.includes(value)) return section;
        return {
          ...section,
          [field]: attach ? [...values, value] : values.filter(item => item !== value)
        };
      })
    }));
  }, []);

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
    setManuscript(previous => ({
      ...previous,
      artifacts: [newArtifact, ...previous.artifacts]
    }));
    return newArtifact;
  }, []);

  const removeSynthesisArtifact = useCallback((artifactId: string) => {
    setManuscript(previous => ({
      ...previous,
      artifacts: previous.artifacts.filter(artifact => artifact.id !== artifactId),
      sections: previous.sections.map(section => ({
        ...section,
        attachedArtifactIds: section.attachedArtifactIds.filter(id => id !== artifactId)
      }))
    }));
  }, []);

  const addCitation = useCallback((citation: CitationItem) => {
    setManuscript(previous => ({
      ...previous,
      citations: previous.citations.some(item => item.key === citation.key)
        ? previous.citations.map(item => item.key === citation.key ? citation : item)
        : [...previous.citations, citation]
    }));
  }, []);

  const removeCitation = useCallback((key: string) => {
    setManuscript(previous => ({
      ...previous,
      citations: previous.citations.filter(citation => citation.key !== key),
      sections: previous.sections.map(section => ({
        ...section,
        attachedCitationKeys: section.attachedCitationKeys.filter(citationKey => citationKey !== key)
      }))
    }));
  }, []);

  const resetManuscriptToSample = useCallback(() => {
    setManuscript(INITIAL_MANUSCRIPT);
    localStorage.setItem(MANUSCRIPT_STORAGE_KEY, JSON.stringify(INITIAL_MANUSCRIPT));
  }, []);

  return {
    manuscript,
    setManuscript,
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
    resetManuscriptToSample
  };
};
