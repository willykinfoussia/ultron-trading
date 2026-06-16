import { motion } from "framer-motion";

export interface SegmentTab {
  id: string;
  label: string;
  icon?: string;
  tone?: "success" | "danger" | "warning" | "primary";
}

interface Props {
  tabs: SegmentTab[];
  active: string;
  onChange: (id: string) => void;
  fullWidth?: boolean;
  layoutId?: string;
}

const SPRING = { type: "spring" as const, stiffness: 420, damping: 32 };

export default function SegmentedControl({
  tabs,
  active,
  onChange,
  fullWidth = false,
  layoutId = "segmented-indicator",
}: Props) {
  return (
    <div className={`segmented-control${fullWidth ? " segmented-control--full" : ""}`}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const toneClass = tab.tone ? ` segmented-control-btn--${tab.tone}` : "";
        return (
          <button
            key={tab.id}
            type="button"
            className={`segmented-control-btn${isActive ? " active" : ""}${toneClass}`}
            onClick={() => onChange(tab.id)}
          >
            {isActive && (
              <motion.span
                className="segmented-control-indicator"
                layoutId={layoutId}
                transition={SPRING}
              />
            )}
            <span className="segmented-control-label">
              {tab.icon && `${tab.icon} `}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
