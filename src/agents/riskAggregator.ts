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
  let level = scoreToLevel(clamped);

  const isSpam = findings.some((f) => f.category === 'gmail_spam');
  if (isSpam && level === 'safe') {
    level = 'suspicious';
  }

  const positiveFindings = findings
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score);

  const topReasons = positiveFindings.slice(0, 5).map((f) => f.title);

  const behaviorTrustAdjust = findings
    .filter((f) => f.category === 'trusted_sender' || f.category === 'trusted_domain' || f.category === 'established_sender')
    .reduce((sum, f) => sum + Math.abs(f.score), 0);

  const senderTrustScore = clampScore(baseSenderTrust + behaviorTrustAdjust - clamped * 0.3);

  // Overall Trust Score calculation (0-100)
  // Highly secure trust metric
  const trustScore = clampScore(100 - clamped);

  // Calculate Sub-Scores (Identity, Intent, Manipulation, Website, Financial, Privacy, Confidence)
  const identityTrust = calculateIdentityTrust(findings, senderTrustScore);
  const intentRisk = calculateIntentRisk(findings);
  const manipulationRisk = calculateManipulationRisk(findings);
  const websiteRisk = calculateWebsiteRisk(findings);
  const financialRisk = calculateFinancialRisk(findings);
  const privacyRisk = calculatePrivacyRisk(findings);
  const confidenceScore = calculateConfidenceScore(findings);

  // Map Social Engineering Tactics
  const socialEngineering = mapSocialEngineeringTactics(findings);

  // Generate Explainable AI reasoning bullets
  const reasoningBullets = generateReasoningBullets(findings, level);

  let recommendedAction = getRecommendedAction(level, positiveFindings);
  if (isSpam) {
    recommendedAction = 'Do not click links or download attachments. Verify sender before interacting.';
  }

  return {
    score: clamped,
    level,
    findings,
    topReasons,
    recommendedAction,
    senderTrustScore,
    trustScore,
    subScores: {
      identityTrust,
      intentRisk,
      manipulationRisk,
      websiteRisk,
      financialRisk,
      privacyRisk,
      confidenceScore,
    },
    socialEngineering,
    reasoningBullets,
  };
}

function calculateIdentityTrust(findings: AgentFinding[], senderTrust: number): number {
  let score = senderTrust;
  if (findings.some(f => f.category === 'sender_typosquat' || f.category === 'typosquatting')) {
    score -= 40;
  }
  if (findings.some(f => f.category === 'new_sender')) {
    score -= 10;
  }
  if (findings.some(f => f.category === 'new_domain')) {
    score -= 10;
  }
  if (findings.some(f => f.category === 'gmail_spam')) {
    score -= 20;
  }
  return clampScore(score);
}

function calculateIntentRisk(findings: AgentFinding[]): number {
  let risk = 10;
  if (findings.some(f => f.category === 'credential_request')) risk += 40;
  if (findings.some(f => f.category === 'payment_request')) risk += 30;
  if (findings.some(f => f.category === 'executable' || f.category === 'macro_document')) risk += 25;
  if (findings.some(f => f.category === 'first_time_sensitive')) risk += 15;
  return clampScore(risk);
}

function calculateManipulationRisk(findings: AgentFinding[]): number {
  let risk = 5;
  if (findings.some(f => f.category === 'urgency')) risk += 25;
  if (findings.some(f => f.category === 'fear')) risk += 30;
  if (findings.some(f => f.category === 'authority_pressure')) risk += 20;
  if (findings.some(f => f.category === 'emotional_manipulation')) risk += 20;
  if (findings.some(f => f.category === 'scarcity')) risk += 15;
  if (findings.some(f => f.category === 'curiosity')) risk += 15;
  return clampScore(risk);
}

function calculateWebsiteRisk(findings: AgentFinding[]): number {
  let risk = 0;
  const urlFindings = findings.filter(f => f.agent === 'URLAgent');
  if (urlFindings.length === 0) return 0;

  if (urlFindings.some(f => f.category === 'typosquatting' || f.category === 'sender_typosquat')) risk += 50;
  if (urlFindings.some(f => f.category === 'suspicious_tld')) risk += 30;
  if (urlFindings.some(f => f.category === 'url_shortener')) risk += 20;
  if (urlFindings.some(f => f.category === 'insecure_http')) risk += 15;
  if (urlFindings.some(f => f.category === 'link_text_mismatch' || f.category === 'domain_mismatch')) risk += 35;
  
  return clampScore(risk === 0 ? 10 : risk);
}

function calculateFinancialRisk(findings: AgentFinding[]): number {
  let risk = 5;
  if (findings.some(f => f.category === 'payment_request')) risk += 50;
  if (findings.some(f => f.category === 'fake_invoice')) risk += 40;
  return clampScore(risk);
}

function calculatePrivacyRisk(findings: AgentFinding[]): number {
  let risk = 5;
  if (findings.some(f => f.category === 'credential_request')) risk += 60;
  if (findings.some(f => f.category === 'threat_intel' && f.title.includes('harvesting'))) risk += 30;
  return clampScore(risk);
}

function calculateConfidenceScore(findings: AgentFinding[]): number {
  let confidence = 65;
  const regularPattern = findings.some(f => f.category === 'established_sender' || f.category === 'trusted_sender');
  const criticalThreat = findings.some(f => f.severity === 'critical');
  
  if (regularPattern) confidence += 20;
  if (criticalThreat) confidence += 15;
  if (findings.length > 5) confidence += 10;
  
  return clampScore(Math.min(98, confidence));
}

function mapSocialEngineeringTactics(findings: AgentFinding[]) {
  const getSeverity = (categories: string[]): 'low' | 'medium' | 'high' => {
    const matching = findings.filter(f => categories.includes(f.category));
    if (matching.length === 0) return 'low';
    const isHigh = matching.some(f => f.severity === 'critical' || f.severity === 'high');
    return isHigh ? 'high' : 'medium';
  };

  return {
    urgency: getSeverity(['urgency']),
    fear: getSeverity(['fear']),
    authority: getSeverity(['authority_pressure', 'impersonation']),
    scarcity: getSeverity(['scarcity']),
    curiosity: getSeverity(['curiosity']),
    credentialRequests: getSeverity(['credential_request']),
    financialRequests: getSeverity(['payment_request', 'fake_invoice']),
    emotionalManipulation: getSeverity(['emotional_manipulation']),
  };
}

function generateReasoningBullets(findings: AgentFinding[], level: RiskLevel): string[] {
  const bullets: string[] = [];

  if (level === 'safe') {
    bullets.push('Sender is established and regular communications exist.');
    bullets.push('No typosquatted domains or suspicious TLDs detected in links.');
    bullets.push('Message text contains normal everyday language with no urgency.');
    return bullets;
  }

  // Map specific findings to clear bullets
  findings.forEach(f => {
    if (f.category === 'sender_typosquat' || f.category === 'typosquatting') {
      bullets.push(`Domain mimics a known trusted brand but is not official (${f.evidence}).`);
    }
    if (f.category === 'urgency') {
      bullets.push('Uses psychological urgency or strict deadlines to pressure response.');
    }
    if (f.category === 'fear') {
      bullets.push('Uses fear-based warnings (e.g. account suspension or locking).');
    }
    if (f.category === 'credential_request') {
      bullets.push('Requests input of sensitive credentials, verification codes, or passwords.');
    }
    if (f.category === 'payment_request' || f.category === 'fake_invoice') {
      bullets.push('Asks for immediate wire transfer or payment processing instructions.');
    }
    if (f.category === 'url_shortener') {
      bullets.push('Uses URL shorteners which mask the actual destination address.');
    }
    if (f.category === 'new_domain') {
      bullets.push(`Sender domain "${f.evidence}" has no history in your interaction log.`);
    }
    if (f.category === 'qr_phishing' || f.category === 'qr_destination_risk') {
      bullets.push(`Includes a QR code pointing to an unverified external site (${f.evidence}).`);
    }
    if (f.category === 'double_extension') {
      bullets.push(`Uses deceptive double file extension to mask executable attachment (${f.evidence}).`);
    }
  });

  // Deduplicate and return
  return [...new Set(bullets)].slice(0, 4);
}

function getRecommendedAction(level: RiskLevel, findings: AgentFinding[]): string {
  if (level === 'safe') {
    return 'Safe to proceed. Continue normal communication.';
  }
  if (level === 'suspicious') {
    return 'Verify sender through a separate channel before taking action.';
  }

  const hasCredential = findings.some((f) => f.category.includes('credential'));
  const hasPayment = findings.some((f) => f.category.includes('payment'));
  const hasAttachment = findings.some((f) =>
    ['executable', 'double_extension', 'macro_document'].includes(f.category)
  );

  if (hasCredential) {
    return 'Do NOT enter credentials. Block sender and report immediately.';
  }
  if (hasPayment) {
    return 'Do NOT send money. Verify identity in-person or via phone call.';
  }
  if (hasAttachment) {
    return 'Do NOT download or open the attachment. Open in a sandbox environment.';
  }
  return 'Highly risky interaction. Report threat and ignore communication.';
}

export default aggregateRisk;
