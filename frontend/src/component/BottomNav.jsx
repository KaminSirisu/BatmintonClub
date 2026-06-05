import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../utils/LanguageProvider.jsx';
import { TvMinimal, LayoutGrid, UserCog } from 'lucide-react';

const BottomNav = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const isScore =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/matchmaking') ||
    location.pathname.startsWith('/summary');
  const isProfile = location.pathname === '/setting';
  const activeIndex = isScore ? 1 : isProfile ? 2 : 0;
  const [selectedIndex, setSelectedIndex] = useState(activeIndex);
  const navigationTimer = useRef(null);

  useEffect(() => {
    setSelectedIndex(activeIndex);
  }, [activeIndex]);

  useEffect(() => () => {
    window.clearTimeout(navigationTimer.current);
  }, []);

  const handleNavigate = (event, index, path) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    if (window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    event.preventDefault();
    window.clearTimeout(navigationTimer.current);
    setSelectedIndex(index);
    navigationTimer.current = window.setTimeout(() => {
      navigate(path);
    }, 180);
  };

  return (
    <nav className="right-0 bottom-0 left-0 z-40 fixed px-7 md:px-0 pb-[calc(env(safe-area-inset-bottom)+14px)] md:pb-0 pointer-events-none md:pointer-events-auto md:bg-white md:border-gray-200 md:border-t">
      <div className="relative flex justify-center md:justify-around items-center gap-2 md:gap-0 mx-auto px-2 md:px-4 py-1.5 md:py-2 rounded-full md:rounded-none max-w-[11rem] md:max-w-lg min-h-[3.25rem] md:min-h-0 bg-white/80 md:bg-transparent shadow-[0_10px_34px_rgba(15,23,42,0.16)] md:shadow-none ring-1 md:ring-0 ring-white/60 backdrop-blur-sm md:backdrop-blur-none pointer-events-auto">
        <span
          className="md:hidden top-1.5 left-2 absolute bg-gray-200/75 rounded-full w-12 h-10 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${selectedIndex * 56}px)` }}
        />
        <Link
          to="/"
          aria-label={t('home')}
          onClick={(event) => handleNavigate(event, 0, '/')}
          className={`relative flex h-10 md:h-auto w-12 md:w-auto items-center justify-center md:flex-col md:gap-0.5 rounded-full md:rounded-none md:px-5 md:py-1 transition-colors duration-200 ${
            isHome
              ? 'text-gray-950 md:text-blue-600'
              : 'text-gray-950 hover:bg-gray-100 md:text-gray-400 md:hover:bg-transparent'
          }`}
        >
          <LayoutGrid  className="relative z-10 w-6 md:w-6 h-6 md:h-6" />
          <span className="sr-only md:not-sr-only md:mt-0.5 md:font-medium md:text-[11px]">{t('home')}</span>
        </Link>

        <Link
          to="/dashboard"
          aria-label={t('MatchStatus')}
          onClick={(event) => handleNavigate(event, 1, '/dashboard')}
          className={`relative flex h-10 md:h-auto w-12 md:w-auto items-center justify-center md:flex-col md:gap-0.5 rounded-full md:rounded-none md:px-5 md:py-1 transition-colors duration-200 ${
            isScore
              ? 'text-gray-950 md:text-blue-600'
              : 'text-gray-950 hover:bg-gray-100 md:text-gray-400 md:hover:bg-transparent'
          }`}
        >
          <TvMinimal  className="relative z-10 w-6 md:w-6 h-6 md:h-6" />
          {isScore && (
            <span className="md:hidden right-2 bottom-1.5 absolute z-10 bg-red-500 rounded-full ring-2 ring-gray-200/75 w-2 h-2" />
          )}
          <span className="sr-only md:not-sr-only md:mt-0.5 md:font-medium md:text-[11px]">{t('MatchStatus')}</span>
        </Link>

        <Link
          to="/setting"
          aria-label={t('profile')}
          onClick={(event) => handleNavigate(event, 2, '/setting')}
          className={`relative flex h-10 md:h-auto w-12 md:w-auto items-center justify-center md:flex-col md:gap-0.5 rounded-full md:rounded-none md:px-5 md:py-1 transition-colors duration-200 ${
            isProfile
              ? 'text-gray-950 md:text-blue-600'
              : 'text-gray-950 hover:bg-gray-100 md:text-gray-400 md:hover:bg-transparent'
          }`}
        >
          <UserCog  className="relative z-10 w-6 md:w-6 h-6 md:h-6" />
          {isProfile && (
            <span className="md:hidden right-2 bottom-1.5 absolute z-10 bg-red-500 rounded-full ring-2 ring-gray-200/75 w-2 h-2" />
          )}
          <span className="sr-only md:not-sr-only md:mt-0.5 md:font-medium md:text-[11px]">{t('profile')}</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
