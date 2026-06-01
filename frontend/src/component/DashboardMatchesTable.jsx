import { useLanguage } from '../utils/LanguageProvider.jsx';

const parseSetScores = (matchScore) => {
  if (!matchScore) return [];
  return matchScore.split(',').map((score) => score.trim()).filter(Boolean);
};

const getLastSetPoints = (sets) => {
  if (!sets.length) return null;
  const last = sets[sets.length - 1];
  const [a, b] = last.split('-').map(Number);
  if (isNaN(a) || isNaN(b)) return null;
  return { a, b };
};

const getStatusStyle = (status) => {
  if (status === 'PLAYING') {
    return {
      accent: 'bg-red-500',
      badge: 'bg-red-50 text-red-500',
      card: 'border-red-100',
    };
  }
  if (status === 'FINISHED') {
    return {
      accent: '',
      badge: 'bg-gray-100 text-gray-500',
      card: 'border-gray-100',
    };
  }
  return {
    accent: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-600',
    card: 'border-amber-100',
  };
};

const MatchRow = ({ match }) => {
  const { t } = useLanguage();
  const sets = parseSetScores(match.matchScore);
  const lastSet = getLastSetPoints(sets);

  const teamAPlayers = match.players.slice(0, 2);
  const teamBPlayers = match.players.slice(2, 4);
  const teamALabel = teamAPlayers.length > 0 ? teamAPlayers.join(' / ') : t('TBD');
  const teamBLabel = teamBPlayers.length > 0 ? teamBPlayers.join(' / ') : t('TBD');

  const isWaiting = match.status === 'WAITING';
  const isPlaying = match.status === 'PLAYING';
  const isFinished = match.status === 'FINISHED';

  const statusLabel = isWaiting
    ? t('WAITING')
    : isPlaying
      ? t('PLAYING')
      : isFinished
        ? t('FINISHED')
        : match.status;

  const matchNum = String(match.matchNumber ?? match.courtNumber ?? '').padStart(2, '0') || '--';
  const style = getStatusStyle(match.status);

  return (
    <div className={`relative bg-white rounded-[18px] border overflow-hidden ${style.card}`}>
      {/* Left accent stripe */}
      {style.accent && (
        <div className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} />
      )}

      <div className="flex items-center pl-3 pr-3 py-1 gap-2.5">
        {/* Match # + badge */}
        <div className="flex flex-col items-start gap-1 w-[68px] flex-shrink-0">
          <span className="text-[8px] sm:text-[10px] text-gray-400 font-semibold">#{matchNum}</span>
          <span className={`inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
            {isPlaying && (
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-red-500" />
              </span>
            )}
            {statusLabel}
          </span>
        </div>

        {/* Team A */}
        <div className="flex-1 text-right min-w-0">
          <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">
            {t('TEAM A')}
          </div>
          <div className="text-[10px] sm:text-xs font-bold text-gray-900 leading-snug truncate">
            {teamALabel}
          </div>
        </div>

        {/* Center: time + score */}
        <div className="flex flex-col items-center flex-shrink-0 w-[54px]">
          <div className="text-[12px] sm:text-[15px] font-black text-gray-900 leading-none">
            {isWaiting ? 'VS' : `${match.totalTime ?? '-'}'`}
          </div>
          {!isWaiting && lastSet && (
            <div className="text-[11px] text-gray-400 mt-0.5">
              {lastSet.a} : {lastSet.b}
            </div>
          )}
        </div>

        {/* Team B */}
        <div className="flex-1 text-left min-w-0">
          <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">
            {t('TEAM B')}
          </div>
          <div className="text-[10px] sm:text-xs font-bold text-gray-900 leading-snug truncate">
            {teamBLabel}
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardMatchesTable = ({ matches }) => {
  const { t } = useLanguage();

  if (matches.length === 0) {
    return (
      <div className="py-16 text-gray-400 text-sm text-center">
        {t('No matches yet')}
      </div>
    );
  }

  return (
    <div className="flex flex-col ">
      {matches.map((match) => (
        <MatchRow
          key={match.id}
          match={match}
        />
      ))}
    </div>
  );
};

export default DashboardMatchesTable;
