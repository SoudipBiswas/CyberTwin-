export type RiskLevel = 'safe' | 'suspicious' | 'dangerous';

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'expert';

export type Platform =
  | 'gmail'
  | 'outlook'
  | 'calendar'
  | 'linkedin'
  | 'slack'
  | 'discord'
  | 'whatsapp'
  | 'generic';

export interface ExtractedLink {
  href: string;
  displayText: string;
  mismatched: boolean;
}

export interface EmailData {
  platform: Platform;
  senderName: string;
  senderEmail: string;
  senderDomain: string;
  subject: string;
  bodyText: string;
  links: ExtractedLink[];
  buttons: string[];
  attachments: string[];
  timestamp: string;
  pageUrl: string;
}

export interface AgentFinding {
  agent: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  title: string;
  description: string;
  evidence?: string;
}

export interface ThreatIntelResult {
  source: string;
  status: 'clean' | 'suspicious' | 'malicious' | 'unknown';
  details: string;
}

export interface LinkIntel {
  url: string;
  expandedUrl?: string;
  isRedirected: boolean;
  isTyposquat: boolean;
  isSuspiciousTld: boolean;
  isShortener: boolean;
  isRiskyDomain: boolean;
  trustScore: number;
}

export interface QRIntel {
  detected: boolean;
  decodedUrl?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  details?: string;
}

export interface ScanResult {
  id: string;
  timestamp: number;
  email: EmailData;
  riskScore: number;
  riskLevel: RiskLevel;
  senderTrustScore: number;
  findings: AgentFinding[];
  topReasons: string[];
  recommendedAction: string;
  explanation: string;
  threatIntel: ThreatIntelResult[];
  scrubbedPreview: string;
  demoCaseId?: string;
  trustScore: number;
  subScores: {
    identityTrust: number;
    intentRisk: number;
    manipulationRisk: number;
    websiteRisk: number;
    financialRisk: number;
    privacyRisk: number;
    confidenceScore: number;
  };
  socialEngineering: {
    urgency: 'low' | 'medium' | 'high';
    fear: 'low' | 'medium' | 'high';
    authority: 'low' | 'medium' | 'high';
    scarcity: 'low' | 'medium' | 'high';
    curiosity: 'low' | 'medium' | 'high';
    credentialRequests: 'low' | 'medium' | 'high';
    financialRequests: 'low' | 'medium' | 'high';
    emotionalManipulation: 'low' | 'medium' | 'high';
  };
  reasoningBullets: string[];
  linkIntel: LinkIntel[];
  qrIntel?: QRIntel;
  contextualAnomalies: string[];
}


export interface BehaviorProfile {
  knownSenders: Record<
    string,
    {
      email: string;
      name: string;
      trustScore: number;
      interactionCount: number;
      lastSeen: number;
      requestTypes: string[];
      usualTone: string;
    }
  >;
  knownDomains: Record<
    string,
    {
      domain: string;
      trustScore: number;
      interactionCount: number;
      lastSeen: number;
    }
  >;
  usualRequestTypes: string[];
  communicationFrequency: Record<string, number>;
}

export interface Settings {
  autoScan: boolean;
  privacyMode: boolean;
  localOnlyAnalysis: boolean;
  apiEndpoint: string;
  expertiseLevel: ExpertiseLevel;
  demoMode: boolean;
  activeDemoCase: string;
}

export interface StorageData {
  settings: Settings;
  trustedContacts: string[];
  trustedDomains: string[];
  behaviorProfile: BehaviorProfile;
  scanHistory: ScanResult[];
  latestScan: ScanResult | null;
}

export interface AnalysisInput {
  email: EmailData;
  settings: Settings;
  trustedContacts: string[];
  trustedDomains: string[];
  behaviorProfile: BehaviorProfile;
}

export interface RiskAggregation {
  score: number;
  level: RiskLevel;
  findings: AgentFinding[];
  topReasons: string[];
  recommendedAction: string;
  senderTrustScore: number;
  trustScore: number;
  subScores: {
    identityTrust: number;
    intentRisk: number;
    manipulationRisk: number;
    websiteRisk: number;
    financialRisk: number;
    privacyRisk: number;
    confidenceScore: number;
  };
  socialEngineering: {
    urgency: 'low' | 'medium' | 'high';
    fear: 'low' | 'medium' | 'high';
    authority: 'low' | 'medium' | 'high';
    scarcity: 'low' | 'medium' | 'high';
    curiosity: 'low' | 'medium' | 'high';
    credentialRequests: 'low' | 'medium' | 'high';
    financialRequests: 'low' | 'medium' | 'high';
    emotionalManipulation: 'low' | 'medium' | 'high';
  };
  reasoningBullets: string[];
}


export interface TrustGraphNode {
  id: string;
  label: string;
  type: 'user' | 'sender' | 'domain' | 'link' | 'attachment' | 'risk' | 'qr' | 'language' | 'behavior' | 'threatintel';
  riskScore?: number;
}


export interface TrustGraphEdge {
  from: string;
  to: string;
  label?: string;
}

export interface TrustGraph {
  nodes: TrustGraphNode[];
  edges: TrustGraphEdge[];
}

export type MessageType =
  | 'SCAN_EMAIL'
  | 'SCAN_RESULT'
  | 'GET_LATEST_SCAN'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'MARK_TRUSTED'
  | 'REPORT_SUSPICIOUS'
  | 'CLEAR_MEMORY'
  | 'RUN_DEMO'
  | 'PAGE_STATUS';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

export const DEFAULT_SETTINGS: Settings = {
  autoScan: false,
  privacyMode: true,
  localOnlyAnalysis: true,
  apiEndpoint: 'http://localhost:8000',
  expertiseLevel: 'beginner',
  demoMode: false,
  activeDemoCase: 'safe-known-sender',
};

export const DEFAULT_BEHAVIOR_PROFILE: BehaviorProfile = {
  knownSenders: {},
  knownDomains: {},
  usualRequestTypes: ['informational', 'scheduling'],
  communicationFrequency: {},
};

export const DEFAULT_STORAGE: StorageData = {
  settings: DEFAULT_SETTINGS,
  trustedContacts: [],
  trustedDomains: [],
  behaviorProfile: DEFAULT_BEHAVIOR_PROFILE,
  scanHistory: [],
  latestScan: null,
};
