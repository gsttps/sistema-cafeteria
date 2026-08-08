/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Los colores apuntan a las variables CSS de index.css, nunca a un
      // hexadecimal. Así el tema claro futuro es un bloque de overrides y no
      // una reescritura de componentes.
      colors: {
        superficie: {
          DEFAULT: 'var(--superficie)',
          elevada: 'var(--superficie-elevada)',
          alta: 'var(--superficie-alta)',
          sutil: 'var(--superficie-sutil)',
        },
        borde: {
          DEFAULT: 'var(--borde)',
          fuerte: 'var(--borde-fuerte)',
        },
        tinta: {
          DEFAULT: 'var(--tinta)',
          suave: 'var(--tinta-suave)',
          tenue: 'var(--tinta-tenue)',
        },
        acento: {
          DEFAULT: 'var(--acento)',
          tenue: 'var(--acento-tenue)',
          suave: 'var(--acento-suave)',
          borde: 'var(--acento-borde)',
          contraste: 'var(--acento-contraste)',
        },
        // Reservados para el estado financiero. No usar de decoración.
        deuda: {
          DEFAULT: 'var(--deuda)',
          suave: 'var(--deuda-suave)',
          borde: 'var(--deuda-borde)',
        },
        pagado: {
          DEFAULT: 'var(--pagado)',
          suave: 'var(--pagado-suave)',
          borde: 'var(--pagado-borde)',
        },
        velo: 'var(--velo)',
      },
      borderColor: {
        DEFAULT: 'var(--borde)',
      },
      borderRadius: {
        sm: 'var(--radio-sm)',
        DEFAULT: 'var(--radio)',
        md: 'var(--radio)',
        lg: 'var(--radio-lg)',
      },
      fontFamily: {
        sans: ['Archivo Variable', 'system-ui', '-apple-system', 'sans-serif'],
        cifra: ['IBM Plex Mono', 'ui-monospace', 'SF Mono', 'monospace'],
      },
      transitionDuration: {
        rapida: 'var(--t-rapida)',
        entrada: 'var(--t-entrada)',
      },
      keyframes: {
        aparecer: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        aparecer: 'aparecer var(--t-entrada) ease-out',
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
