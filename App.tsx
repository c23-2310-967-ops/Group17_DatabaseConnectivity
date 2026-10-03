import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getLocalProgress,
  getPlayerId,
  loadLeaderboard,
  loadProgress,
  saveSession,
  updateLocalAlias,
  type LeaderboardEntry,
  type PlayerProgress,
} from './gameData'

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen   = 'menu' | 'brief' | 'leaderboard' | 'game' | 'verdict' | 'gameover' | 'complete'
type MsgType  = 'sms' | 'email' | 'whatsapp' | 'notification'
type Verdict  = 'scam' | 'legit'

interface Message {
  id: string
  type: MsgType
  sender: string
  senderHandle?: string
  avatar: string
  subject?: string
  body: string
  time: string
  isScam: boolean
  redFlags: string[]
  explanation: string
}

// ─── Case data ────────────────────────────────────────────────────────────────

const MESSAGES: Message[] = [
  {
    id: 'm1', type: 'sms', sender: 'NETFLIX', avatar: 'N',
    body: 'Your account has been suspended due to a payment issue. Verify your details within 24hrs to avoid permanent closure: http://netflix-secure-update.su/verify',
    time: '10:42 AM', isScam: true,
    redFlags: ['Suspicious domain (.su)', 'Urgency ("24hrs")', 'Threat of permanent closure', 'Generic sender name'],
    explanation: 'Netflix never texts links asking you to verify payment via an external URL. The domain "netflix-secure-update.su" is not netflix.com.',
  },
  {
    id: 'm2', type: 'email', sender: 'Amazon Orders', senderHandle: 'noreply@amazon.com', avatar: 'A',
    subject: 'Your order #112-8847291-4923012 has shipped',
    body: "Hello Marcus,\n\nYour order has shipped and is on its way!\n\nItems: Sony WH-1000XM5 Headphones × 1\nEstimated delivery: Thursday, Sep 14\n\nTrack your package at amazon.com/orders\n\nThank you for shopping with Amazon.",
    time: 'Sep 12, 9:14 AM', isScam: false,
    redFlags: [],
    explanation: 'Legitimate Amazon shipping confirmation. Uses your real name, references a specific order ID, and links only to amazon.com.',
  },
  {
    id: 'm3', type: 'whatsapp', sender: 'Mom 🌸', avatar: '👩',
    body: "Hey honey, did you get my birthday card? Also, are you coming for Thanksgiving this year? Your aunt is already asking 😄 Let me know!",
    time: 'Yesterday, 6:31 PM', isScam: false,
    redFlags: [],
    explanation: 'Normal personal message. No links, no urgency, no requests for money or information.',
  },
  {
    id: 'm4', type: 'notification', sender: 'IRS Alert', avatar: '🏛',
    body: 'URGENT: IRS Notice #7749-B. You owe $3,218 in unpaid taxes. Failure to pay within 48 hours will result in immediate arrest. Call now: 1-888-340-2291',
    time: '2:17 PM', isScam: true,
    redFlags: ['Government agencies don\'t text threats', 'Threat of "arrest"', '48-hour deadline', 'Phone number (not irs.gov)', 'Dollar amount pressure'],
    explanation: 'The IRS contacts taxpayers by mail first — never by text or phone threats. Threatening arrest via SMS is a classic government impersonation scam.',
  },
  {
    id: 'm5', type: 'email', sender: 'Chase Bank', senderHandle: 'alerts@notifications.chase.com', avatar: 'C',
    subject: 'Your September statement is ready',
    body: "Hi Alex,\n\nYour September credit card statement is now available.\n\nNew balance: $1,847.32\nMinimum due: $35.00\nDue date: October 14, 2025\n\nSign in to review your statement at chase.com\n\nChase Customer Service",
    time: 'Sep 13, 8:00 AM', isScam: false,
    redFlags: [],
    explanation: 'Legitimate bank statement notification. Uses your name, shows real figures, and directs only to chase.com — not a third-party link.',
  },
  {
    id: 'm6', type: 'sms', sender: '+1 (664) 203-8812', avatar: '?',
    body: "CONGRATULATIONS! You've been selected for a $750 Walmart gift card! To claim your FREE reward, tap: walmart-gift-promo.xyz/claim?id=8812 Expires in 2 hours!",
    time: '11:58 AM', isScam: true,
    redFlags: ['Unknown number', 'Unsolicited prize', 'Fake domain (not walmart.com)', '2-hour expiry pressure', 'ALL CAPS excitement'],
    explanation: 'Classic prize scam. Real Walmart promotions come from walmart.com, not random third-party domains with expiry pressure.',
  },
  {
    id: 'm7', type: 'whatsapp', sender: 'Dr. Patel — Smile Dental', avatar: '🦷',
    body: "Hi! This is a reminder that you have an appointment tomorrow, Thursday Sep 14 at 2:30 PM with Dr. Patel. Please arrive 10 min early. Reply STOP to opt out of reminders.",
    time: 'Sep 13, 3:00 PM', isScam: false,
    redFlags: [],
    explanation: 'Standard appointment reminder from a dental practice. No links, no personal data requests, and includes an opt-out option.',
  },
  {
    id: 'm8', type: 'email', sender: 'PayPal Security', senderHandle: 'security@paypal-account-verify.net', avatar: 'P',
    subject: 'Action Required: Verify your account immediately',
    body: "Dear PayPal Customer,\n\nWe have detected unusual activity on your account. Your account access has been temporarily limited.\n\nTo restore full access, please verify your identity by clicking the link below within 12 hours:\n\n[Verify My Account Now]\n\nFailure to do so will result in permanent account suspension.\n\nPayPal Security Team",
    time: 'Sep 12, 11:33 PM', isScam: true,
    redFlags: ['Fake domain (paypal-account-verify.net)', 'Greeting: "Dear PayPal Customer"', '12-hour suspension threat', 'Sent at 11 PM', 'No account details'],
    explanation: 'PayPal emails come from @paypal.com only. The domain "paypal-account-verify.net" is fraudulent. Real PayPal emails use your name and account info.',
  },
  {
    id: 'm9', type: 'sms', sender: 'Uber Receipts', avatar: 'U',
    body: "Thanks for riding with Uber! Your ride from 847 Elm St to O'Hare Airport on Sep 12 cost $34.20. Need help? Visit help.uber.com",
    time: 'Sep 12, 7:48 AM', isScam: false,
    redFlags: [],
    explanation: 'Legitimate Uber receipt. References a specific real trip with an exact address and directs to help.uber.com only.',
  },
  {
    id: 'm10', type: 'email', sender: 'USPS Delivery', senderHandle: 'delivery@usps-pkg-notify.com', avatar: '📦',
    subject: 'Package delivery failed — action needed',
    body: "Dear Customer,\n\nWe attempted to deliver your package today but were unable to complete delivery. Your package will be held for 3 days.\n\nTo reschedule delivery or update your address, click here:\nusps-pkg-notify.com/reschedule?ref=US9400118X\n\nIf you do not take action, your package will be returned to sender.\n\nUSPS Delivery Team",
    time: 'Sep 13, 1:45 PM', isScam: true,
    redFlags: ['Fake domain (usps-pkg-notify.com)', 'Vague "Dear Customer"', 'No tracking number', '3-day deadline pressure', 'Return-to-sender threat'],
    explanation: 'Real USPS uses usps.com only. This domain is fraudulent. Legitimate failed delivery notices include a real tracking number.',
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_LIVES   = 3
const TIME_PER_MSG  = 25 // seconds

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Corner({ color = 'rgba(212,160,23,0.4)' }: { color?: string }) {
  const s = 10
  return (
    <>
      {[['top:0,left:0', 'borderTop,borderLeft'], ['top:0,right:0', 'borderTop,borderRight'],
        ['bottom:0,left:0', 'borderBottom,borderLeft'], ['bottom:0,right:0', 'borderBottom,borderRight']].map(([pos, borders]) => {
        const [v, h] = pos.split(',')
        const [b1, b2] = borders.split(',')
        return (
          <div key={pos} style={{
            position: 'absolute',
            [v.split(':')[0]]: 0, [h.split(':')[0]]: 0,
            width: s, height: s,
            [b1]: `1px solid ${color}`,
            [b2]: `1px solid ${color}`,
          }} />
        )
      })}
    </>
  )
}

function LivesDisplay({ lives }: { lives: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: TOTAL_LIVES }).map((_, i) => (
        <div key={i} style={{
          width: 12, height: 12, borderRadius: '50%',
          background: i < lives ? '#e03030' : 'rgba(255,255,255,0.08)',
          boxShadow: i < lives ? '0 0 6px rgba(224,48,48,0.6)' : 'none',
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  )
}

// Message renderer — different UI per type
function MessageCard({ msg }: { msg: Message }) {
  const bodies = msg.body.split('\n')

  if (msg.type === 'sms' || msg.type === 'notification') {
    return (
      <div style={{ maxWidth: 340, margin: '0 auto' }}>
        {/* Phone frame */}
        <div style={{ background: '#1a1c22', borderRadius: 24, padding: '16px 12px', border: '2px solid #2a2d38', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          {/* Status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="font-mono-hud" style={{ fontSize: 10, color: '#6b7080' }}>9:41</span>
            <span className="font-mono-hud" style={{ fontSize: 10, color: '#6b7080' }}>▮▮▮▮ WiFi ◾</span>
          </div>
          {/* Message thread header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#2a2d3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              {msg.avatar}
            </div>
            <div>
              <p className="font-raj" style={{ fontWeight: 600, fontSize: 14, color: '#d8dce8' }}>{msg.sender}</p>
              {msg.senderHandle && <p className="font-mono-hud" style={{ fontSize: 9, color: '#565b6e' }}>{msg.senderHandle}</p>}
            </div>
          </div>
          {/* Bubble */}
          <div style={{ padding: '14px 14px 6px' }}>
            <div style={{ background: '#2a2e3d', borderRadius: '4px 14px 14px 14px', padding: '10px 14px', marginBottom: 4 }}>
              <p className="font-courier" style={{ fontSize: 13, color: '#c8ccd8', lineHeight: 1.6 }}>{msg.body}</p>
            </div>
            <p className="font-mono-hud" style={{ fontSize: 9, color: '#3a4050', textAlign: 'right' }}>{msg.time}</p>
          </div>
        </div>
      </div>
    )
  }

  if (msg.type === 'email') {
    return (
      <div style={{ background: '#13151c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden', maxWidth: 520, margin: '0 auto', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
        {/* Email header */}
        <div style={{ background: '#0f1117', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(212,160,23,0.15)', border: '1px solid rgba(212,160,23,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              {msg.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p className="font-raj" style={{ fontWeight: 600, fontSize: 14, color: '#d8dce8' }}>{msg.sender}</p>
                <p className="font-mono-hud" style={{ fontSize: 10, color: '#3a4050' }}>{msg.time}</p>
              </div>
              <p className="font-mono-hud" style={{ fontSize: 10, color: '#565b6e' }}>{msg.senderHandle}</p>
            </div>
          </div>
          {msg.subject && (
            <p className="font-raj" style={{ fontWeight: 700, fontSize: 15, color: '#c4c8d4', letterSpacing: '0.01em' }}>{msg.subject}</p>
          )}
        </div>
        {/* Email body */}
        <div style={{ padding: '18px 20px' }}>
          {bodies.map((line, i) => (
            <p key={i} className="font-courier" style={{ fontSize: 13, color: line === '' ? undefined : '#a8acbc', lineHeight: 1.7, marginBottom: line === '' ? 8 : 0 }}>
              {line || ' '}
            </p>
          ))}
        </div>
      </div>
    )
  }

  // WhatsApp style
  return (
    <div style={{ maxWidth: 340, margin: '0 auto' }}>
      <div style={{ background: '#111418', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ background: '#1a2020', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2d3a2d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{msg.avatar}</div>
          <div>
            <p className="font-raj" style={{ fontWeight: 600, fontSize: 14, color: '#d8dce8' }}>{msg.sender}</p>
            <p className="font-mono-hud" style={{ fontSize: 9, color: '#4a6a4a' }}>online</p>
          </div>
        </div>
        {/* Chat bg */}
        <div style={{ background: '#0d1210', padding: '16px 14px', minHeight: 100 }}>
          <div style={{ background: '#1e2a1e', borderRadius: '4px 14px 14px 14px', padding: '10px 14px', display: 'inline-block', maxWidth: '90%' }}>
            <p className="font-courier" style={{ fontSize: 13, color: '#c8d0c0', lineHeight: 1.6 }}>{msg.body}</p>
            <p className="font-mono-hud" style={{ fontSize: 9, color: '#4a6a4a', textAlign: 'right', marginTop: 4 }}>{msg.time} ✓✓</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Menu ────────────────────────────────────────────────────────────────

function MainMenu({ onPlay, onHowTo, onLeaderboard, progress, onAliasChange, syncState }: {
  onPlay: () => void
  onHowTo: () => void
  onLeaderboard: () => void
  progress: PlayerProgress
  onAliasChange: (alias: string) => void
  syncState: 'online' | 'offline' | 'saving'
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0b0c10' }}>
      {/* Paper texture overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(255,255,255,0.012) 28px, rgba(255,255,255,0.012) 29px)', pointerEvents: 'none' }} />

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(6,7,11,0.8) 100%)', pointerEvents: 'none' }} />

      {/* Background case files scattered */}
      {[
        { r: '-8deg', x: '5%', y: '8%', w: 180, opacity: 0.04 },
        { r: '6deg', x: '78%', y: '4%', w: 200, opacity: 0.05 },
        { r: '-3deg', x: '82%', y: '60%', w: 160, opacity: 0.04 },
        { r: '12deg', x: '2%', y: '65%', w: 140, opacity: 0.04 },
      ].map((f, i) => (
        <div key={i} style={{ position: 'absolute', left: f.x, top: f.y, width: f.w, transform: `rotate(${f.r})`, opacity: f.opacity, pointerEvents: 'none' }}>
          <div style={{ background: '#c8a060', height: 8, marginBottom: 3 }} />
          {[80, 60, 70, 40, 55].map((w, j) => (
            <div key={j} style={{ background: '#a08040', height: 2, width: `${w}%`, marginBottom: 5 }} />
          ))}
        </div>
      ))}

      {/* Center layout */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>

          {/* Badge / emblem */}
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 90, height: 90 }}>
              {/* Outer ring */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(212,160,23,0.35)', boxShadow: '0 0 24px rgba(212,160,23,0.1)' }} />
              {/* Inner ring */}
              <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '1px solid rgba(212,160,23,0.2)' }} />
              {/* Icon */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>🔍</div>
              {/* Star points */}
              {[0, 60, 120, 180, 240, 300].map(deg => (
                <div key={deg} style={{ position: 'absolute', top: '50%', left: '50%', width: 6, height: 6, marginTop: -3, marginLeft: -3, transform: `rotate(${deg}deg) translateY(-44px) rotate(-${deg}deg)` }}>
                  <div style={{ width: 6, height: 6, background: 'rgba(212,160,23,0.4)', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Title */}
          <p className="font-mono-hud flicker" style={{ fontSize: 11, letterSpacing: '0.4em', color: 'rgba(212,160,23,0.45)', marginBottom: 10 }}>
            DIGITAL CRIMES UNIT — CASE FILE
          </p>
          <h1 className="font-typewriter" style={{ fontSize: 52, color: '#d4a017', lineHeight: 1, marginBottom: 6, textShadow: '0 0 40px rgba(212,160,23,0.2)' }}>
            SCAM<br />SENSE
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 10 }}>
            <div style={{ height: 1, width: 60, background: 'rgba(212,160,23,0.25)' }} />
            <span className="font-mono-hud" style={{ fontSize: 9, color: 'rgba(212,160,23,0.35)', letterSpacing: '0.2em' }}>IDENTIFY · EXPOSE · PROTECT</span>
            <div style={{ height: 1, width: 60, background: 'rgba(212,160,23,0.25)' }} />
          </div>
          <p className="font-raj" style={{ fontSize: 14, color: '#565b6e', marginBottom: 48, lineHeight: 1.6 }}>
            Read each message carefully.<br/>Determine: is it a scam — or the real thing?
          </p>

          {/* Menu buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            {[
              { id: 'play', label: 'OPEN CASE FILE', sub: 'Begin investigation', action: onPlay, primary: true },
              { id: 'leaderboard', label: 'MOST WANTED', sub: 'Global leaderboard', action: onLeaderboard, primary: false },
              { id: 'how', label: 'BRIEFING', sub: 'How to play', action: onHowTo, primary: false },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={btn.action}
                onMouseEnter={() => setHovered(btn.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: 'relative', width: 260, padding: '14px 24px', cursor: 'pointer',
                  background: btn.primary
                    ? hovered === btn.id ? 'rgba(212,160,23,0.14)' : 'rgba(212,160,23,0.08)'
                    : hovered === btn.id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${btn.primary ? 'rgba(212,160,23,' + (hovered === btn.id ? '0.6)' : '0.3)') : 'rgba(255,255,255,' + (hovered === btn.id ? '0.12)' : '0.06)')}`,
                  transition: 'all 0.18s',
                }}
              >
                <Corner color={btn.primary ? 'rgba(212,160,23,0.5)' : 'rgba(255,255,255,0.1)'} />
                <p className="font-typewriter" style={{ fontSize: 15, color: btn.primary ? '#d4a017' : '#8a8fa0', letterSpacing: '0.08em', marginBottom: 2 }}>{btn.label}</p>
                <p className="font-mono-hud" style={{ fontSize: 9, color: btn.primary ? 'rgba(212,160,23,0.45)' : '#3a4050', letterSpacing: '0.15em' }}>{btn.sub}</p>
              </button>
            ))}
          </div>

          {/* Bottom stamp */}
          <p className="font-mono-hud" style={{ fontSize: 9, color: '#2a2d38', marginTop: 48, letterSpacing: '0.2em' }}>
            DCU — DIGITAL CRIMES UNIT © 2025 · ALL CASES CLASSIFIED
          </p>
        </div>
      </div>

      <aside className="career-card" style={{ position: 'absolute', top: 24, right: 28, width: 220, padding: '14px 16px', background: 'rgba(12,14,19,0.9)', border: '1px solid rgba(212,160,23,0.18)' }}>
        <Corner size={7} color="rgba(212,160,23,0.35)" />
        <p className="font-mono-hud" style={{ fontSize: 8, color: '#565b6e', letterSpacing: '0.18em', marginBottom: 8 }}>DETECTIVE RECORD</p>
        <input
          aria-label="Detective callsign"
          value={progress.alias}
          maxLength={20}
          onChange={event => onAliasChange(event.target.value)}
          className="font-typewriter"
          style={{ width: '100%', color: '#d4a017', fontSize: 14, background: 'rgba(212,160,23,0.04)', border: 'none', borderBottom: '1px solid rgba(212,160,23,0.25)', outline: 'none', padding: '4px 2px', marginBottom: 10 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span className="font-mono-hud" style={{ fontSize: 9, color: '#565b6e' }}>{progress.gamesPlayed} FILES</span>
          <span className="font-mono-hud" style={{ fontSize: 9, color: '#d4a017' }}>BEST {progress.bestScore.toLocaleString()}</span>
        </div>
        <p className="font-mono-hud" style={{ marginTop: 8, fontSize: 8, color: syncState === 'offline' ? '#e03030' : '#2ea84d', letterSpacing: '0.12em' }}>
          {syncState === 'saving' ? 'SYNCING RECORD...' : syncState === 'online' ? 'DATABASE CONNECTED' : 'LOCAL RECORD — OFFLINE'}
        </p>
      </aside>

      {/* Scan line */}
      <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(212,160,23,0.06), transparent)', animation: 'scan-line 6s linear infinite', pointerEvents: 'none' }} />
    </div>
  )
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function Leaderboard({ entries, loading, error, playerId, onBack, onRetry }: {
  entries: LeaderboardEntry[]
  loading: boolean
  error: string | null
  playerId: string
  onBack: () => void
  onRetry: () => void
}) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0b0c10', overflow: 'auto' }} className="fade-in">
      <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(212,160,23,0.1)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onBack} style={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#6b7080', background: 'none', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.1em' }}>← BACK</button>
        <div style={{ height: 16, width: 1, background: 'rgba(212,160,23,0.2)' }} />
        <span className="font-typewriter" style={{ fontSize: 16, color: '#d4a017' }}>MOST WANTED</span>
      </div>
      <main style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '42px 28px' }}>
        <p className="font-mono-hud" style={{ fontSize: 10, letterSpacing: '0.22em', color: 'rgba(212,160,23,0.45)', marginBottom: 8 }}>DIGITAL CRIMES UNIT · ACTIVE ROSTER</p>
        <h2 className="font-typewriter" style={{ fontSize: 32, color: '#c4c8d4', marginBottom: 28 }}>Top Detectives</h2>
        {loading && <p className="font-mono-hud blink" style={{ color: '#d4a017', fontSize: 11 }}>DECRYPTING RECORDS...</p>}
        {error && (
          <div style={{ padding: 24, border: '1px solid rgba(224,48,48,0.25)', textAlign: 'center' }}>
            <p className="font-mono-hud" style={{ color: '#e03030', fontSize: 11, marginBottom: 12 }}>{error}</p>
            <button onClick={onRetry} className="font-mono-hud" style={{ color: '#d4a017', background: 'transparent', border: '1px solid rgba(212,160,23,0.3)', padding: '8px 14px', cursor: 'pointer' }}>RETRY CONNECTION</button>
          </div>
        )}
        {!loading && !error && entries.length === 0 && (
          <div style={{ padding: 32, border: '1px dashed rgba(212,160,23,0.2)', textAlign: 'center' }}>
            <p className="font-typewriter" style={{ color: '#8a8fa0', fontSize: 16 }}>No closed case files yet.</p>
            <p className="font-mono-hud" style={{ color: '#3a4050', fontSize: 9, marginTop: 8 }}>COMPLETE AN INVESTIGATION TO CLAIM THE FIRST RANK</p>
          </div>
        )}
        {!loading && !error && entries.length > 0 && (
          <div style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="leaderboard-row leaderboard-header">
              <span>RANK / DETECTIVE</span><span>BEST SCORE</span><span>ACCURACY</span><span>FILES</span>
            </div>
            {entries.map((entry, index) => (
              <div key={entry.playerId} className="leaderboard-row" style={{ background: entry.playerId === playerId ? 'rgba(212,160,23,0.08)' : index % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                <span className="font-typewriter" style={{ color: entry.playerId === playerId ? '#d4a017' : '#c4c8d4' }}><b className="font-mono-hud" style={{ color: index < 3 ? '#d4a017' : '#565b6e', marginRight: 14 }}>{String(index + 1).padStart(2, '0')}</b>{entry.alias}</span>
                <span style={{ color: '#d4a017' }}>{entry.bestScore.toLocaleString()}</span>
                <span style={{ color: entry.accuracy >= 70 ? '#2ea84d' : '#8a8fa0' }}>{entry.accuracy}%</span>
                <span>{entry.gamesPlayed}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Briefing ─────────────────────────────────────────────────────────────────

function Briefing({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const tips = [
    { icon: '🔗', label: 'Check the domain', desc: 'Scam links often mimic real sites with small changes — "paypa1.com", "amazon-secure.net". Real companies use their own domain only.' },
    { icon: '⚡', label: 'Spot urgency tactics', desc: '"24 hours", "immediate action", "arrest" — pressure tactics are designed to make you react before you think.' },
    { icon: '👤', label: 'Vague greetings', desc: '"Dear Customer" instead of your name is a red flag. Legit companies know who they\'re emailing.' },
    { icon: '🏆', label: 'Unsolicited prizes', desc: 'If you didn\'t enter a contest, you didn\'t win one. Gift card offers from strangers are always scams.' },
    { icon: '📞', label: 'Phone vs. official site', desc: 'Government agencies (IRS, SSA) contact you by mail. They never demand payment by phone or threaten arrest.' },
  ]
  return (
    <div style={{ width: '100%', height: '100%', background: '#0b0c10', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(212,160,23,0.1)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onBack} style={{ fontFamily: 'Share Tech Mono', fontSize: 11, color: '#6b7080', background: 'none', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 12px', cursor: 'pointer', letterSpacing: '0.1em' }}>← BACK</button>
        <div style={{ height: 16, width: 1, background: 'rgba(212,160,23,0.2)' }} />
        <span className="font-typewriter" style={{ fontSize: 16, color: '#d4a017' }}>DETECTIVE BRIEFING</span>
      </div>
      <div style={{ flex: 1, maxWidth: 600, margin: '0 auto', padding: '40px 32px' }}>
        <p className="font-mono-hud" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(212,160,23,0.4)', marginBottom: 8 }}>FIELD GUIDE TO SCAM DETECTION</p>
        <p className="font-raj" style={{ fontSize: 15, color: '#6b7080', marginBottom: 36, lineHeight: 1.7 }}>
          Each round presents you with real-looking messages. Your job: determine whether it's a scam or legitimate. You have {TIME_PER_MSG} seconds per message and {TOTAL_LIVES} lives. Wrong calls cost a life.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
          {tips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
              <Corner size={7} color="rgba(212,160,23,0.2)" />
              <span style={{ fontSize: 22, flexShrink: 0 }}>{tip.icon}</span>
              <div>
                <p className="font-typewriter" style={{ fontSize: 14, color: '#c4c8d4', marginBottom: 4 }}>{tip.label}</p>
                <p className="font-raj" style={{ fontSize: 13, color: '#565b6e', lineHeight: 1.5 }}>{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onPlay} style={{ width: '100%', padding: '14px', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.35)', cursor: 'pointer', fontFamily: 'Special Elite', fontSize: 16, color: '#d4a017', letterSpacing: '0.08em', transition: 'all 0.2s', position: 'relative' }}>
          <Corner color="rgba(212,160,23,0.5)" />
          BEGIN INVESTIGATION
        </button>
      </div>
    </div>
  )
}

// ─── Game screen ──────────────────────────────────────────────────────────────

interface VerdictResult {
  msg: Message
  playerVerdict: Verdict
  correct: boolean
  timeLeft: number
  pointsEarned: number
}

function GameScreen({
  messages, msgIndex, lives, score, streak, timeLeft,
  onVerdict, showStamp, stampType, stampShake,
}: {
  messages: Message[]; msgIndex: number; lives: number; score: number; streak: number
  timeLeft: number; onVerdict: (v: Verdict) => void
  showStamp: boolean; stampType: Verdict | null; stampShake: boolean
}) {
  const msg = messages[msgIndex]
  if (!msg) return null

  const timePct = (timeLeft / TIME_PER_MSG) * 100
  const timeColor = timePct > 50 ? '#4fc87a' : timePct > 25 ? '#d4a017' : '#e03030'
  const typeLabels: Record<MsgType, string> = { sms: 'SMS / TEXT', email: 'EMAIL', whatsapp: 'MESSAGING APP', notification: 'PUSH NOTIFICATION' }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0b0c10', overflow: 'hidden' }}>

      {/* HUD bar */}
      <div style={{ padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', gap: 20, borderBottom: '1px solid rgba(212,160,23,0.1)', background: 'rgba(9,10,14,0.9)', flexShrink: 0 }}>
        {/* Case progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="font-mono-hud" style={{ fontSize: 10, color: '#3a4050', letterSpacing: '0.15em' }}>CASE</span>
          <span className="font-mono-hud" style={{ fontSize: 13, color: '#d4a017' }}>{String(msgIndex + 1).padStart(2,'0')}</span>
          <span className="font-mono-hud" style={{ fontSize: 10, color: '#3a4050' }}>/ {String(messages.length).padStart(2,'0')}</span>
        </div>

        {/* Progress bar */}
        <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ height: '100%', width: `${((msgIndex) / messages.length) * 100}%`, background: '#d4a017', transition: 'width 0.3s' }} />
        </div>

        {/* Streak */}
        {streak >= 2 && (
          <div style={{ padding: '3px 10px', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.25)' }}>
            <span className="font-mono-hud" style={{ fontSize: 10, color: '#d4a017' }}>🔥 ×{streak} STREAK</span>
          </div>
        )}

        {/* Score */}
        <div style={{ textAlign: 'right' }}>
          <p className="font-mono-hud" style={{ fontSize: 9, color: '#3a4050', letterSpacing: '0.1em' }}>SCORE</p>
          <p className="font-mono-hud" style={{ fontSize: 16, color: '#c4c8d4' }}>{score.toLocaleString()}</p>
        </div>

        {/* Lives */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <p className="font-mono-hud" style={{ fontSize: 8, color: '#3a4050', letterSpacing: '0.1em' }}>LIVES</p>
          <LivesDisplay lives={lives} />
        </div>
      </div>

      {/* Timer bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{
          height: '100%', background: timeColor,
          width: `${timePct}%`,
          transition: 'width 0.9s linear, background 0.5s',
          boxShadow: `0 0 8px ${timeColor}60`,
        }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 32px', gap: 24 }}>

        {/* Message type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 1, width: 40, background: 'rgba(212,160,23,0.2)' }} />
          <span className="font-mono-hud" style={{ fontSize: 9, color: 'rgba(212,160,23,0.45)', letterSpacing: '0.2em' }}>{typeLabels[msg.type]}</span>
          <div style={{ height: 1, width: 40, background: 'rgba(212,160,23,0.2)' }} />
        </div>

        {/* The message — with stamp overlay */}
        <div style={{ position: 'relative', width: '100%', maxWidth: msg.type === 'email' ? 540 : 360 }}>
          <MessageCard msg={msg} />
          {showStamp && stampType && (
            <div className="stamp-in" style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                padding: '12px 28px',
                border: `4px solid ${stampType === 'scam' ? '#e03030' : '#2ea84d'}`,
                borderRadius: 4,
                color: stampType === 'scam' ? '#e03030' : '#2ea84d',
                fontFamily: 'Special Elite',
                fontSize: 36,
                letterSpacing: '0.15em',
                transform: 'rotate(-8deg)',
                opacity: 0.92,
                textShadow: `0 0 20px ${stampType === 'scam' ? 'rgba(224,48,48,0.4)' : 'rgba(46,168,77,0.4)'}`,
                boxShadow: `0 0 30px ${stampType === 'scam' ? 'rgba(224,48,48,0.2)' : 'rgba(46,168,77,0.2)'}`,
                background: 'rgba(11,12,16,0.6)',
              }}>
                {stampType === 'scam' ? '⚠ SCAM' : '✓ LEGIT'}
              </div>
            </div>
          )}
        </div>

        {/* Timer readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: timeColor, boxShadow: `0 0 6px ${timeColor}`, flexShrink: 0 }} />
          <span className="font-mono-hud" style={{ fontSize: 12, color: timeColor }}>{timeLeft}s remaining</span>
        </div>
      </div>

      {/* Verdict buttons */}
      <div className={stampShake ? 'shake' : ''} style={{ padding: '20px 32px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 16, flexShrink: 0, background: 'rgba(9,10,14,0.9)' }}>
        <button
          onClick={() => onVerdict('scam')}
          style={{
            flex: 1, padding: '18px', cursor: 'pointer', transition: 'all 0.18s', position: 'relative',
            background: 'rgba(224,48,48,0.08)', border: '1px solid rgba(224,48,48,0.35)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(224,48,48,0.16)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(224,48,48,0.08)' }}
        >
          <Corner color="rgba(224,48,48,0.5)" />
          <p className="font-typewriter" style={{ fontSize: 22, color: '#e03030', letterSpacing: '0.05em', marginBottom: 2 }}>⚠ SCAM</p>
          <p className="font-mono-hud" style={{ fontSize: 9, color: 'rgba(224,48,48,0.4)', letterSpacing: '0.15em' }}>THIS IS FRAUDULENT</p>
        </button>
        <button
          onClick={() => onVerdict('legit')}
          style={{
            flex: 1, padding: '18px', cursor: 'pointer', transition: 'all 0.18s', position: 'relative',
            background: 'rgba(46,168,77,0.08)', border: '1px solid rgba(46,168,77,0.35)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(46,168,77,0.16)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(46,168,77,0.08)' }}
        >
          <Corner color="rgba(46,168,77,0.5)" />
          <p className="font-typewriter" style={{ fontSize: 22, color: '#2ea84d', letterSpacing: '0.05em', marginBottom: 2 }}>✓ LEGIT</p>
          <p className="font-mono-hud" style={{ fontSize: 9, color: 'rgba(46,168,77,0.4)', letterSpacing: '0.15em' }}>THIS IS GENUINE</p>
        </button>
      </div>
    </div>
  )
}

// ─── Verdict explain screen ───────────────────────────────────────────────────

function VerdictScreen({ result, onNext, caseNum, total }: { result: VerdictResult; onNext: () => void; caseNum: number; total: number }) {
  const correct = result.correct
  const isScam = result.msg.isScam

  return (
    <div style={{ width: '100%', height: '100%', background: '#0b0c10', display: 'flex', flexDirection: 'column', overflow: 'auto' }} className="fade-in">
      {/* Result banner */}
      <div style={{
        padding: '20px 32px', flexShrink: 0,
        background: correct ? 'rgba(46,168,77,0.08)' : 'rgba(224,48,48,0.08)',
        borderBottom: `1px solid ${correct ? 'rgba(46,168,77,0.2)' : 'rgba(224,48,48,0.2)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 28 }}>{correct ? '✅' : '❌'}</span>
          <div>
            <p className="font-typewriter" style={{ fontSize: 20, color: correct ? '#2ea84d' : '#e03030', marginBottom: 2 }}>
              {correct ? 'CORRECT CALL, DETECTIVE' : 'WRONG CALL'}
            </p>
            <p className="font-mono-hud" style={{ fontSize: 10, color: '#3a4050', letterSpacing: '0.12em' }}>
              CASE {String(caseNum).padStart(2,'0')} / {String(total).padStart(2,'0')} · {result.pointsEarned > 0 ? `+${result.pointsEarned} pts` : 'no points'}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p className="font-mono-hud" style={{ fontSize: 10, color: '#3a4050' }}>TIME REMAINING</p>
            <p className="font-mono-hud" style={{ fontSize: 18, color: '#c4c8d4' }}>{result.timeLeft}s</p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '28px 32px', maxWidth: 680, margin: '0 auto', width: '100%' }}>
        {/* Verdict stamp */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{
            padding: '8px 20px', border: `2px solid ${isScam ? '#e03030' : '#2ea84d'}`,
            fontFamily: 'Special Elite', fontSize: 16, color: isScam ? '#e03030' : '#2ea84d',
            letterSpacing: '0.1em', transform: 'rotate(-2deg)',
          }}>
            {isScam ? '⚠ SCAM CONFIRMED' : '✓ LEGITIMATE'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <p className="font-raj" style={{ fontSize: 13, color: '#565b6e' }}>
              You called it: <span style={{ color: result.playerVerdict === 'scam' ? '#e03030' : '#2ea84d', fontWeight: 600 }}>{result.playerVerdict.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Explanation */}
        <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20, position: 'relative' }}>
          <Corner size={8} color="rgba(212,160,23,0.25)" />
          <p className="font-mono-hud" style={{ fontSize: 9, color: 'rgba(212,160,23,0.4)', letterSpacing: '0.15em', marginBottom: 8 }}>CASE NOTES</p>
          <p className="font-courier" style={{ fontSize: 13, color: '#a0a4b4', lineHeight: 1.7 }}>{result.msg.explanation}</p>
        </div>

        {/* Red flags */}
        {result.msg.redFlags.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <p className="font-mono-hud" style={{ fontSize: 9, color: 'rgba(224,48,48,0.5)', letterSpacing: '0.15em', marginBottom: 10 }}>⚠ RED FLAGS IDENTIFIED</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {result.msg.redFlags.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: 'rgba(224,48,48,0.05)', border: '1px solid rgba(224,48,48,0.12)' }}>
                  <span style={{ color: '#e03030', fontSize: 10, flexShrink: 0 }}>▸</span>
                  <span className="font-raj" style={{ fontSize: 13, color: '#8a8fa0' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.msg.redFlags.length === 0 && (
          <div style={{ marginBottom: 28, padding: '12px 16px', background: 'rgba(46,168,77,0.05)', border: '1px solid rgba(46,168,77,0.12)' }}>
            <p className="font-raj" style={{ fontSize: 13, color: '#4a8a5a' }}>✓ No red flags detected — this message is genuine.</p>
          </div>
        )}

        <button
          onClick={onNext}
          style={{ width: '100%', padding: '14px', background: 'rgba(212,160,23,0.08)', border: '1px solid rgba(212,160,23,0.3)', cursor: 'pointer', fontFamily: 'Special Elite', fontSize: 16, color: '#d4a017', letterSpacing: '0.1em', transition: 'all 0.2s', position: 'relative' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,0.14)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,160,23,0.08)' }}
        >
          <Corner color="rgba(212,160,23,0.45)" />
          {caseNum < total ? 'NEXT CASE →' : 'CLOSE CASE FILE'}
        </button>
      </div>
    </div>
  )
}

// ─── Game over / complete ──────────────────────────────────────────────────────

function EndScreen({ won, score, results, onRestart, onMenu, progress, syncState }: {
  won: boolean
  score: number
  results: VerdictResult[]
  onRestart: () => void
  onMenu: () => void
  progress: PlayerProgress
  syncState: 'online' | 'offline' | 'saving'
}) {
  const correct = results.filter(r => r.correct).length
  const accuracy = Math.round((correct / results.length) * 100)
  const rank = accuracy >= 90 ? 'SENIOR DETECTIVE' : accuracy >= 70 ? 'DETECTIVE' : accuracy >= 50 ? 'JUNIOR ANALYST' : 'INTERN'

  return (
    <div style={{ width: '100%', height: '100%', background: '#0b0c10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, overflow: 'auto' }} className="fade-in">
      <div style={{ width: '100%', maxWidth: 580 }}>
        {/* Case closed stamp */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-block', padding: '12px 36px',
            border: `4px solid ${won ? '#d4a017' : '#e03030'}`,
            fontFamily: 'Special Elite', fontSize: 30, color: won ? '#d4a017' : '#e03030',
            letterSpacing: '0.1em', transform: 'rotate(-3deg)',
            textShadow: `0 0 20px ${won ? 'rgba(212,160,23,0.3)' : 'rgba(224,48,48,0.3)'}`,
            marginBottom: 16, display: 'block',
          }}>
            {won ? 'CASE CLOSED' : 'CASE FAILED'}
          </div>
          <p className="font-typewriter" style={{ fontSize: 24, color: '#c4c8d4', marginBottom: 4 }}>{won ? 'Investigation Complete' : 'You\'ve been reassigned'}</p>
          <p className="font-mono-hud" style={{ fontSize: 10, color: '#3a4050', letterSpacing: '0.2em' }}>RANK: {rank}</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'FINAL SCORE', value: score.toLocaleString(), color: '#d4a017' },
            { label: 'ACCURACY', value: `${accuracy}%`, color: accuracy >= 70 ? '#2ea84d' : '#e03030' },
            { label: 'CORRECT', value: `${correct}/${results.length}`, color: '#c4c8d4' },
          ].map(s => (
            <div key={s.label} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', position: 'relative' }}>
              <Corner size={7} color="rgba(212,160,23,0.2)" />
              <p className="font-mono-hud" style={{ fontSize: 24, color: s.color, marginBottom: 4 }}>{s.value}</p>
              <p className="font-mono-hud" style={{ fontSize: 9, color: '#3a4050', letterSpacing: '0.12em' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Per-message result strip */}
        <div style={{ marginBottom: 28 }}>
          <p className="font-mono-hud" style={{ fontSize: 9, color: '#3a4050', letterSpacing: '0.15em', marginBottom: 10 }}>CASE BREAKDOWN</p>
          <div style={{ display: 'flex', gap: 4 }}>
            {results.map((r, i) => (
              <div key={i} title={r.msg.sender} style={{ flex: 1, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: r.correct ? 'rgba(46,168,77,0.15)' : 'rgba(224,48,48,0.15)', border: `1px solid ${r.correct ? 'rgba(46,168,77,0.3)' : 'rgba(224,48,48,0.3)'}` }}>
                <span style={{ fontSize: 12 }}>{r.correct ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', marginBottom: 18, background: 'rgba(212,160,23,0.04)', border: '1px solid rgba(212,160,23,0.14)' }}>
          <span className="font-mono-hud" style={{ fontSize: 9, color: '#6b7080', letterSpacing: '0.1em' }}>
            CAREER BEST <b style={{ color: '#d4a017' }}>{Math.max(progress.bestScore, score).toLocaleString()}</b>
          </span>
          <span className="font-mono-hud" style={{ fontSize: 9, color: syncState === 'offline' ? '#e03030' : '#2ea84d', letterSpacing: '0.1em' }}>
            {syncState === 'saving' ? 'SAVING CASE...' : syncState === 'online' ? 'CASE ARCHIVED' : 'SAVED LOCALLY'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onRestart} style={{ flex: 1, padding: '13px', background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.35)', cursor: 'pointer', fontFamily: 'Special Elite', fontSize: 15, color: '#d4a017', letterSpacing: '0.08em', transition: 'all 0.2s', position: 'relative' }}>
            <Corner color="rgba(212,160,23,0.45)" />
            NEW CASE FILE
          </button>
          <button onClick={onMenu} style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontFamily: 'Special Elite', fontSize: 15, color: '#6b7080', letterSpacing: '0.08em', transition: 'all 0.2s', position: 'relative' }}>
            <Corner size={7} color="rgba(255,255,255,0.12)" />
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Root controller ──────────────────────────────────────────────────────────

export default function App() {
  const playerIdRef = useRef(getPlayerId())
  const [screen, setScreen]         = useState<Screen>('menu')
  const [messages, setMessages]     = useState<Message[]>([])
  const [msgIndex, setMsgIndex]     = useState(0)
  const [lives, setLives]           = useState(TOTAL_LIVES)
  const [score, setScore]           = useState(0)
  const [streak, setStreak]         = useState(0)
  const [timeLeft, setTimeLeft]     = useState(TIME_PER_MSG)
  const [results, setResults]       = useState<VerdictResult[]>([])
  const [showStamp, setShowStamp]   = useState(false)
  const [stampType, setStampType]   = useState<Verdict | null>(null)
  const [stampShake, setStampShake] = useState(false)
  const [pendingResult, setPending] = useState<VerdictResult | null>(null)
  const [progress, setProgress]     = useState<PlayerProgress>(() => getLocalProgress(playerIdRef.current))
  const [syncState, setSyncState]   = useState<'online' | 'offline' | 'saving'>('saving')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionSavedRef = useRef(false)

  useEffect(() => {
    loadProgress(playerIdRef.current).then(({ progress: loadedProgress, synced }) => {
      setProgress(loadedProgress)
      setSyncState(synced ? 'online' : 'offline')
    })
  }, [])

  const startGame = useCallback(() => {
    const msgs = shuffle(MESSAGES)
    setMessages(msgs)
    setMsgIndex(0)
    setLives(TOTAL_LIVES)
    setScore(0)
    setStreak(0)
    setTimeLeft(TIME_PER_MSG)
    setResults([])
    setShowStamp(false)
    setStampType(null)
    setPending(null)
    sessionSavedRef.current = false
    setScreen('game')
  }, [])

  const refreshLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true)
    setLeaderboardError(null)
    try {
      setLeaderboard(await loadLeaderboard())
    } catch {
      setLeaderboardError('DATABASE LINK UNAVAILABLE')
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

  function openLeaderboard() {
    setScreen('leaderboard')
    void refreshLeaderboard()
  }

  function changeAlias(value: string) {
    const alias = value.replace(/[^\w -]/g, '').slice(0, 20)
    setProgress(current => updateLocalAlias(current, alias))
  }

  // Timer
  useEffect(() => {
    if (screen !== 'game') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleVerdict('scam'); return TIME_PER_MSG } // timeout = wrong
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [screen, msgIndex])

  function handleVerdict(verdict: Verdict) {
    if (timerRef.current) clearInterval(timerRef.current)
    const msg = messages[msgIndex]
    const correct = (verdict === 'scam') === msg.isScam
    const newStreak = correct ? streak + 1 : 0
    const points = correct ? Math.max(0, Math.round(timeLeft * 10 * (1 + Math.floor(newStreak / 3) * 0.5))) : 0
    const newLives = correct ? lives : lives - 1

    const result: VerdictResult = { msg, playerVerdict: verdict, correct, timeLeft, pointsEarned: points }
    setPending(result)
    setStampType(verdict)
    setShowStamp(true)

    if (!correct) setStampShake(true)

    setTimeout(() => {
      setShowStamp(false)
      setStampShake(false)
      setStreak(newStreak)
      setScore(s => s + points)
      setLives(newLives)
      setResults(r => [...r, result])
      setTimeLeft(TIME_PER_MSG)
      setScreen('verdict')
    }, 900)
  }

  function handleNext() {
    const nextIdx = msgIndex + 1
    if (lives <= (pendingResult?.correct ? lives : lives - 1) - (pendingResult?.correct ? 0 : 0) && !pendingResult?.correct && lives - 1 <= 0) {
      setScreen('gameover'); return
    }
    if (nextIdx >= messages.length) {
      setScreen('complete'); return
    }
    setMsgIndex(nextIdx)
    setScreen('game')
  }

  // Recalc after verdict applied
  function goNext() {
    const nextIdx = msgIndex + 1
    if (lives <= 0) { setScreen('gameover'); return }
    if (nextIdx >= messages.length) { setScreen('complete'); return }
    setMsgIndex(nextIdx)
    setScreen('game')
  }

  const lastResult = results[results.length - 1]

  useEffect(() => {
    if ((screen !== 'gameover' && screen !== 'complete') || sessionSavedRef.current || results.length === 0) return
    sessionSavedRef.current = true
    setSyncState('saving')
    void saveSession(progress, {
      score,
      correct: results.filter(result => result.correct).length,
      total: results.length,
      completed: screen === 'complete',
    }).then(({ progress: savedProgress, synced }) => {
      setProgress(savedProgress)
      setSyncState(synced ? 'online' : 'offline')
    })
  }, [screen, score, results, progress])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {screen === 'menu'     && (
        <MainMenu
          onPlay={startGame}
          onHowTo={() => setScreen('brief')}
          onLeaderboard={openLeaderboard}
          progress={progress}
          onAliasChange={changeAlias}
          syncState={syncState}
        />
      )}
      {screen === 'brief'    && <Briefing onBack={() => setScreen('menu')} onPlay={startGame} />}
      {screen === 'leaderboard' && (
        <Leaderboard
          entries={leaderboard}
          loading={leaderboardLoading}
          error={leaderboardError}
          playerId={playerIdRef.current}
          onBack={() => setScreen('menu')}
          onRetry={refreshLeaderboard}
        />
      )}
      {screen === 'game'     && (
        <GameScreen
          messages={messages} msgIndex={msgIndex} lives={lives} score={score}
          streak={streak} timeLeft={timeLeft} onVerdict={handleVerdict}
          showStamp={showStamp} stampType={stampType} stampShake={stampShake}
        />
      )}
      {screen === 'verdict'  && lastResult && (
        <VerdictScreen result={lastResult} onNext={goNext} caseNum={msgIndex + 1} total={messages.length} />
      )}
      {screen === 'gameover' && (
        <EndScreen won={false} score={score} results={results} onRestart={startGame} onMenu={() => setScreen('menu')} progress={progress} syncState={syncState} />
      )}
      {screen === 'complete' && (
        <EndScreen won={true} score={score} results={results} onRestart={startGame} onMenu={() => setScreen('menu')} progress={progress} syncState={syncState} />
      )}
    </div>
  )
}
