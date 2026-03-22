import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from '@/styles/dashboard.module.css';

const MemberDashboard: NextPage = () => {
  const [tab, setTab] = useState<'redeem' | 'referrals' | 'payout'>('redeem');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redeem form
  const [serial, setSerial] = useState('');
  const [hash, setHash] = useState('');
  const [deviceFp] = useState(() => Math.random().toString(36).slice(2));

  // Referral data
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);

  // Payout form
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('bank_transfer');
  const [iban, setIban] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  useEffect(() => {
    if (tab === 'referrals') fetchReferrals();
  }, [tab]);

  async function fetchReferrals() {
    setLoading(true);
    const res = await fetch('/api/referrals/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setReferrals(data.referrals ?? []);
    setTotalEarned(data.total_earned ?? 0);
    setLoading(false);
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/cards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial, hash, device_fp: deviceFp }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage({ type: 'success', text: `✅ تم الاستبدال! قيمة الكرت: ${data.redemption?.denomination} ريال` });
      setSerial(''); setHash('');
    } else {
      setMessage({ type: 'error', text: `❌ ${data.error}` });
    }
  }

  async function handlePayout(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch('/api/payouts/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: Number(payoutAmount), method: payoutMethod, account_details: { iban } }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMessage({ type: 'success', text: '✅ تم إرسال طلب السحب بنجاح' });
      setPayoutAmount(''); setIban('');
    } else {
      setMessage({ type: 'error', text: `❌ ${data.error}` });
    }
  }

  return (
    <>
      <Head>
        <title>لوحة الأعضاء</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className={styles.shell} dir="rtl">
        <aside className={styles.sidebar}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>◈</span>
            <span>شبكتي</span>
          </div>
          <nav className={styles.nav}>
            {([
              { key: 'redeem', label: 'استبدال كرت', icon: '⟁' },
              { key: 'referrals', label: 'إحالاتي', icon: '◎' },
              { key: 'payout', label: 'طلب سحب', icon: '⬡' },
            ] as const).map(item => (
              <button
                key={item.key}
                className={`${styles.navBtn} ${tab === item.key ? styles.navActive : ''}`}
                onClick={() => setTab(item.key)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <div className={styles.balanceBadge}>
              <span className={styles.balanceLabel}>رصيدي</span>
              <span className={styles.balanceValue}>{totalEarned.toFixed(2)} ﷼</span>
            </div>
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.topbar}>
            <h1 className={styles.pageTitle}>
              {tab === 'redeem' ? 'استبدال كرت' : tab === 'referrals' ? 'سجل الإحالات' : 'طلب سحب الأرباح'}
            </h1>
          </div>

          {message && (
            <div className={`${styles.alert} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          {tab === 'redeem' && (
            <div className={styles.card}>
              <div className={styles.cardGlow} />
              <form onSubmit={handleRedeem} className={styles.form}>
                <label className={styles.label}>رقم الكرت (Serial)</label>
                <input
                  className={styles.input}
                  value={serial}
                  onChange={e => setSerial(e.target.value)}
                  placeholder="مثال: CARD-2024-0001"
                  required
                />
                <label className={styles.label}>رمز التحقق (Hash)</label>
                <input
                  className={styles.input}
                  value={hash}
                  onChange={e => setHash(e.target.value)}
                  placeholder="SHA256 hash"
                  required
                />
                <button className={styles.btn} type="submit" disabled={loading}>
                  {loading ? <span className={styles.spinner} /> : 'استبدال الكرت'}
                </button>
              </form>
            </div>
          )}

          {tab === 'referrals' && (
            <div className={styles.tableWrap}>
              {loading ? (
                <div className={styles.emptyState}><span className={styles.spinner} /></div>
              ) : referrals.length === 0 ? (
                <div className={styles.emptyState}>لا توجد إحالات بعد</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>الكرت</th>
                      <th>العمولة</th>
                      <th>الحالة</th>
                      <th>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map(r => (
                      <tr key={r.id}>
                        <td>{r.redemption?.card?.serial ?? '—'}</td>
                        <td className={styles.amount}>{Number(r.commission_amount).toFixed(2)} ﷼</td>
                        <td><span className={`${styles.badge} ${styles[r.status]}`}>{r.status}</span></td>
                        <td>{new Date(r.created_at).toLocaleDateString('ar-SA')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'payout' && (
            <div className={styles.card}>
              <div className={styles.cardGlow} style={{ background: 'radial-gradient(circle at 80% 20%, #d4a017 0%, transparent 60%)' }} />
              <form onSubmit={handlePayout} className={styles.form}>
                <label className={styles.label}>المبلغ المطلوب (ريال)</label>
                <input
                  className={styles.input}
                  type="number"
                  min="1"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  placeholder="50"
                  required
                />
                <label className={styles.label}>طريقة الاستلام</label>
                <select className={styles.input} value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)}>
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="stc_pay">STC Pay</option>
                  <option value="wallet">محفظة إلكترونية</option>
                </select>
                <label className={styles.label}>رقم الآيبان / الحساب</label>
                <input
                  className={styles.input}
                  value={iban}
                  onChange={e => setIban(e.target.value)}
                  placeholder="SA03 8000 0000 6080 1016 7519"
                  required
                />
                <button className={styles.btn} type="submit" disabled={loading}>
                  {loading ? <span className={styles.spinner} /> : 'إرسال طلب السحب'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default MemberDashboard;
