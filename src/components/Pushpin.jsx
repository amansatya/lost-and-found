export default function Pushpin({ color = "#8a3324" }) {
  return (
    <span className="pushpin" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle cx="9" cy="7" r="6" fill={color} />
        <circle cx="7" cy="5" r="1.6" fill="rgba(255,255,255,0.55)" />
        <rect x="8" y="12" width="2" height="5" rx="1" fill="#5a5245" />
      </svg>
    </span>
  );
}
