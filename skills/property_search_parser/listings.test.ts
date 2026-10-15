import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWhere, clampInt } from "./listings.ts";
import { parsePropertyQuery } from "../property_search_parser/parser.ts";

const NONE = { city: null, maxPrice: null, beds: null, baths: null, sqft: null,
  type: null, pool: null, hasView: null, maxHoa: null };

test("handbook example becomes parameterized SQL", () => {
  const f = parsePropertyQuery("Show me 3-bedroom condos in Irvine under $1.5M with a pool.");
  const { where, params } = buildWhere(f);
  assert.equal(where,
    "L_Status = 'Active' AND L_City = ? AND L_SystemPrice <= ? AND L_Keyword2 >= ? AND L_Type_ = ? AND (PoolPrivateYN = 'True' OR AssociationAmenities LIKE '%Pool%')");
  assert.deepEqual(params, ["Irvine", 1500000, 3, "Condominium"]);
});

test("SQL injection text stays in params, never in the SQL", () => {
  const { where, params } = buildWhere({ ...NONE, city: "Irvine' OR '1'='1" });
  assert.equal(where, "L_Status = 'Active' AND L_City = ?");
  assert.deepEqual(params, ["Irvine' OR '1'='1"]);
});

test("no-HOA filter is NULL-safe", () => {
  const { where, params } = buildWhere({ ...NONE, maxHoa: 0 });
  assert.equal(where, "L_Status = 'Active' AND (AssociationFee IS NULL OR AssociationFee <= ?)");
  assert.deepEqual(params, [0]);
});

test("no filters means only the status clause", () => {
  assert.deepEqual(buildWhere(NONE), { where: "L_Status = 'Active'", params: [] });
});

test("clampInt enforces the row cap and handles junk", () => {
  assert.equal(clampInt(999, 1, 50), 50);
  assert.equal(clampInt(-3, 1, 50), 1);
  assert.equal(clampInt(NaN, 1, 50), 1);
  assert.equal(clampInt(2.9, 1, 50), 2);
});
