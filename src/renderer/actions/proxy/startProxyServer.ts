// UTILS
import { ip } from "address";

import { RQProxyProvider } from "@requestly/requestly-proxy";
import RulesDataSource from "../../lib/proxy-interface/rulesFetcher";
import LoggerService from "../../lib/proxy-interface/loggerService";
import ProxyChainManager, {
  ProxyChain,
} from "./chainManager";
import RouteOverrideManager from "./routeOverrideManager";
import { HttpsProxyAgent } from "https-proxy-agent";
import preferenceManager from "../../utils/userPreferencesManager";

import getNextAvailablePort from "../getNextAvailablePort";
// CONFIG
import { staticConfig } from "../../config";
// SENTRY
import * as Sentry from "@sentry/browser";
import startHelperServer from "../startHelperServer";
import logger from "utils/logger";
import { getDefaultProxyPort } from "../storage/cacheUtils";
import { handleCARegeneration } from "../apps/os/ca/utils";
import { startHelperSocketServer } from "../helperSocketServer";
import portfinder from "portfinder";

declare global {
  interface Window {
    proxy: any;
  }
}

interface RouteOverride {
  hostPattern: string;
  proxyChain?: string;
  vpn?: string;
}

interface WireGuardConfig {
  name: string;
  configPath: string;
}

interface IStartProxyOptions {
  proxyPort?: number;
  shouldStartHelperServer?: boolean;
  proxyChains?: ProxyChain[];
  routeOverrides?: RouteOverride[];
  wireguardConfigs?: WireGuardConfig[];
}

interface IStartProxyResult {
  success: Boolean;
  port: number | null;
  proxyIp: any;
  helperServerPort?: any;
}

const { CERTS_PATH, ROOT_CERT_PATH } = staticConfig;

const DEFAULT_HELPER_SERVER_PORT = 7040;
const DEFAULT_SOCKET_SERVER_PORT = 59763;

// this automatically stops the old server before starting the new one
export default async function startProxyServer(
  options: IStartProxyOptions = {}
): Promise<IStartProxyResult> {
  const {
    proxyPort,
    shouldStartHelperServer = true,
    proxyChains = preferenceManager.getProxyChains() || [],
    routeOverrides = preferenceManager.getRouteOverrides() || [],
    wireguardConfigs = preferenceManager.getWireguardConfigs() || [],
  } = options;
  // Check if proxy is already listening. If so, close it
  try {
    window.proxy.close();
    logger.log("A proxy server was closed");
  } catch (error) {
    Sentry.captureException(error);
    logger.log("A proxy server close req was made but no proxy was up");
  }
  const proxyIp = ip()!;
  const targetPort = proxyPort || getDefaultProxyPort();

  const result: IStartProxyResult = {
    success: true,
    port: targetPort,
    proxyIp,
  };

  // start the proxy server
  const FINAL_PROXY_PORT = await getNextAvailablePort(targetPort);
  if (!FINAL_PROXY_PORT) {
    result.success = false;
    return result;
  }
  result.port = FINAL_PROXY_PORT;

  global.rq.proxyServerStatus = { port: FINAL_PROXY_PORT };

  startProxyFromModule(result.port, {
    proxyChains,
    routeOverrides,
    wireguardConfigs,
  });

  // start the helper server if not already running
  if (shouldStartHelperServer) {
    const HELPER_SERVER_PORT = await getNextAvailablePort(
      DEFAULT_HELPER_SERVER_PORT
    );

    result.helperServerPort = HELPER_SERVER_PORT;

    if (!HELPER_SERVER_PORT) {
      result.success = false;
      return result;
    }
    await startHelperServer(HELPER_SERVER_PORT);
  }

  const HELPER_SOCKET_SERVER_PORT = await portfinder.getPortPromise({
    port: DEFAULT_SOCKET_SERVER_PORT,
    stopPort: DEFAULT_SOCKET_SERVER_PORT + 4, // 5 ports for fallback
  });
  startHelperSocketServer(HELPER_SOCKET_SERVER_PORT);

  return result;
}

function startProxyFromModule(
  PROXY_PORT: number,
  opts: {
    proxyChains: ProxyChain[];
    routeOverrides: RouteOverride[];
    wireguardConfigs: WireGuardConfig[];
  }
) {
  const proxyConfig = {
    port: PROXY_PORT,
    // @ts-ignore
    certPath: CERTS_PATH,
    rootCertPath: ROOT_CERT_PATH,
    onCARegenerated: handleCARegeneration,
  };
  RQProxyProvider.createInstance(
    proxyConfig,
    new RulesDataSource(),
    new LoggerService()
  );

  const proxy = RQProxyProvider.getInstance().proxy;
  const chainManager = new ProxyChainManager(opts.proxyChains);
  const routeManager = new RouteOverrideManager(
    opts.routeOverrides,
    chainManager,
    opts.wireguardConfigs
  );

  proxy.on("request", (ctx: any, callback: any) => {
    const host = ctx.clientToProxyRequest?.headers?.host || "";
    routeManager
      .resolve(host)
      .then((endpoint) => {
        if (endpoint) {
          ctx.proxyToServerRequestOptions =
            ctx.proxyToServerRequestOptions || {};
          ctx.proxyToServerRequestOptions.agent = new HttpsProxyAgent(endpoint);
        }
        callback();
      })
      .catch((err) => {
        logger.error("route override failed", err);
        callback();
      });
  });

  // Helper server needs http port, hence
  window.proxy = proxy;
}
