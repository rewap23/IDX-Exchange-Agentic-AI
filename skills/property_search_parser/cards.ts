
import type { ListingRow, SoldRow } from "./listings.ts";

const num = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const fmt = (n: number) => n.toLocaleString("en-US");
export const usd = (v: unknown) => { const n = num(v); return n == null ? "n/a" : "$" + fmt(Math.round(n)); };

export function listingCard(r: ListingRow): string {
  const addr = [r.L_Address, r.L_City, r.L_Zip].filter(Boolean).join(", ");
  const beds = num(r.beds), baths = num(r.baths), sqft = num(r.sqft);
  const stats = [
    usd(r.price),
    beds != null ? `${beds} bd` : null,
    baths != null ? `${baths} ba` : null,
    sqft ? `${fmt(sqft)} sqft` : null,
  ].filter(Boolean).join(" · ");
  const meta = [
    r.type,
    num(r.YearBuilt) ? `built ${num(r.YearBuilt)}` : null,
    num(r.DaysOnMarket) != null ? `${num(r.DaysOnMarket)} days on market` : null,
  ].filter(Boolean).join(" · ");
  const features = [
    num(r.AssociationFee) ? `HOA ${usd(r.AssociationFee)}/mo` : null,
    r.PoolPrivateYN === "True" ? "Pool" : null,
    r.ViewYN === "True" ? "View" : null,
    r.FireplaceYN === "True" ? "Fireplace" : null,
  ].filter(Boolean).join(" · ");
  const agent = [
    [r.LA1_UserFirstName, r.LA1_UserLastName].filter(Boolean).join(" "),
    r.LO1_OrganizationName,
  ].filter(Boolean).join(", ");

  return [
    `*${addr || "Address n/a"}*`, stats, meta, features,
    agent ? `Listed by ${agent}` : null,
    r.L_DisplayId ? `MLS# ${r.L_DisplayId}` : null,
  ].filter(Boolean).join("\n");
}

export function soldCard(r: SoldRow): string {
  const close = num(r.ClosePrice), orig = num(r.OriginalListPrice), area = num(r.LivingArea);
  const beds = num(r.BedroomsTotal), baths = num(r.BathroomsTotalInteger), dom = num(r.DaysOnMarket);
  const stats = [
    usd(close),
    beds != null ? `${beds} bd` : null,
    baths != null ? `${baths} ba` : null,
    area ? `${fmt(area)} sqft` : null,
  ].filter(Boolean).join(" · ");
  const deal = [
    r.CloseDate ? `closed ${r.CloseDate}` : null,
    close && orig ? `${((close / orig) * 100).toFixed(1)}% of original list` : null,
    close && area ? `${usd(close / area)}/sqft` : null,
    dom != null ? `${dom} days on market` : null,
  ].filter(Boolean).join(" · ");

  return [`*${r.UnparsedAddress ?? "Address n/a"}*`, stats, deal, r.PropertySubType].filter(Boolean).join("\n");
}
