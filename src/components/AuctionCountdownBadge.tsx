import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface AuctionCountdownBadgeProps {
  endDate?: string | null;
  className?: string;
}

function formatRemainingTime(targetDate: string, now: number) {
  const endTime = new Date(targetDate).getTime();

  if (Number.isNaN(endTime)) {
    return null;
  }

  const diff = Math.max(0, endTime - now);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}jrs ${hours}h ${minutes}m ${seconds}s`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function AuctionCountdownBadge({
  endDate,
  className = "",
}: AuctionCountdownBadgeProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!endDate) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [endDate]);

  if (!endDate) return null;

  const remainingTime = formatRemainingTime(endDate, now);

  if (!remainingTime) return null;

  return (
    <Badge className={`z-10 border-0 px-3 py-1 text-white shadow-lg backdrop-blur-sm ${className}`} style={{ backgroundColor: "hsl(13.96deg 87.07% 54.51%)", boxShadow: "0 10px 30px hsla(13.96, 87.07%, 54.51%, 0.3)" }}>
      <Clock className="mr-1 h-3 w-3 text-white" />
      Temps restant : {remainingTime}
    </Badge>
  );
}
