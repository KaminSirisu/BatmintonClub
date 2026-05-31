import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../utils/LanguageProvider.jsx';
import { TvMinimal, LayoutGrid, UserCog } from 'lucide-react';


const BottomNav = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isScore =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/matchmaking') ||
    location.pathname.startsWith('/summary');
  const isProfile = location.pathname === '/setting';

  return (
    <nav className="right-0 bottom-0 left-0 z-40 fixed bg-white border-gray-200 border-t">
      <div className="flex justify-around items-center mx-auto px-2 sm:px-4 py-1.5 sm:py-2 max-w-lg">
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 py-0.5 sm:py-1 px-3 sm:px-5 transition-colors ${
            isHome ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <span className="text-[19px] sm:text-[22px] leading-none">
            {/* 🏠 */}
            <LayoutGrid />
            
          </span>
          <span className="mt-0.5 font-medium text-[10px] sm:text-[11px]">{t('home')}</span>
        </Link>

        <Link
          to="/dashboard"
          className={`flex flex-col items-center gap-0.5 py-0.5 sm:py-1 px-3 sm:px-5 transition-colors ${
            isScore ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <span className="text-[19px] sm:text-[22px] leading-none">
            <TvMinimal />
          </span>
          <span className="mt-0.5 font-medium text-[10px] sm:text-[11px]">{t('MatchStatus')}</span>
        </Link>

        <Link
          to="/setting"
          className={`flex flex-col items-center gap-0.5 py-0.5 sm:py-1 px-3 sm:px-5 transition-colors ${
            isProfile ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <span className="text-[19px] sm:text-[22px] leading-none">
            {/* 👤 */}
            <UserCog />
          </span>
          <span className="mt-0.5 font-medium text-[10px] sm:text-[11px]">{t('profile')}</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
