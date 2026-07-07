import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — VeRdex",
  description: "VeRdex Terms of Service. Read the rules governing use of the VeRdex Human Prediction Network.",
  robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = "July 7, 2025";
const CONTACT_EMAIL  = "brianokindo2022@gmail.com";

export default function TermsPage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#07091a",
      color: "#e8eaf6",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "0 0 80px",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1440 0%, #07091a 100%)",
        borderBottom: "1px solid rgba(99,102,241,0.2)",
        padding: "32px 24px 24px",
      }}>
        <Link href="/" style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.85rem", letterSpacing: "0.05em" }}>
          ← Back to VeRdex
        </Link>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, margin: "16px 0 4px", letterSpacing: "-0.02em" }}>
          Terms of Service
        </h1>
        <p style={{ color: "rgba(232,234,246,0.5)", fontSize: "0.85rem", margin: 0 }}>
          Effective {EFFECTIVE_DATE} · VeRdex Human Prediction Network
        </p>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>

        <Section title="1. Acceptance of Terms">
          By accessing or using VeRdex (the &quot;Service&quot;), you agree to be bound by these Terms of Service
          (&quot;Terms&quot;). If you do not agree, you may not use the Service. These Terms form a binding
          agreement between you and VeRdex.
        </Section>

        <Section title="2. Eligibility">
          <ul>
            <li>You must be at least 18 years old (or the age of majority in your jurisdiction).</li>
            <li>You must hold a valid World ID and complete World ID verification to participate in any prediction market, Clash, or Goal on VeRdex.</li>
            <li>You are responsible for ensuring participation in prediction markets is lawful in your jurisdiction. VeRdex does not constitute gambling regulated under any specific jurisdiction and takes no responsibility for your compliance with local laws.</li>
            <li>Residents of countries where cryptocurrency wagering is prohibited are not permitted to use the Service.</li>
          </ul>
        </Section>

        <Section title="3. The VeRdex Service">
          VeRdex is a prediction market built inside World App that allows World ID-verified humans to:
          <ul>
            <li>Place WLD token stakes on YES/NO prediction markets</li>
            <li>Challenge other verified humans to 1v1 Clash bets</li>
            <li>Set and back personal Goals staked in WLD</li>
            <li>Place multi-pick Combo bets across up to 5 markets</li>
          </ul>
          Markets resolve based on publicly verifiable real-world outcomes. VeRdex does not guarantee
          any specific outcome and is not responsible for oracle data accuracy beyond reasonable efforts
          to source reliable public data.
        </Section>

        <Section title="4. WLD Tokens and Payments">
          <ul>
            <li>All stakes and payouts are denominated in WLD tokens on World Chain.</li>
            <li>Stakes are final once confirmed on-chain. VeRdex cannot reverse confirmed transactions.</li>
            <li>Payouts are issued from the VeRdex treasury wallet to your World App wallet address after market resolution.</li>
            <li>VeRdex charges a platform fee of up to 5% on winning payouts. The exact fee is displayed before you place a bet.</li>
            <li>In the event a market is voided or cancelled, your full stake is refunded.</li>
            <li>VeRdex is not a financial institution, broker, or exchange. WLD staking is not an investment product.</li>
          </ul>
        </Section>

        <Section title="5. Market Resolution">
          <ul>
            <li>Markets resolve based on the resolution criteria stated in each market description.</li>
            <li>Resolution data is sourced from publicly accessible third-party sources (e.g., Binance, ESPN, CoinGecko, BLS.gov). VeRdex does not guarantee these sources are error-free.</li>
            <li>If a market cannot be resolved due to data unavailability or ambiguity, it will be voided and stakes refunded.</li>
            <li>Resolution decisions by VeRdex are final and binding.</li>
          </ul>
        </Section>

        <Section title="6. Prohibited Activities">
          You agree not to:
          <ul>
            <li>Attempt to manipulate market outcomes through coordinated action, wash trading, or sybil attacks</li>
            <li>Use bots, scripts, or automated tools to place bets</li>
            <li>Circumvent World ID verification by any means</li>
            <li>Use multiple accounts or share World ID credentials</li>
            <li>Attempt to exploit bugs or vulnerabilities in the Service</li>
            <li>Use the Service in violation of applicable law</li>
          </ul>
          Violations may result in immediate suspension, forfeiture of winnings, and/or reporting to relevant authorities.
        </Section>

        <Section title="7. Referral Program">
          Verified humans who refer new users earn 0.2 WLD when the referred user places their first confirmed bet.
          Referral rewards are paid from the VeRdex treasury. VeRdex reserves the right to modify or
          discontinue the referral program at any time with reasonable notice.
        </Section>

        <Section title="8. Intellectual Property">
          All content, branding, logos, and software comprising VeRdex are the property of VeRdex and its
          licensors. You are granted a limited, non-exclusive, non-transferable license to access and use the
          Service for personal, non-commercial purposes.
        </Section>

        <Section title="9. Disclaimers and Limitation of Liability">
          THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
          VERDEX EXPRESSLY DISCLAIMS ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          AND NON-INFRINGEMENT.
          <br /><br />
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, VERDEX&apos;S TOTAL LIABILITY TO YOU FOR ANY CLAIM
          ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED THE TOTAL AMOUNT OF WLD
          YOU STAKED IN THE 30 DAYS PRECEDING THE CLAIM.
          <br /><br />
          VERDEX IS NOT LIABLE FOR LOSSES ARISING FROM MARKET RESOLUTION DISPUTES, ORACLE DATA ERRORS,
          WORLD CHAIN NETWORK OUTAGES, WORLD APP UNAVAILABILITY, OR CRYPTOCURRENCY PRICE FLUCTUATIONS.
        </Section>

        <Section title="10. Indemnification">
          You agree to indemnify and hold harmless VeRdex, its operators, affiliates, and partners from any
          claims, damages, or expenses (including reasonable attorneys&apos; fees) arising from your use of the
          Service, your violation of these Terms, or your violation of any law or third-party rights.
        </Section>

        <Section title="11. Termination">
          VeRdex reserves the right to suspend or terminate your access to the Service at any time, with or
          without cause or notice. Upon termination, any pending winnings from already-resolved markets will
          be paid out; stakes in open markets will be refunded.
        </Section>

        <Section title="12. Changes to Terms">
          VeRdex may update these Terms from time to time. Changes will be posted at this URL with a new
          effective date. Continued use of the Service after changes are posted constitutes acceptance of the
          revised Terms.
        </Section>

        <Section title="13. Governing Law">
          These Terms are governed by applicable law. Any disputes shall be resolved through good-faith
          negotiation first. If unresolved, disputes shall be submitted to binding arbitration under
          internationally recognized arbitration rules.
        </Section>

        <Section title="14. Contact">
          Questions about these Terms? Contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#6366f1" }}>{CONTACT_EMAIL}</a>
        </Section>

        <div style={{ borderTop: "1px solid rgba(99,102,241,0.15)", paddingTop: 24, marginTop: 32, fontSize: "0.8rem", color: "rgba(232,234,246,0.4)" }}>
          <Link href="/privacy" style={{ color: "#6366f1", marginRight: 16 }}>Privacy Policy</Link>
          <Link href="/" style={{ color: "#6366f1" }}>Back to VeRdex</Link>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{
        fontSize: "1rem",
        fontWeight: 700,
        color: "#6366f1",
        margin: "0 0 10px",
        letterSpacing: "0.02em",
      }}>
        {title}
      </h2>
      <div style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "rgba(232,234,246,0.85)" }}>
        {children}
      </div>
    </section>
  );
}
