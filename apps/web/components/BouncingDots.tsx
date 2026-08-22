export default function BouncingDots({ className = "h-2 w-2 bg-white" }: { className?: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5" role="status" aria-label="Loading">
      <span
        className={`rounded-full ${className}`}
        style={{ animation: "dot-bounce 1.4s infinite ease-in-out both", animationDelay: "-0.32s" }}
      />
      <span
        className={`rounded-full ${className}`}
        style={{ animation: "dot-bounce 1.4s infinite ease-in-out both", animationDelay: "-0.16s" }}
      />
      <span
        className={`rounded-full ${className}`}
        style={{ animation: "dot-bounce 1.4s infinite ease-in-out both" }}
      />
    </div>
  );
}
