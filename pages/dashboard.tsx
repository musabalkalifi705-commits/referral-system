import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const Dashboard: NextPage = () => {
  const router = useRouter();
  const [tab, setTab] = useState<'home'|'redeem'|'referrals'|'wallet'|'rewards'>('home');
  const [user, setUser] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [pendingEarned, setPendingEarned] = useState(0);
  const [msg, setMsg] = useState<{t:'ok'|'err';s:string}|null>(null);
  const [loading, setLoading] = useState(false);
  const [serial, setSerial] = useState('');
  const [refCode, setRefCode] = useState('');
  const [payAmt, setPayAmt] = useState('');
  const [payMethod, setPayMethod] = useState('bank');
  const [payAcct, setPayAcct] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const token = typeof window!=='undefined' ? localStorage.getItem('access_token') : null;
  const auth = { Authorization: `Bearer ${token}` };
  const BASE = typeof window !== 'undefined' ? window.location.origin : 'https://tera.remote-alkhulaifi.com';

  useEffect(() => {
    if (!token) { router.replace('/'); return; }
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => window.history.pushState(null, '', window.location.href);
    loadUser();
  }, []);

  useEffect(() => { if (tab==='referrals' && user) loadReferrals(user.id); }, [tab]);

  async function loadUser() {
    const { data: { user: u } } = await sb.auth.getUser(token||'');
    if (!u) { router.replace('/'); return; }
    const { data } = await sb.from('users').select('*').eq('auth_uid', u.id).single();
    setUser(data || { phone: u.phone, name: 'مستخدم', id: u.id });
    if (data) loadReferrals(data.id);
  }

  async function loadReferrals(uid: string) {
    const { data } = await sb.from('referrals').select('*').eq('referrer_id', uid).order('created_at',{ascending:false});
    setReferrals(data||[]);
    const conf = (data||[]).filter((r:any)=>r.status==='confirmed').reduce((s:number,r:any)=>s+Number(r.commission_amount),0);
    const pend = (data||[]).filter((r:any)=>r.status==='pending').reduce((s:number,r:any)=>s+Number(r.commission_amount),0);
    setTotalEarned(conf); setPendingEarned(pend);
  }

  async function redeem(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg(null);
    const res = await fetch('/api/cards/redeem', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ serial, referrer_code: refCode||null, device_fp: navigator.userAgent.slice(0,50) }) });
    const d = await res.json();
    setLoading(false);
    if (res.ok) { setMsg({t:'ok',s:`✅ تم تفعيل الكرت بنجاح! القيمة: ${d.redemption?.denomination} ريال`}); setSerial(''); setRefCode(''); }
    else setMsg({t:'err',s:`❌ ${d.error}`});
  }

  async function requestPayout(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg(null);
    const res = await fetch('/api/payouts/request', { method:'POST', headers:{'Content-Type':'application/json',...auth}, body: JSON.stringify({ amount:Number(payAmt), method:payMethod, account_details:{account:payAcct} }) });
    const d = await res.json();
    setLoading(false);
    if (res.ok) { setMsg({t:'ok',s:'✅ تم إرسال طلب السحب — المراجعة خلال 24 ساعة'}); setPayAmt(''); setPayAcct(''); }
    else setMsg({t:'err',s:`❌ ${d.error}`});
  }

  function logout() { localStorage.removeItem('access_token'); sb.auth.signOut(); router.replace('/'); }

  const refLink = `${BASE}/?ref=${user?.id?.slice(0,8)||''}`;
  const navItems = [
    {k:'home',i:'🏠',l:'الرئيسية'},
    {k:'redeem',i:'🎴',l:'تفعيل كرت'},
    {k:'referrals',i:'🔗',l:'إحالاتي'},
    {k:'wallet',i:'💰',l:'السحب'},
    {k:'rewards',i:'🎁',l:'المكافآت'},
  ] as const;

  const S = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#040810;font-family:'Tajawal',sans-serif;color:#e2e8f0;min-height:100dvh}
    .shell{display:flex;min-height:100dvh}
    
    /* Sidebar */
    .sidebar{width:230px;flex-shrink:0;background:rgba(0,122,255,.03);border-left:1px solid rgba(0,122,255,.09);display:flex;flex-direction:column;padding:20px 12px;position:sticky;top:0;height:100vh;transition:transform .3s}
    .sLogo{display:flex;align-items:center;gap:10px;padding:10px 10px 22px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:14px}
    .sLogoIcon{font-size:1.3rem}
    .sLogoText{font-size:1.05rem;font-weight:900;color:#fff}
    .sLogoText span{background:linear-gradient(90deg,#007aff,#00c7be);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .nav{display:flex;flex-direction:column;gap:3px;flex:1}
    .nb{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;background:none;border:none;color:rgba(255,255,255,.38);font-family:inherit;font-size:.87rem;font-weight:600;cursor:pointer;width:100%;text-align:right;transition:all .15s}
    .nb:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.7)}
    .nbA{background:rgba(0,122,255,.14)!important;color:#4da3ff!important;border:1px solid rgba(0,122,255,.18)!important}
    .nbI{font-size:.95rem;width:22px;text-align:center}
    .userCard{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px;margin-top:auto}
    .uName{font-size:.85rem;font-weight:700;color:#fff;margin-bottom:3px}
    .uPhone{font-size:.73rem;color:rgba(255,255,255,.28)}
    .logoutBtn{margin-top:10px;width:100%;padding:8px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.15);border-radius:8px;color:#f87171;font-family:inherit;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s}
    .logoutBtn:hover{background:rgba(239,68,68,.15)}

    /* Mobile nav */
    .mobileNav{display:none;position:fixed;bottom:0;left:0;right:0;background:rgba(4,8,16,.95);border-top:1px solid rgba(0,122,255,.1);backdrop-filter:blur(20px);z-index:100;padding:8px 4px 12px}
    .mobileNav .navRow{display:flex;justify-content:space-around}
    .mnb{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 14px;border-radius:10px;background:none;border:none;color:rgba(255,255,255,.3);font-family:inherit;font-size:.65rem;font-weight:600;cursor:pointer;transition:all .15s;min-width:56px}
    .mnb span:first-child{font-size:1.2rem}
    .mnbA{color:#4da3ff!important}

    /* Main */
    .main{flex:1;padding:24px;overflow:auto;padding-bottom:80px}
    .topbar{margin-bottom:22px;display:flex;align-items:center;justify-content:space-between}
    .pageTitle{font-size:1.3rem;font-weight:800;color:#fff}
    .pageSub{font-size:.76rem;color:rgba(255,255,255,.3);margin-top:2px}
    
    /* Stats */
    .statsGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
    .sc{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:18px}
    .scL{font-size:.72rem;color:rgba(255,255,255,.3);margin-bottom:8px;font-weight:500}
    .scV{font-size:1.5rem;font-weight:900}
    .cyan{color:#22d3ee} .green{color:#4ade80} .yellow{color:#fbbf24} .blue{color:#60a5fa}
    
    /* Referral box */
    .refBox{background:linear-gradient(135deg,rgba(0,122,255,.08),rgba(0,199,190,.05));border:1px solid rgba(0,122,255,.18);border-radius:14px;padding:18px;margin-bottom:18px;position:relative;overflow:hidden}
    .refBox::before{content:'';position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(0,122,255,.08)}
    .refLabel{font-size:.75rem;color:rgba(0,122,255,.8);margin-bottom:8px;font-weight:600;position:relative}
    .refUrl{font-size:.85rem;color:#60a5fa;word-break:break-all;font-weight:500;direction:ltr;position:relative}
    .copyBtn{margin-top:10px;padding:8px 18px;background:rgba(0,122,255,.14);border:1px solid rgba(0,122,255,.22);border-radius:8px;color:#4da3ff;font-family:inherit;font-size:.8rem;font-weight:700;cursor:pointer;transition:all .2s;position:relative}
    .copyBtn:hover{background:rgba(0,122,255,.22)}
    
    /* Quick cards */
    .quickGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .qc{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:18px;cursor:pointer;transition:all .18s}
    .qc:hover{border-color:rgba(0,122,255,.3);background:rgba(0,122,255,.05);transform:translateY(-2px)}
    .qcIcon{font-size:1.7rem;margin-bottom:8px}
    .qcTitle{font-size:.87rem;font-weight:700;color:#fff}
    .qcSub{font-size:.74rem;color:rgba(255,255,255,.3);margin-top:3px}
    
    /* Form card */
    .formCard{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:24px;max-width:480px}
    .formTitle{font-size:.95rem;font-weight:700;color:#fff;margin-bottom:18px;display:flex;align-items:center;gap:8px}
    .form{display:flex;flex-direction:column;gap:13px}
    .fl{display:flex;flex-direction:column;gap:5px}
    .lbl{font-size:.75rem;color:rgba(255,255,255,.35);font-weight:500}
    .inp{padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;font-family:inherit;font-size:.9rem;outline:none;transition:all .2s;width:100%}
    .inp:focus{border-color:#007aff;box-shadow:0 0 0 3px rgba(0,122,255,.1)}
    .inp::placeholder{color:rgba(255,255,255,.18)}
    .sel{padding:12px 16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;font-family:inherit;font-size:.9rem;outline:none;width:100%}
    .btn{padding:13px;background:linear-gradient(135deg,#007aff,#00c7be);color:#fff;font-weight:800;border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-size:.9rem;display:flex;align-items:center;justify-content:center;transition:all .2s}
    .btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,122,255,.3)}
    .btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
    
    /* Alert */
    .alert{padding:12px 16px;border-radius:10px;font-size:.84rem;margin-bottom:16px}
    .ok{background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.18);color:#4ade80}
    .err{background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.18);color:#f87171}
    
    /* Table */
    .tw{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden}
    table{width:100%;border-collapse:collapse}
    th{padding:12px 16px;text-align:right;font-size:.71rem;font-weight:700;color:rgba(255,255,255,.28);text-transform:uppercase;letter-spacing:.05em;background:rgba(255,255,255,.02);border-bottom:1px solid rgba(255,255,255,.05)}
    td{padding:13px 16px;font-size:.86rem;border-bottom:1px solid rgba(255,255,255,.04)}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:rgba(255,255,255,.015)}
    .badge{padding:3px 10px;border-radius:99px;font-size:.71rem;font-weight:700}
    .bp{background:rgba(251,191,36,.1);color:#fbbf24}
    .bc{background:rgba(74,222,128,.1);color:#4ade80}
    .empty{padding:56px;text-align:center;color:rgba(255,255,255,.2);font-size:.9rem}
    
    /* Rewards */
    .rewardGrid{display:flex;flex-direction:column;gap:12px;max-width:500px}
    .reward{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:18px;display:flex;gap:14px;align-items:flex-start}
    .rewardIcon{font-size:1.8rem;flex-shrink:0}
    .rewardTitle{font-size:.9rem;font-weight:700;color:#fff;margin-bottom:4px}
    .rewardDesc{font-size:.8rem;color:rgba(255,255,255,.4);line-height:1.5}
    .rewardBadge{margin-top:8px;display:inline-block;padding:4px 12px;background:rgba(0,122,255,.14);border:1px solid rgba(0,122,255,.22);border-radius:99px;font-size:.75rem;color:#60a5fa;font-weight:700}
    
    /* Balance info */
    .balRow{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;max-width:480px}
    
    .sp{width:16px;height:16px;border-radius:50%;border:2.5px solid rgba(255,255,255,.25);border-top-color:#fff;animation:spin .7s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    
    @media(max-width:768px){
      .sidebar{display:none}
      .mobileNav{display:block}
      .main{padding:16px;padding-bottom:90px}
      .statsGrid{grid-template-columns:1fr 1fr}
      .quickGrid{grid-template-columns:1fr 1fr}
      .balRow{grid-template-columns:1fr}
    }
    @media(max-width:400px){
      .statsGrid{grid-template-columns:1fr}
    }
  `;

  return (
    <>
      <Head>
        <title>تيرا نت — لوحتي</title>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet"/>
      </Head>
      <style>{S}</style>
      <div className="shell" dir="rtl">
        {/* Desktop Sidebar */}
        <aside className="sidebar">
          <div className="sLogo">
            <span className="sLogoIcon">🌐</span>
            <span className="sLogoText">تيرا <span>نت</span></span>
          </div>
          <nav className="nav">
            {navItems.map(n => (
              <button key={n.k} className={`nb ${tab===n.k?'nbA':''}`} onClick={()=>{setTab(n.k);setMsg(null);}}>
                <span className="nbI">{n.i}</span>{n.l}
              </button>
            ))}
          </nav>
          <div className="userCard">
            <div className="uName">{user?.name||'مستخدم'}</div>
            <div className="uPhone" dir="ltr">{user?.phone||''}</div>
            <button className="logoutBtn" onClick={logout}>تسجيل الخروج ←</button>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          {msg && <div className={`alert ${msg.t==='ok'?'ok':'err'}`}>{msg.s}</div>}

          {tab==='home' && (
            <>
              <div className="topbar">
                <div>
                  <div className="pageTitle">مرحباً {user?.name?.split(' ')[0]||''} 👋</div>
                  <div className="pageSub">لوحة التحكم الخاصة بك</div>
                </div>
              </div>
              <div className="statsGrid">
                <div className="sc"><div className="scL">الأرباح المؤكدة</div><div className={`scV cyan`}>{totalEarned.toFixed(0)} ﷼</div></div>
                <div className="sc"><div className="scL">قيد الانتظار</div><div className={`scV yellow`}>{pendingEarned.toFixed(0)} ﷼</div></div>
                <div className="sc"><div className="scL">إجمالي الإحالات</div><div className={`scV green`}>{referrals.length}</div></div>
              </div>
              <div className="refBox">
                <div className="refLabel">🔗 رابط إحالتك الخاص — شاركه واكسب عمولة فورية</div>
                <div className="refUrl">{refLink}</div>
                <button className="copyBtn" onClick={()=>navigator.clipboard.writeText(refLink).then(()=>setMsg({t:'ok',s:'✅ تم نسخ الرابط'}))}>📋 نسخ الرابط</button>
              </div>
              <div className="quickGrid">
                {navItems.filter(n=>n.k!=='home').map(n=>(
                  <div key={n.k} className="qc" onClick={()=>setTab(n.k)}>
                    <div className="qcIcon">{n.i}</div>
                    <div className="qcTitle">{n.l}</div>
                    <div className="qcSub">{n.k==='redeem'?'أدخل رقم الكرت':n.k==='referrals'?'تابع أرباحك':n.k==='wallet'?'اسحب رصيدك':'اعرف مكافآتك'}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab==='redeem' && (
            <>
              <div className="topbar"><div className="pageTitle">تفعيل كرت 🎴</div></div>
              <div className="formCard">
                <div className="formTitle">📥 أدخل بيانات الكرت</div>
                <form onSubmit={redeem} className="form">
                  <div className="fl">
                    <label className="lbl">رقم الكرت (Serial)</label>
                    <input className="inp" value={serial} onChange={e=>setSerial(e.target.value.toUpperCase())} placeholder="TERRA-0001" required dir="ltr"/>
                  </div>
                  <div className="fl">
                    <label className="lbl">كود المسوّق (اختياري)</label>
                    <input className="inp" value={refCode} onChange={e=>setRefCode(e.target.value)} placeholder="إذا أحالك شخص أدخل كوده هنا" dir="ltr"/>
                  </div>
                  <button className="btn" type="submit" disabled={loading}>
                    {loading?<span className="sp"/>:'✅ تفعيل الكرت'}
                  </button>
                </form>
              </div>
            </>
          )}

          {tab==='referrals' && (
            <>
              <div className="topbar"><div className="pageTitle">إحالاتي 🔗</div></div>
              <div className="tw">
                {referrals.length===0
                  ? <div className="empty">لا توجد إحالات — شارك رابطك وابدأ الكسب! 🚀</div>
                  : <table>
                      <thead><tr><th>الكرت</th><th>العمولة</th><th>الحالة</th><th>التاريخ</th></tr></thead>
                      <tbody>
                        {referrals.map((r:any)=>(
                          <tr key={r.id}>
                            <td>{r.redemption_id?.slice(0,8)||'—'}</td>
                            <td className="cyan" style={{fontWeight:700}}>{Number(r.commission_amount).toFixed(0)} ﷼</td>
                            <td><span className={`badge ${r.status==='confirmed'?'bc':'bp'}`}>{r.status==='confirmed'?'مؤكدة':'انتظار'}</span></td>
                            <td style={{color:'rgba(255,255,255,.4)',fontSize:'.8rem'}}>{new Date(r.created_at).toLocaleDateString('ar-SA')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                }
              </div>
            </>
          )}

          {tab==='wallet' && (
            <>
              <div className="topbar"><div className="pageTitle">سحب الأرباح 💰</div></div>
              <div className="balRow">
                <div className="sc"><div className="scL">الرصيد المتاح</div><div className="scV cyan">{totalEarned.toFixed(0)} ﷼</div></div>
                <div className="sc"><div className="scL">الحد الأدنى</div><div className="scV">500 ﷼</div></div>
              </div>
              <div className="formCard">
                <div className="formTitle">📤 طلب سحب</div>
                <form onSubmit={requestPayout} className="form">
                  <div className="fl">
                    <label className="lbl">المبلغ (ريال)</label>
                    <input className="inp" type="number" min="500" value={payAmt} onChange={e=>setPayAmt(e.target.value)} placeholder="500" required/>
                  </div>
                  <div className="fl">
                    <label className="lbl">طريقة الاستلام</label>
                    <select className="sel" value={payMethod} onChange={e=>setPayMethod(e.target.value)}>
                      <option value="bank">تحويل بنكي</option>
                      <option value="cash">كاش</option>
                    </select>
                  </div>
                  <div className="fl">
                    <label className="lbl">رقم الحساب أو ملاحظة</label>
                    <input className="inp" value={payAcct} onChange={e=>setPayAcct(e.target.value)} placeholder="رقم الحساب أو اسم البنك"/>
                  </div>
                  <button className="btn" type="submit" disabled={loading||totalEarned<500}>
                    {loading?<span className="sp"/>:'إرسال الطلب'}
                  </button>
                  {totalEarned<500 && <div className="err" style={{marginTop:8}}>⚠️ رصيدك أقل من 500 ريال</div>}
                </form>
              </div>
            </>
          )}

          {tab==='rewards' && (
            <>
              <div className="topbar"><div className="pageTitle">المكافآت 🎁</div></div>
              <div className="rewardGrid">
                <div className="reward"><div className="rewardIcon">⭐</div><div><div className="rewardTitle">3 إحالات في أسبوع</div><div className="rewardDesc">أحل 3 أصدقاء يشتركون معنا خلال 7 أيام واحصل على مكافأة فورية</div><div className="rewardBadge">+50 ريال بونص</div></div></div>
                <div className="reward"><div className="rewardIcon">🔥</div><div><div className="rewardTitle">7 إحالات في أسبوع</div><div className="rewardDesc">أحل 7 أصدقاء في أسبوع واحد وانضم لنخبة المسوّقين</div><div className="rewardBadge">+150 ريال + شهر مجاني</div></div></div>
                <div className="reward"><div className="rewardIcon">🏆</div><div><div className="rewardTitle">15 إحالة في شهر</div><div className="rewardDesc">حقق 15 إحالة مؤكدة خلال الشهر وكن الأفضل</div><div className="rewardBadge">+500 ريال 🏆</div></div></div>
                <div className="reward"><div className="rewardIcon">💎</div><div><div className="rewardTitle">مسوّق مؤسس — أول 20 فقط</div><div className="rewardDesc">سجّل مبكراً واحصل على نسبة 15% مدى الحياة بدلاً من 10%</div><div className="rewardBadge">نسبة دائمة 15% 💎</div></div></div>
              </div>
            </>
          )}
        </main>

        {/* Mobile Bottom Nav */}
        <div className="mobileNav">
          <div className="navRow">
            {navItems.map(n=>(
              <button key={n.k} className={`mnb ${tab===n.k?'mnbA':''}`} onClick={()=>{setTab(n.k);setMsg(null);}}>
                <span>{n.i}</span>
                <span>{n.l}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
export default Dashboard;
