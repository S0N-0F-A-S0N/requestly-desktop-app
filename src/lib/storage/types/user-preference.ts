export interface UserPreferenceObj {
  defaultPort: number;
  localFileLogConfig: {
    isEnabled: boolean;
    storePath: string;
    filter: string[]
  };
  proxyChains?: any[];
  wireguardConfigs?: any[];
  routeOverrides?: any[];
}

export interface ISource {
  defaultPort: number;
  isLocalLoggingEnabled: boolean;
  logStorePath: string;
  localLogFilterfilter: string[]
}
