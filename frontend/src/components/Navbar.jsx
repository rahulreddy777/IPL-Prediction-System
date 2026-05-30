import React, { useState, useEffect, useRef } from "react";

function Navbar({ activeTab, setActiveTab }) {
  const [scrolled, setScrolled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const expandRef = useRef(null);

  const tabs = [
    { id: 'prediction2026', label: 'Prediction 2026', icon: '🎯', highlight: true, badge: 'NEW' },
    { id: 'teams', label: 'Teams', icon: '🏏' },
    { id: 'captains', label: 'Captains', icon: '👑' },
    { id: 'champions', label: 'Champions', icon: '🏆' },
    { id: 'venues', label: 'Venues', icon: '📍' },
    { id: 'playerstats', label: 'Cap Leaders', icon: '🏅' },
    { id: 'batters', label: 'Top Batters', icon: '⚾' },
    { id: 'bowlers', label: 'Top Bowlers', icon: '🎳' },
    { id: 'allseasons', label: 'All Seasons', icon: '📅' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setScrolled(true);
        setExpanded(false); // auto-collapse when scrolling
      } else {
        setScrolled(false);
        setExpanded(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close expanded dropdown when clicking outside
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e) => {
      if (expandRef.current && !expandRef.current.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setExpanded(false);
  };

  const btnBase = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.25s ease',
    whiteSpace: 'nowrap',
  };

  return (
    <nav ref={expandRef} style={{
      background: 'linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)',
      padding: scrolled ? '10px 0' : '20px 0',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      transition: 'padding 0.3s ease',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>

        {/* ── COMPACT MODE (scrolled) ── */}
        {scrolled ? (
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>

            {/* Active tab pill — clicking expands the full menu */}
            <button
              onClick={() => setExpanded(prev => !prev)}
              style={{
                ...btnBase,
                background: '#eab308',
                color: '#000',
                fontSize: '14px',
                padding: '10px 26px',
                boxShadow: '0 2px 12px rgba(234,179,8,0.5)',
              }}
            >
              {activeTabData?.icon} {activeTabData?.label}
              <span style={{
                marginLeft: '4px', fontSize: '10px',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s',
                display: 'inline-block'
              }}>▼</span>
            </button>

            {/* Expanded dropdown of all other tabs */}
            {expanded && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2d4fa0 100%)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.15)',
                zIndex: 200,
                minWidth: '320px',
                maxWidth: '680px',
                animation: 'fadeSlideDown 0.2s ease',
              }}>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    style={{
                      ...btnBase,
                      background: activeTab === tab.id 
                        ? (tab.highlight ? '#f59e0b' : '#eab308') 
                        : (tab.highlight ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.15)'),
                      color: activeTab === tab.id ? '#000' : '#fff',
                      padding: '9px 18px',
                      border: tab.highlight ? '1px solid rgba(245,158,11,0.5)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== tab.id) e.currentTarget.style.background = tab.highlight ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.28)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== tab.id) e.currentTarget.style.background = tab.highlight ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.15)';
                    }}
                  >
                    {tab.icon} {tab.label}
                    {tab.badge && <span style={{ marginLeft: '4px', fontSize: '9px', background: '#000', color: '#f59e0b', padding: '1px 4px', borderRadius: '4px', fontWeight: '800' }}>{tab.badge}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── FULL MODE (top of page) ── */
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...btnBase,
                  padding: '12px 24px',
                  background: activeTab === tab.id 
                    ? (tab.highlight ? '#f59e0b' : '#eab308') 
                    : (tab.highlight ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.2)'),
                  color: activeTab === tab.id ? '#000' : '#fff',
                  border: tab.highlight ? '2px solid rgba(245,158,11,0.6)' : 'none',
                  boxShadow: tab.highlight ? '0 0 16px rgba(245,158,11,0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) e.currentTarget.style.background = tab.highlight ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) e.currentTarget.style.background = tab.highlight ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.2)';
                }}
              >
                {tab.icon} {tab.label}
                {tab.badge && <span style={{ marginLeft: '6px', fontSize: '10px', background: activeTab === tab.id ? '#000' : '#f59e0b', color: activeTab === tab.id ? '#f59e0b' : '#000', padding: '2px 5px', borderRadius: '4px', fontWeight: '800' }}>{tab.badge}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Keyframe for dropdown animation */}
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </nav>
  );
}

export default Navbar;
