import { useState, type ReactNode } from "react";

type Props = {
  id?: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  actions?: ReactNode;
};

export function CollapsibleSection({ id, title, subtitle, defaultOpen = true, children, actions }: Props) {
  const sectionId = id ?? title.toLowerCase().replace(/\s+/g, "-");
  const storageKey = `neuro-section-${sectionId}`;
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === null ? defaultOpen : saved === "1";
  });

  const toggle = () => {
    setOpen((v) => {
      localStorage.setItem(storageKey, v ? "0" : "1");
      return !v;
    });
  };

  return (
    <section className={`section ${open ? "open" : "collapsed"}`}>
      <div className="section-head">
        <button type="button" className="section-toggle" onClick={toggle} aria-expanded={open}>
          <span className="chevron">{open ? "▾" : "▸"}</span>
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="section-sub">{subtitle}</p>}
          </div>
        </button>
        {actions && <div className="section-actions">{actions}</div>}
      </div>
      {open && <div className="section-body">{children}</div>}
    </section>
  );
}
