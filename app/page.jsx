'use client';

import { supabaseBrowser } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ItemCard from '@/components/ItemCard';

const ENROLLMENT_KEY = 'auction_enrolled';

// Placeholder categories - can be updated later
const CATEGORIES = [
  'Sports',
  'Restaurants',
  'Family Fun',
  'Services',
  'Memberships',
  'Other',
];

export default function CatalogPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const s = supabaseBrowser();

  // Check enrollment status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const enrolled = localStorage.getItem(ENROLLMENT_KEY);
      if (enrolled !== 'true') {
        router.push('/landing');
        return;
      }
      setCheckingEnrollment(false);
    }
  }, [router]);

  async function load() {
    try {
      // Get settings to check deadline and auction_closed
      const { data: settings } = await s
        .from('settings')
        .select('auction_deadline, auction_closed')
        .eq('id', 1)
        .maybeSingle();
      
      const deadline = settings?.auction_deadline ? new Date(settings.auction_deadline) : null;
      const now = new Date();
      const deadlinePassed = deadline && now >= deadline;
      const auctionManuallyClosed = settings?.auction_closed || false;

      const { data, error } = await s
        .from('item_leaders')
        .select('*')
        .order('title', { ascending: true });
      if (error) throw error;
      
      // Mark items as closed if auction is manually closed or deadline passed
      // If auction is open, show items based on their actual status
      const itemsWithDeadline = (data || []).map(item => ({
        ...item,
        is_closed: auctionManuallyClosed || deadlinePassed || item.is_closed,
      }));
      
      setItems(itemsWithDeadline);
    } catch (err) {
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checkingEnrollment) return;
    
    load();

    const channel = s
      .channel('rt-catalog')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => {
        load();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        load();
      })
      .subscribe();

    return () => {
      s.removeChannel(channel);
    };
  }, [checkingEnrollment]);

  if (checkingEnrollment || loading) {
    return (
      <main className="w-full px-4 py-4 sm:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: 'var(--primary-500)' }}></div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-4 pb-8">
      <section className="mb-4">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--primary-500)' }}>
              Silent Auction Catalog
            </h1>
            <p className="text-sm text-gray-600">Browse items and place your bids.</p>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      {items.length > 0 && (() => {
        // Get all unique categories from items
        const allCategories = Array.from(new Set(items.map(item => item.category || 'Other')));
        const availableCategories = CATEGORIES.filter(cat => allCategories.includes(cat))
          .concat(allCategories.filter(cat => !CATEGORIES.includes(cat)).sort());

        if (availableCategories.length <= 1) return null;

        return (
          <section className="mb-4">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-sm font-semibold text-gray-700 mr-1">Filter by category:</span>
                  <button
                    onClick={() => setSelectedCategories([])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedCategories.length === 0
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={selectedCategories.length === 0 ? { backgroundColor: 'var(--primary-500)' } : {}}
                  >
                    All
                  </button>
                  {availableCategories.map((category) => {
                    const isSelected = selectedCategories.includes(category);
                    return (
                      <button
                        key={category}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategories(selectedCategories.filter(c => c !== category));
                          } else {
                            setSelectedCategories([...selectedCategories, category]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={isSelected ? { backgroundColor: 'var(--primary-500)' } : {}}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        );
      })()}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-xl border border-gray-200">
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-gray-600">No items available.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {(() => {
            // Group items by category
            const groupedItems = {};
            items.forEach((item) => {
              const category = item.category || 'Other';
              if (!groupedItems[category]) {
                groupedItems[category] = [];
              }
              groupedItems[category].push(item);
            });

            // Sort categories: defined categories first, then others alphabetically
            let sortedCategories = [
              ...CATEGORIES.filter((cat) => groupedItems[cat]?.length > 0),
              ...Object.keys(groupedItems)
                .filter((cat) => !CATEGORIES.includes(cat))
                .sort(),
            ];

            // Filter categories based on selected filters
            if (selectedCategories.length > 0) {
              sortedCategories = sortedCategories.filter(cat => selectedCategories.includes(cat));
            }

            return sortedCategories.map((category) => (
              <div key={category} className="space-y-4">
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 whitespace-nowrap overflow-hidden" style={{ color: 'var(--primary-500)' }}>
                      {category}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600">
                      {groupedItems[category].length} {groupedItems[category].length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                  {groupedItems[category].map((item, index) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      priority={index === 0 && category === sortedCategories[0]}
                    />
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </main>
  );
}