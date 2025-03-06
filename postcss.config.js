// import autoprefixer from 'autoprefixer';
// import tailwindcss from 'tailwindcss';
// import tailwindcssConfig from './tailwind.config';

// const config = {
//   plugins: [
//     tailwindcss(tailwindcssConfig),
//     autoprefixer,
//   ],
// };

// export default config;

export const plugins = {
  tailwindcss: {},
  autoprefixer: {},
};

// import autoprefixer from 'autoprefixer';
// import tailwindcss from 'tailwindcss';

// import tailwindcssConfig from './tailwind.config';

// export default { plugins: [autoprefixer, tailwindcss(tailwindcssConfig)] };

// // postcss.config.ts
// import type { Config } from 'postcss';

// const config: (ctx: { env: string }) => Config = (ctx) => ({
//   plugins: [
//     require('autoprefixer'),
//     // Conditionally include plugins based on the environment
//     ...(ctx.env === 'production' ? [require('cssnano')] : []),
//   ],
// });

// export default config;