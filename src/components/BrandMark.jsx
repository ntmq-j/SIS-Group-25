export default function BrandMark({ href = '/', className = '', onClick }) {
  return (
    <a
      href={href}
      className={`recess-brand ${className}`.trim()}
      aria-label="Recess home"
      onClick={onClick}
    >
      <span className="recess-brand__dot" aria-hidden="true" />
      <span>recess</span>
    </a>
  );
}
