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
];

export const DEFAULT_SAMPLE_ID = "architecture";

export function getSample(id: string): Sample {
  return SAMPLES.find((sample) => sample.id === id) ?? SAMPLES[0];
}
