import { Link, useParams } from "react-router-dom"
import Navbar from "../component/Navbar.jsx";
import BottomNav from '../component/BottomNav.jsx';
import { useAuth } from '../utils/AuthContext.jsx';
import { ArrowDownWideNarrow, ArrowLeft, History, Plus, Users, X, Filter, Clock, Radio } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from 'react-hot-toast';
import tennisCourt from '../assets/tennis-court.png';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../utils/LanguageProvider.jsx';

const MotionDiv = motion.div;

const getMatchStorageKey = (clubId) => `matches:${clubId}`;

const buildMatchFingerprint = (match) => {
  const playerNames = [
    match?.team1?.player1?.name,
    match?.team1?.player2?.name,
    match?.team2?.player1?.name,
    match?.team2?.player2?.name,
  ];

  return `${match?.courtNumber ?? ''}|${playerNames.join('|').toLowerCase()}`;
};

const buildDashboardFingerprint = (match) => (
  `${match?.court ?? ''}|${(match?.players || []).join('|').toLowerCase()}`
);

const syncLocalMatchesWithDashboard = (savedMatches, dashboardMatches) => {
  const activeDashboardMatches = dashboardMatches.filter(
    (match) => match.status === 'WAITING' || match.status === 'PLAYING'
  );
  const dashboardByFingerprint = new Map(
    activeDashboardMatches.map((match) => [buildDashboardFingerprint(match), match])
  );

  return savedMatches.map((match) => {
    if (match.matchStatus !== 'waiting' && match.matchStatus !== 'playing') {
      return match;
    }

    const dashboardMatch = dashboardByFingerprint.get(buildMatchFingerprint(match));

    if (!dashboardMatch) {
      return {
        ...match,
        matchStatus: 'draft',
        dashboardMatchId: null,
        startTimestamp: null,
      };
    }

    return {
      ...match,
      matchStatus: dashboardMatch.status === 'PLAYING' ? 'playing' : 'waiting',
      dashboardMatchId: dashboardMatch.id,
    };
  });
};

const CourtPlayer = () => {
  const {
    getPlayers,
    getDashboardMatchesByClubId,
    incrementGamePlayed,
    queueDashboardMatch,
    startDashboardMatch,
    endDashboardMatch,
  } = useAuth();
  const { id } = useParams();
  const { t } = useLanguage();

  const [suggestedMatch, setSuggestedMatch] = useState(null);
  const [matches, setMatches] = useState([]);
  const [skillFilters, setSkillFilters] = useState({});
  const [players, setPlayers] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [sortFewestGamesFirst, setSortFewestGamesFirst] = useState(false);

  const skillLevels = ['All', 'VB', 'BG', 'N-', 'N', 'S', 'P'];

  const skillWeights = {
    'VB': 20,
    'BG': 30,
    'N-': 40,
    'N': 50,
    'S': 60,
    'P': 70
  };

  const generateBalancedMatches = (filteredPlayers) => {
    const availablePlayers = [...filteredPlayers].sort((a, b) => a.gamesPlayed - b.gamesPlayed || Math.random() - 0.5);
    const numSuggestions = getNumSuggestions(availablePlayers.length);
    const suggestions = [];

    if (availablePlayers.length < 4) {
      toast.error(t("Not enough players to generate suggestions"));
      return [];
    }

    const getWeight = player => skillWeights[player.skillLevel] || 40;

    const usedPlayerIds = new Set();

    for (let s = 0; s < numSuggestions; s++) {
      let bestMatch = null;
      let smallestDiff = Infinity;

      for (let i = 0; i < availablePlayers.length; i++) {
        if (usedPlayerIds.has(availablePlayers[i].id)) continue;
        for (let j = i + 1; j < availablePlayers.length; j++) {
          if (usedPlayerIds.has(availablePlayers[j].id)) continue;
          for (let k = 0; k < availablePlayers.length; k++) {
            if (k === i || k === j || usedPlayerIds.has(availablePlayers[k].id)) continue;
            for (let l = k + 1; l < availablePlayers.length; l++) {
              if (l === i || l === j || usedPlayerIds.has(availablePlayers[l].id)) continue;

              const team1 = [availablePlayers[i], availablePlayers[j]];
              const team2 = [availablePlayers[k], availablePlayers[l]];

              const team1Total = team1.reduce((sum, p) => sum + getWeight(p), 0);
              const team2Total = team2.reduce((sum, p) => sum + getWeight(p), 0);

              const diff = Math.abs(team1Total - team2Total);

              if (diff <= 10 && diff < smallestDiff) {
                smallestDiff = diff;
                bestMatch = {
                  id: Date.now() + s, // ensure unique
                  courtNumber: null,
                  team1: { player1: team1[0], player2: team1[1] },
                  team2: { player1: team2[0], player2: team2[1] },
                  isCompleted: false
                };
              }
            }
          }
        }
      }

      if (bestMatch) {
        // Mark players as used
        usedPlayerIds.add(bestMatch.team1.player1.id);
        usedPlayerIds.add(bestMatch.team1.player2.id);
        usedPlayerIds.add(bestMatch.team2.player1.id);
        usedPlayerIds.add(bestMatch.team2.player2.id);
        suggestions.push(bestMatch);
      } else {
        break; // stop if no further match found
      }
    }
    if (suggestions.length === 0) {
      toast.error(t("No balanced matches found within ±10%"));
    }
    return suggestions;
  };

  const getNumSuggestions = (playerCount) => {
    if (playerCount < 8) return 2;
    if (playerCount < 16) return 3;
    if (playerCount < 24) return 5;
    if (playerCount < 36) return 8;
    if (playerCount < 44) return 10;
    return 12;
  };

  const handleUseSuggestedMatch = (usedMatchIndex) => {
    const matchToUse = suggestedMatch[usedMatchIndex];

    // Add to main matches
    setMatches(prev => [
      ...prev,
      { ...matchToUse, id: Date.now(), matchStatus: 'draft', dashboardMatchId: null, startTimestamp: null }
    ]);

    // Remove the used match from suggestions
    const updatedSuggestions = [...suggestedMatch];
    updatedSuggestions.splice(usedMatchIndex, 1);

    const unpaidPlayers = players.filter(player => !player.paidStatus);
    // Try to generate one new suggestion
    const newSuggestions = generateBalancedMatches(unpaidPlayers);
    if (newSuggestions.length > 0) {
      // Only add one new suggestion (replace the removed one)
      updatedSuggestions.push(newSuggestions[0]);
    }

    // Update suggested matches
    setSuggestedMatch(updatedSuggestions);
  };


  const SkillBadge = ({ skillLevel, className = '' }) => {
    return (
      <span
        className={`inline-block px-1 py-0.5 rounded text-xs font-medium ${getSkillColor(skillLevel)} ${className}`}
      >
        {skillLevel}
      </span>
    );
  };

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


  // Load and reconcile saved matches on mount
  useEffect(() => {
    let isMounted = true;

    const loadMatches = async () => {
      try {
        const storageKey = getMatchStorageKey(id);
        const savedMatchesRaw = localStorage.getItem(storageKey) ?? localStorage.getItem("matches");
        if (!savedMatchesRaw) return;

        const parsedMatches = JSON.parse(savedMatchesRaw);
        const dashboardMatches = await getDashboardMatchesByClubId(id);
        const syncedMatches = syncLocalMatchesWithDashboard(parsedMatches, dashboardMatches);

        if (!isMounted) return;

        setMatches(syncedMatches);
        localStorage.setItem(storageKey, JSON.stringify(syncedMatches));
        localStorage.removeItem("matches");
      } catch (error) {
        console.error("Failed to restore local matches:", error);
      }
    };

    loadMatches();

    return () => {
      isMounted = false;
    };
  }, [getDashboardMatchesByClubId, id]);

  // Save matches to localStorage whenever they change
  useEffect(() => {
    const storageKey = getMatchStorageKey(id);
    if (matches.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(matches));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [id, matches]);

  const handleSubmit = () => {
    const newMatch = {
      id: Date.now(),
      courtNumber: null,
      team1: { player1: null, player2: null },
      team2: { player1: null, player2: null },
      isCompleted: false,
      // dashboard lifecycle fields
      matchStatus: 'draft',   // 'draft' | 'waiting' | 'playing'
      dashboardMatchId: null, // Appwrite document $id once queued
      startTimestamp: null,   // ms timestamp when match started
    };
    const updatedMatches = [...matches, newMatch];
    setMatches(updatedMatches);
  };

  const handleQueueMatch = async (matchId) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const { team1, team2, courtNumber } = match;
    if (!courtNumber || !team1?.player1 || !team1?.player2 || !team2?.player1 || !team2?.player2) {
      toast.error(t("Please complete the court and player selection"));
      return;
    }

    try {
      const doc = await queueDashboardMatch({
        players: [team1.player1.name, team1.player2.name, team2.player1.name, team2.player2.name],
        court: courtNumber,
        clubId: id,
      });
      setMatches(prev => prev.map(m =>
        m.id === matchId ? { ...m, matchStatus: 'waiting', dashboardMatchId: doc.$id } : m
      ));
      toast.success(t("Match is now WAITING — visible in Live Scores!"));
    } catch {
      toast.error(t("Failed to queue match"));
    }
  };

  const handleStartMatch = async (matchId) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const { team1, team2, courtNumber, dashboardMatchId } = match;
    if (!courtNumber || !team1?.player1 || !team1?.player2 || !team2?.player1 || !team2?.player2) {
      toast.error(t("Please complete the court and player selection"));
      return;
    }

    try {
      const resolvedDashboardMatchId = await startDashboardMatch(dashboardMatchId, {
        players: [team1.player1.name, team1.player2.name, team2.player1.name, team2.player2.name],
        court: courtNumber,
        clubId: id,
        startTime: new Date().toISOString(),
      });
      setMatches(prev => prev.map(m =>
        m.id === matchId
          ? {
            ...m,
            matchStatus: 'playing',
            dashboardMatchId: resolvedDashboardMatchId || m.dashboardMatchId,
            startTimestamp: Date.now(),
          }
          : m
      ));
    } catch {
      toast.error(t("Failed to start match"));
    }
  };

  const handleEndMatch = async (matchId) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const { team1, team2, courtNumber, dashboardMatchId, startTimestamp } = match;

    if (!courtNumber || !team1.player1 || !team1.player2 || !team2.player1 || !team2.player2) {
      toast.error(t("Please complete the court and player selection"));
      return;
    }

    try {
      const totalTime = startTimestamp ? Math.round((Date.now() - startTimestamp) / 60000) : null;

      await endDashboardMatch(dashboardMatchId, {
        totalTime,
        fallbackData: {
          players: [team1.player1.name, team1.player2.name, team2.player1.name, team2.player2.name],
          court: courtNumber,
          clubId: id,
          startTime: new Date().toISOString(),
        },
      });

      setMatches(prev => prev.filter(m => m.id !== matchId));

      const playerIds = [team1.player1.id, team1.player2.id, team2.player1.id, team2.player2.id];
      Promise.all(playerIds.map(pid => incrementGamePlayed(pid)))
        .catch(e => console.error("Error incrementing gamesPlayed:", e));

    } catch {
      toast.error(t("Failed to end match"));
    }
  };

  const getFilteredPlayers = (matchId, team, position) => {
    const filter = skillFilters[matchId] || 'All';
    const match = matches.find(m => m.id === matchId);

    if (!match) return players;

    const currentSelectedPlayerId = match[team]?.[position]?.id;

    const selectedPlayerIds = matches.flatMap(m =>
      [m.team1.player1?.id, m.team1.player2?.id, m.team2.player1?.id, m.team2.player2?.id].filter(Boolean)
    );

    const filteredPlayers = players.filter(player =>
      (
        // ✅ Allow if:
        !selectedPlayerIds.includes(player.id) ||         // Not selected anywhere
        player.id === currentSelectedPlayerId             // OR currently selected in this slot
      ) &&
      (
        !player.paidStatus ||
        player.id === currentSelectedPlayerId
      ) &&
      (
        filter === 'All' ||                               // OR skill filter matches
        player.id === currentSelectedPlayerId ||          // OR currently selected in this slot
        player.skillLevel === filter
      )
    );

    if (!sortFewestGamesFirst) {
      return filteredPlayers;
    }

    return [...filteredPlayers].sort((a, b) => 
      (Number(a.gamesPlayed) || 0) - (Number(b.gamesPlayed) || 0)
    );

  };


  const updateSkillFilter = (matchId, level) => {
    setSkillFilters(prev => ({ ...prev, [matchId]: level }));
  };

  const selectPlayer = (matchId, team, position, playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setMatches(prevMatches => 
      prevMatches.map(match => {
        if (match.id === matchId) {
          const updatedMatch = { ...match };
          updatedMatch[team][position] = player;
          return updatedMatch;
        }
        return match;
      })
    );

  };


  const getSkillColor = (skill) => {
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

  const SortFewestGamesButton = ({ className = '' }) => (
    <button
      type="button"
      onClick={() => setSortFewestGamesFirst(prev => !prev)}
      aria-pressed={sortFewestGamesFirst}
      className={`flex items-center gap-1.5 shadow-sm px-3 py-1.5 border rounded-full font-medium text-xs md:text-sm transition-colors ${
        sortFewestGamesFirst
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      } ${className}`}
    >
      <ArrowDownWideNarrow size={15} />
      <span>{t('fewestGamesFirst')}</span>
    </button>
  );



  return (
    <div className="bg-neutral-50 w-full min-h-screen overflow-auto">
      <Navbar />
      <div className="mx-2 md:mx-4 mt-3 md:mt-5">
        
        <div className="flex justify-between items-center mx-auto md:mt-1">

          <div className="flex flex-row items-center gap-1 md:gap-3">
            <Link to="/" className="top-17 left-4 z-50 fixed bg-white shadow-lg hover:shadow-xl border border-gray-200 rounded-full transition">
              <ArrowLeft className="w-7 md:w-8 h-7 md:h-8 text-blue-600 cursor-pointer"/>
            </Link>

            <h1 className='pl-12 uppercase head-text'>{t('matchmaking')}</h1>
            {/* <h2 className="text-[11px] text-gray-500 md:text-[14px]">Create balanced matches for your club members</h2> */}

          </div> 
          
          <div className="flex flex-row items-center gap-1 md:gap-2">
            {/* Suggest */}
            <button 
              className="flex items-center gap-1 bg-white hover:bg-gray-500 shadow-sm px-2 py-1 rounded-2xl text-black hover:text-white transition-colors"
              onClick={() => {
                // Filter out checked players before generating matches
                const unpaidPlayers = players.filter(player => !player.paidStatus);

                // Pass filtered players to your function
                const matches = generateBalancedMatches(unpaidPlayers);
                if (matches.length > 0) {
                    setSuggestedMatch(matches);
                    setShowSuggest(true);
                }
              }}
            >
              <span className="text-base">💡</span>
              <span className="hidden md:inline text-xs md:text-sm">
                {t('suggest')}
              </span>
            </button>
            {/* History */}
            <Link
              to={`/history/${id}`}
              className="flex items-center gap-1 bg-white hover:bg-gray-600 shadow-sm px-2 py-1.5 border rounded-2xl text-gray-600 hover:text-white text-xs"
            >
              <History className="flex justify-center" size={15} />
            </Link>
            {/* Create Match */}
            <button 
              onClick={handleSubmit}
              className="flex items-center gap-1 bg-white hover:bg-blue-600 shadow-sm px-2 py-1.5 border rounded-2xl text-blue-600 hover:text-white text-xs transition-colors"
            >
              <Plus size={15} />
              <h1 className="font-medium text-xs md:text-sm">{t('newMatch')}</h1>
            </button>
            <SortFewestGamesButton className="hidden md:flex" />
          </div>
          
        </div>
        <div className="flex justify-end mt-2 md:hidden">
          <SortFewestGamesButton />
        </div>
      </div>

      <div className="mx-auto mt-2 md:mt-4 mb-20 max-w-7xl">
        {/* Matches Grid */}
        <AnimatePresence>
          <div className="gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mx-4 md:mx-6">
            {matches.map(match => (
              <MotionDiv 
                key={match.id} 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden"
              >
                {/* <div className="flex justify-between items-center bg-gradient-to-r from-blue-500 to-purple-600 p-3 text-white">
                  <div className="flex items-center gap-1">
                    <Users size={18} />
                    <h3 className="font-bold text-sm">#{match.id.toString().slice(-4)}</h3>
                  </div>
                  <button onClick={() => setMatches(matches.filter(m => m.id !== match.id))}>
                    <X size={16} className="text-white hover:text-red-500" />
                  </button>
                </div> */}
                <div className="p-2.5">
                  {/* Card header: status badge + court/skill controls + delete */}
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                    <div className="flex items-center">
                      {match.matchStatus === 'waiting' && (
                        <span className="flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-full font-semibold text-[10px] text-amber-700 uppercase tracking-wide">
                          <Clock size={10} /> Waiting
                        </span>
                      )}
                      {match.matchStatus === 'playing' && (
                        <span className="flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded-full font-semibold text-[10px] text-red-600 uppercase tracking-wide animate-pulse">
                          <Radio size={10} /> Live
                        </span>
                      )}
                      {(!match.matchStatus || match.matchStatus === 'draft') && (
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full font-semibold text-[10px] text-gray-500 uppercase tracking-wide">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <img src={tennisCourt} alt={t('Tennis Court')} className="self-center w-5 h-5"/>
                      <select
                        className="disabled:opacity-50 px-1.5 py-1 border border-gray-300 rounded-lg text-[10px] disabled:cursor-not-allowed"
                        disabled={match.matchStatus === 'waiting' || match.matchStatus === 'playing'}
                        onChange={e => {
                          const courtNum = parseInt(e.target.value);
                          setMatches(matches.map(m => m.id === match.id ? { ...m, courtNumber: courtNum } : m));
                        }}
                        value={match.courtNumber || ""}
                      >
                        <option value="" disabled>
                          {t('court')}
                        </option>
                        {Array.from({ length: 20 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>

                      <Filter size={13} className="self-center text-gray-500" />
                      <select
                        value={skillFilters[match.id] || 'All'}
                        onChange={(e) => updateSkillFilter(match.id, e.target.value)}
                        disabled={match.matchStatus === 'waiting' || match.matchStatus === 'playing'}
                        className="disabled:opacity-50 px-1.5 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-[10px] disabled:cursor-not-allowed"
                      >
                        {skillLevels.map(level => (
                          <option key={level} value={level}>{t(`${level}`)}</option>
                        ))}
                      </select>
                    </div>

                    {match.matchStatus === 'draft' || !match.matchStatus ? (
                      <button
                        onClick={() => setMatches(matches.filter(m => m.id !== match.id))}
                      >
                        <X size={16} className="text-black hover:text-red-500" />
                      </button>
                    ) : (
                      <div className="w-4" />
                    )}
                  </div>

                  {/* Team 1 */}
                  <div className="mb-2">
                    <h4 className="flex items-center gap-1 mb-1.5 font-semibold text-gray-800 text-xs">
                      <div className="bg-blue-500 rounded-full w-2 h-2"></div>
                      {t('Team 1')}
                    </h4>
                    <div className="gap-2 grid grid-cols-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={match.team1.player1?.id || ''}
                          onChange={(e) => selectPlayer(match.id, 'team1', 'player1',e.target.value)}
                          disabled={match.matchStatus === 'waiting' || match.matchStatus === 'playing'}
                          className="disabled:opacity-50 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-xs disabled:cursor-not-allowed"
                        >
                          <option value=''>{t('selectPlayer')}</option>
                          {getFilteredPlayers(match.id, 'team1', 'player1').map(player => (
                            <option key={player.id} value={player.id}>
                              {player.name} ({Number(player.gamesPlayed) || 0} {t('games')})
                            </option>
                          ))}
                        </select>
                        <AnimatePresence>
                          {match.team1.player1 && (
                            <MotionDiv
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              transition={{ duration: 0.5 }}
                              key={match.team1.player1.id}
                            >
                              <SkillBadge
                                skillLevel={match.team1.player1.skillLevel}
                              />
                            </MotionDiv>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={match.team1.player2?.id || ''}
                          onChange={(e) => selectPlayer(match.id, 'team1', 'player2', e.target.value)}
                          disabled={match.matchStatus === 'waiting' || match.matchStatus === 'playing'}
                          className="disabled:opacity-50 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-xs disabled:cursor-not-allowed"
                        >
                          <option value="">{t('selectPlayer')}</option>
                          {getFilteredPlayers(match.id, 'team1', 'player2').map(player => (
                            <option key={player.id} value={player.id}>
                              {player.name} ({Number(player.gamesPlayed) || 0} {t('games')})
                            </option>
                          ))}
                        </select>
                        <AnimatePresence>
                          {match.team1.player2 && (
                            <MotionDiv
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              transition={{ duration: 0.2 }}
                              key={match.team1.player2.id}
                            >
                              <SkillBadge
                                skillLevel={match.team1.player2.skillLevel}
                              />
                            </MotionDiv>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* VS Divider */}
                  <div className="my-0 text-center">
                    <span className="mx-2 font-semibold text-gray-500 text-xs">VS</span>
                  </div>

                  {/* Team 2 */}
                  <div className="mb-2">
                    <h4 className="flex items-center gap-1 mb-1.5 font-semibold text-gray-800 text-xs">
                      <div className="bg-red-500 rounded-full w-2 h-2"></div>
                      {t('Team 2')}
                    </h4>
                    <div className="gap-2 grid grid-cols-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={match.team2.player1?.id || ''}
                          onChange={(e) => selectPlayer(match.id, 'team2', 'player1', e.target.value)}
                          disabled={match.matchStatus === 'waiting' || match.matchStatus === 'playing'}
                          className="disabled:opacity-50 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-xs disabled:cursor-not-allowed"
                        >
                          <option value="">{t('selectPlayer')}</option>
                          {getFilteredPlayers(match.id, 'team2', 'player1').map(player => (
                            <option key={player.id} value={player.id}>
                              {player.name} ({Number(player.gamesPlayed) || 0} {t('games')})
                            </option>
                          ))}
                        </select>
                        <AnimatePresence>
                            {match.team2.player1 && (
                              <MotionDiv
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                                key={match.team2.player1.id}
                              >
                                <SkillBadge
                                  skillLevel={match.team2.player1.skillLevel}
                                />
                              </MotionDiv>
                            )}
                          </AnimatePresence>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={match.team2.player2?.id || ''}
                          onChange={(e) => selectPlayer(match.id, 'team2', 'player2', e.target.value)}
                          disabled={match.matchStatus === 'waiting' || match.matchStatus === 'playing'}
                          className="disabled:opacity-50 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-xs disabled:cursor-not-allowed"
                        >
                          <option value="">{t('selectPlayer')}</option>
                          {getFilteredPlayers(match.id, 'team2', 'player2').map(player => (
                            <option key={player.id} value={player.id}>
                              {player.name} ({Number(player.gamesPlayed) || 0} {t('games')})
                            </option>
                          ))}
                        </select>
                        <AnimatePresence>
                            {match.team2.player2 && (
                              <MotionDiv
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                                key={match.team2.player2.id}
                              >
                                <SkillBadge
                                  skillLevel={match.team2.player2.skillLevel}
                                />
                              </MotionDiv>
                            )}
                          </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons — 3-step lifecycle */}
                  {(!match.matchStatus || match.matchStatus === 'draft') && (
                    <button
                      onClick={() => handleQueueMatch(match.id)}
                      className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 py-1.5 rounded-xl w-full font-medium text-white text-xs transition-colors"
                    >
                      {t('Set as Waiting')}
                    </button>
                  )}
                  {match.matchStatus === 'waiting' && (
                    <button
                      onClick={() => handleStartMatch(match.id)}
                      className="bg-green-500 hover:bg-green-600 active:bg-green-700 py-1.5 rounded-xl w-full font-medium text-white text-xs transition-colors"
                    >
                      {t('startMatch')}
                    </button>
                  )}
                  {match.matchStatus === 'playing' && (
                    <button
                      onClick={() => handleEndMatch(match.id)}
                      className="bg-red-500 hover:bg-red-600 active:bg-red-700 py-1.5 rounded-xl w-full font-medium text-white text-xs transition-colors"
                    >
                      {t('End Match')}
                    </button>
                  )}
                </div>
              </MotionDiv>
            ))}
          </div>
        </AnimatePresence>
        
        {showSuggest && suggestedMatch && suggestedMatch.length > 0 && (
          <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
            <div className="bg-white mx-3 md:mx-6 p-4 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-2 sm:mb-4">
                <h2 className="font-bold text-lg">{t('suggest')}</h2>
                <button
                  onClick={() => setShowSuggest(false)}
                  className='text-gray-500 hover:text-gray-800 text-3xl transition'
                >
                  x
                </button>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                {suggestedMatch.map((match, index) => (
                  <MotionDiv
                    key={match.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white shadow-md border rounded-lg overflow-hidden"
                  >
                    <div className="p-3">
                      <div className="mb-2 font-semibold text-sm">{t('match')} {index + 1}</div>
                      <div className="mb-2 text-gray-600 text-sm">
                        {t('Team 1')} : {match.team1.player1.name} ( {match.team1.player1.skillLevel} ) , {match.team1.player2.name} ( {match.team1.player2.skillLevel} )
                      </div>
                      <div className="mb-2 text-gray-600 text-sm">
                        {t('Team 2')} : {match.team2.player1.name} ( {match.team2.player1.skillLevel} ) , {match.team2.player2.name} ( {match.team2.player2.skillLevel} )
                      </div>
                      <button
                        onClick={() => {
                          handleUseSuggestedMatch(index);
                          toast.success(`${t('Match added')} ${index + 1}`);
                        }}
                        className="bg-green-500 hover:bg-green-600 mt-2 py-1 rounded-lg w-full text-white text-sm"
                      >
                        {t('use')}
                      </button>
                    </div>
                  </MotionDiv>
                ))}
              </div>
              {/* <button
                onClick={() => setShowSuggest(false)}
                className="bg-gray-400 hover:bg-gray-500 mt-4 py-2 rounded-lg w-full text-white"
              >
                {t('close')}
              </button> */}
            </div>
          </div>
        )}
      

        {matches.length === 0 && (
          <div className="py-12 text-center">
            <Users size={64} className="mx-auto mb-4 text-gray-400" />
            <h3 className="mb-2 font-semibold text-gray-600 text-xl">{t('No matches created yet')}</h3>
            <p className="text-gray-500">{t("Click 'New Match' to start organizing games")}</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>

  )
}

export default CourtPlayer
