import React, { Suspense } from "react";
import Styles from "./lazyComponent.scss";
import Loader from "../Loader";

export function LazyComponent({
  load,
  condition,
  renderer = null,
  loadingMessage = ""
}) {
  const Component = load;
  return condition ? (
    <Suspense fallback={<Loader message={loadingMessage} />}>
      {renderer ? renderer(Component) : <Component />}
    </Suspense>
  ) : (
    <></>
  );
}

function LoadIndicator() {
  return (
    <div className={Styles.overlay}>
      <div className={Styles.loader} />
    </div>
  );
}
