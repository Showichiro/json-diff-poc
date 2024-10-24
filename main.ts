import Table from "npm:cli-table3";
import { parseArgs } from "jsr:@std/cli/parse-args";

export type ComparisonLogic = (json1: any, json2: any) => boolean;

export type ComparisonConfig = Record<string, ComparisonLogic>;

type ComparisonResult = {
  key: string;
  value1: any;
  value2: any;
  result: "MATCH" | "MISMATCH" | "MISSING";
};

const getValueByPath = (obj: any, path: string): any => {
  const keys = path.split(".");
  return keys.reduce((acc, key) => {
    return acc === undefined ? undefined : acc[key];
  }, obj);
};

const defaultComparisonLogic: (key: any) => ComparisonLogic =
  (key) => (json1, json2) => {
    const value1 = getValueByPath(json1, key);
    const value2 = getValueByPath(json2, key);
    return value1 === value2;
  };

const compareJson = (
  json1: any,
  json2: any,
  config: ComparisonConfig,
): ComparisonResult[] => {
  const results: ComparisonResult[] = [];

  const compare = (obj1: any, obj2: any, prefix: string = "") => {
    for (const key in obj1) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj1[key] === "object" && obj1[key] !== null) {
        compare(obj1[key], obj2[key] || {}, fullKey);
      } else {
        const comparisonLogic = config[fullKey] ??
          defaultComparisonLogic(fullKey);
        const isMatch = comparisonLogic(json1, json2);
        results.push({
          key: fullKey,
          value1: obj1[key],
          value2: obj2[key],
          result: isMatch ? "MATCH" : "MISMATCH",
        });
      }
    }
    for (const key in obj2) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (!(key in obj1)) {
        results.push({
          key: fullKey,
          value1: "N/A",
          value2: obj2[key],
          result: "MISSING",
        });
      }
    }
  };
  compare(json1, json2);
  return results;
};

const displayResults = (results: ComparisonResult[]) => {
  const table = new Table({
    head: ["Key", "Value 1", "Value 2", "Result"],
    colWidths: [30, 30, 30, 10],
  });

  results.forEach((result) => {
    table.push([
      result.key,
      JSON.stringify(result.value1),
      JSON.stringify(result.value2),
      result.result,
    ]);
  });

  console.log(table.toString());
};

const loadJson = async (path: string) => {
  const { default: json } = await import(path, { with: { type: "json" } });
  return json;
};

const loadScript = async (path: string) => {
  const module = await import(path);
  return module.default;
};

if (import.meta.main) {
  const args = parseArgs(Deno.args, {
    string: ["file1", "file2", "config"],
  });

  if (!args.file1 || !args.file2) {
    console.error("Please provide paths to both JSON files");
    Deno.exit(1);
  }

  const json1 = await loadJson(args.file1);
  const json2 = await loadJson(args.file2);

  let config: ComparisonConfig = {};
  if (args.config) {
    const module = await loadScript(args.config);
    config = module;
  }

  const results = compareJson(json1, json2, config);
  displayResults(results);
}
