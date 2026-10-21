import styles from "./StatusBadge.module.css";

const STATUS_LABELS = {
  requested: "Looking for Driver",
  accepted: "Driver Assigned",
  arriving: "Driver Arriving",
  in_progress: "Trip In Progress",
  completed: "Trip Completed",
  cancelled: "Trip Cancelled",
  paid: "Paid Online",
  created: "Payment Pending",
  pending: "Processing",
  failed: "Payment Failed",
};

export default function StatusBadge({ status }) {
  const normStatus = (status || "requested").toLowerCase();
  const label = STATUS_LABELS[normStatus] || normStatus.replace("_", " ");
  const className = styles[normStatus] || styles.requested;

  return (
    <span className={`${styles.badge} ${className}`}>
      <span className={styles.dot} />
      <span>{label}</span>
    </span>
  );
}
