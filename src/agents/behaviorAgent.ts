import type { AgentFinding, AnalysisInput, BehaviorProfile, EmailData } from '../types';

function detectRequestTypes(email: EmailData): string[] {
  const text = `${email.subject} ${email.bodyText}`.toLowerCase();
  const types: string[] = [];
  if (/password|credential|login|verify|sign.?in/.test(text)) types.push('credential');
  if (/pay|wire|transfer|invoice|\$|bitcoin/.test(text)) types.push('payment');
  if (/urgent|immediately|asap/.test(text)) types.push('urgent');
  if (/meeting|calendar|invite|schedule/.test(text)) types.push('scheduling');
  if (/download|attachment|open the/.test(text)) types.push('attachment_action');
  if (types.length === 0) types.push('informational');
  return types;
}

export function analyzeBehavior(input: AnalysisInput): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const { email, behaviorProfile, trustedContacts, trustedDomains } = input;
  const senderKey = email.senderEmail.toLowerCase();
  const domain = email.senderDomain.toLowerCase();
  const requestTypes = detectRequestTypes(email);

  const isTrustedContact = trustedContacts.includes(senderKey);
  const isTrustedDomain = trustedDomains.includes(domain);
  const knownSender = behaviorProfile.knownSenders[senderKey];
  const knownDomain = behaviorProfile.knownDomains[domain];

  if (!knownSender && !isTrustedContact) {
    findings.push({
      agent: 'BehaviorAgent',
      category: 'new_sender',
      severity: 'medium',
      score: 15,
      title: 'First-time sender',
      description: 'You have not communicated with this sender before.',
      evidence: email.senderEmail,
    });
  }

  if (!knownDomain && !isTrustedDomain && domain) {
    findings.push({
      agent: 'BehaviorAgent',
      category: 'new_domain',
      severity: 'medium',
      score: 10,
      title: 'Unfamiliar sender domain',
      description: `Domain "${domain}" is not in your communication history.`,
      evidence: domain,
    });
  }

  if (isTrustedContact) {
    findings.push({
      agent: 'BehaviorAgent',
      category: 'trusted_sender',
      severity: 'low',
      score: -25,
      title: 'Known trusted sender',
      description: 'This sender is in your trusted contacts list.',
      evidence: email.senderEmail,
    });
  }

  if (isTrustedDomain) {
    findings.push({
      agent: 'BehaviorAgent',
      category: 'trusted_domain',
      severity: 'low',
      score: -20,
      title: 'Trusted domain',
      description: 'Sender domain is on your trusted domains list.',
      evidence: domain,
    });
  }

  const sensitiveTypes = ['credential', 'payment', 'attachment_action'];
  const hasSensitiveRequest = requestTypes.some((t) => sensitiveTypes.includes(t));

  if (hasSensitiveRequest && knownSender) {
    const previousTypes = knownSender.requestTypes || [];
    const isFirstTimeSensitive = sensitiveTypes.some(
      (t) => requestTypes.includes(t) && !previousTypes.includes(t)
    );
    if (isFirstTimeSensitive) {
      findings.push({
        agent: 'BehaviorAgent',
        category: 'first_time_sensitive',
        severity: 'high',
        score: 20,
        title: 'First-time sensitive request from known sender',
        description: 'This sender is asking for something they have never requested before (payment, credentials, etc.).',
        evidence: requestTypes.filter((t) => sensitiveTypes.includes(t)).join(', '),
      });
    }
  } else if (hasSensitiveRequest && !knownSender) {
    findings.push({
      agent: 'BehaviorAgent',
      category: 'first_time_sensitive',
      severity: 'high',
      score: 20,
      title: 'Sensitive request from unknown sender',
      description: 'An unfamiliar sender is requesting credentials, payment, or file action.',
    });
  }

  if (requestTypes.includes('urgent') && knownSender) {
    const usualTone = knownSender.usualTone || 'neutral';
    if (usualTone === 'neutral' || usualTone === 'formal') {
      findings.push({
        agent: 'BehaviorAgent',
        category: 'tone_mismatch',
        severity: 'medium',
        score: 15,
        title: 'Unusual urgency from familiar sender',
        description: 'This sender typically communicates calmly but this message shows atypical urgency.',
      });
    }
  }

  if (knownSender && knownSender.interactionCount > 5 && knownSender.trustScore > 70) {
    findings.push({
      agent: 'BehaviorAgent',
      category: 'established_sender',
      severity: 'low',
      score: -10,
      title: 'Established communication pattern',
      description: 'Regular communication history with this sender.',
    });
  }

  return findings;
}

export function updateBehaviorProfile(
  profile: BehaviorProfile,
  email: EmailData,
  riskScore: number
): BehaviorProfile {
  const senderKey = email.senderEmail.toLowerCase();
  const domain = email.senderDomain.toLowerCase();
  const requestTypes = detectRequestTypes(email);
  const now = Date.now();

  const text = `${email.subject} ${email.bodyText}`.toLowerCase();
  const usualTone = /urgent|immediately|asap/.test(text)
    ? 'urgent'
    : /dear|regards|sincerely/.test(text)
      ? 'formal'
      : 'neutral';

  const existingSender = profile.knownSenders[senderKey];
  profile.knownSenders[senderKey] = {
    email: senderKey,
    name: email.senderName,
    trustScore: existingSender
      ? Math.round((existingSender.trustScore + (100 - riskScore)) / 2)
      : 100 - riskScore,
    interactionCount: (existingSender?.interactionCount || 0) + 1,
    lastSeen: now,
    requestTypes: [
      ...new Set([...(existingSender?.requestTypes || []), ...requestTypes]),
    ],
    usualTone: existingSender?.usualTone || usualTone,
  };

  const existingDomain = profile.knownDomains[domain];
  profile.knownDomains[domain] = {
    domain,
    trustScore: existingDomain
      ? Math.round((existingDomain.trustScore + (100 - riskScore)) / 2)
      : 100 - riskScore,
    interactionCount: (existingDomain?.interactionCount || 0) + 1,
    lastSeen: now,
  };

  profile.communicationFrequency[senderKey] =
    (profile.communicationFrequency[senderKey] || 0) + 1;

  return profile;
}

export default analyzeBehavior;
