/**
 * Renders one piece of player-facing evidence.
 * Text / image / number / quote are fully styled today; the remaining
 * evidence types fall back to a labelled text rendering so future types
 * (audio, video, location, object, logo, symbol…) slot in without
 * changing the board.
 */
import type { PlayerEvidence } from "../game/EvidenceEngine";

const TYPE_LABELS: Record<string, string> = {
  text: "Exhibit",
  image: "Photograph",
  cropped_image: "Photograph — Detail",
  number: "Number",
  date: "Date",
  quote: "Quote",
  location: "Location",
  object: "Object",
  logo: "Mark",
  audio: "Recording",
  video: "Footage",
  color: "Color",
  symbol: "Symbol",
};

interface Props {
  evidence: PlayerEvidence;
  index: number;
  highlight?: boolean;
}

export default function EvidenceCard({ evidence, index, highlight }: Props) {
  const wide =
    evidence.type === "quote" ||
    evidence.type === "image" ||
    evidence.type === "cropped_image";
  const classes = [
    "evidence-card",
    wide ? "evidence-card--wide" : "",
    highlight ? "evidence-card--new" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} data-testid={`evidence-${evidence.id}`}>
      <span className="etype">
        #{index + 1} · {TYPE_LABELS[evidence.type] ?? evidence.type}
      </span>
      <EvidenceContent evidence={evidence} />
      {evidence.caption ? (
        <span className="ecaption">{evidence.caption}</span>
      ) : null}
    </div>
  );
}

function EvidenceContent({ evidence }: { evidence: PlayerEvidence }) {
  switch (evidence.type) {
    case "image":
    case "cropped_image":
      return <img src={evidence.content} alt="Evidence" loading="lazy" />;
    case "number":
    case "date":
      return <div className="econtent econtent--number">{evidence.content}</div>;
    case "quote":
      return <div className="econtent econtent--quote">{evidence.content}</div>;
    default:
      return <div className="econtent">{evidence.content}</div>;
  }
}
