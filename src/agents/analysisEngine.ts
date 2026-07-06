import type { AnalysisInput, ScanResult, TrustGraph, TrustGraphNode } from '../types';
import { analyzeLanguage } from './languageAgent';
import { analyzeUrls, analyzeLinkIntelligence } from './urlAgent';
import { analyzeAttachments } from './attachmentAgent';
import { detectQRPhishing, analyzeQRIntel } from './qrAgent';
import { analyzeBehavior, analyzeContextualAnomalies, updateBehaviorProfile } from './behaviorAgent';
import { analyzeThreatIntel, threatIntelToFindings } from './threatIntelAgent';
import { aggregateRisk } from './riskAggregator';
import { generateExplanation } from './explanationEngine';
import { scrubPII } from '../privacy/piiScrubber';
import { storageService } from '../storage/storageService';

export async function runLocalAnalysis(input: AnalysisInput): Promise<ScanResult> {
  const languageFindings = analyzeLanguage(input.email);
  const urlFindings = analyzeUrls(input.email);
  const attachmentFindings = analyzeAttachments(input.email);
  const qrFindings = detectQRPhishing(input.email);
  const behaviorFindings = analyzeBehavior(input);
  const threatIntel = analyzeThreatIntel(input.email);
  const intelFindings = threatIntelToFindings(threatIntel);

  const allFindings = [
    ...languageFindings,
    ...urlFindings,
    ...attachmentFindings,
    ...qrFindings,
    ...behaviorFindings,
    ...intelFindings,
  ];

  const aggregation = aggregateRisk(allFindings);
  const scrubbed = scrubPII(input.email.bodyText);
  const linkIntel = analyzeLinkIntelligence(input.email);
  const qrIntel = analyzeQRIntel(input.email);
  const contextualAnomalies = analyzeContextualAnomalies(input);

  const result: ScanResult = {
    id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    email: input.email,
    riskScore: aggregation.score,
    riskLevel: aggregation.level,
    senderTrustScore: aggregation.senderTrustScore,
    findings: aggregation.findings,
    topReasons: aggregation.topReasons,
    recommendedAction: aggregation.recommendedAction,
    explanation: generateExplanation(
      aggregation.level,
      aggregation.topReasons,
      input.settings.expertiseLevel
    ),
    threatIntel,
    scrubbedPreview: scrubbed.scrubbed.slice(0, 500),
    trustScore: aggregation.trustScore,
    subScores: aggregation.subScores,
    socialEngineering: aggregation.socialEngineering,
    reasoningBullets: aggregation.reasoningBullets,
    linkIntel,
    qrIntel,
    contextualAnomalies,
  };

  const updatedProfile = updateBehaviorProfile(
    { ...input.behaviorProfile },
    input.email,
    result.riskScore
  );
  await storageService.updateBehaviorProfile(updatedProfile);

  return result;
}

export function buildTrustGraph(scan: ScanResult): TrustGraph {
  const nodes: TrustGraphNode[] = [
    { id: 'user', label: 'You', type: 'user' as const },
    {
      id: 'sender',
      label: scan.email.senderName || scan.email.senderEmail,
      type: 'sender' as const,
      riskScore: 100 - scan.senderTrustScore,
    },
    {
      id: 'domain',
      label: scan.email.senderDomain,
      type: 'domain' as const,
    },
    {
      id: 'language',
      label: 'Content Tone',
      type: 'language' as const,
    },
    {
      id: 'behavior',
      label: 'Context Patterns',
      type: 'behavior' as const,
    },
    {
      id: 'risk',
      label: `Trust: ${scan.trustScore}`,
      type: 'risk' as const,
      riskScore: 100 - scan.trustScore,
    },
  ];

  const edges = [
    { from: 'user', to: 'sender', label: 'communicates' },
    { from: 'sender', to: 'domain', label: 'from domain' },
    { from: 'sender', to: 'language', label: 'tone analysis' },
    { from: 'sender', to: 'behavior', label: 'context history' },
    { from: 'domain', to: 'risk', label: 'validates' },
    { from: 'language', to: 'risk', label: 'factors' },
    { from: 'behavior', to: 'risk', label: 'checks' },
  ];

  if (scan.qrIntel && scan.qrIntel.detected) {
    nodes.push({ id: 'qr', label: `QR: ${scan.qrIntel.decodedUrl ? 'Decoded' : 'Detected'}`, type: 'qr' as const });
    edges.push({ from: 'sender', to: 'qr', label: 'contains QR' });
    edges.push({ from: 'qr', to: 'risk', label: 'evaluates' });
  }

  scan.email.links.slice(0, 2).forEach((link, i) => {
    const id = `link_${i}`;
    nodes.push({ id, label: link.displayText || link.href.slice(0, 24), type: 'link' as const });
    edges.push({ from: 'sender', to: id, label: 'sends' });
    edges.push({ from: id, to: 'risk', label: 'checks' });
  });

  scan.email.attachments.slice(0, 2).forEach((att, i) => {
    const id = `att_${i}`;
    nodes.push({ id, label: att, type: 'attachment' as const });
    edges.push({ from: 'sender', to: id, label: 'attaches' });
    edges.push({ from: id, to: 'risk', label: 'scans' });
  });

  return { nodes, edges };
}

export default runLocalAnalysis;
