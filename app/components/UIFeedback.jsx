import styles from "./UIFeedback.module.css";

export function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className={styles.spinnerWrap}>
      <div className={styles.spinner} />
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({ icon = "🚕", title, description, action }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>{icon}</span>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {description && <p className={styles.emptyDescription}>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div className={`${styles.alertBox} ${styles.errorBox}`}>
      <span>⚠️</span>
      <div>{message}</div>
    </div>
  );
}

export function SuccessMessage({ message }) {
  if (!message) return null;
  return (
    <div className={`${styles.alertBox} ${styles.successBox}`}>
      <span>✅</span>
      <div>{message}</div>
    </div>
  );
}
