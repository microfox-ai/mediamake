# Open data for tech and AI Shorts

Licences change, so **read the licence page each time you download**, and quote it in `recipe.json` (`licence`) and
`provenance.md`. "OK" below means usable on a monetised channel with credit; check the specific dataset's page,
because a few files inside an open site carry a third party's terms.

| source | what | licence (as last seen) | notes |
|---|---|---|---|
| **Epoch AI** (epoch.ai/data) | Notable AI models (compute, parameters, data, cost), ML hardware, frontier models, GPU clusters | CC BY 4.0: OK with credit | The best source for AI scaling. Dates are publication dates. Compute is often an estimate: say "estimated" on screen |
| **Our World in Data** (ourworldindata.org) | Long series from many primary sources: AI, internet use, energy, computing | CC BY 4.0 for OWID's own work: OK | Each chart names its primary source. Credit both ("OWID, from …"), and check the primary's terms |
| **TOP500** (top500.org) | The 500 fastest supercomputers, twice a year since 1993 | Free to use with citation (their terms; not a CC licence) | Rmax in PFlop/s. #1 and the sum of all 500 are classic lines |
| **Stack Overflow Developer Survey** (survey.stackoverflow.co) | Languages, tools and AI use, yearly since 2011 | ODbL (the data); OK with attribution | The questions change across years, so compare only identical questions |
| **Stack Exchange API** (api.stackexchange.com) | Questions, answers and users per site, any date range (`filter=total` gives a count per call) | Its API terms of use (attribution to the network; nothing against commercial use). Posts are CC BY-SA; counts are facts | 300 calls a day per IP without a key; 5xx errors happen (1 in 220 calls), so back off and retry. Counts leave out deleted posts and shrink over time: say "as of <pull date>". WebFetch and the built-in browser hit a bot check on stackoverflow.com; the terms are mirrored at policies.stackoverflow.co |
| **GitHub Innovation Graph** (innovationgraph.github.com) | Developers, repositories and pushes by economy, quarterly | CC0 / CC BY (check the repo's LICENSE) | Good for country races |
| **GitHub Octoverse** (github.blog) | Yearly report numbers | Facts, cited | Only the headline numbers are published; there's no full series |
| **World Bank** (data.worldbank.org) | Internet users, broadband, R&D spending by country | CC BY 4.0: OK | |
| **IEA** (iea.org/data-and-statistics) | Data-centre electricity, energy | Many datasets CC BY 4.0; some are paid | Check each one |
| **SEC EDGAR** (sec.gov) | Company revenue, R&D, capex from 10-K and 10-Q filings | Public facts, cited per point | Use `points` in the recipe, with a URL for each value |
| **Company investor pages** | Segment revenue (data-centre revenue and so on) | Facts, cited per point | Quarterly; fiscal years differ from calendar years, so say which |
| **Wikipedia tables** | Transistor counts, model releases | CC BY-SA 4.0 | Use them to find the primary sources and cite those; don't treat Wikipedia as the source |
| **Hugging Face, LMArena leaderboards** | Benchmark scores over time | Varies, and changes often | Read the terms; benchmark numbers are vendor- or community-measured, so label them |

## Traps

- **CC BY-NC, or "non-commercial / personal use":** not on a monetised channel. Find the primary source.
- **Statista, Gartner, IDC, Counterpoint full data:** paywalled and restrictive. A number quoted in their own press release is a cited fact, and only that number.
- **A whole series rebuilt from a tracker's press releases** (IDC's yearly totals over 19 years, say) can count as reproducing their research, and their terms ask for written permission for wider use. IDC also requires the credit "Source: IDC". Either use a few headline numbers (the peak, the latest, the record drop), or ask the tracker for permission (draft the email; the user sends it) and say which in `provenance.md`.
- **Kaggle datasets:** the licence is often missing or wrong, and the data is often scraped. Trace it to its origin first.
- **Vendor benchmarks:** "vendor-claimed" on screen, as in every Techyon Short.
- **Mixed units across years** (MW versus GW, thousands versus millions, nominal versus inflation-adjusted dollars): convert in the recipe (`factor`) and say "inflation-adjusted, 2025 $" when it's adjusted.
- **Estimated values** (Epoch's compute, early internet users): say "estimated" in the source line or the notes.
- **Survivorship:** a "top 10 today" race that leaves out the companies that died misleads. Say "today's top 10", or include them.
