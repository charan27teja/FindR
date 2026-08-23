'use client';

import React, { useState, useEffect } from 'react';

const ICONS = [
  { name: 'Bag', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFqgeGkzVzKPesUEte0Oh4kyg_qqpAqrUFLQT6fmbm_jXSIsSSRgkGZj51vnGr0Ozw0LcH3zudJFmKCRvKPnYpVFuK08QCsoxjxlTBoT2j7xGw0xpE4Xi3avfa9my-JLMerI4jQz7_DglkrPsSXcVT0eiIZhgnpiQZ42I2hdoSW7JQvcCuQbvZu9_vspP40-M3QDgZLTfZGCgI01MPQ_tRiHlsgwGBM-eF14OikoTTiLTedKGariO0RgTtxQ2obDp-JEs' },
  { name: 'Bottle', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxxje_1y3JQpG2-sUCJKT6D-Ghi-FNYiD851xfFthRt1_YfSaGSEtOsEWI2UiQvJFK_DeEAKBE1UNpwG6gMIDotbRCkNZ04Drd-Gu5WHcEACGqzIvlZA-Gc3RI1GLCLgLUfeV1cIU3UV0e1o0nERrLN35LrT9JitP_v_TD7IGbNXgJlxeaKSr7IozrnaSbfKnVsDoJUlw9LVrA-EQDXCMX29NjdmLCd0FgerrqDxUGRrw2uVveUr0p-aY0C5l0VGVcziA' },
  { name: 'Earbuds', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAewImhC23fGA9uG6-jm6y9ocyn9ydAEb4UgO6N4Pwe6BOledvJDqElu-LQgjmxAUzir1ZfApZ-QvPE5xJ5rPlQzx7wN84qkXtDmCYSpbiSL8a67PTdeBOHhu_1B18cFTeHmICCiLh2YqqUR2I6CFd5zP2KdIiGy7kF4X4EDHRMTwWcc4mIhr63zyDkzhBOOwO2-elJ2JgXoFoT_a7uj88KEADFH2BrVXVD3FbxfjN7lqrKwvVv6raWpzlVZ1awe10-uus' },
  { name: 'Keys', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-Vp0d_jXHMDctZV1Rwz5ezwTtjzMHIBCVDHSX1i4O5CGeC9MPqKZ2PvZhzyPZJoOhyu3PYmWKy9kETz6pUWuV94bEn3aZEX1wtRrR0HVknc4I_Z3xcPNAA-9gKGx6arb6EnlAVyzHPi2vb4mGcVH63pi-0YwnCQZbejdBNhpxrLTr3uVuGR1lfSViP5FRWNjXmNMfWvyFQmxYzXLOLk8B4U-Di4i-x3QdhIZ21_dhyNWrU9PYYoTczedYqshCq7iv93s' },
  { name: 'Wallet', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARcnhY1YYxkaDDoxGPTF5jHUdyfTcyD6UHa4O7PH-E0_fplNPYNcb4yVtNqVmmNhSUW2cUjEVGngIb6_7KNjNV-d0UK-tXfv3uZKF-UYH_YTH5JcNfOW8i_Qd3TVVYqg5Hw9lFfGVkZgkDse5vpWCuJrmoFclEKzYIHqEaCZsxmaz1PRTF-d-uI_XnI7YuhTYRtEzGAkRKBlQQzrMEpS4wIr1kVQyZDTuiSoT2sTp2S0DkVteHxokGRM4ly4o7fG20tI8' },
  { name: 'Watch', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKbj5pkDupT73vvjhWf2y4P215_7N5gEmlQaLihH9SHCrJr0tHp4s9mxC7lXP-9LN38uo6-Vd1a1-67FI_KMPTW7JJM-8fWGgaujQ4jo_RjOY3HaVGzUMkShwZwl0VIUxCLfjLRUUghi0d-P9IcFxDxaD4Ob446zummpstO7HQsGkohV-4KX3hTOnooWJeQXnOyzvQFtRN7KvfvoTkr2y4iVvCqN17L9E4mGXa5I56IynPhNwI_r2ovfINBsuxsdbx-KI' }
];

// One tip per visit — the reel is far too quick to read a tip per icon.
const TIPS = [
  'Search by colour and category — no need to remember the brand.',
  'Left it in a lecture hall? Report it, desks log new items daily.',
  'Small things turn up more often than you would think.',
  'Add a private detail only you would know. It speeds up verification.',
  'Wallets and phones are always checked by staff before handover.',
  'Report once and we notify you the moment it is handed in.'
];

export function LoadingScreen({ isLoading = true }: { isLoading?: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitionState, setTransitionState] = useState<'active' | 'exit'>('active');
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<'logo' | 'icons'>('logo');
  const [order, setOrder] = useState(() => ICONS.map((_, i) => i));
  const [tip, setTip] = useState(TIPS[0]);

  // Randomised after mount, never during render — a random order on the
  // server would not match the client and would break hydration.
  useEffect(() => {
    if (!isLoading) return;
    setOrder((prev) => [...prev].sort(() => Math.random() - 0.5));
    setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
  }, [isLoading]);

  // The wordmark plays once per page load. This component stays mounted for
  // the session, so later route transitions open straight on the icon reel.
  useEffect(() => {
    const timer = setTimeout(() => setPhase('icons'), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(false), 250);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (phase !== 'icons' || !isLoading) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const interval = setInterval(() => {
      setTransitionState('exit');

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % ICONS.length);
        setTransitionState('active');
      }, 110); // 110ms transition time

    }, 460); // 0.46s cycle — four icons inside the ~1.9s reel

    return () => clearInterval(interval);
  }, [isLoading, phase]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-300 ${
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Flash overlay on start */}
      <div className="absolute inset-0 bg-white pointer-events-none animate-flash z-10" />

      <main className="relative flex flex-col items-center justify-center w-full h-full">
        {phase === 'logo' ? (
          /* Logo screen — the name alone, then it clears for the reel. */
          <h1 className="logo-mark text-[clamp(2rem,12vw,3.25rem)] font-semibold tracking-[0.12em] text-white">
            FindR
          </h1>
        ) : (
          <div className="rise flex flex-col items-center">
            {/* Icon Container */}
            <div className="relative w-[120px] h-[120px] flex justify-center items-center">
              {ICONS.map((icon, idx) => {
                const shown = order[currentIndex];
                const isActive = idx === shown && transitionState === 'active';
                const isExiting = idx === shown && transitionState === 'exit';

                return (
                  <div
                    key={icon.name}
                    className={`absolute w-full h-full transition-all duration-100 ease-out pointer-events-none ${
                      isActive
                        ? 'opacity-100 scale-100'
                        : isExiting
                        ? 'opacity-0 scale-[0.95]'
                        : 'opacity-0 scale-[0.9]'
                    }`}
                  >
                    <img
                      src={icon.src}
                      alt={`${icon.name} Icon`}
                      className="w-full h-full object-contain brightness-0 invert"
                    />
                  </div>
                );
              })}
            </div>

            {/* Tip — keyed so it replays its entrance when it changes. */}
            <p
              key={tip}
              className="rise mt-10 max-w-xs px-6 text-center text-sm leading-relaxed text-white/60"
            >
              {tip}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
