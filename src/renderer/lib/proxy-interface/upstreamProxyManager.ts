import { HttpsProxyAgent } from "https-proxy-agent";

export interface RouteOverride {
  hostPattern: string;
  proxyChain?: string;
  vpn?: string;
}

// Simple hostname matcher supporting `*.` prefix wildcards
function matchesHost(pattern: string, host: string): boolean {
  if (pattern.startsWith("*")) {
    const suffix = pattern.slice(1);
    return host.endsWith(suffix);
  }
  return pattern === host;
}

export default class UpstreamProxyManager {
  private index = 0;
  constructor(
    private proxies: string[] = [],
    private overrides: RouteOverride[] = [],
    private strategy: string = "round-robin"
  ) {}

  /** Select upstream proxy for given host considering overrides */
  getProxyForHost(host?: string): string | undefined {
    if (host) {
      const override = this.overrides.find((o) => matchesHost(o.hostPattern, host));
      if (override?.proxyChain) {
        return override.proxyChain;
      }
    }
    return this.getNextProxy();
  }

  /** Rotate through configured proxies based on strategy */
  private getNextProxy(): string | undefined {
    if (!this.proxies.length) return undefined;
    if (this.strategy === "round-robin") {
      const proxy = this.proxies[this.index % this.proxies.length];
      this.index = (this.index + 1) % this.proxies.length;
      return proxy;
    }
    // default to first proxy
    return this.proxies[0];
  }

  /** Attach upstream proxy to proxy-to-server options */
  applyToRequest(host: string | undefined, options: any) {
    const upstream = this.getProxyForHost(host);
    if (upstream) {
      options.agent = new HttpsProxyAgent(upstream);
    }
  }
}
