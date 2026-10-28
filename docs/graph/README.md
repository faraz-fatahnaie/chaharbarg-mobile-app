# Knowledge graph (graphify)

`graph.json` + `GRAPH_REPORT.md`: 318 nodes, 832 edges, 14 communities over `docs/`, `packages/engine/src` and `apps/mobile/src` (code via AST, docs via one semantic-extraction pass).
Edges: 93% extracted, 6% inferred (avg confidence 0.82), 0% ambiguous at build time.

Honest notes
- graphify's health check reported 23 dangling-endpoint edges and 1 self-loop; the graph is usable but not perfectly clean.
- It was built from a scratch copy of the sources (so source paths read `docs/…`, `engine/…`, `app/…`), not from the repo root.
- Rebuild after big changes: run `/graphify docs packages/engine/src apps/mobile/src --update` from a scratch folder as above, or the graphify CLI directly.
