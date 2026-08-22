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

export function LoadingScreen({ isLoading = true }: { isLoading?: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitionState, setTransitionState] = useState<'active' | 'exit'>('active');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      if (!isLoading) {
        setVisible(false);
      }
      return;
    }

    if (!isLoading) {
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }

    setVisible(true);

    const interval = setInterval(() => {
      setTransitionState('exit');
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % ICONS.length);
        setTransitionState('active');
      }, 200); // 200ms transition time
      
    }, 1500); // 1.5s cycle duration

    return () => clearInterval(interval);
  }, [isLoading]);

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
        {/* Icon Container */}
        <div className="relative w-[120px] h-[120px] flex justify-center items-center">
          {ICONS.map((icon, idx) => {
            const isActive = idx === currentIndex && transitionState === 'active';
            const isExiting = idx === currentIndex && transitionState === 'exit';

            return (
              <div
                key={icon.name}
                className={`absolute w-full h-full transition-all duration-200 ease-out pointer-events-none ${
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

        {/* Brand Text */}
        <h1 className="absolute top-[calc(50%+80px)] text-[22px] font-medium tracking-[0.12em] text-white">
          Findr
        </h1>
      </main>
    </div>
  );
}
