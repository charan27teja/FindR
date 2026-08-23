"use client";

import { useEffect, useState } from "react";

export function ClientDate({ date, format = "datetime" }: { date: string | Date; format?: "date" | "datetime" }) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    const d = new Date(date);
    if (format === "date") {
      setFormatted(d.toLocaleDateString());
    } else {
      setFormatted(d.toLocaleString());
    }
  }, [date, format]);

  if (!formatted) {
    // Return a placeholder or the raw ISO string while loading to avoid layout shift,
    // or just an empty string. Let's return an empty string to avoid mismatch.
    return <span> </span>;
  }

  return <span>{formatted}</span>;
}
