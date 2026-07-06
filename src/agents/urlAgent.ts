import type { AgentFinding, EmailData, LinkIntel } from '../types';
import {
  detectTyposquat,
  domainsMismatch,
  extractDomainFromUrl,
  isSuspiciousTld,
} from '../utils/domainUtils';

const URL_SHORTENERS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'cutt.ly',
  'rebrand.ly',
  'shorturl.at',
  'lnkd.in',
];

const TRUSTED_DOMAINS = [
  'google.com',
  'gmail.com',
  'bigbasket.com',
  'vercel.com',
  'github.com',
  'nvidia.com',
  'microsoft.com',
];

const SUSPICIOUS_KEYWORDS = ['login', 'verify', 'secure', 'account', 'update', 'signin', 'auth'];

// Helper to determine if a domain looks like a newly registered / high-risk domain
export function isNewlyRegisteredDomain(domain: string): boolean {
  const lower = domain.toLowerCase();
  // Mock check for demo/known threat domains
  const knownThreats = ['paypa1-verify.com', 'dhl-delivery.top', 'invoice-paymnt.xyz', 'google-calendar.xyz'];
  if (knownThreats.some(t => lower.includes(t))) {
    return true;
  }
  // Heuristic: domains with multiple dashes, random numbers, or suspicious TLDs
  const hasMultipleDashes = (lower.match(/-/g) || []).length >= 2;
  const hasNumbers = /\d{3,}/.test(lower);
  return hasMultipleDashes || hasNumbers;
}

export function analyzeUrls(email: EmailData): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const senderDomain = email.senderDomain.toLowerCase();

  if (email.links.length === 0) return findings;

  for (const link of email.links) {
    const href = link.href;
    const linkDomain = extractDomainFromUrl(href);
    const linkFindings: AgentFinding[] = [];

    if (href.startsWith('http://')) {
      linkFindings.push({
        agent: 'URLAgent',
        category: 'insecure_http',
        severity: 'medium',
        score: 10,
        title: 'Insecure HTTP link',
        description: 'Link uses HTTP instead of HTTPS.',
        evidence: href,
      });
    }

    const isUrlShortener = URL_SHORTENERS.some((s) => {
      return linkDomain === s || linkDomain.endsWith('.' + s);
    });

    if (isUrlShortener) {
      linkFindings.push({
        agent: 'URLAgent',
        category: 'url_shortener',
        severity: 'medium',
        score: 15,
        title: 'URL shortener detected',
        description: 'Shortened URLs can hide malicious destinations.',
        evidence: href,
      });
    }

    if (linkDomain && isSuspiciousTld(linkDomain)) {
      linkFindings.push({
        agent: 'URLAgent',
        category: 'suspicious_tld',
        severity: 'high',
        score: 30,
        title: 'Suspicious top-level domain',
        description: `Domain uses a high-risk TLD: .${linkDomain.split('.').pop()}`,
        evidence: linkDomain,
      });
    }

    const typosquat = linkDomain ? detectTyposquat(linkDomain) : null;
    if (typosquat) {
      linkFindings.push({
        agent: 'URLAgent',
        category: 'typosquatting',
        severity: 'critical',
        score: 30,
        title: 'Possible typosquatted domain',
        description: `Domain may impersonate "${typosquat}".`,
        evidence: linkDomain,
      });
    }

    if (linkDomain && senderDomain && domainsMismatch(senderDomain, linkDomain)) {
      const hasSuspiciousPath = SUSPICIOUS_KEYWORDS.some((k) =>
        href.toLowerCase().includes(k)
      );
      if (hasSuspiciousPath || link.mismatched) {
        linkFindings.push({
          agent: 'URLAgent',
          category: 'domain_mismatch',
          severity: 'high',
          score: 25,
          title: 'Sender/link domain mismatch',
          description: `Sender domain (${senderDomain}) differs from link domain (${linkDomain}).`,
          evidence: href,
        });
      }
    }

    if (link.mismatched) {
      linkFindings.push({
        agent: 'URLAgent',
        category: 'link_text_mismatch',
        severity: 'critical',
        score: 30,
        title: 'Display text does not match URL',
        description: 'Visible link text differs from the actual destination — classic phishing technique.',
        evidence: `"${link.displayText}" → ${href}`,
      });
    }

    const isTrustedOrSender = !!linkDomain && (
      linkDomain === senderDomain ||
      linkDomain.endsWith('.' + senderDomain) ||
      TRUSTED_DOMAINS.some(t => linkDomain === t || linkDomain.endsWith('.' + t))
    );

    if (isTrustedOrSender) {
      for (const finding of linkFindings) {
        finding.score = Math.max(1, Math.round(finding.score * 0.5));
        if (finding.severity === 'critical') {
          finding.severity = 'high';
        } else if (finding.severity === 'high') {
          finding.severity = 'medium';
        } else if (finding.severity === 'medium') {
          finding.severity = 'low';
        }
      }
    }

    findings.push(...linkFindings);
  }

  const senderTyposquat = detectTyposquat(senderDomain);
  if (senderTyposquat) {
    findings.push({
      agent: 'URLAgent',
      category: 'sender_typosquat',
      severity: 'critical',
      score: 30,
      title: 'Suspicious sender domain',
      description: `Sender domain may typosquat "${senderTyposquat}".`,
      evidence: senderDomain,
    });
  }

  return findings;
}

export function analyzeLinkIntelligence(email: EmailData): LinkIntel[] {
  return email.links.map((link) => {
    const url = link.href;
    const domain = extractDomainFromUrl(url);
    const isShortener = URL_SHORTENERS.some((s) => domain === s || domain.endsWith('.' + s));
    const isTyposquat = !!domain && !!detectTyposquat(domain);
    const isSuspicious = !!domain && isSuspiciousTld(domain);
    const isNew = !!domain && isNewlyRegisteredDomain(domain);
    const isMismatch = !!domain && !!email.senderDomain && domainsMismatch(email.senderDomain, domain);
    
    // Base Link Trust Score
    let trustScore = 100;
    if (url.startsWith('http://')) trustScore -= 20;
    if (isShortener) trustScore -= 20;
    if (isTyposquat) trustScore -= 45;
    if (isSuspicious) trustScore -= 30;
    if (isNew) trustScore -= 25;
    if (isMismatch) trustScore -= 25;
    if (link.mismatched) trustScore -= 40;
    
    trustScore = Math.max(0, Math.min(100, trustScore));

    // Simulated expanded URL for shorteners
    let expandedUrl = url;
    let isRedirected = false;
    if (isShortener) {
      isRedirected = true;
      if (url.includes('inv-pay-8892')) {
        expandedUrl = 'https://invoice-paymnt.xyz/pay/invoice-8892';
      } else {
        expandedUrl = `https://${domain}/expanded-target-${Math.random().toString(36).slice(2, 6)}`;
      }
    }

    const isRiskyDomain = trustScore < 70;

    return {
      url,
      expandedUrl,
      isRedirected,
      isTyposquat,
      isSuspiciousTld: isSuspicious,
      isShortener,
      isRiskyDomain,
      trustScore,
    };
  });
}

export default analyzeUrls;
