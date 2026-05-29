import Topbar from './Topbar';
import Sidebar from './Sidebar';

export default function AppLayout({ children, topbarProps }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar {...(topbarProps || {})} />
      <div className="app-layout">
        <Sidebar />
        <main className="main fade-in">{children}</main>
      </div>
    </div>
  );
}
