import styles from "./Beam.module.css";

export const Beam = ({ className }: { className?: string }) => (
  <div className={`${styles.beam} ${className ?? ""}`} aria-hidden="true" role="presentation" />
);
