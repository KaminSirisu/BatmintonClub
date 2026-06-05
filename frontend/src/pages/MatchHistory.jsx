import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, History, Trophy } from 'lucide-react';
import Navbar from '../component/Navbar';
import BottomNav from '../component/BottomNav';
import { useAuth } from '../utils/AuthContext';
import { useLanguage } from '../utils/LanguageProvider.jsx';

const formatMatchTime = (value) => {
  if (!value) return '—';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return `${value} min`;
};

const parseSets = (matchScore) => {
  if (!matchScore) return [];
  return matchScore.split(',').map((set) => set.trim()).filter(Boolean);
};

const computeWins = (matchScore) => {
  return parseSets(matchScore).reduce(
    (acc, set) => {
      const [a, b] = set.split('-').map(Number);
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        if (a > b) acc.teamA += 1;
        if (b > a) acc.teamB += 1;
      }
      return acc;
    },
    { teamA: 0, teamB: 0 }
  );
};

const MatchHistory = () => {
  const { id } = useParams();
  const { getClubById, getMatchesByClubId } = useAuth();
  const { t } = useLanguage();
  const [matches, setMatches] = useState([]);
  const [clubName, setClubName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const [club, clubMatches] = await Promise.all([
          getClubById(id),
          getMatchesByClubId(id),
        ]);

        if (!isMounted) return;

        setClubName(club?.clubName || '');
        setMatches(clubMatches);
      } catch (error) {
        console.error('Failed to load match history:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [getClubById, getMatchesByClubId, id]);

  const summary = useMemo(() => {
    const completedMatches = matches.filter((match) => match.status === 'FINISHED' || match.matchScore);
    const totalMinutes = completedMatches.reduce(
      (sum, match) => sum + (Number(match.totalTime) || 0),
      0
    );

    return {
      totalMatches: matches.length,
      completedMatches: completedMatches.length,
      totalMinutes,
    };
  }, [matches]);

  const completedMatches = useMemo(
    () => matches.filter((match) => match.status === 'FINISHED' || match.matchScore),
    [matches]
  );

  return (
    <div className="bg-[#f3f0e8] min-h-screen">
      <Navbar />

      <div className="mx-auto px-3 sm:px-5 pt-3 pb-24 max-w-6xl">
        <div className="relative isolate bg-[radial-gradient(circle_at_top_left,_rgba(30,64,175,0.18),_transparent_32%),linear-gradient(135deg,#102a43,#1d4ed8_58%,#7dd3fc)] shadow-lg mb-3 rounded-2xl overflow-hidden text-white">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.08)_45%,transparent_100%)]" />
          <div className="relative px-4 sm:px-5 py-3 sm:py-4">
            <Link
              to={`/matchmaking/${id}`}
              className="inline-flex items-center gap-1.5 bg-white/12 hover:bg-white/18 mb-2 px-2.5 py-1 rounded-full text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('Back to Matchmaking')}
            </Link>

            <div className="flex sm:flex-row flex-col sm:justify-between sm:items-end gap-3">
              <div>
                <div className="opacity-75 mb-1 font-semibold text-[10px] uppercase tracking-[0.22em]">
                  {t('Match History')}
                </div>
                <h1 className="font-black text-xl sm:text-2xl leading-tight">
                  {clubName || t('Match History')}
                </h1>
                <p className="opacity-90 mt-1 max-w-2xl text-xs sm:text-sm">
                  {t('History page subtitle')}
                </p>
              </div>

              <div className="gap-2 grid grid-cols-3 w-full sm:w-auto sm:min-w-[300px]">
                <div className="bg-white/12 backdrop-blur-sm p-2 rounded-xl text-center">
                  <div className="opacity-75 text-[9px] uppercase tracking-wide">{t('All Matches')}</div>
                  <div className="mt-0.5 font-black text-lg">{summary.totalMatches}</div>
                </div>
                <div className="bg-white/12 backdrop-blur-sm p-2 rounded-xl text-center">
                  <div className="opacity-75 text-[9px] uppercase tracking-wide">{t('Completed')}</div>
                  <div className="mt-0.5 font-black text-lg">{summary.completedMatches}</div>
                </div>
                <div className="bg-white/12 backdrop-blur-sm p-2 rounded-xl text-center">
                  <div className="opacity-75 text-[9px] uppercase tracking-wide">{t('Minutes')}</div>
                  <div className="mt-0.5 font-black text-lg">{summary.totalMinutes}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white/90 shadow-sm p-10 border border-stone-200 rounded-[28px] text-stone-500 text-center">
            {t('Loading history...')}
          </div>
        ) : completedMatches.length === 0 ? (
          <div className="bg-white/90 shadow-sm p-10 border border-stone-200 rounded-[28px] text-center">
            <History className="mx-auto mb-4 w-12 h-12 text-stone-300" />
            <h2 className="font-bold text-stone-700 text-xl">{t('No matches completed yet.')}</h2>
            <p className="mt-2 text-stone-500">{t('History empty helper')}</p>
          </div>
        ) : (
          <div className="gap-2 grid">
            {completedMatches.map((match) => {
              const teamA = match.players.slice(0, 2);
              const teamB = match.players.slice(2, 4);
              const sets = parseSets(match.matchScore);
              const wins = computeWins(match.matchScore);
              const hasScore = sets.length > 0;

              return (
                <div
                  key={match.id}
                  className="relative bg-white shadow-sm border border-stone-200 rounded-2xl overflow-hidden"
                >
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-b from-sky-500 to-blue-700 w-1" />
                  <div className="p-2.5 sm:p-3">
                    <div className="flex sm:flex-row flex-col sm:justify-between sm:items-start gap-2 sm:gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-stone-100 px-2 py-0.5 rounded-full font-semibold text-[10px] text-stone-600 uppercase tracking-wide">
                            {t('court')} {match.court || '—'}
                          </span>
                          {match.status && (
                            <span className="bg-blue-50 px-2 py-0.5 rounded-full font-semibold text-[10px] text-blue-700 uppercase tracking-wide">
                              {match.status}
                            </span>
                          )}
                        </div>
                        <div className="justify-start items-center gap-1 sm:gap-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] mt-2">
                          <div className="min-w-0">
                            <div className="mb-0.5 font-semibold text-[9px] text-stone-400 uppercase tracking-[0.16em]">
                              {t('Team 1')}
                            </div>
                            <div className="font-bold text-stone-900 text-xs sm:text-sm leading-snug">
                              {teamA.length > 0 ? teamA.join(' / ') : '—'}
                            </div>
                          </div>
                          <div className="font-black text-stone-300 text-center text-xs sm:text-base">VS</div>
                          <div className="min-w-0 text-right">
                            <div className="mb-0.5 font-semibold text-[9px] text-stone-400 uppercase tracking-[0.16em]">
                              {t('Team 2')}
                            </div>
                            <div className="font-bold text-stone-900 text-xs sm:text-sm leading-snug">
                              {teamB.length > 0 ? teamB.join(' / ') : '—'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-stone-50 p-2 border border-stone-200 rounded-xl min-w-0 sm:min-w-[200px]">
                        <div className="gap-1 grid">
                          <div className="flex justify-between items-center gap-2 text-[11px] sm:text-xs">
                            <span className="flex items-center gap-1.5 text-stone-500">
                              <Clock3 className="w-3 h-3" />
                              {t('Started')}
                            </span>
                            <span className="font-semibold text-right text-stone-800">
                              {formatMatchTime(match.startTime)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2 text-[11px] sm:text-xs">
                            <span className="text-stone-500">{t('Duration')}</span>
                            <span className="font-semibold text-stone-800">
                              {formatDuration(match.totalTime)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2 text-[11px] sm:text-xs">
                            <span className="text-stone-500">{t('Result')}</span>
                            <span className="font-semibold text-stone-800">
                              {hasScore ? `${wins.teamA} : ${wins.teamB}` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {hasScore && (
                      <div className="mt-2 pt-2 border-stone-200 border-t">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="flex items-center gap-1 mr-1 font-semibold text-stone-500 text-[10px] uppercase tracking-wide">
                            <Trophy className="w-3 h-3 text-amber-500" />
                            {t('Set Scores')}
                          </span>
                          {sets.map((set, index) => (
                            <span
                              key={`${match.id}-${index}`}
                              className="bg-amber-50 px-1.5 py-0.5 border border-amber-100 rounded-full font-semibold text-[10px] text-amber-700"
                            >
                              {set}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MatchHistory;
