import { showAppToast } from "../components/AppToaster";

/**
 * Site-wide branded toasts (top-right slide-in).
 * AppToaster in _app.js also patches toast.success/error globally,
 * so existing `import toast from "react-hot-toast"` calls get the same UI.
 */
export const notify = {
  success(title, message, opts = {}) {
    return showAppToast({ type: "success", title, message, ...opts });
  },
  error(title, message, opts = {}) {
    return showAppToast({ type: "error", title, message, duration: 5500, ...opts });
  },
  warning(title, message, opts = {}) {
    return showAppToast({ type: "warning", title, message, ...opts });
  },
  info(title, message, opts = {}) {
    return showAppToast({ type: "info", title, message, ...opts });
  },
};
