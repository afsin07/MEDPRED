// MediPredict frontend API configuration.
// Local development:
//   frontend -> http://127.0.0.1:3000
//   Flask API -> http://127.0.0.1:5000
// Production:
//   Vercel frontend -> Render Flask backend
//
// MEDIPREDICT_API_BASE can still be overridden before this script loads.
(() => {
  const LOCAL_API_BASE = "http://127.0.0.1:5000";
  const LIVE_API_BASE = "https://medpred-backend.onrender.com";

  const host = window.location.hostname;
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    // Opening the .html files directly (double-click) loads them over the
    // file:// protocol, which has no hostname at all. Treat that as local
    // too, since that's almost always someone testing on their own machine.
    window.location.protocol === "file:";

  window.MEDIPREDICT_API_BASE =
    window.MEDIPREDICT_API_BASE ||
    (isLocalHost ? LOCAL_API_BASE : LIVE_API_BASE);

  if (window.location.protocol === "file:") {
    console.warn(
      "[MediPredict] This page was opened directly from disk (file://). " +
      "Login/session cookies usually don't work over file://. " +
      "Serve the frontend instead: `cd frontend && python -m http.server 3000`, " +
      "then open http://127.0.0.1:3000."
    );
  }
})();

window.mpApiUrl = function(path) {
  return window.MEDIPREDICT_API_BASE.replace(/\/$/, "") + path;
};
