import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LoginPage: NextPage = () => {
  const router = useRouter();
  const [role, setRole] = useState<'user'|'admin'>('user');
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => window.history.pushState(null, '', window.location.href);
    const t = localStorage.getItem('access_token');
    if (t) sb.auth.getUser(t).then(({data}) => { if (data.user) router.replace('/dashboard'); });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    const fp = phone.startsWith('+') ? phone : '+967' + phone.replace(/^0/, '');
    if (mode === 'register') {
      if (role === 'admin') { setError('تواصل مع المدير لإنشاء حساب إداري'); setLoading(false); return; }
      const { data, error: err } = await sb.auth.signUp({ phone: fp, password });
      if (err) { setError(err.message); setLoading(false); return; }
      if (data.user) await sb.from('users').upsert({ auth_uid: data.user.id, phone: fp, name, tenant_id: '00000000-0000-0000-0000-000000000001', role: 'member' }, { onConflict: 'phone,tenant_id' });
      if (data.session) { localStorage.setItem('access_token', data.session.access_token); router.replace('/dashboard'); }
      else { setSuccess('✅ تم إنشاء الحساب — سجّل دخولك'); setMode('login'); }
    } else {
      const { data, error: err } = await sb.auth.signInWithPassword({ phone: fp, password });
      if (err) { setError('رقم الجوال أو كلمة المرور غير صحيحة'); setLoading(false); return; }
      if (data.session) {
        localStorage.setItem('access_token', data.session.access_token);
        const { data: u } = await sb.from('users').select('role').eq('auth_uid', data.user.id).single();
        if (role === 'admin' && u?.role !== 'admin') {
          await sb.auth.signOut(); localStorage.removeItem('access_token');
          setError('❌ ليس لديك صلاحية الدخول كمدير'); setLoading(false); return;
        }
        router.replace(role === 'admin' ? '/admin' : '/dashboard');
      }
    }
    setLoading(false);
  }

  const S = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#040810;font-family:'Tajawal',sans-serif;min-height:100dvh}
    .page{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:16px;position:relative;overflow:hidden}
    .bg{position:fixed;inset:0;z-index:0}
    .orb1{position:absolute;width:700px;height:700px;border-radius:50%;top:-250px;right:-200px;background:radial-gradient(circle,rgba(0,122,255,.1) 0%,transparent 65%);animation:fl 7s ease-in-out infinite alternate}
    .orb2{position:absolute;width:500px;height:500px;border-radius:50%;bottom:-150px;left:-150px;background:radial-gradient(circle,rgba(0,199,190,.07) 0%,transparent 65%);animation:fl 9s ease-in-out infinite alternate-reverse}
    .gr{position:fixed;inset:0;background-image:linear-gradient(rgba(0,122,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,122,255,.03) 1px,transparent 1px);background-size:60px 60px}
    @keyframes fl{from{transform:translate(0,0)}to{transform:translate(25px,35px)}}
    .card{position:relative;z-index:1;width:100%;max-width:390px;background:rgba(255,255,255,.03);border:1px solid rgba(0,122,255,.12);border-radius:28px;padding:40px 32px;backdrop-filter:blur(40px);box-shadow:0 0 0 1px rgba(255,255,255,.04),0 40px 80px rgba(0,0,0,.6);animation:up .5s cubic-bezier(.22,1,.36,1)}
    @keyframes up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    .logo{text-align:center;margin-bottom:28px}
    .logoBadge{width:68px;height:68px;background:linear-gradient(135deg,rgba(0,122,255,.18),rgba(0,199,190,.18));border:1px solid rgba(0,122,255,.25);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:1.9rem;margin:0 auto 12px}
    .logoTitle{font-size:1.65rem;font-weight:900;color:#fff;letter-spacing:-.03em}
    .logoTitle span{background:linear-gradient(90deg,#007aff,#00c7be);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .logoSub{font-size:.76rem;color:rgba(255,255,255,.3);margin-top:3px}
    .tabs{display:flex;gap:6px;margin-bottom:18px;background:rgba(255,255,255,.04);border-radius:12px;padding:4px}
    .tab{flex:1;padding:10px;border-radius:9px;border:none;font-family:inherit;font-size:.85rem;font-weight:700;cursor:pointer;transition:all .2s;background:none;color:rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;gap:5px}
    .tabA{background:rgba(0,122,255,.18);color:#4da3ff;box-shadow:0 0 16px rgba(0,122,255,.12)}
    .seg{display:flex;gap:4px;background:rgba(255,255,255,.04);border-radius:10px;padding:3px;margin-bottom:20px}
    .seg button{flex:1;padding:9px;border-radius:8px;border:none;font-family:inherit;font-size:.84rem;font-weight:600;cursor:pointer;background:none;color:rgba(255,255,255,.35);transition:all .2s}
    .seg .sA{background:rgba(255,255,255,.07);color:#fff}
    .form{display:flex;flex-direction:column;gap:13px}
    .fl{display:flex;flex-direction:column;gap:5px}
    .lbl{font-size:.76rem;color:rgba(255,255,255,.38);font-weight:500}
    .inp{padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;font-family:inherit;font-size:.93rem;outline:none;transition:all .2s;width:100%}
    .inp:focus{border-color:#007aff;box-shadow:0 0 0 3px rgba(0,122,255,.1)}
    .inp::placeholder{color:rgba(255,255,255,.18)}
    .btn{padding:14px;background:linear-gradient(135deg,#007aff,#00c7be);color:#fff;font-weight:800;font-size:.93rem;border:none;border-radius:10px;cursor:pointer;font-family:inherit;transition:all .2s;margin-top:4px}
    .btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,122,255,.3)}
    .btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#fca5a5;border-radius:10px;padding:11px 15px;font-size:.83rem;text-align:center;margin-bottom:12px}
    .ok{background:rgba(0,199,190,.08);border:1px solid rgba(0,199,190,.18);color:#5eead4;border-radius:10px;padding:11px 15px;font-size:.83rem;text-align:center;margin-bottom:12px}
    .sup{margin-top:18px;text-align:center;padding:13px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:12px}
    .supLbl{font-size:.72rem;color:rgba(255,255,255,.25);margin-bottom:8px}
    .supBtns{display:flex;gap:8px;justify-content:center}
    .supBtn{padding:7px 13px;background:rgba(0,122,255,.08);border:1px solid rgba(0,122,255,.18);border-radius:8px;color:#4da3ff;font-size:.78rem;font-weight:600;text-decoration:none;transition:all .2s}
    .supBtn:hover{background:rgba(0,122,255,.16)}
    .sp{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:380px){.card{padding:32px 22px;border-radius:22px}}
  `;

  return (
    <>
      <Head>
        <title>تيرا نت — نظام الإحالة</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet"/>
      </Head>
      <style>{S}</style>
      <div className="page" dir="rtl">
        <div className="bg"><div className="orb1"/><div className="orb2"/></div>
        <div className="gr"/>
        <div className="card">
          <div className="logo">
            <div className="logoBadge">🌐</div>
            <div className="logoTitle">تيرا <span>نت</span></div>
            <div className="logoSub">نظام الإحالة والمكافآت</div>
          </div>

          <div className="tabs">
            <button className={`tab ${role==='user'?'tabA':''}`} onClick={()=>{setRole('user');setError('');}} type="button">👤 مستخدم</button>
            <button className={`tab ${role==='admin'?'tabA':''}`} onClick={()=>{setRole('admin');setMode('login');setError('');}} type="button">⚡ مدير</button>
          </div>

          {role==='user' && (
            <div className="seg">
              <button className={mode==='login'?'sA':''} onClick={()=>{setMode('login');setError('');setSuccess('');}} type="button">دخول</button>
              <button className={mode==='register'?'sA':''} onClick={()=>{setMode('register');setError('');setSuccess('');}} type="button">حساب جديد</button>
            </div>
          )}

          {error && <div className="err">{error}</div>}
          {success && <div className="ok">{success}</div>}

          <form onSubmit={submit} className="form">
            {mode==='register' && role==='user' && (
              <div className="fl">
                <label className="lbl">الاسم الكامل</label>
                <input className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder="أحمد محمد" required/>
              </div>
            )}
            <div className="fl">
              <label className="lbl">رقم الجوال</label>
              <input className="inp" type="tel" dir="ltr" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="771422622" required/>
            </div>
            <div className="fl">
              <label className="lbl">كلمة المرور</label>
              <input className="inp" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required minLength={6}/>
            </div>
            <button className="btn" type="submit" disabled={loading} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
              {loading ? <span className="sp"/> : role==='admin' ? '⚡ دخول المدير' : mode==='login' ? 'دخول ←' : 'إنشاء حساب مجاني ←'}
            </button>
          </form>

          <div className="sup">
            <div className="supLbl">📞 الدعم الفني</div>
            <div className="supBtns">
              <a className="supBtn" href="https://wa.me/967771422622" target="_blank" rel="noopener">واتساب 1</a>
              <a className="supBtn" href="https://wa.me/967776107018" target="_blank" rel="noopener">واتساب 2</a>
              <a className="supBtn" href="https://t.me/Wifiteranet_bot" target="_blank" rel="noopener">تيليجرام</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default LoginPage;
