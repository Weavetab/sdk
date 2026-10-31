export interface WaitForOptions {
  timeoutMs?: number;
  visible?: boolean;
}

export interface CdpSessionLike {
  Runtime?: {
    evaluate: (params: {
      expression: string;
      returnByValue?: boolean;
      awaitPromise?: boolean;
    }) => Promise<{
      result?: { value?: any };
      exceptionDetails?: { exception?: { description?: string } };
    }>;
  };
  [key: string]: any;
}

export class TabClient {
  constructor(private readonly session?: CdpSessionLike) {}

  public isAvailable(): boolean {
    return Boolean(this.session?.Runtime);
  }

  public async url(): Promise<string> {
    if (!this.session?.Runtime) return "";
    try {
      const res = await this.session.Runtime.evaluate({
        expression: "window.location.href",
        returnByValue: true,
      });
      return String(res.result?.value || "");
    } catch {
      return "";
    }
  }

  public async title(): Promise<string> {
    if (!this.session?.Runtime) return "";
    try {
      const res = await this.session.Runtime.evaluate({
        expression: "document.title",
        returnByValue: true,
      });
      return String(res.result?.value || "");
    } catch {
      return "";
    }
  }

  public async evaluate<T = any>(fn: string | ((...args: any[]) => T), ...args: any[]): Promise<T> {
    if (!this.session?.Runtime) {
      throw new Error("cdp session unavailable for evaluation");
    }

    let expr: string;
    if (typeof fn === "function") {
      const serializedArgs = args.map((a) => JSON.stringify(a)).join(", ");
      expr = `(${fn.toString()})(${serializedArgs})`;
    } else {
      expr = fn;
    }

    const res = await this.session.Runtime.evaluate({
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });

    if (res.exceptionDetails) {
      const reason = res.exceptionDetails.exception?.description || "eval failed";
      throw new Error(reason);
    }

    return res.result?.value as T;
  }

  public async waitForSelector(selector: string, opts: WaitForOptions = {}): Promise<boolean> {
    const timeout = opts.timeoutMs ?? 5000;
    const pollInterval = 100;
    const start = Date.now();

    const checkVis = Boolean(opts.visible);
    while (Date.now() - start < timeout) {
      const exists = await this.evaluate((sel: string, vis: boolean) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return false;
        if (!vis) return true;
        return (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
      }, selector, checkVis).catch(() => false);
      if (exists) return true;
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
    return false;
  }

  public async extract(selector: string, mode: "text" | "html" | "value" = "text"): Promise<string | null> {
    return await this.evaluate(
      (sel: string, m: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        if (m === "html") return el.outerHTML;
        if (m === "value" && "value" in el) return String((el as any).value);
        return el.textContent?.trim() || "";
      },
      selector,
      mode
    ).catch(() => null);
  }
}
