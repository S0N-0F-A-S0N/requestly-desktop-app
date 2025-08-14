import fs from 'fs';
import path from 'path';
import axios from 'axios';

export type BlocklistType = '0.0.0.0' | 'custom';

export interface HostListConfig {
  name: string;
  file: string; // file name under basePath
  enabled: boolean;
  type: BlocklistType;
  url?: string; // remote url for updating
  endpoint?: string; // for custom type
}

interface HostList extends HostListConfig {
  hosts: Set<string>;
  lastUpdated: number | null;
  blocked: number;
  perHost: Record<string, number>;
}

class HostListManager {
  private basePath: string;
  private lists: Map<string, HostList> = new Map();

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Load all hostlists present in the base directory. Each file becomes a list with same name.
   */
  loadAllFromDisk() {
    if (!fs.existsSync(this.basePath)) return;
    const files = fs.readdirSync(this.basePath);
    files.forEach((file) => {
      const name = path.basename(file, path.extname(file));
      const config: HostListConfig = {
        name,
        file,
        enabled: true,
        type: '0.0.0.0',
      };
      this.loadList(config);
    });
  }

  loadList(config: HostListConfig) {
    const filePath = path.join(this.basePath, config.file);
    const list: HostList = {
      ...config,
      hosts: new Set<string>(),
      lastUpdated: null,
      blocked: 0,
      perHost: {},
    };
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const parts = trimmed.split(/\s+/);
        const host = parts.length > 1 ? parts[1] : parts[0];
        list.hosts.add(host);
      });
    } catch (e) {
      // ignore missing files
    }
    this.lists.set(config.name, list);
  }

  async updateList(name: string): Promise<void> {
    const list = this.lists.get(name);
    if (!list || !list.url) return;
    const res = await axios.get(list.url, { responseType: 'text' });
    const filePath = path.join(this.basePath, list.file);
    fs.writeFileSync(filePath, res.data, 'utf8');
    list.lastUpdated = Date.now();
    this.loadList(list); // reload hosts
  }

  enable(name: string, enabled: boolean) {
    const list = this.lists.get(name);
    if (list) list.enabled = enabled;
  }

  setType(name: string, type: BlocklistType, endpoint?: string) {
    const list = this.lists.get(name);
    if (list) {
      list.type = type;
      list.endpoint = endpoint;
    }
  }

  /**
   * Returns the list name that blocks the host, or null if not blocked.
   */
  checkHost(host: string): string | null {
    for (const [name, list] of this.lists.entries()) {
      if (!list.enabled) continue;
      if (list.hosts.has(host)) {
        list.blocked += 1;
        list.perHost[host] = (list.perHost[host] || 0) + 1;
        return name;
      }
    }
    return null;
  }

  getStats() {
    const stats: Record<string, { blocked: number; perHost: Record<string, number> }> = {};
    for (const [name, list] of this.lists.entries()) {
      stats[name] = { blocked: list.blocked, perHost: list.perHost };
    }
    return stats;
  }
}

// default manager with base path under static/hostlists
const defaultBase = path.resolve(__dirname, '../../../static/hostlists');
export const hostListManager = new HostListManager(defaultBase);

export default hostListManager;
