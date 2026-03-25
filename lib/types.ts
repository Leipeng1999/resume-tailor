// Core types for the resume tailor application

export interface ParsedJD {
  jobTitle: string;
  companyName: string;
  coreSkills: string[];
  educationExperience: string;
  industryKeywords: string[];
  niceToHave: string[];
  rawText: string;
}

export interface ResumeDiff {
  id: string;
  originalText: string;
  newText: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  reason: string;
  accepted?: boolean;
}

export interface TailoredResume {
  originalContent: string;
  tailoredContent: string;
  diffs: ResumeDiff[];
  suggestions: string[];
}

export interface MatchScore {
  overall: number;
  keywordMatch: number;
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  atsIssues: string[];
}

export interface GeneratedMessage {
  channel: string;
  version: number;
  subject?: string;
  content: string;
}

export interface InterviewQA {
  id: string;
  category: 'general' | 'technical' | 'behavioral';
  question: string;
  answer: string;
}

export interface StarStory {
  id: string;
  title: string;
  story: string;
  applicableScenarios: string[];
  fromUserMaterial?: boolean;
}

export interface InterviewPrep {
  companyBackground: {
    overview: string;
    industryPosition: string;
    chinaMarket: string;
    whyHiring: string;
  };
  jobMatch: {
    strengthsMatch: Array<{ strength: string; jobRequirement: string }>;
    weaknesses: Array<{ weakness: string; strategy: string; talkingPoint: string }>;
  };
  selfIntroduction: {
    chinese: string;
    english: string;
  };
  coreQA: InterviewQA[];
  starStories: StarStory[];
  aiCapabilities: {
    description: string;
    talkingPoint: string;
  } | null;
  questionsToAsk: string[];
  strategy: {
    positioning: string;
    principles: string[];
    closingScript: string;
  };
  salaryNegotiation: {
    marketRange: string;
    strategies: string[];
  };
  warningsAndTraps: {
    traps: string[];
    avoidPhrases: string[];
  };
}

export interface HistoryRecord {
  id: string;
  createdAt: string;
  companyName: string;
  jobTitle: string;
  jdSummary: string;
  parsedJD?: ParsedJD;
  tailoredResume?: TailoredResume;
  matchScore?: MatchScore;
  generatedMessages?: GeneratedMessage[];
  interviewPrep?: InterviewPrep;
}

export type MessageChannel = 'linkedin' | 'boss' | 'liepin' | 'official' | 'email';
export type MessageLanguage = 'chinese' | 'english' | 'bilingual';
export type MessageTone = 'formal' | 'friendly' | 'enthusiastic';
export type InterviewRound = 'hr' | 'technical' | 'final';
