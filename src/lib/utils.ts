import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToRgb(hex: string) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  };
}

export function mixColors(color1: {r: number, g: number, b: number}, color2: {r: number, g: number, b: number}, weight: number) {
  const w = weight / 100;
  const r = Math.round(color1.r * w + color2.r * (1 - w));
  const g = Math.round(color1.g * w + color2.g * (1 - w));
  const b = Math.round(color1.b * w + color2.b * (1 - w));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

export function generateColorPalette(hex: string) {
  const base = hexToRgb(hex);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  
  return {
    '50': mixColors(base, white, 10),
    '100': mixColors(base, white, 20),
    '200': mixColors(base, white, 40),
    '300': mixColors(base, white, 60),
    '400': mixColors(base, white, 80),
    '500': hex,
    '600': mixColors(base, black, 85),
    '700': mixColors(base, black, 70),
    '800': mixColors(base, black, 55),
    '900': mixColors(base, black, 40),
    '950': mixColors(base, black, 25),
  };
}
