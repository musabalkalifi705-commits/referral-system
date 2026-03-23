import type { NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

const LoginPage: NextPage = () => {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');

    if (mode === 'register') {
      const { data, error: err } = await supabase.auth.signUp({ phone, password });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from('users').upsert({
          auth_uid: data.user.id,
          phone, name,
          tenant_id: '00000000-0000-0000-0000-000000000001',
          role: 'member'
        }, { onConflict: 'phone,tenant_id' });
      }
      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        router.push('/dashboard');
      } else {
        setSuccess('تم إنشاء الحساب — سجّل دخولك الآن');
        setMode('login');
      }
    } else {
      const { data, error: err } = await supabase.auth.signInWithPassword({ phone, password });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        router.push('/dashboard');
      }
    }
    setLoading(false);
  }

  return (
    <>
      <Head>
        <title>تيرا نت — نظام الإحالة</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#050810;font-family:'IBM Plex Sans Arabic',sans-serif}
        .page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;position:relative;overflow:hidden}
        .bg{position:fixed;inset:0;z-index:0}
        .orb1{position:absolute;width:600px;height:600px;border-radius:50%;top:-200px;right:-150px;background:radial-gradient(circle,rgba(0,212,255,0.08) 0%,transparent 70%);animation:float 8s ease-in-out infinite alternate}
        .orb2{position:absolute;width:500px;height:500px;border-radius:50%;bottom:-150px;left:-100px;background:radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%);animation:float 10s ease-in-out infinite alternate-reverse}
        .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.03) 1px,transparent 1px);background-size:60px 60px}
        @keyframes float{from{transform:translate(0,0)}to{transform:translate(20px,30px)}}
        .card{position:relative;z-index:1;width:100%;max-width:420px;background:rgba(255,255,255,0.03);border:1px solid rgba(0,212,255,0.12);border-radius:28px;padding:48px 40px;backdrop-filter:blur(24px);box-shadow:0 0 80px rgba(0,0,0,0.6),0 0 0 1px rgba(0,212,255,0.05);animation:slideUp .5s cubic-bezier(.22,1,.36,1)}
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .logo{text-align:center;margin-bottom:28px}
        .logoIcon{width:64px;height:64px;background:linear-gradient(135deg,rgba(0,212,255,0.15),rgba(99,102,241,0.15));border:1px solid rgba(0,212,255,0.25);border-radius:18px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:1.8rem}
        .logoName{font-size:1.6rem;font-weight:700;color:#fff;letter-spacing:-.02em}
        .logoName span{color:#00d4ff}
        .logoSub{font-size:.8rem;color:rgba(255,255,255,.35);margin-top:4px}
        .toggle{display:flex;gap:4px;background:rgba(255,255,255,.05);border-radius:12px;padding:4px;margin-bottom:24px}
        .toggleBtn{flex:1;padding:10px;border-radius:9px;border:none;font-family:inherit;font-size:.88rem;font-weight:600;cursor:pointer;background:none;color:rgba(255,255,255,.4);transition:all .2s}
        .toggleActive{background:rgba(0,212,255,.15);color:#00d4ff;border:1px solid rgba(0,212,255,.2)}
        .form{display:flex;flex-direction:column;gap:14px}
        .label{font-size:.78rem;color:rgba(255,255,255,.4);font-weight:500;margin-bottom:2px}
        .input{width:100%;padding:13px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:11px;color:#fff;font-size:.95rem;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
        .input:focus{border-color:#00d4ff;box-shadow:0 0 0 3px rgba(0,212,255,.1)}
        .input::placeholder{color:rgba(255,255,255,.2)}
        .btn{padding:14px;background:linear-gradient(135deg,#00d4ff,#6366f1);color:#fff;font-weight:700;font-size:.95rem;border:none;border-radius:11px;cursor:pointer;font-family:inherit;transition:opacity .2s,transform .1s;display:flex;align-items:center;justify-content:center;margin-top:4px}
        .btn:hover{opacity:.9}
        .btn:active{transform:scale(.98)}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .error{background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.2);color:#f87171;border-radius:10px;padding:12px 16px;font-size:.85rem;text-align:center}
        .success{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);color:#4ade80;border-radius:10px;padding:12px 16px;font-size:.85rem;text-align:center}
        .spinner{width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .7s linear infinite;display:inline-block}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fieldGroup{display:flex;flex-direction:column;gap:6px}
        .divider{text-align:center;color:rgba(255,255,255,.2);font-size:.8rem;margin:4px 0}
      `}</style>
      <div className="page" dir="rtl">
        <div className="bg">
          <div className="orb1"/><div className="orb2"/><div className="grid"/>
        </div>
        <div className="card">
          <div className="logo">
            <div className="logoIcon">🌐</div>
            <div className="logoName">تيرا <span>نت</span></div>
            <div className="logoSub">نظام الإحالة والمكافآت</div>
          </div>

          <div className="toggle">
            <button className={mode==='login'?'toggleActive':'toggleBtn'} onClick={()=>{setMode('login');setError('');setSuccess('');}} type="button">دخول</button>
            <button className={mode==='register'?'toggleActive':'toggleBtn'} onClick={()=>{setMode('register');setError('');setSuccess('');}} type="button">حساب جديد</button>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <form onSubmit={handleSubmit} className="form">
            {mode==='register' && (
              <div className="fieldGroup">
                <label className="label">الاسم الكامل</label>
                <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="أحمد محمد" required />
              </div>
            )}
            <div className="fieldGroup">
              <label className="label">رقم الجوال</label>
              <input className="input" type="tel" dir="ltr" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+967771422622" required />
            </div>
            <div className="fieldGroup">
              <label className="label">كلمة المرور</label>
              <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? <span className="spinner"/> : mode==='login' ? '← دخول' : 'إنشاء حساب مجاني'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
export default LoginPage;
