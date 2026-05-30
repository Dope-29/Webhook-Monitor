/** Skeleton shimmer primitives */

export function SkeletonText({ width = '60%', height = 12, style = {} }) {
  return (
    <span
      className="skeleton skeleton-text"
      style={{ width, height, display: 'block', borderRadius: 4, ...style }}
    />
  );
}

export function SkeletonTitle({ width = '35%' }) {
  return <span className="skeleton skeleton-title" style={{ width, display: 'block', borderRadius: 4 }} />;
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '10px 12px' }}>
          <span className="skeleton" style={{ height: 12, display: 'block', borderRadius: 4, width: i === 0 ? '70%' : '50%' }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card">
      <SkeletonTitle />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonText key={i} width={`${75 - i * 10}%`} style={{ marginBottom: 8 }} />
      ))}
    </div>
  );
}

export function SkeletonMetricGrid({ count = 4 }) {
  return (
    <div className="metric-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="metric">
          <SkeletonText width="50%" height={10} style={{ marginBottom: 8 }} />
          <SkeletonText width="40%" height={22} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTableBody({ rows = 5, cols = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} cols={cols} />)}
    </tbody>
  );
}
