import React, { useState, useEffect, useRef, createContext, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { mockPapers, courseOptions } from './data';
import './App.css';

export const AppContext = createContext();

/* ============================================
   HOOKS
   ============================================ */

// Animate a number counting up from 0
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!target) { setValue(0); return; }
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.floor(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);

  return value;
}

// IntersectionObserver for scroll reveal
function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return [ref, visible];
}

/* ============================================
   NAVBAR
   ============================================ */

function Navbar({ toggleBookmarksModal, toggleUploadModal, setSearchQuery }) {
  const [inputValue, setInputValue] = useState('');
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(val.trim()), 300);
  };

  return (
    <nav className="navbar">
      <Link to="/" style={{ fontFamily: 'var(--font)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        <span style={{ color: 'var(--accent)' }}>PAPER</span>box
      </Link>
      <div style={{ flex: 1, maxWidth: '420px', margin: '0 1.5rem' }}>
        <input
          type="text"
          value={inputValue}
          placeholder="Search papers..."
          onChange={handleChange}
          className="form-control"
          style={{ borderRadius: '6px', fontSize: '0.85rem' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button className="btn-icon" onClick={toggleBookmarksModal} title="Bookmarks">🔖</button>
        <button className="btn-primary" onClick={toggleUploadModal}>Upload</button>
      </div>
    </nav>
  );
}

/* ============================================
   MAIN LAYOUT
   ============================================ */

function MainLayout() {
  const [papers, setPapers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState(
    JSON.parse(localStorage.getItem('paperbox_bookmarks')) || []
  );
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => { setPapers(mockPapers); }, []);

  const toggleBookmark = useCallback((id) => {
    setBookmarks(prev => {
      const next = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id];
      localStorage.setItem('paperbox_bookmarks', JSON.stringify(next));
      return next;
    });
  }, []);

  const contextValue = useMemo(() => ({
    papers, setPapers, bookmarks, toggleBookmark, searchQuery
  }), [papers, bookmarks, toggleBookmark, searchQuery]);

  return (
    <AppContext.Provider value={contextValue}>
      <Router>
        <Navbar
          setSearchQuery={setSearchQuery}
          toggleBookmarksModal={() => setIsBookmarksOpen(true)}
          toggleUploadModal={() => setIsUploadOpen(true)}
        />
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </div>
        {isBookmarksOpen && <BookmarksModal onClose={() => setIsBookmarksOpen(false)} />}
        {isUploadOpen && <UploadModal onClose={() => setIsUploadOpen(false)} />}
        <ChatWidget />
      </Router>
    </AppContext.Provider>
  );
}

/* ============================================
   MODALS
   ============================================ */

function BookmarksModal({ onClose }) {
  const { papers, bookmarks, toggleBookmark } = React.useContext(AppContext);
  const bookmarkedPapers = papers.filter(p => bookmarks.includes(p.id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Bookmarks</h2>
        {bookmarkedPapers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No bookmarks yet. Tap 🔖 on any paper to save it.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
            {bookmarkedPapers.map(file => (
              <div key={file.id} className="paper-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{file.subject}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{file.course} · Sem {file.semester} · {file.year}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '0.25rem' }}>
                  <button className="btn-icon active" onClick={() => toggleBookmark(file.id)} style={{ fontSize: '0.8rem' }}>🔖 Remove</button>
                  <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => window.open(file.fileUrl, '_blank')}>Download</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadModal({ onClose }) {
  const [file, setFile] = useState(null);
  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return alert('Please select a PDF file.');
    alert('Upload will connect to Firebase Storage once configured in src/firebase.js.');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Upload Paper</h2>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Course</label>
            <select className="form-control" required defaultValue="">
              <option value="" disabled>Select course...</option>
              {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div><label>Semester</label><input type="number" className="form-control" placeholder="1-8" required min="1" max="8" /></div>
            <div><label>Year</label><input type="number" className="form-control" placeholder="2024" required defaultValue="2024" /></div>
          </div>
          <div className="form-group">
            <label>Subject</label>
            <input type="text" className="form-control" placeholder="e.g. Data Structures" required />
          </div>
          <div className="form-group" style={{ border: '1px dashed var(--border)', padding: '1.5rem', textAlign: 'center', borderRadius: '6px', cursor: 'pointer', background: 'var(--bg-card)' }}>
            <label style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📄</div>
              <div style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '0.85rem' }}>Choose PDF file</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{file ? file.name : 'Max 20MB'}</div>
              <input type="file" style={{ display: 'none' }} accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
            </label>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}>Submit</button>
        </form>
      </div>
    </div>
  );
}

/* ============================================
   AI CHAT WIDGET
   ============================================ */

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I can help you find papers or plan your study schedule. Ask me anything.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const pulseInterval = useRef(null);
  const fabRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Pulse FAB every 3 seconds when chat is closed
  useEffect(() => {
    if (isOpen) { clearInterval(pulseInterval.current); return; }
    pulseInterval.current = setInterval(() => {
      if (fabRef.current) {
        fabRef.current.classList.add('pulse');
        setTimeout(() => fabRef.current?.classList.remove('pulse'), 600);
      }
    }, 3000);
    return () => clearInterval(pulseInterval.current);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    // Simulate bot reply (replace with Claude API call)
    setTimeout(() => {
      setIsTyping(false);
      let reply = "I'm a demo assistant. Connect the Claude API in src/App.jsx to enable real AI responses!";
      if (userMsg.toLowerCase().includes('exam')) {
        reply = "For exam prep: focus on the last 3 years of PYQs. Start with subjects you find hardest. Use the search bar above to quickly find papers!";
      } else if (userMsg.toLowerCase().includes('study') || userMsg.toLowerCase().includes('plan')) {
        reply = "A good study plan: spend 2-3 hours per subject daily, alternate between theory and solving PYQs. Browse by semester above to organize your prep.";
      }
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    }, 1200);
  };

  return (
    <>
      <button ref={fabRef} className="chat-fab" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '💬'}
      </button>

      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>AI Study Assistant</span>
            <button className="btn-icon" onClick={() => setIsOpen(false)} style={{ fontSize: '0.9rem' }}>✕</button>
          </div>
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>{msg.text}</div>
            ))}
            {isTyping && (
              <div className="chat-msg bot" style={{ padding: '0.6rem 1rem' }}>
                <div className="typing-dots"><span /><span /><span /></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything..."
            />
            <button className="btn-primary" style={{ padding: '0.5rem 0.75rem' }} onClick={handleSend}>→</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================
   ANIMATED BOOKMARK BUTTON
   ============================================ */

function BookmarkBtn({ isBookmarked, onClick }) {
  const [bouncing, setBouncing] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    setBouncing(true);
    setTimeout(() => setBouncing(false), 300);
    onClick();
  };

  return (
    <button
      className={`btn-icon ${isBookmarked ? 'active' : ''} ${bouncing ? 'bookmark-bounce' : ''}`}
      onClick={handleClick}
    >
      {isBookmarked ? '🔖' : '🏷️'}
    </button>
  );
}

/* ============================================
   ANIMATED DOWNLOAD BUTTON
   ============================================ */

function DownloadBtn({ url, small }) {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    window.open(url, '_blank');
    setClicked(true);
    setTimeout(() => setClicked(false), 2000);
  };

  const baseStyle = small
    ? { padding: '0.3rem 0.6rem', fontSize: '0.8rem' }
    : {};

  return (
    <button className="btn-primary" style={baseStyle} onClick={handleClick}>
      {clicked ? '✓ Opened' : small ? 'View' : 'Download PDF'}
    </button>
  );
}

/* ============================================
   HOME PAGE
   ============================================ */

function Home() {
  const { papers, bookmarks, toggleBookmark, searchQuery } = React.useContext(AppContext);
  const [previewPaper, setPreviewPaper] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [expandedSubject, setExpandedSubject] = useState(null);

  // Scroll reveal refs
  const [heroRef, heroVisible] = useScrollReveal();
  const [statsRef, statsVisible] = useScrollReveal();
  const [gridRef, gridVisible] = useScrollReveal();

  const hierarchy = useMemo(() => {
    let courses = {};
    const base = 'https://raw.githubusercontent.com/rishuuuuuuuuuu-90/pyqs/main/';
    papers.forEach(p => {
      if (!p.fileUrl || !p.fileUrl.includes(base)) return;
      const relativePath = decodeURIComponent(p.fileUrl.replace(base, ''));
      const parts = relativePath.split('/');
      if (parts.length < 2) return;
      const courseName = parts[0].toUpperCase();
      const semName = parts.length >= 3 ? parts[1] : 'General';
      const subjectName = parts.length >= 4 ? parts.slice(2, -1).join(' / ') : 'Files';
      const fileName = parts[parts.length - 1];
      if (!courses[courseName]) courses[courseName] = { semesters: {} };
      if (!courses[courseName].semesters[semName]) courses[courseName].semesters[semName] = { subjects: {} };
      if (!courses[courseName].semesters[semName].subjects[subjectName]) courses[courseName].semesters[semName].subjects[subjectName] = [];
      courses[courseName].semesters[semName].subjects[subjectName].push({ ...p, _filename: fileName });
    });
    return courses;
  }, [papers]);

  // Search
  const filtered = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const results = [];
    for (let i = 0; i < papers.length && results.length < 60; i++) {
      const p = papers[i];
      if (!p) continue;
      const hit = (p.subject && p.subject.toLowerCase().includes(q))
        || (p.course && p.course.toLowerCase().includes(q))
        || (p.fileUrl && decodeURIComponent(p.fileUrl).toLowerCase().includes(q));
      if (hit) results.push(p);
    }
    return results;
  }, [papers, searchQuery]);

  const handleCourseClick = (courseName) => {
    setSelectedCourse(courseName);
    const sems = Object.keys(hierarchy[courseName].semesters).sort();
    if (sems.length > 0) setSelectedSemester(sems[0]);
    setExpandedSubject(null);
  };

  // Stat counters
  const courseCount = useCountUp(Object.keys(hierarchy).length, 1200);
  const paperCount = useCountUp(papers.length, 1200);

  const isSearching = searchQuery.length >= 2;

  // Hero words
  const heroLine1 = 'Previous Year Papers,'.split(' ');
  const heroLine2 = 'Organized.';

  return (
    <div>
      {/* Hero */}
      <section
        ref={heroRef}
        className={`scroll-reveal ${heroVisible ? 'visible' : ''}`}
        style={{ textAlign: 'center', padding: '3rem 0 1rem' }}
      >
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
          {heroLine1.map((word, i) => (
            <span key={i} className="hero-word" style={{ animationDelay: `${400 + i * 80}ms`, marginRight: '0.35em' }}>
              {word}
            </span>
          ))}
          <br />
          <span className="hero-word" style={{ animationDelay: `${400 + heroLine1.length * 80}ms`, color: 'var(--accent)' }}>
            {heroLine2}
          </span>
        </h1>
        <p className="hero-word" style={{ animationDelay: `${400 + (heroLine1.length + 1) * 80}ms`, color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
          Browse and download PYQs from GEHU. Find exactly what you need.
        </p>
      </section>

      {/* Stats */}
      <section
        ref={statsRef}
        className={`scroll-reveal ${statsVisible ? 'visible' : ''}`}
        style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}
      >
        <div className="stat-pill">
          <div className="stat-value">{courseCount}</div>
          <div className="stat-label">Courses</div>
        </div>
        <div className="stat-pill">
          <div className="stat-value">{paperCount.toLocaleString()}</div>
          <div className="stat-label">Papers</div>
        </div>
      </section>

      {/* Content */}
      <div ref={gridRef} className={`scroll-reveal ${gridVisible ? 'visible' : ''}`}>
        {isSearching ? (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{searchQuery}"
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {filtered.slice(0, 50).map((paper, idx) => (
                <div key={paper.id} className="search-card anim-card search-result-enter" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem' }}>{paper.subject}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem', flex: 1 }}>
                    {paper.course} · Sem {paper.semester} · {paper.year}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{paper.downloadCount} dl</span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <BookmarkBtn isBookmarked={bookmarks.includes(paper.id)} onClick={() => toggleBookmark(paper.id)} />
                      <DownloadBtn url={paper.fileUrl} small />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length > 50 && (
              <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Showing 50 of {filtered.length}. Refine your search.
              </div>
            )}
          </>
        ) : (
          <div>
            {!selectedCourse ? (
              <>
                <h2 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Courses</h2>
                <div className="course-grid">
                  {Object.keys(hierarchy).sort().map((courseName, idx) => (
                    <div
                      key={courseName}
                      className="course-card anim-card"
                      style={{ animationDelay: `${idx * 60}ms` }}
                      onClick={() => handleCourseClick(courseName)}
                    >
                      <div className="course-icon">🎓</div>
                      <div className="course-name">{courseName}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <button className="back-btn" onClick={() => setSelectedCourse(null)}>← Back</button>
                  <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{selectedCourse}</h2>
                </div>

                <div className="semester-tabs">
                  {Object.keys(hierarchy[selectedCourse].semesters).sort().map(sem => (
                    <div
                      key={sem}
                      className={`sem-tab ${selectedSemester === sem ? 'active' : ''}`}
                      onClick={() => { setSelectedSemester(sem); setExpandedSubject(null); }}
                    >
                      {sem}
                    </div>
                  ))}
                </div>

                {selectedSemester && (
                  <div className="subject-list">
                    {Object.keys(hierarchy[selectedCourse].semesters[selectedSemester].subjects).sort().map((subjectName, idx) => {
                      const files = hierarchy[selectedCourse].semesters[selectedSemester].subjects[subjectName];
                      const isExpanded = expandedSubject === subjectName;
                      return (
                        <div key={subjectName} className={`subject-accordion anim-card ${isExpanded ? 'expanded' : ''}`} style={{ animationDelay: `${idx * 60}ms` }}>
                          <div className="subject-header" onClick={() => setExpandedSubject(isExpanded ? null : subjectName)}>
                            <div className="subject-title">{subjectName}</div>
                            <div className="subject-badge">{files.length}</div>
                          </div>
                          <div className="subject-body">
                            {files.map(file => (
                              <div key={file.id} className="paper-row">
                                <div className="paper-name">
                                  <span style={{ flexShrink: 0 }}>📄</span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file._filename}</span>
                                </div>
                                <div className="paper-actions">
                                  <BookmarkBtn isBookmarked={bookmarks.includes(file.id)} onClick={() => toggleBookmark(file.id)} />
                                  <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setPreviewPaper(file)}>View</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewPaper && (
        <div className="modal-overlay" onClick={() => setPreviewPaper(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreviewPaper(null)}>×</button>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{previewPaper.subject}</h2>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              {previewPaper.course} · Semester {previewPaper.semester} · {previewPaper.year}
            </div>
            <div style={{ width: '100%', padding: '2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</span>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ready to download</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>PDF file</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <BookmarkBtn isBookmarked={bookmarks.includes(previewPaper.id)} onClick={() => toggleBookmark(previewPaper.id)} />
              <DownloadBtn url={previewPaper.fileUrl} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainLayout;
