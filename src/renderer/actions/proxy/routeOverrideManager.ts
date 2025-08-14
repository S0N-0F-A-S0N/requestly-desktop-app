import ProxyChainManager from "./chainManager";
import { startWireGuard, stopWireGuard } from "../vpn/wireguard";

export interface RouteOverride {
  hostPattern: string;
  proxyChain?: string;
  vpn?: string;
}

export interface WireGuardConfig {
  name: string;
  configPath: string;
}

export default class RouteOverrideManager {
  private overrides: RouteOverride[];
  private chainManager: ProxyChainManager;
  private wireguards: WireGuardConfig[];
  private activeVpn: string | null = null;

  constructor(
    overrides: RouteOverride[] = [],
    chainManager: ProxyChainManager,
    wireguardConfigs: WireGuardConfig[] = []
  ) {
    this.overrides = overrides;
    this.chainManager = chainManager;
    this.wireguards = wireguardConfigs;
  }

  private matchOverride(host: string): RouteOverride | undefined {
    return this.overrides.find((o) => {
      const pattern = new RegExp(
        "^" + o.hostPattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
      );
      return pattern.test(host);
    });
  }

  async resolve(host: string): Promise<string | undefined> {
    const override = this.matchOverride(host);
    const chainName = override?.proxyChain || "default";
    const proxyEndpoint = this.chainManager.getNextEndpoint(chainName);

    if (override?.vpn) {
      const config = this.wireguards.find((c) => c.name === override.vpn);
      if (config && this.activeVpn !== config.name) {
        if (this.activeVpn) {
          const prev = this.wireguards.find((c) => c.name === this.activeVpn);
          if (prev) {
            await stopWireGuard(prev.configPath);
          }
        }
        await startWireGuard(config.configPath);
        this.activeVpn = config.name;
      }
    } else if (this.activeVpn) {
      const prev = this.wireguards.find((c) => c.name === this.activeVpn);
      if (prev) {
        await stopWireGuard(prev.configPath);
      }
      this.activeVpn = null;
    }

    return proxyEndpoint;
  }
}
