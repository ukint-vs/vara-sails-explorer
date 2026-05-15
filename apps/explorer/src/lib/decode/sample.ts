export const SAMPLE_IDL = `
service Counter {
  functions {
    @entry_id: 1
    Add(value: u32) -> u32 throws String;

    @query
    @entry_id: 2
    Get() -> u32;
  }

  events {
    @entry_id: 3
    Added(u32),
  }
}

program CounterProgram {
  constructors {
    @entry_id: 0
    New(seed: u32);
  }

  services {
    Counter
  }
}
`.trim();

export const SAMPLE_PAYLOAD_HEX = "0x474d01106f8ea93f7a5894a70100010007000000";
