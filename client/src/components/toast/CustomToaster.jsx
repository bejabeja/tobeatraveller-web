import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Toaster } from "react-hot-toast";
import { getTopDialog, subscribeToOpenDialogs } from "../dialog/openDialogs";
import "./CustomToaster.scss";

const noDialogOnTheServer = () => null;

const CustomToaster = () => {
  // While a modal dialog is open, the browser leaves the rest of the page inert and
  // behind it: the toasts go inside the top dialog, to be seen and read out.
  const topDialog = useSyncExternalStore(subscribeToOpenDialogs, getTopDialog, noDialogOnTheServer);
  const toaster = (
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
  return topDialog ? createPortal(toaster, topDialog) : toaster;
};

export default CustomToaster;
