/* eslint-disable react-hooks/refs */
import { useState, useRef } from "react";

/* ─────────────────────────────────────────────────────────────────
   TECH ICONS — simpleicons CDN URLs
───────────────────────────────────────────────────────────────── */
const TECH_ICONS = [
  { name: "JavaScript", url: "https://cdn.simpleicons.org/javascript/F7DF1E" },
  { name: "TypeScript", url: "https://cdn.simpleicons.org/typescript/3178C6" },
  { name: "Go", url: "https://cdn.simpleicons.org/go/00ADD8" },
  { name: "Python", url: "https://cdn.simpleicons.org/python/3776AB" },
  { name: "Ruby", url: "https://cdn.simpleicons.org/ruby/CC342D" },
  { name: "Java", url: "https://cdn.simpleicons.org/openjdk/ED8B00" },
  { name: "Rust", url: "https://cdn.simpleicons.org/rust/000000" },
  { name: "PHP", url: "https://cdn.simpleicons.org/php/777BB4" },
  { name: "Node.js", url: "https://cdn.simpleicons.org/nodedotjs/339933" },
  { name: "cURL", url: "https://cdn.simpleicons.org/curl/073551" },
  { name: "Postman", url: "https://cdn.simpleicons.org/postman/FF6C37" },
  { name: "Swagger", url: "https://cdn.simpleicons.org/swagger/85EA2D" },
  { name: "Docker", url: "https://cdn.simpleicons.org/docker/2496ED" },
  { name: "Kubernetes", url: "https://cdn.simpleicons.org/kubernetes/326CE5" },
  { name: "GitHub", url: "https://cdn.simpleicons.org/github/181717" },
  { name: "Terraform", url: "https://cdn.simpleicons.org/terraform/7B42BC" },
];

/* ─────────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    tag: "Payments",
    title: "Accept money from anywhere in the world",
    desc: "Cards, UPI, net banking, wallets, BNPL — PayFlow normalises every payment method into one unified API. No separate integrations. No fragmented reconciliation.",
    points: [
      "Smart routing for highest approval rates",
      "Automatic currency conversion",
      "Fraud signals built into every charge",
    ],
    rows: [
      {
        id: "chg_1Pq8xKLZ",
        col2: "UPI",
        amount: "₹4,990",
        status: "succeeded",
      },
      {
        id: "chg_1Pq7mABX",
        col2: "Visa Card",
        amount: "₹12,500",
        status: "succeeded",
      },
      { id: "chg_1Pq6wCDE", col2: "Wallet", amount: "₹899", status: "pending" },
      {
        id: "chg_1Pq5nFGH",
        col2: "NetBanking",
        amount: "₹3,499",
        status: "succeeded",
      },
      {
        id: "chg_1Pq4kMNX",
        col2: "RuPay",
        amount: "₹7,200",
        status: "succeeded",
      },
      { id: "chg_1Pq3jABC", col2: "BNPL", amount: "₹1,150", status: "pending" },
    ],
  },
  {
    tag: "Payouts",
    title: "Move money to vendors, partners and users instantly",
    desc: "Trigger payouts programmatically or via dashboard. IMPS, NEFT, RTGS, UPI — PayFlow picks the fastest, cheapest rail for every transfer automatically.",
    points: [
      "Bulk disbursements via CSV or API",
      "Real-time payout status webhooks",
      "Sub-account ledger management",
    ],
    rows: [
      {
        id: "po_xK9m2LPA",
        col2: "HDFC",
        amount: "₹8,250",
        status: "processed",
      },
      {
        id: "po_xK8n1QRB",
        col2: "ICICI",
        amount: "₹1,400",
        status: "processed",
      },
      {
        id: "po_xK7p0WTC",
        col2: "SBI",
        amount: "₹22,000",
        status: "in_transit",
      },
      { id: "po_xK6q9KSD", col2: "Axis", amount: "₹550", status: "processed" },
      {
        id: "po_xK5r8JTE",
        col2: "Kotak",
        amount: "₹4,300",
        status: "processed",
      },
      {
        id: "po_xK4s7GUF",
        col2: "Yes Bank",
        amount: "₹11,800",
        status: "in_transit",
      },
    ],
  },
  {
    tag: "Subscriptions",
    title: "Recurring billing that handles itself",
    desc: "Model any billing cycle — monthly, annual, usage-based, metered. Dunning, retry logic and smart payment recovery come standard.",
    points: [
      "Prorated upgrades and downgrades",
      "Webhook-driven lifecycle events",
      "Revenue recognition reports",
    ],
    rows: [
      {
        id: "sub_wA3kLZPA",
        col2: "Pro Monthly",
        amount: "₹2,499",
        status: "active",
      },
      {
        id: "sub_wA2mKYQB",
        col2: "Starter Annual",
        amount: "₹9,999",
        status: "active",
      },
      {
        id: "sub_wA1nJXRC",
        col2: "Pro Monthly",
        amount: "₹2,499",
        status: "past_due",
      },
      {
        id: "sub_wA0oIWSD",
        col2: "Growth Annual",
        amount: "₹24,999",
        status: "active",
      },
      { id: "sub_wB1pHVTE", col2: "Metered", amount: "₹640", status: "active" },
      {
        id: "sub_wB2qGUUF",
        col2: "Enterprise",
        amount: "₹49,999",
        status: "active",
      },
    ],
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create an account",
    desc: "Sign up and get test API keys instantly. No business verification needed to start building.",
  },
  {
    step: "02",
    title: "Integrate the SDK",
    desc: "Drop in the PayFlow.js client or use our server SDKs for Node, Python, Go, Ruby or Java.",
  },
  {
    step: "03",
    title: "Accept your first payment",
    desc: "A single API call is all it takes. From test mode to live takes minutes, not weeks.",
  },
];

const SERVICES = [
  {
    name: "API Gateway",
    desc: "Every request is authenticated, rate-limited, and routed here before anything else runs.",
  },
  {
    name: "Payment Service",
    desc: "Creates and tracks every payment. Idempotency keys ensure the same request never charges a customer twice.",
  },
  {
    name: "Event Bus",
    desc: "When a payment succeeds, a single event fans out to every downstream service independently.",
  },
  {
    name: "Ledger Service",
    desc: "Writes a double-entry journal entry for every payment so your balances and reconciliation are always consistent.",
  },
  {
    name: "Fraud Detection",
    desc: "Runs a real-time risk score on every payment. High-risk transactions are blocked before money moves.",
  },
  {
    name: "Notification Service",
    desc: "Delivers webhook events to your server with automatic exponential backoff if your endpoint is down.",
  },
];

const SNIPPET_CHARGE = `import payflow from "@payflow/node";

const pf = new payflow.Client({
  apiKey: process.env.PAYFLOW_SECRET,
});

const charge = await pf.charges.create({
  amount: 49900,           // amount in paise
  currency: "INR",
  source: "tok_visa",
  description: "Pro plan — monthly",
  metadata: { user_id: "usr_9XkM2" },
});

console.log(charge.id);   // chg_1Pq8...`;

const SNIPPET_WEBHOOK = `// Express webhook handler
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const event = payflow.webhooks.constructEvent(
      req.body,
      req.headers["payflow-signature"],
      process.env.PAYFLOW_WEBHOOK_SECRET
    );

    if (event.type === "charge.succeeded") {
      await fulfillOrder(
        event.data.object.metadata.order_id
      );
    }

    res.json({ received: true });
  }
);`;

/* ─────────────────────────────────────────────────────────────────
   ARCHITECTURE DIAGRAM  (wider, bigger boxes so text fits)
───────────────────────────────────────────────────────────────── */
function ArchDiagram() {
  const W = 1160,
    H = 500; // Increased height for better spacing
  const N = {
    app: [90, 225, 138, 68], // Adjusted Y positions
    sdk: [280, 225, 138, 68],
    alb: [470, 90, 144, 58], // More vertical spacing
    gateway: [470, 225, 144, 68],
    rcache: [470, 360, 144, 58],
    payment: [666, 90, 144, 68],
    ledger: [666, 225, 144, 68],
    notify: [666, 360, 144, 68],
    kafka: [864, 225, 148, 68],
    fraud: [864, 90, 144, 58],
    s3: [864, 360, 144, 58],
    db: [1072, 142, 130, 58], // Adjusted for better alignment
    provider: [1072, 298, 130, 58],
  };
  const labels = {
    app: ["Your App", "Web · Mobile · Server"],
    sdk: ["PayFlow SDK", "JS · Node · Python · Go"],
    alb: ["Load Balancer", "TLS · WAF · DDoS"],
    gateway: ["API Gateway", "Auth · Routing · Rate Limit"],
    rcache: ["Cache", "Idempotency · Rate Limit"],
    payment: ["Payment Service", "Idempotency · Provider"],
    ledger: ["Ledger Service", "Journal · Balance"],
    notify: ["Notification Svc", "Webhooks · Retry Queue"],
    kafka: ["Event Bus", "payment.created · webhook.dispatch"],
    fraud: ["Fraud Detection", "Risk Score · Block"],
    s3: ["Audit Storage", "S3 · 7yr retention"],
    db: ["Databases", "PostgreSQL · TimescaleDB"],
    provider: ["Payment Provider", "Cards · UPI · Wallets"],
  };
  const nodeStyle = {
    app: "plain",
    sdk: "accent",
    alb: "plain",
    gateway: "accent",
    rcache: "plain",
    payment: "accent",
    ledger: "accent",
    notify: "accent",
    kafka: "hl",
    fraud: "plain",
    s3: "plain",
    db: "plain",
    provider: "plain",
  };
  const cx = (id) => N[id][0];
  const cy = (id) => N[id][1];
  const nw = (id) => N[id][2];
  const nh = (id) => N[id][3];
  const rx = (id) => cx(id) + nw(id) / 2;
  const lx = (id) => cx(id) - nw(id) / 2;
  const ty = (id) => cy(id) - nh(id) / 2;
  const by = (id) => cy(id) + nh(id) / 2;

  const arrows = [
    {
      d: `M ${rx("app")} ${cy("app")} L ${lx("sdk")} ${cy("sdk")}`,
      label: "HTTPS",
      lx: (rx("app") + lx("sdk")) / 2,
      ly: cy("app") - 12,
    },
    {
      d: `M ${rx("sdk")} ${cy("sdk")} L ${lx("gateway")} ${cy("gateway")}`,
      label: "REST",
      lx: (rx("sdk") + lx("gateway")) / 2,
      ly: cy("sdk") - 12,
    },
    {
      d: `M ${cx("alb")} ${by("alb")} L ${cx("gateway")} ${ty("gateway")}`,
      label: "",
      lx: 0,
      ly: 0,
    },
    {
      d: `M ${cx("gateway")} ${by("gateway")} L ${cx("rcache")} ${ty("rcache")}`,
      label: "",
      lx: 0,
      ly: 0,
    },
    {
      d: `M ${rx("gateway")} ${cy("gateway") - 16} L ${lx("payment")} ${cy("payment")}`,
      label: "",
      lx: 0,
      ly: 0,
    },
    {
      d: `M ${rx("gateway")} ${cy("gateway")} L ${lx("ledger")} ${cy("ledger")}`,
      label: "",
      lx: 0,
      ly: 0,
    },
    {
      d: `M ${rx("gateway")} ${cy("gateway") + 16} L ${lx("notify")} ${cy("notify")}`,
      label: "",
      lx: 0,
      ly: 0,
    },
    {
      d: `M ${rx("payment")} ${cy("payment")} L ${lx("kafka")} ${cy("kafka") - 16}`,
      label: "emit",
      lx: (rx("payment") + lx("kafka")) / 2 + 4,
      ly: cy("payment") - 22,
    },
    {
      d: `M ${rx("ledger")} ${cy("ledger")} L ${lx("kafka")} ${cy("kafka")}`,
      label: "emit",
      lx: (rx("ledger") + lx("kafka")) / 2,
      ly: cy("ledger") - 12,
    },
    {
      d: `M ${rx("notify")} ${cy("notify")} L ${lx("kafka")} ${cy("kafka") + 16}`,
      label: "",
      lx: 0,
      ly: 0,
    },
    {
      d: `M ${cx("kafka")} ${ty("kafka")} L ${cx("fraud")} ${by("fraud")}`,
      label: "",
      lx: 0,
      ly: 0,
    },
    {
      d: `M ${cx("kafka")} ${by("kafka")} L ${cx("s3")} ${ty("s3")}`,
      label: "",
      lx: 0,
      ly: 0,
    },
    {
      d: `M ${rx("fraud")} ${cy("fraud")} L ${lx("db")} ${cy("db")}`,
      label: "",
      lx: 0,
      ly: 0,
    },
    {
      d: `M ${rx("payment")} ${cy("payment") + 8} Q 985 ${cy("payment") + 8} ${lx("provider")} ${cy("provider")}`,
      label: "",
      lx: 0,
      ly: 0,
    },
    {
      d: `M ${lx("provider")} ${cy("provider") - 12} Q 965 ${cy("provider") - 34} ${rx("payment")} ${cy("payment") + 22}`,
      dashed: true,
      label: "response",
      lx: 972,
      ly: cy("provider") - 42,
    },
    {
      d: `M ${lx("kafka")} ${cy("kafka") + 14} L ${rx("notify")} ${cy("notify") - 10}`,
      dashed: true,
      label: "subscribe",
      lx: (lx("kafka") + rx("notify")) / 2 + 2,
      ly: cy("notify") - 28,
    },
    {
      d: `M ${lx("kafka")} ${cy("kafka") - 8} L ${rx("ledger")} ${cy("ledger") + 8}`,
      dashed: true,
      label: "",
      lx: 0,
      ly: 0,
    },
    {
      d: `M ${cx("notify")} ${by("notify")} Q ${cx("notify")} 460 280 460 Q 90 460 ${cx("app")} ${by("app")}`,
      dashed: true,
      label: "webhook → your server",
      lx: 488,
      ly: 478,
    },
  ];

  const fillFor = (id) =>
    ({ hl: "#1e1e4a", accent: "#f2f2fa", plain: "#fff" })[nodeStyle[id]];
  const strokeFor = (id) =>
    ({ hl: "#1e1e4a", accent: "#d0d0ec", plain: "#e0e0ec" })[nodeStyle[id]];
  const tf = (id) => (nodeStyle[id] === "hl" ? "#fff" : "#1a1a2e");
  const sf = (id) => (nodeStyle[id] === "hl" ? "#9090bc" : "#888");

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ minWidth: 760, display: "block" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker
            id="ah"
            markerWidth="8"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L8,3.5 L0,7 L2,3.5 Z" fill="#2d2d6b" />
          </marker>
          <marker
            id="ahd"
            markerWidth="8"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L8,3.5 L0,7 L2,3.5 Z" fill="#a0a0c4" />
          </marker>
        </defs>
        {Array.from({ length: 12 }).map((_, r) =>
          Array.from({ length: 20 }).map((_, c) => (
            <circle
              key={`${r}-${c}`}
              cx={c * 60 + 14}
              cy={r * 46 + 14}
              r="1.1"
              fill="#eeeeef"
            />
          )),
        )}
        {arrows.map((a, i) => (
          <g key={i}>
            <path
              d={a.d}
              stroke={a.dashed ? "#a0a0c4" : "#2d2d6b"}
              strokeWidth={a.dashed ? 1.2 : 1.6}
              strokeDasharray={a.dashed ? "6,4" : "none"}
              fill="none"
              markerEnd={a.dashed ? "url(#ahd)" : "url(#ah)"}
            />
            {a.label && (
              <text
                x={a.lx}
                y={a.ly}
                textAnchor="middle"
                fontSize="10"
                fontFamily="Inter,sans-serif"
                fontWeight="600"
                fill={a.dashed ? "#9090bc" : "#5050a0"}
                letterSpacing="0.01em"
              >
                {a.label}
              </text>
            )}
          </g>
        ))}
        {Object.keys(N).map((id) => {
          const [cx_, cy_, w, h] = N[id];
          const [l1, l2] = labels[id];
          return (
            <g key={id}>
              <rect
                x={cx_ - w / 2}
                y={cy_ - h / 2}
                width={w}
                height={h}
                rx="8"
                fill={fillFor(id)}
                stroke={strokeFor(id)}
                strokeWidth="1.4"
              />
              <text
                x={cx_}
                y={cy_ - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fontFamily="Inter,sans-serif"
                fill={tf(id)}
                letterSpacing="-0.01em"
              >
                {l1}
              </text>
              <text
                x={cx_}
                y={cy_ + 9}
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter,sans-serif"
                fill={sf(id)}
                letterSpacing="0.01em"
              >
                {l2}
              </text>
            </g>
          );
        })}
        <g transform={`translate(14,${H - 48})`}>
          <rect
            width="216"
            height="44"
            rx="6"
            fill="#f8f8fb"
            stroke="#e4e4ee"
            strokeWidth="1"
          />
          <line
            x1="12"
            y1="15"
            x2="36"
            y2="15"
            stroke="#2d2d6b"
            strokeWidth="1.6"
            markerEnd="url(#ah)"
          />
          <text
            x="44"
            y="19"
            fontSize="10"
            fontFamily="Inter,sans-serif"
            fontWeight="500"
            fill="#555"
          >
            Synchronous (real-time)
          </text>
          <line
            x1="12"
            y1="32"
            x2="36"
            y2="32"
            stroke="#a0a0c4"
            strokeWidth="1.2"
            strokeDasharray="6,4"
            markerEnd="url(#ahd)"
          />
          <text
            x="44"
            y="36"
            fontSize="10"
            fontFamily="Inter,sans-serif"
            fontWeight="500"
            fill="#555"
          >
            Async / event-driven
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HERO VISUAL
───────────────────────────────────────────────────────────────── */
function HeroVisual() {
  const txns = [
    {
      id: "chg_9Xk2mLP",
      method: "UPI",
      amount: "+₹12,400",
      status: "succeeded",
      time: "just now",
    },
    {
      id: "po_7Rm4nQA",
      method: "NEFT Payout",
      amount: "−₹4,250",
      status: "processed",
      time: "2s ago",
    },
    {
      id: "chg_3Wb8jKT",
      method: "Visa Card",
      amount: "+₹88,000",
      status: "succeeded",
      time: "5s ago",
    },
    {
      id: "sub_1Vc5tEP",
      method: "Pro Monthly",
      amount: "+₹2,499",
      status: "active",
      time: "12s ago",
    },
    {
      id: "chg_6Yd3pMN",
      method: "Wallet",
      amount: "+₹750",
      status: "succeeded",
      time: "18s ago",
    },
    {
      id: "po_2Qn9uBX",
      method: "IMPS Payout",
      amount: "−₹9,100",
      status: "processed",
      time: "31s ago",
    },
  ];
  const dot = (s) =>
    ({
      succeeded: "#39d353",
      processed: "#39d353",
      active: "#39d353",
      pending: "#e6a817",
      in_transit: "#6e9ef5",
      past_due: "#d35339",
    })[s] || "#aaa";
  return (
    <div
      style={{
        border: "1px solid #e8e8f0",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 1px 20px rgba(45,45,107,0.05)",
      }}
    >
      <div
        style={{
          background: "#fafafa",
          borderBottom: "1px solid #f0f0f0",
          padding: "11px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#1a1a2e",
            letterSpacing: "-0.01em",
          }}
        >
          Live transactions
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "#39d353",
            background: "#0d2b1a",
            padding: "2px 8px",
            borderRadius: 20,
            fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          ● LIVE
        </span>
      </div>
      {txns.map((tx, i) => (
        <div
          key={tx.id}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 18px",
            borderBottom: i < txns.length - 1 ? "1px solid #f5f5f8" : "none",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dot(tx.status),
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                color: "#1a1a2e",
                fontFamily: "'JetBrains Mono',monospace",
                fontWeight: 500,
              }}
            >
              {tx.id}
            </div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
              {tx.method}
            </div>
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: tx.amount.startsWith("+") ? "#1a1a2e" : "#888",
              letterSpacing: "-0.01em",
            }}
          >
            {tx.amount}
          </span>
          <span style={{ fontSize: 10.5, color: "#bbb", whiteSpace: "nowrap" }}>
            {tx.time}
          </span>
        </div>
      ))}
      <div
        style={{
          background: "#fafafa",
          borderTop: "1px solid #f0f0f0",
          padding: "10px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11, color: "#aaa" }}>
          Showing last 6 of 2,841 today
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#2d2d6b",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          View all →
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────────────────────────────── */
function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <circle cx="7" cy="7" r="6.5" stroke="#2d2d6b" strokeWidth="1" />
      <path
        d="M4 7L6 9L10 5"
        stroke="#2d2d6b"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CheckItem({ text }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        fontSize: 13.5,
        color: "#444",
        lineHeight: 1.6,
      }}
    >
      <Check />
      <span>{text}</span>
    </li>
  );
}
function SLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: "Inter,sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#6060a8",
      }}
    >
      {children}
    </div>
  );
}
function H2({ children, style: s = {} }) {
  return (
    <h2
      style={{
        fontFamily: "Inter,sans-serif",
        fontWeight: 700,
        fontSize: "clamp(1.6rem,2.8vw,2.3rem)",
        lineHeight: 1.14,
        letterSpacing: "-0.025em",
        color: "#1a1a2e",
        margin: 0,
        ...s,
      }}
    >
      {children}
    </h2>
  );
}
function Divider() {
  return <div style={{ borderTop: "1px solid #f0f0f0" }} />;
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        background: "#0c0c10",
        borderRadius: 10,
        border: "1px solid #1c1c28",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 18px",
          borderBottom: "1px solid #181824",
        }}
      >
        <span
          style={{
            fontFamily: "Inter,sans-serif",
            fontSize: 11,
            color: "#4a4a6a",
            fontWeight: 500,
          }}
        >
          {lang}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
          style={{
            fontFamily: "Inter,sans-serif",
            fontSize: 11,
            color: "#4a4a6a",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          onMouseOver={(e) => (e.target.style.color = "#aaa")}
          onMouseOut={(e) => (e.target.style.color = "#4a4a6a")}
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 12.5,
          color: "#c9d1d9",
          lineHeight: 1.72,
          padding: "16px 18px",
          margin: 0,
          overflowX: "auto",
          whiteSpace: "pre",
        }}
      >
        {code}
      </pre>
    </div>
  );
}
function statusBadge(s) {
  const m = {
    succeeded: ["#0d2b1a", "#39d353"],
    processed: ["#0d2b1a", "#39d353"],
    active: ["#0d2b1a", "#39d353"],
    pending: ["#2b240d", "#d3a239"],
    in_transit: ["#1a1f2b", "#6e9ef5"],
    past_due: ["#2b130d", "#d35339"],
  };
  const [bg, color] = m[s] || ["#1a1a22", "#888"];
  return {
    background: bg,
    color,
    fontSize: 9.5,
    padding: "2px 7px",
    borderRadius: 4,
    fontFamily: "'JetBrains Mono',monospace",
    fontWeight: 500,
    whiteSpace: "nowrap",
  };
}

/* ─────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────── */
export default function PayFlow() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const refs = {
    products: useRef(null),
    developers: useRef(null),
    docs: useRef(null),
    company: useRef(null),
  };
  const scrollTo = (key) => {
    refs[key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };
  const NAV = [
    { label: "Products", key: "products" },
    { label: "Developers", key: "developers" },
    { label: "Docs", key: "docs" },
    { label: "Company", key: "company" },
  ];
  const codeSnippets = [
    { label: "Create a charge", code: SNIPPET_CHARGE, lang: "node.js" },
    { label: "Handle webhooks", code: SNIPPET_WEBHOOK, lang: "node.js" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        color: "#1a1a2e",
        fontFamily: "Inter,sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
        body{margin:0;background:#fff;}
        .W{width:100%;padding:0 18px;}
        @media(min-width:1600px){.W{padding:0 28px;}}
        .btn-p{background:#1e1e4a;color:#fff;font-size:13.5px;font-weight:500;padding:10px 22px;border-radius:6px;border:none;cursor:pointer;transition:background 0.15s,transform 0.1s;font-family:Inter,sans-serif;letter-spacing:-0.01em;}
        .btn-p:hover{background:#15153a;transform:translateY(-1px);}
        .btn-o{background:transparent;color:#1e1e4a;font-size:13.5px;font-weight:500;padding:10px 22px;border-radius:6px;border:1px solid #d0d0e0;cursor:pointer;transition:border-color 0.15s,color 0.15s;font-family:Inter,sans-serif;letter-spacing:-0.01em;}
        .btn-o:hover{border-color:#1e1e4a;color:#15153a;}
        .nav-a{font-size:13.5px;color:#555;font-weight:400;text-decoration:none;transition:color 0.12s;letter-spacing:-0.01em;cursor:pointer;background:none;border:none;font-family:Inter,sans-serif;padding:0;}
        .nav-a:hover{color:#1a1a2e;}
        .ftab{font-size:12.5px;font-weight:500;padding:6px 15px;border-radius:5px;cursor:pointer;transition:all 0.13s;color:#666;border:1px solid transparent;background:transparent;font-family:Inter,sans-serif;letter-spacing:-0.01em;}
        .ftab.on{color:#1e1e4a;background:#f0f0f8;border-color:#d0d0e8;}
        .ftab:not(.on):hover{color:#333;background:#f6f6fa;}
        .s-card{border:1px solid #ebebf0;border-radius:8px;padding:18px;transition:border-color 0.18s,background 0.18s;}
        .s-card:hover{border-color:#c0c0dc;background:#fafafa;}
        .t-row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid #181824;gap:12px;}
        .t-row:last-child{border-bottom:none;}
        .snum{font-size:11px;font-weight:600;letter-spacing:0.08em;color:#c0c0d4;font-family:'JetBrains Mono',monospace;}
        @keyframes scroll-left{from{transform:translateX(0);}to{transform:translateX(-50%);}}
        .ticker-track{display:flex;width:max-content;animation:scroll-left 42s linear infinite;}
        .ticker-track:hover{animation-play-state:paused;}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start;}
        .g3{display:grid;grid-template-columns:repeat(3,1fr);}
        .gs{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
        @media(max-width:900px){.g2{grid-template-columns:1fr;gap:32px;}.g3{grid-template-columns:1fr;}.gs{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:560px){.gs{grid-template-columns:1fr;}}
        footer a{color:#555;font-size:13px;text-decoration:none;transition:color 0.13s;}
        footer a:hover{color:#1a1a2e;}
        .eng-bg{background-color:#fafafa;background-image:radial-gradient(circle,#e8e8f0 1px,transparent 1px);background-size:24px 24px;}
      `}</style>

      {/* NAV */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <div
          className="W"
          style={{
            height: 54,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/logo.png"
              alt="PayFlow"
              style={{ height: 25, width: "auto" }}
            />
            <span
              style={{
                fontSize: 15.5,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "#1e1e4a",
              }}
            >
              PayFlow
            </span>
          </div>
          <div
            className="hidden md:flex"
            style={{ gap: 24, alignItems: "center" }}
          >
            {NAV.map((n) => (
              <button
                key={n.label}
                className="nav-a"
                onClick={() => scrollTo(n.key)}
              >
                {n.label}
              </button>
            ))}
          </div>
          <div
            className="hidden md:flex"
            style={{ gap: 8, alignItems: "center" }}
          >
            <button
              className="btn-o"
              style={{ padding: "7px 16px", fontSize: 13 }}
            >
              Sign in
            </button>
            <button
              className="btn-p"
              style={{ padding: "7px 16px", fontSize: 13 }}
            >
              Start building
            </button>
          </div>
          <button
            className="md:hidden"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#444",
              padding: 4,
            }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div
            style={{
              borderTop: "1px solid #f0f0f0",
              background: "#fff",
              padding: "0 18px 18px",
            }}
          >
            {NAV.map((n) => (
              <div
                key={n.label}
                style={{ padding: "11px 0", borderBottom: "1px solid #f5f5f5" }}
              >
                <button className="nav-a" onClick={() => scrollTo(n.key)}>
                  {n.label}
                </button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, paddingTop: 14 }}>
              <button className="btn-o" style={{ flex: 1 }}>
                Sign in
              </button>
              <button className="btn-p" style={{ flex: 1 }}>
                Start building
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="W" style={{ paddingTop: 50, paddingBottom: 50 }}>
        <div className="g2" style={{ alignItems: "center" }}>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11,
                fontWeight: 500,
                color: "#8888b0",
                letterSpacing: "0.08em",
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 24,
                  height: 1,
                  background: "#c0c0d8",
                }}
              />
              v1.0 — payment infrastructure
            </div>
            <h1
              style={{
                fontFamily: "Inter,sans-serif",
                fontWeight: 700,
                fontSize: "clamp(2.1rem,4.2vw,3.5rem)",
                lineHeight: 1.07,
                letterSpacing: "-0.035em",
                color: "#1a1a2e",
                margin: 0,
              }}
            >
              The payment infrastructure
              <br />
              <span style={{ color: "#1e1e4a" }}>
                modern businesses
                <br />
                are built on.
              </span>
            </h1>
            <p
              style={{
                marginTop: 20,
                fontSize: 16,
                color: "#555",
                lineHeight: 1.74,
                fontWeight: 400,
                maxWidth: 510,
                letterSpacing: "-0.01em",
              }}
            >
              One API. Every payment method. Instant settlements. PayFlow gives
              developers the primitives to build any payment product — from
              simple checkouts to complex multi-party marketplaces.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 26,
              }}
            >
              <button
                className="btn-p"
                style={{ fontSize: 14, padding: "11px 24px" }}
              >
                Start for free
              </button>
              <button
                className="btn-o"
                style={{ fontSize: 14, padding: "11px 24px" }}
              >
                Read the docs →
              </button>
            </div>
            <div style={{ marginTop: 28 }}>
              <p
                style={{
                  fontSize: 11,
                  color: "#c0c0c8",
                  margin: "0 0 10px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                Supported methods
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[
                  "Visa",
                  "Mastercard",
                  "UPI",
                  "RuPay",
                  "IMPS",
                  "NEFT",
                  "RTGS",
                  "BNPL",
                ].map((m) => (
                  <span
                    key={m}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#888",
                      padding: "3px 10px",
                      border: "1px solid #e8e8f0",
                      borderRadius: 5,
                      background: "#fafafa",
                      fontFamily: "Inter,sans-serif",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <Divider />

      {/* FEATURES */}
      <section
        ref={refs.products}
        className="W"
        style={{ paddingTop: 50, paddingBottom: 50, scrollMarginTop: 54 }}
      >
        <div style={{ marginBottom: 28 }}>
          <SLabel>What PayFlow does</SLabel>
          <H2 style={{ marginTop: 10 }}>
            Every payment primitive,
            <br />
            unified in one platform.
          </H2>
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 26,
          }}
        >
          {FEATURES.map((f, i) => (
            <button
              key={i}
              className={`ftab ${activeFeature === i ? "on" : ""}`}
              onClick={() => setActiveFeature(i)}
            >
              {f.tag}
            </button>
          ))}
        </div>
        <div className="g2">
          <div>
            <h3
              style={{
                fontFamily: "Inter,sans-serif",
                fontWeight: 600,
                fontSize: "1.35rem",
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
                color: "#1a1a2e",
                margin: 0,
              }}
            >
              {FEATURES[activeFeature].title}
            </h3>
            <p
              style={{
                marginTop: 12,
                fontSize: 14.5,
                color: "#555",
                lineHeight: 1.75,
                fontWeight: 400,
              }}
            >
              {FEATURES[activeFeature].desc}
            </p>
            <ul
              style={{
                marginTop: 18,
                listStyle: "none",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {FEATURES[activeFeature].points.map((pt, i) => (
                <CheckItem key={i} text={pt} />
              ))}
            </ul>
            <a
              href="#"
              style={{
                display: "inline-block",
                marginTop: 24,
                fontSize: 13,
                fontWeight: 500,
                color: "#1e1e4a",
                letterSpacing: "-0.01em",
                textDecoration: "none",
              }}
              onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
              onMouseOut={(e) => (e.target.style.textDecoration = "none")}
            >
              Explore {FEATURES[activeFeature].tag} docs →
            </a>
          </div>
          <div
            style={{
              background: "#0c0c10",
              borderRadius: 10,
              border: "1px solid #1c1c28",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                borderBottom: "1px solid #181824",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#ff5f57",
                }}
              />
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#ffbd2e",
                }}
              />
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#28c840",
                }}
              />
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 11,
                  color: "#3a3a5a",
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                payflow.dashboard — live
              </span>
            </div>
            <div style={{ padding: "10px 18px" }}>
              {FEATURES[activeFeature].rows.map((row) => (
                <div key={row.id} className="t-row">
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      color: "#4a4a6a",
                    }}
                  >
                    {row.id}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      color: "#777",
                    }}
                  >
                    {row.col2}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      color: "#c9d1d9",
                    }}
                  >
                    {row.amount}
                  </span>
                  <span style={statusBadge(row.status)}>{row.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* HOW IT WORKS */}
      <section
        className="W eng-bg"
        style={{ paddingTop: 50, paddingBottom: 50 }}
      >
        <div style={{ marginBottom: 36 }}>
          <SLabel>Getting started</SLabel>
          <H2 style={{ marginTop: 10 }}>
            From zero to accepting
            <br />
            payments in three steps.
          </H2>
        </div>
        <div className="g3">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={i}
              style={{
                paddingTop: 24,
                paddingBottom: 24,
                paddingRight: i < 2 ? 36 : 0,
                paddingLeft: i > 0 ? 36 : 0,
                borderRight: i < 2 ? "1px solid #e4e4ee" : "none",
              }}
            >
              <span className="snum">{step.step}</span>
              <h3
                style={{
                  fontFamily: "Inter,sans-serif",
                  fontWeight: 600,
                  fontSize: "1.05rem",
                  letterSpacing: "-0.015em",
                  marginTop: 10,
                  marginBottom: 0,
                  color: "#1a1a2e",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  marginTop: 8,
                  fontSize: 13.5,
                  color: "#666",
                  lineHeight: 1.72,
                  fontWeight: 400,
                }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Divider />
      {/* ICON TICKER */}
      <div
        style={{
          overflow: "hidden",
          borderBottom: "1px solid #f0f0f0",
          background: "#fafafa",
          padding: "12px 0",
        }}
      >
        <div className="ticker-track">
          {[...Array(2)].flatMap((_, ri) =>
            TECH_ICONS.map((icon, i) => (
              <div
                key={`${ri}-${i}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "0 28px",
                  flexShrink: 0,
                }}
              >
                <img
                  src={icon.url}
                  alt={icon.name}
                  title={icon.name}
                  style={{
                    width: 20,
                    height: 20,
                    objectFit: "contain",
                    filter: "grayscale(10%)",
                  }}
                  onError={(e) => (e.target.style.display = "none")}
                />
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: "#999",
                    fontFamily: "Inter,sans-serif",
                    whiteSpace: "nowrap",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {icon.name}
                </span>
              </div>
            )),
          )}
        </div>
      </div>

      {/* DEVELOPER */}
      <section
        ref={refs.developers}
        className="W"
        style={{ paddingTop: 50, paddingBottom: 50, scrollMarginTop: 54 }}
      >
        <div className="g2" style={{ gap: 52 }}>
          <div>
            <SLabel>For developers</SLabel>
            <H2 style={{ marginTop: 10 }}>
              An API you'll
              <br />
              actually enjoy using.
            </H2>
            <p
              style={{
                marginTop: 14,
                fontSize: 14.5,
                color: "#555",
                lineHeight: 1.75,
                fontWeight: 400,
              }}
            >
              PayFlow is designed API-first. Every action in the dashboard is
              also available via REST. Idempotency keys, predictable error
              codes, cursor-based pagination, and exhaustive logs — the
              primitives serious engineers expect.
            </p>
            <ul
              style={{
                marginTop: 18,
                listStyle: "none",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {[
                "SDKs for Node, Python, Go, Ruby, Java and PHP",
                "OpenAPI spec and Postman collection included",
                "Idempotent requests by default",
                "Structured error objects with machine-readable codes",
                "Full test mode with realistic sandbox data",
              ].map((item, i) => (
                <CheckItem key={i} text={item} />
              ))}
            </ul>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button className="btn-p">Explore the API →</button>
              <button className="btn-o">View changelog</button>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {codeSnippets.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 11.5,
                    fontWeight: 500,
                    padding: "5px 11px",
                    borderRadius: 5,
                    border: "none",
                    cursor: "pointer",
                    background: activeTab === i ? "#1e1e4a" : "transparent",
                    color: activeTab === i ? "#fff" : "#888",
                    transition: "all 0.13s",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <CodeBlock
              code={codeSnippets[activeTab].code}
              lang={codeSnippets[activeTab].lang}
            />
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section
        ref={refs.docs}
        style={{
          background: "#fafafa",
          borderTop: "1px solid #f0f0f0",
          borderBottom: "1px solid #f0f0f0",
          scrollMarginTop: 54,
        }}
      >
        <div className="W" style={{ paddingTop: 50, paddingBottom: 50 }}>
          <div style={{ marginBottom: 30 }}>
            <SLabel>System Architecture</SLabel>
            <H2 style={{ marginTop: 10 }}>How a PayFlow transaction flows.</H2>
            <p
              style={{
                marginTop: 12,
                fontSize: 14.5,
                color: "#555",
                fontWeight: 400,
                lineHeight: 1.75,
                maxWidth: 580,
              }}
            >
              Every payment touches a chain of independent services connected by
              an event bus. Solid lines are real-time calls. Dashed lines are
              async events — the system stays consistent even if any individual
              service is temporarily down.
            </p>
          </div>
          <div
            style={{
              border: "1px solid #e4e4ee",
              borderRadius: 12,
              background: "#fff",
              padding: "24px 14px",
              marginBottom: 30,
              overflow: "hidden",
            }}
          >
            <ArchDiagram />
          </div>
          <div className="gs">
            {SERVICES.map((s) => (
              <div key={s.name} className="s-card">
                <div
                  style={{
                    fontFamily: "Inter,sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: "#1a1a2e",
                    marginBottom: 5,
                  }}
                >
                  {s.name}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "#666",
                    lineHeight: 1.65,
                    fontWeight: 400,
                    margin: 0,
                  }}
                >
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="W" style={{ paddingTop: 50, paddingBottom: 50 }}>
        <div
          style={{
            position: "relative",
            textAlign: "center",
            padding: "60px 32px",
            background: "#fafafa",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Corner marks — engineered feel, no full border */}
          {[
            { t: 0, l: 0 },
            { t: 0, r: 0 },
            { b: 0, l: 0 },
            { b: 0, r: 0 },
          ].map((pos, i) => {
            const isR = "r" in pos;
            const isB = "b" in pos;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  [isB ? "bottom" : "top"]: 0,
                  [isR ? "right" : "left"]: 0,
                  width: 20,
                  height: 20,
                  borderTop: isB ? "none" : "1.5px solid #1e1e4a",
                  borderBottom: isB ? "1.5px solid #1e1e4a" : "none",
                  borderLeft: isR ? "none" : "1.5px solid #1e1e4a",
                  borderRight: isR ? "1.5px solid #1e1e4a" : "none",
                }}
              />
            );
          })}
          <SLabel>Get started today</SLabel>
          <H2 style={{ marginTop: 12, fontSize: "clamp(1.7rem,3vw,2.5rem)" }}>
            Your first payment is
            <br />
            one API call away.
          </H2>
          <p
            style={{
              marginTop: 14,
              fontSize: 15,
              color: "#555",
              fontWeight: 400,
              maxWidth: 400,
              margin: "14px auto 0",
              lineHeight: 1.72,
            }}
          >
            Create an account, get your test keys, and start building. No
            commitment. No credit card required.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              justifyContent: "center",
              marginTop: 26,
            }}
          >
            <button
              className="btn-p"
              style={{ fontSize: 14, padding: "11px 26px" }}
            >
              Create free account
            </button>
            <button
              className="btn-o"
              style={{ fontSize: 14, padding: "11px 26px" }}
            >
              Read the docs
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        ref={refs.company}
        style={{
          borderTop: "1px solid #ebebf0",
          background: "#f6f6fa",
          scrollMarginTop: 54,
        }}
      >
        <div className="W" style={{ paddingTop: 36, paddingBottom: 36 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 1fr 1fr 1fr 1fr",
              gap: 24,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <img
                  src="/logo.png"
                  alt="PayFlow"
                  style={{ height: 20, width: "auto" }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "#1e1e4a",
                  }}
                >
                  PayFlow
                </span>
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  color: "#666",
                  lineHeight: 1.6,
                  fontWeight: 400,
                  margin: 0,
                }}
              >
                Payment infrastructure
                <br />
                for the internet.
              </p>
            </div>
            {[
              {
                heading: "Products",
                links: ["Payments", "Payouts", "Subscriptions", "Connect"],
              },
              {
                heading: "Developers",
                links: ["Documentation", "API Reference", "SDKs", "Changelog"],
              },
              {
                heading: "Company",
                links: ["About", "Blog", "Careers", "Press"],
              },
              {
                heading: "Legal",
                links: ["Privacy Policy", "Terms of Service", "Security"],
              },
            ].map((col) => (
              <div key={col.heading}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#999",
                    marginBottom: 10,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {col.heading}
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid #e4e4ee",
              marginTop: 24,
              paddingTop: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "#999",
                fontFamily: "'JetBrains Mono',monospace",
              }}
            >
              © 2026 PayFlow Technologies Pvt. Ltd.
            </span>
            <div style={{ display: "flex", gap: 18 }}>
              {["Privacy", "Terms", "Security"].map((l) => (
                <a
                  key={l}
                  href="#"
                  style={{
                    fontSize: 12,
                    color: "#999",
                    fontFamily: "Inter,sans-serif",
                  }}
                  onMouseOver={(e) => (e.target.style.color = "#1a1a2e")}
                  onMouseOut={(e) => (e.target.style.color = "#999")}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
