import type { AgentFinding, EmailData } from '../types';
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
  'rebrand.ly',
  'shorturl.at',
];

const SUSPICIOUS_KEYWORDS = ['login', 'verify', 'secure', 'account', 'update', 'signin', 'auth'];

export function analyzeUrls(email: EmailData): AgentFinding[] {
  const findings: AgentFinding[] = [];
  const senderDomain = email.senderDomain.toLowerCase();

  if (email.links.length === 0) return findings;

  for (const link of email.links) {
    const href = link.href;
    const linkDomain = extractDomainFromUrl(href);

    if (href.startsWith('http://')) {
      findings.push({
        agent: 'URLAgent',
        category: 'insecure_http',
        severity: 'medium',
        score: 10,
        title: 'Insecure HTTP link',
        description: 'Link uses HTTP instead of HTTPS.',
        evidence: href,
      });
    }

    if (URL_SHORTENERS.some((s) => linkDomain.includes(s) || href.includes(s))) {
      findings.push({
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
      findings.push({
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
      findings.push({
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
        findings.push({
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
      findings.push({
        agent: 'URLAgent',
        category: 'link_text_mismatch',
        severity: 'critical',
        score: 30,
        title: 'Display text does not match URL',
        description: 'Visible link text differs from the actual destination — classic phishing technique.',
        evidence: `"${link.displayText}" → ${href}`,
      });
    }
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

export default analyzeUrls;
