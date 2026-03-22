import React, { useState, useEffect } from "react";

// ── tiny shared primitives ──────────────────────────────────────────────────
const Label = ({ children, light = false }) => (
  <span
    className={`label-text block mb-8 ${light ? "text-white/40" : "text-brand-navy"}`}
  >
    {children}
  </span>
);

const Divider = ({ className = "" }) => (
  <div className={`border-t border-slate-100 ${className}`} />
);

// ── navigation ──────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/96 backdrop-blur-md border-b border-slate-100 py-3"
          : "bg-transparent py-6"
      }`}
    >
      <div className="w-[96%] mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2.5 cursor-pointer group">
            <img
              src="/logo.png"
              alt="PayFlow"
              className="h-7 w-auto transition-transform group-hover:scale-105"
            />
            <span
              className="text-xl font-bold tracking-tight text-brand-navy"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              PayFlow
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {["Products", "Developers", "Pricing", "Company"].map((l) => (
              <a key={l} href="#" className="nav-link">
                {l}
              </a>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-5">
          <button className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
            Sign in
          </button>
          <button className="bg-brand-navy text-white px-6 py-2.5 text-sm font-semibold rounded-[2px] hover:bg-brand-navy-light transition-colors">
            Get started
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── hero ────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-40 pb-28 bg-white overflow-hidden">
      {/* Faint dot-grid background */}
      <div className="absolute inset-0 dot-grid opacity-60 pointer-events-none" />

      <div className="relative w-[96%] mx-auto grid lg:grid-cols-12 gap-12 items-start">
        {/* Copy */}
        <div className="lg:col-span-6 xl:col-span-7">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span
              className="label-text text-slate-500"
              style={{ display: "inline" }}
            >
              Payments infrastructure for India
            </span>
          </div>

          <h1 className="hero-text text-[80px] lg:text-[108px] text-slate-900 mb-10">
            Payments that{" "}
            <span className="text-brand-navy italic">just work.</span>
          </h1>

          <p className="text-xl text-slate-500 font-normal max-w-lg mb-12 leading-relaxed">
            PayFlow gives your business a single, reliable integration to accept
            payments, send payouts, manage subscriptions, and settle funds
            globally — without the complexity.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button className="bg-brand-navy text-white px-8 py-4 text-base font-semibold rounded-[2px] hover:bg-brand-navy-light transition-colors">
              Start for free
            </button>
            <button className="bg-white border border-slate-200 text-slate-900 px-8 py-4 text-base font-semibold rounded-[2px] hover:border-slate-300 hover:bg-slate-50 transition-all">
              View documentation
            </button>
          </div>

          <p className="text-xs text-slate-400 font-medium mt-5">
            No setup fees. No monthly minimums. Pay only for what you process.
          </p>
        </div>

        {/* Hero card */}
        <div className="lg:col-span-6 xl:col-span-5 hidden lg:flex flex-col gap-4 mt-8">
          {/* Transaction monitor */}
          <div className="bg-white border border-slate-100 shadow-[0_32px_80px_-16px_rgba(26,31,94,0.14)] rounded-[2px] overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <span
                className="label-text text-slate-400"
                style={{ display: "inline" }}
              >
                Payment stream
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Live
              </span>
            </div>

            <div className="p-8 space-y-5">
              {[
                {
                  method: "UPI",
                  desc: "Acme Corp — Order #1041",
                  status: "succeeded",
                },
                {
                  method: "Card",
                  desc: "Buildspace — Subscription",
                  status: "succeeded",
                },
                {
                  method: "Net Banking",
                  desc: "Orbit Labs — Invoice",
                  status: "processing",
                },
              ].map(({ method, desc, status }) => (
                <div
                  key={desc}
                  className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-[1px] w-20 text-center">
                      {method}
                    </span>
                    <span className="text-sm text-slate-600 font-medium">
                      {desc}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-[1px] ${
                      status === "succeeded"
                        ? "text-emerald-700 bg-emerald-50"
                        : "text-amber-700 bg-amber-50"
                    }`}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Small stat row — value props only, no fake numbers */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Uptime SLA", value: "99.99%" },
              { label: "Settlement", value: "T+1" },
              { label: "Methods", value: "100+" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white border border-slate-100 p-4 rounded-[2px] text-center"
              >
                <p className="text-xl font-bold text-brand-navy">{value}</p>
                <p
                  className="label-text text-slate-400 mt-1"
                  style={{ display: "block" }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── logos bar ───────────────────────────────────────────────────────────────
function LogosBar() {
  const logos = [
    "Razorpay",
    "HDFC",
    "Zepto",
    "Meesho",
    "Groww",
    "OYO",
    "Urban Company",
    "Slice",
  ];
  return (
    <section className="border-y border-slate-100 py-7 bg-slate-50/40">
      <div className="w-[96%] mx-auto flex items-center gap-6 overflow-hidden">
        <span
          className="label-text text-slate-400 shrink-0"
          style={{ display: "inline" }}
        >
          Trusted by
        </span>
        <div className="flex items-center gap-10 overflow-x-auto scrollbar-none flex-1">
          {logos.map((l) => (
            <span
              key={l}
              className="text-sm font-semibold text-slate-300 shrink-0 tracking-wide"
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── products bento ───────────────────────────────────────────────────────────
function Products() {
  return (
    <section className="py-36 bg-white">
      <div className="w-[96%] mx-auto">
        {/* Section header */}
        <div className="mb-14">
          <Label>What PayFlow does</Label>
          <h2 className="display-text text-5xl lg:text-6xl text-slate-900 max-w-2xl">
            Everything your business needs to move money.
          </h2>
        </div>

        {/* Bento grid */}
        <div className="grid lg:grid-cols-4 gap-px bg-slate-100 border border-slate-100">
          {/* Payments — wide */}
          <div className="bento-card lg:col-span-2 flex flex-col justify-between min-h-[380px]">
            <div>
              <Label>Payments</Label>
              <h3 className="display-text text-4xl text-slate-900 mb-5">
                Accept every payment method your customers use.
              </h3>
              <p className="text-slate-500 text-base leading-relaxed max-w-sm">
                UPI, debit and credit cards, net banking, wallets, EMI — all
                through a single, clean API. No juggling multiple providers.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              {["UPI", "Cards", "Net Banking", "Wallets", "EMI", "BNPL"].map(
                (m) => (
                  <span
                    key={m}
                    className="text-[11px] font-semibold text-slate-500 border border-slate-100 px-3 py-1 rounded-[1px] bg-slate-50"
                  >
                    {m}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* Payouts */}
          <div className="bento-card flex flex-col justify-between min-h-[380px]">
            <div>
              <Label>Payouts</Label>
              <h3 className="display-text text-3xl text-slate-900 mb-4">
                Send money anywhere, instantly.
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                IMPS, NEFT, UPI transfers — bulk or individual. Pay vendors,
                freelancers, and employees in real time without switching tools.
              </p>
            </div>
            <div className="mt-10 space-y-2">
              {["IMPS transfers", "Bulk disbursements", "Vendor payouts"].map(
                (f) => (
                  <div
                    key={f}
                    className="flex items-center gap-2 text-sm text-slate-600 font-medium"
                  >
                    <span className="w-1 h-1 rounded-full bg-brand-navy shrink-0" />
                    {f}
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Billing */}
          <div className="bento-card flex flex-col justify-between min-h-[380px]">
            <div>
              <Label>Billing</Label>
              <h3 className="display-text text-3xl text-slate-900 mb-4">
                Recurring revenue, automated.
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Flexible subscription models with smart dunning, prorated
                upgrades, and localised pricing — without writing billing logic
                from scratch.
              </p>
            </div>
            <div className="mt-10 border border-slate-100 p-4 rounded-[1px]">
              <p
                className="label-text text-slate-400 mb-2"
                style={{ display: "block" }}
              >
                Next invoice
              </p>
              <p className="text-lg font-bold text-slate-900">Apr 01, 2026</p>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Pro plan — annual
              </p>
            </div>
          </div>

          {/* Dashboard — wide dark */}
          <div className="bento-card-dark lg:col-span-3 min-h-[340px] flex flex-col lg:flex-row gap-10 items-center">
            <div className="flex-1">
              <Label light>Dashboard</Label>
              <h3 className="display-text text-4xl text-white mb-5">
                Your business at a glance.
              </h3>
              <p className="text-slate-400 text-base leading-relaxed max-w-xs">
                Real-time transaction views, settlement tracking, reconciliation
                reports, and multi-tenant management — one place for it all.
              </p>
            </div>
            <div className="flex-1 border border-white/10 bg-white/5 p-6 rounded-[1px] self-stretch flex flex-col justify-between">
              {[
                {
                  label: "Settlements",
                  sub: "Last 7 days",
                  tag: "On schedule",
                },
                { label: "Reconciliation", sub: "March 2026", tag: "Complete" },
                {
                  label: "Payouts batch",
                  sub: "230 transfers",
                  tag: "Processing",
                },
              ].map(({ label, sub, tag }) => (
                <div
                  key={label}
                  className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-white/40 font-medium">{sub}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                    {tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud */}
          <div className="bento-card min-h-[340px] flex flex-col justify-between">
            <div>
              <Label>Risk</Label>
              <h3 className="display-text text-3xl text-slate-900 mb-4">
                Fraud stopped before it starts.
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Rules-based fraud detection that scores every transaction in
                real time. Block bad actors without slowing down your customers.
              </p>
            </div>
            <div className="mt-8">
              <p
                className="label-text text-slate-400 mb-2"
                style={{ display: "block" }}
              >
                Risk coverage
              </p>
              <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                <div className="h-full w-5/6 bg-brand-navy rounded-full" />
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Velocity checks, IP reputation, BIN analysis
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── why payflow section ──────────────────────────────────────────────────────
function WhyPayFlow() {
  const pillars = [
    {
      num: "01",
      title: "One integration, every method",
      body: "Stop dealing with five different payment providers. PayFlow consolidates UPI, cards, net banking, and wallets behind a single API so your team ships faster.",
    },
    {
      num: "02",
      title: "Settlement on your terms",
      body: "Choose daily, weekly, or on-demand settlements. T+1 payouts mean your cash is working for you — not sitting in a clearing house.",
    },
    {
      num: "03",
      title: "Built for scale from day one",
      body: "Whether you're processing a hundred transactions a day or a hundred thousand, PayFlow's infrastructure scales with you — no re-integration required.",
    },
    {
      num: "04",
      title: "Compliance without the headache",
      body: "PCI-DSS Level 1, RBI guidelines, and GDPR compliance built in. We handle the regulatory complexity so you can focus on your product.",
    },
  ];

  return (
    <section className="py-36 bg-slate-50/40 border-y border-slate-100">
      <div className="w-[96%] mx-auto">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-4">
            <Label>Why PayFlow</Label>
            <h2 className="display-text text-5xl text-slate-900 mb-6">
              The infrastructure layer for your revenue.
            </h2>
            <p className="text-slate-500 leading-relaxed">
              Built by engineers who were frustrated by the complexity of
              existing payment systems. PayFlow is the platform we wished we
              had.
            </p>
          </div>

          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-px bg-slate-100 border border-slate-100">
            {pillars.map(({ num, title, body }) => (
              <div key={num} className="bento-card">
                <p
                  className="label-text text-slate-300 mb-6"
                  style={{ display: "block" }}
                >
                  {num}
                </p>
                <h4 className="display-text text-xl text-slate-900 mb-3">
                  {title}
                </h4>
                <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── developer section ────────────────────────────────────────────────────────
function Developer() {
  return (
    <section className="py-36 bg-white">
      <div className="w-[96%] mx-auto grid lg:grid-cols-2 gap-20 items-center">
        {/* Code block */}
        <div className="code-block p-10 relative">
          <div className="absolute top-0 left-0 right-0 h-10 flex items-center gap-2 px-5 border-b border-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <span
              className="label-text text-white/20 ml-2"
              style={{ display: "inline" }}
            >
              payments.js
            </span>
          </div>
          <pre className="text-sm font-mono leading-[2.1] pt-6 overflow-x-auto">
            <code>
              <span className="text-blue-400">POST</span>{" "}
              <span className="text-slate-400">/v1/payments</span>
            </code>
            {"\n"}
            <code>
              <span className="text-slate-600">{"{"}</span>
            </code>
            {"\n"}
            <code>
              {"  "}
              <span className="text-emerald-400">"amount"</span>
              <span className="text-slate-600">: </span>
              <span className="text-amber-300">250000</span>
              <span className="text-slate-600">,</span>
            </code>
            {"\n"}
            <code>
              {"  "}
              <span className="text-emerald-400">"currency"</span>
              <span className="text-slate-600">: </span>
              <span className="text-amber-300">"INR"</span>
              <span className="text-slate-600">,</span>
            </code>
            {"\n"}
            <code>
              {"  "}
              <span className="text-emerald-400">"method"</span>
              <span className="text-slate-600">: </span>
              <span className="text-amber-300">"upi"</span>
              <span className="text-slate-600">,</span>
            </code>
            {"\n"}
            <code>
              {"  "}
              <span className="text-emerald-400">"idempotency_key"</span>
              <span className="text-slate-600">: </span>
              <span className="text-amber-300">"order_1042"</span>
            </code>
            {"\n"}
            <code>
              <span className="text-slate-600">{"}"}</span>
            </code>
            {"\n\n"}
            <code>
              <span className="text-slate-500">// Response</span>
            </code>
            {"\n"}
            <code>
              <span className="text-slate-600">{"{"}</span>
            </code>
            {"\n"}
            <code>
              {"  "}
              <span className="text-emerald-400">"id"</span>
              <span className="text-slate-600">: </span>
              <span className="text-amber-300">"pay_01J9XZ..."</span>
              <span className="text-slate-600">,</span>
            </code>
            {"\n"}
            <code>
              {"  "}
              <span className="text-emerald-400">"status"</span>
              <span className="text-slate-600">: </span>
              <span className="text-emerald-300">"succeeded"</span>
            </code>
            {"\n"}
            <code>
              <span className="text-slate-600">{"}"}</span>
            </code>
          </pre>
        </div>

        {/* Copy */}
        <div>
          <Label>For developers</Label>
          <h2 className="display-text text-5xl text-slate-900 mb-8">
            API-first. Always.
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed mb-10">
            Clean, RESTful APIs with idempotency built in — so retried requests
            never double-charge your customers. Integrate in hours, not weeks.
          </p>

          <div className="space-y-8">
            {[
              {
                title: "Idempotent by design",
                body: "Pass an idempotency key and we guarantee no duplicate charges, ever — even under retries and network failures.",
              },
              {
                title: "Webhook inspector",
                body: "Real-time delivery logs, payload inspection, and one-click replay for every event your integration receives.",
              },
              {
                title: "Test mode parity",
                body: "A full mirror of production — test every payment method, failure scenario, and webhook event before you go live.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="flex gap-5">
                <div className="w-5 h-5 border border-brand-navy rounded-[1px] shrink-0 mt-0.5 flex items-center justify-center">
                  <div className="w-2 h-2 bg-brand-navy rounded-[1px]" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">{title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button className="mt-12 text-brand-navy font-semibold text-sm border-b border-brand-navy pb-0.5 hover:opacity-70 transition-opacity">
            Read the API documentation
          </button>
        </div>
      </div>
    </section>
  );
}

// ── security & compliance ────────────────────────────────────────────────────
function Security() {
  return (
    <section className="py-36 border-y border-slate-100 bg-slate-50/30 line-grid">
      <div className="w-[96%] mx-auto">
        <div className="mb-14">
          <Label>Security and compliance</Label>
          <h2 className="display-text text-5xl text-slate-900 max-w-xl">
            Enterprise-grade security. Out of the box.
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-px bg-slate-100 border border-slate-100">
          {[
            {
              badge: "PCI-DSS Level 1",
              title: "Certified compliant",
              body: "The highest level of PCI certification. Cardholder data never touches your servers — it's tokenized before it leaves the browser.",
            },
            {
              badge: "RBI Guidelines",
              title: "Locally compliant",
              body: "Fully aligned with RBI payment aggregator guidelines and data localisation mandates. Your Indian customer data stays in India.",
            },
            {
              badge: "GDPR + DPDP",
              title: "Privacy by default",
              body: "Data minimisation, right to erasure, and consent management built into the platform — not bolted on afterward.",
            },
          ].map(({ badge, title, body }) => (
            <div key={badge} className="bento-card bg-white">
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-brand-navy border border-brand-navy/20 bg-brand-navy/5 px-2.5 py-1 mb-8 rounded-[1px]">
                {badge}
              </span>
              <h3 className="display-text text-2xl text-slate-900 mb-3">
                {title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Bottom strip */}
        <div className="mt-px grid lg:grid-cols-4 gap-px bg-slate-100 border-x border-b border-slate-100">
          {[
            "TLS 1.3 encryption in transit",
            "AES-256 at rest",
            "SOC 2 Type II",
            "24/7 security monitoring",
          ].map((item) => (
            <div
              key={item}
              className="bento-card bg-white py-6 flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-brand-navy shrink-0" />
              <span className="text-sm font-medium text-slate-600">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── how it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Create your account",
      body: "Sign up in minutes. No paperwork, no sales calls. Connect your bank account and you are ready to accept your first payment.",
    },
    {
      step: "02",
      title: "Integrate the API",
      body: "Drop in our client libraries for Node, Python, or Go. Most integrations go live in an afternoon. Our test mode means zero production risk.",
    },
    {
      step: "03",
      title: "Go live and grow",
      body: "Flip the switch, start accepting real payments, and watch your dashboard populate. Scale at your own pace — our pricing grows with you.",
    },
  ];

  return (
    <section className="py-36 bg-white">
      <div className="w-[96%] mx-auto">
        <div className="mb-16">
          <Label>How it works</Label>
          <h2 className="display-text text-5xl text-slate-900">
            Live in an afternoon.
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-px bg-slate-100 border border-slate-100">
          {steps.map(({ step, title, body }, i) => (
            <div key={step} className="bento-card bg-white relative">
              {/* connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 -right-px w-px h-px">
                  <div
                    className="absolute top-0 right-0 w-4 h-px bg-slate-200"
                    style={{ right: "-40px", top: "0px" }}
                  />
                </div>
              )}
              <p className="display-text text-7xl text-slate-100 mb-6">
                {step}
              </p>
              <h3 className="display-text text-2xl text-slate-900 mb-3">
                {title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── use-case section ─────────────────────────────────────────────────────────
function UseCases() {
  const cases = [
    {
      tag: "E-commerce",
      headline: "Checkout without the drop-off.",
      body: "Embedded payment flows that feel native to your store. Fewer redirects, fewer abandons, more completed orders.",
    },
    {
      tag: "SaaS",
      headline: "Subscriptions that manage themselves.",
      body: "Automated billing cycles, smart dunning, plan upgrades and downgrades — so you can focus on building product, not chasing payments.",
    },
    {
      tag: "Marketplaces",
      headline: "Split payments at scale.",
      body: "Collect from buyers, split among sellers, and settle automatically. Built-in KYC and compliance for each party.",
    },
    {
      tag: "Fintech",
      headline: "The rails beneath your product.",
      body: "Use PayFlow as the payments backbone for your own financial product. White-label flows, programmable webhooks, full API access.",
    },
  ];

  return (
    <section className="py-36 bg-slate-900">
      <div className="w-[96%] mx-auto">
        <div className="mb-14">
          <Label light>Built for your industry</Label>
          <h2 className="display-text text-5xl text-white">
            Whatever you're building, <br className="hidden lg:block" />
            PayFlow fits.
          </h2>
        </div>

        <div className="grid lg:grid-cols-4 gap-px bg-white/5 border border-white/10">
          {cases.map(({ tag, headline, body }) => (
            <div
              key={tag}
              className="p-10 border border-white/0 hover:bg-white/5 transition-colors duration-300 group"
            >
              <span className="label-text text-white/30 mb-8 block">{tag}</span>
              <h3 className="display-text text-2xl text-white mb-4 group-hover:text-white transition-colors">
                {headline}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── pricing philosophy ───────────────────────────────────────────────────────
function Pricing() {
  return (
    <section className="py-36 bg-white border-b border-slate-100">
      <div className="w-[96%] mx-auto grid lg:grid-cols-12 gap-16 items-center">
        <div className="lg:col-span-5">
          <Label>Pricing</Label>
          <h2 className="display-text text-5xl text-slate-900 mb-6">
            Simple, transparent, usage-based.
          </h2>
          <p className="text-slate-500 leading-relaxed mb-8">
            No monthly minimums. No setup fees. No hidden charges. You pay a
            small percentage per successful transaction — nothing more. As your
            volume grows, your rate goes down.
          </p>
          <button className="bg-brand-navy text-white px-8 py-4 text-sm font-semibold rounded-[2px] hover:bg-brand-navy-light transition-colors">
            See full pricing
          </button>
        </div>

        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-px bg-slate-100 border border-slate-100">
          {[
            {
              tier: "Starter",
              who: "Early-stage startups",
              feature: "Full API access, test mode, standard support",
            },
            {
              tier: "Growth",
              who: "Scaling businesses",
              feature: "Volume discounts, priority support, analytics",
            },
            {
              tier: "Enterprise",
              who: "Large organisations",
              feature: "Custom rates, SLA guarantee, dedicated account team",
            },
            {
              tier: "Platform",
              who: "Marketplaces and fintech",
              feature: "Split payments, multi-tenant, white-label flows",
            },
          ].map(({ tier, who, feature }) => (
            <div key={tier} className="bento-card bg-white flex flex-col gap-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-0.5">{tier}</h4>
                <p className="text-xs text-slate-400 font-medium">{who}</p>
              </div>
              <Divider />
              <p className="text-sm text-slate-500 leading-relaxed">
                {feature}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── cta ──────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="bg-brand-navy py-44 relative overflow-hidden">
      {/* Subtle dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative w-[96%] mx-auto text-center">
        <Label light>Get started today</Label>
        <h2 className="hero-text text-[72px] lg:text-[120px] text-white mb-10">
          Start building.
        </h2>
        <p className="text-white/40 text-xl font-normal mb-14 max-w-md mx-auto leading-relaxed">
          Join businesses that run their payments on PayFlow. No monthly fees —
          just success-based pricing.
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          <button className="bg-white text-brand-navy px-12 py-5 text-lg font-bold rounded-[2px] hover:scale-[1.02] transition-transform shadow-xl">
            Get API keys
          </button>
          <button className="border border-white/20 text-white px-12 py-5 text-lg font-semibold rounded-[2px] hover:bg-white/10 transition-colors">
            Talk to sales
          </button>
        </div>
      </div>
    </section>
  );
}

// ── footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    {
      heading: "Products",
      links: ["Payments", "Payouts", "Billing", "Risk", "Dashboard"],
    },
    {
      heading: "Developers",
      links: ["Documentation", "API Reference", "SDKs", "Changelog", "Status"],
    },
    {
      heading: "Company",
      links: ["About", "Blog", "Careers", "Security", "Contact"],
    },
    {
      heading: "Legal",
      links: [
        "Privacy Policy",
        "Terms of Service",
        "Cookie Policy",
        "Compliance",
      ],
    },
  ];

  return (
    <footer className="bg-white pt-24 pb-12 border-t border-slate-100">
      <div className="w-[96%] mx-auto">
        <div className="flex flex-col lg:flex-row justify-between gap-20 mb-20">
          {/* Brand */}
          <div className="lg:w-64 shrink-0">
            <div className="flex items-center gap-2.5 mb-6">
              <img
                src="/logo.png"
                alt=""
                className="h-6"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <span
                className="font-bold text-xl tracking-tight text-brand-navy"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                PayFlow
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              The modern standard for payment infrastructure in India and
              beyond.
            </p>
            <div className="flex gap-6">
              {["LinkedIn", "Twitter", "GitHub"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-navy transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 flex-1">
            {cols.map(({ heading, links }) => (
              <div key={heading}>
                <h5
                  className="label-text text-slate-900 mb-6"
                  style={{ display: "block" }}
                >
                  {heading}
                </h5>
                <ul className="space-y-4">
                  {links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-sm text-slate-500 font-medium hover:text-brand-navy transition-colors"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Divider className="mb-8" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <span
            className="label-text text-slate-300"
            style={{ display: "inline" }}
          >
            © 2026 PayFlow Technologies Pvt. Ltd.
          </span>
          <div className="flex gap-8">
            {["Privacy", "Terms", "Security"].map((l) => (
              <a
                key={l}
                href="#"
                className="text-xs font-semibold text-slate-400 hover:text-brand-navy transition-colors"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── page root ────────────────────────────────────────────────────────────────
export default function PayFlow() {
  return (
    <div className="relative w-full overflow-x-hidden">
      <Nav />
      <Hero />
      <LogosBar />
      <Products />
      <WhyPayFlow />
      <Developer />
      <Security />
      <HowItWorks />
      <UseCases />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}
