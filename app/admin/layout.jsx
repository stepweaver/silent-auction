import AdminNav from '@/components/AdminNav';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SiteHeader />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto p-6">
          <AdminNav />
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
