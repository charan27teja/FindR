import BouncingDots from "@/components/BouncingDots";

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <BouncingDots className="h-2 w-2 bg-neutral-400" />
    </div>
  );
}
