// Portfolio data for Anshul Kumar — AI Engineer
// Source: Anshul_Kumar_AI_Engineer.pdf

export const personalInfo = {
  name: 'Anshul Kumar',
  handle: 'pybyanshul',
  location: 'Sector 16, Noida',
  phone: '+91 94569 54582',
  email: 'pybyanshul@proton.me',
  portfolio: 'pybyanshul.netlify.app',
  linkedin: 'linkedin.com/in/pybyanshul',
  github: 'https://github.com/PyByAnshul/',
  summary:
    'Software Engineer with 1.5+ years of experience designing and deploying end-to-end GenAI systems, ' +
    'RAG architectures, and multi-agent workflows. Proficient in LLM orchestration (LangChain, LangGraph), ' +
    'vector search (FAISS), and prompt optimization, integrated with low-latency FastAPI microservices. ' +
    'Proven track record in automating enterprise workflows using autonomous AI agents and scalable backend pipelines.',
}

export const skills = [
  { category: 'AI / GenAI Frameworks', items: ['LangChain', 'LangGraph', 'RAG', 'AI Agents', 'Agentic AI', 'MCP (Model Context Protocol)', 'Prompt Engineering'] },
  { category: 'LLM & Vector Search', items: ['FAISS', 'Vector Search & Embeddings', 'LLM Integration', 'OpenRouter'] },
  { category: 'Backend & Microservices', items: ['FastAPI', 'Python', 'Django', 'Flask', 'REST APIs', 'WebSockets', 'Celery', 'Redis'] },
  { category: 'Databases & Storage', items: ['PostgreSQL', 'MongoDB', 'FAISS'] },
  { category: 'DevOps & Cloud', items: ['Docker', 'AWS', 'Git', 'RabbitMQ'] },
]

export const experience = [
  {
    company: 'Webkul',
    title: 'Software Engineer',
    url: 'https://webkul.com',
    location: 'Noida',
    period: 'Feb 2025 - Jun 2026',
    tagline: 'Software engineering firm specializing in e-commerce solutions',
    achievements: [
      'Architected and deployed a production RAG-based AI chatbot using FastAPI, vector databases, and LLM orchestration, improving query response accuracy and user engagement.',
      'Engineered automated AI pipelines and scheduled background workflows to process contextual unstructured data.',
      'Designed scalable FastAPI and PostgreSQL microservices powering AI chatbot integration and payment gateways.',
    ],
  },
  {
    company: 'Lifease Solutions LLP',
    title: 'Django Developer Intern',
    url: 'http://cricradio.com',
    location: 'Greater Noida',
    period: 'Sept 2024 - Jan 2025',
    tagline: 'Company delivering cutting-edge tech solutions for the cricket sports industry',
    achievements: [
      'Developed FastAPI applications for high-speed data collection and processing, optimizing Celery task queues with Gevent to improve efficiency.',
      'Deployed services on AWS and reduced system crashes through rigorous testing, debugging, and monitoring.',
    ],
  },
  {
    company: 'VakilDesk Pvt. Ltd.',
    title: 'Python Developer Intern',
    url: 'https://vakildesk.com',
    location: 'Delhi',
    period: 'Sept 2023 - Jun 2024',
    tagline: 'Company providing legal tech solutions for clients',
    achievements: [
      'Engineered scalable web applications and APIs using Python, Django, and Flask.',
      'Automated web scraping and data pipelines with Celery and Redis.',
    ],
  },
]

export const projects = [
  {
    id: 'ai-helpdesk',
    name: 'AI Helpdesk',
    tagline: 'AI-Powered Customer Support Platform',
    url: 'https://aidesk.pythonanywhere.com',
    tools: ['RAG', 'FAISS', 'LLMs', 'CI/CD'],
    description: 'AI assistant capable of giving support for legal queries.',
    details: [
      'Developed a context-aware legal support assistant utilizing RAG, FAISS vector embeddings, and LLMs for accurate document retrieval',
      'Implemented intelligent query routing and semantic classification to triage support tickets automatically',
      'Deployed production-ready LLM pipelines with automated CI/CD workflows',
    ],
  },
  {
    id: 'reimbursements',
    name: 'Employee Reimbursements AI Automation',
    tagline: 'AI Application for Employee Reimbursements Automation',
    url: 'https://employee-reimbursements-ai-automati.vercel.app',
    tools: ['Python', 'FastAPI', 'Celery', 'LangGraph', 'LangChain', 'FAISS', 'LLM Models'],
    description:
      'Built an autonomous Multi-Agent system using LangGraph and LangChain to handle document parsing, ' +
      'policy validation via RAG, and automated approval decisions.',
    details: [
      'Integrated OCR parsing for structured data extraction from PDF/image invoices into FAISS vector storage',
      'Designed low-latency FastAPI backend with JWT security and real-time dashboard analytics',
    ],
  },
]

export const education = {
  degree: 'Bachelor of Technology in Computer Science',
  institution: 'S.D. College of Engineering and Technology',
  university: 'Dr. A.P.J. Abdul Kalam Technical University',
  period: 'Apr 2020 - Aug 2024',
  coursework: 'Data Structure and Algorithm',
}

export const availableCommands = [
  'whoami',
  'help',
  'ls',
  'ls projects/',
  'cat skills.md',
  'cat experience.md',
  'cat education.md',
  'cat projects/ai-helpdesk',
  'cat projects/reimbursements',
  'curl contact.txt',
  'clear',
]

export type OutputLine = {
  text: string
  action?: string
  color?: 'default' | 'green' | 'orange' | 'muted' | 'faint'
  hint?: boolean
}

export function processCommand(input: string): OutputLine[] {
  const cmd = input.trim().toLowerCase()

  if (cmd === 'whoami') {
    return [
      { text: `${personalInfo.name} — ${personalInfo.handle}`, color: 'green' },
      { text: 'AI Engineer & GenAI Specialist', color: 'orange' },
      { text: '' },
      { text: personalInfo.summary },
      { text: '' },
      { text: personalInfo.email, color: 'muted' },
    ]
  }

  if (cmd === 'help') {
    return [
      { text: 'Available commands:', color: 'orange' },
      { text: '  whoami              About Anshul' },
      { text: '  help                Show this help' },
      { text: '  ls                  List files' },
      { text: '  ls projects/        List projects' },
      { text: '  cat skills.md       Technical skills' },
      { text: '  cat experience.md   Work experience' },
      { text: '  cat education.md    Education' },
      { text: '  cat projects/<name> Project details' },
      { text: '  curl contact.txt    Contact info' },
      { text: '  clear               Clear terminal' },
    ]
  }

  if (cmd === 'ls') {
    return [{ text: 'projects/  skills.md  experience.md  education.md  contact.txt' }]
  }

  if (cmd === 'ls projects/') {
    return [
      ...projects.map((p) => ({
        text: `${p.name.padEnd(30)} ${p.tagline}`,
        action: `cat projects/${p.id}`,
      })),
      { text: '' },
      { text: 'Click a project to view details.', color: 'faint', hint: true },
    ]
  }

  if (cmd === 'cat skills.md') {
    const lines: OutputLine[] = [{ text: 'TECHNICAL SKILLS', color: 'orange' }, { text: '' }]
    skills.forEach((s) => {
      lines.push({ text: `${s.category.padEnd(26)} ${s.items.join(', ')}` })
      lines.push({ text: '' })
    })
    return lines
  }

  if (cmd === 'cat experience.md') {
    const lines: OutputLine[] = [{ text: 'WORK EXPERIENCE', color: 'orange' }, { text: '' }]
    experience.forEach((exp) => {
      lines.push({ text: `${exp.company} | ${exp.title}     ${exp.period}     ${exp.url}`, color: 'green' })
      lines.push({ text: exp.location })
      lines.push({ text: exp.tagline, color: 'muted' })
      exp.achievements.forEach((a) => lines.push({ text: `  • ${a}` }))
      lines.push({ text: '' })
    })
    return lines
  }

  if (cmd === 'cat education.md') {
    return [
      { text: education.degree, color: 'green' },
      { text: `${education.institution} | ${education.university}` },
      { text: '' },
      { text: education.period },
      { text: '' },
      { text: `Relevant coursework: ${education.coursework}` },
    ]
  }

  if (cmd === 'curl contact.txt' || cmd === 'cat contact.txt') {
    return [
      { text: 'Have a good problem to solve?', color: 'orange' },
      { text: '' },
      { text: `email      ${personalInfo.email}` },
      { text: `linkedin   ${personalInfo.linkedin}` },
      { text: `github     ${personalInfo.github}` },
      { text: `portfolio  ${personalInfo.portfolio}` },
      { text: `location   ${personalInfo.location}` },
    ]
  }

  // Project detail: cat projects/<name>
  const projectMatch = cmd.match(/^cat projects\/(.+)$/)
  if (projectMatch) {
    const project = projects.find((p) => p.id === projectMatch[1])
    if (project) {
      return [
        { text: `${project.name} — ${project.tagline}`, color: 'green' },
        { text: project.url, color: 'muted' },
        { text: '' },
        { text: `Tools: ${project.tools.join(', ')}`, color: 'faint' },
        { text: '' },
        { text: project.description },
        { text: '' },
        ...project.details.map((d) => ({ text: `  • ${d}` })),
      ]
    }
    return [
      { text: `Project not found: ${projectMatch[1]}`, color: 'orange' },
      { text: '' },
      { text: "Run 'ls projects/' to see available projects.", color: 'faint' },
    ]
  }

  // Unknown command
  return [
    { text: `Command not found: ${input.trim()}`, color: 'orange' },
    { text: '' },
    { text: "Type 'help' for available commands.", color: 'faint' },
  ]
}

export function getGhostText(input: string): string {
  if (!input.trim()) return ''
  const matches = availableCommands.filter((cmd) => cmd.startsWith(input))
  if (matches.length === 1 && matches[0] !== input) {
    return matches[0].slice(input.length)
  }
  // Multiple matches → show common prefix suffix
  if (matches.length > 1) {
    let prefix = matches[0]
    for (const cmd of matches) {
      while (!cmd.startsWith(prefix)) prefix = prefix.slice(0, -1)
    }
    const suffix = prefix.slice(input.length)
    // Don't show whitespace-only ghost text
    return suffix.trim() ? suffix : ''
  }
  return ''
}
