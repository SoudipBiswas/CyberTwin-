import type { AnalysisInput, ScanResult, TrustGraph, TrustGraphNode } from '../types';
import { analyzeLanguage } from './languageAgent';
import { analyzeUrls } from './urlAgent';
import { analyzeAttachments } from './attachmentAgent';
import { detectQRPhishing } from './qrAgent';
import { analyzeBehavior, updateBehaviorProfile } from './behaviorAgent';
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
      id: 'risk',
      label: `Risk: ${scan.riskScore}`,
      type: 'risk' as const,
      riskScore: scan.riskScore,
    },
  ];

  const edges = [
    { from: 'user', to: 'sender', label: 'communicates' },
    { from: 'sender', to: 'domain', label: 'from domain' },
    { from: 'domain', to: 'risk', label: 'assessed' },
  ];

  scan.email.links.slice(0, 3).forEach((link, i) => {
    const id = `link_${i}`;
    nodes.push({ id, label: link.displayText || link.href.slice(0, 30), type: 'link' });
    edges.push({ from: 'sender', to: id, label: 'contains' });
    edges.push({ from: id, to: 'risk', label: 'contributes' });
  });

  scan.email.attachments.slice(0, 2).forEach((att, i) => {
    const id = `att_${i}`;
    nodes.push({ id, label: att, type: 'attachment' });
    edges.push({ from: 'sender', to: id, label: 'attached' });
    edges.push({ from: id, to: 'risk', label: 'contributes' });
  });

  return { nodes, edges };
}

export default runLocalAnalysis;
