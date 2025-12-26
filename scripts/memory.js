import fs from "fs";

const SHORT_TERM_PATH = "memory/short_term.json";
const LONG_TERM_PATH = "memory/long_term.json";

export function loadMemory() {
  return {
    short: JSON.parse(fs.readFileSync(SHORT_TERM_PATH, "utf8")),
    long: JSON.parse(fs.readFileSync(LONG_TERM_PATH, "utf8")),
  };
}

export function saveShort(entry) {
  const mem = JSON.parse(fs.readFileSync(SHORT_TERM_PATH, "utf8"));
  mem.push({
    ...entry,
    timestamp: Date.now(),
  });
  // Keep only last 50 entries
  if (mem.length > 50) {
    mem.splice(0, mem.length - 50);
  }
  fs.writeFileSync(SHORT_TERM_PATH, JSON.stringify(mem, null, 2), "utf8");
}

export function saveLong(key, value) {
  const mem = JSON.parse(fs.readFileSync(LONG_TERM_PATH, "utf8"));
  mem[key] = value;
  fs.writeFileSync(LONG_TERM_PATH, JSON.stringify(mem, null, 2), "utf8");
}

export function addCommonFailure(failure) {
  const mem = JSON.parse(fs.readFileSync(LONG_TERM_PATH, "utf8"));
  if (!mem.common_failures) {
    mem.common_failures = [];
  }
  mem.common_failures.push({
    ...failure,
    timestamp: Date.now(),
  });
  fs.writeFileSync(LONG_TERM_PATH, JSON.stringify(mem, null, 2), "utf8");
}

// CLI usage
if (process.argv[2] === "show") {
  console.log(JSON.stringify(loadMemory(), null, 2));
}
