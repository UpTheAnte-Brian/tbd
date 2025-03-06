import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import tailwindcssConfig from './tailwind.config';

const config = {
  plugins: [
    tailwindcss(tailwindcssConfig),
    autoprefixer,
  ],
};

export default config;