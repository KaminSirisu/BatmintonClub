// Footer.jsx
import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gray-100 mt-3 py-4 text-gray-700 text-xs md:text-sm text-center">
      <p>By Kamin Sirisuwapong</p>
      <p className="mt-1">© {new Date().getFullYear()} Badminton Club. All rights reserved.</p>
    </footer>
  );
}
