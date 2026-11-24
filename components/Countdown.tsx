"use client";

import { useEffect, useState } from "react";
import { getCountdown, type CountdownInfo } from "@/lib/utils";

export default function Countdown({ deadline }: { deadline: string }) {
  const [info, setInfo] = useState<CountdownInfo>(() => getCountdown(deadline));

  useEffect(() => {
    setInfo(getCountdown(deadline));
    const timer = window.setInterval(() => setInfo(getCountdown(deadline)), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="countdown-chip" title="Compte à rebours avant la date limite">
      <span className="countdown-label">{info.label}</span>
      <span className="countdown-time">
        {info.finished
          ? "Clôture passée"
          : `${pad(info.hours)}h ${pad(info.minutes)}m ${pad(info.seconds)}s`}
      </span>
    </div>
  );
}
