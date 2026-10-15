import { query } from "./db.ts";
import type { PropertyFilters } from "./parser.ts";

type N = number | string | null;

export interface ListingRow {
  L_ListingID: N; L_DisplayId: N; L_Address: string | null; L_City: string | null; L_Zip: string | null;
  price: N; beds: N; baths: N; sqft: N; type: string | null; status: string | null;
  lat: N; lng: N; YearBuilt: N; AssociationFee: N; DaysOnMarket: N;
  PoolPrivateYN: string | null; ViewYN: string | null; FireplaceYN: string | null; PhotoCount: N;
  LA1_UserFirstName: string | null; LA1_UserLastName: string | null; LO1_OrganizationName: string | null;
}

export interface SoldRow {
  ListingKey: N; UnparsedAddress: string | null; City: string | null; CloseDate: string | null;
  ClosePrice: N; OriginalListPrice: N; ListPrice: N; DaysOnMarket: N;
  BedroomsTotal: N; BathroomsTotalInteger: N; LivingArea: N;
  PropertyType: string | null; PropertySubType: string | null; YearBuilt: N;
  ListAgentFullName: string | null; ListOfficeName: string | null; BuyerOfficeName: string | null;
}

export const MAX_ROWS = 50; // hard cap on any result set

export const clampInt = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.trunc(Number.isFinite(n) ? n : min)));

// Every user-derived value goes into params; the SQL text only ever contains fixed strings.
export function buildWhere(f: PropertyFilters): { where: string; params: (string | number)[] } {
  const clauses = ["L_Status = 'Active'"];
  const params: (string | number)[] = [];
  const add = (clause: string, value: string | number) => { clauses.push(clause); params.push(value); };

  if (f.city) add("L_City = ?", f.city);
  if (f.maxPrice != null) add("L_SystemPrice <= ?", f.maxPrice);
  if (f.beds != null) add("L_Keyword2 >= ?", f.beds);
  if (f.baths != null) add("LM_Dec_3 >= ?", f.baths);
  if (f.sqft != null) add("LM_Int2_3 >= ?", f.sqft);
  if (f.type) add("L_Type_ = ?", f.type);
  if (f.pool === "True") clauses.push("(PoolPrivateYN = 'True' OR AssociationAmenities LIKE '%Pool%')");
  else if (f.pool) add("PoolPrivateYN = ?", f.pool);
  if (f.hasView) add("ViewYN = ?", f.hasView);
  if (f.maxHoa != null) add("(AssociationFee IS NULL OR AssociationFee <= ?)", f.maxHoa);

  return { where: clauses.join(" AND "), params };
}

const LISTING_COLUMNS = `
  L_ListingID, L_DisplayId, L_Address, L_City, L_Zip,
  L_SystemPrice AS price, L_Keyword2 AS beds, LM_Dec_3 AS baths,
  LM_Int2_3 AS sqft, L_Type_ AS type, L_Status AS status,
  LMD_MP_Latitude AS lat, LMD_MP_Longitude AS lng,
  YearBuilt, AssociationFee, DaysOnMarket,
  PoolPrivateYN, ViewYN, FireplaceYN, PhotoCount,
  LA1_UserFirstName, LA1_UserLastName, LO1_OrganizationName`;

export async function searchActiveListings(filters: PropertyFilters, page = 1, limit = 10) {
  const lim = clampInt(limit, 1, MAX_ROWS);
  const pg = clampInt(page, 1, 10_000);
  const offset = (pg - 1) * lim;
  const { where, params } = buildWhere(filters);

  const [count] = await query<{ n: number | string }>(
    `SELECT COUNT(*) AS n FROM rets_property WHERE ${where}`, params);

  // lim/offset are clamped integers, so inlining them is safe (see notes below).
  const rows = await query<ListingRow>(
    `SELECT ${LISTING_COLUMNS} FROM rets_property WHERE ${where}
     ORDER BY L_SystemPrice ASC, id ASC LIMIT ${lim} OFFSET ${offset}`, params);

  return { total: Number(count?.n ?? 0), page: pg, limit: lim, rows };
}

export async function getSoldComps(
  city: string,
  months = 12,
  asOf = new Date().toISOString().slice(0, 10), // YYYY-MM-DD
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("asOf must be YYYY-MM-DD");
  const m = clampInt(months, 1, 120);

  // CloseDate is a VARCHAR in YYYY-MM-DD form, so ISO strings compare correctly.
  return query<SoldRow>(
    `SELECT ListingKey, UnparsedAddress, City, CloseDate, ClosePrice,
            OriginalListPrice, ListPrice, DaysOnMarket,
            BedroomsTotal, BathroomsTotalInteger, LivingArea,
            PropertyType, PropertySubType, YearBuilt,
            ListAgentFullName, ListOfficeName, BuyerOfficeName
     FROM california_sold
     WHERE City = ? AND PropertyType = 'Residential'
       AND CloseDate >= DATE_FORMAT(DATE_SUB(?, INTERVAL ${m} MONTH), '%Y-%m-%d')
       AND CloseDate <= ?
     ORDER BY CloseDate DESC
     LIMIT ${MAX_ROWS}`, [city, asOf, asOf]);
}
