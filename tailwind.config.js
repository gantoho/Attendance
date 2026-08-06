/** @type {import('tailwindcss').Config} */
const { heroui } = require('@heroui/theme');

/** iOS 蓝 (#007AFF) 完整色阶 */
const iosBlue = {
  50: '#e5f1ff',
  100: '#cfe6ff',
  200: '#a5d2ff',
  300: '#6fb7ff',
  400: '#3896ff',
  500: '#007AFF',
  600: '#005fe0',
  700: '#004ab8',
  800: '#00398f',
  900: '#002e73',
  950: '#001e4d',
  DEFAULT: '#007AFF',
  foreground: '#FFFFFF',
};

/** iOS 深色蓝 (#0A84FF) */
const iosBlueDark = {
  50: '#e5f3ff',
  100: '#cce7ff',
  200: '#99ceff',
  300: '#66b5ff',
  400: '#339cff',
  500: '#0A84FF',
  600: '#0868cc',
  700: '#064e99',
  800: '#043566',
  900: '#021b33',
  950: '#010d1a',
  DEFAULT: '#0A84FF',
  foreground: '#FFFFFF',
};

/** iOS 绿 (#34C759) */
const iosGreen = {
  50: '#e9f9ee',
  100: '#d1f3dc',
  200: '#a3e6b9',
  300: '#75d996',
  400: '#47cc73',
  500: '#34C759',
  600: '#29a047',
  700: '#1f7a36',
  800: '#155324',
  900: '#0a2d13',
  950: '#05170a',
  DEFAULT: '#34C759',
  foreground: '#FFFFFF',
};

/** iOS 橙 (#FF9500) */
const iosOrange = {
  50: '#fff5e6',
  100: '#ffebcc',
  200: '#ffd799',
  300: '#ffc366',
  400: '#ffaf33',
  500: '#FF9500',
  600: '#cc7700',
  700: '#995900',
  800: '#663b00',
  900: '#331e00',
  950: '#1a0f00',
  DEFAULT: '#FF9500',
  foreground: '#FFFFFF',
};

/** iOS 红 (#FF3B30) */
const iosRed = {
  50: '#ffe9e8',
  100: '#ffd1cf',
  200: '#ffa3a0',
  300: '#ff7570',
  400: '#ff4a43',
  500: '#FF3B30',
  600: '#cc2f26',
  700: '#99241d',
  800: '#661814',
  900: '#330c0a',
  950: '#1a0605',
  DEFAULT: '#FF3B30',
  foreground: '#FFFFFF',
};

/** iOS 深灰紫 (secondary) */
const iosSecondary = {
  50: '#f2f2f5',
  100: '#e4e4ea',
  200: '#c9c9d4',
  300: '#aeaebf',
  400: '#9292aa',
  500: '#777795',
  600: '#5f5f77',
  700: '#474759',
  800: '#2f2f3c',
  900: '#18181e',
  950: '#0c0c10',
  DEFAULT: '#777795',
  foreground: '#FFFFFF',
};

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/components/**/*.js',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: '#F2F2F7',
            foreground: '#1C1C1E',
            primary: iosBlue,
            secondary: iosSecondary,
            success: iosGreen,
            warning: iosOrange,
            danger: iosRed,
            focus: '#007AFF',
            overlay: 'rgba(0, 0, 0, 0.4)',
            content1: '#FFFFFF',
            content2: '#F7F7F8',
            content3: '#EFEFF1',
            content4: '#E5E5EA',
            divider: 'rgba(60, 60, 67, 0.12)',
          },
          radius: {
            small: '8px',
            medium: '12px',
            large: '16px',
          },
        },
        dark: {
          colors: {
            background: '#141414',
            foreground: '#E8E8E8',
            primary: iosBlueDark,
            secondary: iosSecondary,
            success: iosGreen,
            warning: iosOrange,
            danger: iosRed,
            focus: '#0A84FF',
            overlay: 'rgba(0, 0, 0, 0.6)',
            content1: '#1A1A1A',
            content2: '#202020',
            content3: '#2A2A2A',
            content4: '#333333',
            divider: 'rgba(255, 255, 255, 0.12)',
          },
          radius: {
            small: '8px',
            medium: '12px',
            large: '16px',
          },
        },
      },
    }),
  ],
};
