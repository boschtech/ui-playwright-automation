# Diagram Source Files

Each `.mmd` file contains one Mermaid diagram so it can be embedded in slide decks, exported as SVG/PNG/PDF, or edited independently.

## Files

| File | Diagram |
|---|---|
| `01-context.mmd` | C4 Level 1 — System Context |
| `02-container.mmd` | C4 Level 2 — Container Diagram |
| `03-deployment.mmd` | Render.com deployment view |
| `04-cicd-mfe.mmd` | Micro-frontend CI pipeline |
| `05-cicd-service.mmd` | Service CI pipeline |
| `06-pact.mmd` | Pact contract-testing flow |
| `07-e2e-topology.mmd` | Playwright E2E topology |
| `08-order-flow.mmd` | Create-order sequence |
| `09-stack-mindmap.mmd` | Full stack mindmap |

## Exporting

Install the Mermaid CLI once:

```bash
npm install -g @mermaid-js/mermaid-cli
```

Export all diagrams to SVG (transparent, scales perfectly for slides):

```bash
for f in docs/diagrams/*.mmd; do
  mmdc -i "$f" -o "${f%.mmd}.svg" -b transparent
done
```

To export PNGs (e.g. for a PDF handout):

```bash
for f in docs/diagrams/*.mmd; do
  mmdc -i "$f" -o "${f%.mmd}.png" -w 2000 -b white
done
```

## Editing live

Paste any `.mmd` file into <https://mermaid.live> for an interactive editor.
