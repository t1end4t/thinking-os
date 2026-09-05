import { homedir } from 'node:os';
import path from 'node:path';
import { writeVault } from './vault.mjs';

const targetDir = path.join(homedir(), 'second-brain');

const sampleData = {
  questions: [
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
  ],
  claims: [
    {
      id: 'c1',
      text: 'Retaining the first 4 initial tokens as designated attention sinks prevents softmax numerical collapse in sliding-window attention.',
      rejected: false,
      createdAt: 1718005000000,
      author: 'user'
    },
    {
      id: 'c2',
      text: 'Speculative draft verification with modified rejection sampling strictly matches target model token probability distributions.',
      rejected: false,
      createdAt: 1718105000000,
      author: 'user'
    },
    {
      id: 'c3',
      text: '4-bit integer KV-cache quantization exhibits non-linear catastrophic perplexity spikes past 64k sequence length.',
      rejected: false,
      createdAt: 1718150000000,
      author: 'user'
    },
    {
      id: 'c4',
      text: 'Unsupervised self-verification in test-time reasoning loops leads to circular reinforcement without external ground-truth verifiers.',
      rejected: false,
      createdAt: 1718210000000,
      author: 'user'
    }
  ],
  evidence: [
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
  ],
  links: [
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
      userReason: '',
      createdAt: 1718230000000,
      author: 'user'
    }
  ],
  papers: [
    {
      id: 'p1',
      title: 'StreamingLLM: Efficient Streaming Language Models with Attention Sinks',
      authors: 'Guangxuan Xiao, Yuandong Tian, Beidi Chen, Song Han, Mike Lewis',
      year: 2024,
      citation: 'ICLR 2024 Oral Presentation',
      pageCount: 18,
      markdown: `# StreamingLLM: Efficient Streaming Language Models with Attention Sinks\n\n## Abstract\nLarge Language Models (LLMs) deployed for conversational agents and real-time streaming applications encounter severe memory and computational bottlenecks when processing infinite input streams. While window attention bounds computation, models suffer catastrophic failure once sequence length exceeds cache capacity. We discover the "attention sink" phenomenon: softmax attention excessively concentrates high attention weights on the initial tokens regardless of their semantic content. Based on this insight, we propose StreamingLLM, an efficient framework that preserves initial attention sinks combined with a rolling local cache. StreamingLLM enables multi-million token streaming with zero model fine-tuning and up to 22.2x speedup.\n\n## 1. Introduction & The Attention Sink Phenomenon\nAutoregressive Transformers evaluate attention scores across all historical tokens. When deploying LLMs on long streams, keeping all key-value (KV) states incurs linear memory growth O(T) and quadratic computation O(T^2). A straightforward baseline is window attention, which only keeps recent W tokens. However, our experiments demonstrate that standard window attention collapses immediately once the first token is evicted.\n\nWe investigate why initial tokens are critical. Even if initial tokens are punctuation or separators, models assign substantial probability mass to them because softmax requires attention weights across all keys to sum to one. Without designated sink tokens, subsequent layers suffer large activation magnitudes, leading to divergent hidden state representations.\n\n## 2. StreamingLLM Architecture\nStreamingLLM preserves two components in the KV cache:\n1. **Attention Sinks:** The initial K=4 tokens of the sequence are permanently preserved in the cache.\n2. **Rolling Window:** The most recent W=1020 tokens are preserved using a circular FIFO buffer.\n\n## 3. Empirical Results & Perplexity Stability\nWe test StreamingLLM across Llama-2-7B, Llama-2-13B, and MPT-7B models on input streams exceeding 4,000,000 tokens.\n- **Perplexity:** StreamingLLM preserves flat perplexity curves identical to dense attention up to 4M tokens.\n- **Speedup:** Achieves up to 22.2x decoding throughput compared to full-context re-computation.\n- **Memory:** Bounds KV cache size to a fixed 4MB per batch element indefinitely.`,
      sections: [
        { id: 'sec-p1-1', title: 'Abstract', paragraphs: [{ id: 'par-p1-1' }] },
        { id: 'sec-p1-2', title: '1. Introduction', paragraphs: [{ id: 'par-p1-2', linkedClaimId: 'c1' }] },
        { id: 'sec-p1-3', title: '2. StreamingLLM Architecture', paragraphs: [{ id: 'par-p1-3' }] },
        { id: 'sec-p1-4', title: '3. Empirical Results', paragraphs: [{ id: 'par-p1-4', linkedClaimId: 'c1' }] }
      ]
    },
    {
      id: 'p2',
      title: 'Fast Inference from Transformers via Speculative Decoding',
      authors: 'Yaniv Leviathan, Matan Kalman, Yossi Matias',
      year: 2023,
      citation: 'ICML 2023 Proceedings',
      pageCount: 14,
      markdown: `# Fast Inference from Transformers via Speculative Decoding\n\n## Abstract\nServing modern generative transformer models is severely memory-bandwidth bound during autoregressive decoding. Each generated token requires reading billions of parameters from high-bandwidth memory (HBM), yielding low compute efficiency per token. We present Speculative Decoding, a framework that accelerates inference without altering the target distribution or requiring model architecture changes. By pairing a small, fast draft model with a large target model, multiple tokens are generated speculatively and verified in parallel by the target model in a single execution step.\n\n## 1. Problem Formulation & Inference Bottlenecks\nDuring generation, computing token t+1 requires reading the model weights W from memory. On modern accelerators (such as NVIDIA A100 or H100), the arithmetic intensity for batch size 1 is low (often under 5 FLOPs/byte), while the GPU compute capacity exceeds hundreds of TFLOPs.\n\n## 2. Speculative Sampling & Exact Distribution Invariance\nLet Mt be the target model with distribution P(x) and Mq be the draft model with distribution Q(x). In each round:\n1. Mq speculatively samples gamma tokens: x1, x2, ..., x_gamma.\n2. Mt computes logits for all gamma+1 positions concurrently in a single forward pass.\n3. Each token is accepted with probability min(1, P(x)/Q(x)).\n4. If a token is rejected, a corrective token is sampled from the residual distribution.\n\nTheorem 1 proves that the generated output sequence has distribution identical to P(x).\n\n## 3. Empirical Results & Benchmarks\nAcross English text generation, translation, and code synthesis on CodeX and Chinchilla models: achieves 2x to 3x wall-clock latency speedup with identical output fidelity.`,
      sections: [
        { id: 'sec-p2-1', title: 'Abstract', paragraphs: [{ id: 'par-p2-1' }] },
        { id: 'sec-p2-2', title: '1. Problem Formulation', paragraphs: [{ id: 'par-p2-2' }] },
        { id: 'sec-p2-3', title: '2. Speculative Sampling', paragraphs: [{ id: 'par-p2-3', linkedClaimId: 'c2' }] },
        { id: 'sec-p2-4', title: '3. Empirical Results', paragraphs: [{ id: 'par-p2-4', linkedClaimId: 'c2' }] }
      ]
    }
  ],
  experiments: [
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
          observation: 'Achieved 98.6% recall across all depths at 128k tokens. Attention sinks anchor the distribution firmly.'
        },
        {
          id: 'art-2',
          name: 'vram_allocation_profile.csv',
          type: 'table',
          path: 'experiments/exp1/artifacts/vram_allocation_profile.csv',
          contentHash: 'sha256:3a91c890',
          status: 'present',
          observation: 'Peak KV memory usage remained flat at 2.4 GB per stream compared to 19.8 GB in full context mode.'
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
          id: 'art-3',
          name: 'batch_concurrency_profiling.log',
          type: 'notes',
          path: 'experiments/exp2/artifacts/batch_concurrency_profiling.log',
          contentHash: 'sha256:e1a49f02',
          status: 'present',
          observation: 'Live run log: currently measuring step 840/1000. Mean acceptance length is 3.12 tokens/step.'
        }
      ]
    }
  ],
  openProblems: [
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
    }
  ],
  candidateQuestions: [
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
    }
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Benchmark DeepSeek-R1 reasoning traces on MATH-500',
      description: 'Run automated evaluation suite comparing chain-of-thought verification depth against baseline Pass@1 accuracy.',
      status: 'backlog',
      priority: 'urgent',
      tag: 'eval',
      createdAt: '2026-09-04 14:00',
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
      createdAt: '2026-09-04 14:15',
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
      createdAt: '2026-09-04 15:00',
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
      createdAt: '2026-09-04 15:30',
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
      createdAt: '2026-09-04 16:00',
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
      createdAt: '2026-09-04 17:00',
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
      createdAt: '2026-09-04 17:30',
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
      createdAt: '2026-09-04 18:00',
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
      createdAt: '2026-09-04 18:30',
      author: 'user',
      lastEditedBy: 'user'
    }
  ],
  services: [
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
      command: 'python -m lm_eval --model vllm --tasks gsm8k,math500 --batch_size 16',
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
  ],
  runs: [
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
  ],
  models: [
    {
      id: 'mod-1',
      name: 'cx/gpt-5.6-sol',
      provider: 'OpenAI Reasoning Engine',
      contextWindow: '256k tokens',
      role: 'Argument Structure & Link Verifier',
      status: 'active'
    },
    {
      id: 'mod-2',
      name: 'meta-llama/Llama-3.3-70B-Instruct',
      provider: 'Local vLLM Cluster',
      contextWindow: '128k tokens',
      role: 'Target Model for Inference Benchmarks',
      status: 'active'
    },
    {
      id: 'mod-3',
      name: 'meta-llama/Llama-3.2-1B-Draft',
      provider: 'Local vLLM Cluster',
      contextWindow: '128k tokens',
      role: 'Speculative Drafting Head',
      status: 'active'
    },
    {
      id: 'mod-4',
      name: 'deepseek-ai/DeepSeek-R1-Distill-32B',
      provider: 'Local HuggingFace',
      contextWindow: '64k tokens',
      role: 'Mathematical Proof Verifier',
      status: 'available'
    }
  ],
  automations: [
    {
      id: 'auto-1',
      name: 'nightly-argument-consistency-audit',
      trigger: 'cron(0 3 * * *)',
      target: 'cx/gpt-5.6-sol',
      status: 'enabled'
    },
    {
      id: 'auto-2',
      name: 'trigger-eval-sweep-on-new-checkpoint',
      trigger: 'fs_watch(experiments/**/checkpoints/*.pt)',
      target: 'Eval-Harness-Daemon',
      status: 'enabled'
    }
  ],
  targets: [
    {
      id: 'tgt-1',
      name: 'H100-DGX-Cluster',
      type: 'Distributed Compute Node',
      hardware: '8x NVIDIA H100 80GB SXM5 · 1TB RAM',
      status: 'healthy'
    },
    {
      id: 'tgt-2',
      name: 'Local-Dev-Workstation',
      type: 'Local Workstation',
      hardware: '1x NVIDIA RTX 4090 24GB · 64GB DDR5',
      status: 'healthy'
    }
  ]
};

async function main() {
  console.log('Seeding sample vault data into', targetDir);
  await writeVault(targetDir, sampleData);
  console.log('Sample vault data successfully written!');
}

main().catch(err => {
  console.error('Failed to seed vault:', err);
  process.exit(1);
});
