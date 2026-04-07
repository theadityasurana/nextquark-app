import { CATEGORY_ROLES } from '@/constants/roles';
import type { OnboardingData } from '@/types/onboarding';

/**
 * Keyword → category mappings.
 * Each keyword (lowercased) maps to one or more category keys.
 */
const SKILL_TO_CATEGORIES: Record<string, string[]> = {
  // Software Engineering
  'react': ['software_engineering'], 'react native': ['software_engineering'], 'angular': ['software_engineering'],
  'vue': ['software_engineering'], 'next.js': ['software_engineering'], 'node.js': ['software_engineering'],
  'express': ['software_engineering'], 'django': ['software_engineering'], 'flask': ['software_engineering'],
  'spring': ['software_engineering'], 'spring boot': ['software_engineering'], '.net': ['software_engineering'],
  'rails': ['software_engineering'], 'javascript': ['software_engineering'], 'typescript': ['software_engineering'],
  'java': ['software_engineering'], 'kotlin': ['software_engineering'], 'swift': ['software_engineering'],
  'go': ['software_engineering'], 'rust': ['software_engineering'], 'c++': ['software_engineering'],
  'c#': ['software_engineering'], 'php': ['software_engineering'], 'ruby': ['software_engineering'],
  'html': ['software_engineering'], 'css': ['software_engineering'], 'tailwind': ['software_engineering'],
  'bootstrap': ['software_engineering'], 'graphql': ['software_engineering'], 'rest': ['software_engineering'],
  'api': ['software_engineering'], 'microservices': ['software_engineering'], 'system design': ['software_engineering'],
  'flutter': ['software_engineering'], 'dart': ['software_engineering'], 'expo': ['software_engineering'],
  'swiftui': ['software_engineering'], 'ios': ['software_engineering'], 'android': ['software_engineering'],
  // DevOps / Cloud / Infra
  'docker': ['software_engineering'], 'kubernetes': ['software_engineering'], 'terraform': ['software_engineering'],
  'aws': ['software_engineering'], 'azure': ['software_engineering'], 'gcp': ['software_engineering'],
  'ci/cd': ['software_engineering'], 'jenkins': ['software_engineering'], 'github actions': ['software_engineering'],
  'linux': ['software_engineering'], 'devops': ['software_engineering'],
  // Databases
  'sql': ['software_engineering', 'data'], 'mysql': ['software_engineering', 'data'], 'postgresql': ['software_engineering', 'data'],
  'mongodb': ['software_engineering', 'data'], 'redis': ['software_engineering'], 'dynamodb': ['software_engineering'],
  'firebase': ['software_engineering'], 'supabase': ['software_engineering'], 'elasticsearch': ['software_engineering', 'data'],
  // Data & Analytics
  'python': ['software_engineering', 'data', 'ai_ml'], 'r': ['data'], 'matlab': ['data'],
  'pandas': ['data'], 'numpy': ['data'], 'spark': ['data'], 'hadoop': ['data'],
  'kafka': ['data'], 'airflow': ['data'], 'etl': ['data'], 'data analysis': ['data'],
  'data engineering': ['data'], 'tableau': ['data'], 'power bi': ['data'], 'excel': ['data'],
  'data science': ['data', 'ai_ml'], 'statistics': ['data'],
  // AI & ML
  'machine learning': ['ai_ml'], 'deep learning': ['ai_ml'], 'nlp': ['ai_ml'],
  'computer vision': ['ai_ml'], 'tensorflow': ['ai_ml'], 'pytorch': ['ai_ml'],
  'scikit-learn': ['ai_ml'], 'langchain': ['ai_ml'], 'llamaindex': ['ai_ml'],
  'huggingface': ['ai_ml'], 'openai': ['ai_ml'], 'llm': ['ai_ml'],
  'rag': ['ai_ml'], 'agentic ai': ['ai_ml'], 'crewai': ['ai_ml'],
  'langgraph': ['ai_ml'], 'autogen': ['ai_ml'], 'generative ai': ['ai_ml'],
  'prompt engineering': ['ai_ml'], 'vector database': ['ai_ml'],
  // Security
  'cybersecurity': ['security'], 'penetration testing': ['security'], 'security': ['security'],
  'encryption': ['security'], 'oauth': ['security'], 'jwt': ['security'],
  // Design
  'figma': ['design'], 'sketch': ['design'], 'adobe xd': ['design'],
  'photoshop': ['design'], 'illustrator': ['design'], 'ui/ux': ['design'],
  'ux': ['design'], 'ui': ['design'],
  // Product
  'product management': ['product'], 'agile': ['product', 'operations'], 'scrum': ['product', 'operations'],
  'jira': ['product', 'operations'], 'roadmap': ['product'],
  // Finance
  'financial modeling': ['finance'], 'accounting': ['finance'], 'valuation': ['finance'],
  'bloomberg': ['finance'],
  // Marketing
  'seo': ['marketing'], 'google analytics': ['marketing'], 'content marketing': ['marketing'],
  'social media': ['marketing'], 'copywriting': ['marketing'],
  // Blockchain
  'blockchain': ['software_engineering'], 'solidity': ['software_engineering'], 'web3': ['software_engineering'],
};

/**
 * Job title keywords → category
 */
const TITLE_TO_CATEGORIES: Record<string, string[]> = {
  'software': ['software_engineering'], 'developer': ['software_engineering'], 'engineer': ['software_engineering'],
  'frontend': ['software_engineering'], 'backend': ['software_engineering'], 'full stack': ['software_engineering'],
  'fullstack': ['software_engineering'], 'mobile': ['software_engineering'], 'devops': ['software_engineering'],
  'sre': ['software_engineering'], 'platform': ['software_engineering'], 'cloud': ['software_engineering'],
  'data scientist': ['data', 'ai_ml'], 'data analyst': ['data'], 'data engineer': ['data'],
  'analytics': ['data'], 'business intelligence': ['data'], 'bi ': ['data'],
  'machine learning': ['ai_ml'], 'ai ': ['ai_ml'], 'ml ': ['ai_ml'], 'deep learning': ['ai_ml'],
  'nlp': ['ai_ml'], 'research scientist': ['ai_ml', 'data'],
  'product manager': ['product'], 'product owner': ['product'],
  'designer': ['design'], 'ux': ['design'], 'ui': ['design'],
  'security': ['security'], 'cyber': ['security'], 'penetration': ['security'],
  'consultant': ['consulting'], 'advisory': ['consulting'],
  'financial': ['finance'], 'accountant': ['finance'], 'analyst': ['data', 'finance'],
  'marketing': ['marketing'], 'growth': ['marketing'], 'seo': ['marketing'],
  'sales': ['sales'], 'account executive': ['sales'], 'bdr': ['sales'],
  'recruiter': ['human_resources'], 'hr ': ['human_resources'], 'talent': ['human_resources'],
  'operations': ['operations'], 'project manager': ['operations'], 'program manager': ['operations'],
  'intern': [], // Don't map intern to a specific category — use skills instead
};

/**
 * Education field → category
 */
const FIELD_TO_CATEGORIES: Record<string, string[]> = {
  'computer science': ['software_engineering', 'ai_ml', 'data'],
  'software': ['software_engineering'],
  'information technology': ['software_engineering', 'data'],
  'data science': ['data', 'ai_ml'],
  'artificial intelligence': ['ai_ml'],
  'machine learning': ['ai_ml'],
  'electrical': ['software_engineering', 'misc_engineering'],
  'electronics': ['software_engineering', 'misc_engineering'],
  'mechanical': ['misc_engineering'],
  'civil': ['misc_engineering'],
  'chemical': ['misc_engineering'],
  'aerospace': ['misc_engineering'],
  'engineering physics': ['software_engineering', 'data', 'ai_ml'],
  'physics': ['data', 'ai_ml'],
  'mathematics': ['data', 'ai_ml', 'finance'],
  'statistics': ['data', 'ai_ml'],
  'economics': ['finance', 'consulting', 'data'],
  'finance': ['finance'],
  'business': ['consulting', 'product', 'operations'],
  'marketing': ['marketing'],
  'design': ['design'],
  'psychology': ['product', 'design'],
  'law': ['legal'],
  'medicine': ['healthcare'],
  'biology': ['healthcare'],
  'biomedical': ['healthcare', 'misc_engineering'],
};

/**
 * Given onboarding data (skills, experience, projects, education),
 * suggest the most relevant role categories and specific roles.
 */
export function suggestRolesFromProfile(data: OnboardingData): {
  categories: string[];
  roles: string[];
} {
  const categoryScores: Record<string, number> = {};

  const addScore = (cat: string, score: number) => {
    categoryScores[cat] = (categoryScores[cat] || 0) + score;
  };

  // 1. Score from skills (highest weight)
  const skillNames = data.skills.map(s => (typeof s === 'string' ? s : s.name).toLowerCase());
  for (const skill of skillNames) {
    // Exact match
    if (SKILL_TO_CATEGORIES[skill]) {
      SKILL_TO_CATEGORIES[skill].forEach(cat => addScore(cat, 3));
      continue;
    }
    // Partial match
    for (const [keyword, cats] of Object.entries(SKILL_TO_CATEGORIES)) {
      if (skill.includes(keyword) || keyword.includes(skill)) {
        cats.forEach(cat => addScore(cat, 2));
      }
    }
  }

  // 2. Score from work experience titles
  for (const exp of data.workExperience) {
    const titleLower = (exp.title || '').toLowerCase();
    const descLower = (exp.description || '').toLowerCase();
    for (const [keyword, cats] of Object.entries(TITLE_TO_CATEGORIES)) {
      if (titleLower.includes(keyword)) {
        cats.forEach(cat => addScore(cat, 4)); // Job titles are strong signals
      }
    }
    // Also check description for skill keywords
    for (const [keyword, cats] of Object.entries(SKILL_TO_CATEGORIES)) {
      if (descLower.includes(keyword)) {
        cats.forEach(cat => addScore(cat, 1));
      }
    }
  }

  // 3. Score from projects
  const projects = data.projects || [];
  for (const proj of projects) {
    const allText = [proj.title, ...(proj.bullets || []), ...(proj.exposure || [])].join(' ').toLowerCase();
    for (const [keyword, cats] of Object.entries(SKILL_TO_CATEGORIES)) {
      if (allText.includes(keyword)) {
        cats.forEach(cat => addScore(cat, 1));
      }
    }
  }

  // 4. Score from education field
  for (const edu of data.education) {
    const fieldLower = (edu.field || '').toLowerCase();
    const degreeLower = (edu.degree || '').toLowerCase();
    const combined = `${fieldLower} ${degreeLower}`;
    for (const [keyword, cats] of Object.entries(FIELD_TO_CATEGORIES)) {
      if (combined.includes(keyword)) {
        cats.forEach(cat => addScore(cat, 2));
      }
    }
  }

  // 5. Sort categories by score, pick top ones (score > 3)
  const sortedCategories = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 3)
    .slice(0, 5)
    .map(([cat]) => cat);

  // 6. Pick top roles from each selected category
  // Prioritize roles that match skill/title keywords
  const suggestedRoles: string[] = [];
  const allText = [
    ...skillNames,
    ...data.workExperience.map(e => `${e.title} ${e.description}`.toLowerCase()),
    ...(data.projects || []).map(p => `${p.title} ${(p.bullets || []).join(' ')} ${(p.exposure || []).join(' ')}`.toLowerCase()),
  ].join(' ');

  for (const cat of sortedCategories) {
    const roles = CATEGORY_ROLES[cat] || [];
    const scored = roles.map(role => {
      const roleLower = role.toLowerCase();
      const words = roleLower.split(/\s+/);
      let score = 0;
      for (const word of words) {
        if (word.length > 2 && allText.includes(word)) score += 2;
      }
      if (allText.includes(roleLower)) score += 5;
      return { role, score };
    });
    scored.sort((a, b) => b.score - a.score);
    // Pick top 3 roles per category, or at least 1 if any scored
    const topRoles = scored.filter(s => s.score > 0).slice(0, 3).map(s => s.role);
    if (topRoles.length === 0 && scored.length > 0) {
      topRoles.push(scored[0].role); // At least suggest the first role in the category
    }
    suggestedRoles.push(...topRoles);
  }

  return {
    categories: sortedCategories,
    roles: suggestedRoles,
  };
}
