import fs from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";
const base = process.env.PRODUCTPULSE_API_URL ?? "http://127.0.0.1:8000";
const response = await fetch(`${base}/openapi.json`);
if (!response.ok)
  throw new Error(`OpenAPI request failed (${response.status})`);
const schema = await response.json();
await fs.mkdir("types", { recursive: true });
await fs.writeFile(
  "types/openapi.json",
  JSON.stringify(schema, null, 2) + "\n",
);
await fs.writeFile("types/api.d.ts", astToString(await openapiTS(schema)));
console.log(
  "Generated types and validation schema from the running FastAPI service.",
);
