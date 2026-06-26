import { motion } from "framer-motion";

interface Props {
  symbol: string;
  isWatched: boolean;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = { sm: 14, md: 18, lg: 22 };

export default function StarToggle({ symbol, isWatched, onToggle, size = "md" }: Props) {
  const px = SIZE_MAP[size];

  return (
    <motion.button
      type="button"
      className={`star-toggle ${isWatched ? "watched" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.1 }}
      title={isWatched ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "2px",
        lineHeight: 1,
        color: isWatched ? "var(--warning)" : "var(--text-3)",
        transition: "color 0.15s ease",
        fontSize: px,
      }}
    >
      {isWatched ? "★" : "☆"}
    </motion.button>
  );
}
