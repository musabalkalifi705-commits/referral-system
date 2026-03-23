import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

const Admin: NextPage = () => {
  const router = useRouter();
  const [tab, setTab] = useState<'overview'|'users'|'payouts'|'cards'|'rules'>('overview');
  const [stats, setStats] = useState({users:0,activeCards:0,usedCards:0,pendingPayouts:0,totalCommissions:0});
  const [users, setUsers] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [msg, setMsg] = useState<{type:'ok'|'err';text:string}|null>(null);
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [newLevel, setNewLevel] = useState('');
  const [newRate, setNewRate] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const token = typeof window!=='undefined' ? localStorage.getItem('access_token') : null;
  const auth = { Authorization: `Bearer ${token}` };

  useEffect(()=>{ checkAdmin(); },[]);
  useEffect(()=>{
    if(tab==='overview') loadStats();
    if(tab==='users') loadUsers();
    if(tab==='payouts') loadPayouts();
    if(tab==='rules') loadRules();
  },[tab]);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser(token||'');
    if (!user) { router.push('/'); return; }
    const { data } = await supabase.from('users').select('role').eq('auth_uid', user.id).single();
    if (data?.role !== 'admin') { router.push('/dashboard'); }
    loadStats();
  }

  async function loadStats() {
    const [u,ac,uc,pp,tc] = await Promise.all([
      supabase.from('users').select('id',{count:'exact',head:true}),
      supabase.from('cards').select('id',{count:'exact',head:true}).eq('status','unused'),
      supabase.from('cards').select('id',{count:'exact',head:true}).eq('status','used'),
      supabase.from('payout_requests').select('id',{count:'exact',head:true}).eq('status','pending'),
      supabase.from('referrals').select('commission_amount').eq('status','confirmed'),
    ]);
    const total = (tc.data||[]).reduce((s:number,r:any)=>s+Number(r.commission_amount),0);
    setStats({users:u.count||0,activeCards:ac.count||0,usedCards:uc.count||0,pendingPayouts:pp.count||0,totalCommissions:total});
  }

  async function loadUsers() {
    const { data } = await supabase.from('users').select('*,referrals(commission_amount)').order('created_at',{ascending:false}).limit(50);
    setUsers(data||[]);
  }

  async function loadPayouts() {
    const res = await fetch('/api/admin/payouts', {headers:auth});
    const d = await res.json();
    setPayouts(d.payouts||[]);
  }

  async function loadRules() {
    const res = await fetch('/api/admin/commission-rules', {headers:auth});
    const d = await res.json();
    setRules(d.rules||[]);
  }

  async function approveOrPay(id:string, action:string) {
    setLoading(true);
    const res = await fetch(`/api/admin/payouts/${id}/${action}`, {method:'POST',headers:auth});
    const d = await res.json();
    setLoading(false);
    if (res.ok) { setMsg({type:'ok',text:'تمت العملية ✅'}); loadPayouts(); loadStats(); }
    else setMsg({type:'err',text:d.error});
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true); setUploadResult(null);
    const text = await file.text();
    const res = await fetch('/api/admin/cards/upload',{method:'POST',headers:{'Content-Type':'text/plain',...auth},body:text});
    const d = await res.json();
    setLoading(false);
    setUploadResult(d);
    setMsg(res.ok?{type:'ok',text:`تم رفع ${d.imported} كرت ✅`}:{type:'err',text:d.error});
  }

  async function addRule(e:React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/commission-rules',{method:'POST',headers:{'Content-Type':'application/json',...auth},body:JSON.stringify({level:Number(newLevel),rate:Number(newRate)/100,description:`المستوى ${newLevel}`})});
    const d = await res.json();
    if(res.ok){setMsg({type:'ok',text:'تم الحفظ ✅'});loadRules();setNewLevel('');setNewRate('');}
    else setMsg({type:'err',text:d.error});
  }

  return (
    <>
      <Head>
        <title>تيرا نت — الإدارة</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#050810;font-family:'IBM Plex Sans Arabic',sans-serif;color:#e0e0e0}
        .shell{display:flex;min-height:100vh}
        .sidebar{width:220px;flex-shrink:0;background:rgba(99,102,241,.03);border-left:1px solid rgba(99,102,241,.1);display:flex;flex-direction:column;padding:20px 12px;position:sticky;top:0;height:100vh}
        .logo{display:flex;align-items:center;gap:10px;padding-bottom:20px;margin-bottom:20px;border-bottom:1px solid rgba(99,102,241,.1)}
        .logoText{font-size:1rem;font-weight:700;color:#fff}.logoText span{color:#818cf8}
        .logoSub{font-size:.7rem;color:rgba(255,255,255,.3)}
        .nav{display:flex;flex-direction:column;gap:4px;flex:1}
        .navBtn{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;background:none;border:none;color:rgba(255,255,255,.4);font-family:inherit;font-size:.87rem;font-weight:500;cursor:pointer;width:100%;text-align:right;transition:all .15s}
        .navBtn:hover{background:rgba(255,255,255,.04);color:#fff}
        .navActive{background:rgba(99,102,241,.12)!important;color:#818cf8!important;border:1px solid rgba(99,102,241,.2)}
        .main{flex:1;padding:28px;overflow:auto}
        .topbar{margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .pageTitle{font-size:1.4rem;font-weight:700;color:#fff}
        .statsGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px}
        .statCard{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:13px;padding:18px}
        .statLabel{font-size:.72rem;color:rgba(255,255,255,.3);margin-bottom:8px}
        .statValue{font-size:1.5rem;font-weight:700}
        .cyan{color:#00d4ff}.green{color:#4ade80}.yellow{color:#fbbf24}.purple{color:#818cf8}.red{color:#f87171}
        .tableWrap{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden}
        .table{width:100%;border-collapse:collapse}
        .table th{padding:12px 16px;text-align:right;font-size:.72rem;font-weight:600;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.05em;background:rgba(255,255,255,.02);border-bottom:1px solid rgba(255,255,255,.05)}
        .table td{padding:13px 16px;font-size:.85rem;border-bottom:1px solid rgba(255,255,255,.04)}
        .table tr:last-child td{border-bottom:none}
        .table tr:hover td{background:rgba(255,255,255,.015)}
        .badge{padding:3px 10px;border-radius:99px;font-size:.72rem;font-weight:600}
        .pending{background:rgba(251,191,36,.12);color:#fbbf24}
        .approved{background:rgba(34,197,94,.12);color:#4ade80}
        .paid{background:rgba(99,102,241,.15);color:#818cf8}
        .member{background:rgba(0,212,255,.1);color:#00d4ff}
        .admin{background:rgba(251,191,36,.12);color:#fbbf24}
        .amount{color:#00d4ff;font-weight:600}
        .actions{display:flex;gap:6px}
        .btnApprove,.btnPay,.btnDel{padding:5px 12px;border-radius:7px;font-size:.75rem;font-weight:600;font-family:inherit;cursor:pointer;border:none}
        .btnApprove{background:rgba(34,197,94,.12);color:#4ade80}
        .btnPay{background:rgba(99,102,241,.15);color:#818cf8}
        .btnDel{background:rgba(239,68,68,.1);color:#f87171}
        .empty{padding:60px;text-align:center;color:rgba(255,255,255,.25)}
        .alert{padding:12px 16px;border-radius:10px;font-size:.85rem;margin-bottom:18px}
        .ok{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);color:#4ade80}
        .err{background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);color:#f87171}
        .uploadBox{max-width:560px}
        .uploadArea{border:2px dashed rgba(99,102,241,.2);border-radius:14px;padding:48px 28px;text-align:center;cursor:pointer;transition:all .2s}
        .uploadArea:hover{border-color:#818cf8;background:rgba(99,102,241,.04)}
        .uploadIcon{font-size:2.5rem;margin-bottom:12px}
        .uploadArea p{color:rgba(255,255,255,.4);margin-bottom:6px}
        .uploadArea small{color:rgba(255,255,255,.25);font-size:.78rem}
        .uploadResult{display:flex;gap:14px;margin-top:20px}
        .resultCard{flex:1;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:18px;text-align:center}
        .resultCard span{display:block;font-size:1.8rem;font-weight:700;color:#818cf8}
        .resultCard label{font-size:.75rem;color:rgba(255,255,255,.3);margin-top:4px;display:block}
        .rulesWrap{max-width:580px;display:flex;flex-direction:column;gap:20px}
        .addRuleForm{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:20px}
        .addRuleForm h3{font-size:.95rem;font-weight:600;color:#fff;margin-bottom:14px}
        .formRow{display:flex;gap:10px;align-items:flex-end}
        .input{padding:11px 14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:9px;color:#fff;font-family:inherit;font-size:.88rem;outline:none;transition:border-color .2s;width:100%}
        .input:focus{border-color:#818cf8}
        .input::placeholder{color:rgba(255,255,255,.2)}
        .btnSave{padding:11px 20px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;font-weight:700;border:none;border-radius:9px;cursor:pointer;font-family:inherit;white-space:nowrap}
        .filterRow{display:flex;gap:8px}
        .filterBtn{padding:7px 14px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.4);font-size:.78rem;cursor:pointer;font-family:inherit;transition:all .15s}
        .filterBtn:hover{background:rgba(255,255,255,.08);color:#fff}
        .spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;animation:spin .7s linear infinite;display:inline-block}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <div className="shell" dir="rtl">
        <aside className="sidebar">
          <div className="logo">
            <div>
              <div className="logoText">⚡ تيرا <span>نت</span></div>
              <div className="logoSub">لوحة الإدارة</div>
            </div>
          </div>
          <nav className="nav">
            {([
              {key:'overview',icon:'📊',label:'نظرة عامة'},
              {key:'users',icon:'👥',label:'المسوّقون'},
              {key:'payouts',icon:'💸',label:'طلبات السحب'},
              {key:'cards',icon:'🎴',label:'رفع الكروت'},
              {key:'rules',icon:'⚙️',label:'العمولات'},
            ] as const).map(item=>(
              <button key={item.key} className={`navBtn ${tab===item.key?'navActive':''}`} onClick={()=>{setTab(item.key);setMsg(null);}}>
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="main">
          {msg && <div className={`alert ${msg.type==='ok'?'ok':'err'}`}>{msg.text}</div>}

          {tab==='overview' && (
            <>
              <div className="topbar"><div className="pageTitle">📊 نظرة عامة</div></div>
              <div className="statsGrid">
                <div className="statCard"><div className="statLabel">المسوّقون المسجّلون</div><div className={`statValue cyan`}>{stats.users}</div></div>
                <div className="statCard"><div className="statLabel">كروت متاحة</div><div className={`statValue green`}>{stats.activeCards}</div></div>
                <div className="statCard"><div className="statLabel">كروت مستخدمة</div><div className={`statValue purple`}>{stats.usedCards}</div></div>
                <div className="statCard"><div className="statLabel">طلبات سحب معلّقة</div><div className={`statValue yellow`}>{stats.pendingPayouts}</div></div>
                <div className="statCard"><div className="statLabel">إجمالي العمولات المدفوعة</div><div className={`statValue red`}>{stats.totalCommissions.toFixed(0)} ﷼</div></div>
              </div>
            </>
          )}

          {tab==='users' && (
            <>
              <div className="topbar"><div className="pageTitle">👥 المسوّقون ({users.length})</div></div>
              <div className="tableWrap">
                {users.length===0 ? <div className="empty">لا يوجد مستخدمون بعد</div> :
                  <table className="table">
                    <thead><tr><th>الاسم</th><th>الجوال</th><th>الدور</th><th>العمولات</th><th>تاريخ التسجيل</th></tr></thead>
                    <tbody>
                      {users.map((u:any)=>{
                        const earned = (u.referrals||[]).reduce((s:number,r:any)=>s+Number(r.commission_amount),0);
                        return (
                          <tr key={u.id}>
                            <td>{u.name||'—'}</td>
                            <td dir="ltr">{u.phone}</td>
                            <td><span className={`badge ${u.role}`}>{u.role==='admin'?'مدير':'مسوّق'}</span></td>
                            <td className="amount">{earned.toFixed(0)} ﷼</td>
                            <td>{new Date(u.created_at).toLocaleDateString('ar-SA')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                }
              </div>
            </>
          )}

          {tab==='payouts' && (
            <>
              <div className="topbar">
                <div className="pageTitle">💸 طلبات السحب</div>
                <div className="filterRow">
                  {['','pending','approved','paid'].map(s=>(
                    <button key={s} className="filterBtn" onClick={async()=>{const res=await fetch(`/api/admin/payouts${s?'?status='+s:''}`,{headers:auth});const d=await res.json();setPayouts(d.payouts||[]);}}>
                      {s||'الكل'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tableWrap">
                {payouts.length===0 ? <div className="empty">لا توجد طلبات</div> :
                  <table className="table">
                    <thead><tr><th>المسوّق</th><th>المبلغ</th><th>الطريقة</th><th>الحالة</th><th>الإجراء</th></tr></thead>
                    <tbody>
                      {payouts.map((p:any)=>(
                        <tr key={p.id}>
                          <td>{(p.user as any)?.phone||'—'}</td>
                          <td className="amount">{Number(p.amount).toFixed(0)} ﷼</td>
                          <td>{p.method==='bank'?'بنك':'كاش'}</td>
                          <td><span className={`badge ${p.status}`}>{p.status==='pending'?'معلّق':p.status==='approved'?'موافق عليه':'مدفوع'}</span></td>
                          <td><div className="actions">
                            {p.status==='pending' && <button className="btnApprove" onClick={()=>approveOrPay(p.id,'approve')}>موافقة</button>}
                            {p.status==='approved' && <button className="btnPay" onClick={()=>approveOrPay(p.id,'mark-paid')}>تم الدفع</button>}
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
              </div>
            </>
          )}

          {tab==='cards' && (
            <>
              <div className="topbar"><div className="pageTitle">🎴 رفع الكروت</div></div>
              <div className="uploadBox">
                <div className="uploadArea" onClick={()=>fileRef.current?.click()}>
                  <div className="uploadIcon">📁</div>
                  <p>اسحب ملف CSV أو انقر للاختيار</p>
                  <small>الأعمدة: serial, hash, denomination, wholesale_price</small>
                  <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={handleUpload}/>
                </div>
                {loading && <div style={{textAlign:'center',padding:'20px'}}><span className="spinner"/></div>}
                {uploadResult && (
                  <div className="uploadResult">
                    <div className="resultCard"><span>{uploadResult.imported}</span><label>تم الاستيراد</label></div>
                    <div className="resultCard"><span>{uploadResult.duplicates_skipped}</span><label>مكرر (تخطّي)</label></div>
                    <div className="resultCard"><span>{uploadResult.total}</span><label>إجمالي</label></div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab==='rules' && (
            <>
              <div className="topbar"><div className="pageTitle">⚙️ قواعد العمولة</div></div>
              <div className="rulesWrap">
                <div className="tableWrap">
                  {rules.length===0 ? <div className="empty">لا توجد قواعد — أضف الآن</div> :
                    <table className="table">
                      <thead><tr><th>المستوى</th><th>النسبة</th><th>الوصف</th><th></th></tr></thead>
                      <tbody>
                        {rules.map((r:any)=>(
                          <tr key={r.id}>
                            <td>المستوى {r.level}</td>
                            <td className="amount">{(r.rate*100).toFixed(1)}%</td>
                            <td>{r.description||'—'}</td>
                            <td><button className="btnDel" onClick={async()=>{await fetch('/api/admin/commission-rules',{method:'DELETE',headers:{'Content-Type':'application/json',...auth},body:JSON.stringify({level:r.level})});loadRules();}}>حذف</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                </div>
                <div className="addRuleForm">
                  <h3>إضافة قاعدة عمولة</h3>
                  <form onSubmit={addRule}>
                    <div className="formRow">
                      <input className="input" type="number" placeholder="المستوى (1، 2...)" value={newLevel} onChange={e=>setNewLevel(e.target.value)} required/>
                      <input className="input" type="number" step="0.1" placeholder="النسبة %" value={newRate} onChange={e=>setNewRate(e.target.value)} required/>
                      <button className="btnSave" type="submit">حفظ</button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
};
export default Admin;
