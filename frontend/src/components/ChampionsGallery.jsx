import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, X, MapPin, User, Medal } from 'lucide-react';

const ChampionsGallery = () => {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWinner, setSelectedWinner] = useState(null);

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await axios.get(`${API}/api/winners`);
        const sortedWinners = response.data.sort((a, b) => parseInt(b.Season) - parseInt(a.Season));
        setWinners(sortedWinners);
      } catch (error) {
        console.error("Error fetching winners data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWinners();
  }, []);

  if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Loading champions data...</div>;

  const getTeamColor = (winner) => {
    if (winner.includes('Chennai')) return '#F9CD05';
    if (winner.includes('Mumbai')) return '#004BA0';
    if (winner.includes('Kolkata')) return '#3A225D';
    if (winner.includes('Gujarat')) return '#1C2C45';
    if (winner.includes('Rajasthan')) return '#EA1A85';
    if (winner.includes('Sunrisers')) return '#F26522';
    if (winner.includes('Deccan')) return '#A8A8A8';
    if (winner.includes('Royal')) return '#D4101A';
    return '#D4101A'; // Default fallback
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
        <Trophy color="#eab308" size={32} />
        <h2 style={{ fontSize: '28px', color: '#eab308', margin: 0 }}>IPL WINNERS (2008 – 2025)</h2>
      </div>

      {/* Horizontal Scrollable Container */}
      <div style={{
        display: 'flex',
        gap: '24px',
        overflowX: 'auto',
        paddingBottom: '20px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#475569 #0f172a'
      }}>
        {winners.map((winner) => {
          const color = getTeamColor(winner.Winner);
          const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          const ext = winner.Season == 2014 ? 'jpg' : 'png';
          const winnerImageUrl = `${API}/data/winners/${winner.Season}.${ext}`;

          return (
            <div
              key={winner.Season}
              onClick={() => setSelectedWinner({ ...winner, imageUrl: winnerImageUrl, color })}
              style={{
                flex: '0 0 280px',
                background: 'linear-gradient(180deg, #1e293b, #0f172a)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = `0 12px 24px ${color}40`;
                e.currentTarget.style.borderColor = color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              {/* Year Badge */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: color,
                color: '#fff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontWeight: 'bold',
                fontFamily: 'Oswald, sans-serif',
                fontSize: '18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                zIndex: 2
              }}>
                {winner.Season}
              </div>

              {/* Team Image/Logo */}
              <div style={{
                height: '180px',
                width: '100%',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <img
                  src={winnerImageUrl}
                  alt={`${winner.Winner} ${winner.Season}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                  onError={(e) => {
                    // Fallback to a gradient if image not found
                    e.target.style.display = 'none';
                    e.target.parentElement.style.background = `linear-gradient(45deg, ${color}, #000)`;
                    e.target.parentElement.innerHTML = `<span style="color:white;font-size:48px;font-weight:bold;font-family:Oswald">${winner.Season}</span>`;
                  }}
                />
              </div>

              {/* Card Footer Details */}
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#fff', fontWeight: 'bold' }}>
                  {winner.Winner}
                </h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
                  Click for details
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Modal */}
      {selectedWinner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            border: `2px solid ${selectedWinner.color}`,
            borderRadius: '24px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: `0 24px 48px rgba(0,0,0,0.8), 0 0 60px ${selectedWinner.color}40`,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedWinner(null)}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                width: '40px', height: '40px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10, transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <X size={24} />
            </button>

            {/* Modal Header Image */}
            <div style={{ height: '300px', width: '100%', background: '#000', position: 'relative' }}>
              <img
                src={selectedWinner.imageUrl}
                alt={selectedWinner.Winner}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.style.background = `linear-gradient(135deg, ${selectedWinner.color}, #000)`;
                }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                padding: '40px 30px 20px',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ color: selectedWinner.color, fontWeight: 'bold', fontSize: '24px', fontFamily: 'Oswald' }}>
                    IPL {selectedWinner.Season} CHAMPIONS
                  </div>
                  <h1 style={{ color: '#fff', margin: 0, fontSize: '42px', fontFamily: 'Oswald', letterSpacing: '1px' }}>
                    {selectedWinner.Winner}
                  </h1>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              {/* Left Column: Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <User size={32} color={selectedWinner.color} />
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Captain</div>
                    <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{selectedWinner.Captain || 'Unknown'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <Medal size={32} color="#cbd5e1" />
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Runner-up</div>
                    <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{selectedWinner.Runner_up || 'Unknown'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                  <MapPin size={32} color="#f43f5e" />
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Final Venue</div>
                    <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{selectedWinner.Final_venue || 'Unknown'}</div>
                  </div>
                </div>

              </div>

              {/* Right Column: Summary & Caps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', margin: '0 0 16px 0' }}>
                    Season Summary
                  </h3>
                  <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '15px', margin: 0 }}>
                    {selectedWinner.Summary || `In the ${selectedWinner.Season} season of the Indian Premier League, ${selectedWinner.Winner} emerged victorious, defeating ${selectedWinner.Runner_up || 'their opponents'} in the grand finale.`}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                  {/* Orange Cap */}
                  <div style={{ flex: 1, background: 'rgba(234, 88, 12, 0.1)', border: '1px solid rgba(234, 88, 12, 0.3)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ color: '#f97316', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>🟠 ORANGE CAP</div>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>{selectedWinner.Orange_Cap}</div>
                  </div>
                  {/* Purple Cap */}
                  <div style={{ flex: 1, background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.3)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ color: '#a855f7', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>🟣 PURPLE CAP</div>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>{selectedWinner.Purple_Cap}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChampionsGallery;
