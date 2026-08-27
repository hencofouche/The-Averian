import React, { useState, useEffect, useMemo } from 'react';
import { Globe, RefreshCw, Info, ChevronDown, Check, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export interface CurrencyRateInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  defaultRatePerZAR: number; // 1 ZAR in target currency
  decimals?: number;
}

export const SUPPORTED_CURRENCIES: CurrencyRateInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', defaultRatePerZAR: 0.055, decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', defaultRatePerZAR: 0.051, decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', defaultRatePerZAR: 0.043, decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', defaultRatePerZAR: 0.084, decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', defaultRatePerZAR: 0.075, decimals: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', defaultRatePerZAR: 0.092, decimals: 2 },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P', flag: '🇧🇼', defaultRatePerZAR: 0.75, decimals: 2 },
  { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$', flag: '🇳🇦', defaultRatePerZAR: 1.0, decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪', defaultRatePerZAR: 0.202, decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', defaultRatePerZAR: 4.76, decimals: 0 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', defaultRatePerZAR: 3.22, decimals: 0 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', defaultRatePerZAR: 0.31, decimals: 2 },
];

interface CurrencyConverterRatesProps {
  basePriceZar?: number;
  className?: string;
}

export function CurrencyConverterRates({ basePriceZar = 450, className }: CurrencyConverterRatesProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Fetch live exchange rates from open exchange API with fallback
  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/ZAR', {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.rates) {
          setRates(data.rates);
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch (err) {
      console.log('Using static exchange rate fallback', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const currentCurrencyInfo = useMemo(() => {
    return SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency) || SUPPORTED_CURRENCIES[0];
  }, [selectedCurrency]);

  const calculateRange = (currencyCode: string) => {
    const info = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    if (!info) return { base: 0, min5: 0, max10: 0, formatted: '' };

    const rate = rates[currencyCode] || info.defaultRatePerZAR;
    const baseForeign = basePriceZar * rate;
    
    // Add 5% and 10% extra buffer for bank foreign conversion fees & market spread
    const min5 = baseForeign * 1.05;
    const max10 = baseForeign * 1.10;

    const decimals = info.decimals !== undefined ? info.decimals : 2;

    const formatNum = (num: number) => {
      if (decimals === 0) {
        return Math.round(num).toLocaleString();
      }
      return num.toFixed(decimals);
    };

    return {
      base: baseForeign,
      min5,
      max10,
      formattedBase: `${info.symbol}${formatNum(baseForeign)}`,
      formattedRange: `${info.symbol}${formatNum(min5)} – ${info.symbol}${formatNum(max10)} ${info.code}`,
      minFormatted: `${info.symbol}${formatNum(min5)}`,
      maxFormatted: `${info.symbol}${formatNum(max10)}`
    };
  };

  const selectedCalc = calculateRange(selectedCurrency);

  return (
    <div className={cn("w-full bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Globe size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                International Currency Estimates
              </h4>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                +5% to +10% Fee Buffer
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Estimate subscription costs in your local currency (Base: R{basePriceZar} ZAR/yr)
            </p>
          </div>
        </div>

        <button
          onClick={fetchRates}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Refresh exchange rates"
        >
          <RefreshCw size={12} className={cn(isLoading && "animate-spin text-amber-400")} />
          <span className="text-[11px] font-medium">{lastUpdated ? `Live (${lastUpdated})` : 'Live Rates'}</span>
        </button>
      </div>

      {/* Main Selected Currency Calculator Banner */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Currency Selector Dropdown */}
        <div className="relative">
          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1.5">
            Select Your Currency
          </label>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-700 hover:border-amber-500/60 px-3.5 py-2.5 rounded-xl text-white font-bold text-sm min-w-[200px] transition-all cursor-pointer shadow-inner"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">{currentCurrencyInfo.flag}</span>
              <span>{currentCurrencyInfo.code}</span>
              <span className="text-xs text-zinc-400 font-normal truncate max-w-[90px]">({currentCurrencyInfo.name})</span>
            </span>
            <ChevronDown size={16} className={cn("text-zinc-400 transition-transform", isDropdownOpen && "rotate-180")} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsDropdownOpen(false)} 
              />
              <div className="absolute left-0 top-full mt-2 w-64 max-h-60 overflow-y-auto custom-scrollbar bg-zinc-950 border border-zinc-800 rounded-2xl p-1.5 shadow-2xl z-40 space-y-0.5">
                {SUPPORTED_CURRENCIES.map(curr => (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => {
                      setSelectedCurrency(curr.code);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left",
                      selectedCurrency === curr.code
                        ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{curr.flag}</span>
                      <span>{curr.code}</span>
                      <span className="text-[11px] text-zinc-400 font-normal">({curr.name})</span>
                    </span>
                    {selectedCurrency === curr.code && <Check size={14} className="text-amber-400" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Estimated Price Range Callout */}
        <div className="flex-1 sm:text-right bg-black/40 border border-zinc-800/80 rounded-xl p-3.5 sm:p-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/90 block">
            Estimated Annual Cost ({currentCurrencyInfo.code})
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
            {selectedCalc.formattedRange}
            <span className="text-xs font-bold text-zinc-400 ml-1.5 font-sans">/ year</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Exact charge: <span className="text-zinc-300 font-semibold">R{basePriceZar} ZAR</span> (Approx base ~{selectedCalc.formattedBase} + bank forex fee buffer)
          </p>
        </div>
      </div>

      {/* Quick Glance Popular Currencies Grid */}
      <div className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block">
          Quick Comparison (All Major Regions)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {SUPPORTED_CURRENCIES.slice(0, 8).map(curr => {
            const calc = calculateRange(curr.code);
            const isSelected = selectedCurrency === curr.code;
            return (
              <button
                key={curr.code}
                type="button"
                onClick={() => setSelectedCurrency(curr.code)}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer",
                  isSelected
                    ? "bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/5"
                    : "bg-zinc-900/60 border-zinc-800/70 hover:border-zinc-700 hover:bg-zinc-900"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <span>{curr.flag}</span>
                    <span>{curr.code}</span>
                  </span>
                  <span className="text-[9px] font-mono font-semibold text-zinc-400">
                    +5-10%
                  </span>
                </div>
                <div className="text-xs font-black text-amber-300 truncate">
                  {calc.minFormatted} – {calc.maxFormatted}
                </div>
                <span className="text-[9px] text-zinc-400 mt-0.5 truncate">
                  / year (~R{basePriceZar})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversion & Billing Notice */}
      <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex items-start gap-2.5 text-xs text-zinc-400">
        <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-[11px] leading-relaxed">
          <p>
            <strong className="text-zinc-200">How international billing works:</strong> Your card is billed securely in South African Rand (<span className="text-amber-300 font-mono font-bold">R{basePriceZar} ZAR</span>) via our card gateway.
          </p>
          <p className="text-zinc-400">
            Your issuing bank (Visa / Mastercard) automatically converts the transaction into your local currency at checkout. We include a standard <strong className="text-zinc-300">5% to 10% buffer</strong> in the estimate to account for foreign transaction spreads and conversion fee variance.
          </p>
        </div>
      </div>
    </div>
  );
}
