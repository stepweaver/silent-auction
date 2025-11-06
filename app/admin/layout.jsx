import AdminNav from '@/components/AdminNav';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
          <AdminNav />
          {children}
        </div>
      </main>
    </div>
  );
}
