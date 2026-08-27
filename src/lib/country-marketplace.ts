export interface CountryMarketplaceInfo {
  code: string;
  name: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  defaultRatePerZAR: number; // 1 ZAR in this currency
  phonePrefix: string;
  phonePlaceholder: string;
  regions: string[];
  popularSpecies?: string[];
}

export const SUPPORTED_COUNTRY_MARKETPLACES: CountryMarketplaceInfo[] = [
  {
    code: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    defaultRatePerZAR: 1.0,
    phonePrefix: '+27',
    phonePlaceholder: '082 123 4567',
    regions: [
      'Gauteng',
      'Western Cape',
      'KwaZulu-Natal',
      'Eastern Cape',
      'Free State',
      'Mpumalanga',
      'Limpopo',
      'North West',
      'Northern Cape'
    ]
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currencyCode: 'USD',
    currencySymbol: '$',
    defaultRatePerZAR: 0.055,
    phonePrefix: '+1',
    phonePlaceholder: '(555) 123-4567',
    regions: [
      'California', 'Texas', 'Florida', 'New York', 'Pennsylvania', 'Illinois',
      'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'Arizona', 'Washington',
      'Colorado', 'Virginia', 'Tennessee', 'Missouri', 'Indiana', 'Wisconsin'
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currencyCode: 'GBP',
    currencySymbol: '£',
    defaultRatePerZAR: 0.043,
    phonePrefix: '+44',
    phonePlaceholder: '07123 456789',
    regions: ['England', 'Scotland', 'Wales', 'Northern Ireland']
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    currencyCode: 'AUD',
    currencySymbol: 'A$',
    defaultRatePerZAR: 0.084,
    phonePrefix: '+61',
    phonePlaceholder: '0412 345 678',
    regions: [
      'New South Wales', 'Victoria', 'Queensland', 'Western Australia',
      'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'
    ]
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    defaultRatePerZAR: 0.075,
    phonePrefix: '+1',
    phonePlaceholder: '(555) 123-4567',
    regions: [
      'Ontario', 'Quebec', 'British Columbia', 'Alberta',
      'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick'
    ]
  },
  {
    code: 'EU',
    name: 'European Union',
    flag: '🇪🇺',
    currencyCode: 'EUR',
    currencySymbol: '€',
    defaultRatePerZAR: 0.051,
    phonePrefix: '+49',
    phonePlaceholder: '0151 1234567',
    regions: [
      'Germany', 'Netherlands', 'Belgium', 'France', 'Spain', 'Italy',
      'Portugal', 'Austria', 'Poland', 'Denmark', 'Sweden', 'Czech Republic'
    ]
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    flag: '🇳🇿',
    currencyCode: 'NZD',
    currencySymbol: 'NZ$',
    defaultRatePerZAR: 0.092,
    phonePrefix: '+64',
    phonePlaceholder: '021 123 4567',
    regions: ['North Island - Auckland', 'Wellington', 'Waikato', 'Bay of Plenty', 'South Island - Canterbury', 'Otago']
  },
  {
    code: 'BW',
    name: 'Botswana',
    flag: '🇧🇼',
    currencyCode: 'BWP',
    currencySymbol: 'P',
    defaultRatePerZAR: 0.75,
    phonePrefix: '+267',
    phonePlaceholder: '71 234 567',
    regions: ['Gaborone', 'Francistown', 'Maun', 'Kweneng', 'Central', 'North-West']
  },
  {
    code: 'NA',
    name: 'Namibia',
    flag: '🇳🇦',
    currencyCode: 'NAD',
    currencySymbol: 'N$',
    defaultRatePerZAR: 1.0,
    phonePrefix: '+264',
    phonePlaceholder: '081 123 4567',
    regions: ['Khomas (Windhoek)', 'Erongo (Walvis Bay/Swakopmund)', 'Otjozondjupa', 'Oshana']
  },
  {
    code: 'BR',
    name: 'Brazil',
    flag: '🇧🇷',
    currencyCode: 'BRL',
    currencySymbol: 'R$',
    defaultRatePerZAR: 0.31,
    phonePrefix: '+55',
    phonePlaceholder: '(11) 91234-5678',
    regions: ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Paraná', 'Rio Grande do Sul', 'Bahia']
  },
  {
    code: 'PH',
    name: 'Philippines',
    flag: '🇵🇭',
    currencyCode: 'PHP',
    currencySymbol: '₱',
    defaultRatePerZAR: 3.22,
    phonePrefix: '+63',
    phonePlaceholder: '0917 123 4567',
    regions: ['Metro Manila', 'Cebu', 'Davao', 'Central Luzon', 'Calabarzon', 'Western Visayas']
  },
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currencyCode: 'INR',
    currencySymbol: '₹',
    defaultRatePerZAR: 4.76,
    phonePrefix: '+91',
    phonePlaceholder: '98765 43210',
    regions: ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi NCR', 'Gujarat', 'West Bengal', 'Kerala']
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    currencyCode: 'AED',
    currencySymbol: 'AED',
    defaultRatePerZAR: 0.202,
    phonePrefix: '+971',
    phonePlaceholder: '050 123 4567',
    regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah']
  }
];

export const DEFAULT_COUNTRY = SUPPORTED_COUNTRY_MARKETPLACES[0]; // South Africa

/**
 * Normalizes input string and returns corresponding CountryMarketplaceInfo
 */
export function getCountryMarketplace(countryOrCode?: string): CountryMarketplaceInfo {
  if (!countryOrCode) return DEFAULT_COUNTRY;
  
  const raw = countryOrCode.trim().toLowerCase();
  
  // Exact code match
  const byCode = SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code.toLowerCase() === raw);
  if (byCode) return byCode;

  // Exact name match
  const byName = SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.name.toLowerCase() === raw);
  if (byName) return byName;

  // Partial / alias matches
  if (raw === 'rsa' || raw.includes('south africa') || raw === 'za') {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'ZA')!;
  }
  if (raw === 'usa' || raw === 'us' || raw.includes('united states') || raw.includes('america')) {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'US')!;
  }
  if (raw === 'uk' || raw === 'gb' || raw.includes('united kingdom') || raw.includes('england') || raw.includes('britain')) {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'GB')!;
  }
  if (raw === 'au' || raw.includes('australia') || raw === 'aus') {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'AU')!;
  }
  if (raw === 'ca' || raw.includes('canada') || raw === 'can') {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'CA')!;
  }
  if (raw === 'eu' || raw.includes('europe') || raw.includes('germany') || raw.includes('netherlands') || raw.includes('belgium')) {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'EU')!;
  }
  if (raw === 'nz' || raw.includes('new zealand')) {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'NZ')!;
  }
  if (raw === 'bw' || raw.includes('botswana')) {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'BW')!;
  }
  if (raw === 'na' || raw.includes('namibia')) {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'NA')!;
  }
  if (raw === 'br' || raw.includes('brazil') || raw.includes('brasil')) {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'BR')!;
  }
  if (raw === 'ph' || raw.includes('philippines')) {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'PH')!;
  }
  if (raw === 'in' || raw.includes('india')) {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'IN')!;
  }
  if (raw === 'ae' || raw.includes('uae') || raw.includes('emirates') || raw.includes('dubai')) {
    return SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.code === 'AE')!;
  }

  return DEFAULT_COUNTRY;
}

/**
 * Returns currency symbol for a given currency code or country name
 */
export function getCurrencySymbol(currencyCodeOrCountry?: string): string {
  if (!currencyCodeOrCountry) return DEFAULT_COUNTRY.currencySymbol;
  
  const byCountry = SUPPORTED_COUNTRY_MARKETPLACES.find(
    c => c.currencyCode.toLowerCase() === currencyCodeOrCountry.toLowerCase() ||
         c.code.toLowerCase() === currencyCodeOrCountry.toLowerCase() ||
         c.name.toLowerCase() === currencyCodeOrCountry.toLowerCase()
  );
  
  if (byCountry) return byCountry.currencySymbol;

  // Basic symbol fallbacks
  if (currencyCodeOrCountry === '$' || currencyCodeOrCountry === 'USD') return '$';
  if (currencyCodeOrCountry === '€' || currencyCodeOrCountry === 'EUR') return '€';
  if (currencyCodeOrCountry === '£' || currencyCodeOrCountry === 'GBP') return '£';
  if (currencyCodeOrCountry === 'R' || currencyCodeOrCountry === 'ZAR') return 'R';
  if (currencyCodeOrCountry === 'A$' || currencyCodeOrCountry === 'AUD') return 'A$';
  if (currencyCodeOrCountry === 'C$' || currencyCodeOrCountry === 'CAD') return 'C$';
  if (currencyCodeOrCountry === 'NZ$' || currencyCodeOrCountry === 'NZD') return 'NZ$';
  if (currencyCodeOrCountry === 'P' || currencyCodeOrCountry === 'BWP') return 'P';
  if (currencyCodeOrCountry === 'N$' || currencyCodeOrCountry === 'NAD') return 'N$';
  if (currencyCodeOrCountry === 'R$' || currencyCodeOrCountry === 'BRL') return 'R$';
  if (currencyCodeOrCountry === '₱' || currencyCodeOrCountry === 'PHP') return '₱';
  if (currencyCodeOrCountry === '₹' || currencyCodeOrCountry === 'INR') return '₹';
  if (currencyCodeOrCountry === 'AED') return 'AED';

  return currencyCodeOrCountry;
}

/**
 * Formats price with proper symbol and decimal placement
 */
export function formatPrice(amount: number, symbolOrCurrency: string): string {
  if (isNaN(amount)) return `${symbolOrCurrency}0`;
  const symbol = getCurrencySymbol(symbolOrCurrency);
  const formatted = amount % 1 === 0 
    ? amount.toLocaleString() 
    : amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
}

/**
 * Converts price from a source currency to target currency using ZAR base
 */
export function convertPrice(
  amount: number, 
  fromCurrencyCode: string, 
  toCurrencyCode: string,
  liveRates?: Record<string, number>
): number {
  if (fromCurrencyCode === toCurrencyCode) return amount;
  if (!amount || isNaN(amount)) return 0;

  const fromInfo = SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.currencyCode === fromCurrencyCode) || DEFAULT_COUNTRY;
  const toInfo = SUPPORTED_COUNTRY_MARKETPLACES.find(c => c.currencyCode === toCurrencyCode) || DEFAULT_COUNTRY;

  const fromRateToZAR = liveRates?.[fromCurrencyCode] || fromInfo.defaultRatePerZAR;
  const toRateToZAR = liveRates?.[toCurrencyCode] || toInfo.defaultRatePerZAR;

  // Convert amount from `fromCurrency` to ZAR
  const amountInZar = fromRateToZAR > 0 ? amount / fromRateToZAR : amount;
  // Convert from ZAR to `toCurrency`
  const converted = amountInZar * toRateToZAR;

  return Math.round(converted * 100) / 100;
}
