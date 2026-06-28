/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{js,jsx}",
		"./components/**/*.{js,jsx}",
		"./app/**/*.{js,jsx}",
		"./src/**/*.{js,jsx}",
	],
	prefix: "",
	theme: {
		fontFamily: {
			sans: [
				'Hanken Grotesk',
				'ui-sans-serif',
				'system-ui',
				'Segoe UI',
				'Roboto',
				'Helvetica Neue',
				'Arial',
				'sans-serif',
			],
			display: [
				'Archivo',
				'ui-sans-serif',
				'system-ui',
				'sans-serif',
			],
			mono: [
				'DM Mono',
				'ui-monospace',
				'SFMono-Regular',
				'Menlo',
				'monospace',
			],
		},
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			transitionTimingFunction: {
				smooth: 'cubic-bezier(0.33, 1, 0.68, 1)',
				out: 'cubic-bezier(0.22, 1, 0.36, 1)',
			},
			colors: {
				border: 'var(--line)',
				input: 'var(--line)',
				ring: 'var(--red)',
				background: 'var(--paper)',
				foreground: 'var(--ink)',
				primary: {
					DEFAULT: 'var(--strong)',
					foreground: 'var(--on-strong)'
				},
				secondary: {
					DEFAULT: 'var(--surface)',
					foreground: 'var(--ink)'
				},
				destructive: {
					DEFAULT: 'var(--red)',
					foreground: '#FFFFFF'
				},
				success: {
					DEFAULT: 'var(--green)',
					foreground: '#FFFFFF'
				},
				warning: {
					DEFAULT: 'var(--amber)',
					foreground: 'var(--ink)'
				},
				muted: {
					DEFAULT: 'var(--hair)',
					foreground: 'var(--muted)'
				},
				accent: {
					DEFAULT: 'var(--paper)',
					foreground: 'var(--ink)'
				},
				popover: {
					DEFAULT: 'var(--surface)',
					foreground: 'var(--ink)'
				},
				card: {
					DEFAULT: 'var(--surface)',
					foreground: 'var(--ink)'
				},
				sidebar: {
					DEFAULT: 'var(--sidebar-background)',
					foreground: 'var(--sidebar-foreground)',
					primary: 'var(--sidebar-primary)',
					'primary-foreground': 'var(--sidebar-primary-foreground)',
					accent: 'var(--sidebar-accent)',
					'accent-foreground': 'var(--sidebar-accent-foreground)',
					border: 'var(--sidebar-border)',
					ring: 'var(--sidebar-ring)'
				},
				paper: 'var(--paper)',
				surface: 'var(--surface)',
				ink: 'var(--ink)',
				line: 'var(--line)',
				strong: 'var(--strong)',
				'on-strong': 'var(--on-strong)',
				'strong-hair': 'var(--strong-hair)',
				faint: 'var(--faint)',
				hair: 'var(--hair)',
				muted2: 'var(--muted-2)',
				signal: 'var(--red)',
				'header-bg': 'var(--header-bg)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-up': {
					from: {
						opacity: '0',
						transform: 'translateY(14px)',
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)',
					},
				},
				'fade-down': {
					from: {
						opacity: '0',
						transform: 'translateY(-10px)',
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)',
					},
				},
				'subtle-zoom': {
					from: {
						opacity: '0',
						transform: 'scale(0.98)',
					},
					to: {
						opacity: '1',
						transform: 'scale(1)',
					},
				},
				'gradient-shift': {
					'0%, 100%': {
						backgroundPosition: '0% 50%',
					},
					'50%': {
						backgroundPosition: '100% 50%',
					},
				},
				float: {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-4px)' },
				},
				'marquee-left': {
					from: { transform: 'translateX(0)' },
					to: { transform: 'translateX(-50%)' },
				},
				'marquee-right': {
					from: { transform: 'translateX(-50%)' },
					to: { transform: 'translateX(0)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-up': 'fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
				'fade-down': 'fade-down 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
				'subtle-zoom': 'subtle-zoom 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
				'gradient-shift': 'gradient-shift 8s ease-in-out infinite',
				float: 'float 6s ease-in-out infinite',
				'marquee-left': 'marquee-left 38s linear infinite',
				'marquee-right': 'marquee-right 32s linear infinite',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
};
