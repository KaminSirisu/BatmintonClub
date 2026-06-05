import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, FileText, Sheet } from "lucide-react";
import { useAuth } from '../utils/AuthContext';
import Navbar from '../component/Navbar';
import BottomNav from '../component/BottomNav';
import PlayerDetailModal from '../component/PlayerDetailModal';
import { useLanguage } from '../utils/LanguageProvider.jsx';
import { toast } from 'react-hot-toast';
import sheets from '../assets/sheets.png';

const getBangkokToday = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
};

const Summary = () => {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();

  const { getPlayers, getClubData, clearMatchesAndResetPlayers, updatedPlayers } = useAuth();
  
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [startPrice, setStartPrice] = useState(0);
  const [pricePerGame, setPricePerGame] = useState(0);
  const [skillFilter, setSkillFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [players, setPlayers] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [targetDate, setTargetDate] = useState(getBangkokToday());
  const [courtCost, setCourtCost] = useState('');
  const [shuttlecockCost, setShuttlecockCost] = useState('');
  const [isExporting, setIsExporting] = useState(false);

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

  const handlePaidStatusChange = async (player) => {
    const nextPaidStatus = !player.paidStatus;
    const confirmed = window.confirm(
      nextPaidStatus ? t("Check this player?") : t("Uncheck this player?")
    );

    if (!confirmed) return;

    setPlayers(prevPlayers =>
      prevPlayers.map(currentPlayer =>
        currentPlayer.id === player.id
          ? { ...currentPlayer, paidStatus: nextPaidStatus }
          : currentPlayer
      )
    );

    const success = await updatedPlayers(player.id, {
      paidStatus: nextPaidStatus ? 'paid' : 'unpaid',
    });

    if (!success) {
      setPlayers(prevPlayers =>
        prevPlayers.map(currentPlayer =>
          currentPlayer.id === player.id
            ? { ...currentPlayer, paidStatus: player.paidStatus }
            : currentPlayer
        )
      );
      toast.error(t("Something went wrong."));
    }
  };

  const handleExport = async ({ overwrite = false } = {}) => {
    const apiUrl = import.meta.env.VITE_API_URL;

    if (!apiUrl) {
      toast.error(t("VITE_API_URL is missing."));
      return;
    }

    const exportablePlayers = players.filter((player) => Number(player.gamesPlayed) > 0);

    if (exportablePlayers.length === 0) {
      toast.error(t("No players with games played to export."));
      return;
    }

    let totalRevenue = 0;
    exportablePlayers.forEach(player => {
      const gamesPlayed = Number(player.gamesPlayed) || 0;
      totalRevenue += gamesPlayed === 0 ? 0 : startPrice + (gamesPlayed * pricePerGame);
    });

    const playerRows = exportablePlayers.map((player) => {
      const gamesPlayed = Number(player.gamesPlayed) || 0;

      return [
        targetDate,
        player.name,
        player.skillLevel,
        gamesPlayed,
        gamesPlayed === 0 ? 0 : startPrice + (gamesPlayed * pricePerGame),
        player.paidStatus ? 'paid' : 'unpaid',
      ];
    });

    const expenseRow = [
      targetDate,
      Number(courtCost) || 0,
      Number(shuttlecockCost) || 0,
      totalRevenue,
    ];

    try {
      setIsExporting(true);

      const response = await fetch(`${apiUrl}/api/export/google-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetDate,
          playerRows,
          expenseRow,
          overwrite,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Google Sheets export failed");
      }

      if (result.alreadyExported) {
        setShowExportModal(false);
        setShowOverwriteModal(true);
        return;
      }

      setShowExportModal(false);
      setShowOverwriteModal(false);
      toast.success(t("Export successful."));
    } catch (error) {
      console.error("Google Sheets export failed:", error);
      toast.error(error?.message || t("Something went wrong."));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-neutral-100 w-full min-h-screen overflow-auto pb-16">
      <Navbar />
      <div className="flex justify-center items-center mx-2 md:mx-4 mt-3 md:mt-4 relatvie">
        <button
          onClick={() => navigate(-1)}
          className="top-[60px] sm:top-[70px] left-4 z-50 fixed bg-white shadow-lg hover:shadow-xl border border-gray-200 rounded-full transition"
        >
          <ArrowLeft className="w-7 md:w-8 h-7 md:h-8 text-blue-600 cursor-pointer" />
        </button>
        <h1 className="flex text-center uppercase head-text">{t('summary')}</h1>
      </div>

      {/* Filter Players */}
      <div>
        <div className="flex md:flex-row flex-col justify-between md:justify-center items-center gap-4 mt-3 md:mt-6 mb-3 md:mb-6">
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
                {filteredPlayers.map((player) => (
                  <tr 
                    key={player.id}
                    className=""
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        
                        <span className={`px-1.5 py-0.5 text-[10px] md:text-xs font-medium rounded-full ${getSkillLevelColor(player.skillLevel)}`}>
                          {player.skillLevel}
                        </span>
                        <h1 className="font-medium text-gray-900 text-xs sm:text-sm">
                          {player.name}
                        </h1>

                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className="flex px-2 py-1 rounded-full font-medium text-xs sm:text-sm">
                        {player.gamesPlayed}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full font-medium text-xs sm:text-sm">
                        {player.gamesPlayed === 0
                          ? 0
                          : startPrice + (player.gamesPlayed * pricePerGame)}฿
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full font-medium text-sm">
                        <input
                          type="checkbox"
                          checked={!!player.paidStatus}
                          onChange={() => handlePaidStatusChange(player)}
                          className='rounded w-5 h-5 checked:scale-90 transition-transform duration-300 ease-in-out accent-blue-500 transform'
                        />
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap" onClick={() => setSelectedPlayer(player)} >
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
      
      <div className="flex items-center gap-3 mb-3 sm:mb-6 justify-center">
        {/* Export Data button */}
        <button
          type="button"
          onClick={() => setShowExportModal(true)}
          className="bg-white hover:bg-green-600 shadow-sm px-4 py-2 rounded-xl font-semibold text-sm text-green-600 hover:text-white transition flex items-center gap-1"
        >
          {t('Export to Google Sheets')}
          <img src={sheets} alt="Google Sheets" className="w-4 h-4" />
        </button>
        {/* Clear Data button*/}
        <button
          onClick={async () => {
            const confirmClear = window.confirm(t("Are you sure you want to clear all matches?"));
            if (!confirmClear) return;

            // Instant UI update
            setPlayers(prev =>
              prev.map(player => ({ 
                ...player, 
                gamesPlayed: 0, 
                paidStatus: false,
              }))
            );
            toast.loading(t("Clearing matches..."));

            // Then background deletion
            const result = await clearMatchesAndResetPlayers();

            toast.dismiss();
            
            if (result) {
              setPlayers(prev =>
                prev.map(player => ({ 
                  ...player, 
                  gamesPlayed: 0, 
                  paidStatus: false, 
                }))
              );
              toast.success(t("Matches cleared."));
              // optionally refresh data or UI
            } else {
              toast.error(t("Something went wrong."));
            }
          }}
          className="px-4 py-2 bg-white hover:bg-red-500 rounded-xl shadow-sm font-semibold text-red-500 hover:text-white text-sm transition"
        >
          {t('Clear All Data')}
        </button>
      </div>
      
      {showExportModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/40 px-4">
          <div className="bg-white shadow-xl p-5 rounded-lg w-full max-w-md">
            <div className="mb-4">
              <h2 className="font-semibold text-gray-900 text-lg">
                {t('Export Data')}
              </h2>
              <p className="mt-1 text-gray-500 text-sm">
                {t('Enter optional expenses before exporting this session.')}
              </p>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="block mb-1 font-medium text-gray-700 text-sm">
                  {t('Export Date')}
                </span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm"
                />
              </label>

              <label className="block">
                <span className="block mb-1 font-medium text-gray-700 text-sm">
                  {t('Total Paid Court Cost')}
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={courtCost}
                  onChange={(event) => setCourtCost(event.target.value)}
                  placeholder="0"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm"
                />
              </label>

              <label className="block">
                <span className="block mb-1 font-medium text-gray-700 text-sm">
                  {t('Total Shuttlecock Cost')}
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={shuttlecockCost}
                  onChange={(event) => setShuttlecockCost(event.target.value)}
                  placeholder="0"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 text-sm disabled:opacity-60"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleExport({ overwrite: false })}
                disabled={isExporting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 rounded-lg font-semibold text-sm text-white"
              >
                {isExporting ? t('Exporting...') : t('Confirm Export Now')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOverwriteModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/40 px-4">
          <div className="bg-white shadow-xl p-5 rounded-lg w-full max-w-md">
            <h2 className="font-semibold text-gray-900 text-lg">
              {t('Overwrite existing export?')}
            </h2>
            <p className="mt-2 text-gray-600 text-sm">
              {t('Data for this date has already been exported. Do you want to overwrite it?')}
            </p>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowOverwriteModal(false)}
                disabled={isExporting}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 text-sm disabled:opacity-60"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleExport({ overwrite: true })}
                disabled={isExporting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-60 px-4 py-2 rounded-lg font-semibold text-sm text-white"
              >
                {isExporting ? t('Exporting...') : t('Yes, Overwrite')}
              </button>
            </div>
          </div>
        </div>
      )}
      
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
