import { LearningUnit } from '../learnTypes';

export const SAMPLE_LEARNING_UNITS: LearningUnit[] = [
  {
    id: 'unit-karpathy-gpt',
    title: 'Transformer Attention & Scaling Mechanics',
    description: 'Master why dot-product attention scales by 1/√d_k, track 4D tensor flow across heads [B, H, T, d_k], and write vectorized PyTorch causal self-attention.',
    source: {
      kind: 'course',
      title: 'Neural Networks: Zero to Hero (Andrej Karpathy)',
      authorOrChannel: 'Andrej Karpathy',
      url: 'https://www.youtube.com/watch?v=kCc8FmEb1nY'
    },
    tags: ['deep-learning', 'transformers', 'attention', 'pytorch', 'math'],
    sections: [
      {
        id: 'sec-gpt-1',
        title: 'Lecture 6: Building makemore (MLP & WaveNet)',
        locator: '00:00 - 1:45:00',
        completed: true
      },
      {
        id: 'sec-gpt-2',
        title: "Lecture 7: Let's build GPT: from scratch, in code",
        locator: '1:45:00 - 3:15:00',
        completed: false
      },
      {
        id: 'sec-gpt-3',
        title: 'Lecture 8: Scaling laws & FlashAttention kernel optimization',
        locator: '3:15:00 - 4:10:00',
        completed: false
      }
    ],
    notation: [
      { id: 'not-1', symbol: 'B', meaning: 'Batch size (number of independent sequences processed in parallel)', shape: 'scalar' },
      { id: 'not-2', symbol: 'T', meaning: 'Sequence length / context window (number of tokens in time)', shape: 'scalar' },
      { id: 'not-3', symbol: 'C', meaning: 'Embedding channel dimension (hidden size D)', shape: 'scalar' },
      { id: 'not-4', symbol: 'H', meaning: 'Number of parallel attention heads', shape: 'scalar' },
      { id: 'not-5', symbol: 'd_k', meaning: 'Per-head key/query dimension (d_k = C / H)', shape: 'scalar' },
      { id: 'not-6', symbol: 'W_{qkv}', meaning: 'Packed projection matrix for queries, keys, and values', shape: 'R^{C \\times 3C}' }
    ],
    createdAt: 1718000000000,
    updatedAt: 1718000000000,
    author: 'user',
    blocks: [
      {
        id: 'block-gpt-derivation',
        sectionId: 'sec-gpt-2',
        kind: 'derivation',
        level: 'analyzing',
        locator: 'Lecture 7 (42:15)',
        title: 'Why Scaled Dot-Product Attention divides by \\sqrt{d_k}',
        objective: 'Prove that if Query and Key vectors have zero mean and unit variance, their inner product has variance d_k, requiring 1/√d_k normalization to prevent softmax saturation.',
        initialEquation: 'q_i, k_i \\overset{iid}{\\sim} \\mathcal{N}(0, 1), \\quad s = q^T k = \\sum_{i=1}^{d_k} q_i k_i',
        steps: [
          {
            id: 'step-1',
            latex: '\\mathbb{E}[q_i k_i] = \\mathbb{E}[q_i] \\cdot \\mathbb{E}[k_i] = 0 \\cdot 0 = 0',
            explanation: 'Components q_i and k_i are independent random variables with zero expectation.',
            rule: 'Independence of random variables: E[XY] = E[X]E[Y]'
          },
          {
            id: 'step-2',
            latex: '\\text{Var}(q_i k_i) = \\mathbb{E}[(q_i k_i)^2] - (\\mathbb{E}[q_i k_i])^2 = \\mathbb{E}[q_i^2] \\mathbb{E}[k_i^2] - 0 = 1 \\cdot 1 = 1',
            explanation: 'Each term in the summation has an exact variance of 1.',
            rule: 'Variance definition: Var(Z) = E[Z^2] - (E[Z])^2'
          },
          {
            id: 'step-3',
            latex: '\\text{Var}(s) = \\text{Var}\\left(\\sum_{i=1}^{d_k} q_i k_i\\right) = \\sum_{i=1}^{d_k} \\text{Var}(q_i k_i) = \\sum_{i=1}^{d_k} 1 = d_k',
            explanation: 'Because terms are uncorrelated, the variance of the sum is the sum of the variances.',
            rule: 'Additivity of variance for independent components'
          },
          {
            id: 'step-4',
            latex: '\\text{Var}\\left(\\frac{s}{\\sqrt{d_k}}\\right) = \\left(\\frac{1}{\\sqrt{d_k}}\\right)^2 \\text{Var}(s) = \\frac{1}{d_k} \\cdot d_k = 1',
            explanation: 'Dividing by \\sqrt{d_k} pulls the variance back to exactly 1 regardless of embedding dimension.',
            rule: 'Homogeneity of variance: Var(aX) = a^2 Var(X)'
          }
        ],
        conclusion: 'Without 1/√d_k, as d_k grows (e.g. d_k=64 or 128), variance becomes huge. Softmax receives large positive and negative numbers, pushing activations into flat saturation regions with near-zero gradients (vanishing gradient catastrophe).',
        testMode: false,
        createdAt: 1718000000000,
        updatedAt: 1718000000000
      },
      {
        id: 'block-gpt-tensor',
        sectionId: 'sec-gpt-2',
        kind: 'tensor',
        level: 'applying',
        locator: 'Lecture 7 (58:40)',
        title: 'Multi-Head Causal Attention Tensor Flow',
        architectureName: 'GPT-2 / LLaMA Multi-Head Attention',
        symbolsLegend: 'B=batch, T=sequence length, C=embedding dim, H=heads, d_k=head dimension (C/H)',
        rows: [
          {
            id: 'row-1',
            operation: 'Input Activations X',
            inputShape: '[B, T]',
            outputShape: '[B, T, C]',
            parameters: 'Token Embeddings W_e',
            notes: 'Lookup token indices into continuous embedding space'
          },
          {
            id: 'row-2',
            operation: 'Fused Q, K, V Linear Projection',
            inputShape: '[B, T, C]',
            outputShape: '[B, T, 3 * C]',
            parameters: 'W_{qkv} \\in \\mathbb{R}^{C \\times 3C}',
            notes: 'Compute query, key, value representations in a single batched GEMM'
          },
          {
            id: 'row-3',
            operation: 'Split Heads & Transpose',
            inputShape: '[B, T, 3, H, d_k]',
            outputShape: 'Q, K, V each \\in [B, H, T, d_k]',
            parameters: 'None (view + transpose)',
            notes: 'Rearrange axes so heads act as parallel batch dimensions'
          },
          {
            id: 'row-4',
            operation: 'Batched Scaled Matmul (Q @ K^T)',
            inputShape: '[B, H, T, d_k] @ [B, H, d_k, T]',
            outputShape: '[B, H, T, T]',
            parameters: 'None (scale by 1/√d_k)',
            notes: 'Pairwise dot product scores for all token pairs within each head'
          },
          {
            id: 'row-5',
            operation: 'Causal Mask + Softmax',
            inputShape: '[B, H, T, T]',
            outputShape: '[B, H, T, T]',
            parameters: 'Lower triangular tril mask',
            notes: 'Mask upper triangle to -inf so tokens only attend to past and present'
          },
          {
            id: 'row-6',
            operation: 'Context Aggregation (Scores @ V)',
            inputShape: '[B, H, T, T] @ [B, H, T, d_k]',
            outputShape: '[B, H, T, d_k]',
            parameters: 'None',
            notes: 'Weighted sum of value vectors for each position'
          },
          {
            id: 'row-7',
            operation: 'Reassemble Heads & Out Projection',
            inputShape: '[B, H, T, d_k] -> [B, T, C]',
            outputShape: '[B, T, C]',
            parameters: 'W_o \\in \\mathbb{R}^{C \\times C}',
            notes: 'Transpose back to [B, T, H, d_k], flatten to [B, T, C], project through linear layer'
          }
        ],
        createdAt: 1718000000000,
        updatedAt: 1718000000000
      },
      {
        id: 'block-gpt-code',
        sectionId: 'sec-gpt-2',
        kind: 'code',
        level: 'creating',
        locator: 'Lecture 7 (1:15:20)',
        title: 'PyTorch Vectorized Causal Self-Attention Layer',
        language: 'python',
        code: `import math
import torch
import torch.nn as nn
import torch.nn.functional as F

class CausalSelfAttention(nn.Module):
    def __init__(self, d_model: int = 768, n_heads: int = 12, dropout: float = 0.1):
        super().__init__()
        assert d_model % n_heads == 0, "d_model must divide n_heads evenly"
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_k = d_model // n_heads

        # Fused Q, K, V projection
        self.c_attn = nn.Linear(d_model, 3 * d_model, bias=False)
        self.c_proj = nn.Linear(d_model, d_model, bias=False)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, C = x.shape  # [batch_size, seq_len, d_model]

        # 1. Project and split into q, k, v
        qkv = self.c_attn(x)  # [B, T, 3 * C]
        q, k, v = qkv.chunk(3, dim=-1)

        # 2. Reshape into [B, n_heads, T, d_k]
        q = q.view(B, T, self.n_heads, self.d_k).transpose(1, 2)
        k = k.view(B, T, self.n_heads, self.d_k).transpose(1, 2)
        v = v.view(B, T, self.n_heads, self.d_k).transpose(1, 2)

        # 3. Scaled dot product with causal masking
        # Using PyTorch 2.0 scaled_dot_product_attention for FlashAttention speedup
        y = F.scaled_dot_product_attention(
            q, k, v, 
            is_causal=True, 
            dropout_p=self.dropout.p if self.training else 0.0
        )  # [B, n_heads, T, d_k]

        # 4. Re-assemble heads and project out
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        return self.c_proj(y)`,
        notes: 'Notice the use of F.scaled_dot_product_attention which compiles down to hardware-fused FlashAttention kernels on Ampere/Hopper GPUs, avoiding intermediate [B, H, T, T] memory allocation.',
        createdAt: 1718000000000,
        updatedAt: 1718000000000
      },
      {
        id: 'block-gpt-card-1',
        sectionId: 'sec-gpt-2',
        kind: 'card',
        level: 'remembering',
        locator: 'Lecture 7 (45:00)',
        front: 'What happens to the softmax gradient when logits have large magnitudes (e.g. \\sigma = 10)?',
        back: 'The softmax function becomes extremely peaked (one-hot). In this saturated region, the derivative \\frac{\\partial \\text{softmax}_i}{\\partial z_j} = p_i(\\delta_{ij} - p_j) evaluates to zero, leading to vanishing gradients and stalled optimization.',
        latex: '\\frac{\\partial \\text{softmax}_i}{\\partial z_j} = p_i (\\delta_{ij} - p_j) \\approx 0',
        box: 1,
        dueAt: Date.now() + 86400000,
        createdAt: 1718000000000,
        updatedAt: 1718000000000
      }
    ]
  },
  {
    id: 'unit-rmsnorm-paper',
    title: 'RMSNorm vs LayerNorm in Modern LLMs',
    description: 'Understand why LLaMA 3, Mistral, and Gemma replaced standard LayerNorm with Root Mean Square Layer Normalization (RMSNorm) for a 10-50% computational speedup without quality loss.',
    source: {
      kind: 'article',
      title: 'Root Mean Square Layer Normalization (Zhang & Sennrich)',
      authorOrChannel: 'Biao Zhang, Rico Sennrich',
      url: 'https://arxiv.org/abs/1910.07467'
    },
    tags: ['deep-learning', 'normalization', 'rmsnorm', 'transformers'],
    sections: [
      {
        id: 'sec-rms-1',
        title: 'Section 1: Invariance properties of Layer Normalization',
        locator: '§1 - §2',
        completed: true
      },
      {
        id: 'sec-rms-2',
        title: 'Section 2: Formulation of RMSNorm and Gradient Flow',
        locator: '§3',
        completed: false
      }
    ],
    notation: [
      { id: 'not-rms-1', symbol: 'x', meaning: 'Layer input activation vector', shape: 'R^d' },
      { id: 'not-rms-2', symbol: '\\text{RMS}(x)', meaning: 'Root mean square statistic', shape: '\\sqrt{\\frac{1}{d}\\sum x_i^2 + \\epsilon}' },
      { id: 'not-rms-3', symbol: 'g_i', meaning: 'Learned scaling/gain parameter', shape: 'R^d' }
    ],
    createdAt: 1718000000000,
    updatedAt: 1718000000000,
    author: 'user',
    blocks: [
      {
        id: 'block-rms-derivation',
        sectionId: 'sec-rms-2',
        kind: 'derivation',
        level: 'analyzing',
        locator: 'Paper Section 3',
        title: 'RMSNorm Formulation & Scaling Invariance',
        objective: 'Show that RMSNorm achieves scaling invariance identical to LayerNorm while omitting the mean-centering step.',
        initialEquation: '\\bar{a}_i = \\frac{a_i}{\\text{RMS}(a)} g_i, \\quad \\text{where } \\text{RMS}(a) = \\sqrt{\\frac{1}{d} \\sum_{i=1}^d a_i^2 + \\epsilon}',
        steps: [
          {
            id: 'step-rms-1',
            latex: '\\text{LayerNorm}(a) = \\frac{a - \\mu}{\\sigma} \\odot g + b',
            explanation: 'Standard LayerNorm requires two reduction passes over hidden dimension: one for mean \\mu, one for variance \\sigma^2.',
            rule: 'Classical LayerNorm definition'
          },
          {
            id: 'step-rms-2',
            latex: '\\text{RMS}(\\alpha a) = \\sqrt{\\frac{1}{d} \\sum_{i=1}^d (\\alpha a_i)^2} = \\alpha \\sqrt{\\frac{1}{d} \\sum_{i=1}^d a_i^2} = \\alpha \\text{RMS}(a)',
            explanation: 'The RMS statistic scales linearly with any scalar multiplier \\alpha > 0.',
            rule: 'Scalar factoring out of root'
          },
          {
            id: 'step-rms-3',
            latex: '\\bar{a}_i(\\alpha a) = \\frac{\\alpha a_i}{\\text{RMS}(\\alpha a)} g_i = \\frac{\\alpha a_i}{\\alpha \\text{RMS}(a)} g_i = \\frac{a_i}{\\text{RMS}(a)} g_i',
            explanation: 'Scaling the inputs or weights by scalar \\alpha has zero effect on the normalized activations. Gradient scale invariance is preserved.',
            rule: 'Cancellation of \\alpha in numerator and denominator'
          }
        ],
        conclusion: 'Mean centering (shifting by -\\mu) does not contribute to regularization or training stability in transformers. Discarding it saves a global GPU synchronization step and removes the bias vector b.',
        testMode: false,
        createdAt: 1718000000000,
        updatedAt: 1718000000000
      },
      {
        id: 'block-rms-code',
        sectionId: 'sec-rms-2',
        kind: 'code',
        level: 'applying',
        locator: 'Implementation',
        title: 'Minimal PyTorch RMSNorm Implementation (LLaMA style)',
        language: 'python',
        code: `class RMSNorm(torch.nn.Module):
    def __init__(self, dim: int, eps: float = 1e-6):
        super().__init__()
        self.eps = eps
        self.weight = torch.nn.Parameter(torch.ones(dim))

    def _norm(self, x: torch.Tensor) -> torch.Tensor:
        # Calculate root mean square along last dimension
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        output = self._norm(x.float()).type_as(x)
        return output * self.weight`,
        notes: 'Notice x.float(): computing RMS in float32 avoids precision underflow/overflow before casting back to bfloat16 for the residual stream.',
        createdAt: 1718000000000,
        updatedAt: 1718000000000
      }
    ]
  }
];
