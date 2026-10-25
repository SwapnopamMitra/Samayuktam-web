
window.TRACES = {
  cagm: {
    title: "./cagm",
    lines: [
      [{ t: "$ ./cagm diabetes_cagm_ready.csv --hidden 64 --epochs 100 --batch 64 --lr 0.005", c: "" }],
      [{ t: "License OK — server check: ", c: "term-dim" }, { t: "PASS", c: "term-pass" }, { t: " | uses remaining: ", c: "term-dim" }, { t: "15", c: "term-ok" }],
      [{ t: "Loaded: ", c: "term-dim" }, { t: "diabetes_cagm_ready.csv", c: "" }, { t: "  rows=768  features=8  classes=2", c: "term-dim" }],
      [{ t: "Early stopping at epoch 29 (best=9, acc=0.8333)", c: "term-dim" }],
      [{ t: "accuracy  ", c: "" }, { t: "0.785156", c: "term-ok" }],
      [{ t: "proof     ", c: "" }, { t: "f8e66dd34cb782bf090211c6c63c0342999fe4f1cf5c8c55b54f532e8071c975", c: "term-warn" }],
      [{ t: "ie_verify ", c: "" }, { t: "PASS", c: "term-pass" }, { t: "  (hash=0x59E4A8B7)", c: "term-dim" }]
    ]
  },
  spcmp: {
    title: "./spcmp",
    lines: [
      [{ t: "$ ./spcmp sort floats.bin --runs 3", c: "" }],
      [{ t: "License OK — server check: ", c: "term-dim" }, { t: "PASS", c: "term-pass" }, { t: " | uses remaining: ", c: "term-dim" }, { t: "15", c: "term-ok" }],
      [{ t: "sort best time: ", c: "term-dim" }, { t: "0.000453 s", c: "term-ok" }],
      [{ t: "$ ./spcmp unsort floats.bin", c: "" }],
      [{ t: "License OK — server check: ", c: "term-dim" }, { t: "PASS", c: "term-pass" }, { t: " | uses remaining: ", c: "term-dim" }, { t: "13", c: "term-ok" }],
      [{ t: "reconstructed: ", c: "term-dim" }, { t: "floats.unsorted.bin", c: "" }, { t: "  (byte-identical to input)", c: "term-dim" }]
    ]
  }
};
