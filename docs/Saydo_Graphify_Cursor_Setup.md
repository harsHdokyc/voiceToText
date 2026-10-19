# Graphify + Cursor Setup for Sayso

## Goal

Give Cursor a map of Sayso's codebase so it can trace relationships
between modules, understand change impact, and investigate before
editing. Graphify complements Cursor's built-in indexing; it does not
replace reading code or running tests.

## 1. Install Graphify

Recommended: install the CLI with `uv`.

``` bash
uv tool install graphifyy
graphify --version
```

If you already use `pipx`, this is an alternative:

``` bash
pipx install graphifyy
graphify --version
```

## 2. Connect it to Cursor

From the **Sayso repository root**, run:

``` bash
graphify cursor install
```

This creates `.cursor/rules/graphify.mdc`. The rule tells Cursor to
query the graph before exploring files.

If Cursor cannot find `graphify`, run:

``` bash
uv tool update-shell
```

Then restart Cursor so its terminal picks up the updated PATH.

## 3. Build Sayso's graph

Open the Sayso project in Cursor. In Cursor chat, run the Graphify
mapping instruction:

``` text
/graphify .
```

Follow any setup instructions Cursor or Graphify displays. A successful
build creates:

-   `graphify-out/graph.json` --- graph data used by queries
-   `graphify-out/graph.html` --- interactive graph explorer
-   `graphify-out/GRAPH_REPORT.md` --- architecture summary and useful
    questions

Open `graphify-out/graph.html` in a browser to explore the map.

## 4. Use it before making changes

Ask Cursor structural questions before asking it to edit. Examples:

``` text
Trace the voice capture flow from the UI to persistence.
Identify the modules involved in turning a transcript into suggested actions.
Trace authentication and data access. Show the path and relevant files.
If I change this service, what callers and downstream flows could be affected?
```

Graphify CLI commands you can also run in Cursor's terminal:

``` bash
graphify query "how does voice capture reach persistence?"
graphify explain "YourSymbolOrModule"
graphify path "SourceSymbol" "TargetSymbol"
```

Use actual names from Sayso's codebase in place of the examples. A path
only exists if the graph contains the relevant nodes and relationships.

## 5. Keep the graph current

After meaningful code changes, update the graph:

``` bash
graphify update .
```

This refreshes the graph from changed files. If you have pulled or
merged substantial changes and the graph looks stale, run the update
before relying on it.

## 6. Rules for using Graphify well

1.  **Investigate first:** query Graphify before exploring an unfamiliar
    feature or making a cross-cutting change.
2.  **Trace impact:** identify callers, dependencies, and affected flows
    before editing.
3.  **Verify in source:** treat the graph as a navigation aid, not the
    final authority. Open the actual files and confirm behavior.
4.  **Make small changes:** avoid broad refactors just because the graph
    reveals many connections.
5.  **Test the behavior:** run relevant existing tests and checks after
    changes; report what was actually run.
6.  **Refresh when stale:** run `graphify update .` if recent edits or a
    pull are missing from query results.
7.  **Don't force it:** for a tiny, obvious change, use judgment.
    Graphify should reduce investigation, not add ceremony.

Graphify labels relationships by evidence level (for example, extracted
versus inferred). Treat inferred or ambiguous connections as leads to
verify, not facts.

## 7. Team and privacy notes

-   Commit `.cursor/rules/graphify.mdc` so teammates get the same Cursor
    guidance.
-   Teammates need Graphify installed and a built graph before graph
    queries will work.
-   Decide whether to commit `graphify-out/` based on your team's
    workflow. If it is not committed, each developer should build their
    own graph.
-   Graphify parses source code locally. If you include documentation or
    other non-code content, semantic processing may use your configured
    assistant/model. Check the current Graphify documentation and your
    team's data policy before mapping sensitive material.
-   The optional MCP server is **not required** for the standard Cursor
    setup. Start with the CLI and rule; add MCP only if you have a clear
    need.

## 8. Verify the setup

In a new Cursor chat, ask:

> Before exploring files, query Graphify and trace the flow for one real
> Sayso feature. Show the graph findings, then verify them against
> source files.

The setup is working if Cursor uses Graphify first, cites relevant file
locations where available, checks the source, and does not treat
inferred relationships as guaranteed truth.

## Official references

-   Cursor integration: https://graphify.com/integrations/cursor
-   Quickstart:
    https://github.com/Graphify-Labs/docs/blob/main/quickstart.mdx
-   Graphify project: https://github.com/Graphify-Labs/graphify
