import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, FileText } from "lucide-react";
import { useAuth } from '../utils/AuthContext';
import Navbar from '../component/Navbar';
import BottomNav from '../component/BottomNav';
import PlayerDetailModal from '../component/PlayerDetailModal';
import { useLanguage } from '../utils/LanguageProvider.jsx';
import { toast } from 'react-hot-toast';


const Summary = ({ checkedPlayers, onCheckboxToggle }) => {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();

  const { getPlayers, getClubData, clearMatchesAndResetPlayers } = useAuth();
  
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [startPrice, setStartPrice] = useState(0);
  const [pricePerGame, setPricePerGame] = useState(0);
  const [skillFilter, setSkillFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [players, setPlayers] = useState([]);

  const getSkillLevelColor = (skill) => {
    switch(skill) {
      case 'VB': return 'bg-green-600 text-green-100';
      case 'BG': return 'bg-yellow-600 text-yellow-100';
      case 'N-': return 'bg-orange-600 text-orange-100';
      case 'N': return 'bg-red-600 text-red-100';
      case 'S': return 'bg-blue-600 text-blue-100';
      case 'P': return 'bg-purple-600 text-purple-100';
      default: return 'bg-gray-400 text-gray-100';
    }
  };

  // const handleCheckboxToggle = (playerId) => {
  //   setCheckedPlayers(prev => ({
  //     ...prev,
  //     [playerId]: !prev[playerId]
  //   }));
  // };


  const fetchPlayers = useCallback(async () => {
    try {
      const allPlayers = await getPlayers();
      const filtered = allPlayers.filter(player => player.club.includes(id));
      setPlayers(filtered);
    } catch (e) {
      console.error(e);
    }
  }, [getPlayers, id]);
  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const fetchClubs = useCallback(async (clubId) => {
    const data = await getClubData();

    const currentClub = data.find(c => c.id === clubId);
    if (currentClub) {
      setPricePerGame(currentClub.pricePerGame || 0);
      setStartPrice(currentClub.startPrice || 0);
    }

  }, [getClubData]);

  useEffect(() => {
    fetchClubs(id);
  }, [fetchClubs, id])

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkill = skillFilter === 'All' || player.skillLevel === skillFilter;
    return matchesSearch && matchesSkill;
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const aChecked = !!checkedPlayers[a.id];
    const bChecked = !!checkedPlayers[b.id];
    return aChecked - bChecked; // unchecked (false=0) stays top, checked (true=1) goes down
  });



  return (
    <div className="bg-neutral-100 w-full min-h-screen overflow-auto pb-16">
      <Navbar />
      <div className="flex justify-center items-center mx-2 md:mx-4 mt-3 md:mt-4 relatvie">
        <button
          onClick={() => navigate(-1)}
          className="top-[68px] left-4 z-50 fixed bg-white shadow-lg hover:shadow-xl border border-gray-200 rounded-full p-0.5 transition"
        >
          <ArrowLeft className="w-7 md:w-8 h-7 md:h-8 text-blue-600 cursor-pointer" />
        </button>
        <h1 className="flex text-center uppercase head-text">{t('summary')}</h1>
      </div>

      {/* Filter Players */}
      <div>
        <div className="flex md:flex-row flex-col justify-between md:justify-center items-center gap-4 mt-4 md:mt-6 mb-6">
          <div className="flex gap-2 md:gap-4">
            <div className="relative flex items-center w-[180px] lg:w-[220px]">
              <Search className="top-1/2 left-3 absolute w-3 h-3 text-gray-400 -translate-y-1/2 transform" />
              <input
                type="text"
                placeholder={t('search players...')}
                className="py-0.5 pr-2 pl-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full placeholder:text-xs placeholder:md:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="shadow-md px-2 md:px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
            >
              <option value="All">{t('all')}</option>
              <option value="VB">VB</option>
              <option value="BG">BG</option>
              <option value="N-">N-</option>
              <option value="N">N</option>
              <option value="S">S</option>
              <option value="P">P</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players Table */}
      <div className="px-3 md:px-8">
        <div className="bg-white shadow-md mx-auto my-4 px-0 border border-gray-300 rounded-lg max-w-6xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr className="rounded-t-lg">
                  <th className="px-4 md:px-4 py-3 font-medium text-gray-600 text-xs md:text-sm text-left uppercase tracking-wide">
                    {t('player')}
                  </th>
                  <th className="px-2 md:px-3 py-3 font-medium text-gray-600 text-xs md:text-sm text-left uppercase tracking-wide">
                    {t('games')}
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-xs md:text-sm text-left uppercase tracking-wide">
                    {t('total')}
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-xs md:text-sm text-left uppercase tracking-wide">
                    {t('paid')}
                  </th>
                  <th className="px-2 py-3 font-medium text-gray-600 text-xs md:text-sm text-left uppercase tracking-wide">
                    {t('details')}
                  </th>
                  
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPlayers.map((player) => (
                  <tr 
                    key={player.id}
                    className=""
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        
                        <span className={`px-1.5 py-0.5 text-[10px] md:text-xs font-medium rounded-full ${getSkillLevelColor(player.skillLevel)}`}>
                          {player.skillLevel}
                        </span>
                        <h1 className="font-medium text-gray-900 text-sm">
                          {player.name}
                        </h1>

                      </div>
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap">
                      <span className="flex px-2 py-1 rounded-full font-medium text-sm">
                        {player.gamesPlayed}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full font-medium text-sm">
                        {player.gamesPlayed === 0
                          ? 0
                          : startPrice + (player.gamesPlayed * pricePerGame)}฿
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full font-medium text-sm">
                        <input
                          type="checkbox"
                          checked={!!checkedPlayers[player.id]}
                          onChange={() => {
                            const isChecked = !!checkedPlayers[player.id];
                            const confirmed = window.confirm(
                              isChecked ? t("Uncheck this player?") : t("Check this player?")
                            );
                            if (confirmed) {
                              onCheckboxToggle(player.id);
                            }
                          }}
                          className='rounded w-5 h-5 checked:scale-90 transition-transform duration-300 ease-in-out accent-blue-500 transform'
                        />
                      </span>
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap" onClick={() => setSelectedPlayer(player)} >
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // prevent row click if needed
                          setSelectedPlayer(player);
                        }}
                        className="p-1 rounded transition-colors"
                      >
                        <FileText className="w-5 h-5 text-gray-500 hover:text-blue-500 transition-colors" />
                      </button>
                    </td>
                    {/* <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full font-medium text-sm">
                        {pricePerGame}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full font-medium text-xs md:text-sm">
                        {startPrice}
                      </span>
                    </td> */}
                  </tr>
                ))} 
              </tbody>
            </table>
            
          </div>
        </div>
      </div>

      {/* Clear Data button*/}
      <div className='flex justify-center mb-6'>
        <button
          onClick={async () => {
            const confirmClear = window.confirm(t("Are you sure you want to clear all matches?"));
            if (!confirmClear) return;

            // Instant UI update
            setPlayers(prev =>
              prev.map(player => ({ ...player, gamesPlayed: 0 }))
            );
            toast.loading(t("Clearing matches..."));

            // Then background deletion
            const result = await clearMatchesAndResetPlayers();

            toast.dismiss();
            
            if (result) {
              setPlayers(prev =>
                prev.map(player => ({ ...player, gamesPlayed: 0 }))
              );
              toast.success(t("Matches cleared."));
              // optionally refresh data or UI
            } else {
              toast.error(t("Something went wrong."));
            }
          }}
          className="mt-3 rounded-xl font-semibold text-red-500 hover:text-red-700 md:text-base transition"
        >
          {t('Clear All Data')}
        </button>
      </div>
      
      {/* Detail of Player */}
      <PlayerDetailModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
        pricePerGame={pricePerGame}
        startPrice={startPrice}
      />
      <BottomNav />
    </div>
  );
}

export default Summary
