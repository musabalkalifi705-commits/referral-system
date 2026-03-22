import type { NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/login.module.css';

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

const LoginPage: NextPage = () => {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, tenant_id: DEMO_TENANT }),
    });
    const d = await res.json();
    setLoading(false);
    if (res.ok) setStep('otp');
    else setError(d.error);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, token: otp }),
    });
    const d = await res.json();
    setLoading(false);
    if (res.ok) {
      localStorage.setItem('access_token', d.access_token);
      router.push('/dashboard');
    } else {
      setError(d.error);
    }
  }

  return (
    <>
      <Head>
        <title>تسجيل الدخول — شبكتي</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className={styles.page} dir="rtl">
        <div className={styles.bg}>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.grid} />
        </div>

        <div className={styles.card}>
          <div className={styles.logoMark}>◈</div>
          <h1 className={styles.title}>شبكتي</h1>
          <p className={styles.sub}>نظام الإحالة والمكافآت</p>

          {error && <div className={styles.error}>{error}</div>}

          {step === 'phone' ? (
            <form onSubmit={sendOtp} className={styles.form}>
              <label className={styles.label}>رقم الجوال</label>
              <input
                className={styles.input}
                type="tel"
                dir="ltr"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+966500000000"
                required
              />
              <button className={styles.btn} type="submit" disabled={loading}>
                {loading ? <span className={styles.spinner} /> : 'إرسال رمز التحقق'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className={styles.form}>
              <p className={styles.otpHint}>أدخل الرمز المرسل إلى <strong>{phone}</strong></p>
              <input
                className={`${styles.input} ${styles.otpInput}`}
                type="text"
                inputMode="numeric"
                maxLength={6}
                dir="ltr"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="123456"
                required
              />
              <button className={styles.btn} type="submit" disabled={loading}>
                {loading ? <span className={styles.spinner} /> : 'تأكيد الدخول'}
              </button>
              <button type="button" className={styles.backBtn} onClick={() => setStep('phone')}>
                ← تغيير الرقم
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default LoginPage;
