type AdSize = "banner" | "rectangle" | "leaderboard" | "sidebar";

const AD_SIZES: Record<AdSize, { width: string; height: string; label: string }> = {
  banner: { width: "100%", height: "90px", label: "728×90" },
  rectangle: { width: "300px", height: "250px", label: "300×250" },
  leaderboard: { width: "100%", height: "90px", label: "970×90" },
  sidebar: { width: "160px", height: "600px", label: "160×600" },
};

type Props = {
  size?: AdSize;
  className?: string;
};

export function AdPlaceholder({ size = "banner", className = "" }: Props) {
  const config = AD_SIZES[size];
  
  return (
    <div 
      className={`ad-slot ${className}`}
      style={{ 
        width: config.width, 
        minHeight: config.height,
        maxWidth: "100%"
      }}
      aria-label="Рекламный блок"
    >
      <span>Реклама {config.label}</span>
    </div>
  );
}
