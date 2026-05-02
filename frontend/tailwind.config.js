/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
        backgroundImage: {
            "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
            "gradient-conic":
            "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            'rainbow': "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)",
            'rainbow-less': "linear-gradient(45deg, red, blue, indigo)",
            'rainbow-less-hover': "linear-gradient(45deg, #ff4d4d, #4d4dff, #4d4dff)",
            'rainbow-less-disabled': "linear-gradient(45deg, darkred, darkblue, darkindigo)",
        },
      colors: {
        // Athena Growth brand palette — monochrome with a single cyan accent.
        // Surfaces step from near-black up to a soft mid-grey.
        primary: "#0E0F14",            // base background (page)
        secondary: "#1A1C24",           // navbar / cards
        "light-secondary": "#262934",   // hover, raised surface
        darkblue: "#11131A",            // deepest pit (kept name for compat)
        "light-gray": "#3A3D4A",        // subtle borders / disabled
        // Accent: bright cream-white for primary CTAs (matches brand wordmark),
        // with a soft cyan-glow on hover (the "tech" overlay on the brand).
        quaternary: "#F5F5F7",
        quaternaryhover: "#5EE7F0",
        button: "#0E0F14",              // text-on-CTA
      },
    },
  },
  plugins: [],
};
