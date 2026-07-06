import { storageService } from '../storage/storageService';
import { apiClient } from '../api/apiClient';
import { runLocalAnalysis } from '../agents/analysisEngine';
import type { AnalysisInput, EmailData, ExtensionMessage, ScanResult } from '../types';
import { getDemoCase } from '../demo/demoCases';

async function performScan(email: EmailData): Promise<ScanResult> {
  const data = await storageService.getAll();
  apiClient.setBaseUrl(data.settings.apiEndpoint);

  const input: AnalysisInput = {
    email,
    settings: data.settings,
    trustedContacts: data.trustedContacts,
    trustedDomains: data.trustedDomains,
    behaviorProfile: data.behaviorProfile,
  };

  if (data.settings.demoMode && data.settings.activeDemoCase) {
    const demoCase = getDemoCase(data.settings.activeDemoCase);
    if (demoCase) {
      input.email = demoCase.email;
    }
  }

  const response = await apiClient.analyze(input);
  let result = response.result ?? (await runLocalAnalysis(input));

  // Merge local calculations to guarantee dashboard properties exist
  if (!result.subScores || !result.socialEngineering || !result.linkIntel) {
    const local = await runLocalAnalysis(input);
    result = {
      ...result,
      trustScore: local.trustScore ?? 100 - result.riskScore,
      subScores: result.subScores ?? local.subScores,
      socialEngineering: result.socialEngineering ?? local.socialEngineering,
      reasoningBullets: result.reasoningBullets ?? local.reasoningBullets,
      linkIntel: result.linkIntel ?? local.linkIntel,
      qrIntel: result.qrIntel ?? local.qrIntel,
      contextualAnomalies: result.contextualAnomalies ?? local.contextualAnomalies,
    };
  }

  await storageService.addScanResult(result);
  return result;
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    const handle = async () => {
      switch (message.type) {
        case 'SCAN_EMAIL': {
          const email = (message.payload as { email: EmailData }).email;
          const result = await performScan(email);
          return { success: true, result };
        }
        case 'GET_LATEST_SCAN': {
          const result = await storageService.getLatestScan();
          return { success: true, result };
        }
        case 'GET_SETTINGS': {
          const settings = await storageService.getSettings();
          return { success: true, settings };
        }
        case 'UPDATE_SETTINGS': {
          const partial = message.payload as Partial<typeof import('../types').DEFAULT_SETTINGS>;
          const settings = await storageService.updateSettings(partial);
          return { success: true, settings };
        }
        case 'MARK_TRUSTED': {
          const { email, domain } = message.payload as { email?: string; domain?: string };
          if (email) await storageService.addTrustedContact(email);
          if (domain) await storageService.addTrustedDomain(domain);
          return { success: true };
        }
        case 'REPORT_SUSPICIOUS': {
          const scan = await storageService.getLatestScan();
          if (scan) {
            const updated = { ...scan, recommendedAction: 'Reported to CyberTwin AI threat queue (local demo).' };
            await storageService.addScanResult(updated);
          }
          return { success: true };
        }
        case 'CLEAR_MEMORY': {
          await storageService.clearAllMemory();
          return { success: true };
        }
        case 'RUN_DEMO': {
          const { caseId } = message.payload as { caseId: string };
          const demoCase = getDemoCase(caseId);
          if (!demoCase) return { success: false, error: 'Demo case not found' };
          await storageService.updateSettings({ demoMode: true, activeDemoCase: caseId });
          const result = await performScan(demoCase.email);
          return { success: true, result };
        }
        default:
          return { success: false, error: 'Unknown message type' };
      }
    };

    handle()
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: String(err) }));
    return true;
  }
);

chrome.runtime.onInstalled.addListener(() => {
  console.log('[CyberTwin AI] Extension installed — Digital Trust Guardian active.');
});

export {};
