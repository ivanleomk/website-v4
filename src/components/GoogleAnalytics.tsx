'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

interface GoogleAnalyticsProps {
  measurementId: string;
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const [cookieConsent, setCookieConsent] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for existing cookie consent
    const consent = localStorage.getItem('cookie-consent');
    if (consent === 'true') {
      setCookieConsent(true);
    } else if (consent === 'false') {
      setCookieConsent(false);
    }
    // If no consent stored, leave as null to show banner
  }, []);

  useEffect(() => {
    if (cookieConsent === true) {
      // Initialize Google Analytics
      window.gtag = window.gtag || function() {
        (window.gtag.q = window.gtag.q || []).push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        page_title: document.title,
        page_location: window.location.href,
      });
    }
  }, [cookieConsent, measurementId]);

  const handleAcceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true');
    setCookieConsent(true);
  };

  const handleDeclineCookies = () => {
    localStorage.setItem('cookie-consent', 'false');
    setCookieConsent(false);
  };

  return (
    <>
      {cookieConsent === true && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${measurementId}', {
                page_title: document.title,
                page_location: window.location.href,
              });
            `}
          </Script>
        </>
      )}
      
      {mounted && cookieConsent === null && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-md">
          <div className="text-sm text-gray-700 mb-3">
            <p>
              We use cookies to analyze site traffic and improve your experience. 
              By accepting, you agree to our use of Google Analytics.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAcceptCookies}
              className="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={handleDeclineCookies}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </>
  );
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}
