"use client";

import { Button } from "@/components/ui/Button";
import styles from "./status.module.css";

/** Route-level error boundary: something failed while rendering a page. */
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className={styles.wrap} aria-labelledby="err-title" role="alert">
      <p className="eyebrow">
        <b>Stoppage</b> Something went wrong
      </p>
      <h1 id="err-title" className={styles.title}>
        This page failed to load.
      </h1>
      <p className={styles.body}>
        Nothing was saved or sent. Try again; if it keeps happening, the rest of FairValue is still available from the menu above.
      </p>
      <div>
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </section>
  );
}
