import { useState, useEffect } from "react";
import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/react";
import {
  ArrowRight, Check, CheckCircle2, ChevronDown, ChevronUp, Clock,
  FolderKanban, Inbox, Layers, Lock, Moon, ShieldCheck, Sparkles,
  Sun, Timer, TriangleAlert, Upload, X, Zap
} from "lucide-react";
import "./landing.css";

export default function LandingPage({ onOpenApp }) {
  const [activeTab, setActiveTab] = useState("heatmap");
  const [openFaq, setOpenFaq] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem("crunchless-theme") || "system");

  useEffect(() => {
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.dataset.appearance = theme;
    localStorage.setItem("crunchless-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="landing-page">
      <div className="landing-ambient-glow" />

      {/* Navigation */}
      <header className="landing-container">
        <nav className="landing-nav glass-panel" aria-label="Main Navigation">
          <a href="#" className="landing-brand">
            <div className="brand-mark small" aria-hidden="true">
              <span /><span /><span />
            </div>
            <span>Crunchless</span>
          </a>

          <ul className="landing-nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#preview">Interactive Preview</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>

          <div className="landing-nav-actions">
            <button
              className="icon-button compact"
              onClick={toggleTheme}
              aria-label="Toggle visual theme"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="button button-primary" onClick={onOpenApp}>
              Launch Workspace <ArrowRight size={15} />
            </button>

            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="button button-secondary top-auth-btn" type="button">Sign in</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="button button-primary top-auth-btn" type="button">Sign up</button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="landing-container landing-hero">
        <div className="landing-badge">
          <Sparkles size={14} />
          <span>Stop the all-nighter panic · 100% Local-first & Private</span>
        </div>

        <h1>
          See the crunch <span className="landing-gradient-text">before it hits.</span>
        </h1>

        <p className="landing-hero-lead">
          Crunchless automatically maps your assignments, midterms, and personal goals against
          your real weekly study capacity. No guessing, no chaos—just a calm, manageable daily plan.
        </p>

        <div className="landing-hero-cta">
          <button className="button button-primary" onClick={onOpenApp}>
            Try Crunchless Free <ArrowRight size={16} />
          </button>
          <a href="#preview" className="button button-secondary">
            See How It Works
          </a>
        </div>

        <div className="landing-hero-trust">
          <span><ShieldCheck size={16} /> No account needed</span>
          <span>•</span>
          <span><Lock size={16} /> 100% in your browser</span>
          <span>•</span>
          <span><CheckCircle2 size={16} /> Zero email or cloud tracking</span>
        </div>
      </section>

      {/* Interactive Mockup Preview */}
      <section id="preview" className="landing-container landing-preview-section">
        <div className="landing-mockup-frame">
          <div className="landing-mockup-bar">
            <div className="landing-window-dots">
              <span /><span /><span />
            </div>
            <div className="landing-mockup-tabs">
              <button
                className={`landing-mockup-tab ${activeTab === "heatmap" ? "active" : ""}`}
                onClick={() => setActiveTab("heatmap")}
              >
                Workload Heatmap
              </button>
              <button
                className={`landing-mockup-tab ${activeTab === "startby" ? "active" : ""}`}
                onClick={() => setActiveTab("startby")}
              >
                "Start By" Alerts
              </button>
              <button
                className={`landing-mockup-tab ${activeTab === "inbox" ? "active" : ""}`}
                onClick={() => setActiveTab("inbox")}
              >
                Quick-Capture Inbox
              </button>
              <button
                className={`landing-mockup-tab ${activeTab === "import" ? "active" : ""}`}
                onClick={() => setActiveTab("import")}
              >
                Instant Import & OCR
              </button>
            </div>
            <button className="button button-secondary compact-button" onClick={onOpenApp}>
              Try in Workspace
            </button>
          </div>

          <div className="landing-mockup-content">
            {activeTab === "heatmap" && (
              <div className="mockup-grid">
                <div className="mockup-card">
                  <div className="mockup-card-header">
                    <div>
                      <h3>November 2026 · Week 45 Workload</h3>
                      <span>Daily study load vs. your chosen free hours</span>
                    </div>
                    <span className="value-pill">5.2h planned / 30h avail</span>
                  </div>
                  <div className="mockup-heat-row">
                    <div className="mockup-heat-cell light">
                      <span className="mockup-day-name">Mon 2</span>
                      <strong className="mockup-day-val">0h</strong>
                      <span className="mockup-day-cap">5h free</span>
                    </div>
                    <div className="mockup-heat-cell light">
                      <span className="mockup-day-name">Tue 3</span>
                      <strong className="mockup-day-val">0h</strong>
                      <span className="mockup-day-cap">2h free</span>
                    </div>
                    <div className="mockup-heat-cell busy">
                      <span className="mockup-day-name">Wed 4</span>
                      <strong className="mockup-day-val">3h</strong>
                      <span className="mockup-day-cap">4h free</span>
                    </div>
                    <div className="mockup-heat-cell light">
                      <span className="mockup-day-name">Thu 5</span>
                      <strong className="mockup-day-val">1.5h</strong>
                      <span className="mockup-day-cap">4h free</span>
                    </div>
                    <div className="mockup-heat-cell busy">
                      <span className="mockup-day-name">Fri 6</span>
                      <strong className="mockup-day-val">2.5h</strong>
                      <span className="mockup-day-cap">3h free</span>
                    </div>
                    <div className="mockup-heat-cell heavy">
                      <span className="mockup-day-name">Sat 7</span>
                      <strong className="mockup-day-val">2.5h</strong>
                      <span className="mockup-day-cap">2h free</span>
                    </div>
                    <div className="mockup-heat-cell light">
                      <span className="mockup-day-name">Sun 8</span>
                      <strong className="mockup-day-val">0h</strong>
                      <span className="mockup-day-cap">8h free</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-tertiary)", display: "flex", gap: 14 }}>
                    <span><i className="legend-dot light" /> Light load</span>
                    <span><i className="legend-dot busy" /> Balanced</span>
                    <span><i className="legend-dot heavy" /> Over capacity (Collision)</span>
                  </div>
                </div>

                <div className="mockup-card">
                  <div className="mockup-card-header">
                    <h3>Today's Focused Plan</h3>
                    <span>Wednesday, Nov 4</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: 13, display: "block" }}>Networks Midterm Prep</strong>
                        <small style={{ color: "var(--text-tertiary)" }}>Computer Networks · 2.0h</small>
                      </div>
                      <span className="status-badge status-badge-on-track">On track</span>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: 13, display: "block" }}>Portfolio Milestone 1</strong>
                        <small style={{ color: "var(--text-tertiary)" }}>Personal Project · 1.0h</small>
                      </div>
                      <span className="status-badge status-badge-on-track">On track</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "startby" && (
              <div className="mockup-card" style={{ maxWidth: 740, margin: "0 auto" }}>
                <div className="mockup-card-header">
                  <div>
                    <h3>Proactive "Start By" Warnings</h3>
                    <span>Crunchless works backward from deadlines to calculate the latest safe day you can begin.</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 14, border: "1px solid var(--separator)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 700, fontSize: 13 }}>
                        Start by Nov 5
                      </div>
                      <div>
                        <strong style={{ fontSize: 14, display: "block" }}>Operating Systems Lab Record</strong>
                        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Due Saturday, Nov 7 at 23:59 · 4.0h estimated effort</span>
                      </div>
                    </div>
                    <span className="status-badge status-badge-on-track">On track</span>
                  </div>

                  <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(239, 68, 68, 0.3)", background: "rgba(239, 68, 68, 0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(239, 68, 68, 0.15)", color: "var(--status-red)", fontWeight: 700, fontSize: 13 }}>
                        Start Today!
                      </div>
                      <div>
                        <strong style={{ fontSize: 14, display: "block" }}>Database Final Presentation Slides</strong>
                        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Due Friday, Nov 6 · Tight capacity window</span>
                      </div>
                    </div>
                    <span className="status-badge status-badge-tight">Tight</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "inbox" && (
              <div className="mockup-card" style={{ maxWidth: 740, margin: "0 auto" }}>
                <div className="mockup-card-header">
                  <div>
                    <h3>Frictionless Quick-Capture Inbox</h3>
                    <span>Drop to-dos, thoughts, and obligations before you know their due date or class.</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ padding: 14, borderRadius: 12, border: "1px solid var(--separator)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: 13, display: "block" }}>Submit summer internship application</strong>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Need to update resume header and export PDF</span>
                    </div>
                    <button className="button button-primary compact-button" onClick={onOpenApp}>Add to plan</button>
                  </div>
                  <div style={{ padding: 14, borderRadius: 12, border: "1px solid var(--separator)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ fontSize: 13, display: "block" }}>Read chapter 4 research paper</strong>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Captured via browser extension snippet</span>
                    </div>
                    <button className="button button-primary compact-button" onClick={onOpenApp}>Add to plan</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "import" && (
              <div className="mockup-card" style={{ maxWidth: 740, margin: "0 auto" }}>
                <div className="mockup-card-header">
                  <div>
                    <h3>Local Screenshot & Announcement Import</h3>
                    <span>Drop a screenshot or paste text. Crunchless extracts deadlines and previews schedule impact.</span>
                  </div>
                  <span className="value-pill">100% Client-Side OCR</span>
                </div>
                <div style={{ padding: 16, borderRadius: 14, background: "var(--surface-muted)", border: "1px dashed var(--control-border)", textAlign: "center" }}>
                  <Upload size={24} style={{ color: "var(--accent)", margin: "0 auto 8px" }} />
                  <strong style={{ display: "block", fontSize: 13 }}>Drop a screenshot of your portal or syllabus</strong>
                  <small style={{ color: "var(--text-tertiary)" }}>Text is recognized locally via browser OCR—never uploaded to an external server.</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The Problem vs Solution (Why Crunchless) */}
      <section className="landing-container landing-compare-section">
        <div className="section-head">
          <div className="section-eyebrow">The Student Dilemma</div>
          <h2 className="section-title">Why traditional calendars fail busy students.</h2>
          <p className="section-desc">
            Calendars only show when things are due. They don't protect the time it takes to actually prepare.
          </p>
        </div>

        <div className="compare-grid">
          <div className="compare-card before">
            <span className="compare-badge">Without Crunchless</span>
            <h3>The Deadline Spiral</h3>
            <ul className="compare-list">
              <li>
                <X size={18} className="compare-icon-bad" />
                <span>Deadlines sneak up with 3 submissions and an exam landing on the exact same Thursday.</span>
              </li>
              <li>
                <X size={18} className="compare-icon-bad" />
                <span>Guessing how much time homework takes leads to unexpected 3:00 AM cramming sessions.</span>
              </li>
              <li>
                <X size={18} className="compare-icon-bad" />
                <span>Complex calendar setups feel like a full-time job to maintain and constantly get abandoned.</span>
              </li>
              <li>
                <X size={18} className="compare-icon-bad" />
                <span>Personal side projects and job applications get forgotten beneath academic homework.</span>
              </li>
            </ul>
          </div>

          <div className="compare-card after">
            <span className="compare-badge">With Crunchless</span>
            <h3>Calm, Paced Progression</h3>
            <ul className="compare-list">
              <li>
                <Check size={18} className="compare-icon-good" />
                <span>Study hours are distributed backward from the deadline across days you actually have free time.</span>
              </li>
              <li>
                <Check size={18} className="compare-icon-good" />
                <span>Clear workload heatmaps flag high-stress collision weeks 14 days in advance.</span>
              </li>
              <li>
                <Check size={18} className="compare-icon-good" />
                <span>Focus only on "Today's Plan." Once today's study blocks are done, enjoy guilt-free free time.</span>
              </li>
              <li>
                <Check size={18} className="compare-icon-good" />
                <span>Course-free tasks and milestone projects live happily alongside your degree classes.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="landing-container landing-features-section">
        <div className="section-head">
          <div className="section-eyebrow">Core Features</div>
          <h2 className="section-title">Designed for real life, not rigid schedules.</h2>
          <p className="section-desc">
            Everything you need to stay on top of your semester without burning out.
          </p>
        </div>

        <div className="features-bento">
          <div className="feature-box">
            <div className="feature-icon-bubble">
              <Clock size={20} />
            </div>
            <h3>Backward-Scheduled Study Blocks</h3>
            <p>
              Crunchless places study chunks on days leading up to your deadline, prioritizing high-stake exams so you never start too late.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-bubble">
              <Inbox size={20} />
            </div>
            <h3>Quick-Capture Inbox</h3>
            <p>
              Stumble upon an obligation or project idea? Save it instantly without needing a due date, effort estimate, or course. Triage later.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-bubble">
              <Upload size={20} />
            </div>
            <h3>Screenshot & Text OCR Import</h3>
            <p>
              Paste announcements, drop screenshots, or right-click web text with the browser extension. Preview schedule impact before saving.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-bubble">
              <FolderKanban size={20} />
            </div>
            <h3>Personal Projects & Milestones</h3>
            <p>
              Not all work is coursework. Track portfolio builds, job applications, or creative side projects with goal dates and milestones.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-bubble">
              <Zap size={20} />
            </div>
            <h3>Adaptive Work Logging & Timers</h3>
            <p>
              Track time with a focused timer or log work manually. Update your remaining hours anytime and watch the schedule re-balance itself.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon-bubble">
              <ShieldCheck size={20} />
            </div>
            <h3>100% Private & Local-First</h3>
            <p>
              Everything runs in your browser. No forced accounts, no cloud database scraping, and zero analytics. Export full JSON backups anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Step by Step Walkthrough */}
      <section id="how-it-works" className="landing-container landing-steps-section">
        <div className="section-head">
          <div className="section-eyebrow">How It Works</div>
          <h2 className="section-title">Four simple steps to a predictable semester.</h2>
          <p className="section-desc">
            No steep learning curve. Start planning your week in under two minutes.
          </p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">STEP 01</div>
            <h3>Set Your Free Time</h3>
            <p>Choose your available study hours for Monday through Sunday. Add overrides for vacations or exam periods.</p>
          </div>

          <div className="step-card">
            <div className="step-number">STEP 02</div>
            <h3>Capture Your Work</h3>
            <p>Paste an announcement, drag in a screenshot, or use the browser extension to capture commitments from any web page.</p>
          </div>

          <div className="step-card">
            <div className="step-number">STEP 03</div>
            <h3>Let Crunchless Balance</h3>
            <p>The scheduler determines your "Start By" date and distributes manageable study blocks before deadlines hit.</p>
          </div>

          <div className="step-card">
            <div className="step-number">STEP 04</div>
            <h3>Check Today's Plan</h3>
            <p>Open today's focused list, log your study time, and relax knowing your upcoming deadlines are completely under control.</p>
          </div>
        </div>
      </section>


      {/* Frequently Asked Questions */}
      <section id="faq" className="landing-container landing-faq-section">
        <div className="section-head">
          <div className="section-eyebrow">Got Questions?</div>
          <h2 className="section-title">Frequently asked questions.</h2>
        </div>

        <div className="faq-list">
          {[
            {
              q: "Is Crunchless really free to use?",
              a: "Yes! Crunchless is 100% free and open-source. There are no subscriptions, hidden fees, paywalls, or credit card requirements."
            },
            {
              q: "Does Crunchless read my private emails or web browsing?",
              a: "Never. The optional browser extension only captures text you explicitly highlight, right-click, and choose to send. It does not ask for broad mailbox access or monitor your browsing activity."
            },
            {
              q: "What happens if I miss a scheduled study block?",
              a: "Life happens! You can mark the allocation as missed or simply log the hours you actually did. Crunchless automatically recalibrates and re-plans remaining hours across your upcoming available days."
            },
            {
              q: "Can I use Crunchless for personal goals and side projects?",
              a: "Yes! Every task can be categorized under a course or kept completely course-free as a personal deliverable. You can also group tasks under parent projects with target dates and milestone checklists."
            },
            {
              q: "Does Crunchless work offline?",
              a: "Yes. All data, scheduling rules, and text recognition run directly inside your browser. You can plan and check off work even without an internet connection."
            },
            {
              q: "Can I backup or move my data to another computer?",
              a: "Yes! In Settings, you can download a full JSON backup of your workspace at any time. When switching computers or browsers, simply click 'Restore backup' to pick up right where you left off."
            }
          ].map((item, index) => (
            <div className="faq-item" key={index}>
              <button
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                aria-expanded={openFaq === index}
              >
                <span>{item.q}</span>
                {openFaq === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openFaq === index && (
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final Call to Action Banner */}
      <section className="landing-container">
        <div className="landing-cta-banner">
          <h2>Ready to end semester cramming?</h2>
          <p>
            Join students who plan realistically, catch deadline collisions weeks early, and keep their weekends stress-free.
          </p>
          <button className="button button-primary" onClick={onOpenApp} style={{ padding: "0 32px", minHeight: 52, fontSize: 16 }}>
            Launch Workspace Now <ArrowRight size={17} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-container landing-footer">
        <div className="footer-content">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brand-mark small" aria-hidden="true">
              <span /><span /><span />
            </div>
            <strong>Crunchless</strong>
            <span style={{ color: "var(--text-tertiary)", fontSize: 13 }}>· See the crunch before it hits.</span>
          </div>

          <div className="footer-meta">
            <span>Local-first & private · All data stored in this browser</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

