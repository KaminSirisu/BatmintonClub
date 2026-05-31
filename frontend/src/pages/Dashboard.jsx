import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../component/Navbar.jsx';
import BottomNav from '../component/BottomNav.jsx';
import DashboardMatchesTable from '../component/DashboardMatchesTable.jsx';
import { useLanguage } from '../utils/LanguageProvider.jsx';
import { useAuth } from '../utils/AuthContext.jsx';

const statusDisplayOrder = {
  PLAYING: 0,
  WAITING: 1,
  FINISHED: 2,
};

const Dashboard = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const { id: urlClubId } = useParams();
  const {
    getClubData,
    getDashboardMatchesByClubId,
    subscribeToDashboardMatches,
    getUserName,
  } = useAuth();

  const [matches, setMatches] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [activeClubId, setActiveClubId] = useState(urlClubId || null);
  const [notifiedMatches, setNotifiedMatches] = useState(new Set());
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const matchesCacheRef = useRef({});

  const userName = getUserName();

  useEffect(() => {
    if (urlClubId) {
      setActiveClubId(urlClubId);
    }
  }, [urlClubId]);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const data = await getClubData();
        setClubs(data);
        if (!urlClubId && data.length > 0) {
          setActiveClubId(data[0].id);
        }
      } catch (e) {
        console.error('Failed to fetch clubs:', e);
      }
    };
    fetchClubs();
  }, [getClubData, urlClubId]);

  useEffect(() => {
    if (!activeClubId) return;

    let isActive = true;
    let unsubscribe = () => {};
    const cachedMatches = matchesCacheRef.current[activeClubId];

    if (cachedMatches) {
      setMatches(cachedMatches);
    }

    const setupDashboardData = async () => {
      try {
        setIsLoadingMatches(true);
        const clubMatches = await getDashboardMatchesByClubId(activeClubId);
        if (!isActive) return;

        matchesCacheRef.current[activeClubId] = clubMatches;
        setMatches(clubMatches);

        unsubscribe = subscribeToDashboardMatches(activeClubId, ({ events, match, payload }) => {
          if (!isActive) return;

          if (events.some((e) => e.includes('.create'))) {
            setMatches((prev) => {
              const next = prev.some((item) => item.id === match.id) ? prev : [...prev, match];
              matchesCacheRef.current[activeClubId] = next;
              return next;
            });
          } else if (events.some((e) => e.includes('.update'))) {
            setMatches((prev) => {
              const next = prev.map((item) => (item.id === match.id ? match : item));
              matchesCacheRef.current[activeClubId] = next;
              return next;
            });
          } else if (events.some((e) => e.includes('.delete'))) {
            setMatches((prev) => {
              const next = prev.filter((item) => item.id !== payload.$id);
              matchesCacheRef.current[activeClubId] = next;
              return next;
            });
          }
        });
      } catch (e) {
        console.error('Failed to fetch dashboard data:', e);
      } finally {
        if (isActive) setIsLoadingMatches(false);
      }
    };

    setupDashboardData();

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [activeClubId, getDashboardMatchesByClubId, subscribeToDashboardMatches]);

  const activeClub = clubs.find((club) => club.id === activeClubId) || null;
  const clubName = activeClub?.clubName || t('clubTitle');

  const dashboardDate = useMemo(() => {
    const locale = language === 'th' ? 'th-TH' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, [language]);

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const statusGap =
        (statusDisplayOrder[a.status] ?? Number.MAX_SAFE_INTEGER) -
        (statusDisplayOrder[b.status] ?? Number.MAX_SAFE_INTEGER);
      if (statusGap !== 0) return statusGap;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [matches]);

  const matchSummary = useMemo(() => {
    return sortedMatches.reduce(
      (summary, match) => {
        if (match.status === 'PLAYING') summary.playing += 1;
        else if (match.status === 'WAITING') summary.waiting += 1;
        else if (match.status === 'FINISHED') summary.finished += 1;
        summary.total += 1;
        return summary;
      },
      { playing: 0, waiting: 0, finished: 0, total: 0 }
    );
  }, [sortedMatches]);

  const toggleNotify = (matchId) => {
    setNotifiedMatches((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      <Navbar />

      <div className="flex-grow pb-24 mx-auto w-full max-w-2xl">
        {/* Date */}
        <p className="px-4 pt-2 sm:pt-4 pb-1 sm:pb-3 text-xs sm:text-sm text-gray-400">{dashboardDate}</p>

        {/* Club tabs */}
        {clubs.length > 1 && (
          <div className="px-4 pb-1 sm:pb-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
              {clubs.map((club) => (
                <button
                  key={club.id}
                  onClick={() => setActiveClubId(club.id)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all truncate ${
                    activeClubId === club.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {club.clubName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status chips */}
        <div className="flex items-center gap-0.5 sm:gap-1 px-4 pb-1.5 sm:pb-3 flex-wrap">
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-full px-3 py-1 bg-white">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs font-medium text-gray-700">
              {t('PLAYING')} {matchSummary.playing}
            </span>
          </div>
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-full px-3 py-1 bg-white">
            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs font-medium text-gray-700">
              {t('WAITING')} {matchSummary.waiting}
            </span>
          </div>
          <div className="border border-gray-200 rounded-full px-3 bg-white">
            <span className="text-[10px] sm:text-xs font-medium text-gray-700">
              {t('FINISHED')} {matchSummary.finished}
            </span>
          </div>
          <div className="ml-auto text-[10px] sm:text-xs text-gray-400">
            {t('Total')} {matchSummary.total} {t('games')}
          </div>
        </div>

        {/* Loading indicator */}
        {isLoadingMatches && (
          <div className="mx-4 mb-3 bg-sky-50 border border-sky-100 rounded-xl px-4 py-2 text-sky-600 text-sm">
            Refreshing matches...
          </div>
        )}

        {/* Match list */}
        <div className="px-4">
          <DashboardMatchesTable
            matches={sortedMatches}
            notifiedMatches={notifiedMatches}
            onToggleNotify={toggleNotify}
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
