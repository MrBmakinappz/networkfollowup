/**
 * Application Constants
 * Country-Language mappings and other constants
 */

/**
 * Complete country code to language code mapping
 * Based on ISO 639-1 language codes
 */
const COUNTRY_LANGUAGE_MAP = {
  // English-speaking countries
  'USA': 'en',  // United States
  'GBR': 'en',  // United Kingdom
  'CAN': 'en',  // Canada
  'AUS': 'en',  // Australia
  'NZL': 'en',  // New Zealand
  'IRL': 'en',  // Ireland
  'ZAF': 'en',  // South Africa
  
  // Romance languages
  'ITA': 'it',  // Italy
  'FRA': 'fr',  // France
  'ESP': 'es',  // Spain
  'PRT': 'pt',  // Portugal
  'BEL': 'fr',  // Belgium (French)
  'CHE': 'fr',  // Switzerland (French)
  'MEX': 'es',  // Mexico
  'ARG': 'es',  // Argentina
  'COL': 'es',  // Colombia
  'CHL': 'es',  // Chile
  'PER': 'es',  // Peru
  'VEN': 'es',  // Venezuela
  'BRA': 'pt',  // Brazil
  
  // Germanic languages
  'DEU': 'de',  // Germany
  'AUT': 'de',  // Austria
  'CHE': 'de',  // Switzerland (German)
  'NLD': 'nl',  // Netherlands
  'BEL': 'nl',  // Belgium (Dutch)
  
  // Slavic languages
  'POL': 'pl',  // Poland → Polish
  'BGR': 'bg',  // Bulgaria → Bulgarian
  'HUN': 'hu',  // Hungary → Hungarian
  'CZE': 'cs',  // Czech Republic
  'SVK': 'sk',  // Slovakia
  'HRV': 'hr',  // Croatia
  'SRB': 'sr',  // Serbia
  'SVN': 'sl',  // Slovenia
  'RUS': 'ru',  // Russia
  'UKR': 'uk',  // Ukraine
  'BLR': 'be',  // Belarus
  
  // Nordic languages
  'SWE': 'sv',  // Sweden
  'NOR': 'no',  // Norway
  'DNK': 'da',  // Denmark
  'FIN': 'fi',  // Finland
  'ISL': 'is',  // Iceland
  
  // Asian languages
  'CHN': 'zh',  // China
  'JPN': 'ja',  // Japan
  'KOR': 'ko',  // South Korea
  'THA': 'th',  // Thailand
  'VNM': 'vi',  // Vietnam
  'IDN': 'id',  // Indonesia
  'PHL': 'tl',  // Philippines
  'MYS': 'ms',  // Malaysia
  'SGP': 'en',  // Singapore (English)
  
  // Middle East
  'TUR': 'tr',  // Turkey
  'SAU': 'ar',  // Saudi Arabia
  'ARE': 'ar',  // UAE
  'ISR': 'he',  // Israel
  
  // Default fallback
  'DEFAULT': 'en'
};

/**
 * Language code to display name mapping
 */
const LANGUAGE_NAMES = {
  'en': 'English',
  'it': 'Italian',
  'fr': 'French',
  'es': 'Spanish',
  'pt': 'Portuguese',
  'de': 'German',
  'nl': 'Dutch',
  'pl': 'Polish',
  'bg': 'Bulgarian',
  'hu': 'Hungarian',
  'cs': 'Czech',
  'sk': 'Slovak',
  'hr': 'Croatian',
  'sr': 'Serbian',
  'sl': 'Slovenian',
  'ru': 'Russian',
  'uk': 'Ukrainian',
  'sv': 'Swedish',
  'no': 'Norwegian',
  'da': 'Danish',
  'fi': 'Finnish',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'tl': 'Tagalog',
  'ms': 'Malay',
  'tr': 'Turkish',
  'ar': 'Arabic',
  'he': 'Hebrew'
};

/**
 * Get language code from country code
 * @param {string} countryCode - 3-letter ISO country code (e.g., 'POL', 'BGR')
 * @returns {string} - 2-letter ISO language code (e.g., 'pl', 'bg')
 */
function getLanguageFromCountry(countryCode) {
  if (!countryCode) return 'en';
  
  const code = countryCode.toUpperCase().trim();
  return COUNTRY_LANGUAGE_MAP[code] || COUNTRY_LANGUAGE_MAP.DEFAULT;
}

/**
 * Get language display name from language code
 * @param {string} langCode - 2-letter ISO language code (e.g., 'pl', 'bg')
 * @returns {string} - Display name (e.g., 'Polish', 'Bulgarian')
 */
function getLanguageName(langCode) {
  if (!langCode) return 'English';
  return LANGUAGE_NAMES[langCode.toLowerCase()] || 'English';
}

/**
 * Get all available languages for template creation
 * @returns {Array} - Array of {code, name} objects
 */
function getAvailableLanguages() {
  return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
    code,
    name
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Customer type display names
 */
const CUSTOMER_TYPE_NAMES = {
  'retail': 'Retail Customer',
  'wholesale': 'Wholesale Customer',
  'advocates': 'Wellness Advocate'
};

/**
 * Get customer type display name
 * @param {string} type - Customer type code
 * @returns {string} - Display name
 */
function getCustomerTypeName(type) {
  return CUSTOMER_TYPE_NAMES[type] || type;
}

module.exports = {
  COUNTRY_LANGUAGE_MAP,
  LANGUAGE_NAMES,
  CUSTOMER_TYPE_NAMES,
  getLanguageFromCountry,
  getLanguageName,
  getAvailableLanguages,
  getCustomerTypeName
};
