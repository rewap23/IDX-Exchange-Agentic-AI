# How The Property Search Parser Works

## Problem
People type searches like this:
"Show me 3-bedroom condos in Irvine under $1.5M with a pool"
The database can't read this search It only understands structured filters: L_City = 'Irvine', L_Keyword2 >= 3, L_SystemPrice <= 1500000, and so on. The parser translates the sentence into those filters.

## How OpenClaw Uses This Parser
```mermaid
flowchart LR
    U[User asks to find listings] --> OC[OpenClaw selects mls_search]
    OC --> MLS[MLS search CLI]
    MLS --> P[Parser module converts message to filters]
    P --> DB[(MLS database)]
    DB --> MLS
    MLS --> Cards[Formatted listing cards]
    Cards --> U
    D[User explicitly asks to inspect/test parsing] --> Debug[OpenClaw selects property_search_parser]
    Debug --> P
```

`property_search_parser` is also imported by the MLS CLI as an implementation module. For requests to find, browse, or filter listings, select `mls_search`; use the parser skill only for explicit parsing/debug requests.
