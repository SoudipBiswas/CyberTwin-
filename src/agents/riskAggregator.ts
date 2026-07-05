import type { AgentFinding, RiskAggregation, RiskLevel } from '../types';
import { clampScore, scoreToLevel } from '../utils/scoreUtils';

export function aggregateRisk(
  findings: AgentFinding[],
  baseSenderTrust = 50
): RiskAggregation {
  let score = 0;
  const seenCategories = new Set<string>();

  for (const finding of findings) {
    const key = `${finding.agent}:${finding.category}`;
    if (seenCategories.has(key) && finding.score > 0) continue;
    seenCategories.add(key);
    score += finding.score;
  }

  const clamped = clampScore(score);
  const level = scoreToLevel(clamped);

  const positiveFindings = findings
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score);

  const topReasons = positiveFindings.slice(0, 5).map((f) => f.title);

  const behaviorTrustAdjust = findings
    .filter((f) => f.category === 'trusted_sender' || f.category === 'trusted_domain' || f.category === 'established_sender')
    .reduce((sum, f) => sum + Math.abs(f.score), 0);

  const senderTrustScore = clampScore(baseSenderTrust + behaviorTrustAdjust - clamped * 0.3);

  return {
    score: clamped,
    level,
    findings,
    topReasons,
    recommendedAction: getRecommendedAction(level, positiveFindings),
    senderTrustScore,
  };
}

function getRecommendedAction(level: RiskLevel, findings: AgentFinding[]): string {
  if (level === 'safe') {
    return 'No immediate action needed. Continue normal communication with caution.';
  }
  if (level === 'suspicious') {
    return 'Verify the sender through a separate channel before clicking links or opening attachments.';
  }

  const hasCredential = findings.some((f) => f.category.includes('credential'));
  const hasPayment = findings.some((f) => f.category.includes('payment'));
  const hasAttachment = findings.some((f) =>
    ['executable', 'double_extension', 'macro_document'].includes(f.category)
  );

  if (hasCredential) {
    return 'Do NOT enter credentials. Report this message and delete it immediately.';
  }
  if (hasPayment) {
    return 'Do NOT send money or share financial details. Confirm with the sender via phone or in person.';
  }
  if (hasAttachment) {
    return 'Do NOT open attachments. Quarantine this message and report to your security team.';
  }
  return 'Treat as highly dangerous. Do not interact with links or attachments. Report immediately.';
}

export default aggregateRisk;
