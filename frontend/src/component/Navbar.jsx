import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from '../utils/AuthContext.jsx';
import { Link, useLocation } from "react-router-dom";
import PreviewFilesList from './PreviewFilesList.jsx';
import Badminton from "../assets/badminton.png";
import { useLanguage } from '../utils/LanguageProvider.jsx';


const Navbar = () => {
  const { t, changeLanguage, language } = useLanguage();

  const [previewFiles, setPreviewFiles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const { user, getUserName, logoutUser, getUserFileId, getPreviewUrlsFromDocs }  = useAuth();
  const [toggle, setToggle] = useState(false);

  const location = useLocation();
  let summaryLink = null;
  let showMoneySlipButton = false;

  if (location.pathname.startsWith("/matchmaking/")) {
    const id = location.pathname.split("/")[2]; // grab '12345' from '/matchmaking/12345'
    summaryLink = `/summary/${id}`;
  } else if (location.pathname.startsWith("/summary/")) {
    showMoneySlipButton = true;
  }

  // useEffect(() => {
  //   const fetchUsers = async () => {
  //     const files = await getUserFileId();
  //     const userIds = files.map(file => file.fileId);
  //     console.log("User IDs:", userIds);
  //   };

  //   fetchUsers();
  // }, []);

  useEffect(() => {
    if (!showModal) return;

    const loadPreviews = async () => {
      const fileData = await getUserFileId(); // returns [{ user, fileId, ... }, ...]
      const previewFiles = getPreviewUrlsFromDocs(fileData);
      setPreviewFiles(previewFiles);
    };

    loadPreviews();
  }, [getPreviewUrlsFromDocs, getUserFileId, showModal])

  useEffect(() => {
    if (!showModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showModal]);
  

  // useEffect(() => {
  //   const handleScroll = () => {
  //     setScrolled(window.scrollY > 100);
  //   };
  //   window.addEventListener("scroll", handleScroll);
  //   return () => window.removeEventListener("scroll", handleScroll);
  // }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [name] = await Promise.all([getUserName()]);
      setName(name);
    };
    fetchData();
  }, [getUserName]);

  return (
  
    <nav
      className="rounded-xl w-full flex items-center py-3 sticky top-0 z-20 bg-gray-50 border border-gray-300 shadow-md transition-shadow duration-300"
    >
      <div className="flex justify-between items-center mx-auto px-4 md:px-10 w-full max-w-7xl">
        {/* Left: Club Text */}
        <Link
          to={user ? "/" : "/dashboard"}
          className="flex items-center gap-2"
          onClick={() => {
            window.scrollTo(0, 0);
          }}
        >
          <p className="font-semibold text-[14px] text-black md:text-[22px]">
            {/* {t('clubTitle')} */}KuanMatch
          </p>
          <img src={Badminton} alt={t('clubTitle')} className="self-center w-6 h-6" />
        </Link>

        {!user ? (
          <>
            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/sign-in"
                className="px-3 py-1.5 font-medium text-gray-700 hover:text-blue-600 text-sm transition"
              >
                {t('Sign in')}
              </Link>
              <Link
                to="/sign-up"
                className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium text-white text-sm transition"
              >
                {t('Sign up')}
              </Link>
            </div>
            <div className="md:hidden relative flex justify-end items-center">
              <button
                onClick={() => setToggle(!toggle)}
                className="flex items-center text-black focus:outline-none"
                aria-label="Open menu"
              >
                <Menu size={22} className={`text-black transition-transform duration-200 ${toggle ? 'rotate-90' : 'rotate-0'}`} />
              </button>
              <div
                className={`absolute top-10 right-0 z-30 w-48 rounded-xl bg-white p-4 shadow-lg border border-gray-100 flex flex-col gap-3 items-center text-center origin-top-right transition-all duration-200 ${
                  toggle
                    ? 'pointer-events-auto translate-y-0 opacity-100 scale-100'
                    : 'pointer-events-none -translate-y-2 opacity-0 scale-95'
                }`}
              >
                <Link
                  to="/sign-in"
                  onClick={() => setToggle(false)}
                  className="font-medium text-gray-700 hover:text-blue-600 text-sm transition"
                >
                  {t('Sign in')}
                </Link>
                <Link
                  to="/sign-up"
                  onClick={() => setToggle(false)}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg w-full font-medium text-white text-sm transition"
                >
                  {t('Sign up')}
                </Link>
                <div className="bg-neutral-300 w-full h-px" />
                <div className="flex space-x-2">
                  <button
                    onClick={() => changeLanguage('en')}
                    className={`px-3 py-1 rounded-lg text-sm ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => changeLanguage('th')}
                    className={`px-3 py-1 rounded-lg text-sm ${language === 'th' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    TH
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Desktop Right */}
            <div className="hidden md:flex items-center gap-4">
          {/* Money Slip */}
          {showMoneySlipButton && (
            <button
              onClick={() => setShowModal(true)}
              className="font-medium text-[14px] text-black hover:text-blue-600 transition"
            >
              {t('Money Slip')}
            </button>
          )}
          {summaryLink && (
            <Link
              to={summaryLink}
              className="font-medium text-[14px] text-black hover:text-blue-600 transition"
            >
              {t('summary')}
            </Link>
          )}
          <Link to="/setting" className="font-medium text-[14px] text-black hover:text-blue-600">
            {t('setting')}
          </Link>
          {/* Vertical divider line */}
          <div className="bg-neutral-300 w-px h-6" />
          <span className="font-medium text-[14px] text-gray-700">{name}</span>
          <button
            onClick={logoutUser}
            className="font-medium text-[14px] text-black hover:text-red-600"
          >
            <LogOut size={18} className='text-red-600'/>
            
          </button>
          {/* Vertical divider line */}
          <div className="bg-neutral-300 w-px h-6" />
          <div className='flex space-x-1'>
            <button
              onClick={() => changeLanguage('en')}
              className={`px-2 py-1 rounded-lg text-xs md:text-sm ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              EN
            </button>
            <button
              onClick={() => changeLanguage('th')}
              className={`px-2 py-1 rounded-lg text-xs md:text-sm ${language === 'th' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              TH
            </button>
          </div>
          

            </div>

            {/* Mobile — username + language badge */}
            <div className="md:hidden relative flex justify-end items-center">
          <button
            onClick={() => setToggle(!toggle)}
            className="flex items-center gap-2 text-black focus:outline-none"
            aria-label="Open menu"
          >
            <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">{name}</span>
            <Menu size={20} className={`text-black transition-transform duration-200 ${toggle ? 'rotate-90' : 'rotate-0'}`} />
          </button>
          <div
            className={`absolute top-10 z-30 w-52 rounded-xl bg-white p-5 shadow-lg border border-gray-100 flex flex-col gap-4 items-center text-center origin-top-right transition-all duration-200 ${
              toggle
                ? 'pointer-events-auto translate-y-0 opacity-100 scale-100'
                : 'pointer-events-none -translate-y-2 opacity-0 scale-95'
            }`}
          >
            <span className="font-medium text-[14px] text-gray-700">{name}</span>
            {/* Horizontal line */}
            <div className="bg-neutral-300 w-full h-px" />
            {showMoneySlipButton && (
              <button
                onClick={() => setShowModal(true)}
                className="font-medium text-[14px] text-black hover:text-blue-600 transition"
              >
                {t('Money Slip')}
              </button>
            )}
            {summaryLink && (
              <Link
                to={summaryLink}
                onClick={() => setToggle(false)}
                className="font-medium text-[14px] text-black hover:text-blue-600 transition"
              >
                {t('summary')}
              </Link>
            )}
            <Link
              to="/setting"
              onClick={() => setToggle(false)}
              className="font-medium text-[14px] text-black hover:text-blue-600"
            >
              {t('setting')}
            </Link>
            <button
              onClick={() => {
                logoutUser();
                setToggle(false);
              }}
              className="font-medium text-[14px] text-black hover:text-red-600"
            >
              <LogOut size={18} className='text-red-600'/>
            </button>
            {/* Horizontal line */}
            <div className="bg-neutral-300 w-full h-px" />
            <h1 className='text-xs'>{t('change language')}</h1>
            <div className='flex space-x-2'>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded-lg text-sm ${language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('th')}
                className={`px-3 py-1 rounded-lg text-sm ${language === 'th' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                TH
              </button>
            </div>

          </div>
            </div>
          </>
        )}
        {showModal && createPortal(
          <div className="z-[100] fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4 overscroll-contain">
              <div className="relative bg-white shadow-lg p-4 sm:p-6 rounded-xl w-full max-w-5xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="top-3 right-3 absolute flex justify-center items-center bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9 text-gray-600 transition"
                  aria-label={t('close')}
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="mb-4 pr-12 font-semibold text-xl">{t('Money Slip')}</h2>
                <PreviewFilesList previewFiles={previewFiles} />
              </div>
          </div>,
          document.body
        )}

      </div>
    </nav>
  );

}

export default Navbar
