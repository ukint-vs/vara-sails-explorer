import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadJson } from "../lib/download";

type RecordedAnchor = {
  href?: string;
  download?: string;
  clickCount: number;
};

describe("downloadJson", () => {
  const originalDocument = (globalThis as { document?: unknown }).document;
  const originalUrl = (globalThis as { URL?: unknown }).URL;
  let recorded: RecordedAnchor;
  let revoked: string[];

  beforeEach(() => {
    recorded = { clickCount: 0 };
    revoked = [];
    const fakeAnchor: RecordedAnchor & {
      click: () => void;
    } = {
      clickCount: 0,
      click() {
        recorded.href = this.href;
        recorded.download = this.download;
        recorded.clickCount += 1;
      }
    };
    Object.defineProperty(globalThis, "document", {
      value: {
        createElement: (tag: string) => {
          if (tag !== "a") throw new Error(`unexpected createElement(${tag})`);
          return fakeAnchor;
        },
        body: {
          appendChild: () => undefined,
          removeChild: () => undefined
        }
      },
      configurable: true
    });
    Object.defineProperty(globalThis, "URL", {
      value: {
        createObjectURL: vi.fn(() => "blob:mock-url"),
        revokeObjectURL: (url: string) => {
          revoked.push(url);
        }
      },
      configurable: true
    });
  });

  afterEach(() => {
    if (originalDocument === undefined) {
      Reflect.deleteProperty(globalThis, "document");
    } else {
      Object.defineProperty(globalThis, "document", { value: originalDocument, configurable: true });
    }
    if (originalUrl === undefined) {
      Reflect.deleteProperty(globalThis, "URL");
    } else {
      Object.defineProperty(globalThis, "URL", { value: originalUrl, configurable: true });
    }
  });

  it("serializes the payload and triggers a click on a temporary anchor", () => {
    downloadJson("decode-abc-call-2026-01-01.json", { provenance: { id: "x" }, trace: [] });
    expect(recorded.download).toBe("decode-abc-call-2026-01-01.json");
    expect(recorded.href).toBe("blob:mock-url");
    expect(recorded.clickCount).toBe(1);
    expect(revoked).toEqual(["blob:mock-url"]);
  });

  it("noops when document is unavailable", () => {
    Reflect.deleteProperty(globalThis, "document");
    expect(() => downloadJson("noop.json", {})).not.toThrow();
    expect(recorded.clickCount).toBe(0);
  });
});
