import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { SellerEvent } from "../lib/social";

type Props = { event: SellerEvent; onBuy: () => void };

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const ticketHtml = (event: SellerEvent) => {
  const paid = Number(event.ticket_price || 0) > 0;
  const price = paid
    ? `GH₵ ${Number(event.ticket_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Free";
  const remaining = Math.max(0, Number(event.ticket_quantity || 0) - Number(event.tickets_sold || 0));
  const location = event.event_mode === "physical" ? event.location || "Physical location" : "Online in the app";
  const date = new Date(event.starts_at).toLocaleString();
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>
*{box-sizing:border-box}html,body{margin:0;background:transparent}body{display:flex;justify-content:center;padding:14px 0 22px;font-family:Inter,sans-serif;font-size:1rem}
.card{--width:180px;--height:320px;--perforation-size:12px;--cutouts-adjust:70px;position:relative;display:grid;grid-template-rows:auto 1fr auto;gap:1rem;grid-template-areas:"header" "body" "footer";width:var(--width);height:var(--height);padding:var(--perforation-size) 0;font-size:1rem;user-select:none;overflow:hidden;filter:drop-shadow(0 2px 1px #00000025) drop-shadow(0 4px 3px #00000025) drop-shadow(0 10px 9px #00000025) drop-shadow(0 20px 20px #00000025) drop-shadow(0 40px 40px #00000025);animation:hover 3s ease infinite;will-change:transform,filter}
@keyframes hover{50%{filter:drop-shadow(0 4px 3px #00000015) drop-shadow(0 6px 6px #00000015) drop-shadow(0 16px 14px #00000015) drop-shadow(0 30px 28px #00000015) drop-shadow(0 60px 60px #00000015);transform:translateY(-7px) scale(1.02)}}
.filter{position:absolute}.bg{position:absolute;inset:0;border-radius:inherit;background-color:#fff;filter:url(#bump);mask:radial-gradient(circle at 50% 0,#fff0 calc(var(--perforation-size) - 5px),#000 calc(var(--perforation-size) - 4px)),radial-gradient(circle at 50% 100%,#fff0 calc(var(--perforation-size) - 5px),#000 calc(var(--perforation-size) - 4px)),radial-gradient(circle 8px at left center,#000 98%,#0000 100%),radial-gradient(circle 8px at right center,#000 98%,#0000 100%),repeating-linear-gradient(90deg,#000 10px,#000 15px,#0000 16px,#0000 24px);mask-repeat:repeat-x,repeat-x,no-repeat,no-repeat,repeat-x;mask-size:calc(var(--perforation-size) * 2) 100%,calc(var(--perforation-size) * 2) 100%,16px 16px,16px 16px,10px 2px;mask-position:calc(.5 * var(--perforation-size)) top,calc(.5 * var(--perforation-size)) bottom,left var(--cutouts-adjust),right var(--cutouts-adjust),0 calc(var(--cutouts-adjust) + 7px);mask-composite:intersect,exclude,add,add}
.holographic{background-image:linear-gradient(to bottom,#fe58,90%,#0002),conic-gradient(at 60% 50%,#ccc,#ff6bfe,#00f9f8,#ddd,#0081fd,#eef0bc,#0081fd,#ff6bfe,#0002,#0081fd,#ddd,#01fefb,#ccc)}
.holographic:before{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at 70% 20%,#f0f,#0000),repeating-radial-gradient(circle at 30% 80%,#fff,#f4a 48px,#eee 150px);mix-blend-mode:color-burn}.holographic:after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(to bottom,#f205,#f00,#0f0,#f205);mix-blend-mode:difference;animation:bg-pos 3s ease-in-out infinite alternate;background-position:0 0;background-size:100% 300%;background-repeat:repeat}@keyframes bg-pos{to{background-position:0 500px}}
.header{position:relative;grid-area:header;margin:0 8px;text-align:center;z-index:1;font-family:Impact,sans-serif;font-size:2.75rem;letter-spacing:2px;color:#ffffff9f;text-shadow:0 0 0 #000;-webkit-text-stroke:#fff .5px;mix-blend-mode:difference}.body{grid-area:body;margin:0 1em;padding:.5em;font-weight:200;z-index:1}.footer{grid-area:footer;z-index:1;margin:0 1em 1em}.number{margin-bottom:.75rem;text-align:center;border-radius:999px 0;color:#000;font-weight:200}.number .bold{font-weight:600}.barcode{justify-self:center;width:0;height:32px;box-shadow:0 0 0 1px #000,5px 0 0 1px #000,7px 0 0 1px #000,11px 0 0 1px #000,15px 0 0 1px #000,16px 0 0 1px #000,22px 0 0 1px #000,27px 0 0 1px #000,30px 0 0 1px #000,35px 0 0 1px #000,36px 0 0 1px #000,39px 0 0 1px #000,43px 0 0 1px #000,47px 0 0 1px #000,50px 0 0 1px #000,55px 0 0 1px #000,59px 0 0 1px #000,60px 0 0 1px #000,64px 0 0 1px #000,69px 0 0 1px #000,70px 0 0 1px #000,74px 0 0 1px #000;transform:translateX(37px)}.event-copy{position:relative;z-index:2;color:#000}.event-name{font-size:1.05rem;font-weight:700;line-height:1.1}.event-description{font-size:.68rem;line-height:1.35;margin-top:.55rem}.event-meta{font-size:.62rem;line-height:1.45;margin-top:.8rem}.ticket-button{display:block;margin:13px auto 0;border:0;border-radius:18px;background:#F64D86;color:#fff;font-weight:800;font-size:.7rem;padding:8px 14px;cursor:pointer}
</style></head><body><div class="card"><svg class="filter" aria-hidden="true"><filter id="bump"><feGaussianBlur stdDeviation="10" result="blur"/><feColorMatrix result="goo" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7" mode="matrix"/></filter></svg><div class="bg holographic"></div><div class="header">GIRLIES</div><div class="body event-copy"><div class="event-name">${escapeHtml(event.name)}</div><div class="event-description">${escapeHtml(event.description || "Join this event from Girlies.")}</div><div class="event-meta">${escapeHtml(location)}<br>${escapeHtml(date)}</div></div><div class="footer"><div class="number"><span class="bold">${escapeHtml(price)}</span> · ${remaining} left</div><div class="barcode"></div><button class="ticket-button" onclick="window.ReactNativeWebView.postMessage('buy')">${paid ? "Buy a ticket" : "Get a ticket"}</button></div></div></body></html>`;
};

export default function EventTicketCard({ event, onBuy }: Props) {
  return (
    <View style={s.shell}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: ticketHtml(event) }}
        onMessage={(message) => {
          if (message.nativeEvent.data === "buy") onBuy();
        }}
        javaScriptEnabled
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        style={s.webView}
      />
    </View>
  );
}

const s = StyleSheet.create({
  shell: { alignItems: "center", paddingVertical: 14, paddingBottom: 22 },
  webView: { width: 220, height: 356, backgroundColor: "transparent" },
});