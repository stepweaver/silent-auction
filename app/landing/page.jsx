'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AliasSelector from '@/components/AliasSelector';

const STORAGE_KEY = 'auction_bidder_info';
const ENROLLMENT_KEY = 'auction_enrolled';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('intro'); // 'intro', 'enroll'

  useEffect(() => {
    // Check if already enrolled
    if (typeof window !== 'undefined') {
      const enrolled = localStorage.getItem(ENROLLMENT_KEY);
      if (enrolled === 'true') {
        // Check if there's a redirect URL (from QR code scan)
        const redirect = localStorage.getItem('auction_redirect');
        if (redirect) {
          localStorage.removeItem('auction_redirect');
          router.push(redirect);
        } else {
          router.push('/');
        }
      }
    }
  }, [router]);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!name || name.trim().length === 0) {
      setError('Please enter your name');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setStep('enroll');
    setError('');
  };

  const handleAliasSelected = (alias) => {
    // Save enrollment
    if (typeof window !== 'undefined') {
      localStorage.setItem(ENROLLMENT_KEY, 'true');
      // Store name from alias object if available, otherwise from form
      const bidderName = alias?.name || name.trim();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        email,
        bidder_name: bidderName,
        alias: alias,
      }));
      
      // Check if there's a redirect URL (from QR code scan)
      const redirect = localStorage.getItem('auction_redirect');
      if (redirect) {
        localStorage.removeItem('auction_redirect');
        router.push(redirect);
      } else {
        router.push('/');
      }
    }
  };

  if (step === 'intro') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-base-200 via-base-300 to-primary/5 px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="card bg-base-100 shadow-2xl border-2 border-primary/20">
                <div className="card-body p-8 sm:p-12">
                  <div className="mb-8">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                      <span className="text-white text-3xl font-bold">A</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-primary mb-4 text-center">
                      Welcome to the Silent Auction
                    </h1>
                    <p className="text-lg text-base-content/70 leading-relaxed text-center max-w-2xl mx-auto">
                      Join the fun and bid on amazing items! Create your unique alias to get started.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                        <span className="text-primary font-bold text-xl">1</span>
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-primary">Create Your Identity</h3>
                      <p className="text-base-content/70 text-sm">Choose a fun color and animal combination for your bidding alias</p>
                    </div>

                    <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-xl p-6 border border-secondary/20">
                      <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-4">
                        <span className="text-secondary font-bold text-xl">2</span>
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-secondary">Browse & Bid</h3>
                      <p className="text-base-content/70 text-sm">Explore our catalog and place bids on items you love</p>
                    </div>

                    <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-6 border border-accent/20">
                      <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                        <span className="text-accent font-bold text-xl">3</span>
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-accent">Stay Anonymous</h3>
                      <p className="text-base-content/70 text-sm">Your bids appear with your alias, keeping your identity private</p>
                    </div>
                  </div>

                  <div className="divider my-8"></div>

                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold text-lg">Enter your name</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered input-lg w-full border-2 focus:border-primary focus:outline-none"
                        placeholder="Jane Doe"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setError('');
                        }}
                        required
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold text-lg">Enter your email</span>
                      </label>
                      <input
                        type="email"
                        className="input input-bordered input-lg w-full border-2 focus:border-primary focus:outline-none"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError('');
                        }}
                        required
                      />
                      {error && (
                        <label className="label">
                          <span className="label-text-alt text-error">{error}</span>
                        </label>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg w-full shadow-lg"
                    >
                      Get Started →
                    </button>
                  </form>
                </div>
              </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-base-200 via-base-300 to-primary/5 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => setStep('intro')}
            className="btn btn-ghost btn-sm"
          >
            ← Back
          </button>
        </div>
        <AliasSelector
          email={email}
          name={name}
          onAliasSelected={handleAliasSelected}
        />
      </div>
    </main>
  );
}

