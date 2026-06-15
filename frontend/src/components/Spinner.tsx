interface SpinnerProps {
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = { sm: 14, md: 22, lg: 32 };

export default function Spinner({ size = "md" }: SpinnerProps) {
  const px = SIZE_MAP[size];
  return (
    <span
      style={{
        display: "inline-block",
        width: px,
        height: px,
        border: `2px solid var(--border)`,
        borderTopColor: "var(--primary)",
        borderRadius: "50%",
        animation: "spin 0.65s linear infinite",
        flexShrink: 0,
      }}
      aria-label="Loading"
      role="status"
    />
  );
}
