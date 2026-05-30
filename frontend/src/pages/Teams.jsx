import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import axios from 'axios';
import TeamCard from '../components/TeamCard';
import SquadModal from '../components/SquadModal';
import { teamsData } from '../data/mockData';

export default function Teams() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/teams");
        setTeams(res.data);
      } catch (err) {
        console.error("Failed to fetch teams:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Shield size={22} color="#60a5fa" />
          <h2 style={{
            fontSize: '28px', color: '#60a5fa', fontWeight: '800',
            letterSpacing: 2, margin: 0, textTransform: 'uppercase'
          }}>
            IPL 2026 TEAMS
          </h2>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#fff", textAlign: "center" }}>Loading Teams...</div>
      ) : (
        /* Team Cards Grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '24px'
        }}>
          {teams.map(team => {
            const mockTeam = teamsData.find(t => t.shortName === team.shortName) || {};
            return (
              <TeamCard
                key={team._id || team.id || team.shortName}
                team={{
                  ...team,
                  id: team.shortName?.toLowerCase(), // Map MongoDB structure to what TeamCard expects
                  logo: team.logoUrl || `/teams/${team.shortName?.toLowerCase()}.jpg`,
                  captain: typeof team.captain === 'object' ? team.captain : (mockTeam.captain || { name: team.captain, image: `http://localhost:5000/data/captains/${team.captain}.jpg` }),
                  titles: team.championshipWins?.length || 0,
                  color: mockTeam.color || '#facc15'
                }}
                onOpenSquad={(t) => setSelectedTeam(t)}
              />
            );
          })}
        </div>
      )}

      {/* Squad Modal */}
      {selectedTeam && (
        <SquadModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}
