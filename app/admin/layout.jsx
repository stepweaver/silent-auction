import AdminNav from '@/components/AdminNav';

export default function AdminLayout({ children }) {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <AdminNav />
      {children}
    </div>
  );
}
