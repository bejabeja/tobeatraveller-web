import { useMemo } from "react";
import { encode } from "uqr";
import "./PhoneQrCode.scss";

// Quiet zone around the code, in modules: phone cameras need some margin to
// find it.
const QUIET_ZONE = 2;

// A QR code of `url`, drawn as a single SVG path: one square per dark module.
const PhoneQrCode = ({ url, label }) => {
  const { size, path } = useMemo(() => {
    const { data, size: moduleCount } = encode(url, { border: QUIET_ZONE });
    const squares = data.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : "")));
    return { size: moduleCount, path: squares.join("") };
  }, [url]);

  return (
    <div className="phone-qr-code">
      <svg className="phone-qr-code__code" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
        <path d={path} />
      </svg>
    </div>
  );
};

export default PhoneQrCode;
