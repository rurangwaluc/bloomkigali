import Link from 'next/link';
import { PublicThemeToggle } from './public-theme-toggle';
import styles from './page.module.css';

const businessPhoneDisplay = '0798981520';
const businessPhoneHref = 'tel:+250798981520';

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="Bloom Kigali home"
        >
          <span className={styles.logo}>MP</span>

          <span className={styles.brandCopy}>
            <span className={styles.brandTop}>Bloom Kigali</span>
            <span className={styles.brandName}>Boutique</span>
          </span>
        </Link>

        <PublicThemeToggle />
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.kicker}>Private retail system</p>

          <h1>Manage today’s boutique work in one place.</h1>

          <p className={styles.heroText}>
            Sales, stock, customers, expenses, and money records for
            Bloom Kigali.
          </p>

          <form action="/login" method="get" className={styles.signInForm}>
            <button type="submit" className={styles.signInButton}>
              Sign in
            </button>
          </form>

          <p className={styles.accessNote}>
            Owner and staff access only
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© {year} Bloom Kigali. All rights reserved.</p>

        <div className={styles.footerLinks}>
          <a href={businessPhoneHref}>
            {businessPhoneDisplay}
          </a>

          <span>
            Developed by{' '}
            <a
              href="https://webimpactlab.com"
              target="_blank"
              rel="noreferrer"
            >
              WebImpact Lab
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}
