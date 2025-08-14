import Store from "electron-store";
import axios from "axios";

export interface HostListConfig {
  id: string;
  url: string;
  enabled: boolean;
  type?: "zero" | "custom"; // 0.0.0.0 or custom endpoint
  lastUpdated?: number;
  entries: string[];
  blocked?: number;
  hostCounters?: Record<string, number>;
}

class AdblockService {
  private store: Store<{ lists: HostListConfig[] }>;
  public lists: HostListConfig[];

  constructor() {
    this.store = new Store({ name: "adblock" });
    this.lists = this.store.get("lists", []).map((l: any) => ({
      ...l,
      entries: l.entries || [],
    }));
  }

  private save() {
    this.store.set("lists", this.lists);
  }

  getLists() {
    return this.lists;
  }

  enableList(id: string, enabled: boolean) {
    const list = this.lists.find((l) => l.id === id);
    if (list) {
      list.enabled = enabled;
      this.save();
    }
  }

  async updateList(id: string) {
    const list = this.lists.find((l) => l.id === id);
    if (!list) return;
    try {
      const response = await axios.get(list.url);
      const lines = (response.data as string)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));
      list.entries = lines;
      list.lastUpdated = Date.now();
      this.save();
    } catch (e) {
      // ignore network errors
    }
  }

  shouldBlock(host: string) {
    for (const list of this.lists) {
      if (!list.enabled) continue;
      if (list.entries.includes(host)) {
        list.blocked = (list.blocked || 0) + 1;
        list.hostCounters = list.hostCounters || {};
        list.hostCounters[host] = (list.hostCounters[host] || 0) + 1;
        this.save();
        return true;
      }
    }
    return false;
  }
}

const adblockService = new AdblockService();
export default adblockService;
