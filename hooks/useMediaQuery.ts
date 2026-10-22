'use client';

import { useEffect, useState } from 'react';

/** CSS 미디어 쿼리 일치 여부. SSR/첫 렌더는 false이며 마운트 후 갱신된다. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}
