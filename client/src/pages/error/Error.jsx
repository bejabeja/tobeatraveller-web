import { MdErrorOutline } from "react-icons/md";
import { Link } from "react-router-dom";
import "./Error.scss"; // opcional para estilos

const Error = ({ message }) => {
  return (
    <div className="section__container error__component">
      <MdErrorOutline size={48} className="error__icon" />
      <h2>Something went wrong</h2>
      <p>{message || "Please try again later."}</p>
      <Link to="/" className="btn btn--secondary">
        Go Back Home
      </Link>
    </div>
  );
};

export default Error;
