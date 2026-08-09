/**
 * Receiving end of a device link: decode the case/puzzle in the URL,
 * show what it is, and publish it into this device's library on tap.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { decodeTransfer } from "../app/transfer";
import { parseCase } from "../data/schema";
import { publishCase } from "../data/caseLibrary";
import { parsePuzzle } from "../phrase/model";
import { publishPuzzle } from "../phrase/store";

export default function TransferReceive() {
  const { kind, data } = useParams();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);

  const decoded = useMemo(() => {
    try {
      const raw = decodeTransfer(data ?? "");
      if (kind === "case") {
        const { caseData, errors } = parseCase(raw);
        return errors.length === 0 && caseData
          ? { kind: "case" as const, title: caseData.title || caseData.id, caseData }
          : null;
      }
      if (kind === "puzzle") {
        const { puzzle, errors } = parsePuzzle(raw);
        return errors.length === 0 && puzzle
          ? { kind: "puzzle" as const, title: puzzle.title || puzzle.id, puzzle }
          : null;
      }
      return null;
    } catch {
      return null;
    }
  }, [kind, data]);

  if (!decoded) {
    return (
      <div className="shell">
        <div className="fullpage">
          <span className="kicker">Transfer</span>
          <h1>That link didn't work</h1>
          <p className="prose">
            The link may be incomplete — some messaging apps truncate long
            URLs. Try copying it again, or send it via AirDrop / Notes.
          </p>
          <Link to="/" className="btn btn--primary btn--block">
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="fullpage">
        <span className="kicker">Transfer</span>
        <h1>{decoded.title}</h1>
        <p className="prose">
          {decoded.kind === "case" ? "A Line-Up case" : "A Tagline puzzle"} is
          ready to add to this device.
        </p>
        {added ? (
          <>
            <span className="verdict verdict--solved">Added</span>
            <button
              className="btn btn--primary btn--block"
              onClick={() =>
                navigate(
                  decoded.kind === "case"
                    ? `/play/${decoded.caseData.id}`
                    : `/tagline/play/${decoded.puzzle.id}`,
                )
              }
            >
              Play it now
            </button>
            <Link to="/" className="btn btn--block">
              Home
            </Link>
          </>
        ) : (
          <button
            className="btn btn--primary btn--block"
            onClick={() => {
              if (decoded.kind === "case") {
                publishCase(decoded.caseData);
              } else {
                publishPuzzle(decoded.puzzle);
              }
              setAdded(true);
            }}
          >
            Add to this device
          </button>
        )}
      </div>
    </div>
  );
}
