export interface DiscoveredApp {
  name: string;
  port?: number;
  status: "debug_port_open" | "process_running_no_debug_port";
  title?: string;
  webSocketDebuggerUrl?: string;
  browserVersion?: string;
  pid?: number;
  recommendation?: string;
}

export type DesktopProvider = {
  listApps: () => Promise<DiscoveredApp[]>;
  getTargets?: (port: number) => Promise<any[]>;
};

export class DesktopClient {
  constructor(private readonly provider?: DesktopProvider) {}

  public isAvailable(): boolean {
    return Boolean(this.provider);
  }

  public async listApps(): Promise<DiscoveredApp[]> {
    if (!this.provider) return [];
    try {
      return await this.provider.listApps();
    } catch {
      return [];
    }
  }

  public async getApp(name: string): Promise<DiscoveredApp | null> {
    const apps = await this.listApps();
    const query = name.toLowerCase().trim();
    const aliases: Record<string, string> = {
      code: "vs code",
      vscode: "vs code",
      "visual studio code": "vs code",
    };
    const target = aliases[query] || query;
    return apps.find((app) => {
      const normalized = app.name.toLowerCase();
      return normalized === target || (aliases[normalized] && aliases[normalized] === target);
    }) || null;
  }

  public async getTargets(name: string): Promise<any[]> {
    if (!this.provider?.getTargets) return [];
    const app = await this.getApp(name);
    if (!app || !app.port) return [];
    try {
      return await this.provider.getTargets(app.port);
    } catch {
      return [];
    }
  }
}
