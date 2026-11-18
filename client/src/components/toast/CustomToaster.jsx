import { Toaster } from "react-hot-toast";
import "./CustomToaster.scss";

const CustomToaster = () => {
  return (
    <Toaster
      position="bottom-right"
      containerClassName="app-toaster" // gives extra bottom clearance on mobile, where the fixed bottom-nav bar would otherwise cover it (see CustomToaster.scss)
      toastOptions={{
        style: {
          display: "flex",
          alignItems: "center",
          gap: "0px",
          fontWeight: 600,
          padding: "12px 20px",
          borderRadius: "8px",
          fontSize: "15px",
          width: "fit-content",
          background: "var(--toast-bg)",
          color: "var(--toast-text)",
        },
        success: {
          icon: "🚀",
          style: {
            width: "fit-content",
          },
        },
        error: {
          icon: "❌",
          style: {
            width: "fit-content",
          },
        },
        loading: {
          icon: null,
        },
      }}
    />
  );
};

export default CustomToaster;
