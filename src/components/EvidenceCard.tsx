/**
 * Renders one piece of player-facing evidence as a paper "exhibit" in the
 * case file. Every evidence type in the model renders: text, image,
 * cropped image, number, date, quote, location, object, logo, audio,
 * video, color and symbol.
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

const WIDE_TYPES = new Set([
  "quote",
  "image",
  "cropped_image",
  "audio",
  "video",
  "color",
]);

/** Object/logo/symbol content may be either a media path or plain text. */
function isMediaPath(content: string): boolean {
  return /^(\/|https?:\/\/|data:)/.test(content.trim());
}

interface Props {
  evidence: PlayerEvidence;
  index: number;
  highlight?: boolean;
  style?: React.CSSProperties;
}

export default function EvidenceCard({
  evidence,
  index,
  highlight,
  style,
}: Props) {
  const classes = [
    "evidence-card",
    WIDE_TYPES.has(evidence.type) ? "evidence-card--wide" : "",
    highlight ? "evidence-card--new" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} style={style} data-testid={`evidence-${evidence.id}`}>
      <span className="etype">
        Exhibit {String.fromCharCode(65 + (index % 26))} ·{" "}
        {TYPE_LABELS[evidence.type] ?? evidence.type}
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

    case "audio":
      return (
        <div className="emedia">
          <audio controls preload="metadata" src={evidence.content} />
        </div>
      );

    case "video":
      return (
        <div className="emedia">
          <video controls preload="metadata" src={evidence.content} />
        </div>
      );

    case "color":
      return (
        <div
          className="eswatch"
          style={{ background: evidence.content }}
          aria-label={`Color: ${evidence.content}`}
        />
      );

    case "location":
      return (
        <div className="econtent econtent--location">
          <span className="pin">◉</span> {evidence.content}
        </div>
      );

    case "object":
    case "logo":
    case "symbol":
      return isMediaPath(evidence.content) ? (
        <img src={evidence.content} alt="Evidence" loading="lazy" />
      ) : (
        <div className="econtent">{evidence.content}</div>
      );

    default:
      return <div className="econtent">{evidence.content}</div>;
  }
}
