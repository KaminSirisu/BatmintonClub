import { useLanguage } from '../utils/LanguageProvider.jsx';

const LanguageToggle = ({ className = '' }) => {
  const { language, changeLanguage } = useLanguage();
  const isEN = language === 'en';

  return (
    <div
      className={`flex w-16 h-8 p-1 rounded-full cursor-pointer bg-gray-100 border border-gray-300 transition-all duration-300 ${className}`}
      onClick={() => changeLanguage(isEN ? 'th' : 'en')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && changeLanguage(isEN ? 'th' : 'en')}
    >
      <div className="flex justify-between items-center w-full">
        <div
          className={`flex justify-center items-center w-6 h-6 rounded-full text-xs font-semibold transition-transform duration-300 ${
            isEN
              ? 'translate-x-0 bg-blue-600 text-white'
              : 'translate-x-8 bg-transparent text-gray-400'
          }`}
        >
          EN
        </div>
        <div
          className={`flex justify-center items-center w-6 h-6 rounded-full text-xs font-semibold transition-transform duration-300 ${
            !isEN
              ? '-translate-x-8 bg-blue-600 text-white'
              : 'translate-x-0 bg-transparent text-gray-400'
          }`}
        >
          TH
        </div>
      </div>
    </div>
  );
};

export default LanguageToggle;
