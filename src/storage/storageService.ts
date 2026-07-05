import type {
  BehaviorProfile,
  ScanResult,
  Settings,
  StorageData,
} from '../types';
import {
  DEFAULT_BEHAVIOR_PROFILE,
  DEFAULT_SETTINGS,
  DEFAULT_STORAGE,
} from '../types';

const STORAGE_KEYS = {
  settings: 'settings',
  trustedContacts: 'trustedContacts',
  trustedDomains: 'trustedDomains',
  behaviorProfile: 'behaviorProfile',
  scanHistory: 'scanHistory',
  latestScan: 'latestScan',
} as const;

const memoryFallback: Partial<StorageData> = {};

function isChromeStorageAvailable(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

async function getFromStorage<K extends keyof StorageData>(
  key: K
): Promise<StorageData[K]> {
  if (!isChromeStorageAvailable()) {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`ct_${key}`);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        // ignore
      }
    }
    return (memoryFallback[key] as StorageData[K]) ?? DEFAULT_STORAGE[key];
  }
  const result = await chrome.storage.local.get(key);
  return (result[key] as StorageData[K]) ?? DEFAULT_STORAGE[key];
}

async function setInStorage<K extends keyof StorageData>(
  key: K,
  value: StorageData[K]
): Promise<void> {
  if (!isChromeStorageAvailable()) {
    memoryFallback[key] = value;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`ct_${key}`, JSON.stringify(value));
      } catch (e) {
        // ignore
      }
    }
    return;
  }
  await chrome.storage.local.set({ [key]: value });
}

export const storageService = {
  async getAll(): Promise<StorageData> {
    if (!isChromeStorageAvailable()) {
      return {
        settings: await getFromStorage('settings'),
        trustedContacts: await getFromStorage('trustedContacts'),
        trustedDomains: await getFromStorage('trustedDomains'),
        behaviorProfile: await getFromStorage('behaviorProfile'),
        scanHistory: await getFromStorage('scanHistory'),
        latestScan: await getFromStorage('latestScan'),
      };
    }
    const result = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
    return {
      settings: (result.settings as Settings) ?? DEFAULT_SETTINGS,
      trustedContacts: (result.trustedContacts as string[]) ?? [],
      trustedDomains: (result.trustedDomains as string[]) ?? [],
      behaviorProfile:
        (result.behaviorProfile as BehaviorProfile) ?? DEFAULT_BEHAVIOR_PROFILE,
      scanHistory: (result.scanHistory as ScanResult[]) ?? [],
      latestScan: (result.latestScan as ScanResult | null) ?? null,
    };
  },

  async getSettings(): Promise<Settings> {
    return getFromStorage('settings');
  },

  async updateSettings(partial: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated = { ...current, ...partial };
    await setInStorage('settings', updated);
    return updated;
  },

  async getTrustedContacts(): Promise<string[]> {
    return getFromStorage('trustedContacts');
  },

  async addTrustedContact(email: string): Promise<string[]> {
    const contacts = await this.getTrustedContacts();
    const normalized = email.toLowerCase().trim();
    if (!contacts.includes(normalized)) {
      contacts.push(normalized);
      await setInStorage('trustedContacts', contacts);
    }
    return contacts;
  },

  async removeTrustedContact(email: string): Promise<string[]> {
    const contacts = (await this.getTrustedContacts()).filter(
      (c) => c !== email.toLowerCase().trim()
    );
    await setInStorage('trustedContacts', contacts);
    return contacts;
  },

  async getTrustedDomains(): Promise<string[]> {
    return getFromStorage('trustedDomains');
  },

  async addTrustedDomain(domain: string): Promise<string[]> {
    const domains = await this.getTrustedDomains();
    const normalized = domain.toLowerCase().trim();
    if (!domains.includes(normalized)) {
      domains.push(normalized);
      await setInStorage('trustedDomains', domains);
    }
    return domains;
  },

  async removeTrustedDomain(domain: string): Promise<string[]> {
    const domains = (await this.getTrustedDomains()).filter(
      (d) => d !== domain.toLowerCase().trim()
    );
    await setInStorage('trustedDomains', domains);
    return domains;
  },

  async getBehaviorProfile(): Promise<BehaviorProfile> {
    return getFromStorage('behaviorProfile');
  },

  async updateBehaviorProfile(profile: BehaviorProfile): Promise<void> {
    await setInStorage('behaviorProfile', profile);
  },

  async clearBehaviorProfile(): Promise<void> {
    await setInStorage('behaviorProfile', { ...DEFAULT_BEHAVIOR_PROFILE });
  },

  async getScanHistory(): Promise<ScanResult[]> {
    return getFromStorage('scanHistory');
  },

  async clearScanHistory(): Promise<void> {
    await setInStorage('scanHistory', []);
    await setInStorage('latestScan', null);
  },

  async addScanResult(result: ScanResult): Promise<void> {
    const history = await this.getScanHistory();
    history.unshift(result);
    const trimmed = history.slice(0, 100);
    await setInStorage('scanHistory', trimmed);
    await setInStorage('latestScan', result);
  },

  async getLatestScan(): Promise<ScanResult | null> {
    return getFromStorage('latestScan');
  },

  async clearAllMemory(): Promise<void> {
    if (!isChromeStorageAvailable()) return;
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ ...DEFAULT_STORAGE });
  },
};

export default storageService;
