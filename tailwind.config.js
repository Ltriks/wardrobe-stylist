/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: Object.fromEntries(['slate', 'gray', 'blue', 'indigo', 'purple', 'green', 'emerald', 'pink', 'orange', 'yellow', 'amber'].map(name => [name, Object.fromEntries([50,100,200,300,400,500,600,700,800,900,950].map(shade => [shade, `rgb(var(--tone-${shade}) / <alpha-value>)`]))])),
      borderRadius: { sm: 'var(--corner)', DEFAULT: 'var(--corner)', md: 'var(--corner)', lg: 'var(--corner)', xl: 'var(--corner)', '2xl': 'var(--corner)', '3xl': 'var(--corner)', full: 'var(--corner)' },
    },
  },
  plugins: [],
}