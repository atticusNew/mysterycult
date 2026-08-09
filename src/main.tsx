import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./styles.css";

// `npm run build:mvp` / `dev:mvp` builds the ThruLines-only tester app —
// no workshops, no editors, no other game routes. The mode is a build-time
// constant, so only the chosen app chunk is ever loaded.
const isMvp = import.meta.env.MODE === "mvp";

const Root = React.lazy(() =>
  isMvp ? import("./mvp/MvpApp") : import("./app/App"),
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Suspense fallback={null}>
        <Root />
      </Suspense>
    </HashRouter>
  </React.StrictMode>,
);
