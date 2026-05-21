import { MdVerified } from "react-icons/md";
import "./OfficialBadge.scss";

const OfficialBadge = ({ size = 16 }) => (
  <MdVerified
    className="official-badge"
    size={size}
    title="Official ToBeATraveller account"
  />
);

export default OfficialBadge;
