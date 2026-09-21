import {
  Question,
  Claim,
  Evidence,
  Link,
  SurveyOpenProblem,
  SurveyCandidateQuestion,
  Paper,
  Experiment,
  Reproduction,
  AlternativeExplanation
} from '../types';
import {
  TaskItem,
  ServiceItem,
  RunItem,
  LLMModelItem,
  AutomationItem,
  GoalItem,
  TargetItem,
  WeeklyReviewItem
} from '../productivityTypes';
import { VaultSnapshot } from '../vaultClient';
import { SAMPLE_LEARNING_UNITS } from './sampleLearningUnits';

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q1',
    title: 'Can attention-sink preservation stabilize streaming autoregressive inference beyond 1M tokens?',
    tags: ['architecture', 'attention', 'memory'],
    createdAt: 1718000000000,
    author: 'user'
  },
  {
    id: 'q2',
    title: 'Does speculative decoding maintain exact output probability distribution under temperature T > 0?',
    tags: ['inference', 'speculative', 'theory'],
    createdAt: 1718100000000,
    author: 'user'
  },
  {
    id: 'q3',
    title: 'How does test-time compute scaling interact with iterative chain-of-thought verification depth?',
    tags: ['reasoning', 'scaling', 'eval'],
    createdAt: 1718200000000,
    author: 'user'
  }
];

export const SAMPLE_CLAIMS: Claim[] = [
  {
    id: 'c1',
    text: 'Retaining the first 4 initial tokens as designated attention sinks prevents softmax numerical collapse in sliding-window attention.',
    rejected: false,
    prediction: 'Streaming perplexity stays below 7.2 over 4,000,000 tokens when initial 4 tokens are anchored as sinks.',
    failureThreshold: 'Perplexity exceeds 12.0 or NaN activations appear before 100,000 tokens.',
    scopeLimits: 'Autoregressive Transformer decoders with dense multi-head attention up to 4M tokens.',
    createdAt: 1718005000000,
    author: 'user'
  },
  {
    id: 'c2',
    text: 'Speculative draft verification with modified rejection sampling strictly matches target model token probability distributions.',
    rejected: false,
    prediction: 'Draft acceptance rate achieves >= 2.4 tokens/step with exact distribution equivalence under temperature T > 0.',
    failureThreshold: 'Total variation distance exceeds 1e-4 or latency speedup drops below 1.2x.',
    scopeLimits: 'Finite vocabulary spaces and standard non-greedy softmax distributions.',
    createdAt: 1718105000000,
    author: 'user'
  },
  {
    id: 'c3',
    text: '4-bit integer KV-cache quantization exhibits non-linear catastrophic perplexity spikes past 64k sequence length.',
    rejected: false,
    prediction: 'Needle retrieval drops > 25% at 64k tokens under uniform RTN INT4 without outlier preservation.',
    failureThreshold: 'Retrieval degradation remains < 5% across all context depths.',
    createdAt: 1718150000000,
    author: 'user'
  },
  {
    id: 'c4',
    text: 'Unsupervised self-verification in test-time reasoning loops leads to circular reinforcement without external ground-truth verifiers.',
    rejected: false,
    prediction: 'Self-verification accuracy plateaus at step 3 and degrades with additional loop iterations.',
    failureThreshold: 'Iterative reflection continues monotonic accuracy gains beyond 5 reasoning hops.',
    createdAt: 1718210000000,
    author: 'user'
  },
  {
    id: 'c5',
    text: 'Linear attention kernels with chunked state-space projections match softmax retrieval at 1M tokens without attention sinks.',
    rejected: true,
    rejectionReason: 'Failure threshold met: state capacity saturation causes catastrophic retrieval drop on Multi-Query associative recall below 40% accuracy.',
    prediction: 'Associative recall stays above 85% at 1M context with fixed state memory.',
    failureThreshold: 'Recall accuracy falls below 50% on needle retrieval sweeps.',
    createdAt: 1718220000000,
    author: 'user'
  }
];

export const SAMPLE_EVIDENCE: Evidence[] = [
  {
    id: 'e1',
    title: 'StreamingLLM 4M Token Perplexity Trace (Xiao et al., Figure 3)',
    origin: 'literature',
    form: 'measurement',
    citation: 'ICLR 2024 Oral, §4.1',
    paperId: 'p1',
    createdAt: 1718010000000,
    author: 'user'
  },
  {
    id: 'e2',
    title: 'Speculative Sampling Theorem Proof (Leviathan et al., Section 2)',
    origin: 'literature',
    form: 'derivation',
    citation: 'ICML 2023, Theorem 1',
    paperId: 'p2',
    validity: 'valid',
    validityReason: 'Proof holds identically for all finite vocabulary spaces and valid probabilities.',
    createdAt: 1718110000000,
    author: 'user'
  },
  {
    id: 'e3',
    title: 'A100 SXM4 80GB Needle-in-Haystack 128k Retrieval Sweep',
    origin: 'experiment',
    form: 'measurement',
    citation: 'Run run-128k-needle-sweep, checkpoint-epoch-4',
    createdAt: 1718160000000,
    author: 'user'
  },
  {
    id: 'e4',
    title: 'MATH-500 Verifier Calibration Log under Budget Scaling',
    origin: 'experiment',
    form: 'measurement',
    citation: 'Run run-quant-eval, seed=42',
    createdAt: 1718220000000,
    author: 'user'
  }
];

export const SAMPLE_LINKS: Link[] = [
  {
    id: 'q1--c1',
    kind: 'question-claim',
    parentId: 'q1',
    childId: 'c1',
    status: 'holds',
    userReason: 'Attention sinks address the structural root cause of softmax attention entropy aggregation at initial token positions.',
    createdAt: 1718020000000,
    author: 'user',
    check: {
      modelId: '[cx/gpt-5.6-sol]',
      tag: 'Verified',
      tagColor: 'emerald',
      note: 'Relation is structurally sound; attention sinks prevent floating point over/underflow in long context streams.',
      items: [
        { label: 'Type', status: 'pass', detail: 'Claim directly provides operational answer to architectural question' },
        { label: 'Scope', status: 'pass', detail: 'Holds across standard transformer decoder architectures' },
        { label: 'Target', status: 'pass', detail: 'Directly validates long-sequence perplexity behavior' }
      ],
      checkedAt: 1718025000000
    }
  },
  {
    id: 'c1--e1',
    kind: 'claim-evidence',
    parentId: 'c1',
    childId: 'e1',
    status: 'holds',
    userReason: 'Figure 3 shows steady perplexity below 7.2 across 4,000,000 continuous tokens, validating lack of degradation.',
    createdAt: 1718030000000,
    author: 'user',
    check: {
      modelId: '[cx/gpt-5.6-sol]',
      tag: 'Empirical match',
      tagColor: 'emerald',
      note: 'Empirical measurement corroborates the claim without contradictory outlier runs.',
      items: [
        { label: 'Type', status: 'pass', detail: 'Empirical perplexity benchmark matches stability claim' },
        { label: 'Scope', status: 'pass', detail: 'Evaluated on Llama-2-7B and Falcon-7B' },
        { label: 'Target', status: 'pass', detail: 'Measured up to 4M token boundary' }
      ],
      checkedAt: 1718035000000
    }
  },
  {
    id: 'q2--c2',
    kind: 'question-claim',
    parentId: 'q2',
    childId: 'c2',
    status: 'holds',
    userReason: 'Modified rejection sampling algorithm provides mathematical guarantee of output distribution invariance.',
    createdAt: 1718120000000,
    author: 'user',
    check: {
      modelId: '[cx/gpt-5.6-sol]',
      tag: 'Theoretically valid',
      tagColor: 'emerald',
      note: 'Rejection sampling scheme is provably exact under target distribution P(x).',
      items: [
        { label: 'Type', status: 'pass', detail: 'Formal theoretical argument addressing distribution fidelity' },
        { label: 'Scope', status: 'pass', detail: 'Generalizes to arbitrary temperature and top-p sampling' },
        { label: 'Target', status: 'pass', detail: 'Exact recovery of target model probability density' }
      ],
      checkedAt: 1718125000000
    }
  },
  {
    id: 'c2--e2',
    kind: 'claim-evidence',
    parentId: 'c2',
    childId: 'e2',
    status: 'holds',
    userReason: 'Theorem 1 proof demonstrates that acceptance probability p = min(1, P(x)/Q(x)) recovers exact target distribution.',
    createdAt: 1718130000000,
    author: 'user',
    check: {
      modelId: '[cx/gpt-5.6-sol]',
      tag: 'Verified derivation',
      tagColor: 'emerald',
      note: 'Mathematical proof checked and verified without identified lemmas flaws.',
      items: [
        { label: 'Type', status: 'pass', detail: 'Formal derivation supporting distribution invariance' },
        { label: 'Scope', status: 'pass', detail: 'Requires non-zero target token probability' },
        { label: 'Target', status: 'pass', detail: 'Target sampling distribution matches target model' }
      ],
      checkedAt: 1718135000000
    }
  },
  {
    id: 'q1--c3',
    kind: 'question-claim',
    parentId: 'q1',
    childId: 'c3',
    status: 'weak',
    userReason: 'Quantization noise accumulates along autoregressive sequence length, limiting effective attention span.',
    createdAt: 1718170000000,
    author: 'user',
    check: {
      modelId: '[cx/gpt-5.6-sol]',
      tag: 'Weak link',
      tagColor: 'amber',
      note: 'Scope is restricted: recent FP4 schemes with per-channel outliers mitigate this degradation partially.',
      items: [
        { label: 'Type', status: 'pass', detail: 'Quantization limits directly bear on KV retention question' },
        { label: 'Scope', status: 'partial', detail: 'Degradation depends heavily on outlier preservation calibration' },
        { label: 'Target', status: 'partial', detail: 'Applies primarily to vanilla RTN quantization' }
      ],
      checkedAt: 1718175000000
    }
  },
  {
    id: 'c3--e3',
    kind: 'claim-evidence',
    parentId: 'c3',
    childId: 'e3',
    status: 'holds',
    userReason: 'Synthetic needle retrieval dropped from 99.4% at 32k tokens to 58.1% at 128k with FP4 cache.',
    createdAt: 1718180000000,
    author: 'user',
    check: {
      modelId: '[cx/gpt-5.6-sol]',
      tag: 'Empirical match',
      tagColor: 'emerald',
      note: 'Laboratory run demonstrates clear failure curve above 64k tokens.',
      items: [
        { label: 'Type', status: 'pass', detail: 'Retrieval accuracy decline directly substantiates claim' },
        { label: 'Scope', status: 'pass', detail: 'A100 hardware run with FlashAttention-2 backend' },
        { label: 'Target', status: 'pass', detail: 'Evaluated at 8k, 16k, 32k, 64k, and 128k increments' }
      ],
      checkedAt: 1718185000000
    }
  },
  {
    id: 'q3--c4',
    kind: 'question-claim',
    parentId: 'q3',
    childId: 'c4',
    status: 'missing',
    userReason: '', // Intentional uncommitted link to demonstrate Gate 5 refusal!
    createdAt: 1718230000000,
    author: 'user'
  }
];

export const SAMPLE_PAPERS: Paper[] = [
  {
    id: 'p1',
    title: 'StreamingLLM: Efficient Streaming Language Models with Attention Sinks',
    authors: 'Guangxuan Xiao, Yuandong Tian, Beidi Chen, Song Han, Mike Lewis',
    year: 2024,
    citation: 'ICLR 2024 Oral Presentation',
    pageCount: 18,
    markdown: `# StreamingLLM: Efficient Streaming Language Models with Attention Sinks

## Abstract
Large Language Models (LLMs) deployed for conversational agents and real-time streaming applications encounter severe memory and computational bottlenecks when processing infinite input streams. While window attention bounds computation, models suffer catastrophic failure once sequence length exceeds cache capacity. We discover the "attention sink" phenomenon: softmax attention excessively concentrates high attention weights on the initial tokens regardless of their semantic content. Based on this insight, we propose StreamingLLM, an efficient framework that preserves initial attention sinks combined with a rolling local cache. StreamingLLM enables multi-million token streaming with zero model fine-tuning and up to 22.2x speedup.

## 1. Introduction & The Attention Sink Phenomenon
Autoregressive Transformers evaluate attention scores across all historical tokens. When deploying LLMs on long streams, keeping all key-value (KV) states incurs linear memory growth $O(T)$ and quadratic computation $O(T^2)$. A straightforward baseline is window attention, which only keeps recent $W$ tokens. However, our experiments demonstrate that standard window attention collapses immediately once the first token is evicted.

We investigate why initial tokens are critical. Even if initial tokens are punctuation or separators, models assign substantial probability mass to them because softmax requires attention weights across all keys to sum to one. Without designated sink tokens, subsequent layers suffer large activation magnitudes, leading to divergent hidden state representations.

## 2. StreamingLLM Architecture
StreamingLLM preserves two components in the KV cache:
1. **Attention Sinks:** The initial $K=4$ tokens of the sequence are permanently preserved in the cache.
2. **Rolling Window:** The most recent $W=1020$ tokens are preserved using a circular FIFO buffer.

When computing relative positional embeddings (such as RoPE or ALiBi), position IDs are assigned based on cache positions rather than original token indices, avoiding out-of-distribution positional encodings.

## 3. Empirical Results & Perplexity Stability
We test StreamingLLM across Llama-2-7B, Llama-2-13B, and MPT-7B models on input streams exceeding 4,000,000 tokens.
- **Perplexity:** StreamingLLM preserves flat perplexity curves identical to dense attention up to 4M tokens.
- **Speedup:** Achieves up to 22.2x decoding throughput compared to full-context re-computation.
- **Memory:** Bounds KV cache size to a fixed 4MB per batch element indefinitely.`,
    sections: [
      {
        id: 'sec-p1-1',
        title: 'Abstract',
        paragraphs: [{ id: 'par-p1-1' }]
      },
      {
        id: 'sec-p1-2',
        title: '1. Introduction & The Attention Sink Phenomenon',
        paragraphs: [{ id: 'par-p1-2', linkedClaimId: 'c1' }, { id: 'par-p1-3' }]
      },
      {
        id: 'sec-p1-3',
        title: '2. StreamingLLM Architecture',
        paragraphs: [{ id: 'par-p1-4' }]
      },
      {
        id: 'sec-p1-4',
        title: '3. Empirical Results & Perplexity Stability',
        paragraphs: [{ id: 'par-p1-5', linkedClaimId: 'c1' }]
      }
    ],
    highlights: [
      {
        id: 'hl-p1-1',
        text: 'softmax attention excessively concentrates high attention weights on the initial tokens regardless of their semantic content.',
        color: 'amber',
        pageNumber: 1,
        createdAt: 1718015000000,
        note: 'Core phenomenon definition: attention sink effect.',
        sectionId: 'sec-p1-1'
      },
      {
        id: 'hl-p1-2',
        text: 'StreamingLLM preserves two components in the KV cache: 1. Attention Sinks (first 4 tokens) 2. Rolling Window (most recent 1020 tokens)',
        color: 'emerald',
        pageNumber: 2,
        createdAt: 1718016000000,
        note: 'Architectural specification linked to Claim c1.',
        sectionId: 'sec-p1-3'
      },
      {
        id: 'hl-p1-3',
        text: 'StreamingLLM preserves flat perplexity curves identical to dense attention up to 4M tokens.',
        color: 'sky',
        pageNumber: 3,
        createdAt: 1718017000000,
        note: 'Evidence measurement e1 source passage.',
        sectionId: 'sec-p1-4'
      }
    ]
  },
  {
    id: 'p2',
    title: 'Fast Inference from Transformers via Speculative Decoding',
    authors: 'Yaniv Leviathan, Matan Kalman, Yossi Matias',
    year: 2023,
    citation: 'ICML 2023 Proceedings',
    pageCount: 14,
    markdown: `# Fast Inference from Transformers via Speculative Decoding

## Abstract
Serving modern generative transformer models is severely memory-bandwidth bound during autoregressive decoding. Each generated token requires reading billions of parameters from high-bandwidth memory (HBM), yielding low compute efficiency per token. We present Speculative Decoding, a framework that accelerates inference without altering the target distribution or requiring model architecture changes. By pairing a small, fast draft model with a large target model, multiple tokens are generated speculatively and verified in parallel by the target model in a single execution step.

## 1. Problem Formulation & Inference Bottlenecks
During generation, computing token $t+1$ requires reading the model weights $W$ from memory. On modern accelerators (such as NVIDIA A100 or H100), the arithmetic intensity for batch size 1 is low (often under 5 FLOPs/byte), while the GPU compute capacity exceeds hundreds of TFLOPs. Consequently, executing $K$ tokens sequentially takes $K \times \tau_{step}$, whereas executing $K$ tokens in parallel takes roughly $1.1 \times \tau_{step}$.

## 2. Speculative Sampling & Exact Distribution Invariance
Let $M_t$ be the target model with distribution $P(x)$ and $M_q$ be the draft model with distribution $Q(x)$. In each round:
1. $M_q$ speculatively samples $\gamma$ tokens: $\tilde{x}_1, \tilde{x}_2, \dots, \tilde{x}_\gamma$.
2. $M_t$ computes logits for all $\gamma+1$ positions concurrently in a single forward pass.
3. Each token $\tilde{x}_i$ is accepted with probability $\alpha_i = \min\left(1, \frac{P(\tilde{x}_i)}{Q(\tilde{x}_i)}\right)$.
4. If a token is rejected, a corrective token is sampled from the residual distribution $\text{norm}(\max(0, P(x) - Q(x)))$.

Theorem 1 proves that the generated output sequence has distribution identical to $P(x)$, ensuring mathematical equivalence without approximation error.

## 3. Empirical Results & Benchmarks
Across English text generation, translation, and code synthesis on CodeX and Chinchilla models:
- Achieves 2x to 3x wall-clock latency speedup.
- Perfect fidelity: BLEU, pass@1, and log-likelihood remain identical to standard autoregressive decoding.`,
    sections: [
      {
        id: 'sec-p2-1',
        title: 'Abstract',
        paragraphs: [{ id: 'par-p2-1' }]
      },
      {
        id: 'sec-p2-2',
        title: '1. Problem Formulation & Inference Bottlenecks',
        paragraphs: [{ id: 'par-p2-2' }]
      },
      {
        id: 'sec-p2-3',
        title: '2. Speculative Sampling & Exact Distribution Invariance',
        paragraphs: [{ id: 'par-p2-3', linkedClaimId: 'c2' }]
      },
      {
        id: 'sec-p2-4',
        title: '3. Empirical Results & Benchmarks',
        paragraphs: [{ id: 'par-p2-4', linkedClaimId: 'c2' }]
      }
    ],
    highlights: [
      {
        id: 'hl-p2-1',
        text: 'Each token is accepted with probability alpha = min(1, P(x)/Q(x)). If rejected, a corrective token is sampled from the residual distribution.',
        color: 'emerald',
        pageNumber: 2,
        createdAt: 1718115000000,
        note: 'Modified rejection sampling proof basis for Claim c2.',
        sectionId: 'sec-p2-3'
      }
    ]
  }
];

export const SAMPLE_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp1',
    claimId: 'c1',
    questionId: 'q1',
    title: 'KV-Cache Pruning Under Needle-in-a-Haystack at 128K Context',
    status: 'done',
    targetMetric: 'Recall@1 > 98.0%',
    baseline: 'Dense FP16 baseline (99.4% recall)',
    prediction: 'Attention-sink preserved cache achieves >98.0% recall with 4x memory savings',
    failureCondition: 'Recall drops below 95% or per-token latency exceeds 40ms',
    scope: 'Llama-3-70B, context length 8k to 128k tokens, temperature 0.0',
    artifacts: [
      {
        id: 'art-1',
        name: 'needle_retrieval_128k_curve.json',
        type: 'plot',
        path: 'experiments/exp1/artifacts/needle_retrieval_128k_curve.json',
        contentHash: 'sha256:7f83b165',
        status: 'present',
        observation: 'Achieved 98.6% recall across all depths (0% to 100%) at 128k tokens. Attention sinks anchor the attention distribution firmly.',
        plotData: {
          xAxisLabel: 'Context Depth Position (%)',
          yAxisLabel: 'Retrieval Recall (%)',
          seriesName: 'Sink-Preserved Cache (128k)',
          baselineName: 'Windowed Eviction Baseline',
          targetThreshold: 'Recall@1 > 98.0%',
          caption: 'Figure 1: Synthetic needle-in-a-haystack retrieval accuracy across insertion depths from 0% to 100% at 128k context length. The sink-preserved cache anchors 98.6% mean recall, whereas windowed eviction collapses to 12.1% once initial tokens are pruned.',
          points: [
            { x: '0%', y: 99.2, baseline: 12.1 },
            { x: '15%', y: 98.9, baseline: 12.5 },
            { x: '25%', y: 98.8, baseline: 13.0 },
            { x: '35%', y: 98.7, baseline: 11.8 },
            { x: '50%', y: 98.4, baseline: 11.5 },
            { x: '65%', y: 98.6, baseline: 12.2 },
            { x: '75%', y: 98.7, baseline: 12.8 },
            { x: '85%', y: 98.3, baseline: 12.4 },
            { x: '100%', y: 98.1, baseline: 11.9 }
          ]
        }
      },
      {
        id: 'art-2',
        name: 'vram_allocation_profile.csv',
        type: 'table',
        path: 'experiments/exp1/artifacts/vram_allocation_profile.csv',
        contentHash: 'sha256:3a91c890',
        status: 'present',
        observation: 'Peak KV memory usage remained flat at 2.4 GB per stream compared to 19.8 GB in full context mode.',
        tableData: {
          headers: ['Stream Batch', 'Context Window', 'Dense KV Memory (GB)', 'Streaming Sink KV (GB)', 'Memory Savings', 'Peak Latency (ms)'],
          rows: [
            ['Stream #1', '8,192 tokens', '1.24 GB', '0.30 GB', '75.8%', '14.2 ms'],
            ['Stream #2', '32,768 tokens', '4.96 GB', '0.30 GB', '93.9%', '14.5 ms'],
            ['Stream #3', '65,536 tokens', '9.92 GB', '0.30 GB', '96.9%', '14.8 ms'],
            ['Stream #4', '131,072 tokens', '19.84 GB', '0.31 GB', '98.4%', '15.1 ms'],
            ['Stream #5 (Infinite)', '1,000,000+ tokens', 'OOM (>150 GB)', '0.31 GB (Flat)', '>99.8%', '15.2 ms']
          ],
          caption: 'Table 1: Peak VRAM allocation & decoding latency profile on NVIDIA A100-SXM4-80GB.',
          notes: 'Sink streaming cache retains 4 initial sinks and 1020 rolling buffer tokens.'
        }
      }
    ]
  },
  {
    id: 'exp2',
    claimId: 'c2',
    questionId: 'q2',
    title: 'Speculative Draft Head Latency Scaling with Batch Size',
    status: 'running',
    targetMetric: 'Speedup > 1.8x at batch=16',
    baseline: 'Standard autoregressive decoding (24 tok/s)',
    prediction: 'Draft model (1B) achieves 56 tok/s at batch=8 and 42 tok/s at batch=16',
    failureCondition: 'Speedup drops below 1.2x due to verification bandwidth saturation',
    scope: 'NVIDIA H100 SXM5, vLLM engine, draft: Llama-3.2-1B, target: Llama-3.3-70B',
    artifacts: [
      {
        id: 'art-4',
        name: 'speculative_speedup_scaling_curve.json',
        type: 'plot',
        path: 'experiments/exp2/artifacts/speculative_speedup_scaling_curve.json',
        contentHash: 'sha256:5b81a2e4',
        status: 'present',
        observation: 'Measured speculative decoding speedup curve across batch concurrency 1 to 32. Verification throughput sustains 1.96x at batch=16, comfortably beating the 1.8x threshold.',
        plotData: {
          xAxisLabel: 'Concurrency Batch Size (Tokens)',
          yAxisLabel: 'Decoding Speedup Factor (x)',
          seriesName: 'Llama-3.2-1B Draft Speculative Speedup',
          baselineName: 'Standard Autoregressive (1.0x)',
          targetThreshold: 'Speedup > 1.8x at batch=16',
          caption: 'Figure 2: Empirical decoding latency speedup multiplier scaling against concurrency batch size (1 to 32) on NVIDIA H100. Verification in parallel amortizes memory bandwidth, achieving 2.14x speedup at batch=1 and sustaining 1.84x at batch=32.',
          points: [
            { x: '1', y: 2.14, baseline: 1.0 },
            { x: '2', y: 2.11, baseline: 1.0 },
            { x: '4', y: 2.08, baseline: 1.0 },
            { x: '8', y: 2.02, baseline: 1.0 },
            { x: '16', y: 1.96, baseline: 1.0 },
            { x: '24', y: 1.89, baseline: 1.0 },
            { x: '32', y: 1.84, baseline: 1.0 }
          ]
        }
      },
      {
        id: 'art-3',
        name: 'batch_concurrency_profiling.log',
        type: 'notes',
        path: 'experiments/exp2/artifacts/batch_concurrency_profiling.log',
        contentHash: 'sha256:e1a49f02',
        status: 'present',
        observation: 'Live run log: currently measuring step 840/1000. Current mean acceptance length is 3.12 tokens/step.',
        notesData: {
          language: 'log',
          content: `[2026-09-04 14:22:01.104] [INFO] [Runner-H100-0] Starting speculative draft verification sweep (gamma=5, temperature=0.7)
[2026-09-04 14:22:02.312] [INFO] Target model initialized: Llama-3.3-70B-Instruct (FP16 weights loaded: 138.4 GB)
[2026-09-04 14:22:03.018] [INFO] Draft model initialized: Llama-3.2-1B-Instruct (FP16 weights loaded: 2.4 GB)
[2026-09-04 14:22:05.412] [STEP 100/1000] draft_accepted=3.21/5.00 | wall_time=18.4ms | speedup=2.14x
[2026-09-04 14:22:15.890] [STEP 300/1000] draft_accepted=3.18/5.00 | wall_time=18.7ms | speedup=2.08x
[2026-09-04 14:22:28.320] [STEP 500/1000] draft_accepted=3.15/5.00 | wall_time=19.1ms | speedup=2.02x
[2026-09-04 14:22:42.115] [STEP 840/1000] draft_accepted=3.12/5.00 | wall_time=19.4ms | speedup=1.98x
[2026-09-04 14:22:48.500] [STEP 920/1000] draft_accepted=3.10/5.00 | wall_time=19.5ms | speedup=1.96x
[2026-09-04 14:22:50.000] [METRIC] Target speedup > 1.8x at batch=16: MET (mean 2.01x across 920 samples)
[2026-09-04 14:22:50.050] [INFO] Rejection sampling verified: zero output divergence against dense autoregressive baseline.`
        }
      }
    ]
  },
  {
    id: 'exp3',
    claimId: 'c3',
    questionId: 'q1',
    title: 'FP4 KV-Cache Outlier Retention Boundary Test on Needle-in-Haystack 256k',
    status: 'planned',
    targetMetric: 'Degradation < 3.0% at 256k tokens',
    baseline: 'FP16 dense baseline (99.1% retrieval)',
    prediction: 'Channel-wise dynamic outlier retention prevents catastrophic cliffs observed in uniform INT4 at 64k',
    failureCondition: 'Retrieval accuracy drops below 85.0% on Multi-Needle tests',
    scope: 'Llama-3-70B, 8x H100 SXM5, synthetic context 64k to 256k tokens',
    artifacts: []
  }
];

export const SAMPLE_REPRODUCTIONS: Reproduction[] = [
  {
    id: 'rep-1',
    claimId: 'c1',
    baselineIdentity: 'StreamingLLM Llama-2-7B Dense Attention Baseline',
    publishedNumber: '7.21 perplexity',
    reproducedNumber: '7.18 perplexity',
    gap: '-0.03 (surpassed published baseline)',
    evaluationScriptHash: 'sha256:4a8b7921c3',
    date: '2026-08-15',
    author: 'user'
  },
  {
    id: 'rep-2',
    claimId: 'c2',
    baselineIdentity: 'Leviathan et al. Speculative Verification Rate',
    publishedNumber: '2.50 tokens/step',
    reproducedNumber: '2.42 tokens/step',
    gap: '-0.08 (within 3.2% confidence band)',
    evaluationScriptHash: 'sha256:d82e140f7b',
    date: '2026-08-20',
    author: 'user'
  },
  {
    id: 'rep-3',
    claimId: 'c3',
    baselineIdentity: 'A100 SXM4 80GB RTN INT4 Quantized Cache Sweep',
    publishedNumber: '58.1% accuracy at 128k',
    reproducedNumber: '57.8% accuracy at 128k',
    gap: '-0.3% (verified catastrophic cliff)',
    evaluationScriptHash: 'sha256:912bfa4e61',
    date: '2026-09-02',
    author: 'user'
  }
];

export const SAMPLE_ALTERNATIVES: AlternativeExplanation[] = [
  {
    id: 'alt-1',
    claimId: 'c1',
    statement: 'Perplexity stability is merely an artifact of evaluation prompt repetitiveness rather than structural attention anchoring.',
    state: 'removed_by_control',
    controlExperimentId: 'exp1',
    createdAt: 1718010000000,
    author: 'user'
  },
  {
    id: 'alt-2',
    claimId: 'c2',
    statement: 'Draft model verification speedups vanish at high batch concurrency due to memory bus saturation on target model forward passes.',
    state: 'open',
    createdAt: 1718115000000,
    author: 'user'
  }
];

export const SAMPLE_OPEN_PROBLEMS: SurveyOpenProblem[] = [
  {
    id: 'op1',
    text: 'Loss of rare entity recall when critical facts reside inside evicted intermediate attention window tokens.',
    citation: 'Xiao et al., §5.2 Open Challenges',
    createdAt: 1718040000000
  },
  {
    id: 'op2',
    text: 'Verification memory bandwidth contention under high concurrency speculative batching.',
    citation: 'Leviathan et al., §4 Discussion',
    createdAt: 1718140000000
  },
  {
    id: 'op3',
    text: 'Circular reasoning rationalization in test-time iterative self-correction loops.',
    citation: 'MATH-500 Error Analysis 2026',
    createdAt: 1718240000000
  },
  {
    id: 'op4',
    text: 'Softmax temperature entropy collapse in infinite autoregressive streams.',
    citation: 'Gu et al. 2023, Mamba Technical Report',
    createdAt: 1715000000000,
    retireReason: {
      kind: 'solved_since',
      reference: 'Xiao et al. 2024 (StreamingLLM attention sink anchors)',
      retiredAt: 1721000000000
    }
  }
];

export const SAMPLE_CANDIDATE_QUESTIONS: SurveyCandidateQuestion[] = [
  {
    id: 'cq1',
    title: 'Can dynamic learnable token eviction policies preserve rare-entity needles better than fixed FIFO?',
    openProblemIds: ['op1'],
    createdAt: 1718045000000,
    promotedQuestionId: 'q1'
  },
  {
    id: 'cq2',
    title: 'What is the optimal draft model parameter scale relative to target size for batch sizes > 32?',
    openProblemIds: ['op2'],
    createdAt: 1718145000000
  },
  {
    id: 'cq3',
    title: 'Can zero-shot self-verification replace external verifiers via recursive reflection prompting?',
    openProblemIds: ['op3'],
    createdAt: 1714000000000,
    retireReason: {
      kind: 'infeasible',
      reference: 'Empirically disproven: circular reasoning loops without external ground-truth verifiers (Huang et al. 2024)',
      retiredAt: 1722000000000
    }
  }
];

export const SAMPLE_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Benchmark DeepSeek-R1 reasoning traces on MATH-500',
    description: 'Run automated evaluation suite comparing chain-of-thought verification depth against baseline Pass@1 accuracy.',
    status: 'backlog',
    priority: 'urgent',
    tag: 'eval',
    goalId: 'goal-1y-1',
    createdAt: '2026-08-28 14:00',
    author: 'user',
    lastEditedBy: 'user'
  },
  {
    id: 'task-2',
    title: 'Implement FP8 tensor core kernel for speculative draft verifier',
    description: 'Optimize Triton kernel to fuse verification step with rejection sampling to eliminate extra HBM round-trips.',
    status: 'backlog',
    priority: 'high',
    tag: 'kernel',
    goalId: 'goal-1y-1',
    createdAt: '2026-09-01 10:30',
    author: 'user',
    lastEditedBy: 'user'
  },
  {
    id: 'task-3',
    title: 'Clip empirical evidence quotes from Leviathan et al. into Map',
    description: 'Extract mathematical proof lemmas of Theorem 1 and bind them to Claim c2 in the research map.',
    status: 'todo',
    priority: 'medium',
    tag: 'literature',
    goalId: 'goal-1y-1',
    createdAt: '2026-09-03 11:00',
    author: 'user',
    lastEditedBy: 'user'
  },
  {
    id: 'task-4',
    title: 'Verify attention sink preservation in custom sliding-window kernel',
    description: 'Inspect CUDA unit tests to ensure first 4 token KV states are never overwritten during circular buffer wrapping.',
    status: 'todo',
    priority: 'high',
    tag: 'cuda',
    goalId: 'goal-1y-1',
    createdAt: '2026-09-04 11:30',
    author: 'user',
    lastEditedBy: 'user'
  },
  {
    id: 'task-5',
    title: 'Profile H100 memory bandwidth during multi-head speculative sampling',
    description: 'Collect Nsight Systems profile on DGX Node 2 to measure memory throughput during draft verification with batch=16.',
    status: 'in-progress',
    priority: 'urgent',
    tag: 'profiling',
    goalId: 'goal-1y-2',
    createdAt: '2026-09-04 15:30',
    author: 'user',
    lastEditedBy: 'user'
  },
  {
    id: 'task-6',
    title: 'Draft experimental protocol for needle-in-haystack 256k test',
    description: 'Specify synthetic needle injection distribution, distraction document templates, and multi-query test matrix.',
    status: 'in-progress',
    priority: 'medium',
    tag: 'protocol',
    goalId: 'goal-1y-1',
    createdAt: '2026-09-04 16:30',
    author: 'user',
    lastEditedBy: 'user'
  },
  {
    id: 'task-7',
    title: 'Audit user reasons across uncommitted argument links',
    description: 'Ensure all links in the argument tree comply with Gate 5 before requesting automated assistant verification.',
    status: 'review',
    priority: 'high',
    tag: 'audit',
    createdAt: '2026-09-04 17:30',
    author: 'user',
    lastEditedBy: 'user'
  },
  {
    id: 'task-8',
    title: 'Formalize structural claim: KV compression holds under uniform query distribution',
    description: 'Write out the mathematical bounds and empirical validity conditions for Claim c3 in the inspector.',
    status: 'review',
    priority: 'medium',
    tag: 'theory',
    goalId: 'goal-1y-1',
    createdAt: '2026-09-04 18:35',
    author: 'user',
    lastEditedBy: 'user'
  },
  {
    id: 'task-9',
    title: 'Initialize Thinking OS vault schema and directory structure',
    description: 'Verify that markdown storage format and JSON sidecars synchronize properly with local filesystem.',
    status: 'done',
    priority: 'low',
    tag: 'infrastructure',
    createdAt: '2026-08-14 09:00',
    author: 'user',
    lastEditedBy: 'user'
  },
  {
    id: 'task-10',
    title: 'Setup vLLM local evaluation harness with latency profiling',
    description: 'Configured local service with metrics telemetry, streaming HTTP endpoint, and benchmark logging.',
    status: 'done',
    priority: 'high',
    tag: 'engine',
    goalId: 'goal-1y-2',
    createdAt: '2026-08-28 16:30',
    author: 'user',
    lastEditedBy: 'user'
  }
];

export const SAMPLE_GOALS: GoalItem[] = [
  {
    id: 'goal-5y-1',
    title: 'Build a durable research program for efficient long-context reasoning',
    description: 'Produce a coherent body of reproducible work, tools, and publications around efficient inference.',
    horizon: 'five-year',
    status: 'active',
    targetDate: '2031-09-07',
    createdAt: '2026-09-07T00:00:00.000Z',
    author: 'user',
    lastEditedBy: 'user'
  },
  {
    id: 'goal-1y-1',
    title: 'Submit one reproducible long-context inference paper',
    description: 'Turn the strongest validated claim into a manuscript backed by reproducible benchmarks and artifacts.',
    horizon: 'one-year',
    status: 'active',
    isCurrentFocus: true,
    targetDate: '2027-03-07',
    parentGoalId: 'goal-5y-1',
    createdAt: '2026-09-07T00:00:00.000Z',
    author: 'user',
    lastEditedBy: 'user'
  },
  {
    id: 'goal-1y-2',
    title: 'Benchmark and optimize speculative decoding kernels on H100',
    description: 'Measure arithmetic intensity and token latency scaling across batch sizes 1 through 32 with custom Triton kernels.',
    horizon: 'one-year',
    status: 'active',
    isCurrentFocus: false,
    targetDate: '2026-12-15',
    parentGoalId: 'goal-5y-1',
    createdAt: '2026-09-07T00:00:00.000Z',
    author: 'user',
    lastEditedBy: 'user'
  }
];

export const SAMPLE_WEEKLY_REVIEWS: WeeklyReviewItem[] = [
  {
    id: 'review-2026-08-31',
    title: 'Week of Aug 31, 2026',
    weekOf: '2026-08-31',
    status: 'complete',
    createdAt: '2026-08-31T09:00:00.000Z',
    completedAt: '2026-08-31T17:45:00.000Z',
    focusGoalIds: ['goal-1y-1', 'goal-1y-2'],
    completedTaskIds: ['task-9', 'task-10'],
    notes: `## 🏆 Completed Deliverables & Wins
- **vLLM Evaluation Harness**: Configured local testbench with telemetry, streaming HTTP endpoint, and benchmark latency logging (task-10).
- **Vault Schema Validation**: Completed initial Thinking OS directory structure and JSON sidecar round-trip tests (task-9).

## 🔬 Evidence & Research Learnings
- Speculative drafting with small 1B models reduces memory bandwidth pressure on 70B targets, confirming distribution invariance properties from Claim c2.
- Preliminary attention sink profiling shows peak KV memory remains constant at ~2.4GB up to 128k sequence length.

## ⚠️ Friction Points & Blockers
- Drift detected: 2 tasks were queued without an explicit 6-12 month goal linkage. Need disciplined triage.
- Triton kernel memory verification on A100 SXM4 requires dedicated allocation slot.

## 🎯 Strategic Commitments for Next Cycle
- Anchor current weekly focus on **"Submit one reproducible long-context inference paper"** (goal-1y-1).
- Complete attention sink circular buffer verification (task-4).
- Formalize theoretical bounds for Claim c3 in the inspector.`
  },
  {
    id: 'review-2026-09-07',
    title: 'Week of Sep 7, 2026',
    weekOf: '2026-09-07',
    status: 'draft',
    createdAt: '2026-09-07T08:30:00.000Z',
    focusGoalIds: ['goal-1y-1'],
    completedTaskIds: ['task-3', 'task-4'],
    notes: `## 🏆 Current Sprint Progress
- Successfully verified attention-sink retention in circular buffer CUDA kernel.
- Linked Theorem 1 empirical evidence lemmas from Leviathan et al. into Argument Map.

## 🔬 Next Milestone
- Finalize H100 memory bandwidth trace under multi-head speculative sampling (task-5).
- Audit all uncommitted argument links against Gate 5 criteria.`
  }
];

export const SAMPLE_SERVICES: ServiceItem[] = [
  {
    id: 'srv-1',
    name: 'vLLM-Inference-Engine',
    port: 8000,
    command: 'vllm serve meta-llama/Llama-3.3-70B-Instruct --tensor-parallel-size 4 --speculative-model Llama-3.2-1B',
    status: 'running',
    uptime: '4h 12m',
    protocol: 'HTTP/v1/chat'
  },
  {
    id: 'srv-2',
    name: 'Eval-Harness-Daemon',
    port: 8080,
    command: 'python -m lm_eval --model vllm --tasks gsm8k,math500 --batch_size 16 --output_path ./eval-runs',
    status: 'running',
    uptime: '1h 45m',
    protocol: 'gRPC'
  },
  {
    id: 'srv-3',
    name: 'Vector-Index-Worker',
    port: null,
    command: 'celery -A workers.vector worker --loglevel=info --concurrency=2',
    status: 'idle',
    uptime: '12m',
    protocol: 'Redis/Queue'
  }
];

export const SAMPLE_RUNS: RunItem[] = [
  {
    id: 'run-1',
    name: 'run-128k-needle-sweep',
    status: 'completed',
    target: 'H100-DGX-Cluster',
    duration: '18m 40s',
    resourceLock: 'GPU 0-3 (H100 SXM5)',
    timestamp: '2026-09-04 18:20',
    exitCode: 0
  },
  {
    id: 'run-2',
    name: 'run-spec-scaling-b16',
    status: 'running',
    target: 'H100-DGX-Cluster',
    duration: '04m 15s',
    resourceLock: 'GPU 4-7 (H100 SXM5)',
    timestamp: '2026-09-04 19:05'
  },
  {
    id: 'run-3',
    name: 'run-quant-fp4-loss',
    status: 'failed',
    target: 'Local-Dev-Workstation',
    duration: '01m 12s',
    resourceLock: 'RTX 4090 (24GB)',
    timestamp: '2026-09-04 17:40',
    exitCode: 137
  }
];

export const SAMPLE_MODELS: LLMModelItem[] = [
  {
    id: 'mod-1',
    name: 'cx/gpt-5.6-sol',
    family: 'OpenAI Reasoning Engine',
    hash: 'sha256:7f3b891',
    quantization: 'FP16',
    parameters: '540B MoE',
    contextLength: '256k tokens',
    vramRequired: 'Shared API Cluster',
    status: 'loaded',
    instructFormat: 'ChatML'
  },
  {
    id: 'mod-2',
    name: 'meta-llama/Llama-3.3-70B-Instruct',
    family: 'Llama 3.3',
    hash: 'sha256:4d12c8a',
    quantization: 'FP8-E4M3',
    parameters: '70.6B',
    contextLength: '128k tokens',
    vramRequired: '76 GB',
    status: 'loaded',
    instructFormat: 'Llama-3'
  },
  {
    id: 'mod-3',
    name: 'meta-llama/Llama-3.2-1B-Draft',
    family: 'Llama 3.2',
    hash: 'sha256:9a33bc2',
    quantization: 'BF16',
    parameters: '1.23B',
    contextLength: '128k tokens',
    vramRequired: '3.2 GB',
    status: 'ready',
    instructFormat: 'Llama-3'
  },
  {
    id: 'mod-4',
    name: 'deepseek-ai/DeepSeek-R1-Distill-32B',
    family: 'DeepSeek R1',
    hash: 'sha256:c02931f',
    quantization: 'AWQ-4bit',
    parameters: '32.8B',
    contextLength: '64k tokens',
    vramRequired: '19.5 GB',
    status: 'ready',
    instructFormat: 'DeepSeek'
  }
];

export const SAMPLE_AUTOMATIONS: AutomationItem[] = [
  {
    id: 'auto-1',
    name: 'nightly-argument-consistency-audit',
    trigger: 'cron(0 3 * * *)',
    action: 'audit-links',
    target: 'cx/gpt-5.6-sol',
    enabled: true,
    lastRun: 'Today at 03:00'
  },
  {
    id: 'auto-2',
    name: 'trigger-eval-sweep-on-new-checkpoint',
    trigger: 'fs_watch(experiments/**/checkpoints/*.pt)',
    action: 'run-eval-suite',
    target: 'Eval-Harness-Daemon',
    enabled: true,
    lastRun: 'Yesterday at 18:45'
  }
];

export const SAMPLE_TARGETS: TargetItem[] = [
  {
    id: 'tgt-1',
    name: 'H100-DGX-Cluster',
    kind: 'machine',
    location: 'data-center-us-east',
    resourceUsage: '8x NVIDIA H100 80GB SXM5 · 1TB RAM (62% util)',
    status: 'connected'
  },
  {
    id: 'tgt-2',
    name: 'Local-Dev-Workstation',
    kind: 'workspace',
    location: 'localhost:50051',
    resourceUsage: '1x NVIDIA RTX 4090 24GB · 64GB DDR5 (18% util)',
    status: 'connected'
  }
];

export const SAMPLE_SNAPSHOT: VaultSnapshot = {
  questions: SAMPLE_QUESTIONS,
  claims: SAMPLE_CLAIMS,
  evidence: SAMPLE_EVIDENCE,
  links: SAMPLE_LINKS,
  openProblems: SAMPLE_OPEN_PROBLEMS,
  candidateQuestions: SAMPLE_CANDIDATE_QUESTIONS,
  papers: SAMPLE_PAPERS,
  experiments: SAMPLE_EXPERIMENTS,
  tasks: SAMPLE_TASKS,
  goals: SAMPLE_GOALS,
  weeklyReviews: SAMPLE_WEEKLY_REVIEWS,
  services: SAMPLE_SERVICES,
  runs: SAMPLE_RUNS,
  models: SAMPLE_MODELS,
  automations: SAMPLE_AUTOMATIONS,
  targets: SAMPLE_TARGETS,
  learningUnits: SAMPLE_LEARNING_UNITS,
  reproductions: SAMPLE_REPRODUCTIONS,
  alternatives: SAMPLE_ALTERNATIVES
};
