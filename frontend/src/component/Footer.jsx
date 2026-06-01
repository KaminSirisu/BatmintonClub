// Footer.jsx
import React from "react";
import { useLanguage } from "../utils/LanguageProvider.jsx";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-gray-100 mt-3 py-4 text-gray-700 text-xs md:text-sm text-center">
      <p>{t('By')} Kamin Sirisuwapong</p>
      <p className="mt-1">© {new Date().getFullYear()} {t('clubTitle')}. {t('All rights reserved.')}</p>
    </footer>
  );
}
