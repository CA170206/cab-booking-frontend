import styles from "./PageHeader.module.css";

export default function PageHeader({ eyebrow, title, titleAccent, subtitle }) {
  return (
    <section className={styles.headerWrap}>
      <div className={styles.inner}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h1 className={styles.title}>
          {title}{" "}
          {titleAccent && <span className={styles.titleAccent}>{titleAccent}</span>}
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </section>
  );
}
