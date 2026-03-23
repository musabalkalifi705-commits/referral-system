import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

const Dashboard: NextPage = () => {
  const router = useRouter();
  const [tab, setTab] = useState<'home'|'redeem'|'referrals'|'payout'>('home');
  const [user, setUser] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [pendingEarned, setPendingEarned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type:'ok'|'err';text:string}|null>(null);
  const [serial, setSerial] = useState('');
  const [referrerCode, setReferrerCode] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('bank');
  const [accountNum, setAccountNum] = useState('');

  const token = typeof window!=='undefined' ? localStorage.getItem('access_token') : null;
  const auth = { Authorization: `Bearer ${token}` };

  useEffect(() => { loadUser(); }, []);
  useEffect(() => { if(tab==='referrals') loadReferrals(); }, [tab]);

  async function loadUser() {
    const { data: { user: u } } = await supabase.auth.getUser(token||'');
    if (!u) { router.push('/'); return; }
    const { data } = await supabase.from('users').select('*').eq('auth_uid', u.id).single();
    setUser(data || { phone: u.phone, name: 'مستخدم' });
    if (data) loadReferrals(data.id);
  }

  async function loadReferrals(uid?: string) {
    const id = uid || user?.id;
    if (!id) return;
    const { data } = await supabase.from('referrals').select('*,redemptions(cards(serial,denomination))').eq('referrer_id', id).order('created_at',{ascending:false});
    setReferrals(data||[]);
    const confirmed = (data||[]).filter((r:any)=>r.status==='confirmed').reduce((s:number,r:any)=>s+Number(r.commission_amount),0);
    const pending = (data||[]).filter((r:any)=>r.status==='pending').reduce((s:number,r:any)=>s+Number(r.commission_amount),0);
    setTotalEarned(confirmed); setPendingEarned(pending);
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg(null);
    const res = await fetch('/api/cards/redeem', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ serial, referrer_code: referrerCode||null, device_fp: navigator.userAgent.slice(0,50) })
    });
    const d = await res.json();
    setLoading(false);
    if (res.ok) { setMsg({type:'ok',text:`✅ تم تفعيل الكرت! القيمة: ${d.redemption?.denomination} ريال`}); setSerial(''); setReferrerCode(''); }
    else setMsg({type:'err',text:`❌ ${d.error}`});
  }

  async function handlePayout(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg(null);
    const res = await fetch('/api/payouts/request', {
      method:'POST',
      headers:{'Content-Type':'application/json',...auth},
      body: JSON.stringify({ amount:Number(payoutAmount), method:payoutMethod, account_details:{account:accountNum} })
    });
    const d = await res.json();
    setLoading(false);
    if (res.ok) { setMsg({type:'ok',text:'✅ تم إرسال طلب السحب — سيتم المراجعة خلال 24 ساعة'}); setPayoutAmount(''); setAccountNum(''); }
    else setMsg({type:'err',text:`❌ ${d.error}`});
  }

  const referralLink = user ? `https://referral-system-ccjf.vercel.app/?ref=${user.id?.slice(0,8)}` : '';

  return (
    <>
      <Head>
        <title>تيرا نت — لوحتي</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#050810;font-family:'IBM Plex Sans Arabic',sans-serif;color:#e0e0e0}
        .shell{display:flex;min-height:100vh}
        .sidebar{width:220px;flex-shrink:0;background:rgba(0,212,255,.03);border-left:1px solid rgba(0,212,255,.08);display:flex;flex-direction:column;padding:20px 12px;position:sticky;top:0;height:100vh}
        .logo{display:flex;align-items:center;gap:10px;padding:8px;margin-bottom:24px;border-bottom:1px solid rgba(0,212,255,.08);padding-bottom:20px}
        .logoIcon{font-size:1.4rem}
        .logoText{font-size:1.1rem;font-weight:700;color:#fff}.logoText span{color:#00d4ff}
        .nav{display:flex;flex-direction:column;gap:4px;flex:1}
        .navBtn{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;background:none;border:none;color:rgba(255,255,255,.4);font-family:inherit;font-size:.88rem;font-weight:500;cursor:pointer;width:100%;text-align:right;transition:all .15s}
        .navBtn:hover{background:rgba(255,255,255,.04);color:#fff}
        .navActive{background:rgba(0,212,255,.1)!important;color:#00d4ff!important;border:1px solid rgba(0,212,255,.15)}
        .navIcon{font-size:1rem;width:20px;text-align:center}
        .userBadge{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px;margin-top:auto}
        .userName{font-size:.85rem;font-weight:600;color:#fff;margin-bottom:4px}
        .userPhone{font-size:.75rem;color:rgba(255,255,255,.3)}
        .main{flex:1;padding:28px;overflow:auto}
        .topbar{margin-bottom:24px}
        .pageTitle{font-size:1.4rem;font-weight:700;color:#fff}
        .pageSub{font-size:.82rem;color:rgba(255,255,255,.3);margin-top:4px}
        .statsRow{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
        .statCard{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:20px}
        .statLabel{font-size:.75rem;color:rgba(255,255,255,.35);margin-bottom:8px}
        .statValue{font-size:1.6rem;font-weight:700;color:#fff}
        .statValue.cyan{color:#00d4ff}
        .statValue.green{color:#4ade80}
        .statValue.yellow{color:#fbbf24}
        .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:28px;max-width:500px}
        .cardTitle{font-size:1rem;font-weight:600;color:#fff;margin-bottom:20px;display:flex;align-items:center;gap:8px}
        .form{display:flex;flex-direction:column;gap:14px}
        .fieldGroup{display:flex;flex-direction:column;gap:6px}
        .label{font-size:.78rem;color:rgba(255,255,255,.4);font-weight:500}
        .input{padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;font-family:inherit;font-size:.9rem;outline:none;transition:border-color .2s;width:100%}
        .input:focus{border-color:#00d4ff}
        .input::placeholder{color:rgba(255,255,255,.2)}
        .btn{padding:13px;background:linear-gradient(135deg,#00d4ff,#6366f1);color:#fff;font-weight:700;border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-size:.9rem;display:flex;align-items:center;justify-content:center;transition:opacity .2s}
        .btn:hover{opacity:.85}
        .btn:disabled{opacity:.5;cursor:not-allowed}
        .alert{padding:13px 16px;border-radius:10px;font-size:.87rem;margin-bottom:18px}
        .ok{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);color:#4ade80}
        .err{background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);color:#f87171}
        .refBox{background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.15);border-radius:12px;padding:18px;margin-bottom:20px}
        .refLabel{font-size:.78rem;color:rgba(0,212,255,.7);margin-bottom:8px}
        .refCode{font-size:1rem;color:#00d4ff;font-weight:700;letter-spacing:.05em;direction:ltr;word-break:break-all}
        .copyBtn{margin-top:10px;padding:8px 16px;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.2);border-radius:8px;color:#00d4ff;font-family:inherit;font-size:.8rem;cursor:pointer;font-weight:600}
        .table{width:100%;border-collapse:collapse}
        .tableWrap{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden}
        .table th{padding:12px 18px;text-align:right;font-size:.73rem;font-weight:600;color:rgba(255,255,255,.3);letter-spacing:.05em;text-transform:uppercase;background:rgba(255,255,255,.02);border-bottom:1px solid rgba(255,255,255,.05)}
        .table td{padding:14px 18px;font-size:.87rem;border-bottom:1px solid rgba(255,255,255,.04)}
        .table tr:last-child td{border-bottom:none}
        .badge{padding:4px 10px;border-radius:99px;font-size:.73rem;font-weight:600}
        .pending{background:rgba(251,191,36,.12);color:#fbbf24}
        .confirmed{background:rgba(34,197,94,.12);color:#4ade80}
        .amount{color:#00d4ff;font-weight:600}
        .empty{padding:60px;text-align:center;color:rgba(255,255,255,.25)}
        .spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .7s linear infinite;display:inline-block}
        @keyframes spin{to{transform:rotate(360deg)}}
        .homeGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px}
        .quickCard{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:20px;cursor:pointer;transition:border-color .2s}
        .quickCard:hover{border-color:rgba(0,212,255,.3)}
        .quickIcon{font-size:1.8rem;margin-bottom:10px}
        .quickTitle{font-size:.9rem;font-weight:600;color:#fff}
        .quickSub{font-size:.78rem;color:rgba(255,255,255,.35);margin-top:4px}
        .select{padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;font-family:inherit;font-size:.9rem;outline:none;width:100%}
        @media(max-width:640px){.sidebar{display:none}.statsRow{grid-template-columns:1fr 1fr}.homeGrid{grid-template-columns:1fr}}
      `}</style>
      <div className="shell" dir="rtl">
        <aside className="sidebar">
          <div className="logo">
            <span className="logoIcon">🌐</span>
            <span className="logoText">تيرا <span>نت</span></span>
          </div>
          <nav className="nav">
            {([
              {key:'home',icon:'🏠',label:'الرئيسية'},
              {key:'redeem',icon:'🎴',label:'تفعيل كرت'},
              {key:'referrals',icon:'🔗',label:'إحالاتي'},
              {key:'payout',icon:'💰',label:'سحب الأرباح'},
            ] as const).map(item=>(
              <button key={item.key} className={`navBtn ${tab===item.key?'navActive':''}`} onClick={()=>{setTab(item.key);setMsg(null);}}>
                <span className="navIcon">{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>
          <div className="userBadge">
            <div className="userName">{user?.name||'مرحباً'}</div>
            <div className="userPhone">{user?.phone||''}</div>
          </div>
        </aside>

        <main className="main">
          {msg && <div className={`alert ${msg.type==='ok'?'ok':'err'}`}>{msg.text}</div>}

          {tab==='home' && (
            <>
              <div className="topbar">
                <div className="pageTitle">مرحباً {user?.name||''} 👋</div>
                <div className="pageSub">لوحة التحكم الخاصة بك</div>
              </div>
              <div className="statsRow">
                <div className="statCard">
                  <div className="statLabel">إجمالي الأرباح المؤكدة</div>
                  <div className="statValue cyan">{totalEarned.toFixed(0)} ﷼</div>
                </div>
                <div className="statCard">
                  <div className="statLabel">أرباح قيد الانتظار</div>
                  <div className="statValue yellow">{pendingEarned.toFixed(0)} ﷼</div>
                </div>
                <div className="statCard">
                  <div className="statLabel">إجمالي الإحالات</div>
                  <div className="statValue green">{referrals.length}</div>
                </div>
              </div>

              <div className="refBox">
                <div className="refLabel">🔗 رابط الإحالة الخاص بك — شاركه واكسب عمولة</div>
                <div className="refCode">{referralLink}</div>
                <button className="copyBtn" onClick={()=>navigator.clipboard.writeText(referralLink).then(()=>setMsg({type:'ok',text:'تم نسخ الرابط ✅'}))}>
                  📋 نسخ الرابط
                </button>
              </div>

              <div className="homeGrid">
                <div className="quickCard" onClick={()=>setTab('redeem')}>
                  <div className="quickIcon">🎴</div>
                  <div className="quickTitle">تفعيل كرت</div>
                  <div className="quickSub">أدخل رقم الكرت لتفعيله</div>
                </div>
                <div className="quickCard" onClick={()=>setTab('referrals')}>
                  <div className="quickIcon">📊</div>
                  <div className="quickTitle">سجل الإحالات</div>
                  <div className="quickSub">تابع أرباحك وإحالاتك</div>
                </div>
                <div className="quickCard" onClick={()=>setTab('payout')}>
                  <div className="quickIcon">💳</div>
                  <div className="quickTitle">سحب الأرباح</div>
                  <div className="quickSub">اطلب سحب رصيدك</div>
                </div>
                <div className="quickCard" onClick={()=>navigator.clipboard.writeText(referralLink).then(()=>setMsg({type:'ok',text:'تم نسخ الرابط ✅'}))}>
                  <div className="quickIcon">📤</div>
                  <div className="quickTitle">مشاركة رابطي</div>
                  <div className="quickSub">شارك واكسب عمولة فورية</div>
                </div>
              </div>
            </>
          )}

          {tab==='redeem' && (
            <>
              <div className="topbar"><div className="pageTitle">تفعيل كرت 🎴</div></div>
              <div className="card">
                <div className="cardTitle">📥 أدخل بيانات الكرت</div>
                <form onSubmit={handleRedeem} className="form">
                  <div className="fieldGroup">
                    <label className="label">رقم الكرت (Serial)</label>
                    <input className="input" value={serial} onChange={e=>setSerial(e.target.value)} placeholder="TERRA-0001" required dir="ltr"/>
                  </div>
                  <div className="fieldGroup">
                    <label className="label">كود المسوّق (اختياري — إذا أحالك أحد)</label>
                    <input className="input" value={referrerCode} onChange={e=>setReferrerCode(e.target.value)} placeholder="مثال: AHMED2024" dir="ltr"/>
                  </div>
                  <button className="btn" type="submit" disabled={loading}>
                    {loading ? <span className="spinner"/> : '✅ تفعيل الكرت'}
                  </button>
                </form>
              </div>
            </>
          )}

          {tab==='referrals' && (
            <>
              <div className="topbar"><div className="pageTitle">إحالاتي 🔗</div></div>
              <div className="tableWrap">
                {referrals.length===0
                  ? <div className="empty">لا توجد إحالات بعد — شارك رابطك وابدأ الكسب! 🚀</div>
                  : <table className="table">
                      <thead><tr><th>الكرت</th><th>العمولة</th><th>الحالة</th><th>التاريخ</th></tr></thead>
                      <tbody>
                        {referrals.map((r:any)=>(
                          <tr key={r.id}>
                            <td>{r.redemptions?.cards?.serial||'—'}</td>
                            <td className="amount">{Number(r.commission_amount).toFixed(0)} ﷼</td>
                            <td><span className={`badge ${r.status}`}>{r.status==='confirmed'?'مؤكدة':'قيد الانتظار'}</span></td>
                            <td>{new Date(r.created_at).toLocaleDateString('ar-SA')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                }
              </div>
            </>
          )}

          {tab==='payout' && (
            <>
              <div className="topbar"><div className="pageTitle">سحب الأرباح 💰</div></div>
              <div className="statsRow" style={{marginBottom:'20px',maxWidth:'500px'}}>
                <div className="statCard">
                  <div className="statLabel">الرصيد المتاح للسحب</div>
                  <div className="statValue cyan">{totalEarned.toFixed(0)} ﷼</div>
                </div>
                <div className="statCard">
                  <div className="statLabel">الحد الأدنى للسحب</div>
                  <div className="statValue">500 ﷼</div>
                </div>
              </div>
              <div className="card">
                <div className="cardTitle">📤 طلب سحب</div>
                <form onSubmit={handlePayout} className="form">
                  <div className="fieldGroup">
                    <label className="label">المبلغ المطلوب (ريال)</label>
                    <input className="input" type="number" min="500" value={payoutAmount} onChange={e=>setPayoutAmount(e.target.value)} placeholder="500" required/>
                  </div>
                  <div className="fieldGroup">
                    <label className="label">طريقة الاستلام</label>
                    <select className="select" value={payoutMethod} onChange={e=>setPayoutMethod(e.target.value)}>
                      <option value="bank">تحويل بنكي</option>
                      <option value="cash">كاش في اليد</option>
                    </select>
                  </div>
                  <div className="fieldGroup">
                    <label className="label">رقم الحساب أو الملاحظة</label>
                    <input className="input" value={accountNum} onChange={e=>setAccountNum(e.target.value)} placeholder="رقم الحساب أو اسم البنك"/>
                  </div>
                  <button className="btn" type="submit" disabled={loading||totalEarned<500}>
                    {loading ? <span className="spinner"/> : 'إرسال طلب السحب'}
                  </button>
                  {totalEarned<500 && <div className="err" style={{padding:'10px',borderRadius:'8px',fontSize:'.8rem'}}>⚠️ رصيدك أقل من الحد الأدنى (500 ريال)</div>}
                </form>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
};
export default Dashboard;
