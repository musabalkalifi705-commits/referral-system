import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useRef } from 'react';
import styles from '@/styles/admin.module.css';

const AdminDashboard: NextPage = () => {
  const [tab, setTab] = useState<'payouts' | 'upload' | 'rules'>('payouts');
  const [payouts, setPayouts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [newLevel, setNewLevel] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const auth = { Authorization: `Bearer ${token}` };

  async function fetchPayouts(status?: string) {
    setLoading(true);
    const qs = status ? `?status=${status}` : '';
    const res = await fetch(`/api/admin/payouts${qs}`, { headers: auth });
    const d = await res.json();
    setPayouts(d.payouts ?? []);
    setLoading(false);
  }

  async function fetchRules() {
    setLoading(true);
    const res = await fetch('/api/admin/commission-rules', { headers: auth });
    const d = await res.json();
    setRules(d.rules ?? []);
    setLoading(false);
  }

  async function handleTabChange(t: typeof tab) {
    setTab(t); setMsg(null);
    if (t === 'payouts') fetchPayouts();
    if (t === 'rules') fetchRules();
  }

  async function approveOrPay(id: string, action: 'approve' | 'mark-paid') {
    const res = await fetch(`/api/admin/payouts/${id}/${action}`, { method: 'POST', headers: auth });
    const d = await res.json();
    if (res.ok) { setMsg({ type: 'ok', text: 'تمت العملية بنجاح ✓' }); fetchPayouts(); }
    else setMsg({ type: 'err', text: d.error });
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true); setUploadResult(null);
    const text = await file.text();
    const res = await fetch('/api/admin/cards/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', ...auth },
      body: text,
    });
    const d = await res.json();
    setLoading(false);
    setUploadResult(d);
    setMsg(res.ok ? { type: 'ok', text: `تم الرفع: ${d.imported} كرت` } : { type: 'err', text: d.error });
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/commission-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ level: Number(newLevel), rate: Number(newRate) / 100, description: newDesc }),
    });
    const d = await res.json();
    if (res.ok) { setMsg({ type: 'ok', text: 'تمت الإضافة' }); fetchRules(); setNewLevel(''); setNewRate(''); setNewDesc(''); }
    else setMsg({ type: 'err', text: d.error });
  }

  async function deleteRule(level: number) {
    const res = await fetch('/api/admin/commission-rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ level }),
    });
    if (res.ok) { setMsg({ type: 'ok', text: 'تم الحذف' }); fetchRules(); }
  }

  return (
    <>
      <Head>
        <title>لوحة الإدارة</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className={styles.shell} dir="rtl">
        <aside className={styles.sidebar}>
          <div className={styles.logo}>
            <span>⬡</span> الإدارة
          </div>
          <nav className={styles.nav}>
            {([
              { key: 'payouts', label: 'طلبات السحب', icon: '◈' },
              { key: 'upload', label: 'رفع الكروت', icon: '⟁' },
              { key: 'rules', label: 'قواعد العمولة', icon: '◎' },
            ] as const).map(item => (
              <button key={item.key} className={`${styles.navBtn} ${tab === item.key ? styles.active : ''}`}
                onClick={() => handleTabChange(item.key)}>
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className={styles.main}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              {tab === 'payouts' ? 'طلبات السحب' : tab === 'upload' ? 'رفع ملف الكروت' : 'قواعد العمولة'}
            </h1>
            {tab === 'payouts' && (
              <div className={styles.filterRow}>
                {['', 'pending', 'approved', 'paid'].map(s => (
                  <button key={s} className={styles.filterBtn} onClick={() => fetchPayouts(s || undefined)}>
                    {s || 'الكل'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {msg && <div className={`${styles.alert} ${msg.type === 'ok' ? styles.ok : styles.err}`}>{msg.text}</div>}

          {/* ── Payouts tab ── */}
          {tab === 'payouts' && (
            <div className={styles.tableWrap}>
              {loading
                ? <div className={styles.loader} />
                : payouts.length === 0
                  ? <div className={styles.empty}>لا توجد طلبات</div>
                  : (
                    <table className={styles.table}>
                      <thead><tr><th>المستخدم</th><th>المبلغ</th><th>الطريقة</th><th>الحالة</th><th>الإجراء</th></tr></thead>
                      <tbody>
                        {payouts.map(p => (
                          <tr key={p.id}>
                            <td>{(p.user as any)?.phone ?? '—'}</td>
                            <td className={styles.amount}>{Number(p.amount).toFixed(2)} ﷼</td>
                            <td>{p.method}</td>
                            <td><span className={`${styles.badge} ${styles[p.status]}`}>{p.status}</span></td>
                            <td className={styles.actions}>
                              {p.status === 'pending' && (
                                <button className={styles.btnApprove} onClick={() => approveOrPay(p.id, 'approve')}>موافقة</button>
                              )}
                              {p.status === 'approved' && (
                                <button className={styles.btnPay} onClick={() => approveOrPay(p.id, 'mark-paid')}>تم الدفع</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
            </div>
          )}

          {/* ── Upload tab ── */}
          {tab === 'upload' && (
            <div className={styles.uploadBox}>
              <div className={styles.uploadArea} onClick={() => fileRef.current?.click()}>
                <span className={styles.uploadIcon}>⟁</span>
                <p>اسحب ملف CSV أو انقر للاختيار</p>
                <small>الأعمدة المطلوبة: serial, hash, denomination, wholesale_price</small>
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleUpload} />
              </div>
              {loading && <div className={styles.loader} />}
              {uploadResult && (
                <div className={styles.uploadResult}>
                  <div className={styles.statCard}><span>{uploadResult.imported}</span><label>تم الاستيراد</label></div>
                  <div className={styles.statCard}><span>{uploadResult.duplicates_skipped}</span><label>مكرر (تم تخطيه)</label></div>
                  <div className={styles.statCard}><span>{uploadResult.total}</span><label>إجمالي الصفوف</label></div>
                </div>
              )}
            </div>
          )}

          {/* ── Commission Rules tab ── */}
          {tab === 'rules' && (
            <div className={styles.rulesWrap}>
              <table className={styles.table}>
                <thead><tr><th>المستوى</th><th>النسبة</th><th>الوصف</th><th></th></tr></thead>
                <tbody>
                  {rules.map(r => (
                    <tr key={r.id}>
                      <td>المستوى {r.level}</td>
                      <td className={styles.amount}>{(r.rate * 100).toFixed(1)}%</td>
                      <td>{r.description ?? '—'}</td>
                      <td><button className={styles.btnDel} onClick={() => deleteRule(r.level)}>حذف</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <form onSubmit={addRule} className={styles.addRuleForm}>
                <h3>إضافة / تعديل قاعدة</h3>
                <div className={styles.formRow}>
                  <input className={styles.input} type="number" placeholder="المستوى (1، 2...)" value={newLevel} onChange={e => setNewLevel(e.target.value)} required />
                  <input className={styles.input} type="number" step="0.01" placeholder="النسبة %" value={newRate} onChange={e => setNewRate(e.target.value)} required />
                  <input className={styles.input} placeholder="وصف (اختياري)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                  <button className={styles.btnAdd} type="submit">حفظ</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;
