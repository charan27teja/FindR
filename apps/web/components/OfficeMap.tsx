/**
 * Where to carry a found item.
 *
 * An OpenStreetMap embed rather than a mapping library: it is an iframe and a
 * URL, needs no key and no dependency, and the only thing we ask of it is a
 * pin on a street. The tiles arrive in colour, so a CSS filter turns them into
 * the same black-on-black the rest of these screens use — grayscale first,
 * then inverted, which is what makes a light map read as a dark one.
 *
 * ponytail: the pin is the venue, not the desk inside it. Nothing in the
 * schema knows where the lost-and-found counter actually is; `nodes` is the
 * table for that when someone maps them.
 */
export default function OfficeMap({
  name,
  latitude,
  longitude,
  address,
}: {
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
}) {
  // A tight box so the venue fills the frame instead of sitting in a region.
  const d = 0.004;
  const bbox = [longitude - d, latitude - d, longitude + d, latitude + d].join("%2C");
  const src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}` +
    `&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/15">
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">The office</span>
          <span className="block truncate text-xs text-[#AAAAAA]">{address || name}</span>
        </span>
        <a
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
          target="_blank"
          rel="noreferrer noopener"
          className="shrink-0 text-xs text-[#AAAAAA] underline underline-offset-4 hover:text-white"
        >
          Directions
        </a>
      </div>

      <iframe
        title={`Map showing the lost-and-found office at ${name}`}
        src={src}
        loading="lazy"
        className="block h-48 w-full border-0 [filter:grayscale(1)_invert(1)_brightness(0.92)_contrast(1.15)]"
      />

      <p className="px-4 py-2 text-[11px] leading-relaxed text-[#777777]">
        Pin shows {name}. Ask at the entrance for the lost-and-found desk.
      </p>
    </div>
  );
}
