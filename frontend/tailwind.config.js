/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Paleta semántica: mapea intención -> color base de Tailwind.
      // Permite usar text-primary/bg-success en vez de blue-600/emerald-500 sueltos.
      colors: {
        primary: {
          DEFAULT: '#3b82f6', // blue-500
          hover: '#60a5fa',   // blue-400
          soft: 'rgba(59, 130, 246, 0.1)',
        },
        success: {
          DEFAULT: '#10b981', // emerald-500
          hover: '#34d399',   // emerald-400
        },
        danger: {
          DEFAULT: '#f43f5e', // rose-500
          hover: '#fb7185',   // rose-400
        },
        warning: {
          DEFAULT: '#f59e0b', // amber-500
          hover: '#fbbf24',   // amber-400
        },
      },
      // Escala de z-index semántica para evitar el caos de z-50 / z-[200] / z-[9999].
      // Orden de apilamiento: header < dropdown < modal < modal anidado (confirmación).
      zIndex: {
        header: '40',
        dropdown: '50',
        modal: '100',
        'modal-nested': '200',
      },
    },
  },
  plugins: [],
}
