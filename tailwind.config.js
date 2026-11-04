const neutral = {50:'#faf9f6',100:'#f5f3ef',200:'#e5e2dc',300:'#c8c6c1',400:'#a8a7a2',500:'#85847f',600:'#61615d',700:'#3c3d3b',800:'#272829',900:'#191a1b',950:'#101112'};
const brand = {50:'#fff6ef',100:'#ffe8d5',200:'#ffd0ab',300:'#ffb783',400:'#ff9a54',500:'#ff842e',600:'#b94a08',700:'#913a0b',800:'#723010',900:'#482617',950:'#291a13'};
export default {
  content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}','./apps/platform/**/*.{js,ts,jsx,tsx}','./apps/landing/src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {colors:{slate:neutral,gray:neutral,zinc:neutral,sky:brand,blue:brand,cyan:brand,indigo:brand}} },
  plugins: [],
};
