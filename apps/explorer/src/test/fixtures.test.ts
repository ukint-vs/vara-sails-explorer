import { describe, expect, it } from "vitest";
import { blocks, messages, programs, variants } from "../data/fixtures";

describe("static explorer fixtures", () => {
  it("contains data for all source mockup directions", () => {
    expect(variants.map((variant) => variant.slug).sort()).toEqual(
      ["documentarian", "operator", "search-first", "terminal"].sort()
    );
  });

  it("keeps message rows split across execution, decode, finality, trust, and data source", () => {
    const [message] = messages;

    expect(message.execution).toBe("executed");
    expect(message.decode).toBe("decoded");
    expect(message.finality).toBe("pre_confirmed");
    expect(message.dataSource).toBe("direct_rpc");
    expect(message.trust).toBe("embedded_idl");
  });

  it("provides enough static data to render core tables", () => {
    expect(blocks.length).toBeGreaterThanOrEqual(4);
    expect(messages.length).toBeGreaterThanOrEqual(4);
    expect(programs.length).toBeGreaterThanOrEqual(3);
  });
});
