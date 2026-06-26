"use client";

import { BookOpen, FileText, Lock, X } from "lucide-react";

// ── Shared sheet wrapper ──────────────────────────────────────────────────────

function Sheet({ open, onClose, title, icon, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`help-sheet-overlay${open ? " open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`help-sheet${open ? " open" : ""}`} role="dialog" aria-modal="true">
        <div className="help-sheet-header">
          <div className="help-sheet-title">
            {icon}
            <span>{title}</span>
          </div>
          <button className="help-sheet-close" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="help-sheet-body">
          {children}
          <div style={{ height: "var(--safe-bottom, 20px)" }} />
        </div>
      </div>
    </div>
  );
}

// ── Section helpers ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="help-section">
      <h3 className="help-section-title">{title}</h3>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="help-p">{children}</p>;
}

function Bullet({ items }: { items: string[] }) {
  return (
    <ul className="help-list">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

// ── User Guide ────────────────────────────────────────────────────────────────

export function UserGuideSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="User Guide" icon={<BookOpen size={16} />}>
      <div className="help-hero">
        <span className="help-hero-icon">⚡</span>
        <strong>Welcome to VeRdex</strong>
        <span>The prediction market for verified humans.</span>
      </div>

      <Section title="What is VeRdex?">
        <P>VeRdex is a prediction market where every participant is a verified World ID human — no bots, no fake accounts. You forecast real-world outcomes, stake WLD, and earn from being right.</P>
      </Section>

      <Section title="How to place a bet">
        <Bullet items={[
          "Browse the Markets tab and find a question you have an opinion on.",
          "Tap YES or NO — the big number on each button is your odds multiplier.",
          "Choose your stake amount (in WLD) on the bet sheet.",
          "Confirm the payment inside World App. Done — your prediction is live.",
        ]} />
      </Section>

      <Section title="Understanding odds">
        <P>Odds update in real-time based on how many humans have bet on each side. A 2.1× YES means: if YES wins you receive 2.1× your stake back. The more people agree with you, the lower the payout — being contrarian pays more.</P>
        <P>The <strong>🎯 UNDERDOG</strong> badge appears when 68%+ of the crowd is on the other side. High risk, high reward.</P>
      </Section>

      <Section title="Signal bar">
        <P>The green/red bar on each card shows crowd sentiment — how much WLD has been staked on YES vs NO. It updates live. Use it to gauge market consensus before betting.</P>
      </Section>

      <Section title="Combo bets">
        <P>Tap <strong>+YES</strong> or <strong>+NO</strong> on multiple markets to build a combo. All legs must win for you to get paid, but the odds multiply together — a 3-leg combo at 1.8× each becomes a 5.8× payout.</P>
        <P>You need at least 2 picks to place a combo. The combo tray at the bottom of the screen shows your current picks and combined multiplier.</P>
      </Section>

      <Section title="1v1 Clash">
        <P>Tap the <strong>⚔️</strong> button on any market to challenge another human to a head-to-head duel. You pick your side, set the stake, and share the link. Your opponent accepts and takes the other side. Winner takes the pot.</P>
        <Bullet items={[
          "Both sides must stake equal amounts.",
          "The market resolves normally — whoever picked the right side wins.",
          "Payouts go to the winner's World App wallet automatically.",
        ]} />
      </Section>

      <Section title="How payouts work">
        <P>When a market resolves, WLD goes directly to winners' wallets on World Chain. You can claim your winnings anytime from the My Bets tab — the <strong>Claim Winnings</strong> button appears as soon as a market you won is settled.</P>
        <P>Provably fair markets (marked ⚖️) resolve automatically from public data sources — no human moderator can influence the outcome.</P>
      </Section>

      <Section title="Leagues tab">
        <P>The global leaderboard ranks all VeRdex players by total WLD won. Top 3 players earn special badges. Your rank is shown in your profile.</P>
      </Section>

      <Section title="Tips for new forecasters">
        <Bullet items={[
          "Start with small stakes (0.5 WLD) while you learn the markets.",
          "Watch the signal bar — sudden shifts often mean new information.",
          "Check the crowd % before betting — sometimes the underdog is underpriced.",
          "Use combos only when you're very confident in multiple outcomes.",
          "Your win rate is shown in the header — track your improvement over time.",
        ]} />
      </Section>
    </Sheet>
  );
}

// ── Terms of Use ──────────────────────────────────────────────────────────────

export function TermsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Terms of Use" icon={<FileText size={16} />}>
      <P><strong>Last updated: June 2026</strong></P>

      <Section title="1. Acceptance">
        <P>By accessing or using VeRdex ("the App"), you agree to be bound by these Terms of Use. If you do not agree, do not use the App.</P>
      </Section>

      <Section title="2. Eligibility">
        <P>You must hold a valid World ID verification to use VeRdex. By signing in, you confirm that:</P>
        <Bullet items={[
          "You are a real human (verified by World ID).",
          "You are at least 18 years of age.",
          "Prediction markets are legal in your jurisdiction.",
          "You are not accessing the App from a restricted region.",
        ]} />
      </Section>

      <Section title="3. Nature of the service">
        <P>VeRdex is a peer-to-peer prediction market. You stake WLD tokens against other verified humans on the outcome of real-world events. This is not investment advice, and outcomes are not guaranteed. All stakes are subject to loss.</P>
        <P>Markets marked ⚖️ ("Provably fair") resolve automatically from verified public data. Other markets are resolved by VeRdex moderation based on publicly available information.</P>
      </Section>

      <Section title="4. WLD tokens">
        <P>All transactions use WLD on World Chain. WLD is a cryptocurrency and its value may fluctuate. VeRdex does not guarantee any specific payout value in fiat currency. You are solely responsible for the tax implications of any gains or losses.</P>
      </Section>

      <Section title="5. Prohibited conduct">
        <Bullet items={[
          "Attempting to manipulate market outcomes.",
          "Using automated tools, bots, or scripts to interact with the App.",
          "Creating multiple World ID accounts (one human = one account).",
          "Exploiting bugs or vulnerabilities — report them to us instead.",
          "Using the App for money laundering or other illegal purposes.",
        ]} />
      </Section>

      <Section title="6. Market resolution">
        <P>VeRdex reserves the right to void a market if reliable data for resolution is unavailable, if the market question was ambiguous, or if manipulation is detected. In the event of a void, all stakes are refunded.</P>
      </Section>

      <Section title="7. Intellectual property">
        <P>All content, trademarks, and software in the App are owned by VeRdex. You may not copy, modify, or distribute any part of the App without written permission.</P>
      </Section>

      <Section title="8. Limitation of liability">
        <P>VeRdex is provided "as is" without warranties of any kind. To the maximum extent permitted by law, VeRdex is not liable for any loss of WLD, missed payouts due to network congestion, or any indirect damages arising from use of the App.</P>
      </Section>

      <Section title="9. Changes">
        <P>We may update these Terms at any time. Continued use of the App after changes constitutes acceptance of the new Terms. We will notify you of material changes via the App.</P>
      </Section>

      <Section title="10. Contact">
        <P>For questions about these Terms, contact us through the World Developer Portal or the App's feedback channel.</P>
      </Section>
    </Sheet>
  );
}

// ── Privacy Policy ────────────────────────────────────────────────────────────

export function PrivacySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Privacy Policy" icon={<Lock size={16} />}>
      <P><strong>Last updated: June 2026</strong></P>

      <Section title="1. Overview">
        <P>VeRdex is built on World ID — a privacy-first identity protocol. We collect only what is necessary to operate the prediction market. We do not sell your data.</P>
      </Section>

      <Section title="2. World ID & zero-knowledge proofs">
        <P>Signing in with World ID uses a zero-knowledge proof. This means:</P>
        <Bullet items={[
          "We verify you are a unique human without learning your identity.",
          "Your biometric data (iris scan) never leaves the World App device.",
          "We receive only a nullifier hash — a unique anonymous identifier — not your name, email, or any personal details.",
          "You remain pseudonymous throughout the App.",
        ]} />
      </Section>

      <Section title="3. Data we collect">
        <Bullet items={[
          "World ID nullifier hash (anonymous unique identifier).",
          "World App username (only if you choose to display it).",
          "Wallet address on World Chain (public blockchain data).",
          "Bet history, combo history, and clash history (stored to power your stats and payouts).",
          "App usage events (tab views, bet placements) for product improvement — no cross-app tracking.",
        ]} />
      </Section>

      <Section title="4. Data we do NOT collect">
        <Bullet items={[
          "Your real name, email address, or phone number.",
          "Your iris scan or any biometric data.",
          "Your IP address is not permanently stored or used for tracking.",
          "Device identifiers or advertising IDs.",
        ]} />
      </Section>

      <Section title="5. How we use your data">
        <Bullet items={[
          "To process bets, combos, and clashes and calculate payouts.",
          "To display your stats, rank, and predictions history.",
          "To prevent manipulation and enforce the one-human one-account rule.",
          "To improve the App based on aggregated, anonymized usage patterns.",
        ]} />
      </Section>

      <Section title="6. On-chain data">
        <P>All WLD transactions are recorded on World Chain, a public blockchain. Once a transaction is confirmed, it cannot be deleted. Your wallet address and transaction amounts are publicly visible on-chain.</P>
      </Section>

      <Section title="7. Data storage">
        <P>Your bet history and profile data are stored in our secure database (Supabase). Data is encrypted at rest. We retain your data while your account is active and for up to 12 months after account deletion to comply with legal obligations.</P>
      </Section>

      <Section title="8. Third parties">
        <P>We use the following services:</P>
        <Bullet items={[
          "World Developer Portal — for World ID verification and wallet auth.",
          "Vercel — for hosting and analytics (anonymized, no cross-site tracking).",
          "Supabase — for database storage.",
        ]} />
        <P>We do not share your data with advertisers or data brokers.</P>
      </Section>

      <Section title="9. Your rights">
        <Bullet items={[
          "Request a copy of your data at any time.",
          "Request deletion of your account and associated data.",
          "Opt out of anonymized analytics (contact us).",
        ]} />
        <P>To exercise these rights, use the feedback channel inside the App or contact us through the World Developer Portal.</P>
      </Section>

      <Section title="10. Changes">
        <P>We will notify you of material changes to this policy via the App. Continued use after changes constitutes acceptance.</P>
      </Section>
    </Sheet>
  );
}
