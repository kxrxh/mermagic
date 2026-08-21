export type Sample = {
  id: string;
  name: string;
  code: string;
};

export const SAMPLES: Sample[] = [
  {
    id: "architecture",
    name: "Checkout platform",
    code: `---
title: Checkout platform
---
flowchart LR
  subgraph clients [Clients]
    web[Web app]
    mobile[iOS / Android]
  end

  subgraph edge [Edge]
    cdn[CDN]
    waf[WAF]
    gw[API gateway]
  end

  subgraph vpc [Production VPC]
    bff[BFF]
    orders[Orders]
    payments[Payments]
    inventory[Inventory]
    bus{{Event bus}}
    workers[Workers]
    pg[(Postgres)]
    redis[(Redis)]
    s3[(Object store)]
  end

  stripe[Stripe]

  web --> cdn
  mobile --> cdn
  cdn --> waf --> gw --> bff
  bff --> orders
  bff --> payments
  bff --> inventory
  orders --> pg
  payments --> pg
  inventory --> redis
  orders --> bus
  payments --> bus
  bus --> workers
  workers --> s3
  payments --> stripe
`,
  },
  {
    id: "sequence",
    name: "Payment capture",
    code: `---
title: Payment capture
---
sequenceDiagram
  autonumber
  actor Customer
  participant App as Checkout
  participant API as Payments API
  participant Ledger
  participant PSP as Stripe

  Customer->>App: Confirm order
  App->>API: Create PaymentIntent
  API->>Ledger: Reserve funds
  Ledger-->>API: reservation_id
  API->>PSP: confirm(payment_method)
  alt 3DS required
    PSP-->>App: redirect_url
    Customer->>PSP: Complete challenge
    PSP-->>API: payment_intent.succeeded
  else Immediate capture
    PSP-->>API: succeeded
  end
  API->>Ledger: Capture reservation
  API-->>App: order.paid
  App-->>Customer: Receipt
`,
  },
  {
    id: "class",
    name: "Order domain",
    code: `---
title: Order domain
---
classDiagram
  direction TB
  class Order {
    <<aggregate>>
    +OrderId id
    +CustomerId customerId
    +OrderStatus status
    +Money total
    +place()
    +cancel()
    +capture()
  }
  class LineItem {
    +Sku sku
    +int quantity
    +Money unitPrice
  }
  class Payment {
    <<entity>>
    +PaymentId id
    +PaymentStatus status
    +authorize()
    +capture()
    +refund()
  }
  class Customer {
    +CustomerId id
    +Email email
  }
  class Money {
    <<value object>>
    +long amount
    +Currency currency
  }

  Customer "1" --> "0..*" Order : places
  Order "1" *-- "1..*" LineItem : contains
  Order "1" --> "0..*" Payment : settled by
  Order --> Money
  LineItem --> Money
  Payment --> Money
`,
  },
  {
    id: "er",
    name: "Multi-tenant schema",
    code: `---
title: Multi-tenant schema
---
erDiagram
  ORGANIZATION ||--|{ MEMBERSHIP : has
  ORGANIZATION ||--o{ WORKSPACE : owns
  USER ||--o{ MEMBERSHIP : belongs-to
  WORKSPACE ||--o{ PROJECT : contains
  PROJECT ||--o{ ENVIRONMENT : has
  ENVIRONMENT ||--o{ DEPLOYMENT : records
  ORGANIZATION ||--|| BILLING_ACCOUNT : billed-as
  BILLING_ACCOUNT ||--o{ INVOICE : generates

  ORGANIZATION {
    uuid id PK
    string slug UK
    string name
    timestamp created_at
  }
  USER {
    uuid id PK
    string email UK
    timestamp created_at
  }
  MEMBERSHIP {
    uuid id PK
    uuid organization_id FK
    uuid user_id FK
    string role
  }
  ENVIRONMENT {
    uuid id PK
    uuid project_id FK
    string name
    string region
  }
  INVOICE {
    uuid id PK
    uuid billing_account_id FK
    int amount_cents
    string status
    date period_start
  }
`,
  },
  {
    id: "state",
    name: "Order lifecycle",
    code: `---
title: Order lifecycle
---
stateDiagram-v2
  [*] --> Draft
  Draft --> AwaitingPayment: checkout started
  AwaitingPayment --> Authorized: auth succeeded
  AwaitingPayment --> Failed: auth declined
  Failed --> AwaitingPayment: retry
  Failed --> Cancelled: timeout
  Authorized --> Captured: capture
  Authorized --> Cancelled: void
  Captured --> Fulfilling: allocate stock
  Fulfilling --> Shipped: handed to carrier
  Shipped --> Delivered: proof of delivery
  Captured --> Refunding: refund requested
  Delivered --> Refunding: return received
  Refunding --> Refunded
  Delivered --> [*]
  Refunded --> [*]
  Cancelled --> [*]
`,
  },
  {
    id: "pipeline",
    name: "Release pipeline",
    code: `---
title: Release pipeline
---
flowchart LR
  subgraph ci [CI]
    pr[Pull request] --> checks[Lint / types / tests]
    checks --> image[Build image]
    image --> scan[SCA + SAST]
  end

  subgraph cd [CD]
    scan --> staging[Deploy staging]
    staging --> e2e[E2E]
    e2e --> canary[Canary 5%]
    canary --> prod[Promote production]
  end

  prod --> rollback[Auto-rollback]:::muted
  canary -.-> rollback

  classDef muted stroke-dasharray: 5 5
`,
  },
  {
    id: "gantt",
    name: "Q3 launch",
    code: `---
title: Q3 launch
---
gantt
  dateFormat YYYY-MM-DD
  axisFormat %b %d
  excludes weekends
  section Discovery
    Research            :done,    d1, 2026-07-01, 10d
    Spec                :done,    d2, after d1, 5d
  section Build
    Payments API        :active,  b1, 2026-07-20, 18d
    Checkout UI         :         b2, 2026-07-22, 16d
    Ledger              :         b3, after b1, 12d
  section Launch
    Staging             :         l1, after b2, 5d
    Canary              :         l2, after l1, 4d
    GA                  :milestone, ga, after l2, 1d
`,
  },
  {
    id: "git",
    name: "Feature branch",
    code: `---
title: Feature branch
---
gitGraph
  commit id: "main-1"
  commit id: "auth"
  branch feat/payments
  checkout feat/payments
  commit id: "intent"
  commit id: "3ds"
  checkout main
  commit id: "hotfix" type: HIGHLIGHT
  checkout feat/payments
  merge main
  commit id: "webhooks"
  checkout main
  merge feat/payments
  commit id: "v1.4.0" tag: "v1.4.0"
`,
  },
  {
    id: "pie",
    name: "Payment mix",
    code: `---
title: Payment mix
---
pie showData
  "Cards" : 62
  "Wallets" : 21
  "Bank transfer" : 11
  "BNPL" : 6
`,
  },
  {
    id: "journey",
    name: "Checkout journey",
    code: `---
title: Checkout journey
---
journey
  section Browse
    Open app: 5: Customer
    Find item: 4: Customer
  section Pay
    Add to cart: 5: Customer
    Enter address: 3: Customer
    Authenticate: 2: Customer, Stripe
    Capture: 4: Payments
  section After
    Receipt: 5: Customer
    Ship: 4: Ops
`,
  },
  {
    id: "mindmap",
    name: "Platform map",
    code: `---
title: Platform map
---
mindmap
  root((Checkout))
    Clients
      Web
      iOS
      Android
    Edge
      CDN
      WAF
      Gateway
    Domain
      Orders
      Payments
      Inventory
    Data
      Postgres
      Redis
      Objects
`,
  },
  {
    id: "timeline",
    name: "Product history",
    code: `---
title: Product history
---
timeline
  section 2024
    Q1 : Private beta
    Q2 : Public checkout
    Q3 : Wallets
    Q4 : Multi-tenant
  section 2025
    Q1 : Ledger rewrite
    Q2 : 3DS / SCA
    Q3 : Inventory holds
    Q4 : EU launch
  section 2026
    Q1 : Marketplace
    Q2 : Instant payouts
`,
  },
  {
    id: "kanban",
    name: "Sprint board",
    code: `---
title: Sprint board
---
kanban
  Backlog
    [3DS retries]
    [Inventory holds]
  Doing
    [Ledger capture]
    [Webhook DLQ]
  Review
    [Refunds API]
  Done
    [PaymentIntent]
    [Receipt emails]
`,
  },
  {
    id: "c4",
    name: "System context",
    code: `---
title: System context
---
C4Context
  Person(customer, "Customer", "Places orders and pays")
  Person(ops, "Ops", "Handles exceptions")
  System(checkout, "Checkout", "Cart, pay, and fulfill")
  System_Ext(stripe, "Stripe", "Card acquiring")
  System_Ext(carriers, "Carriers", "Tracking and POD")
  Rel(customer, checkout, "Checks out")
  Rel(checkout, stripe, "Captures payments")
  Rel(checkout, carriers, "Creates shipments")
  Rel(ops, checkout, "Refunds / retries")
`,
  },
  {
    id: "quadrant",
    name: "Initiative map",
    code: `---
title: Initiative map
---
quadrantChart
  x-axis Low effort --> High effort
  y-axis Low impact --> High impact
  quadrant-1 Bets
  quadrant-2 Quick wins
  quadrant-3 Fill-ins
  quadrant-4 Reconsider
  Instant payouts: [0.78, 0.86]
  Marketplace: [0.82, 0.72]
  3DS recovery: [0.32, 0.80]
  Receipt redesign: [0.28, 0.55]
  CSV export: [0.22, 0.24]
  Custom reports: [0.70, 0.30]
`,
  },
  {
    id: "volume",
    name: "Weekly volume",
    code: `---
title: Weekly volume
---
xychart-beta
  x-axis [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  y-axis "Orders" 0 --> 12000
  bar [8200, 9100, 8800, 10200, 11500, 6400, 5100]
  line [7900, 8600, 9000, 9700, 10800, 6200, 5400]
`,
  },
];

export const DEFAULT_SAMPLE_ID = "architecture";

export function getSample(id: string): Sample {
  return SAMPLES.find((sample) => sample.id === id) ?? SAMPLES[0];
}
