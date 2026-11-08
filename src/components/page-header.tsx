import Link from "next/link";

type Crumb = { label: string; href?: string };

/** The standard top of every public page: breadcrumbs, one headline, one sentence, optional actions. */
export function PageHeader({ crumbs, title, description, meta, actions }: { crumbs?: Crumb[]; title: string; description?: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode }) {
  return <header className="page-header">
    <div className="container">
      {crumbs?.length ? <nav className="page-header-crumbs" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) => <span key={crumb.label} style={{ display: "contents" }}>
          {index ? <span aria-hidden="true">/</span> : null}
          {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
        </span>)}
      </nav> : null}
      {meta ? <div className="page-header-meta" style={{ marginTop: 0, marginBottom: 14 }}>{meta}</div> : null}
      <h1>{title}</h1>
      {description ? <p className="page-header-description">{description}</p> : null}
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  </header>;
}
