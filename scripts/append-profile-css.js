const fs = require('fs');
const path = require('path').join(require('os').tmpdir(), 'pulse-app-clone', 'app', 'globals.css');

const css = `

/* ══════════════════════════════════════════════════════════════════════════
   PROFILE SHEET & TRIGGER
   Per World Dev docs: show username prominently, not wallet address.
   Touch targets min 44px. Safe-area aware bottom padding.
═══════════════════════════════════════════════════════════════════════════ */

/* Header top row */
.pulse-header-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}

/* Profile trigger */
.pulse-profile-trigger {
  display: flex; align-items: center; gap: 8px;
  min-height: 44px; padding: 6px 10px 6px 6px;
  border: 1px solid var(--pulse-border-bright); border-radius: 999px;
  background: var(--pulse-surface-2); cursor: pointer;
  transition: background 0.15s; max-width: 160px;
}
.pulse-profile-trigger:active { background: var(--pulse-surface); }

.pulse-profile-trigger-avatar {
  position: relative; width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: grid; place-items: center;
  font-size: 0.75rem; font-weight: 800; color: white; flex-shrink: 0; overflow: hidden;
}
.pulse-profile-trigger-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pulse-profile-trigger-dot {
  position: absolute; bottom: 0; right: 0;
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--pulse-yes); border: 1.5px solid var(--pulse-surface-2);
}
.pulse-profile-trigger-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; overflow: hidden; }
.pulse-profile-trigger-name {
  font-size: 0.76rem; font-weight: 800; color: var(--pulse-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pulse-profile-trigger-streak { font-size: 0.65rem; font-weight: 700; color: var(--pulse-yes); }

/* Profile sheet */
.pulse-profile-sheet {
  position: relative; width: min(100%, 480px); max-height: 92dvh;
  overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: auto;
  border-radius: 28px 28px 0 0;
  background: linear-gradient(180deg, #13102e, #0d0b22);
  border: 1px solid var(--pulse-border-bright); border-bottom: 0;
  box-shadow: 0 -24px 64px rgba(0,0,0,0.6);
  padding: 20px 20px 0; display: flex; flex-direction: column; gap: 18px;
}

.pulse-profile-close {
  position: absolute; top: 20px; right: 18px;
  width: 32px; height: 32px; min-height: 32px; min-width: 32px;
  display: grid; place-items: center;
  border: 1px solid var(--pulse-border); border-radius: 50%;
  background: var(--pulse-surface-2); color: var(--pulse-muted); cursor: pointer;
}

/* Identity */
.pulse-profile-identity { display: flex; align-items: flex-start; gap: 16px; padding-top: 4px; }

.pulse-profile-avatar {
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%);
  display: grid; place-items: center; font-weight: 900; color: white; flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(99,102,241,0.4);
}
.pulse-profile-avatar-img { border-radius: 50%; object-fit: cover; box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
.pulse-profile-identity-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }

/* Username — prominent per docs */
.pulse-profile-username {
  margin: 0; font-size: 1.4rem; font-weight: 900; color: var(--pulse-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* World ID badge */
.pulse-profile-verified {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px 3px 6px; border-radius: 999px;
  background: rgba(0,232,135,0.12); border: 1px solid rgba(0,232,135,0.3);
  font-size: 0.73rem; font-weight: 700; color: var(--pulse-yes); width: fit-content;
}

/* Wallet — secondary, truncated */
.pulse-profile-wallet { font-size: 0.72rem; color: var(--pulse-muted); font-family: monospace; letter-spacing: 0.03em; }

/* Rank badge */
.pulse-profile-rank {
  display: flex; align-items: center; gap: 4px; padding: 6px 10px;
  border: 1px solid rgba(251,191,36,0.4); border-radius: 10px;
  background: rgba(251,191,36,0.1); font-size: 0.8rem; font-weight: 800; color: #fbbf24; flex-shrink: 0;
}

/* Stats grid */
.pulse-profile-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
.pulse-profile-stat {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 12px 8px; border: 1px solid var(--pulse-border); border-radius: 14px; background: var(--pulse-surface);
}
.pulse-profile-stat strong { font-size: 1rem; font-weight: 900; color: var(--pulse-accent); }
.pulse-profile-stat span { font-size: 0.62rem; font-weight: 700; color: var(--pulse-muted); text-align: center; }

/* Streak banner */
.pulse-profile-streak-banner {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  border: 1px solid rgba(0,232,135,0.3); border-radius: 12px;
  background: rgba(0,232,135,0.08); font-size: 0.82rem; font-weight: 700; color: var(--pulse-yes);
}

/* Sections */
.pulse-profile-section { display: flex; flex-direction: column; gap: 8px; }
.pulse-profile-section-header {
  display: flex; align-items: center; gap: 6px;
  font-size: 0.72rem; font-weight: 800; color: var(--pulse-muted);
  text-transform: uppercase; letter-spacing: 0.08em; padding: 0 2px;
}

/* Follows */
.pulse-profile-follows { display: flex; flex-direction: column; gap: 6px; }
.pulse-profile-follow-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border: 1px solid var(--pulse-border); border-radius: 12px; background: var(--pulse-surface);
}
.pulse-profile-follow-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: grid; place-items: center; font-size: 0.72rem; font-weight: 800; color: white; flex-shrink: 0;
}
.pulse-profile-follow-info { flex: 1; min-width: 0; }
.pulse-profile-follow-info strong { display: block; font-size: 0.86rem; font-weight: 800; color: var(--pulse-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pulse-profile-follow-info span { font-size: 0.72rem; color: var(--pulse-muted); }
.pulse-profile-unfollow {
  min-height: 32px; min-width: 32px; width: 32px; height: 32px;
  display: grid; place-items: center; border: 1px solid var(--pulse-border); border-radius: 50%;
  background: transparent; color: var(--pulse-muted); font-size: 1rem; cursor: pointer;
}

/* Recent bets */
.pulse-profile-bets { display: flex; flex-direction: column; gap: 4px; }
.pulse-profile-bet-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border: 1px solid var(--pulse-border); border-radius: 12px; background: var(--pulse-surface);
}
.pulse-profile-bet-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.pulse-profile-bet-dot.won   { background: var(--pulse-yes); }
.pulse-profile-bet-dot.lost  { background: var(--pulse-no); }
.pulse-profile-bet-dot.pending { background: var(--pulse-muted); }
.pulse-profile-bet-info { flex: 1; min-width: 0; }
.pulse-profile-bet-title { display: block; font-size: 0.82rem; font-weight: 700; color: var(--pulse-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pulse-profile-bet-meta { font-size: 0.72rem; color: var(--pulse-muted); }
.pulse-profile-bet-won { color: var(--pulse-yes); font-weight: 700; }
.pulse-profile-bet-badge { flex-shrink: 0; font-size: 0.7rem; font-weight: 800; padding: 3px 8px; border-radius: 999px; }
.pulse-profile-bet-badge.won  { color: var(--pulse-yes);  background: rgba(0,232,135,0.12); }
.pulse-profile-bet-badge.lost { color: var(--pulse-no);   background: rgba(255,77,109,0.12); }
.pulse-profile-bet-badge.open { color: var(--pulse-muted); background: var(--pulse-surface-2); }

/* Settings */
.pulse-profile-setting-row {
  display: flex; align-items: center; justify-content: space-between;
  min-height: 52px; padding: 10px 14px;
  border: 1px solid var(--pulse-border); border-radius: 14px; background: var(--pulse-surface);
  cursor: pointer; width: 100%; text-align: left; transition: background 0.15s;
}
.pulse-profile-setting-row:active { background: var(--pulse-surface-2); }
.pulse-profile-setting-left { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; font-weight: 700; color: var(--pulse-text); }
.pulse-profile-setting-value { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--pulse-muted); }
.pulse-profile-theme-chip { padding: 4px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 800; }
.pulse-profile-theme-chip.night { background: rgba(99,102,241,0.18); color: #a5b4fc; }
.pulse-profile-theme-chip.day   { background: rgba(251,191,36,0.15); color: #f59e0b; }

/* Sign out */
.pulse-profile-signout {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 52px; width: 100%;
  border: 1px solid rgba(255,77,109,0.3); border-radius: 16px;
  background: rgba(255,77,109,0.08); color: var(--pulse-no);
  font-size: 0.9rem; font-weight: 800; cursor: pointer; margin-bottom: 8px;
  transition: background 0.15s;
}
.pulse-profile-signout:active { background: rgba(255,77,109,0.16); }
`;

fs.appendFileSync(path, css, 'utf8');
console.log('CSS appended, total lines:', fs.readFileSync(path,'utf8').split('\n').length);
