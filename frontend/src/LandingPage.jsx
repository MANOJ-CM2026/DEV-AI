import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Database, BarChart3, ArrowRight, Zap, Layers, Shield, TrendingUp, Filter, FileSpreadsheet, PieChart, LineChart } from 'lucide-react';
import './LandingPage.css';

// Floating particle component
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.r = Math.random() * 2 + 0.5;
        this.alpha = Math.random() * 0.4 + 0.1;
        this.color = Math.random() > 0.5 ? '99,102,241' : '139,92,246';
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color},${this.alpha})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < 80; i++) particles.push(new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });

      // draw lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <ParticleCanvas />

      {/* ── Navigation ── */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <div className="nav-logo-icon">
            <Sparkles size={20} />
          </div>
          <span className="nav-logo-text">DEV.x</span>
        </div>
        <div className="landing-nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#themes" className="nav-link">Themes</a>
          <button className="nav-cta" onClick={() => navigate('/dashboard')}>
            Launch App <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="landing-hero">
        <div className="hero-badge">
          <Zap size={14} />
          <span>AI-Powered Analytics Platform</span>
        </div>
        <h1 className="hero-title">
          Transform Raw Data Into
          <span className="hero-gradient-text"> Powerful Insights</span>
        </h1>
        <p className="hero-subtitle">
          Upload your datasets, clean & preprocess automatically, and build stunning
          interactive dashboards — all in one place. No code required.
        </p>
        <div className="hero-actions">
          <button className="hero-btn-primary" onClick={() => navigate('/dashboard')}>
            Get Started Free <ArrowRight size={16} />
          </button>
          <a href="#themes" className="hero-btn-secondary">
            Explore Themes
          </a>
        </div>

        {/* Stats */}
        <div className="hero-stats">
          <div className="stat-item">
            <span className="stat-value">30+</span>
            <span className="stat-label">Chart Types</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">Auto</span>
            <span className="stat-label">Data Cleaning</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">CSV/XLSX</span>
            <span className="stat-label">File Support</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">PDF</span>
            <span className="stat-label">Export Ready</span>
          </div>
        </div>
      </section>

      {/* ── Features Strip ── */}
      <section className="features-strip" id="features">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ '--accent': '#6366f1' }}>
              <Shield size={22} />
            </div>
            <h3>Smart Cleaning</h3>
            <p>Auto-detect & fix missing values, duplicates, and outliers instantly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ '--accent': '#8b5cf6' }}>
              <TrendingUp size={22} />
            </div>
            <h3>AI Suggestions</h3>
            <p>Get intelligent chart recommendations based on your data structure.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ '--accent': '#ec4899' }}>
              <Layers size={22} />
            </div>
            <h3>Custom Dashboards</h3>
            <p>Build multi-chart dashboards with drag-and-drop simplicity.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ '--accent': '#10b981' }}>
              <Filter size={22} />
            </div>
            <h3>NL Queries</h3>
            <p>Type natural language queries like "Sales by City pie chart".</p>
          </div>
        </div>
      </section>

      {/* ── Theme Cards ── */}
      <section className="themes-section" id="themes">
        <div className="section-heading">
          <span className="heading-badge">Choose Your Path</span>
          <h2 className="section-title-text">Two Powerful Themes</h2>
          <p className="section-subtitle-text">Select a workflow that fits your data needs. Each theme is a complete toolset.</p>
        </div>

        <div className="themes-grid">
          {/* Theme 1: Data Pre-Processing */}
          <div
            className="theme-card theme-preprocessing"
            onClick={() => navigate('/dashboard')}
          >
            <div className="theme-glow theme-glow-blue" />
            <div className="theme-card-inner">
              <div className="theme-badge-row">
                <span className="theme-badge theme-badge-blue">Theme 01</span>
                <span className="theme-popular">Popular</span>
              </div>
              <div className="theme-icon-wrap theme-icon-blue">
                <Database size={32} />
              </div>
              <h3 className="theme-title">Data Pre-Processing</h3>
              <p className="theme-desc">
                Clean, transform, and prepare your raw datasets for analysis.
                Handle missing values, normalize columns, remove duplicates, and
                validate data integrity — all automatically.
              </p>
              <ul className="theme-features">
                <li>
                  <FileSpreadsheet size={15} />
                  <span>CSV & XLSX file upload with auto-parsing</span>
                </li>
                <li>
                  <Zap size={15} />
                  <span>Automated null/duplicate/outlier cleaning</span>
                </li>
                <li>
                  <Filter size={15} />
                  <span>Column type detection & smart categorization</span>
                </li>
                <li>
                  <Shield size={15} />
                  <span>Data integrity validation & summary stats</span>
                </li>
              </ul>
              <button className="theme-cta theme-cta-blue">
                Launch Pre-Processing <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Theme 2: Data Visualization */}
          <div
            className="theme-card theme-visualization"
            onClick={() => navigate('/dashboard')}
          >
            <div className="theme-glow theme-glow-purple" />
            <div className="theme-card-inner">
              <div className="theme-badge-row">
                <span className="theme-badge theme-badge-purple">Theme 02</span>
                <span className="theme-new">New</span>
              </div>
              <div className="theme-icon-wrap theme-icon-purple">
                <BarChart3 size={32} />
              </div>
              <h3 className="theme-title">Data Visualization</h3>
              <p className="theme-desc">
                Build interactive, publication-ready visualizations with 30+ chart
                types. From simple bar charts to advanced heatmaps, treemaps, and
                radar plots — create stunning dashboards effortlessly.
              </p>
              <ul className="theme-features">
                <li>
                  <PieChart size={15} />
                  <span>30+ chart types across 7 categories</span>
                </li>
                <li>
                  <LineChart size={15} />
                  <span>Real-time interactive chart rendering</span>
                </li>
                <li>
                  <Sparkles size={15} />
                  <span>AI-powered smart chart suggestions</span>
                </li>
                <li>
                  <TrendingUp size={15} />
                  <span>PDF export & custom color themes</span>
                </li>
              </ul>
              <button className="theme-cta theme-cta-purple">
                Launch Visualization <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Sparkles size={18} />
            <span>DEV.x</span>
          </div>
          <p className="footer-copy">© 2026 DEV.x. Built for data-driven decisions.</p>
        </div>
      </footer>
    </div>
  );
}
