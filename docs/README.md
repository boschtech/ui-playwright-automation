# Bosch Tech Micro Projects — Architecture & Quality Gates

A client-facing overview of the **two microservices**, the **micro‑frontend**, and the **quality gates** that protect every change from commit to production.

All diagrams use [Mermaid](https://mermaid.js.org/) and render directly on GitHub, in VS Code, in Warp, and in most markdown viewers.

---

## 📚 Table of Contents

1. [System Context (C4 Level 1)](#1-system-context-c4-level-1)
2. [Container Diagram (C4 Level 2)](#2-container-diagram-c4-level-2)
3. [Deployment View (Render.com)](#3-deployment-view-rendercom)
4. [CI/CD Quality-Gate Pipelines](#4-cicd-quality-gate-pipelines)
5. [Consumer-Driven Contract Testing (Pact)](#5-consumer-driven-contract-testing-pact)
6. [End-to-End Test Topology (Playwright)](#6-end-to-end-test-topology-playwright)
7. [Quality Gates Matrix](#7-quality-gates-matrix)
8. [Request Flow — Create an Order](#8-request-flow--create-an-order)
9. [Tech Stack at a Glance](#9-tech-stack-at-a-glance)

---

## 1. System Context (C4 Level 1)

Shows the platform in its environment — who uses it and what it talks to.

```mermaid
C4Context
    title System Context — Bosch Tech Platform
    Person(customer, "End User", "Browses products and places orders via a web browser")
    System_Boundary(platform, "Bosch Tech Platform") {
        System(mfe, "Micro Frontend", "React 19 SPA — product & order UI")
        System(product, "Product Service", "Spring Boot REST API — product catalog")
        System(order, "Order Service", "Spring Boot REST API — order management")
    }
    System_Ext(render, "Render.com", "Static + Docker hosting")
    System_Ext(gh, "GitHub Actions", "CI/CD & quality gates")
    Rel(customer, mfe, "Uses", "HTTPS")
    Rel(mfe, product, "Reads/writes products", "JSON/HTTPS")
    Rel(mfe, order, "Reads/writes orders", "JSON/HTTPS")
    Rel(order, product, "Validates product IDs", "JSON/HTTPS")
    Rel(mfe, render, "Deployed to")
    Rel(product, render, "Deployed to")
    Rel(order, render, "Deployed to")
    Rel(gh, render, "Triggers deploy on green build")
```

---

## 2. Container Diagram (C4 Level 2)

Zooms into each deployable unit, ports, and the key libraries inside.

```mermaid
C4Container
    title Container Diagram — Bosch Tech Platform
    Person(user, "End User")
    System_Boundary(platform, "Bosch Tech Platform") {
        Container(spa, "Micro Frontend", "React 19 · TypeScript · Vite 6 · Tailwind 4 · TanStack Query · React Router 7", "Feature modules: dashboard, products, orders — each extractable as an independent MFE")
        Container(product, "Product Service", "Java 17 · Spring Boot 3.2 · Actuator · Jakarta Validation", "REST API on :8080 · /actuator/health")
        Container(order, "Order Service", "Java 17 · Spring Boot 3.2 · Actuator · Jakarta Validation", "REST API on :8081 · /actuator/health")
    }
    Rel(user, spa, "HTTPS")
    Rel(spa, product, "/api/products/*", "JSON/HTTPS · CORS")
    Rel(spa, order, "/api/orders/*", "JSON/HTTPS · CORS")
    Rel(order, product, "product lookup", "JSON/HTTPS")
```

---

## 3. Deployment View (Render.com)

Each repo has its own `render.yaml` — the MFE ships as a static site, services as Docker containers with health-checks wired to Spring Actuator.

```mermaid
flowchart LR
    classDef edge fill:#eef,stroke:#55f,color:#000
    classDef svc fill:#efe,stroke:#080,color:#000
    classDef cdn fill:#fef,stroke:#808,color:#000

    browser([🌐 User Browser]):::edge

    subgraph Render["Render.com"]
      direction LR
      cdn["Static Site<br/>micro-frontend<br/><i>dist/ via Vite build</i>"]:::cdn
      ps["Web Service (Docker)<br/>product-service<br/><i>/actuator/health</i>"]:::svc
      os["Web Service (Docker)<br/>order-service<br/><i>/actuator/health</i>"]:::svc
    end

    browser -- HTTPS --> cdn
    cdn -- VITE_PRODUCT_SERVICE_URL --> ps
    cdn -- VITE_ORDER_SERVICE_URL --> os
    os -- PRODUCT_SERVICE_URL --> ps
    ps -- ORDER_SERVICE_URL --> os
```

---

## 4. CI/CD Quality-Gate Pipelines

Every merge is gated by a multi-stage pipeline. A failure in any stage **blocks the PR**.

### 4.1 Micro-Frontend Pipeline (`micro-frontend/.github/workflows/ci.yml`)

```mermaid
flowchart LR
    classDef gate fill:#fff2cc,stroke:#d6b656,color:#000
    A[🔍 Lint + Typecheck<br/>eslint, tsc]:::gate --> B[🧪 Unit Tests<br/>Vitest + coverage]:::gate
    B --> C[🧩 Component Tests<br/>Testing Library]:::gate
    B --> D[📄 Contract Tests<br/>Pact consumer]:::gate
    C --> E[🏗️ Build<br/>vite build]:::gate
    D --> E
    E --> F[🎭 E2E Tests<br/>Playwright · full stack]:::gate
```

### 4.2 Service Pipeline (both `product-service` & `order-service`)

```mermaid
flowchart LR
    classDef gate fill:#d5e8d4,stroke:#82b366,color:#000
    A[🧪 Unit Tests<br/>JUnit 5 + JaCoCo]:::gate --> B[📄 Pact Contract Tests<br/>consumer + provider verify]:::gate
    B --> C[🧩 Component Tests<br/>Spring Boot HTTP]:::gate
    C --> D[🎭 E2E Tests<br/>Playwright tagged by service]:::gate
```

### 4.3 UI Automation Pipeline — publishes the Playwright report to GitHub Pages

```mermaid
flowchart LR
    classDef gate fill:#dae8fc,stroke:#6c8ebf,color:#000
    classDef pub  fill:#f8cecc,stroke:#b85450,color:#000
    A[🚀 Boot Full Stack<br/>product + order + mfe<br/><i>JARs via nohup</i>]:::gate --> B[💚 Health Gate<br/>/actuator/health · 60s retry]:::gate
    B --> C[🎭 Playwright E2E<br/>all specs]:::gate
    C --> D[📊 Publish HTML Report<br/>→ gh-pages]:::pub
```

---

## 5. Consumer-Driven Contract Testing (Pact)

Contracts are generated by consumers and verified by providers — catching breaking API changes before they ship.

```mermaid
flowchart TB
    classDef consumer fill:#e1d5e7,stroke:#9673a6,color:#000
    classDef provider fill:#d5e8d4,stroke:#82b366,color:#000
    classDef pact fill:#fff2cc,stroke:#d6b656,color:#000

    MFE["Micro Frontend<br/>@pact-foundation/pact"]:::consumer
    OSC["Order Service<br/>(consumer of Product)"]:::consumer
    PSC["Product Service<br/>(consumer of Order)"]:::consumer
    PSP["Product Service<br/>(provider)"]:::provider
    OSP["Order Service<br/>(provider)"]:::provider

    P1[("📄 mfe ⇄ product-service")]:::pact
    P2[("📄 mfe ⇄ order-service")]:::pact
    P3[("📄 order-service ⇄ product-service")]:::pact
    P4[("📄 product-service ⇄ order-service")]:::pact

    MFE -- generates --> P1
    MFE -- generates --> P2
    OSC -- generates --> P3
    PSC -- generates --> P4

    P1 -- verified by --> PSP
    P2 -- verified by --> OSP
    P3 -- verified by --> PSP
    P4 -- verified by --> OSP
```

---

## 6. End-to-End Test Topology (Playwright)

Tests are tagged so each service only runs the E2E slice it owns, while the micro-frontend runs them all.

```mermaid
flowchart LR
    classDef test fill:#fff2cc,stroke:#d6b656,color:#000
    classDef svc fill:#d5e8d4,stroke:#82b366,color:#000
    classDef mfe fill:#dae8fc,stroke:#6c8ebf,color:#000

    subgraph Suite["ui-playwright-automation"]
      T1["navigation.spec.ts<br/>+ dashboard.spec.ts<br/>(untagged · always)"]:::test
      T2["products.spec.ts<br/>@product-service"]:::test
      T3["orders.spec.ts<br/>@order-service"]:::test
    end

    subgraph Stack["Stack under test"]
      MFE["Micro Frontend :3000"]:::mfe
      PS["product-service :8080"]:::svc
      OS["order-service :8081"]:::svc
    end

    T1 --> MFE
    T2 --> MFE --> PS
    T3 --> MFE --> OS
    OS --> PS
```

---

## 7. Quality Gates Matrix

Every colour-coded stage below is enforced by CI and must be **green** to merge.

```mermaid
flowchart TB
    classDef g fill:#d5e8d4,stroke:#82b366,color:#000

    subgraph MF["Micro Frontend"]
      mf1[ESLint 9]:::g --> mf2[TypeScript strict<br/>tsc --noEmit]:::g --> mf3[Vitest unit<br/>+ v8 coverage]:::g --> mf4[Component tests<br/>Testing Library]:::g --> mf5[Pact consumer<br/>contracts]:::g --> mf6[vite build]:::g --> mf7[Playwright E2E]:::g
    end

    subgraph PS["Product Service"]
      ps1[JUnit 5 unit]:::g --> ps2[JaCoCo coverage]:::g --> ps3[Spring validation]:::g --> ps4[Pact consumer<br/>+ provider verify]:::g --> ps5[Spring Boot<br/>component tests]:::g --> ps6[Playwright<br/>@product-service]:::g --> ps7[Actuator<br/>health gate]:::g
    end

    subgraph OS["Order Service"]
      os1[JUnit 5 unit]:::g --> os2[JaCoCo coverage]:::g --> os3[Spring validation]:::g --> os4[Pact consumer<br/>+ provider verify]:::g --> os5[Spring Boot<br/>component tests]:::g --> os6[Playwright<br/>@order-service]:::g --> os7[Actuator<br/>health gate]:::g
    end
```

---

## 8. Request Flow — Create an Order

A happy-path sequence that demonstrates the UI, service-to-service validation, and the contracts in play.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant MFE as Micro Frontend<br/>(React 19)
    participant OS as Order Service<br/>(Spring Boot)
    participant PS as Product Service<br/>(Spring Boot)

    U->>MFE: Fill "Create Order" form
    MFE->>MFE: Client-side validation (TypeScript types)
    MFE->>+OS: POST /api/orders {productId, qty}
    OS->>+PS: GET /api/products/{id}
    PS-->>-OS: 200 · {id, name, price}
    OS->>OS: Validate · compute total
    OS-->>-MFE: 201 Created · {orderId, total}
    MFE->>U: ✅ Success toast + redirect
```

---

## 9. Tech Stack at a Glance

```mermaid
mindmap
  root((Bosch Tech<br/>Platform))
    Frontend
      React 19
      TypeScript 5.7
      Vite 6
      TanStack Query v5
      React Router 7
      Tailwind CSS 4
    Services
      Java 17
      Spring Boot 3.2.4
      Spring Web
      Jakarta Validation
      Spring Actuator
    Quality Gates
      ESLint 9
      Vitest + v8 coverage
      JaCoCo
      Pact 4.6
      Testing Library
      Playwright 1.52
    DevOps
      GitHub Actions
      Docker
      Render.com
      GitHub Pages (reports)
      Uffizzi (ephemeral previews)
```

---

## How to Show This to Clients

1. **Open this README on GitHub** — every diagram renders natively, no extra tooling needed.
2. **Live demo** — point them to the Render URLs for the MFE and the two services' `/actuator/health`.
3. **CI evidence** — open a recent PR and walk through the green checks; open the published Playwright report on GitHub Pages.
4. **PDF export** — run `npx @mermaid-js/mermaid-cli -i docs/README.md -o bosch-tech-architecture.pdf` to produce a handout.

> Tip: copy any single diagram into the [Mermaid Live Editor](https://mermaid.live) to tweak colours or export a transparent SVG for slide decks.
