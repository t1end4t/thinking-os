import { LearningUnit } from '../learnTypes';

export const SAMPLE_LEARNING_UNITS: LearningUnit[] = [
  {
    id: 'unit-softmax-attention',
    title: 'Scaled Dot-Product Self-Attention & Softmax Geometry',
    description: 'Deconstructing dot-product attention geometry, why variance scales with key dimension dk, how temperature preserves gradient flow, and the mathematical root cause of initial token attention sinks.',
    category: 'Attention & Architecture',
    difficulty: 'Advanced',
    book: 'Understanding Deep Learning (Simon J.D. Prince)',
    chapter: 'Chapter 12: Attention and Transformers',
    section: '12.2 Scaled Dot-Product Attention',
    readingStatus: 'synthesized',
    keyFormulaLatex: '\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V',
    toyCodeSnippet: `import numpy as np

def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    Scaled Dot-Product Attention from Understanding Deep Learning (Ch 12).
    Q, K, V: shape (batch_size, seq_len, d_k)
    """
    d_k = Q.shape[-1]
    # 1. Compute dot-product affinity matrix (scaled by sqrt(d_k))
    scores = np.matmul(Q, np.swapaxes(K, -2, -1)) / np.sqrt(d_k)
    
    # 2. Optional causal or padding masking
    if mask is not None:
        scores = np.where(mask == 0, -1e9, scores)
        
    # 3. Stable categorical softmax over key sequence dimension
    exp_scores = np.exp(scores - np.max(scores, axis=-1, keepdims=True))
    weights = exp_scores / np.sum(exp_scores, axis=-1, keepdims=True)
    
    # 4. Context aggregation over values
    output = np.matmul(weights, V)
    return output, weights`,
    tags: ['attention', 'softmax', 'geometry', 'transformers', 'entropy', 'variance'],
    prerequisites: ['Inner products in Euclidean space', 'Multivariate Softmax Jacobian', 'Variance of sum of independent random variables'],
    mathFields: ['Inner Product Spaces', 'Differential Geometry of Probability Simplices', 'Lipschitz Continuity'],
    createdAt: 1718000000000,
    updatedAt: 1718050000000,
    author: 'system',
    progress: {
      remembering: 100,
      understanding: 80,
      applying: 65,
      analyzing: 50,
      evaluating: 35,
      creating: 20
    },
    remembering: {
      keyTerms: [
        {
          id: 't1',
          term: 'Scaled Dot-Product Attention',
          symbolLatex: 'Attention(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V',
          definition: 'A mapping of queries and key-value pairs to an output vector, where weights are computed as scaled inner products normalized over the sequence via the categorical softmax distribution.',
          mnemonic: 'Q-K-V: Queries ask, Keys match, Values speak, scaled by root dimension.',
          recallRating: 'easy'
        },
        {
          id: 't2',
          term: 'Attention Sink',
          symbolLatex: '\\sum_{i=1}^4 a_{t, i} \\gg 0 \\quad \\text{as } t \\to \\infty',
          definition: 'A structural phenomenon where autoregressive decoders dump massive unneeded softmax probability mass into the initial tokens (even if semantically uninformative) to satisfy the probability simplex constraint \\sum_i p_i = 1.',
          mnemonic: 'Sinks soak up excess probability mass so other tokens stay sharp.',
          recallRating: 'good'
        },
        {
          id: 't3',
          term: 'Temperature Parameter (\\tau)',
          symbolLatex: 'p_i = \\frac{\\exp(z_i / \\tau)}{\\sum_j \\exp(z_j / \\tau)}',
          definition: 'A positive scalar divisor controlling the flatness of the resulting categorical probability distribution. As \\tau \\to 0, softmax approaches argmax (one-hot); as \\tau \\to \\infty, it approaches uniform distribution.',
          mnemonic: 'High temp = boiling/uniform; Low temp = freezing/deterministic.',
          recallRating: 'easy'
        },
        {
          id: 't4',
          term: 'Softmax Jacobian',
          symbolLatex: '\\frac{\\partial p_i}{\\partial z_j} = p_i(\\delta_{ij} - p_j)',
          definition: 'The matrix of first partial derivatives of softmax outputs with respect to logits. Notice that when any p_i \\to 1, all gradients vanish because p_i(1 - p_i) \\to 0.',
          mnemonic: 'Diagonal is p(1-p), off-diagonal is -p_i p_j; saturates to zero at extremes.',
          recallRating: 'hard'
        }
      ],
      axiomsAndIdentities: [
        {
          id: 'ax1',
          name: 'Variance of Dot Product of Zero-Mean Orthogonal Vectors',
          latex: '\\text{Var}(q^T k) = d_k \\cdot \\sigma_q^2 \\sigma_k^2',
          statement: 'For two independent random vectors q, k \\in \\mathbb{R}^{d_k} with zero mean and unit variance, the variance of their dot product equals d_k.',
          significance: 'Without dividing by \\sqrt{d_k}, logits grow proportionally to \\sqrt{d_k}, pushing softmax into regions with near-zero gradients.'
        },
        {
          id: 'ax2',
          name: 'Probability Simplex Conservation',
          latex: '\\sum_{i=1}^N \\text{softmax}(z)_i = 1, \\quad \\text{softmax}(z)_i > 0',
          statement: 'Softmax strictly projects any finite logit vector z \\in \\mathbb{R}^N onto the open interior of the standard (N-1)-simplex \\Delta^{N-1}.',
          significance: 'Attention CANNOT simply assign zero weight everywhere when no context is relevant; it must put mass somewhere, creating sinks.'
        }
      ],
      masteryPercent: 85
    },
    understanding: {
      formalDefinition: {
        statement: 'Given query vector q \\in \\mathbb{R}^{d_k} and key matrix K \\in \\mathbb{R}^{N \\times d_k}, the scaled attention score vector a \\in \\Delta^{N-1} is defined by the composition of bilinear pairing, scalar scaling \\tau^{-1} = d_k^{-1/2}, and the exponential map normalized by its partition function.',
        preconditions: [
          'Key dimension d_k \\ge 1 must be strictly positive',
          'Embeddings q and k_i are assumed approximately i.i.d. with bounded variance during initial optimization',
          'Sequence length N \\ge 1'
        ],
        notationKey: [
          { symbol: 'q', meaning: 'Query vector from current generation token' },
          { symbol: 'k_i', meaning: 'Key vector for token at position i' },
          { symbol: 'd_k', meaning: 'Head projection dimension (typically 64 or 128)' },
          { symbol: '\\Delta^{N-1}', meaning: 'Standard probability simplex where all components sum to 1' }
        ]
      },
      geometricIntuition: {
        visualMetaphor: 'Imagine a sphere in high-dimensional space. The dot product measures directional alignment. As dimension d_k grows, vectors have many more orthogonal directions to diverge into, making their dot products swing wildly between positive and negative extremes.',
        physicalInterpretation: 'Softmax acts like a Boltzmann distribution where logits represent negative energy states. When energy differences become too high relative to temperature, the system freezes into a single ground state, destroying all quantum-like superpositions of attention.',
        coreInsight: 'Dividing by \\sqrt{d_k} normalizes the variance back to 1.0 regardless of head dimension, ensuring stable gradient backpropagation throughout training.'
      },
      feynmanWorkspace: {
        guidingQuestion: 'Why does an autoregressive LLM create an "attention sink" at token 0 even when token 0 is just an uninformative <s> or newline?',
        learnerExplanation: 'Because the softmax function forces the weights across all previous tokens to sum up to exactly 1.0. When the model is predicting something self-contained that doesn\'t require past context, it cannot set all weights to 0. It must dump that mandatory 1.0 sum somewhere. Initial tokens are always present in the context window, so the optimizer finds it easiest to designate them as a harmless "null sink".',
        rubricChecks: [
          { id: 'r1', prompt: 'Mentioned that softmax forces weights to sum to 1 (simplex constraint)', verified: true },
          { id: 'r2', prompt: 'Explained that the model sometimes needs near-zero attention on past tokens', verified: true },
          { id: 'r3', prompt: 'Noted that position 0 is invariant and present in every sliding window', verified: true },
          { id: 'r4', prompt: 'Linked to what happens if token 0 is evicted (attention catastrophe)', verified: false }
        ]
      },
      conceptDecomposition: [
        {
          part: 'Scalar Factor (1 / \\sqrt{d_k})',
          role: 'Variance normalization',
          impactIfMissing: 'At d_k=128, logits have variance ~128 (std dev ~11.3). Softmax becomes saturated one-hot, gradients vanish, training stalls.'
        },
        {
          part: 'Softmax Exponentiation',
          role: 'Enforces non-negativity and differentiability',
          impactIfMissing: 'Negative weights could cancel out representations unpredictably; non-differentiable argmax prevents backprop.'
        },
        {
          part: 'Partition Function (Denominator)',
          role: 'Normalization to probability simplex',
          impactIfMissing: 'Total magnitude would vary with sequence length N, making activations explode or vanish dynamically.'
        }
      ]
    },
    applying: {
      workedDerivations: [
        {
          id: 'wd1',
          title: 'Derivation of Variance Scaling: Var(q^T k) = d_k',
          problemStatement: 'Let q, k \\in \\mathbb{R}^{d_k} be random vectors with elements q_i, k_i drawn independently with \\mathbb{E}[q_i] = \\mathbb{E}[k_i] = 0 and \\text{Var}(q_i) = \\text{Var}(k_i) = 1. Prove that \\text{Var}(q^T k) = d_k.',
          initialAssumptions: [
            'Components q_i and k_i are mutually independent for all i, j',
            'Mean of each component is 0',
            'Variance of each component is 1'
          ],
          steps: [
            {
              stepIndex: 1,
              label: 'Expand the dot product definition',
              mathExpression: 'q^T k = \\sum_{i=1}^{d_k} q_i k_i',
              justification: 'Standard Euclidean inner product definition.'
            },
            {
              stepIndex: 2,
              label: 'Variance of sum of independent variables',
              mathExpression: '\\text{Var}\\left(\\sum_{i=1}^{d_k} q_i k_i\\right) = \\sum_{i=1}^{d_k} \\text{Var}(q_i k_i)',
              justification: 'Since each q_i k_i is mutually independent across i, covariance terms are zero.'
            },
            {
              stepIndex: 3,
              label: 'Variance of product of zero-mean variables',
              mathExpression: '\\text{Var}(q_i k_i) = \\mathbb{E}[(q_i k_i)^2] - (\\mathbb{E}[q_i k_i])^2 = \\mathbb{E}[q_i^2]\\mathbb{E}[k_i^2] - (\\mathbb{E}[q_i]\\mathbb{E}[k_i])^2 = (1)(1) - 0 = 1',
              justification: 'Independence yields \\mathbb{E}[q_i k_i] = \\mathbb{E}[q_i]\\mathbb{E}[k_i] = 0, and \\mathbb{E}[q_i^2] = \\text{Var}(q_i) + \\mathbb{E}[q_i]^2 = 1.'
            },
            {
              stepIndex: 4,
              label: 'Sum across all d_k dimensions',
              mathExpression: '\\text{Var}(q^T k) = \\sum_{i=1}^{d_k} 1 = d_k',
              justification: 'Summing 1 over d_k terms equals d_k. Standard deviation is therefore \\sqrt{d_k}.'
            }
          ],
          conclusion: 'Thus, dividing q^T k by \\sqrt{d_k} scales the variance back to \\text{Var}\\left(\\frac{q^T k}{\\sqrt{d_k}}\\right) = \\frac{1}{d_k} \\text{Var}(q^T k) = \\frac{d_k}{d_k} = 1.'
        }
      ],
      practiceChallenges: [
        {
          id: 'pc1',
          question: 'In a Transformer with head dimension d_k = 64, two tokens produce unscaled dot product q^T k_1 = 16 and q^T k_2 = 0. Compare the attention weights with and without the 1/\\sqrt{d_k} scale.',
          mathContext: 'Compute softmax([16, 0]) versus softmax([16 / \\sqrt{64}, 0 / \\sqrt{64}]).',
          hints: [
            '\\sqrt{64} = 8',
            'Unscaled logits are [16, 0]',
            'Scaled logits are [16/8, 0/8] = [2, 0]',
            'Compute exp(16) / (exp(16) + 1) vs exp(2) / (exp(2) + 1)'
          ],
          options: [
            'Unscaled: ~0.9999999, Scaled: ~0.8808',
            'Unscaled: ~0.7500, Scaled: ~0.5000',
            'Unscaled: ~1.0000, Scaled: ~0.5000',
            'Both produce the exact same attention distribution'
          ],
          correctOptionIndex: 0,
          solutionWalkthrough: 'exp(16) / (exp(16) + 1) \\approx 8886110 / 8886111 = 0.99999989 (saturated, zero gradient). Scaled: exp(2) / (exp(2) + 1) \\approx 7.389 / 8.389 = 0.8808 (healthy gradient: p(1-p) = 0.105).'
        }
      ],
      sandboxConfig: {
        sandboxType: 'softmax_temperature',
        title: 'Interactive Softmax Logit & Temperature Lab',
        equationLatex: 'p_i = \\frac{\\exp(z_i / \\tau)}{\\sum_{j=1}^K \\exp(z_j / \\tau)}, \\quad H(P) = -\\sum_{i=1}^K p_i \\log_2 p_i',
        parameters: [
          { id: 'tau', label: 'Temperature (\\tau)', symbol: '\\tau', min: 0.1, max: 4.0, step: 0.1, defaultValue: 1.0, unit: '', description: 'Divisor on logits' },
          { id: 'dk', label: 'Key Dimension (d_k)', symbol: 'd_k', min: 16, max: 256, step: 16, defaultValue: 64, unit: '', description: 'Feature dimension' },
          { id: 'logitGap', label: 'Raw Logit Spread', symbol: '\\Delta z', min: 1, max: 20, step: 1, defaultValue: 6, unit: '', description: 'Difference between max and min logit' }
        ]
      }
    },
    analyzing: {
      structuralComponents: [
        {
          id: 'sc1',
          component: 'Unbounded Inner Product Field',
          formulaSnippet: 'S = Q K^T \\in \\mathbb{R}^{N \\times N}',
          mathematicalFunction: 'Bilinear mapping comparing orientation in \\mathbb{R}^{d_k}',
          invariantPreserved: 'Rotational invariance under orthogonal transformation O \\in O(d_k)'
        },
        {
          id: 'sc2',
          component: 'Variance Normalizer',
          formulaSnippet: '\\hat{S} = S / \\sqrt{d_k}',
          mathematicalFunction: 'Homothetic contraction of distribution variance',
          invariantPreserved: 'Preserves zero-mean unit-variance initialization hypothesis'
        },
        {
          id: 'sc3',
          component: 'Simplex Projection',
          formulaSnippet: 'A = \\text{row\\_softmax}(\\hat{S})',
          mathematicalFunction: 'Nonlinear diffeomorphism mapping \\mathbb{R}^N to \\Delta^{N-1}',
          invariantPreserved: 'Convex combination constraint: \\sum_j A_{ij} = 1, A_{ij} > 0'
        }
      ],
      assumptionStressTests: [
        {
          id: 'ast1',
          assumption: 'Key & Query vectors maintain standard normal distributions \\mathcal{N}(0, I)',
          failureMode: 'LayerNorm shift or residual accumulation causes systematic mean shift \\mu \\ne 0',
          mathematicalConsequence: '\\mathbb{E}[q^T k] = d_k \\cdot \\mu_q \\mu_k \\ne 0, adding an O(d_k) uniform constant to every attention score',
          llmResearchImplication: 'Creates artificial attention bias across all tokens, which is why QK-Norm (applying LayerNorm to Q and K prior to dot product) has become prevalent in modern architectures (e.g. Gemma, ViT-22B).'
        },
        {
          id: 'ast2',
          assumption: 'Sliding window eviction can safely drop initial tokens (FIFO cache eviction)',
          failureMode: 'Dropping token 0 removes the dedicated sink node',
          mathematicalConsequence: 'Softmax is forced to suddenly allocate that residual probability mass onto adjacent active tokens, exploding attention entropy and destroying perplexity',
          llmResearchImplication: 'StreamingLLM showed that simply retaining 4 initial sink tokens allows infinite sequence streaming with stable perplexity.'
        }
      ],
      contrastiveAnalysis: {
        titleA: 'Scaled Softmax Attention',
        titleB: 'Linear Attention (Kernelized)',
        dimensions: [
          {
            dimension: 'Complexity w.r.t Sequence Length N',
            conceptA: 'O(N^2) due to full pairwise N \\times N matrix',
            conceptB: 'O(N \\cdot d^2) by associative matrix multiplication (\\phi(Q)(\\phi(K)^T V))',
            mathematicalDivergence: 'Softmax non-linearity prevents factoring out K^T V before Q'
          },
          {
            dimension: 'Probability Mass Distribution',
            conceptA: 'Exponential sharpness; capable of exact retrieval (needle-in-a-haystack)',
            conceptB: 'Linear/Kernel sum; acts as low-pass filter, prone to state decay',
            mathematicalDivergence: 'Kernel approximation \\phi(x)^T \\phi(y) fails to sharply isolate single outlier logits'
          }
        ]
      }
    },
    evaluating: {
      critiqueChallenges: [
        {
          id: 'crit1',
          title: 'The "Temperature Invariance" Fallacy in Post-Training Quantization',
          allegedClaim: 'A research preprint claims: "Quantizing queries and keys to FP4 does not impact attention softmax distribution because temperature scaling \\tau can simply be adjusted post-hoc to match the original entropy."',
          presentedDerivation: 'Let \\tilde{Q}, \\tilde{K} be 4-bit quantized matrices. Since quantization primarily shrinks numerical scale by factor \\gamma, \\tilde{Q}\\tilde{K}^T \\approx \\gamma^2 QK^T. By defining \\tilde{\\tau} = \\gamma^2 \\sqrt{d_k}, we obtain \\text{softmax}(\\tilde{Q}\\tilde{K}^T / \\tilde{\\tau}) = \\text{softmax}(QK^T / \\sqrt{d_k}), proving lossless quantization.',
          hiddenFlawType: 'unwarranted_assumption',
          hiddenFlawExplanation: 'Quantization noise is not a uniform scalar contraction \\gamma; it introduces non-linear rounding discretization and heavy-tailed outlier distortion. Furthermore, outlier channels in Q and K carry disproportionate variance that cannot be compensated by a single scalar temperature shift.',
          guidedQuestions: [
            'Is quantization error really uniform scalar multiplication?',
            'What happens to the relative ranking of small versus large logits under coarse 4-bit bins?',
            'How do outlier activation channels interact with the exponential function in softmax?'
          ],
          verdictOptions: [
            { id: 'v1', label: 'Sound: Scaling temperature \\tau mathematically cancels out uniform scale factors', isCorrect: false },
            { id: 'v2', label: 'Flawed: Quantization introduces non-linear stochastic noise and outlier clipping that scalar temperature cannot invert', isCorrect: true },
            { id: 'v3', label: 'Invalid Step: Softmax does not accept scalar divisors', isCorrect: false }
          ],
          learnerVerdictId: 'v2',
          isEvaluated: true
        }
      ],
      tradeoffMatrix: {
        approachAName: 'Standard Softmax with \\sqrt{d_k} scaling',
        approachBName: 'QK-Norm (L2 or RMS Normalization on Q and K)',
        criteria: [
          { criterion: 'Gradient Stability at Deep Layers (>60)', approachA: 'Moderate; logits can drift over deep residual additions', approachB: 'Extremely high; logits bounded strictly within [-1, 1] / \\tau', verdict: 'QK-Norm prevents attention logit explosion' },
          { criterion: 'Implementation Complexity', approachA: 'Trivial (single scalar divide)', approachB: 'Requires two additional normalization layers per head', verdict: 'Standard scaling has zero memory or latency overhead' },
          { criterion: 'Needle Retrieval Sharpness', approachA: 'Very sharp for large inner products', approachB: 'Slightly constrained by bounded norm', verdict: 'Tradeoff between numerical stability and raw logit expressiveness' }
        ]
      }
    },
    creating: {
      conjecturePrompt: 'Formulate a testable conjecture combining attention scaling, entropy constraints, and token pruning or sink preservation.',
      conjectureDraft: 'If an explicit learnable bias token b_0 \\in \\mathbb{R}^{d_k} is pre-pended to all key projections K independently of input sequence, it will absorb 100% of the attention sink mass, enabling zero-sink sliding window eviction without perplexity degradation.',
      mathematicalPremises: [
        'Softmax partition function requires a minimum sink capacity when context tokens lack relevance',
        'Natural tokens at position 0 are forced to deform their semantic representation to act as sinks',
        'An explicit dedicated parameter b_0 decouples semantic key representation from the simplex normalization slack variable'
      ],
      proposedMechanism: 'Add fixed learned vector b_0 as key column 0 before every softmax calculation. Value vector v_0 = 0 so the sink token contributes nothing to the output hidden state.',
      falsificationCriteria: 'If model trained with b_0 still exhibits >5% attention weight allocated to input token 1 when context is non-informative, the hypothesis that a separate zero-value key can fully absorb sink dynamics is falsified.',
      promotedClaimId: 'c1',
      promotedQuestionId: 'q1',
      linkedTaskId: 'task-1',
      novelIdeasInspiration: [
        'Explore dynamic temperature \\tau(t) scheduled as a function of sequence length t to counter entropy dilution',
        'Investigate whether QK-Norm eliminates the mathematical necessity of attention sinks altogether',
        'Derive an analytical bound on maximum attention weight under fixed weight decay \\lambda'
      ]
    }
  },
  {
    id: 'unit-lora-algebra',
    title: 'Low-Rank Approximations & LoRA Matrix Algebra',
    description: 'The linear algebra of parameter-efficient adaptation: Eckart-Young-Mirsky low-rank theorem, SVD spectral decay in weights, rank constraints, and the scaling parameter alpha / r.',
    category: 'Linear Algebra',
    difficulty: 'Intermediate',
    book: 'Understanding Deep Learning (Simon J.D. Prince)',
    chapter: 'Chapter 15: Parameter-Efficient Fine-Tuning',
    section: '15.3 Low-Rank Adaptation (LoRA)',
    readingStatus: 'tested',
    keyFormulaLatex: 'W = W_0 + \\Delta W = W_0 + \\frac{\\alpha}{r} B A, \\quad B \\in \\mathbb{R}^{d \\times r}, A \\in \\mathbb{R}^{r \\times k}',
    toyCodeSnippet: `import numpy as np

def lora_forward(x, W_0, A, B, alpha=16, r=4):
    """
    LoRA Forward Pass from Understanding Deep Learning (Ch 15).
    x: (batch, in_features)
    W_0: frozen base weights (out_features, in_features)
    A: low-rank down-projection (r, in_features)
    B: low-rank up-projection (out_features, r)
    """
    scaling = alpha / r
    base_out = np.matmul(x, W_0.T)
    # Low-rank bottleneck: (x @ A.T) @ B.T
    lora_out = np.matmul(np.matmul(x, A.T), B.T) * scaling
    return base_out + lora_out`,
    tags: ['lora', 'svd', 'matrix-decomposition', 'rank', 'linear-algebra', 'finetuning'],
    prerequisites: ['Matrix rank and null space', 'Singular Value Decomposition (SVD)', 'Frobenius norm'],
    mathFields: ['Matrix Theory', 'Spectral Graph Theory', 'Manifold Optimization'],
    createdAt: 1718100000000,
    updatedAt: 1718150000000,
    author: 'system',
    progress: {
      remembering: 100,
      understanding: 90,
      applying: 80,
      analyzing: 60,
      evaluating: 40,
      creating: 10
    },
    remembering: {
      keyTerms: [
        {
          id: 'lora-t1',
          term: 'LoRA Decomposition',
          symbolLatex: 'W = W_0 + \\Delta W = W_0 + \\frac{\\alpha}{r} B A',
          definition: 'A parameter-efficient adaptation technique freezing pretrained weights W_0 \\in \\mathbb{R}^{d \\times k} and injecting trainable rank decomposition matrices A \\in \\mathbb{R}^{r \\times k} and B \\in \\mathbb{R}^{d \\times r} with rank r \\ll \\min(d, k).',
          mnemonic: 'B after A: input feeds into A (down-projection), then B (up-projection).',
          recallRating: 'easy'
        },
        {
          id: 'lora-t2',
          term: 'Scaling Factor (\\alpha / r)',
          symbolLatex: '\\text{scale} = \\frac{\\alpha}{r}',
          definition: 'A constant multiplier where \\alpha is a hyperparameter and r is the adapter rank. It stabilizes training by keeping learning rates comparable when varying r.',
          mnemonic: 'Alpha over r keeps the gradient magnitude constant when rank changes.',
          recallRating: 'good'
        },
        {
          id: 'lora-t3',
          term: 'Eckart-Young-Mirsky Theorem',
          symbolLatex: '\\min_{\\text{rank}(M) \\le r} \\|W - M\\|_F = \\sqrt{\\sum_{i=r+1}^{\\min(d,k)} \\sigma_i^2}',
          definition: 'States that the best low-rank matrix approximation under Frobenius or spectral norm is achieved by truncating the Singular Value Decomposition (SVD) to the top r singular values.',
          mnemonic: 'SVD truncation is mathematically optimal for rank-r approximation.',
          recallRating: 'hard'
        }
      ],
      axiomsAndIdentities: [
        {
          id: 'lora-ax1',
          name: 'Rank Subadditivity',
          latex: '\\text{rank}(W_0 + \\Delta W) \\le \\text{rank}(W_0) + \\text{rank}(\\Delta W)',
          statement: 'The rank of the sum of two matrices is at most the sum of their individual ranks.',
          significance: 'Adding a rank-r update \\Delta W alters at most r dimensions of the linear subspace spanned by W_0.'
        },
        {
          id: 'lora-ax2',
          name: 'Zero Initialization Guarantee',
          latex: 'B = 0, \\quad A \\sim \\mathcal{N}(0, \\sigma^2) \\implies \\Delta W = B A = 0 \\text{ at } t=0',
          statement: 'Initializing B with zeros and A with Gaussian random noise guarantees \\Delta W = 0 at the start of training.',
          significance: 'Ensures the model begins exactly identical to the original pretrained model without sudden catastrophic degradation at step 0.'
        }
      ],
      masteryPercent: 90
    },
    understanding: {
      formalDefinition: {
        statement: 'Given a frozen linear layer transformation y = W_0 x with W_0 \\in \\mathbb{R}^{d \\times k}, LoRA parametrizes the adaptation residual as \\Delta W = \\frac{\\alpha}{r} B A, where B \\in \\mathbb{R}^{d \\times r} and A \\in \\mathbb{R}^{r \\times k} are factorized through an intermediate bottleneck space \\mathbb{R}^r with r \\ll \\min(d, k).',
        preconditions: [
          'Pretrained weights W_0 are held strictly non-trainable',
          'Rank r \\in \\mathbb{N}^+ satisfies r \\le \\min(d, k)',
          'Scaling constant \\alpha > 0'
        ],
        notationKey: [
          { symbol: 'W_0', meaning: 'Pretrained parameter matrix (frozen)' },
          { symbol: 'A', meaning: 'Down-projection matrix: compresses input dimension k to bottleneck rank r' },
          { symbol: 'B', meaning: 'Up-projection matrix: projects bottleneck rank r to output dimension d' },
          { symbol: '\\alpha', meaning: 'Fixed scaling constant (typically 16 or 32)' }
        ]
      },
      geometricIntuition: {
        visualMetaphor: 'Imagine a high-dimensional sheet folded in a 4096-dimensional room. Task adaptation does not twist the entire sheet in all 4096 directions; it only tilts it along a very narrow 4-dimensional or 8-dimensional hinge.',
        physicalInterpretation: 'Pretrained representations already contain general world knowledge. Domain adaptation only requires steering activations along low-dimensional task manifolds rather than rebuilding fundamental semantic features.',
        coreInsight: 'Because rank r is tiny (e.g. 8 vs 4096), parameter storage drops by ~99.8%, and at inference time, BA can be pre-added back into W_0: W_{\\text{final}} = W_0 + \\frac{\\alpha}{r}BA with zero added latency.'
      },
      feynmanWorkspace: {
        guidingQuestion: 'Why does LoRA initialize matrix B to all zeros and matrix A to random values, rather than initializing both to zeros?',
        learnerExplanation: 'If both were initialized to zeros, the gradient backpropagated to both would be zero or symmetric, causing training to get stuck in saddle points. By making A random and B zero, the initial delta is exactly zero (preserving the original model output at step 0), but the gradient \\nabla_B \\mathcal{L} = (\\nabla_{\\Delta W} \\mathcal{L}) A^T is immediately non-zero because A has non-zero random values!',
        rubricChecks: [
          { id: 'f-lora-1', prompt: 'Mentioned that BA = 0 ensures model output is unchanged at start', verified: true },
          { id: 'f-lora-2', prompt: 'Explained gradient symmetry breaking between A and B', verified: true },
          { id: 'f-lora-3', prompt: 'Showed that gradient with respect to B depends on A (and vice-versa)', verified: true }
        ]
      },
      conceptDecomposition: [
        {
          part: 'Down-Projection A (r \\times k)',
          role: 'Subspace feature extraction',
          impactIfMissing: 'Without A, you cannot compress the k-dimensional input into the low-rank bottleneck.'
        },
        {
          part: 'Up-Projection B (d \\times r)',
          role: 'Subspace steering injection',
          impactIfMissing: 'Without B, bottleneck activations cannot map back into the output dimension d.'
        },
        {
          part: 'Inference Folding (W_0 + \\frac{\\alpha}{r}BA)',
          role: 'Zero-latency deployment',
          impactIfMissing: 'Would require two extra matrix multiplications for every forward pass token.'
        }
      ]
    },
    applying: {
      workedDerivations: [
        {
          id: 'wd-lora-1',
          title: 'Parameter Savings Calculation for 4096 \\times 4096 Matrix',
          problemStatement: 'Calculate parameter count and compression ratio for adapting a single linear layer with d = 4096 and k = 4096 using LoRA with rank r = 8.',
          initialAssumptions: [
            'Standard full matrix W_0 has d \\times k parameters',
            'LoRA uses A \\in \\mathbb{R}^{r \\times k} and B \\in \\mathbb{R}^{d \\times r}'
          ],
          steps: [
            {
              stepIndex: 1,
              label: 'Full fine-tuning parameter count',
              mathExpression: 'N_{\\text{full}} = d \\times k = 4096 \\times 4096 = 16,777,216 \\text{ parameters (16.78M)}',
              justification: 'Every single entry in W_0 is an independent trainable parameter.'
            },
            {
              stepIndex: 2,
              label: 'LoRA adapter parameter count',
              mathExpression: 'N_{\\text{LoRA}} = (r \\times k) + (d \\times r) = r(k + d) = 8 \\times (4096 + 4096) = 65,536 \\text{ parameters (65.5K)}',
              justification: 'Parameters are stored in matrices A and B only.'
            },
            {
              stepIndex: 3,
              label: 'Compute compression ratio',
              mathExpression: '\\text{Ratio} = \\frac{N_{\\text{LoRA}}}{N_{\\text{full}}} = \\frac{65,536}{16,777,216} = \\frac{1}{256} \\approx 0.39\\%',
              justification: 'Over 99.6% reduction in trainable parameters for this layer.'
            }
          ],
          conclusion: 'LoRA requires only 0.39% of the parameters of full fine-tuning, dramatically reducing optimizer state memory in AdamW (which requires 8 bytes per parameter for moments).'
        }
      ],
      practiceChallenges: [
        {
          id: 'pc-lora-1',
          question: 'If you double the rank r from 8 to 16, but keep hyperparameter \\alpha = 16 constant, what happens to the scaling factor \\alpha / r?',
          mathContext: 'Evaluate \\alpha / r when r=8 vs r=16.',
          hints: ['Calculate 16 / 8', 'Calculate 16 / 16', 'Consider how this scales the weight update magnitude \\Delta W'],
          options: [
            'The scaling factor halves from 2.0 to 1.0',
            'The scaling factor doubles from 1.0 to 2.0',
            'The scaling factor stays identical',
            'The scaling factor squares'
          ],
          correctOptionIndex: 0,
          solutionWalkthrough: 'When r=8, \\alpha/r = 16/8 = 2.0. When r=16, \\alpha/r = 16/16 = 1.0. The scaling factor automatically halves, compensating for the fact that having twice as many rank directions would otherwise double the effective update magnitude.'
        }
      ],
      sandboxConfig: {
        sandboxType: 'lora_rank',
        title: 'LoRA Rank & Memory Footprint Simulator',
        equationLatex: '\\text{Params} = r(d + k), \\quad \\text{Savings} = 1 - \\frac{r(d + k)}{d \\cdot k}, \\quad \\Delta W = \\frac{\\alpha}{r} B A',
        parameters: [
          { id: 'dim', label: 'Matrix Dimension (d=k)', symbol: 'd', min: 1024, max: 8192, step: 1024, defaultValue: 4096, unit: '', description: 'Hidden dimension of Transformer' },
          { id: 'rank', label: 'Adapter Rank (r)', symbol: 'r', min: 1, max: 64, step: 1, defaultValue: 8, unit: '', description: 'Low-rank dimension bottleneck' },
          { id: 'alpha', label: 'Scaling Alpha (\\alpha)', symbol: '\\alpha', min: 4, max: 64, step: 4, defaultValue: 16, unit: '', description: 'LoRA scaling numerator' }
        ]
      }
    },
    analyzing: {
      structuralComponents: [
        {
          id: 'lora-sc1',
          component: 'Subspace Projection Bottleneck',
          formulaSnippet: 'z = A x \\in \\mathbb{R}^r',
          mathematicalFunction: 'Compresses input signal into r-dimensional subspace',
          invariantPreserved: 'Linearity of the transformation'
        },
        {
          id: 'lora-sc2',
          component: 'Up-Projection Expansion',
          formulaSnippet: '\\Delta y = B z \\in \\mathbb{R}^d',
          mathematicalFunction: 'Re-embeds compressed subspace into target activation space',
          invariantPreserved: 'Dimensionality alignment with W_0 x'
        }
      ],
      assumptionStressTests: [
        {
          id: 'lora-ast1',
          assumption: 'The task adaptation update \\Delta W has intrinsic low rank (singular values decay exponentially)',
          failureMode: 'Pretraining on completely new languages or modalities requires fundamental new basis vectors',
          mathematicalConsequence: 'Truncating to small rank r causes severe underfitting because \\sum_{i > r} \\sigma_i^2 is large',
          llmResearchImplication: 'LoRA works exceptionally well for style and instruction alignment, but full fine-tuning or higher rank (r \\ge 64) is required for continual pretraining or injecting substantial new factual knowledge.'
        }
      ],
      contrastiveAnalysis: {
        titleA: 'LoRA (Low-Rank Adaptation)',
        titleB: 'Full Fine-Tuning',
        dimensions: [
          {
            dimension: 'Optimizer VRAM Footprint',
            conceptA: 'Requires AdamW moments only for r(d+k) parameters (~0.1% VRAM)',
            conceptB: 'Requires 16 bytes/param (float32 weights + m + v moments) for all d \\times k',
            mathematicalDivergence: 'Massive reduction in memory graph allocation'
          },
          {
            dimension: 'Subspace Freedom',
            conceptA: 'Rank strictly bounded by r',
            conceptB: 'Full rank \\min(d, k)',
            mathematicalDivergence: 'Cannot express orthogonal transformations outside the column space of B'
          }
        ]
      }
    },
    evaluating: {
      critiqueChallenges: [
        {
          id: 'crit-lora-1',
          title: 'The "Higher Rank Always Strictly Generalizes Lower Rank" Claim',
          allegedClaim: 'A researcher asserts: "Since a rank-16 matrix can represent any rank-8 matrix by simply setting 8 singular values to zero, setting r=16 must always achieve equal or better test loss than r=8 under identical optimization."',
          presentedDerivation: 'Let \\mathcal{M}_r = \\{BA \\mid B \\in \\mathbb{R}^{d \\times r}, A \\in \\mathbb{R}^{r \\times k}\\}. Clearly \\mathcal{M}_8 \\subset \\mathcal{M}_{16}. By subset inclusion, \\min_{M \\in \\mathcal{M}_{16}} \\mathcal{L}(M) \\le \\min_{M \\in \\mathcal{M}_8} \\mathcal{L}(M). Therefore, r=16 will always outperform or match r=8 on the test set.',
          hiddenFlawType: 'unwarranted_assumption',
          hiddenFlawExplanation: 'The derivation confuses empirical training loss optimization with test generalization (overfitting). In practice, higher rank increases the risk of overfitting small fine-tuning datasets. Additionally, non-convex gradient descent with higher parameters explores different optimization trajectories and does not guarantee finding the global minimum.',
          guidedQuestions: [
            'Does subset containment guarantee that stochastic gradient descent (SGD) reaches the smaller subspace?',
            'What happens to validation loss when parameter capacity exceeds the informational entropy of the training set?'
          ],
          verdictOptions: [
            { id: 'v-lora-1', label: 'Sound: Theoretical subset containment guarantees superiority', isCorrect: false },
            { id: 'v-lora-2', label: 'Flawed: Overfitting and non-convex optimization dynamics mean higher rank can lead to worse test generalization', isCorrect: true },
            { id: 'v-lora-3', label: 'Invalid Step: r=16 cannot represent rank 8 matrices', isCorrect: false }
          ],
          learnerVerdictId: 'v-lora-2',
          isEvaluated: true
        }
      ],
      tradeoffMatrix: {
        approachAName: 'LoRA (r = 8, \\alpha = 16)',
        approachBName: 'DoRA (Weight-Decomposed Low-Rank Adaptation)',
        criteria: [
          { criterion: 'Magnitude vs Direction Decoupling', approachA: 'Couples magnitude and direction in BA', approachB: 'Explicitly normalizes direction and learns scalar norm magnitude', verdict: 'DoRA closer matches full fine-tuning update patterns' },
          { criterion: 'Inference Folding Speed', approachA: 'Instant folding into W_0', approachB: 'Requires unfolding normalized directional matrix during merge', verdict: 'LoRA remains simpler for serving infrastructure' }
        ]
      }
    },
    creating: {
      conjecturePrompt: 'Propose a novel mathematical modification to LoRA rank allocation across Transformer layers.',
      conjectureDraft: 'Singular values of attention projection weights decay significantly faster in late layers than in early feed-forward layers; dynamically allocating rank r_l inversely proportional to spectral decay \\sigma_1 / \\sigma_r will achieve equal perplexity with 40% fewer total adapter parameters.',
      mathematicalPremises: [
        'Layers in deep networks do not contribute equal intrinsic dimensionality to task adaptation',
        'Early layers capture lower-level syntax requiring wider representation, while late layers perform subtle classification adjustment'
      ],
      proposedMechanism: 'Perform a single one-step SVD on pretrained layer weights to compute condition number \\kappa_l, setting layer rank r_l = \\text{clamp}(\\lfloor r_{\\text{base}} \\cdot \\log \\kappa_l \\rfloor, 2, 32).',
      falsificationCriteria: 'If dynamic rank allocation does not beat uniform r=8 allocation at equivalent total parameter budget on MMLU-Pro benchmark by at least 0.5%, the conjecture is rejected.',
      promotedClaimId: 'c2',
      promotedQuestionId: 'q2',
      novelIdeasInspiration: [
        'Explore whether quantization-aware LoRA (QLoRA) double-quantization induces measurable gradient variance spikes',
        'Investigate orthogonal regularization on A and B: \\|A A^T - I\\|_F to prevent redundant rank collapse'
      ]
    }
  },
  {
    id: 'unit-kl-preference',
    title: 'Information Divergence & Preference Alignment (RLHF / DPO)',
    description: 'The mathematics of language model alignment: Shannon entropy, Kullback-Leibler divergence asymmetry, Bradley-Terry preference modeling, and the direct closed-form derivation of Direct Preference Optimization (DPO).',
    category: 'Information Theory',
    difficulty: 'Advanced',
    book: 'Foundations of Deep Reinforcement Learning',
    chapter: 'Chapter 8: Policy Optimization & RLHF',
    section: '8.4 KL Regularization & DPO Objective',
    readingStatus: 'tested',
    keyFormulaLatex: '\\mathcal{L}_{\\text{DPO}}(\\pi_\\theta) = -\\mathbb{E}_{(x, y_w, y_l)} \\left[ \\log \\sigma \\left( \\beta \\log \\frac{\\pi_\\theta(y_w|x)}{\\pi_{\\text{ref}}(y_w|x)} - \\beta \\log \\frac{\\pi_\\theta(y_l|x)}{\\pi_{\\text{ref}}(y_l|x)} \\right) \\right]',
    toyCodeSnippet: `import numpy as np

def dpo_loss(pi_logps_w, pi_logps_l, ref_logps_w, ref_logps_l, beta=0.1):
    """
    Direct Preference Optimization loss computation.
    pi_logps_w: log prob of chosen completion under active policy
    ref_logps_w: log prob of chosen completion under reference model
    """
    # 1. Compute implicit reward logits
    pi_ratio = pi_logps_w - pi_logps_l
    ref_ratio = ref_logps_w - ref_logps_l
    logits = beta * (pi_ratio - ref_ratio)
    
    # 2. Negative log sigmoid loss
    loss = -np.log(1.0 / (1.0 + np.exp(-logits)))
    return np.mean(loss)`,
    tags: ['dpo', 'rlhf', 'kl-divergence', 'probability', 'bradley-terry', 'alignment'],
    prerequisites: ['Probability distributions on discrete token sequences', 'Lagrange multipliers and constrained optimization', 'Log-likelihood and cross-entropy'],
    mathFields: ['Information Theory', 'Convex Optimization', 'Decision Theory'],
    createdAt: 1718200000000,
    updatedAt: 1718250000000,
    author: 'system',
    progress: {
      remembering: 90,
      understanding: 75,
      applying: 60,
      analyzing: 40,
      evaluating: 25,
      creating: 15
    },
    remembering: {
      keyTerms: [
        {
          id: 'kl-t1',
          term: 'Kullback-Leibler (KL) Divergence',
          symbolLatex: 'D_{\\text{KL}}(P \\parallel Q) = \\sum_{x} P(x) \\log \\frac{P(x)}{Q(x)} = \\mathbb{E}_{x \\sim P}\\left[\\log \\frac{P(x)}{Q(x)}\\right]',
          definition: 'A non-symmetric measure of the relative entropy or information lost when probability distribution Q is used to approximate the true distribution P. Always non-negative (Gibbs inequality).',
          mnemonic: 'Expected log-ratio under distribution P; zero if and only if P = Q almost everywhere.',
          recallRating: 'good'
        },
        {
          id: 'kl-t2',
          term: 'Bradley-Terry Preference Model',
          symbolLatex: 'p(y_w \\succ y_l \\mid x) = \\sigma(r(x, y_w) - r(x, y_l)) = \\frac{1}{1 + e^{-(r(x, y_w) - r(x, y_l))}}',
          definition: 'A probability model for paired comparisons, specifying the probability that winning completion y_w is preferred over losing completion y_l given latent scalar reward scores.',
          mnemonic: 'Sigmoid of the reward difference.',
          recallRating: 'easy'
        },
        {
          id: 'kl-t3',
          term: 'DPO Closed-Form Implicit Reward',
          symbolLatex: 'r^*(x, y) = \\beta \\log \\frac{\\pi_\\theta(y \\mid x)}{\\pi_{\\text{ref}}(y \\mid x)} + \\beta \\log Z(x)',
          definition: 'The fundamental mathematical reparameterization enabling Direct Preference Optimization: expressing optimal reward directly as the scaled log-ratio between the active policy and reference model.',
          mnemonic: 'Policy over reference gives reward without training a separate reward model.',
          recallRating: 'hard'
        }
      ],
      axiomsAndIdentities: [
        {
          id: 'kl-ax1',
          name: 'Gibbs Inequality (Non-Negativity of KL)',
          latex: 'D_{\\text{KL}}(P \\parallel Q) \\ge 0, \\quad D_{\\text{KL}}(P \\parallel Q) = 0 \\iff P = Q',
          statement: 'The relative entropy between any two probability distributions is strictly non-negative.',
          significance: 'Guarantees the KL penalty \\beta D_{\\text{KL}}(\\pi_\\theta \\parallel \\pi_{\\text{ref}}) acts as an anchor keeping the aligned model from drifting arbitrarily far from the base model.'
        },
        {
          id: 'kl-ax2',
          name: 'Forward vs Reverse KL Asymmetry',
          latex: 'D_{\\text{KL}}(P \\parallel Q) \\ne D_{\\text{KL}}(Q \\parallel P)',
          statement: 'Forward KL (P \\parallel Q) is "zero-avoiding" (mode-covering); Reverse KL (Q \\parallel P) is "zero-forcing" (mode-seeking).',
          significance: 'RLHF/PPO uses reverse KL \\mathbb{E}_{\\pi_\\theta}[\\log(\\pi_\\theta / \\pi_{\\text{ref}})], forcing \\pi_\\theta to concentrate mass on safe modes where \\pi_{\\text{ref}} > 0.'
        }
      ],
      masteryPercent: 80
    },
    understanding: {
      formalDefinition: {
        statement: 'RLHF seeks to maximize expected reward under a KL constraint: \\max_{\\pi_\\theta} \\mathbb{E}_{x \\sim \\mathcal{D}, y \\sim \\pi_\\theta}[r(x, y)] - \\beta D_{\\text{KL}}(\\pi_\\theta(y \\mid x) \\parallel \\pi_{\\text{ref}}(y \\mid x)). DPO proves this constrained optimization problem has an exact analytical solution \\pi^*(y \\mid x) = \\frac{1}{Z(x)} \\pi_{\\text{ref}}(y \\mid x) \\exp\\left(\\frac{1}{\\beta} r(x, y)\\right), which can be inverted to bypass the reward model entirely.',
        preconditions: [
          'Reference model \\pi_{\\text{ref}} is frozen and supports the same vocabulary',
          'Regularization parameter \\beta > 0',
          'Preferences follow the Bradley-Terry logistic model'
        ],
        notationKey: [
          { symbol: '\\pi_\\theta', meaning: 'Trainable policy (language model)' },
          { symbol: '\\pi_{\\text{ref}}', meaning: 'Frozen reference policy (typically SFT model)' },
          { symbol: '\\beta', meaning: 'Inverse temperature governing strength of KL penalty' },
          { symbol: 'Z(x)', meaning: 'Partition function \\sum_y \\pi_{\\text{ref}}(y \\mid x) \\exp(r(x,y)/\\beta)' }
        ]
      },
      geometricIntuition: {
        visualMetaphor: 'Imagine a rubber band connecting the model \\pi_\\theta to the original reference model \\pi_{\\text{ref}}. As the reward pulls the model toward favorable responses, the rubber band (KL divergence) exerts an increasing restoring force to prevent the model from collapsing into repetitive reward-hacked gibberish.',
        physicalInterpretation: 'In statistical mechanics, this is identical to free energy minimization: balancing energy minimization (maximizing reward) with entropy maximization (staying close to reference distribution).',
        coreInsight: 'DPO eliminates the fragile reinforcement learning loop (actor, critic, value head, PPO clipping) by substituting the analytical relation between reward and policy directly into the loss function!'
      },
      feynmanWorkspace: {
        guidingQuestion: 'Why does DPO optimize the probability of the winning response y_w relative to the reference, rather than just maximizing y_w probability unconditionally?',
        learnerExplanation: 'If you only maximized the probability of y_w, the model would simply memorize frequent words and ignore style or context. By dividing by the reference model probability \\pi_{\\text{ref}}(y_w), DPO only rewards the model for increasing the probability of tokens that specifically make it better than what the baseline would have naturally produced. It measures marginal improvement, not raw likelihood!',
        rubricChecks: [
          { id: 'f-kl-1', prompt: 'Noted that unconditional maximization causes frequency bias / language collapse', verified: true },
          { id: 'f-kl-2', prompt: 'Identified that division by \\pi_{\\text{ref}} measures marginal preference improvement', verified: true },
          { id: 'f-kl-3', prompt: 'Mentioned that partition function Z(x) cancels out in the pairwise ratio', verified: true }
        ]
      },
      conceptDecomposition: [
        {
          part: 'Implicit Reward Log-Ratio',
          role: 'r(x, y) = \\beta \\log(\\pi_\\theta / \\pi_{\\text{ref}})',
          impactIfMissing: 'Requires maintaining separate reward model and reinforcement learning training loop'
        },
        {
          part: 'Margin Term r(x, y_w) - r(x, y_l)',
          role: 'Separates winning and losing completions',
          impactIfMissing: 'Model would have no signal about preference directionality'
        },
        {
          part: 'Sigmoid Loss \\mathcal{L}_{\\text{DPO}}',
          role: 'Smooth cross-entropy optimization',
          impactIfMissing: 'Gradients would not saturate appropriately on easy pairs'
        }
      ]
    },
    applying: {
      workedDerivations: [
        {
          id: 'wd-kl-1',
          title: 'Derivation of DPO Objective from Bradley-Terry Model',
          problemStatement: 'Show how the Bradley-Terry preference probability p(y_w \\succ y_l \\mid x) leads to the DPO loss function without requiring the partition function Z(x).',
          initialAssumptions: [
            'Optimal reward satisfies r^*(x, y) = \\beta \\log \\frac{\\pi_\\theta(y \\mid x)}{\\pi_{\\text{ref}}(y \\mid x)} + \\beta \\log Z(x)',
            'Preference follows p(y_w \\succ y_l \\mid x) = \\sigma(r(x, y_w) - r(x, y_l))'
          ],
          steps: [
            {
              stepIndex: 1,
              label: 'Substitute implicit reward into reward difference',
              mathExpression: 'r^*(x, y_w) - r^*(x, y_l) = \\left[\\beta \\log \\frac{\\pi_\\theta(y_w \\mid x)}{\\pi_{\\text{ref}}(y_w \\mid x)} + \\beta \\log Z(x)\\right] - \\left[\\beta \\log \\frac{\\pi_\\theta(y_l \\mid x)}{\\pi_{\\text{ref}}(y_l \\mid x)} + \\beta \\log Z(x)\\right]',
              justification: 'Direct substitution of the inverted optimal policy equation.'
            },
            {
              stepIndex: 2,
              label: 'Notice exact cancellation of partition function Z(x)',
              mathExpression: 'r^*(x, y_w) - r^*(x, y_l) = \\beta \\log \\frac{\\pi_\\theta(y_w \\mid x)}{\\pi_{\\text{ref}}(y_w \\mid x)} - \\beta \\log \\frac{\\pi_\\theta(y_l \\mid x)}{\\pi_{\\text{ref}}(y_l \\mid x)}',
              justification: 'The intractable partition function \\beta \\log Z(x) depends only on x, so it cancels out completely in the difference!'
            },
            {
              stepIndex: 3,
              label: 'Formulate negative log-likelihood loss',
              mathExpression: '\\mathcal{L}_{\\text{DPO}}(\\pi_\\theta; \\pi_{\\text{ref}}) = -\\mathbb{E}_{(x, y_w, y_l)}\\left[\\log \\sigma\\left(\\beta \\log \\frac{\\pi_\\theta(y_w \\mid x)}{\\pi_{\\text{ref}}(y_w \\mid x)} - \\beta \\log \\frac{\\pi_\\theta(y_l \\mid x)}{\\pi_{\\text{ref}}(y_l \\mid x)}\\right)\\right]',
              justification: 'Maximizing likelihood of human preference choices under the implicit reward.'
            }
          ],
          conclusion: 'The intractable normalization constant Z(x) vanishes entirely in the preference difference, allowing direct optimization with standard supervised cross-entropy backpropagation!'
        }
      ],
      practiceChallenges: [
        {
          id: 'pc-kl-1',
          question: 'If \\beta is set extremely high (e.g. \\beta \\to \\infty) in DPO, what behavior is enforced on the model?',
          mathContext: 'Consider what happens to the KL divergence penalty \\beta D_{\\text{KL}}(\\pi_\\theta \\parallel \\pi_{\\text{ref}}).',
          hints: ['As \\beta \\to \\infty, the penalty for deviating from \\pi_{\\text{ref}} dominates the loss.'],
          options: [
            'The model collapses to exact replication of the frozen reference model \\pi_{\\text{ref}}',
            'The model produces random gibberish',
            'The model becomes infinitely aggressive in prioritizing winning tokens',
            'The loss explodes to NaN immediately'
          ],
          correctOptionIndex: 0,
          solutionWalkthrough: 'As \\beta \\to \\infty, any deviation from \\pi_{\\text{ref}} incurs infinite penalty, locking \\pi_\\theta to \\pi_{\\text{ref}}. Conversely, as \\beta \\to 0, the model ignores the reference distribution completely and tends toward over-optimization/reward hacking.'
        }
      ],
      sandboxConfig: {
        sandboxType: 'kl_divergence',
        title: 'Interactive KL Divergence & Beta Alignment Lab',
        equationLatex: 'D_{\\text{KL}}(P \\parallel Q) = \\sum p_i \\log\\left(\\frac{p_i}{q_i}\\right), \\quad \\text{Weight} = \\sigma\\left(\\beta \\log \\frac{\\pi_\\theta}{\\pi_{\\text{ref}}}\\right)',
        parameters: [
          { id: 'beta', label: 'Beta Regularizer (\\beta)', symbol: '\\beta', min: 0.05, max: 1.0, step: 0.05, defaultValue: 0.1, unit: '', description: 'Strength of KL constraint' },
          { id: 'ratioWin', label: 'Policy / Ref Ratio (y_w)', symbol: '\\pi_\\theta / \\pi_{\\text{ref}}', min: 0.5, max: 10.0, step: 0.5, defaultValue: 2.5, unit: '', description: 'Winning token probability multiplier' },
          { id: 'ratioLose', label: 'Policy / Ref Ratio (y_l)', symbol: '\\pi_\\theta / \\pi_{\\text{ref}}', min: 0.1, max: 2.0, step: 0.1, defaultValue: 0.4, unit: '', description: 'Losing token probability multiplier' }
        ]
      }
    },
    analyzing: {
      structuralComponents: [
        {
          id: 'kl-sc1',
          component: 'Winning Sequence Likelihood Ratio',
          formulaSnippet: '\\hat{r}_w = \\beta \\log(\\pi_\\theta(y_w \\mid x) / \\pi_{\\text{ref}}(y_w \\mid x))',
          mathematicalFunction: 'Measures positive reinforcement offset from base capability',
          invariantPreserved: 'Anchor to pre-trained base capability'
        },
        {
          id: 'kl-sc2',
          component: 'Losing Sequence Likelihood Ratio',
          formulaSnippet: '\\hat{r}_l = \\beta \\log(\\pi_\\theta(y_l \\mid x) / \\pi_{\\text{ref}}(y_l \\mid x))',
          mathematicalFunction: 'Measures negative reinforcement offset from base capability',
          invariantPreserved: 'Symmetric penalty on undesirable behaviors'
        }
      ],
      assumptionStressTests: [
        {
          id: 'kl-ast1',
          assumption: 'Human preference data adheres strictly to the Bradley-Terry transitivity model (if A > B and B > C, then A > C)',
          failureMode: 'Human evaluators exhibit intransitive preferences (Condorcet cycles where A > B, B > C, but C > A due to differing evaluators)',
          mathematicalConsequence: 'No coherent scalar reward function r(x,y) exists that can satisfy the dataset; the optimization experiences gradient oscillation and instability',
          llmResearchImplication: 'Led to Nash Learning from Human Feedback (NLHF) and KTO (Kahneman-Tversky Optimization) to handle non-transitive or unpaired preference data.'
        }
      ],
      contrastiveAnalysis: {
        titleA: 'PPO (Policy Gradient RLHF)',
        titleB: 'DPO (Direct Preference Optimization)',
        dimensions: [
          {
            dimension: 'Models Required in GPU Memory',
            conceptA: '4 models: Actor, Critic (Value), Reward Model, Reference Model',
            conceptB: '2 models: Active Policy and Frozen Reference Policy',
            mathematicalDivergence: 'Eliminates value function estimation errors and high variance'
          },
          {
            dimension: 'Optimization Stability',
            conceptA: 'Requires clipping \\epsilon, generalized advantage estimation (GAE), careful hyperparameter tuning',
            conceptB: 'Standard supervised cross-entropy classification on paired data',
            mathematicalDivergence: 'Exact convex loss formulation with monotonic gradients'
          }
        ]
      }
    },
    evaluating: {
      critiqueChallenges: [
        {
          id: 'crit-kl-1',
          title: 'The "DPO Completely Eliminates Out-of-Distribution Degradation" Myth',
          allegedClaim: 'A technical blog claims: "Because DPO directly optimizes on human-labeled pairs and avoids online exploration, it cannot generate hallucinatory responses or drift out-of-distribution."',
          presentedDerivation: 'The DPO loss penalizes \\pi_\\theta through the implicit KL divergence. Since the training data consists only of vetted human pairwise completions (x, y_w, y_l), the model is never exposed to ungrounded trajectories during policy gradient rollouts, preventing reward hacking.',
          hiddenFlawType: 'domain_mismatch',
          hiddenFlawExplanation: 'Because DPO is an offline algorithm, the model is never evaluated on tokens it generates autoregressively at test time (exposure bias). If the policy strays slightly off the offline data distribution, errors cascade exponentially, leading to repetitive loops or sudden tone collapse (known as the offline alignment gap).',
          guidedQuestions: [
            'Does offline training verify what the model produces when sampling tokens autoregressively?',
            'What happens when the test-time prompt produces an initial token not present in the offline pairs?'
          ],
          verdictOptions: [
            { id: 'v-kl-1', label: 'Sound: Offline pairs contain all necessary supervision', isCorrect: false },
            { id: 'v-kl-2', label: 'Flawed: Offline training suffers from exposure bias; without on-policy exploration, errors compound', isCorrect: true },
            { id: 'v-kl-3', label: 'Invalid Step: KL divergence is not present in DPO', isCorrect: false }
          ],
          learnerVerdictId: 'v-kl-2',
          isEvaluated: true
        }
      ],
      tradeoffMatrix: {
        approachAName: 'Standard DPO',
        approachBName: 'Online / Iterative DPO',
        criteria: [
          { criterion: 'Compute & Pipeline Simplicity', approachA: 'Single training epoch over static dataset', approachB: 'Repeated generation, annotation, and retraining loops', verdict: 'Standard DPO is vastly cheaper and simpler to train' },
          { criterion: 'Protection against Length Exploitation', approachA: 'Vulnerable to reward hacking longer answers', approachB: 'Active exploration penalizes verbose yet hollow responses', verdict: 'Online DPO significantly mitigates length bias' }
        ]
      }
    },
    creating: {
      conjecturePrompt: 'Formulate an analytical solution or architectural modification to resolve length bias in DPO.',
      conjectureDraft: 'Normalizing the implicit reward log-ratio by sequence length \\frac{1}{|y|^\\gamma} with \\gamma \\in [0.5, 1.0] provably cancels out the monotonic length advantage while preserving preference discrimination.',
      mathematicalPremises: [
        'Autoregressive log-probabilities scale linearly with sequence length |y|',
        'Human raters often prefer longer responses due to surface verbosity, contaminating the Bradley-Terry ranking'
      ],
      proposedMechanism: 'Substitute length-normalized reward \\bar{r}(x, y) = \\frac{\\beta}{|y|^\\gamma} \\log \\frac{\\pi_\\theta(y \\mid x)}{\\pi_{\\text{ref}}(y \\mid x)} into the sigmoid difference.',
      falsificationCriteria: 'If length-normalized DPO reduces win rate on length-neutral evaluation benchmarks (e.g. AlpacaEval length-controlled) by >1.0%, the conjecture is rejected.',
      promotedClaimId: 'c3',
      promotedQuestionId: 'q3',
      novelIdeasInspiration: [
        'Explore conservative DPO using Wasserstein distance instead of KL divergence for heavy-tailed token distributions',
        'Investigate token-level credit assignment in preference pairs rather than whole-sequence scalar rewards'
      ]
    }
  },
  {
    id: 'unit-adamw-dynamics',
    title: 'AdamW Second-Moment Dynamics & Loss Curvature',
    description: 'The mathematics of deep learning optimization: exponential moving averages, bias correction derivations, preconditioning via the empirical Fisher information matrix, and decoupled weight decay.',
    category: 'Optimization & Calculus',
    difficulty: 'Intermediate',
    book: 'Understanding Deep Learning (Simon J.D. Prince)',
    chapter: 'Chapter 6: Optimization & Gradient Descent',
    section: '6.4 Adaptive Moments with Decoupled Weight Decay',
    readingStatus: 'reading',
    keyFormulaLatex: '\\theta_{t+1} = \\theta_t - \\eta_t \\left( \\frac{m_t}{\\sqrt{v_t} + \\epsilon} + \\lambda \\theta_t \\right)',
    toyCodeSnippet: `import numpy as np

def adamw_step(param, grad, m, v, t, lr=1e-3, beta1=0.9, beta2=0.999, eps=1e-8, weight_decay=0.01):
    """
    Single AdamW optimization step with decoupled weight decay.
    """
    # 1. Decay the first and second moment running averages
    m = beta1 * m + (1.0 - beta1) * grad
    v = beta2 * v + (1.0 - beta2) * (grad ** 2)
    
    # 2. Bias corrections
    m_hat = m / (1.0 - beta1 ** t)
    v_hat = v / (1.0 - beta2 ** t)
    
    # 3. Decoupled weight decay update + adaptive gradient step
    param = param - lr * weight_decay * param
    param = param - lr * (m_hat / (np.sqrt(v_hat) + eps))
    return param, m, v`,
    tags: ['optimization', 'adamw', 'gradient-descent', 'momentum', 'curvature', 'hessian'],
    prerequisites: ['Taylor series expansion of multivariate loss', 'Gradient descent dynamics', 'Variance of exponentially weighted moving averages'],
    mathFields: ['Convex and Non-Convex Optimization', 'Stochastic Approximation', 'Matrix Conditioning'],
    createdAt: 1718300000000,
    updatedAt: 1718350000000,
    author: 'system',
    progress: {
      remembering: 100,
      understanding: 85,
      applying: 70,
      analyzing: 50,
      evaluating: 30,
      creating: 10
    },
    remembering: {
      keyTerms: [
        {
          id: 'adam-t1',
          term: 'Decoupled Weight Decay (AdamW)',
          symbolLatex: '\\theta_{t+1} = \\theta_t - \\eta_t \\lambda \\theta_t - \\frac{\\eta_t}{\\sqrt{\\hat{v}_t} + \\epsilon} \\hat{m}_t',
          definition: 'A modification to standard Adam where L2 weight decay is applied directly to the parameters rather than added to the gradient vector g_t, preventing parameters with large historical gradients from having their regularization suppressed.',
          mnemonic: 'Subtract lambda * theta directly from the weights; do not dilute it into gradients.',
          recallRating: 'easy'
        },
        {
          id: 'adam-t2',
          term: 'Bias Correction Factors',
          symbolLatex: '\\hat{m}_t = \\frac{m_t}{1 - \\beta_1^t}, \\quad \\hat{v}_t = \\frac{v_t}{1 - \\beta_2^t}',
          definition: 'Multipliers correcting for the fact that exponential moving averages initialized at zero are severely biased toward zero during the initial iterations of training.',
          mnemonic: 'Dividing by 1 - beta^t counteracts the zero initialization drag early in training.',
          recallRating: 'good'
        }
      ],
      axiomsAndIdentities: [
        {
          id: 'adam-ax1',
          name: 'Bias Correction Derivation Identity',
          latex: '\\mathbb{E}[v_t] = \\mathbb{E}[g_t^2] (1 - \\beta_2^t) \\implies \\mathbb{E}[\\hat{v}_t] = \\mathbb{E}[g_t^2]',
          statement: 'Unrolling the recurrence v_t = \\beta_2 v_{t-1} + (1 - \\beta_2) g_t^2 with v_0 = 0 gives an expected value scaled by the geometric series sum \\sum_{i=1}^t \\beta_2^{t-i}(1-\\beta_2) = 1 - \\beta_2^t.',
          significance: 'Ensures the second-moment estimator is mathematically unbiased from step 1.'
        }
      ],
      masteryPercent: 88
    },
    understanding: {
      formalDefinition: {
        statement: 'AdamW maintains two running statistics of the stochastic gradient g_t: first moment m_t = \\beta_1 m_{t-1} + (1-\\beta_1)g_t and second raw moment v_t = \\beta_2 v_{t-1} + (1-\\beta_2)g_t^2. It scales the update by the inverse square root of the diagonal second moment, acting as an empirical diagonal preconditioning of the loss Hessian.',
        preconditions: [
          'Hyperparameters 0 \\le \\beta_1 < 1, 0 \\le \\beta_2 < 1',
          'Small numerical stability constant \\epsilon > 0 (typically 10^{-8} or 10^{-6})',
          'Learning rate \\eta_t > 0 and weight decay coefficient \\lambda \\ge 0'
        ],
        notationKey: [
          { symbol: 'm_t', meaning: 'Exponential moving average of past gradients (momentum)' },
          { symbol: 'v_t', meaning: 'Exponential moving average of past squared gradients (uncentered variance)' },
          { symbol: '\\hat{m}_t, \\hat{v}_t', meaning: 'Bias-corrected moment estimates' },
          { symbol: '\\lambda', meaning: 'Decoupled weight decay coefficient' }
        ]
      },
      geometricIntuition: {
        visualMetaphor: 'Imagine a steep canyon where the loss drops rapidly along the walls but slopes gently along the riverbed. Standard gradient descent bounces uncontrollably between the steep walls. AdamW divides each coordinate by its gradient variance: steep directions are dampened, while gentle directions are amplified, accelerating straight down the canyon floor.',
        physicalInterpretation: 'Acts as an adaptive step size per parameter: parameters that frequently receive large, noisy gradients take smaller cautious steps; parameters with rare, sparse updates take larger confident steps.',
        coreInsight: 'Standard Adam applied L2 regularization by adding \\lambda \\theta to the gradient g_t. This meant parameters with huge past gradients v_t had their weight decay penalized by \\frac{1}{\\sqrt{v_t}}, essentially turning off regularization for the most active weights! AdamW fixes this.'
      },
      feynmanWorkspace: {
        guidingQuestion: 'Why did standard Adam fail with L2 regularization, and why does decoupled weight decay (AdamW) fix it?',
        learnerExplanation: 'In standard SGD, adding \\lambda \\theta to the gradient is mathematically identical to weight decay. But in Adam, the gradient is divided by \\sqrt{v_t}. If a parameter has huge gradients, \\sqrt{v_t} is huge, so the weight decay term \\lambda \\theta / \\sqrt{v_t} becomes tiny! AdamW separates weight decay from the gradient, subtracting \\eta \\lambda \\theta directly from the weights so all parameters get properly regularized regardless of gradient scale.',
        rubricChecks: [
          { id: 'f-adam-1', prompt: 'Explained how division by \\sqrt{v_t} suppresses regularization in standard Adam', verified: true },
          { id: 'f-adam-2', prompt: 'Clarified the distinction between L2 gradient penalty and weight decay', verified: true },
          { id: 'f-adam-3', prompt: 'Mentioned that AdamW applies decay directly to parameters', verified: true }
        ]
      },
      conceptDecomposition: [
        {
          part: 'First Moment m_t',
          role: 'Velocity and noise smoothing',
          impactIfMissing: 'High oscillation in stochastic batches'
        },
        {
          part: 'Second Moment v_t',
          role: 'Coordinate-wise curvature preconditioning',
          impactIfMissing: 'Sensitive to arbitrary gradient feature scales'
        },
        {
          part: 'Decoupled Decay \\eta \\lambda \\theta',
          role: 'Norm capacity regularization',
          impactIfMissing: 'Weight norms explode over long pre-training runs'
        }
      ]
    },
    applying: {
      workedDerivations: [
        {
          id: 'wd-adam-1',
          title: 'Derivation of First-Moment Bias Correction (1 - \\beta_1^t)',
          problemStatement: 'Given m_0 = 0 and m_t = \\beta_1 m_{t-1} + (1 - \\beta_1) g_t, prove that \\mathbb{E}[m_t] = \\mathbb{E}[g_t] (1 - \\beta_1^t) assuming the true gradient expectation \\mathbb{E}[g_i] = \\mathbb{E}[g_t] is approximately stationary.',
          initialAssumptions: ['Initial moment m_0 = 0', 'Gradient expectations are stationary over window'],
          steps: [
            {
              stepIndex: 1,
              label: 'Unroll the recurrence',
              mathExpression: 'm_t = (1 - \\beta_1) \\sum_{i=1}^t \\beta_1^{t-i} g_i',
              justification: 'Repeated substitution of m_{k} = \\beta_1 m_{k-1} + (1-\\beta_1) g_k down to m_0 = 0.'
            },
            {
              stepIndex: 2,
              label: 'Take expectations across stochastic batches',
              mathExpression: '\\mathbb{E}[m_t] = \\mathbb{E}\\left[(1 - \\beta_1) \\sum_{i=1}^t \\beta_1^{t-i} g_i\\right] = (1 - \\beta_1) \\sum_{i=1}^t \\beta_1^{t-i} \\mathbb{E}[g_i]',
              justification: 'Linearity of expectation operator.'
            },
            {
              stepIndex: 3,
              label: 'Apply geometric series summation',
              mathExpression: '\\sum_{i=1}^t \\beta_1^{t-i} = 1 + \\beta_1 + \\beta_1^2 + \\dots + \\beta_1^{t-1} = \\frac{1 - \\beta_1^t}{1 - \\beta_1}',
              justification: 'Finite geometric series formula \\sum_{k=0}^{t-1} r^k = \\frac{1 - r^t}{1 - r}.'
            },
            {
              stepIndex: 4,
              label: 'Multiply by (1 - \\beta_1)',
              mathExpression: '\\mathbb{E}[m_t] = (1 - \\beta_1) \\cdot \\frac{1 - \\beta_1^t}{1 - \\beta_1} \\cdot \\mathbb{E}[g_t] = (1 - \\beta_1^t) \\mathbb{E}[g_t]',
              justification: 'The factor (1 - \\beta_1) cancels out cleanly, leaving (1 - \\beta_1^t).'
            }
          ],
          conclusion: 'Therefore, defining \\hat{m}_t = \\frac{m_t}{1 - \\beta_1^t} gives \\mathbb{E}[\\hat{m}_t] = \\mathbb{E}[g_t], eliminating the zero initialization bias.'
        }
      ],
      practiceChallenges: [
        {
          id: 'pc-adam-1',
          question: 'At step t = 1 with \\beta_2 = 0.999, what is the value of the bias correction divisor 1 - \\beta_2^t?',
          mathContext: 'Compute 1 - (0.999)^1.',
          hints: ['Calculate 1 - 0.999'],
          options: [
            '0.001 (which multiplies v_1 by 1000)',
            '0.999 (which leaves v_1 almost unchanged)',
            '1.000',
            '0.0001'
          ],
          correctOptionIndex: 0,
          solutionWalkthrough: '1 - 0.999^1 = 0.001. Dividing v_1 by 0.001 scales it up by a factor of 1000, which is crucial because v_1 = (1-0.999)g_1^2 = 0.001 g_1^2 would otherwise be 1000x too small.'
        }
      ],
      sandboxConfig: {
        sandboxType: 'adamw_momentum',
        title: 'AdamW Moment & Effective Step Size Explorer',
        equationLatex: '\\Delta \\theta = \\frac{\\eta}{\\sqrt{\\hat{v}_t} + \\epsilon} \\hat{m}_t + \\eta \\lambda \\theta',
        parameters: [
          { id: 'lr', label: 'Learning Rate (\\eta)', symbol: '\\eta', min: 0.0001, max: 0.01, step: 0.0005, defaultValue: 0.001, unit: '', description: 'Base step size' },
          { id: 'beta1', label: 'Beta 1 (\\beta_1)', symbol: '\\beta_1', min: 0.7, max: 0.99, step: 0.01, defaultValue: 0.9, unit: '', description: 'Momentum decay' },
          { id: 'beta2', label: 'Beta 2 (\\beta_2)', symbol: '\\beta_2', min: 0.9, max: 0.9999, step: 0.005, defaultValue: 0.999, unit: '', description: 'Second moment decay' },
          { id: 'weightDecay', label: 'Weight Decay (\\lambda)', symbol: '\\lambda', min: 0.0, max: 0.2, step: 0.01, defaultValue: 0.01, unit: '', description: 'Decoupled weight regularization' }
        ]
      }
    },
    analyzing: {
      structuralComponents: [
        {
          id: 'adam-sc1',
          component: 'First-Moment Filter',
          formulaSnippet: 'm_t = \\beta_1 m_{t-1} + (1-\\beta_1) g_t',
          mathematicalFunction: 'Low-pass exponential smoothing of gradient vector',
          invariantPreserved: 'Directional continuity across noisy mini-batches'
        },
        {
          id: 'adam-sc2',
          component: 'Second-Moment Hessian Estimator',
          formulaSnippet: 'v_t = \\beta_2 v_{t-1} + (1-\\beta_2) g_t \\odot g_t',
          mathematicalFunction: 'Estimates uncentered diagonal of the Fisher information matrix',
          invariantPreserved: 'Curvature-adjusted step scaling'
        }
      ],
      assumptionStressTests: [
        {
          id: 'adam-ast1',
          assumption: 'The diagonal approximation \\text{diag}(F) accurately approximates the true loss curvature',
          failureMode: 'Heavy off-diagonal correlation (rotated ill-conditioned ravines)',
          mathematicalConsequence: 'Adam cannot perform coordinate rotations, leading to slow zigzagging convergence compared to second-order methods like Shampoo or K-FAC',
          llmResearchImplication: 'Spurred recent frontier work on SOAP (Second Order Optimizer for Attention) and Scalable Shampoo for massive LLM training runs.'
        }
      ],
      contrastiveAnalysis: {
        titleA: 'AdamW',
        titleB: 'SGD with Nesterov Momentum',
        dimensions: [
          {
            dimension: 'Scale Sensitivity',
            conceptA: 'Invariant to coordinate scaling: multiplying gradient by 10x does not change step size',
            conceptB: 'Directly proportional to gradient magnitude: 10x gradient = 10x step',
            mathematicalDivergence: 'Division by \\sqrt{v_t} normalizes magnitude out of the update'
          },
          {
            dimension: 'Memory Overhead',
            conceptA: '2 state vectors per parameter (8 bytes/param in float32)',
            conceptB: '1 state vector per parameter (4 bytes/param)',
            mathematicalDivergence: 'AdamW doubles the optimizer memory requirement'
          }
        ]
      }
    },
    evaluating: {
      critiqueChallenges: [
        {
          id: 'crit-adam-1',
          title: 'The "Epsilon (\\epsilon) is Just a Division-by-Zero Guard" Misconception',
          allegedClaim: 'A practitioner claims: "The \\epsilon parameter in AdamW is purely a numerical guard to prevent zero division in IEEE-754 floats; setting it to 10^{-16} instead of 10^{-8} or 10^{-6} is strictly better because it adds less distortion."',
          presentedDerivation: 'The term \\frac{1}{\\sqrt{\\hat{v}_t} + \\epsilon} is designed to compute \\hat{v}_t^{-1/2}. Since \\epsilon is an artifact of computational physics, minimizing \\epsilon toward machine epsilon \\epsilon_{\\text{mach}} preserves theoretical purity.',
          hiddenFlawType: 'boundary_failure',
          hiddenFlawExplanation: 'In mixed-precision (FP16 / BF16), if \\epsilon is too small, \\sqrt{\\hat{v}_t} + \\epsilon can underflow to zero when gradients are small, triggering NaNs. Furthermore, \\epsilon acts as an implicit upper bound on maximum effective step size \\frac{\\eta}{\\epsilon}; setting \\epsilon too small causes catastrophic gradient explosion when a parameter experiences sudden zero variance!',
          guidedQuestions: [
            'What is the maximum step size when \\hat{v}_t = 0?',
            'What happens in BF16 when numbers smaller than 10^{-8} are added?'
          ],
          verdictOptions: [
            { id: 'v-adam-1', label: 'Sound: Epsilon has no functional role other than IEEE float protection', isCorrect: false },
            { id: 'v-adam-2', label: 'Flawed: Epsilon bounds the maximum step size and prevents underflow in mixed-precision training', isCorrect: true },
            { id: 'v-adam-3', label: 'Invalid Step: Epsilon is subtracted rather than added', isCorrect: false }
          ],
          learnerVerdictId: 'v-adam-2',
          isEvaluated: true
        }
      ],
      tradeoffMatrix: {
        approachAName: 'AdamW',
        approachBName: 'Muon (Momentum Orthogonalized by Newton-Schulz)',
        criteria: [
          { criterion: 'Matrix Geometry Preservation', approachA: 'Treats 2D weight matrices as flat vectors of independent coordinates', approachB: 'Preserves 2D matrix structure via Newton-Schulz orthogonalization', verdict: 'Muon produces faster pre-training convergence on internal Transformer matrices' },
          { criterion: 'Universality across Layers', approachA: 'Works on 1D biases, embeddings, and 2D projections identically', approachB: 'Strictly restricted to 2D matrices \\ge 128 \\times 128', verdict: 'AdamW is required for embeddings and 1D vector parameters' }
        ]
      }
    },
    creating: {
      conjecturePrompt: 'Propose a testable hypothesis linking second-moment decay \\beta_2 to sequence length scaling.',
      conjectureDraft: 'Increasing \\beta_2 from 0.999 to 0.9999 when pretraining on sequence lengths >32k tokens prevents rare high-entropy attention spikes from prematurely dampening learning rate across key projection layers.',
      mathematicalPremises: [
        'Longer contexts produce rarer, high-magnitude outlier gradients',
        'A smaller effective window \\frac{1}{1 - \\beta_2} over-reacts to isolated token outliers'
      ],
      proposedMechanism: 'Tie \\beta_2 dynamically to sequence length: \\beta_2(L) = 1 - \\frac{1}{10 \\cdot L}.',
      falsificationCriteria: 'If long-context perplexity on PG19 benchmark is worse with sequence-scaled \\beta_2 than standard fixed \\beta_2=0.999, the conjecture is falsified.',
      promotedClaimId: 'c4',
      promotedQuestionId: 'q3',
      novelIdeasInspiration: [
        'Analyze layer-wise adaptive momentum: higher \\beta_1 on deeper layers',
        'Investigate spectral norm clipping integrated directly into the AdamW preconditioning step'
      ]
    }
  }
];
