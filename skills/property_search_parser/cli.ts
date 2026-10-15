import { parsePropertyQuery } from "./parser.ts";
import type { PropertyFilters } from "./parser.ts";
import { searchActiveListings, getSoldComps } from "./listings.ts";
import { listingCard, soldCard, usd } from "./cards.ts";
import { closePool } from "./db.ts";

const [cmd, ...args] = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8").trim();
}

function describe(f: PropertyFilters): string {
  return [
    f.city, f.type,
    f.maxPrice != null ? `up to ${usd(f.maxPrice)}` : null,
    f.beds != null ? `${f.beds}+ bd` : null,
    f.baths != null ? `${f.baths}+ ba` : null,
    f.sqft != null ? `${f.sqft}+ sqft` : null,
    f.pool === "True" ? "pool" : f.pool === "False" ? "no pool" : null,
    f.hasView ? "view" : null,
    f.maxHoa != null ? (f.maxHoa === 0 ? "no HOA" : `HOA up to ${usd(f.maxHoa)}`) : null,
  ].filter(Boolean).join(" · ");
}

async function main() {
  if (cmd === "parse") {
    console.log(JSON.stringify(parsePropertyQuery(await readStdin())));
  } else if (cmd === "search") {
    const filters = parsePropertyQuery(await readStdin());
    const summary = describe(filters);
    if (!summary) {
      console.log("No search filters found. Ask the user for a city, price, bedrooms, or property type.");
      return;
    }
    const res = await searchActiveListings(filters, Number(flag("page") ?? 1), Number(flag("limit") ?? 5));
    if (args.includes("--json")) { console.log(JSON.stringify({ filters, ...res })); return; }
    if (res.total === 0) { console.log(`No active listings match: ${summary}.`); return; }
    if (res.rows.length === 0) { console.log(`No more results (${res.total} total).`); return; }

    const first = (res.page - 1) * res.limit + 1;
    const last = first + res.rows.length - 1;
    console.log(`Filters: ${summary}\nShowing ${first}-${last} of ${res.total}\n`);
    console.log(res.rows.map(listingCard).join("\n\n"));
    if (last < res.total) console.log(`\nMore available: use page ${res.page + 1}.`);
  } else if (cmd === "comps") {
    const city = (await readStdin()).replace(/\s+/g, " ").trim();
    if (!city) { console.log("Need a city name."); return; }
    const months = Number(flag("months") ?? 12);
    const rows = await getSoldComps(city, months, flag("as-of"));
    if (rows.length === 0) { console.log(`No sold comps found for ${city} in that window.`); return; }
    console.log(`Sold comps in ${city} (last ${months} months, max 50): ${rows.length} shown\n`);
    console.log(rows.map(soldCard).join("\n\n"));
  } else {
    console.error("usage: node cli.ts parse | search [--page N] [--limit N] [--json] | comps [--months N] [--as-of YYYY-MM-DD]  (input on stdin)");
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    const err = e as { code?: string; message?: string };
    console.error(`Database error: ${err.code ?? "unknown"}. Check the MYSQL_* settings in .env.`);
    if (process.env.IDX_DEBUG) console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
