import { assetUrl } from "./assets";

const quickLinks = [
  ["Apply", "apply/"],
  ["Book a Tour", "book-a-tour/"],
  ["Careers", "careers/"],
  ["Portals", "portals/"],
  ["Contact", "contact/"],
];
const socials = [
  ["Instagram", "https://www.instagram.com/aquinascollegewa/"],
  ["Facebook", "https://www.facebook.com/aquinascollegeperth/"],
  ["LinkedIn", "https://au.linkedin.com/school/aquinas-college-wa/"],
];

/** Matches the Aquinas secondary-page template; WordPress can keep its native footer. */
export default function SecondaryFooter({ assetBase, siteBase }: { assetBase: string; siteBase: string }) {
  return <footer className="history-site-footer" aria-label="Aquinas College">
    <div className="history-site-footer-inner">
      <div className="history-site-footer-brand">
        <a href={assetUrl(siteBase, "")} aria-label="Aquinas College home">
          <img src={assetUrl(assetBase, "history/aquinas-wordmark.png")} alt="Aquinas College" width={940} height={291} loading="lazy" />
        </a>
      </div>
      <div className="history-site-footer-columns">
        <section className="history-site-footer-section history-site-footer-contact" aria-labelledby="history-footer-contact">
          <h2 id="history-footer-contact">Contact</h2>
          <p><a href="mailto:admin@aquinas.wa.edu.au">admin@aquinas.wa.edu.au</a></p>
          <p>For enrolments queries email<br /><a href="mailto:enrolments@aquinas.wa.edu.au">enrolments@aquinas.wa.edu.au</a></p>
          <p>58 Mount Henry Road<br />Salter Point, Western Australia, 6152</p>
        </section>
        <nav className="history-site-footer-section" aria-labelledby="history-footer-links">
          <h2 id="history-footer-links">Quick Links</h2>
          <ul>{quickLinks.map(([label, path]) => <li key={path}><a href={assetUrl(siteBase, path)}>{label}</a></li>)}</ul>
        </nav>
        <nav className="history-site-footer-section" aria-labelledby="history-footer-socials">
          <h2 id="history-footer-socials">Socials</h2>
          <ul>{socials.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Aquinas College on ${label}`}>{label}</a></li>)}</ul>
        </nav>
      </div>
      <div className="history-site-footer-divider" aria-hidden="true" />
      <section className="history-site-footer-acknowledgement" aria-labelledby="history-footer-acknowledgement">
        <h2 id="history-footer-acknowledgement">Acknowledgement</h2>
        <p>We acknowledge the Aboriginal and Torres Strait Islander Peoples of Australia as the Traditional Owners and Custodians of the land of our schools. We are inspired and nurtured by their wisdom, spirituality and experience. We commit ourselves to actively work alongside them for reconciliation and justice. We pay our respects to the Elders; past, present and future. As we take our next step we remember the first footsteps taken on this sacred land.</p>
      </section>
      <div className="history-site-footer-bottom">
        <p>© Aquinas College {new Date().getFullYear()}</p>
        <p>CRICOS Code: 00428E</p>
        <p><a href={assetUrl(siteBase, "wp-content/uploads/2026/08/Privacy-Policy-2023-EREA-Ltd.pdf")} target="_blank" rel="noopener noreferrer" aria-label="Privacy Policy (opens in a new tab)">Privacy Policy</a></p>
      </div>
    </div>
  </footer>;
}
