/**
 * ============================================================================
 * DIGISTORE AUTHENTICATION & BRAND CONFIGURATION
 * ============================================================================
 * All placeholders (Site Name, Background Image, Firebase Keys, and Telegram Bot)
 * are centralized in this single file for quick customization.
 */

export interface CountryCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

/**
 * Custom Background Image Slot:
 * Place your custom dark 3D ribbon wallpaper at `/public/bg.jpg`
 * If `/bg.jpg` is not present or fails to load, the built-in 3D Animated Chrome/Cyan
 * SVG & CSS Ribbon Background renders automatically.
 */
export const BG_IMAGE = "/assets/aistudio/1793807042871_85030c27.jpg";

export const DIGISTORE_CONFIG = {
  // Brand Name (Shown in the subtle footer "© 2026 DDS-Digital")
  siteName: "DDS-Digital",
  bgImage: BG_IMAGE,

  // ============================================================================
  // 1. FIREBASE CONFIGURATION
  // Replace with your live Firebase Web App credentials from:
  // https://console.firebase.google.com -> Project Settings -> General -> Your Apps
  // Make sure "Google" and "Email/Password" providers are enabled in Authentication!
  // ============================================================================
  firebase: {
    apiKey: "AIzaSyYOUR_FIREBASE_API_KEY_HERE",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890",
  },

  // ============================================================================
  // 2. TELEGRAM LOGIN WIDGET CONFIGURATION
  // Create a bot via @BotFather on Telegram (/newbot) and link your domain via /setdomain.
  // Enter your bot username below WITHOUT the "@" symbol.
  //
  // IMPORTANT BACKEND SECURITY REQUIREMENT:
  // When Telegram authenticates a user, the widget callback returns:
  // { id, first_name, last_name, username, photo_url, auth_date, hash }
  // You MUST verify the `hash` on your backend server using HMAC-SHA-256 with the
  // SHA-256 hash of your Telegram Bot Token before trusting the payload in production.
  // ============================================================================
  telegram: {
    botUsername: "dssotpbot",
    widgetScriptUrl: "https://telegram.org/js/telegram-widget.js?22",
  },

  // ============================================================================
  // 3. COUNTRY CODES FOR OPTIONAL PHONE FIELD (Default: +880 Bangladesh)
  // ============================================================================
  defaultCountryCode: "+880",
  countryCodes: [
    { name: "Bangladesh", code: "BD", dialCode: "+880", flag: "🇧🇩" },
    { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸" },
    { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧" },
    { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳" },
    { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪" },
    { name: "Saudi Arabia", code: "SA", dialCode: "+966", flag: "🇸🇦" },
    { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦" },
    { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪" },
    { name: "Malaysia", code: "MY", dialCode: "+60", flag: "🇲🇾" },
    { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬" },
    { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺" },
  ] as CountryCode[],
};
