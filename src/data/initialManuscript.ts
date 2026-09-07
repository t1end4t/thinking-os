import { ManuscriptDocument } from '../manuscriptTypes';

export const EMPTY_MANUSCRIPT: ManuscriptDocument = {
  meta: {
    title: 'Untitled Manuscript',
    subtitle: '',
    authors: [],
    abstract: '',
    keywords: [],
    targetVenue: '',
    status: 'drafting',
    lastEditedAt: Date.now()
  },
  citations: [],
  artifacts: [],
  sections: []
};

export const INITIAL_MANUSCRIPT: ManuscriptDocument = {
  meta: {
    title: 'Preserving Initial Sinks: Structural and Empirical KV-Cache Stabilization for Infinite Autoregressive Streaming',
    subtitle: 'A Dialectic Framework from Attention Entropy Mechanics to Bounded-Memory Deployment',
    authors: [
      { name: 'Research Team', affiliation: 'Thinking OS Laboratory', email: 'lab@thinkingos.local' },
      { name: 'Empirical Verification Agent', affiliation: 'cx/gpt-5.6-sol Reasoning Cluster' }
    ],
    abstract: 'Autoregressive Transformer inference over infinite sequence horizons suffers from either linear memory explosion or catastrophic numerical collapse under naive windowed eviction. In this paper, we demonstrate that softmax normalization intrinsically forces substantial probability mass onto initial prompt tokens—a mechanism we denote as "Attention Sinks." By retaining only four permanent sink tokens alongside a localized circular buffer, our architecture bounds key-value memory to 2.4 GB indefinitely while maintaining exact perplexity curves up to 4,000,000 tokens. Furthermore, we conduct a dialectic boundary investigation: while standard floating-point representations remain stable, 4-bit integer quantization experiences catastrophic degradation beyond 64k context due to channel outlier displacement. We provide both formal derivations and empirical validation across standard LLM benchmarks.',
    keywords: ['Autoregressive Inference', 'Attention Sinks', 'KV-Cache Optimization', 'Long Context', 'Quantization Limits'],
    targetVenue: 'ICLR 2025 (Oral Presentation Track)',
    status: 'drafting',
    lastEditedAt: 1718300000000
  },
  citations: [
    {
      key: 'xiao2024streamingllm',
      title: 'StreamingLLM: Efficient Streaming Language Models with Attention Sinks',
      authors: 'Guangxuan Xiao, Yuandong Tian, Beidi Chen, Song Han, Mike Lewis',
      year: 2024,
      venue: 'ICLR 2024 Oral Presentation',
      doi: '10.48550/arXiv.2309.17453',
      abstract: 'Discovers attention sink phenomenon and proposes retaining 4 initial tokens with circular buffer for multi-million token streaming without fine-tuning.',
      bibtex: `@inproceedings{xiao2024streamingllm,
  title={StreamingLLM: Efficient Streaming Language Models with Attention Sinks},
  author={Xiao, Guangxuan and Tian, Yuandong and Chen, Beidi and Han, Song and Lewis, Mike},
  booktitle={International Conference on Learning Representations (ICLR)},
  year={2024}
}`,
      paperId: 'p1',
      claimIds: ['c1'],
      tags: ['attention', 'streaming', 'architecture']
    },
    {
      key: 'leviathan2023fast',
      title: 'Fast Inference from Transformers via Speculative Decoding',
      authors: 'Yaniv Leviathan, Matan Kalman, Yossi Matias',
      year: 2023,
      venue: 'ICML 2023 Proceedings',
      doi: '10.48550/arXiv.2211.17192',
      abstract: 'Proves speculative sampling theorem ensuring exact output probability distribution equivalence between draft model and target model.',
      bibtex: `@inproceedings{leviathan2023fast,
  title={Fast Inference from Transformers via Speculative Decoding},
  author={Leviathan, Yaniv and Kalman, Matan and Matias, Yossi},
  booktitle={International Conference on Machine Learning (ICML)},
  pages={19274--19286},
  year={2023}
}`,
      paperId: 'p2',
      claimIds: ['c2'],
      tags: ['inference', 'speculative', 'theory']
    },
    {
      key: 'vaswani2017attention',
      title: 'Attention Is All You Need',
      authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N Gomez, Łukasz Kaiser, Illia Polosukhin',
      year: 2017,
      venue: 'NeurIPS 2017',
      doi: '10.48550/arXiv.1706.03762',
      abstract: 'Foundational Transformer architecture introducing multi-head scaled dot-product self-attention mechanism.',
      bibtex: `@inproceedings{vaswani2017attention,
  title={Attention is All you Need},
  author={Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob and Jones, Llion and Gomez, Aidan N and Kaiser, {\\L}ukasz and Polosukhin, Illia},
  booktitle={Advances in Neural Information Processing Systems (NeurIPS)},
  volume={30},
  year={2017}
}`,
      tags: ['foundational', 'transformer']
    },
    {
      key: 'dettmers2022llm',
      title: 'LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale',
      authors: 'Tim Dettmers, Mike Lewis, Younes Belkada, Luke Zettlemoyer',
      year: 2022,
      venue: 'NeurIPS 2022',
      doi: '10.48550/arXiv.2208.07339',
      abstract: 'Identifies emergent feature outliers in transformer activations and introduces vector-wise quantization routines.',
      bibtex: `@inproceedings{dettmers2022llm,
  title={LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale},
  author={Dettmers, Tim and Lewis, Mike and Belkada, Younes and Zettlemoyer, Luke},
  booktitle={Advances in Neural Information Processing Systems (NeurIPS)},
  year={2022}
}`,
      claimIds: ['c3'],
      tags: ['quantization', 'outliers', 'precision']
    }
  ],
  artifacts: [
    {
      id: 'art-figure-needle',
      type: 'figure',
      title: 'Figure 1: Needle-in-Haystack Recall Curve (128k Tokens)',
      subtitle: 'Sink-Preserved Cache vs Dense vs Windowed Eviction',
      description: 'Synthetic needle retrieval accuracy across insertion depths from 0% to 100% at 128k context length.',
      badge: 'Figure 1',
      source: 'Run run-128k-needle-sweep',
      claimId: 'c1',
      figure: {
        figureType: 'plot',
        caption: 'Figure 1: Needle retrieval accuracy across context positions. The sink-preserved cache anchors 98.6% recall across all depths, whereas windowed eviction collapses to 12.3% once initial tokens are pruned.',
        sourceExperimentId: 'exp1',
        xAxisLabel: 'Context Depth Position (%)',
        yAxisLabel: 'Retrieval Recall (%)',
        dataPoints: [
          { label: '0%', value: 99.2, baseline: 12.1 },
          { label: '25%', value: 98.8, baseline: 13.0 },
          { label: '50%', value: 98.4, baseline: 11.5 },
          { label: '75%', value: 98.7, baseline: 12.8 },
          { label: '100%', value: 98.1, baseline: 11.9 }
        ]
      },
      tags: ['evaluation', 'retrieval', 'needle'],
      createdAt: 1718160000000
    },
    {
      id: 'art-figure-perplexity',
      type: 'figure',
      title: 'Figure 2: Streaming Perplexity Trace up to 4M Tokens',
      subtitle: 'Continuous Autoregressive Generation on PG-19',
      description: 'Sliding-window perplexity trace demonstrating continuous stability below 7.2 over 4,000,000 tokens.',
      badge: 'Figure 2',
      source: 'ICLR 2024 Oral, §4.1 (Xiao et al.)',
      claimId: 'c1',
      citationKey: 'xiao2024streamingllm',
      figure: {
        figureType: 'plot',
        caption: 'Figure 2: Continuous perplexity trace of Llama-2-7B on a 4,000,000 token stream. Initial 4 tokens retain attention sink role indefinitely.',
        xAxisLabel: 'Stream Token Count (Millions)',
        yAxisLabel: 'Perplexity (PPL)',
        dataPoints: [
          { label: '0.1M', value: 6.8, baseline: 104.2 },
          { label: '0.5M', value: 6.9, baseline: 412.0 },
          { label: '1.0M', value: 7.1, baseline: 980.5 },
          { label: '2.0M', value: 7.0, baseline: 1200.0 },
          { label: '4.0M', value: 7.2, baseline: 1450.0 }
        ]
      },
      tags: ['perplexity', 'stability', 'long-context'],
      createdAt: 1718010000000
    },
    {
      id: 'art-table-vram',
      type: 'table',
      title: 'Table 1: Peak VRAM & Memory Footprint Comparison',
      subtitle: 'Batch Size 1, FP16 Cache on NVIDIA A100 80GB',
      description: 'Quantitative comparison between Full Context Dense KV Cache and Attention-Sink Preserved Streaming Cache.',
      badge: 'Table 1',
      source: 'vram_allocation_profile.csv',
      claimId: 'c1',
      table: {
        headers: ['Sequence Length', 'Dense KV Cache (GB)', 'Sink Streaming Cache (GB)', 'Throughput (tok/s)', 'Speedup'],
        rows: [
          ['8,192 tokens', '1.2 GB', '1.2 GB', '48.2 tok/s', '1.0x'],
          ['32,768 tokens', '4.8 GB', '2.4 GB', '42.1 tok/s', '1.8x'],
          ['64,000 tokens', '9.6 GB', '2.4 GB', '39.8 tok/s', '3.4x'],
          ['128,000 tokens', '19.2 GB', '2.4 GB', '38.6 tok/s', '7.1x'],
          ['1,000,000 tokens', 'OOM (>150 GB)', '2.4 GB (Flat)', '38.2 tok/s', '22.2x']
        ],
        caption: 'Table 1: Memory utilization and decoding speed across sequence lengths. The sink streaming cache fixes memory ceiling at 2.4 GB indefinitely.',
        notes: 'Measurements conducted on single NVIDIA A100-SXM4-80GB GPU running vLLM backend.'
      },
      tags: ['memory', 'vram', 'throughput', 'benchmarks'],
      createdAt: 1718165000000
    },
    {
      id: 'art-fact-sinks',
      type: 'fact',
      title: 'Attention Sink Anchor Lemma',
      subtitle: 'Softmax Probability Mass Distribution',
      factMetric: '4 tokens = 38.4% Attention Mass',
      factContext: 'Softmax requires row sums to equal 1.0. In autoregressive decoders without explicit padding, the first 4 tokens absorb excess non-semantic attention entropy regardless of distance.',
      source: 'Theoretical Derivation & Empirical Attention Matrix Trace',
      claimId: 'c1',
      citationKey: 'xiao2024streamingllm',
      tags: ['theory', 'softmax', 'entropy'],
      createdAt: 1718020000000
    },
    {
      id: 'art-fact-quant-spikes',
      type: 'fact',
      title: 'FP4 Quantization Failure Threshold',
      subtitle: 'Perplexity Spike Boundary',
      factMetric: 'Degradation at >64k context (PPL +18.4)',
      factContext: 'Standard round-to-nearest (RTN) FP4 KV quantization loses channel outlier precision past 64k tokens, causing needle retrieval accuracy to plunge from 99.4% to 58.1%.',
      source: 'Run run-quant-eval',
      claimId: 'c3',
      citationKey: 'dettmers2022llm',
      tags: ['quantization', 'boundary', 'failure-mode'],
      createdAt: 1718180000000
    },
    {
      id: 'art-note-pos-drift',
      type: 'note',
      title: 'Relative RoPE Cache Coordinate Remapping',
      subtitle: 'Implementation Insight',
      noteMarkdown: 'When tokens are discarded from the middle of the window, naive positional IDs cause rotary positional embeddings (RoPE) to step outside the training distribution. Instead, positional coordinates must be mapped to cache buffer positions $0, 1, \dots, W-1$ to preserve local distance geometry.',
      source: 'System Implementation Notebook §3.2',
      tags: ['rope', 'embeddings', 'geometry'],
      createdAt: 1718040000000
    },
    {
      id: 'art-note-speculative-theorem',
      type: 'note',
      title: 'Speculative Distribution Exactness Proof',
      subtitle: 'Modified Rejection Sampling Proof',
      noteMarkdown: 'The proof of Theorem 1 (Leviathan et al.) establishes that accepting draft tokens with probability $\\alpha = \\min(1, P(x)/Q(x))$ and resampling residual probability mass strictly maintains target distribution $P(x)$, ensuring zero quality loss.',
      source: 'ICML 2023 Section 2',
      claimId: 'c2',
      citationKey: 'leviathan2023fast',
      tags: ['proof', 'speculative', 'math'],
      createdAt: 1718110000000
    }
  ],
  sections: [
    {
      id: 'sec-1-intro',
      sectionNumber: '1',
      title: 'Introduction: The Dilemma of Infinite Autoregressive Streaming',
      narrativeGoal: 'Argumentation: Establish the core problem — why sequential FIFO cache eviction collapses model output, and introduce the discovery of Attention Sinks as a paradigm breakthrough.',
      argumentRole: 'hook_motivation',
      content: `Autoregressive Transformers have achieved remarkable success across complex reasoning tasks, yet deploying them for continuous conversational streams or real-time document reasoning remains fundamentally constrained by memory bandwidth.

Under full-context inference, the key-value (KV) cache grows linearly in memory $O(T)$ and quadratically in computation $O(T^2)$ \\cite{vaswani2017attention}. When scaling to hundreds of thousands of tokens, memory requirements quickly exhaust physical accelerator VRAM (as shown in Table 1).

A natural intuition has been to employ a rolling first-in-first-out (FIFO) sliding-window cache, evicting the oldest tokens once a fixed capacity $W$ is reached. However, our empirical analysis and literature findings \\cite{xiao2024streamingllm} reveal a striking failure mode: **the model collapses catastrophically into gibberish the exact moment initial prompt tokens are discarded**, even if those initial tokens contain mere delimiter characters.

In this work, we present a dialectical investigation into this breakdown, demonstrating that initial tokens serve as mathematical "Attention Sinks" that anchor softmax normalization. By preserving just four permanent sink tokens, we can guarantee bounded memory and consistent inference perplexity up to 4M tokens (Figure 2).`,
      attachedClaimIds: ['c1'],
      attachedCitationKeys: ['xiao2024streamingllm', 'vaswani2017attention'],
      attachedArtifactIds: ['art-figure-perplexity', 'art-table-vram', 'art-fact-sinks'],
      targetWordCount: 450,
      isExpanded: true
    },
    {
      id: 'sec-2-theory',
      sectionNumber: '2',
      title: 'Theoretical Foundations: Softmax Entropy Aggregation & Attention Sinks',
      narrativeGoal: 'Argumentation: Provide theoretical grounding and mathematical anatomy — proving softmax forces probability pooling on initial tokens as numerical stability anchors.',
      argumentRole: 'theoretical_derivation',
      content: `To understand why window eviction causes catastrophic divergence, consider the scaled dot-product attention equation:
$$A_{i,j} = \\frac{\\exp\\left( \\frac{q_i k_j^T}{\\sqrt{d_k}} \\right)}{\\sum_{m=1}^i \\exp\\left( \\frac{q_i k_m^T}{\\sqrt{d_k}} \\right)}$$

Because the softmax operator enforces $\\sum_{j=1}^i A_{i,j} = 1.0$, every attention head must distribute 100% of its probability mass across available keys. In autoregressive decoders, the earliest token positions are visible to *all* subsequent queries. Even when a query requires no historical context, the model cannot assign zero attention mass across the board.

Consequently, training dynamics repurpose the initial tokens $0, 1, \\dots, K-1$ as designated "sinks" to absorb superfluous probability mass. As measured in our laboratory traces (Attention Sink Anchor Lemma), up to 38.4% of total attention weight pools into the first four tokens. When standard FIFO pruning evicts these sinks, the denominator in softmax collapses, precipitating severe activation explosions across subsequent feed-forward networks.`,
      attachedClaimIds: ['c1'],
      attachedCitationKeys: ['xiao2024streamingllm'],
      attachedArtifactIds: ['art-fact-sinks', 'art-note-speculative-theorem'],
      targetWordCount: 500,
      isExpanded: true
    },
    {
      id: 'sec-3-system',
      sectionNumber: '3',
      title: 'System Architecture: Dual-Zone Sink-Preserved Rolling Cache',
      narrativeGoal: 'Argumentation: Present the deployable system architecture — partitioning KV cache into permanent sinks and rolling window with dynamic RoPE coordinate remapping.',
      argumentRole: 'methodology_system',
      content: `Our proposed architecture divides the active KV-cache into two non-overlapping memory buffers:
1. **Permanent Attention Sinks ($K=4$ slots):** The very first four tokens of the sequence are permanently pinned in accelerator HBM memory.
2. **Rolling FIFO Window ($W=1020$ slots):** A circular ring buffer maintaining the most recent $W$ tokens.

When new tokens arrive, keys and values are written into the circular window buffer. Total memory footprint remains strictly bounded at:
$$\\text{Memory}_{\\text{KV}} = 2 \\times B \\times L \\times H \\times D \\times (K + W) \\times \\text{sizeof}(\\text{dtype})$$

For an 8-head Llama-2-7B model with FP16 precision, this bounds KV consumption to exactly 2.4 GB per stream indefinitely, bypassing the OOM boundary at 128k context (Table 1).

### Positional Embedding Realignment
A crucial engineering hurdle is rotary positional embedding (RoPE). Standard RoPE computes positional frequencies using absolute stream coordinates. Discarding middle tokens creates an artificial frequency step. We resolve this by dynamically remapping position indices to relative cache offsets within the rolling window (Relative RoPE Cache Coordinate Remapping), preserving continuous local positional geometry.`,
      attachedClaimIds: ['c1'],
      attachedCitationKeys: ['xiao2024streamingllm'],
      attachedArtifactIds: ['art-table-vram', 'art-note-pos-drift'],
      targetWordCount: 550,
      isExpanded: true
    },
    {
      id: 'sec-4-results',
      sectionNumber: '4',
      title: 'Empirical Validation: 4M Token Perplexity & Needle-in-Haystack Retrieval',
      narrativeGoal: 'Argumentation: Deliver empirical proof — demonstrating perplexity stability across 4M tokens and 98.6% Needle-in-a-Haystack retrieval accuracy.',
      argumentRole: 'empirical_evidence',
      content: `We evaluate the sink-preserved architecture on continuous streaming benchmarks using Llama-2-7B, Falcon-7B, and MPT-7B models.

### Long-Horizon Perplexity Stability
Figure 2 displays continuous perplexity curves across an input stream of 4,000,000 tokens sampled from PG-19. While naive windowed eviction triggers runaway perplexity (>1000) within 1,200 tokens, our sink-preserved cache mirrors dense full-context attention with perplexity staying steadily below 7.2 across the entire 4M duration.

### Needle-in-Haystack Synthetic Retrieval
To evaluate whether sink retention compromises precise information recall within the active window, we run the Needle-in-Haystack benchmark at 128k context length (Figure 1). As detailed in Figure 1, the model achieves a 98.6% overall recall across all insertion depths (0% through 100%). In contrast, pruning initial tokens reduces recall to 12.3%, as attention dispersion destroys retrieval cues.

Furthermore, Table 1 demonstrates that throughput reaches 38.6 tokens/second at 128k tokens, representing a 7.1x speedup over dense re-computation.`,
      attachedClaimIds: ['c1'],
      attachedCitationKeys: ['xiao2024streamingllm'],
      attachedArtifactIds: ['art-figure-needle', 'art-figure-perplexity', 'art-table-vram'],
      targetWordCount: 600,
      isExpanded: true
    },
    {
      id: 'sec-5-dialectics',
      sectionNumber: '5',
      title: 'Dialectic Inquiry & Failure Boundary: Quantization Breakdown at Scale',
      narrativeGoal: 'Argumentation: Dialectic counter-inquiry — rigorous failure boundary analysis demonstrating breakdown under aggressive FP4 quantization with practical mitigation.',
      argumentRole: 'counterargument_refute',
      content: `A rigorous scientific paper must probe the boundaries and counterarguments of its claims. While attention sink preservation achieves near-lossless performance under FP16 and INT8 representations, we discover a catastrophic failure mode under aggressive 4-bit integer quantization (Claim c3).

As context length scales past 64k tokens, round-to-nearest (RTN) FP4 quantization exhibits non-linear perplexity spikes (FP4 Quantization Failure Threshold). Needle retrieval accuracy collapses sharply from 99.4% at 32k down to 58.1% at 128k context.

Our diagnostic runs reveal that specific activation channels (dimensions 124 and 391) exhibit heavy outlier magnitudes \\cite{dettmers2022llm}. In FP4 representation, quantizing these outlier vectors forces severe truncation of neighboring features, creating numerical noise that accumulates autoregressively over thousands of steps. Consequently, we formulate the guideline that **attention sinks require FP16 or per-channel outlier-preserving formats (such as SmoothQuant) when operating above 64,000 sequence steps.**`,
      attachedClaimIds: ['c3'],
      attachedCitationKeys: ['dettmers2022llm'],
      attachedArtifactIds: ['art-fact-quant-spikes'],
      targetWordCount: 500,
      isExpanded: true
    },
    {
      id: 'sec-6-conclusion',
      sectionNumber: '6',
      title: 'Conclusion & Methodological Synthesis',
      narrativeGoal: 'Argumentation: Synthesize the scientific journey — establishing the paradigm shift from unbounded computation to bounded, structured memory caches.',
      argumentRole: 'implications_future',
      content: `In this paper, we structured a complete argumentative narrative examining why autoregressive Transformer inference fails on streaming horizons and how the discovery of Attention Sinks provides an elegant structural remedy.

Starting from the empirical observation of softmax entropy aggregation, we demonstrated that preserving four initial sink tokens decouples memory footprint from sequence duration. The resulting system bounds KV-cache allocation to 2.4 GB flat, achieves 22.2x speedup on million-token streams, and preserves 98.6% retrieval recall.

By grounding each claim in rigorous derivations, empirical measurements, and honest dialectical failure boundaries, we provide a unified foundation for deploying next-generation reasoning models over infinite operational horizons.`,
      attachedClaimIds: ['c1', 'c2', 'c3'],
      attachedCitationKeys: ['xiao2024streamingllm', 'leviathan2023fast', 'vaswani2017attention'],
      attachedArtifactIds: ['art-table-vram', 'art-figure-needle'],
      targetWordCount: 400,
      isExpanded: true
    }
  ]
};
