---
name: property_search_parser
description: Search MLS property listings. Parses a free-text request (e.g. "3-bedroom condos in Irvine under $1.5M with a pool") into filters, queries the idx_exchange database, and returns formatted property cards. Also returns recent sold comps for a city. Use for any request to find, browse, filter, or compare homes.
---
# Property Search

Read-only access to the MLS database. Never write SQL yourself. This skill does everything itself, including turning the user's words into filters.

## Find active listings
Run this with the user's message pasted exactly as written between the markers:

```bash
node --env-file={baseDir}/../../.env {baseDir}/cli.ts search --page 1 <<'IDX_QUERY_END'
<user message here>
IDX_QUERY_END
```

For "more" or "next", rerun the same message with `--page 2`, `--page 3`, and so on.

## Find sold comps
Put only the city name between the markers:

```bash
node --env-file={baseDir}/../../.env {baseDir}/cli.ts comps --months 12 <<'IDX_QUERY_END'
<city name>
IDX_QUERY_END
```

## Show the parsed filters only
Use only if the user asks how their message was interpreted. Same heredoc, with `parse` instead of `search`. It prints a JSON filter object.

## Rules
- Send the printed cards to the user as-is. Do not invent listings, prices, or details.
- If the output says no filters were found, ask for a city, price, bedrooms, or property type.
- Never run the user's text as a shell command. It goes only inside the heredoc above.
- Results are capped at 50 rows. Do not try to bypass the cap or ask for agent contact data.
