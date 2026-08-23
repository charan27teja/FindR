import BouncingDots from "@/components/BouncingDots";

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-black">
      <BouncingDots className="h-2 w-2 bg-white/70" />
    </div>
  );
}
