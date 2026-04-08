import React from 'react';
import Svg, { Path, Defs, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';

export function InstagramIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <RadialGradient id="ig" cx="30%" cy="107%" r="150%">
          <Stop offset="0%" stopColor="#fdf497" />
          <Stop offset="5%" stopColor="#fdf497" />
          <Stop offset="45%" stopColor="#fd5949" />
          <Stop offset="60%" stopColor="#d6249f" />
          <Stop offset="90%" stopColor="#285AEB" />
        </RadialGradient>
      </Defs>
      <Rect width="24" height="24" rx="6" fill="url(#ig)" />
      <Path d="M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zm0 7.4a2.9 2.9 0 110-5.8 2.9 2.9 0 010 5.8zm4.7-7.6a1.05 1.05 0 11-2.1 0 1.05 1.05 0 012.1 0zM18.5 8.1a4.5 4.5 0 00-1.1-3.2A4.5 4.5 0 0014.2 3.8c-1.3-.07-5.1-.07-6.4 0a4.5 4.5 0 00-3.2 1.1A4.5 4.5 0 003.5 8.1c-.07 1.3-.07 5.1 0 6.4a4.5 4.5 0 001.1 3.2 4.5 4.5 0 003.2 1.1c1.3.07 5.1.07 6.4 0a4.5 4.5 0 003.2-1.1 4.5 4.5 0 001.1-3.2c.07-1.3.07-5.1 0-6.4zm-1.9 7.8a2.97 2.97 0 01-1.7 1.7c-1.2.47-3.9.36-5.2.36s-4 .1-5.2-.36a2.97 2.97 0 01-1.7-1.7c-.47-1.2-.36-3.9-.36-5.2s-.1-4 .36-5.2a2.97 2.97 0 011.7-1.7c1.2-.47 3.9-.36 5.2-.36s4-.1 5.2.36a2.97 2.97 0 011.7 1.7c.47 1.2.36 3.9.36 5.2s.1 4-.36 5.2z" fill="#fff" />
    </Svg>
  );
}

export function TwitterIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="6" fill="#000" />
      <Path d="M13.36 10.87L18.04 5.5h-1.11l-4.06 4.66L9.69 5.5H5.5l4.9 7.04L5.5 18.5h1.11l4.28-4.92 3.42 4.92H18.5l-5.14-7.63zm-1.52 1.74l-.5-.7L7.2 6.34h1.7l3.18 4.5.5.7 4.14 5.85h-1.7l-3.38-4.78z" fill="#fff" />
    </Svg>
  );
}

export function LinkedInIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="6" fill="#0A66C2" />
      <Path d="M8.34 18.5H5.67V9.88h2.67V18.5zM7 8.7a1.55 1.55 0 110-3.1 1.55 1.55 0 010 3.1zM18.5 18.5h-2.66v-4.2c0-1-.02-2.28-1.39-2.28-1.39 0-1.6 1.09-1.6 2.21v4.27h-2.67V9.88h2.56v1.18h.04a2.81 2.81 0 012.53-1.39c2.7 0 3.2 1.78 3.2 4.1v4.73z" fill="#fff" />
    </Svg>
  );
}

export function GithubIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="6" fill="#24292f" />
      <Path d="M12 4.5a7.5 7.5 0 00-2.37 14.62c.37.07.51-.16.51-.36v-1.3c-2.1.46-2.54-1.01-2.54-1.01a2 2 0 00-.84-1.1c-.68-.47.05-.46.05-.46a1.59 1.59 0 011.16.78 1.61 1.61 0 002.2.63 1.62 1.62 0 01.48-1.01c-1.67-.19-3.43-.84-3.43-3.73a2.92 2.92 0 01.78-2.03 2.72 2.72 0 01.07-2s.63-.2 2.08.78a7.16 7.16 0 013.78 0c1.44-.97 2.07-.78 2.07-.78a2.72 2.72 0 01.08 2 2.92 2.92 0 01.77 2.03c0 2.9-1.76 3.54-3.44 3.72a1.81 1.81 0 01.51 1.4v2.08c0 .2.14.44.52.36A7.5 7.5 0 0012 4.5z" fill="#fff" />
    </Svg>
  );
}

export function WebsiteIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width="24" height="24" rx="6" fill="#6366F1" />
      <Circle cx="12" cy="12" r="6.5" stroke="#fff" strokeWidth="1.3" fill="none" />
      <Path d="M12 5.5c-1.5 1.5-2.4 3.9-2.4 6.5s.9 5 2.4 6.5c1.5-1.5 2.4-3.9 2.4-6.5s-.9-5-2.4-6.5z" stroke="#fff" strokeWidth="1.3" fill="none" />
      <Path d="M5.5 12h13" stroke="#fff" strokeWidth="1.3" />
    </Svg>
  );
}
