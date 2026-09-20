import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

type Transaction = { id: string; amount: number; status?: string; created_at: string; fulfillment_status?: string };
type Props = {
  available: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  withdrawals: number;
  transactions: Transaction[];
  withdrawing: boolean;
  onConfirm: (amount: number) => Promise<void>;
};

const money = (value: number) => "GH₵ " + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SellerBalancePayouts({ available, pendingBalance, lifetimeEarnings, withdrawals, transactions, withdrawing, onConfirm }: Props) {
  const webView = useRef<WebView>(null);
  const cards = [
    { id: "available", title: "Available balance", value: money(available), icon: "wallet", color: "#F64D86" },
    { id: "pending", title: "Pending balance", value: money(pendingBalance), icon: "receipt", color: "#7C486B" },
    { id: "lifetime", title: "Lifetime earnings", value: money(lifetimeEarnings), icon: "chart", color: "#171318" },
    { id: "withdrawals", title: "Withdrawals", value: money(withdrawals), icon: "arrow", color: "#B06B92" },
  ];
  const presets = Array.from(new Set([available, Math.round(available * 0.5 * 100) / 100, Math.min(100, available)].filter((value) => value > 0))).slice(0, 3);
  const payload = JSON.stringify({ cards, available, presets, transactions, withdrawing }).replace(/</g, "\\u003c");

  const handleMessage = async (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
    if (!message.startsWith("withdraw:")) return;
    const amount = Number(message.slice("withdraw:".length));
    try {
      await onConfirm(amount);
      webView.current?.injectJavaScript("window.__withdrawDone && window.__withdrawDone(); true;");
    } catch {
      webView.current?.injectJavaScript("window.__withdrawError && window.__withdrawError(); true;");
    }
  };

  return (
    <View style={s.wrap}>
      <WebView
        ref={webView}
        originWhitelist={["*"]}
        source={{ html: balanceHtml(payload) }}
        onMessage={handleMessage}
        javaScriptEnabled
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        style={[s.webView, { height: 650 + transactions.length * 76 }]}
      />
    </View>
  );
}

const balanceHtml = (payload: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>
*{box-sizing:border-box}html,body{margin:0;background:transparent;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171318}body{padding:2px 0 8px}.stack{display:flex;flex-direction:column;gap:14px}.carousel{display:flex;flex-direction:column;gap:12px}.expanded{min-height:192px;border-radius:30px;padding:18px;display:flex;flex-direction:column;justify-content:space-between;color:#FFF;transition:all .6s cubic-bezier(.34,1.56,.64,1)}.expanded-top,.expanded-bottom{display:flex;justify-content:space-between;align-items:flex-start}.expanded-bottom{align-items:flex-end;margin-top:28px}.icon{font-size:30px;line-height:1}.icon svg{display:block}.pill{border:0;border-radius:20px;padding:8px 14px;background:#FFFFFF22;color:#FFF;font-weight:900;font-size:11px}.edit{background:#FFFFFF55}.expanded-title{font-size:19px;font-weight:900}.expanded-value{font-size:17px;font-weight:800;color:#FFFFFFAA;margin-top:3px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;transition:all .5s}.grid.active{grid-template-columns:repeat(3,minmax(0,1fr))}.small{height:132px;border:0;border-radius:24px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;color:#FFF;text-align:left;transition:all .6s cubic-bezier(.34,1.56,.64,1)}.grid.active .small{height:112px;padding:12px}.card-top{display:flex;justify-content:space-between;align-items:flex-start}.card-title{font-size:13px;font-weight:800}.card-value{font-size:15px;font-weight:900;color:#FFFFFFAA;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.grid.active .card-title{font-size:10px}.grid.active .card-value{font-size:11px}.more{width:26px;height:26px;border-radius:13px;background:#FFFFFF22;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900}.wallet{border:1px solid #ECECEC;border-radius:24px;background:#FFF;padding:10px;display:flex;align-items:center;gap:10px;min-height:78px;transition:all .6s cubic-bezier(.34,1.56,.64,1)}.wallet.open{display:block;min-height:0;padding:13px;color:#171318}.wallet-header{display:flex;align-items:center;justify-content:space-between}.wallet-main{display:flex;align-items:center;gap:10px}.wallet-icon{width:48px;height:48px;border:1.5px solid #ECECEC;border-radius:15px;background:linear-gradient(#F4F4F4,#E2E3EA80);display:flex;align-items:center;justify-content:center;color:#D1D0D7}.wallet-label{font-size:10px;color:#9C9BA2;font-weight:800;letter-spacing:1px}.wallet-balance{font-size:17px;font-weight:900;color:#010103;margin-top:2px}.withdraw{border:0;border-radius:20px;padding:10px 14px;background:#F64D86;color:#FEFEFE;font-size:11px;font-weight:900}.close{width:31px;height:31px;border:0;border-radius:16px;background:#F0EFF8;color:#ACABB7;font-size:22px;line-height:25px}.divider{height:1px;background:#ECECEC;margin:13px 0}.amount-label{font-size:12px;font-weight:900;color:#848488}.amount-row{display:flex;gap:7px;margin-top:8px}.amount{flex:1;min-height:39px;border:1px solid #ECECEC;border-radius:12px;background:#F6F5FA;font-size:11px;font-weight:800;color:#000}.amount.selected{border-color:#F64D86;background:#FEFEFE;box-shadow:0 0 0 1px #F64D86}.confirm{min-height:45px;border:0;border-radius:23px;background:#F64D86;color:#FFF;padding:0 17px;display:flex;align-items:center;justify-content:center;gap:7px;margin-top:13px;font-weight:900}.confirm:disabled{opacity:.6}.progress{height:45px;flex:1;border-radius:23px;background:#F64D8633;overflow:hidden}.progress-fill{height:100%;width:0;background:#F64D86;animation:progress 1.5s ease-in-out forwards}@keyframes progress{to{width:100%}}.section{font-size:17px;font-weight:900;margin-top:8px;margin-bottom:0}.transaction{min-height:64px;border-radius:19px;background:#FFF;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px}.transaction-icon{width:36px;height:36px;border-radius:12px;background:#171318;color:#FFF;display:flex;align-items:center;justify-content:center}.transaction-main{flex:1}.transaction-title{font-size:13px;font-weight:900}.muted{font-size:11px;color:#999;margin-top:4px}.status{font-size:11px;font-weight:900;text-transform:capitalize;text-align:right}.empty{padding:25px;border-radius:22px;background:#FFF;text-align:center}
</style></head><body><div class="stack" id="root"></div><script>
const data=${payload};
let activeId=null,isOpen=false,selectedAmount=data.presets[1]??data.presets[0]??0,done=false,processing=Boolean(data.withdrawing);
const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=(value)=>'GH₵ '+Number(value||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const icon=(name,size=30)=>{const paths={wallet:'<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H20v3H6.5A2.5 2.5 0 0 0 4 10.5v6A2.5 2.5 0 0 0 6.5 19H20a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5Z"/><path d="M17 14h.01"/>',receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>',chart:'<path d="M4 19V5M4 19h17"/><path d="m7 15 3-4 3 2 5-6"/>',arrow:'<path d="M5 19 19 5M8 5h11v11"/>',check:'<path d="m5 12 4 4L19 6"/>'};return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.wallet)+'</svg>'};
const native=(message)=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(message);
function selectCard(id){activeId=id;render()};function closeCard(){activeId=null;render()};function chooseAmount(value){selectedAmount=value;render()};function openWallet(){isOpen=true;selectedAmount=data.presets[1]??data.presets[0]??0;render()};function closeWallet(){isOpen=false;done=false;processing=false;render()};function requestWithdraw(){if(processing||done||selectedAmount<=0)return;processing=true;render();native('withdraw:'+selectedAmount)};
function carousel(){const active=data.cards.find((card)=>card.id===activeId);const cards=active?data.cards.filter((card)=>card.id!==activeId):data.cards;const expanded=active?'<div class="expanded" style="background:'+esc(active.color)+'"><div class="expanded-top"><span class="icon">'+icon(active.icon,30)+'</span><button class="pill" onclick="native(\\'copy:'+esc(active.id)+'\\')">Copy Address</button></div><div class="expanded-bottom"><div><div class="expanded-title">'+esc(active.title)+'</div><div class="expanded-value">'+esc(active.value)+'</div></div><button class="pill edit" onclick="closeCard()">Edit</button></div></div>':'';const grid=cards.map((card)=>'<button class="small" style="background:'+esc(card.color)+'" onclick="selectCard(\\''+esc(card.id)+'\\')"><span class="card-top"><span class="icon">'+icon(card.icon,active?20:28)+'</span><span class="more">•••</span></span><span><span class="card-title">'+esc(card.title)+'</span><br><span class="card-value">'+esc(card.value)+'</span></span></button>').join('');return '<div class="carousel">'+expanded+'<div class="grid '+(active?'active':'')+'">'+grid+'</div></div>'}
function wallet(){const presets=data.presets.map((value)=>'<button class="amount '+(selectedAmount===value?'selected':'')+'" onclick="chooseAmount('+value+')">'+money(value)+'</button>').join('');if(!isOpen)return '<div class="wallet"><div class="wallet-icon">'+icon('wallet',23)+'</div><div style="flex:1"><div class="wallet-label">Wallet</div><div class="wallet-balance">'+money(data.available)+'</div></div><button class="withdraw" onclick="openWallet()">Withdraw</button></div>';const action=done?'Done '+icon('check',16):processing?'<span class="progress"><span class="progress-fill"></span></span>':'↗ Withdraw '+money(selectedAmount);return '<div class="wallet open"><div class="wallet-header"><div class="wallet-main"><div class="wallet-icon">'+icon('wallet',23)+'</div><div><div class="wallet-label">Wallet</div><div class="wallet-balance">'+money(data.available)+'</div></div></div><button class="close" onclick="closeWallet()">×</button></div><div class="divider"></div><div class="amount-label">Amount</div><div class="amount-row">'+(presets||'<span class="muted">No available balance yet.</span>')+'</div><button class="confirm" '+((processing||done||selectedAmount<=0)?'disabled':'')+' onclick="requestWithdraw()">'+action+'</button></div>'}
function transactions(){if(!data.transactions.length)return '<div class="empty"><div class="muted">No order transactions have been recorded for this shop yet.</div></div>';return data.transactions.map((row)=>'<div class="transaction"><div class="transaction-icon">'+icon('receipt',18)+'</div><div class="transaction-main"><div class="transaction-title">'+money(row.amount)+'</div><div class="muted">'+esc(row.status||'pending')+' · '+new Date(row.created_at).toLocaleDateString()+'</div></div><div class="status">'+esc(String(row.fulfillment_status||'pending').split('_').join(' '))+'</div></div>').join('')}
function render(){document.getElementById('root').innerHTML=carousel()+wallet()+'<div class="section">Transactions</div>'+transactions()};
window.__withdrawDone=()=>{done=true;processing=false;render();setTimeout(()=>{isOpen=false;done=false;render()},1500)};window.__withdrawError=()=>{processing=false;render()};render();
</script></body></html>`;

const s = StyleSheet.create({
  wrap: { width: "100%" },
  webView: { width: "100%", backgroundColor: "transparent" },
});
