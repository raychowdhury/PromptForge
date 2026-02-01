import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const FRAMEWORKS = {
  rtf: { name: 'RTF', desc: 'Role, Task, Format', icon: '🎭' },
  care: { name: 'CARE', desc: 'Context, Action, Result, Example', icon: '💡' },
  risen: { name: 'RISEN', desc: 'Role, Instructions, Steps, End, Narrowing', icon: '📈' },
  cot: { name: 'Chain of Thought', desc: 'Step-by-step reasoning', icon: '🔗' },
  fewshot: { name: 'Few-Shot', desc: 'Learning from examples', icon: '📚' }
};

const TONES = {
  professional: { name: 'Professional', icon: '👔', color: '#3b82f6' },
  casual: { name: 'Casual', icon: '😊', color: '#10b981' },
  persuasive: { name: 'Persuasive', icon: '🎯', color: '#f59e0b' },
  academic: { name: 'Academic', icon: '🎓', color: '#8b5cf6' },
  creative: { name: 'Creative', icon: '🎨', color: '#ec4899' },
  friendly: { name: 'Friendly', icon: '🤝', color: '#06b6d4' }
};

const TEMPLATES = {
  sales_email: {
    name: 'Sales Email',
    icon: '📧',
    input: 'Write a cold outreach email to potential clients for [product/service]',
    variables: ['product/service', 'company_name', 'recipient_role']
  },
  blog_post: {
    name: 'Blog Post',
    icon: '✍️',
    input: 'Write a blog post about [topic] for [audience]',
    variables: ['topic', 'audience', 'word_count']
  },
  code_review: {
    name: 'Code Review',
    icon: '👨‍💻',
    input: 'Review this code for [language] and suggest improvements',
    variables: ['language', 'focus_areas']
  },
  product_description: {
    name: 'Product Description',
    icon: '🛍️',
    input: 'Create a compelling product description for [product]',
    variables: ['product', 'target_audience', 'key_features']
  },
  social_post: {
    name: 'Social Media Post',
    icon: '📱',
    input: 'Create a viral social media post about [topic] for [platform]',
    variables: ['topic', 'platform', 'goal']
  },
  explain_concept: {
    name: 'Explain Concept',
    icon: '💡',
    input: 'Explain [concept] to [audience] with examples',
    variables: ['concept', 'audience', 'complexity_level']
  }
};

const WEBLLM_MODELS = [
  { id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC', name: 'Llama 3.2 1B', size: '0.6 GB', speed: 'Fast' },
  { id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC', name: 'Llama 3.2 3B', size: '1.8 GB', speed: 'Medium' },
  { id: 'SmolLM2-1.7B-Instruct-q4f32_1-MLC', name: 'SmolLM2 1.7B', size: '1 GB', speed: 'Fast' },
  { id: 'Phi-3.5-mini-instruct-q4f32_1-MLC', name: 'Phi 3.5 Mini', size: '2.2 GB', speed: 'Medium' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC', name: 'Qwen 2.5 1.5B', size: '0.9 GB', speed: 'Fast' },
  { id: 'gemma-2-2b-it-q4f32_1-MLC', name: 'Gemma 2 2B', size: '1.4 GB', speed: 'Fast' },
];

const LANGUAGES = {
  en: 'English',
  es: 'Spanish', 
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  bn: 'Bengali (বাংলা)'
};

// ============================================
// PROMPT ENGINE
// ============================================

const TASK_PATTERNS = {
  writing: {
    patterns: ['write', 'draft', 'compose', 'create', 'author'],
    subtypes: {
      blog: ['blog', 'article', 'post', 'content'],
      email: ['email', 'mail', 'message', 'letter', 'outreach'],
      social: ['linkedin', 'twitter', 'instagram', 'social'],
      marketing: ['ad', 'copy', 'marketing', 'sales', 'promo'],
      technical: ['documentation', 'docs', 'readme', 'guide'],
      creative: ['story', 'poem', 'script', 'narrative']
    }
  },
  analysis: {
    patterns: ['analyze', 'review', 'evaluate', 'assess', 'examine'],
    subtypes: { data: ['data', 'numbers', 'metrics'], business: ['business', 'market', 'competitor'] }
  },
  summarize: {
    patterns: ['summarize', 'summary', 'condense', 'brief', 'tldr'],
    subtypes: { document: ['document', 'report', 'paper'], meeting: ['meeting', 'call', 'notes'] }
  },
  explain: {
    patterns: ['explain', 'describe', 'clarify', 'teach', 'break down'],
    subtypes: { concept: ['concept', 'idea', 'theory'], technical: ['code', 'technical', 'programming'] }
  },
  generate: {
    patterns: ['generate', 'list', 'brainstorm', 'ideas', 'suggest'],
    subtypes: { ideas: ['ideas', 'concepts', 'suggestions'], names: ['names', 'titles', 'headlines'] }
  },
  code: {
    patterns: ['code', 'program', 'script', 'function', 'build'],
    subtypes: { web: ['web', 'website', 'html', 'react'], backend: ['api', 'server', 'database'] }
  }
};

const ROLES = {
  writing: {
    blog: "an experienced content strategist and SEO expert",
    email: "a professional business communication specialist",
    social: "a social media marketing expert",
    marketing: "a senior conversion copywriter",
    technical: "a technical documentation specialist",
    creative: "a creative writer with engaging style",
    default: "a skilled professional writer"
  },
  analysis: { default: "an analytical expert with data expertise" },
  summarize: { default: "a professional editor skilled at synthesis" },
  explain: { default: "an educator who makes complex ideas simple" },
  generate: { default: "a creative strategist and ideation expert" },
  code: { default: "a senior software developer" }
};

function detectTaskType(input) {
  const lower = input.toLowerCase();
  for (const [taskType, config] of Object.entries(TASK_PATTERNS)) {
    if (config.patterns.some(p => lower.includes(p))) {
      let subtype = 'default';
      for (const [sub, keywords] of Object.entries(config.subtypes)) {
        if (keywords.some(k => lower.includes(k))) { subtype = sub; break; }
      }
      return { taskType, subtype };
    }
  }
  return { taskType: 'writing', subtype: 'default' };
}

function extractVariables(input) {
  const matches = input.match(/\[([^\]]+)\]/g) || [];
  return matches.map(m => m.slice(1, -1));
}

function calculatePromptScore(input) {
  let score = 0;
  const tips = [];
  
  if (input.length > 20) score += 15;
  if (input.length > 50) score += 15;
  if (input.length > 100) score += 10;
  
  const hasTask = Object.values(TASK_PATTERNS).some(t => t.patterns.some(p => input.toLowerCase().includes(p)));
  if (hasTask) score += 20;
  else tips.push('Add a clear action verb (write, analyze, create)');
  
  if (/for\s+(beginners?|experts?|developers?|managers?|students?)/i.test(input)) score += 15;
  else tips.push('Specify your target audience');
  
  if (/about|regarding|on|for/i.test(input)) score += 10;
  else tips.push('Add context about the topic');
  
  if (/\d+/.test(input)) score += 5;
  if (/\[.+\]/.test(input)) score += 5;
  
  if (/professional|casual|friendly|formal|persuasive/i.test(input)) score += 10;
  else tips.push('Consider specifying the desired tone');
  
  return { score: Math.min(score, 100), tips: tips.slice(0, 3) };
}

function generatePrompt(input, options = {}) {
  const { framework = 'rtf', tone = 'professional', length = 50, language = 'en', customVars = {} } = options;
  const { taskType, subtype } = detectTaskType(input);
  const role = ROLES[taskType]?.[subtype] || ROLES[taskType]?.default || "a helpful expert";
  
  let processedInput = input;
  Object.entries(customVars).forEach(([key, value]) => {
    if (value) processedInput = processedInput.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
  });
  
  const toneDesc = {
    professional: 'professional, clear, and business-appropriate',
    casual: 'casual, friendly, and conversational',
    persuasive: 'persuasive, compelling, and action-oriented',
    academic: 'academic, formal, and well-researched',
    creative: 'creative, engaging, and unique',
    friendly: 'warm, approachable, and helpful'
  };
  
  const lengthDesc = length <= 25 ? 'concise (under 150 words)' : 
                     length <= 50 ? 'moderate (150-300 words)' : 
                     length <= 75 ? 'detailed (300-500 words)' : 'comprehensive (500+ words)';
  
  const langNote = language !== 'en' ? `\n\n**Language:** Respond in ${LANGUAGES[language]}.` : '';
  const languageQualityNote = language === 'bn'
    ? '\n\n**Bangla Quality:** Use natural, fluent Bangla with correct grammar and punctuation. Avoid repetition, garbled words, or mixed-language fragments.'
    : '';
  
  let prompt = '';
  
  switch (framework) {
    case 'care':
      prompt = `## Context\nYou are ${role}. The user needs assistance with the following.\n${langNote}${languageQualityNote}\n\n## Action\n${processedInput}\n\n## Requirements\n- **Tone:** ${toneDesc[tone]}\n- **Length:** ${lengthDesc}\n\n## Result Expected\nProvide a complete, polished response that fully addresses the request.`;
      break;
      
    case 'risen':
      prompt = `## Role\nAct as ${role}.\n\n## Instructions\n${processedInput}\n\n**Tone:** ${toneDesc[tone]}\n**Length:** ${lengthDesc}\n${langNote}${languageQualityNote}\n\n## Steps\n1. Understand the core objective\n2. Structure response logically  \n3. Include relevant examples\n4. Review for clarity\n\n## End Goal\nDeliver high-quality response that provides genuine value.`;
      break;
      
    case 'cot':
      prompt = `Act as ${role}.\n${langNote}${languageQualityNote}\n\n## Task\n${processedInput}\n\nThink step-by-step:\n1. What exactly is being asked?\n2. What key points to cover?\n3. What structure makes sense?\n\n**Tone:** ${toneDesc[tone]}\n**Length:** ${lengthDesc}\n\nProvide your response:`;
      break;
      
    case 'fewshot':
      prompt = `Act as ${role}.\n${langNote}${languageQualityNote}\n\n## Task\n${processedInput}\n\n**Tone:** ${toneDesc[tone]}\n**Length:** ${lengthDesc}\n\nGood response example:\n✅ Clear and structured\n✅ Addresses the request\n✅ Actionable details\n\nProvide your response:`;
      break;
      
    default:
      prompt = `## Role\nAct as ${role}.\n${langNote}${languageQualityNote}\n\n## Task\n${processedInput}\n\n### Requirements\n- **Tone:** ${toneDesc[tone]}\n- **Length:** ${lengthDesc}\n\n### Guidelines\n1. Start with the most important information\n2. Use clear structure\n3. Include specific examples\n4. End with actionable takeaways`;
  }
  
  return prompt;
}

// ============================================
// REACT COMPONENT  
// ============================================

export default function PromptGenerator() {
  // Core state
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [displayedOutput, setDisplayedOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  
  // AI state
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEngine, setAiEngine] = useState(null);
  const [webllmApi, setWebllmApi] = useState(null);
  const [webllmError, setWebllmError] = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState({ text: '', progress: 0 });
  const [selectedModel, setSelectedModel] = useState(WEBLLM_MODELS[0].id);
  const [modelReady, setModelReady] = useState(false);
  const [webGPUSupported, setWebGPUSupported] = useState(null);
  const [showAIPanel, setShowAIPanel] = useState(true);
  
  // Options state
  const [framework, setFramework] = useState('rtf');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState(50);
  const [language, setLanguage] = useState('en');
  const [customVars, setCustomVars] = useState({});
  
  // UI state
  const [darkMode, setDarkMode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedAI, setCopiedAI] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('prompt');
  
  const outputRef = useRef(null);
  const aiOutputRef = useRef(null);

  // Check WebGPU support
  useEffect(() => {
    const checkWebGPU = async () => {
      if (!navigator.gpu) {
        setWebGPUSupported(false);
        return;
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        setWebGPUSupported(!!adapter);
      } catch {
        setWebGPUSupported(false);
      }
    };
    checkWebGPU();
  }, []);

  // Load history
  useEffect(() => {
    try {
      const saved = localStorage.getItem('promptforge_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {}
  }, []);
  
  useEffect(() => {
    try {
      localStorage.setItem('promptforge_history', JSON.stringify(history.slice(0, 20)));
    } catch (e) {}
  }, [history]);
  
  // Streaming effect for prompt
  useEffect(() => {
    if (output && generating) {
      let index = 0;
      const interval = setInterval(() => {
        if (index <= output.length) {
          setDisplayedOutput(output.slice(0, index));
          index += 3;
          if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
        } else {
          setDisplayedOutput(output);
          setGenerating(false);
          clearInterval(interval);
        }
      }, 5);
      return () => clearInterval(interval);
    }
  }, [output, generating]);

  const ensureWebLLM = async () => {
    if (webllmApi) return webllmApi;
    try {
      const mod = await import('@mlc-ai/web-llm');
      setWebllmApi(mod);
      setWebllmError('');
      return mod;
    } catch (error) {
      const message = error?.message || 'Failed to load WebLLM.';
      setWebllmError(message);
      throw error;
    }
  };

  const buildAppConfig = (webllm) => {
    const baseList = webllm?.prebuiltAppConfig?.model_list || [];
    const byId = new Map(baseList.map((rec) => [rec.model_id || rec.model, rec]));
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const model_list = WEBLLM_MODELS.map((item) => {
      const record = byId.get(item.id);
      if (!record) return null;
      const modelUrl = typeof record.model === 'string'
        ? record.model.replace('https://huggingface.co/', `${origin}/hf/`)
        : record.model;
      return { ...record, model: modelUrl };
    }).filter(Boolean);
    return { model_list };
  };

  // Load AI Model
  const loadModel = async (modelIdParam = selectedModel) => {
    const modelId = typeof modelIdParam === 'string' ? modelIdParam : selectedModel;
    if (modelLoading) return;
    
    setModelLoading(true);
    setModelProgress({ text: 'Initializing...', progress: 0 });
    
    try {
      const webllm = await ensureWebLLM();
      const appConfig = buildAppConfig(webllm);
      const engine = await webllm.CreateMLCEngine(modelId, {
        appConfig,
        initProgressCallback: (progress) => {
          setModelProgress({
            text: progress.text || 'Loading...',
            progress: Math.round(progress.progress * 100)
          });
        }
      });
      
      setAiEngine(engine);
      setModelReady(true);
      setModelProgress({ text: 'Ready!', progress: 100 });
    } catch (error) {
      console.error('Failed to load model:', error);
      setModelProgress({ text: `Error: ${error.message}`, progress: 0 });
    } finally {
      setModelLoading(false);
    }
  };

  // Unload model
  const unloadModel = async () => {
    if (aiEngine) {
      try {
        await aiEngine.unload();
      } catch (e) {}
      setAiEngine(null);
      setModelReady(false);
      setModelProgress({ text: '', progress: 0 });
    }
  };

  // Test prompt with AI
  const testWithAI = async () => {
    if (!aiEngine || !output) return;
    
    setAiLoading(true);
    setAiResponse('');
    setActiveTab('ai');
    
    try {
      const response = await aiEngine.chat.completions.create({
        messages: [{ role: 'user', content: output }],
        max_tokens: 1024,
        temperature: 0.7,
        stream: true
      });
      
      let fullResponse = '';
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        setAiResponse(fullResponse);
        if (aiOutputRef.current) {
          aiOutputRef.current.scrollTop = aiOutputRef.current.scrollHeight;
        }
      }
    } catch (error) {
      setAiResponse(`Error: ${error.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerate = useCallback(() => {
    if (!input.trim()) return;
    
    setGenerating(true);
    setOutput('');
    setDisplayedOutput('');
    setAiResponse('');
    setActiveTab('prompt');
    
    setTimeout(() => {
      const result = generatePrompt(input, { framework, tone, length, language, customVars });
      setOutput(result);
      setHistory(prev => [{
        id: Date.now(),
        input,
        output: result,
        framework,
        tone,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 20));
    }, 200);
  }, [input, framework, tone, length, language, customVars]);
  
  const handleCopy = (text, setCopiedState) => {
    const textArea = document.createElement('textarea');
    textArea.value = text.replace(/\*\*/g, '').replace(/##/g, '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };
  
  const handleDownload = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const loadTemplate = (key) => {
    const template = TEMPLATES[key];
    setInput(template.input);
    setShowTemplates(false);
    const vars = {};
    template.variables.forEach(v => vars[v] = '');
    setCustomVars(vars);
  };
  
  const loadFromHistory = (item) => {
    setInput(item.input);
    setOutput(item.output);
    setDisplayedOutput(item.output);
    setFramework(item.framework);
    setTone(item.tone);
    setShowHistory(false);
  };
  
  const { score, tips } = calculatePromptScore(input);
  const detectedVars = extractVariables(input);
  const { taskType } = detectTaskType(input);
  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
  
  const theme = darkMode ? {
    bg: '#0f172a',
    bgSecondary: 'rgba(255,255,255,0.03)',
    bgTertiary: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.6)',
    textMuted: 'rgba(255,255,255,0.35)',
    accent: '#f59e0b',
    accentGradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    success: '#22c55e',
    aiAccent: '#8b5cf6'
  } : {
    bg: '#f8fafc',
    bgSecondary: '#ffffff',
    bgTertiary: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    accent: '#f59e0b',
    accentGradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    success: '#22c55e',
    aiAccent: '#8b5cf6'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #f8fafc 100%)',
      padding: '24px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px',
              background: theme.accentGradient,
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: theme.text }}>PromptForge</h1>
              <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted }}>AI Prompt Generator + Local AI Testing</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowHistory(!showHistory)} style={{
              background: theme.bgSecondary, border: `1px solid ${theme.border}`,
              borderRadius: '10px', padding: '8px 12px', color: theme.textSecondary,
              cursor: 'pointer', fontSize: '13px'
            }}>📜</button>
            <button onClick={() => setShowAIPanel(!showAIPanel)} style={{
              background: showAIPanel ? `${theme.aiAccent}30` : theme.bgSecondary,
              border: `1px solid ${showAIPanel ? theme.aiAccent : theme.border}`,
              borderRadius: '10px', padding: '8px 12px',
              color: showAIPanel ? theme.aiAccent : theme.textSecondary,
              cursor: 'pointer', fontSize: '13px'
            }}>🤖 AI</button>
            <button onClick={() => setDarkMode(!darkMode)} style={{
              background: theme.bgSecondary, border: `1px solid ${theme.border}`,
              borderRadius: '10px', padding: '8px 12px', color: theme.textSecondary, cursor: 'pointer'
            }}>{darkMode ? '☀️' : '🌙'}</button>
          </div>
        </div>

        {/* AI Panel */}
        {showAIPanel && (
          <div style={{
            background: theme.bgSecondary, borderRadius: '16px', padding: '20px',
            marginBottom: '20px', border: `1px solid ${theme.aiAccent}40`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '18px' }}>🧠</span>
              <h3 style={{ margin: 0, fontSize: '16px', color: theme.text }}>Local AI (WebLLM)</h3>
              <span style={{
                padding: '3px 8px', background: `${theme.success}20`, borderRadius: '6px',
                fontSize: '11px', color: theme.success
              }}>100% Private • Runs in Browser</span>
            </div>

            {webGPUSupported === false && (
              <div style={{
                padding: '14px', background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '10px', marginBottom: '16px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#f87171' }}>
                  ⚠️ WebGPU not supported in this browser. Try Chrome 113+ or Edge 113+.
                </p>
              </div>
            )}

            {webGPUSupported === null && (
              <div style={{
                padding: '12px', background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '10px', marginBottom: '16px'
              }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#93c5fd' }}>
                  ⏳ Checking WebGPU support...
                </p>
              </div>
            )}

            {webllmError && (
              <div style={{
                padding: '14px', background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '10px', marginBottom: '16px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#f87171' }}>
                  ⚠️ WebLLM failed to load. Please refresh and try again. ({webllmError})
                </p>
              </div>
            )}

            <>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const nextModel = e.target.value;
                    setSelectedModel(nextModel);
                    unloadModel();
                    if (webGPUSupported === true) {
                      loadModel(nextModel);
                    }
                  }}
                  disabled={modelLoading || webGPUSupported === false || webGPUSupported === null}
                  style={{
                    flex: 1, minWidth: '200px', background: theme.bgTertiary,
                    border: `1px solid ${theme.border}`, borderRadius: '10px',
                    padding: '12px', color: theme.text, fontSize: '14px', outline: 'none'
                  }}
                >
                  {WEBLLM_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.size}) - {m.speed}</option>
                  ))}
                </select>
                
                {!modelReady ? (
                  <button onClick={loadModel} disabled={modelLoading || webGPUSupported !== true} style={{
                    background: modelLoading || webGPUSupported !== true ? theme.bgTertiary : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    border: 'none', borderRadius: '10px', padding: '12px 24px',
                    color: modelLoading || webGPUSupported !== true ? theme.textMuted : '#fff',
                    cursor: modelLoading || webGPUSupported !== true ? 'not-allowed' : 'pointer',
                    fontWeight: '600', fontSize: '14px',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    {modelLoading ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3"/>
                          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                        </svg>
                        Loading...
                      </>
                    ) : '🚀 Load Model'}
                  </button>
                ) : (
                  <button onClick={unloadModel} style={{
                    background: theme.bgTertiary, border: `1px solid ${theme.border}`,
                    borderRadius: '10px', padding: '12px 20px', color: theme.textSecondary,
                    cursor: 'pointer', fontSize: '14px'
                  }}>Unload</button>
                )}
              </div>

              {webGPUSupported === false && (
                <p style={{ margin: '-8px 0 12px', fontSize: '12px', color: theme.textMuted }}>
                  Model list is visible, but loading is disabled without WebGPU support.
                </p>
              )}

              {modelLoading && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: theme.textSecondary }}>{modelProgress.text}</span>
                    <span style={{ fontSize: '12px', color: theme.aiAccent }}>{modelProgress.progress}%</span>
                  </div>
                  <div style={{ height: '6px', background: theme.bgTertiary, borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${modelProgress.progress}%`,
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                      borderRadius: '3px', transition: 'width 0.3s'
                    }} />
                  </div>
                </div>
              )}

              {modelReady && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px', background: `${theme.success}15`, borderRadius: '8px'
                }}>
                  <span style={{ color: theme.success }}>✓</span>
                  <span style={{ fontSize: '13px', color: theme.success }}>Model ready! Generate a prompt then click "Test with AI"</span>
                </div>
              )}
            </>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div style={{
            background: theme.bgSecondary, border: `1px solid ${theme.border}`,
            borderRadius: '16px', padding: '20px', marginBottom: '20px', maxHeight: '250px', overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', color: theme.text }}>Recent Prompts</h3>
            {history.length === 0 ? (
              <p style={{ color: theme.textMuted, fontSize: '13px' }}>No history yet</p>
            ) : (
              history.map(item => (
                <div key={item.id} onClick={() => loadFromHistory(item)} style={{
                  padding: '12px', background: theme.bgTertiary, borderRadius: '10px',
                  marginBottom: '8px', cursor: 'pointer'
                }}>
                  <p style={{ margin: 0, fontSize: '13px', color: theme.text }}>{item.input.slice(0, 50)}...</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: theme.textMuted }}>
                    {FRAMEWORKS[item.framework]?.name} • {new Date(item.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Templates */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: theme.textMuted }}>Templates</span>
            <button onClick={() => setShowTemplates(!showTemplates)} style={{
              background: 'none', border: 'none', color: theme.accent, cursor: 'pointer', fontSize: '12px'
            }}>{showTemplates ? 'Less' : 'More'}</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(TEMPLATES).slice(0, showTemplates ? undefined : 4).map(([key, t]) => (
              <button key={key} onClick={() => loadTemplate(key)} style={{
                background: theme.bgSecondary, border: `1px solid ${theme.border}`,
                borderRadius: '10px', padding: '8px 14px', fontSize: '12px',
                color: theme.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}>{t.icon} {t.name}</button>
            ))}
          </div>
        </div>

        {/* Input Card */}
        <div style={{
          background: theme.bgSecondary, borderRadius: '18px', padding: '20px',
          marginBottom: '16px', border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: theme.textSecondary }}>Describe what you need</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {taskType && (
                <span style={{
                  padding: '3px 8px', background: `${theme.accent}20`,
                  borderRadius: '6px', fontSize: '11px', color: theme.accent, textTransform: 'capitalize'
                }}>{taskType}</span>
              )}
              <span style={{ fontSize: '11px', color: theme.textMuted }}>{wordCount} words</span>
            </div>
          </div>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }}}
            placeholder="e.g., Write a blog post about [topic] for [audience]..."
            style={{
              width: '100%', height: '90px', background: theme.bgTertiary,
              border: `1px solid ${theme.border}`, borderRadius: '12px',
              padding: '14px', fontSize: '14px', color: theme.text,
              resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
            }}
          />
          
          {detectedVars.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '11px', color: theme.textMuted }}>Variables:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {detectedVars.map(v => (
                  <input key={v} placeholder={v} value={customVars[v] || ''}
                    onChange={(e) => setCustomVars(prev => ({ ...prev, [v]: e.target.value }))}
                    style={{
                      background: theme.bgTertiary, border: `1px solid ${theme.border}`,
                      borderRadius: '8px', padding: '8px 12px', fontSize: '12px',
                      color: theme.text, width: '140px', outline: 'none'
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          
          {input.length > 0 && (
            <div style={{ marginTop: '14px', padding: '12px', background: theme.bgTertiary, borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: theme.textSecondary }}>Prompt Strength</span>
                <span style={{ fontSize: '13px', fontWeight: '600',
                  color: score >= 70 ? theme.success : score >= 40 ? '#f59e0b' : '#ef4444'
                }}>{score}/100</span>
              </div>
              <div style={{ height: '5px', background: theme.border, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${score}%`,
                  background: score >= 70 ? theme.success : score >= 40 ? '#f59e0b' : '#ef4444',
                  borderRadius: '3px', transition: 'width 0.3s'
                }} />
              </div>
              {tips.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {tips.map((tip, i) => (
                    <p key={i} style={{ margin: '3px 0', fontSize: '11px', color: theme.textMuted }}>💡 {tip}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: theme.bgSecondary, borderRadius: '14px', padding: '14px', border: `1px solid ${theme.border}` }}>
            <label style={{ fontSize: '11px', color: theme.textMuted, display: 'block', marginBottom: '8px' }}>Framework</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(FRAMEWORKS).map(([key, fw]) => (
                <button key={key} onClick={() => setFramework(key)} style={{
                  background: framework === key ? theme.accentGradient : theme.bgTertiary,
                  border: 'none', borderRadius: '8px', padding: '6px 10px',
                  fontSize: '11px', color: framework === key ? '#fff' : theme.textSecondary, cursor: 'pointer'
                }}>{fw.icon} {fw.name}</button>
              ))}
            </div>
          </div>
          
          <div style={{ background: theme.bgSecondary, borderRadius: '14px', padding: '14px', border: `1px solid ${theme.border}` }}>
            <label style={{ fontSize: '11px', color: theme.textMuted, display: 'block', marginBottom: '8px' }}>Tone</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(TONES).map(([key, t]) => (
                <button key={key} onClick={() => setTone(key)} style={{
                  background: tone === key ? t.color : theme.bgTertiary,
                  border: 'none', borderRadius: '8px', padding: '6px 10px',
                  fontSize: '11px', color: tone === key ? '#fff' : theme.textSecondary, cursor: 'pointer'
                }}>{t.icon} {t.name}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: theme.bgSecondary, borderRadius: '14px', padding: '14px', border: `1px solid ${theme.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', color: theme.textMuted }}>Length</label>
              <span style={{ fontSize: '11px', color: theme.textSecondary }}>
                {length <= 25 ? 'Concise' : length <= 50 ? 'Moderate' : length <= 75 ? 'Detailed' : 'Comprehensive'}
              </span>
            </div>
            <input type="range" min="0" max="100" value={length} onChange={(e) => setLength(Number(e.target.value))}
              style={{ width: '100%', accentColor: theme.accent }} />
          </div>
          
          <div style={{ background: theme.bgSecondary, borderRadius: '14px', padding: '14px', border: `1px solid ${theme.border}` }}>
            <label style={{ fontSize: '11px', color: theme.textMuted, display: 'block', marginBottom: '8px' }}>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{
              width: '100%', background: theme.bgTertiary, border: `1px solid ${theme.border}`,
              borderRadius: '8px', padding: '8px', color: theme.text, fontSize: '12px', outline: 'none'
            }}>
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            {language === 'bn' && (
              <p style={{ margin: '8px 0 0', fontSize: '11px', color: theme.textMuted }}>
                Tip: For Bangla, request fluent, natural language and avoid repetition.
              </p>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <button onClick={handleGenerate} disabled={!input.trim() || generating} style={{
          width: '100%',
          background: !input.trim() || generating ? theme.bgTertiary : theme.accentGradient,
          border: 'none', borderRadius: '14px', padding: '16px',
          fontSize: '15px', fontWeight: '600',
          color: !input.trim() || generating ? theme.textMuted : '#fff',
          cursor: !input.trim() || generating ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          marginBottom: '20px',
          boxShadow: !input.trim() || generating ? 'none' : '0 4px 20px rgba(245, 158, 11, 0.4)'
        }}>
          {generating ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3"/>
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
              </svg>
              Generating...
            </>
          ) : '⚡ Generate Prompt'}
        </button>

        {/* Output Tabs */}
        {(displayedOutput || aiResponse) && (
          <div style={{
            background: theme.bgSecondary, borderRadius: '18px',
            border: `1px solid ${theme.border}`, overflow: 'hidden'
          }}>
            {/* Tab Headers */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border}` }}>
              <button onClick={() => setActiveTab('prompt')} style={{
                flex: 1, padding: '14px', background: activeTab === 'prompt' ? theme.bgTertiary : 'transparent',
                border: 'none', borderBottom: activeTab === 'prompt' ? `2px solid ${theme.accent}` : '2px solid transparent',
                color: activeTab === 'prompt' ? theme.text : theme.textSecondary,
                cursor: 'pointer', fontSize: '13px', fontWeight: '500'
              }}>📝 Generated Prompt</button>
              <button onClick={() => setActiveTab('ai')} style={{
                flex: 1, padding: '14px',
                background: activeTab === 'ai' ? theme.bgTertiary : 'transparent',
                border: 'none', borderBottom: activeTab === 'ai' ? `2px solid ${theme.aiAccent}` : '2px solid transparent',
                color: activeTab === 'ai' ? theme.text : theme.textSecondary,
                cursor: 'pointer', fontSize: '13px', fontWeight: '500'
              }}>🤖 AI Response</button>
            </div>

            {/* Tab Content */}
            {activeTab === 'prompt' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: theme.bgTertiary }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {generating ? (
                      <div style={{ width: '24px', height: '24px', background: `${theme.accent}30`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '8px', height: '8px', background: theme.accent, borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                      </div>
                    ) : (
                      <div style={{ width: '24px', height: '24px', background: `${theme.success}20`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.success} strokeWidth="3">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    <span style={{ fontSize: '13px', color: theme.text, fontWeight: '500' }}>
                      {generating ? 'Generating...' : 'Ready'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {modelReady && !generating && output && (
                      <button onClick={testWithAI} disabled={aiLoading} style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        border: 'none', borderRadius: '8px', padding: '8px 14px',
                        color: '#fff', cursor: aiLoading ? 'not-allowed' : 'pointer',
                        fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        {aiLoading ? '⏳' : '🧪'} Test with AI
                      </button>
                    )}
                    <button onClick={() => handleCopy(output, setCopied)} style={{
                      background: copied ? `${theme.success}20` : theme.bgSecondary,
                      border: `1px solid ${copied ? theme.success : theme.border}`,
                      borderRadius: '8px', padding: '8px 12px', fontSize: '11px',
                      color: copied ? theme.success : theme.textSecondary, cursor: 'pointer'
                    }}>{copied ? '✓ Copied' : '📋 Copy'}</button>
                    <button onClick={() => handleDownload(output, 'prompt.txt')} style={{
                      background: theme.bgSecondary, border: `1px solid ${theme.border}`,
                      borderRadius: '8px', padding: '8px 12px', fontSize: '11px',
                      color: theme.textSecondary, cursor: 'pointer'
                    }}>💾</button>
                  </div>
                </div>
                
                <div ref={outputRef} style={{ padding: '18px', maxHeight: '350px', overflowY: 'auto' }}>
                  <pre style={{
                    margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    fontSize: '13px', lineHeight: '1.7', color: theme.text,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
                  }}>
                    {displayedOutput}
                    {generating && <span style={{ display: 'inline-block', width: '2px', height: '16px', background: theme.accent, marginLeft: '2px', animation: 'blink 0.8s infinite', verticalAlign: 'middle' }} />}
                  </pre>
                </div>
              </>
            )}

            {activeTab === 'ai' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: theme.bgTertiary }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {aiLoading ? (
                      <div style={{ width: '24px', height: '24px', background: `${theme.aiAccent}30`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '8px', height: '8px', background: theme.aiAccent, borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                      </div>
                    ) : aiResponse ? (
                      <div style={{ width: '24px', height: '24px', background: `${theme.success}20`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.success} strokeWidth="3">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    ) : null}
                    <span style={{ fontSize: '13px', color: theme.text, fontWeight: '500' }}>
                      {aiLoading ? 'AI is thinking...' : aiResponse ? 'AI Response' : 'No response yet'}
                    </span>
                  </div>
                  
                  {aiResponse && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleCopy(aiResponse, setCopiedAI)} style={{
                        background: copiedAI ? `${theme.success}20` : theme.bgSecondary,
                        border: `1px solid ${copiedAI ? theme.success : theme.border}`,
                        borderRadius: '8px', padding: '8px 12px', fontSize: '11px',
                        color: copiedAI ? theme.success : theme.textSecondary, cursor: 'pointer'
                      }}>{copiedAI ? '✓ Copied' : '📋 Copy'}</button>
                      <button onClick={() => handleDownload(aiResponse, 'ai-response.txt')} style={{
                        background: theme.bgSecondary, border: `1px solid ${theme.border}`,
                        borderRadius: '8px', padding: '8px 12px', fontSize: '11px',
                        color: theme.textSecondary, cursor: 'pointer'
                      }}>💾</button>
                    </div>
                  )}
                </div>
                
                <div ref={aiOutputRef} style={{ padding: '18px', maxHeight: '350px', overflowY: 'auto' }}>
                  {aiResponse ? (
                    <pre style={{
                      margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      fontSize: '13px', lineHeight: '1.7', color: theme.text,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
                    }}>
                      {aiResponse}
                      {aiLoading && <span style={{ display: 'inline-block', width: '2px', height: '16px', background: theme.aiAccent, marginLeft: '2px', animation: 'blink 0.8s infinite', verticalAlign: 'middle' }} />}
                    </pre>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      {modelLoading ? (
                        <p style={{ color: theme.textMuted, fontSize: '14px', margin: 0 }}>
                          ⏳ Loading model… this can take a minute the first time.
                        </p>
                      ) : (
                        <>
                          <p style={{ color: theme.textMuted, fontSize: '14px', margin: '0 0 12px 0' }}>
                            {modelReady
                              ? '👆 Generate a prompt, then click "Test with AI" to see the response'
                              : 'No model loaded yet.'
                            }
                          </p>
                          {!modelReady && (
                            <button onClick={loadModel} style={{
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                              border: 'none', borderRadius: '8px', padding: '8px 14px',
                              color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                            }}>
                              🚀 Load Model
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '28px', fontSize: '11px', color: theme.textMuted }}>
          Works with ChatGPT · Claude · Gemini · Or test locally with WebLLM
        </p>
      </div>
      
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.75); } }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        textarea::placeholder, input::placeholder { color: ${theme.textMuted}; }
        select option { background: ${theme.bg}; color: ${theme.text}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${theme.bgTertiary}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
      `}</style>
    </div>
  );
}
