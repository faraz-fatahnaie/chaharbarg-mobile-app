# Knowledge graph (graphify)

`graph.json` + `GRAPH_REPORT.md`: 702 nodes, 1444 edges, rebuilt 2026-11-24 with `graphify update .` from the repo root (code via AST; docs as of the last semantic pass). Copied from `graphify-out/`.
Edges: 93% extracted, 6% inferred (avg confidence 0.82), 0% ambiguous at build time.

Honest notes
- graphify's health check reported 23 dangling-endpoint edges and 1 self-loop; the graph is usable but not perfectly clean.
- It was built from a scratch copy of the sources (so source paths read `docs/…`, `engine/…`, `app/…`), not from the repo root.
- Rebuild after big changes: run `/graphify docs packages/engine/src apps/mobile/src --update` from a scratch folder as above, or the graphify CLI directly.
