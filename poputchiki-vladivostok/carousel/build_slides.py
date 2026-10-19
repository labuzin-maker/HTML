import base64
import os

BASE = os.path.dirname(os.path.abspath(__file__))

def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")

QR_SUBMIT = b64(os.path.join(BASE, "qr-submit.png"))
QR_LIST = b64(os.path.join(BASE, "qr-list.png"))

# Тот же токен-набор стилей, что в concierge-vl-start — для узнаваемости
# (одна и та же "рука", один и тот же турпоток аудитории).
CSS = """
:root{
  --bg: #FFF9F1;
  --card: #FFFFFF;
  --card-soft: #FFF2E2;
  --ink: #3A2E27;
  --ink-soft: #8C7B6C;
  --accent: #E8663F;
  --accent-dark: #C64F2C;
  --line: #F1E2CE;
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{
  width:1080px;height:1440px;
  background:var(--bg);
  color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue","Microsoft YaHei",sans-serif;
  -webkit-font-smoothing:antialiased;
  overflow:hidden;
}
.slide{
  width:1080px;height:1440px;
  padding:88px 76px 72px;
  display:flex;
  flex-direction:column;
  position:relative;
}
.eyebrow{
  display:inline-block;
  align-self:flex-start;
  padding:10px 26px;
  background:var(--card-soft);
  color:var(--accent-dark);
  border-radius:999px;
  font-size:26px;
  font-weight:600;
  letter-spacing:.02em;
}
h1{
  font-size:74px;
  line-height:1.35;
  margin:36px 0 16px;
  font-weight:700;
  text-wrap:balance;
}
h2{
  font-size:64px;
  line-height:1.3;
  margin:36px 0 28px;
  font-weight:700;
  text-wrap:balance;
}
.sub{
  color:var(--ink-soft);
  font-size:32px;
  margin:0 0 8px;
}
.body-text{
  font-size:38px;
  line-height:1.72;
  color:var(--ink);
  margin:0;
}
.art{
  width:100%;
  border-radius:36px;
  margin:44px 0;
  display:block;
}
.card{
  background:var(--card);
  border:2px solid var(--line);
  border-radius:36px;
  padding:44px 44px;
  margin-top:12px;
}
.steps{list-style:none;margin:0;padding:0;}
.steps li{
  display:flex;
  gap:26px;
  margin-bottom:34px;
  align-items:flex-start;
}
.steps li:last-child{margin-bottom:0;}
.steps .num{
  flex:0 0 auto;
  width:56px;height:56px;
  border-radius:50%;
  background:var(--accent);
  color:#fff;
  font-size:30px;
  font-weight:700;
  display:flex;align-items:center;justify-content:center;
}
.steps .txt{
  padding-top:8px;
  font-size:36px;
  line-height:1.55;
}
.spacer{flex:1;}
.brandline{
  display:flex;
  justify-content:space-between;
  align-items:center;
  font-size:26px;
  color:var(--ink-soft);
  border-top:2px solid var(--line);
  padding-top:28px;
  margin-top:auto;
}
.qr-row{
  display:flex;
  gap:32px;
  margin-top:20px;
}
.qr-card{
  flex:1;
  background:var(--card);
  border:2px solid var(--line);
  border-radius:36px;
  padding:36px 28px 32px;
  text-align:center;
}
.qr-card img{
  width:100%;
  max-width:340px;
  border-radius:16px;
  display:block;
  margin:0 auto 24px;
}
.qr-label{
  font-size:34px;
  font-weight:700;
  margin:0 0 6px;
}
.qr-sub{
  font-size:26px;
  color:var(--ink-soft);
  margin:0;
}
.hint{
  font-size:28px;
  line-height:1.6;
  color:var(--ink);
  background:var(--card-soft);
  border-radius:28px;
  padding:32px 36px;
  margin-top:20px;
}
.hint b{color:var(--accent-dark);}
.swipe-hint{
  color:var(--accent-dark);
  font-weight:700;
}
"""

CAR_SVG = """<svg class="art" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="220" rx="24" fill="#FFEFDA"/>
    <path d="M70 150 L95 110 Q105 98 125 98 L275 98 Q295 98 305 110 L330 150 Z" fill="#FFFFFF" stroke="#F1D9B8" stroke-width="3"/>
    <rect x="70" y="140" width="260" height="34" rx="14" fill="#E8663F"/>
    <rect x="130" y="104" width="60" height="38" rx="8" fill="#FDE3C4"/>
    <rect x="210" y="104" width="60" height="38" rx="8" fill="#FDE3C4"/>
    <circle cx="130" cy="176" r="20" fill="#3A2E27"/>
    <circle cx="130" cy="176" r="8" fill="#FFEFDA"/>
    <circle cx="270" cy="176" r="20" fill="#3A2E27"/>
    <circle cx="270" cy="176" r="8" fill="#FFEFDA"/>
    <circle cx="322" cy="88" r="26" fill="#F2955F"/>
    <text x="322" y="98" font-size="26" font-weight="700" fill="#FFFFFF" text-anchor="middle" font-family="Arial">¥</text>
</svg>"""

MATCH_SVG = """<svg class="art" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="180" rx="20" fill="#FFF3E4"/>
    <circle cx="120" cy="90" r="42" fill="#FFFFFF" stroke="#F1D9B8" stroke-width="3"/>
    <circle cx="120" cy="76" r="14" fill="#E8663F"/>
    <path d="M96 112 Q120 96 144 112" stroke="#E8663F" stroke-width="6" stroke-linecap="round" fill="none"/>
    <circle cx="280" cy="90" r="42" fill="#FFFFFF" stroke="#F1D9B8" stroke-width="3"/>
    <circle cx="280" cy="76" r="14" fill="#F2955F"/>
    <path d="M256 112 Q280 96 304 112" stroke="#F2955F" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M164 90 C190 60 210 60 236 90" stroke="#C64F2C" stroke-width="4" stroke-dasharray="10 10" fill="none"/>
    <circle cx="200" cy="66" r="18" fill="#E8663F"/>
    <path d="M192 66 L198 72 L210 58" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>"""

SPLIT_SVG = """<svg class="art" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="200" rx="20" fill="#FFEFDA"/>
    <path d="M110 140 L130 104 Q138 94 154 94 L246 94 Q262 94 270 104 L290 140 Z" fill="#FFFFFF" stroke="#F1D9B8" stroke-width="3"/>
    <rect x="110" y="132" width="180" height="26" rx="12" fill="#E8663F"/>
    <circle cx="150" cy="112" r="12" fill="#F4B27E"/>
    <circle cx="200" cy="108" r="12" fill="#F4B27E"/>
    <circle cx="250" cy="112" r="12" fill="#F4B27E"/>
    <circle cx="145" cy="164" r="16" fill="#3A2E27"/>
    <circle cx="255" cy="164" r="16" fill="#3A2E27"/>
    <g transform="translate(320,50)">
      <circle r="34" fill="#FFFFFF" stroke="#F1D9B8" stroke-width="3"/>
      <path d="M0 0 L0 -34 A34 34 0 0 1 29.4 17 Z" fill="#E8663F"/>
      <path d="M0 0 L29.4 17 A34 34 0 0 1 -29.4 17 Z" fill="#F2955F"/>
      <path d="M0 0 L-29.4 17 A34 34 0 0 1 0 -34 Z" fill="#F4B27E"/>
    </g>
    <text x="320" y="106" font-size="22" fill="#8C7B6C" text-anchor="middle" font-family="Arial">AA</text>
</svg>"""

def page(body, filename):
    html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><style>{CSS}</style></head>
<body><div class="slide">{body}</div></body></html>"""
    with open(os.path.join(BASE, filename), "w", encoding="utf-8") as f:
        f.write(html)

# Slide 1 — cover
page(f"""
  <span class="eyebrow">海参崴 · 出行小技巧</span>
  <h1>一个人打车去机场,有点贵</h1>
  <p class="sub">发现个能拼车分摄的东西,顺手分享一下</p>
  {CAR_SVG}
  <div class="spacer"></div>
  <div class="brandline"><span>宾至指南</span><span class="swipe-hint">往右滑 →</span></div>
""", "slide1.html")

# Slide 2 — what is it
page(f"""
  <span class="eyebrow">01 · 这是什么</span>
  <h2>填个表,系统帮你找同路人</h2>
  {MATCH_SVG}
  <p class="body-text">填一下出行日期、路线(比如机场→市中心)和人数,系统会自动去匹配同一天、同路线的其他人。凑够人数就能一起打车,车费大家分摄,谁都不用一个人扳全款。</p>
  <div class="spacer"></div>
  <div class="brandline"><span>宾至指南</span><span>2 / 6</span></div>
""", "slide2.html")

# Slide 3 — steps
page("""
  <span class="eyebrow">02 · 怎么用</span>
  <h2>具体怎么操作</h2>
  <div class="card">
    <ul class="steps">
      <li><span class="num">1</span><span class="txt">打开链接,填姓名、联系方式(微信或电话)、日期、路线、人数。</span></li>
      <li><span class="num">2</span><span class="txt">提交后系统自动查找同路线同日期的人——匹配上会有人联系你。</span></li>
      <li><span class="num">3</span><span class="txt">加上联系方式,和对方商量好价格和上车时间,一起打车就行。</span></li>
    </ul>
  </div>
  <div class="spacer"></div>
  <div class="brandline"><span>宾至指南</span><span>3 / 6</span></div>
""", "slide3.html")

# Slide 4 — why it's worth it
page(f"""
  <span class="eyebrow">03 · 为什么想分享</span>
  <h2>反正同一趣车,分摄一下而已</h2>
  {SPLIT_SVG}
  <p class="body-text">机场—市中心、市中心—俄罗斯岛这些路线,一个人打车不便宜。凑够两三个人分摄,人均能省下不少,而且时间上其实没差多少——反正都是去同一个地方。</p>
  <div class="spacer"></div>
  <div class="brandline"><span>宾至指南</span><span>4 / 6</span></div>
""", "slide4.html")

# Slide 5 — honest safety note
page("""
  <span class="eyebrow">04 · 提醒一句</span>
  <h2>这不是官方拼车公司</h2>
  <p class="body-text">就是个人做的小工具,帮大家互相找一下同路人——匹配上之后,价格、时间、怎么坐车都是你们自己商量,系统不参与、不收钱。</p>
  <div class="hint"><b>小提示:</b>和生人拼车,选人多的地方见面、提前说好价格,基本常识多留意一下就好,不用太紧张。</div>
  <div class="spacer"></div>
  <div class="brandline"><span>宾至指南</span><span>5 / 6</span></div>
""", "slide5.html")

# Slide 6 — final CTA with two QR codes
page(f"""
  <span class="eyebrow">05 · 想试试</span>
  <h2>两个码,按需扫</h2>
  <div class="qr-row">
    <div class="qr-card">
      <img src="data:image/png;base64,{QR_SUBMIT}">
      <p class="qr-label">提交拼车申请</p>
      <p class="qr-sub">填表等匹配</p>
    </div>
    <div class="qr-card">
      <img src="data:image/png;base64,{QR_LIST}">
      <p class="qr-label">先看看有没有人</p>
      <p class="qr-sub">已有申请列表</p>
    </div>
  </div>
  <p class="hint"><b>小提示:</b>如果是在小红书app内打开的,有些内容偶尔会加载不出来——点右上角"···",选"在浏览器中打开"就行。</p>
  <div class="spacer"></div>
  <div class="brandline"><span>内容整理自个人真实体验,仅供参考</span><span>6 / 6</span></div>
""", "slide6.html")

print("done")
