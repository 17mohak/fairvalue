/**
 * Night-match backdrop for the player hero, drawn entirely in CSS and SVG (no image assets):
 * stand tiers, two sodium floodlight beams, chalk pitch markings and a film grain.
 * Purely decorative, so hidden from assistive technology.
 */
import styles from "./StadiumBackdrop.module.css";

export function StadiumBackdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <div className={styles.sky} />
      <div className={styles.stands} />
      <div className={`${styles.beam} ${styles.beamLeft}`} />
      <div className={`${styles.beam} ${styles.beamRight}`} />
      <svg className={styles.pitch} viewBox="0 0 1600 600" preserveAspectRatio="xMidYMax slice">
        {/* Centre circle and halfway line, seen low and in perspective */}
        <ellipse cx="1060" cy="560" rx="520" ry="120" fill="none" stroke="currentColor" strokeWidth="2" />
        <ellipse cx="1060" cy="560" rx="10" ry="3" fill="currentColor" />
        <line x1="1060" y1="380" x2="1060" y2="600" stroke="currentColor" strokeWidth="2" />
        <line x1="0" y1="600" x2="1600" y2="488" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      </svg>
      <div className={styles.haze} />
      <div className={styles.grain} />
    </div>
  );
}
