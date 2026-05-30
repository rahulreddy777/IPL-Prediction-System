import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Venues = () => {
  const [stadiumsData, setStadiumsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchStadiums = async () => {
      try {
        const res = await axios.get(`${API}/api/stadiums`);
        setStadiumsData(res.data);
      } catch (err) {
        console.error("Failed to fetch stadiums", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStadiums();
  }, []);

  const getChaseColor = (chasePercent) => {
    const val = parseInt(chasePercent);
    if (val >= 50) return '#4ade80'; // Green
    return '#f87171'; // Red
  };

  const renderStars = (count) => {
    return '★'.repeat(count);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header section matching mockup exactly */}
      <div style={{ paddingBottom: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '32px' }}>
            <div style={{ width: '8px', height: '18px', background: '#f43f5e', borderRadius: '2px' }}></div>
            <div style={{ width: '8px', height: '30px', background: '#facc15', borderRadius: '2px' }}></div>
            <div style={{ width: '8px', height: '24px', background: '#06b6d4', borderRadius: '2px' }}></div>
          </div>
          <h2 style={{ fontSize: '32px', color: '#eab308', letterSpacing: '3px', margin: 0, fontWeight: 'bold' }}>
            VENUE ANALYSIS
          </h2>
          <div style={{ flex: 1, height: '1px', background: '#1e293b', marginLeft: '20px' }}></div>
        </div>
        <div style={{ 
          fontSize: '11px', color: '#64748b', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 'bold' 
        }}>
          3-TIER SYSTEM 
          <span style={{ color: '#1e293b', margin: '0 8px' }}>•</span>
          <span style={{ color: '#f43f5e' }}>BATTING PARADISE</span>
          <span style={{ color: '#1e293b', margin: '0 8px' }}>•</span>
          <span style={{ color: '#eab308' }}>TACTICAL GRIND</span>
          <span style={{ color: '#1e293b', margin: '0 8px' }}>•</span>
          <span style={{ color: '#06b6d4' }}>SEAMER'S DELIGHT</span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
          <Loader size={32} className="animate-spin" style={{ marginRight: '12px' }} />
          Loading Venue Analysis...
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '24px' 
        }}>
        {stadiumsData.map((stadium, idx) => (
          <div key={idx} style={{
            background: '#0a0f1c', // Deep dark blue
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            transition: 'transform 0.3s',
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {/* Image Header with Gradient Overlay */}
            <div style={{
              height: '140px',
              margin: '-24px -24px 16px -24px',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedImage(stadium.image)}
            >
              <img 
                src={stadium.image} 
                alt={stadium.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} 
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              />
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: `linear-gradient(to top, #0a0f1c 0%, transparent 60%, rgba(0,0,0,0.4) 100%)`
              }}></div>
              
              {/* Top Border Glow mapped onto Image */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                background: `linear-gradient(90deg, ${stadium.color}, transparent)`,
                opacity: 0.9
              }}></div>

              <div style={{ 
                position: 'absolute', top: '16px', left: '16px',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                padding: '4px 10px', borderRadius: '4px',
                color: stadium.color, fontSize: '10px', letterSpacing: '2px', fontWeight: 'bold' 
              }}>
                <span style={{ marginRight: '6px' }}>{renderStars(stadium.tierLevel)}</span> 
                {stadium.tierName}
              </div>
            </div>

            <h3 style={{ color: 'white', fontSize: '18px', margin: '0 0 16px 0', fontWeight: 'bold', minHeight: '44px' }}>
              {stadium.name}
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '38px', fontWeight: 'bold', color: stadium.color, lineHeight: 1, fontFamily: 'Oswald, sans-serif' }}>
                  {stadium.avgScore}
                </span>
                <span style={{ color: '#64748b', fontSize: '11px', letterSpacing: '1px' }}>avg score</span>
              </div>

              <div style={{ color: getChaseColor(stadium.chase), fontSize: '12px', fontWeight: 'bold' }}>
                Chase: {stadium.chase}
              </div>
            </div>

            <div style={{ color: '#475569', fontSize: '12px', marginBottom: '20px', fontWeight: '600' }}>
              {stadium.soil}
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid #1e293b',
              borderLeft: '3px solid #eab308',
              borderRadius: '4px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '14px' }}>💡</span>
              <span style={{ color: '#cbd5e1', fontSize: '12px', lineHeight: 1.4 }}>
                {stadium.tip}
              </span>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(5px)', padding: '20px'
        }} onClick={() => setSelectedImage(null)}>
          <button 
            style={{ 
              position: 'absolute', top: '20px', right: '20px', 
              background: 'transparent', border: 'none', color: 'white', 
              cursor: 'pointer', zIndex: 1001 
            }}
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
          >
            <X size={32} />
          </button>
          <img 
            src={selectedImage} 
            alt="Stadium Full View" 
            style={{ 
              maxWidth: '90%', maxHeight: '90vh', objectFit: 'contain',
              borderRadius: '12px', border: '2px solid #334155',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }} 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Venues;
