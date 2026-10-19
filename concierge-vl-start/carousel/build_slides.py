import base64
import os

BASE = os.path.dirname(os.path.abspath(__file__))

def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")

QR_START = b64(os.path.join(BASE, "qr-start.png"))
QR_MAP = b64(os.path.join(BASE, "qr-map.png"))

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
  font-size:76px;
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
.brandline b{color:var(--accent-dark);}
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
  font-size:24px;
  color:var(--ink-soft);
  background:var(--card-soft);
  border-radius:24px;
  padding:24px 28px;
  margin-top:28px;
}
.hint b{color:var(--ink);}
.swipe-hint{
  color:var(--accent-dark);
  font-weight:700;
}
"""

BOWL_SVG = """<svg class="art" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="220" rx="24" fill="#FFEFDA"/>
    <path d="M60 150 Q60 130 90 128 L310 128 Q340 130 340 150 Q340 175 300 180 L100 180 Q60 175 60 150Z" fill="#FFFFFF" stroke="#F1D9B8" stroke-width="2"/>
    <ellipse cx="200" cy="150" rx="140" ry="14" fill="#FDE3C4"/>
    <circle cx="160" cy="145" r="14" fill="#E8663F"/>
    <circle cx="200" cy="140" r="16" fill="#F2955F"/>
    <circle cx="240" cy="147" r="13" fill="#E8663F"/>
    <circle cx="180" cy="152" r="10" fill="#F4B27E"/>
    <circle cx="222" cy="153" r="10" fill="#F4B27E"/>
    <path d="M150 120 C148 100 160 92 158 76" stroke="#E3C9A6" stroke-width="4" stroke-linecap="round"/>
    <path d="M200 116 C198 96 210 88 208 72" stroke="#E3C9A6" stroke-width="4" stroke-linecap="round"/>
    <path d="M250 120 C248 100 260 92 258 76" stroke="#E3C9A6" stroke-width="4" stroke-linecap="round"/>
</svg>"""

PHONE_SVG = """<svg class="art" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="180" rx="20" fill="#FFF3E4"/>
    <rect x="150" y="35" width="60" height="110" rx="12" fill="#FFFFFF" stroke="#F1D9B8" stroke-width="2"/>
    <rect x="162" y="52" width="36" height="36" rx="4" fill="#3A2E27"/>
    <rect x="168" y="58" width="8" height="8" fill="#FFF3E4"/>
    <rect x="184" y="58" width="8" height="8" fill="#FFF3E4"/>
    <rect x="168" y="74" width="8" height="8" fill="#FFF3E4"/>
    <rect x="180" y="70" width="4" height="4" fill="#FFF3E4"/>
    <path d="M245 60 C260 50 270 65 262 75 C280 72 282 92 265 95" stroke="#E8663F" stroke-width="4" stroke-linecap="round" fill="none"/>
    <circle cx="282" cy="55" r="4" fill="#F2955F"/>
    <circle cx="296" cy="68" r="3" fill="#F2955F"/>
</svg>"""

MAP_SVG = """<svg class="art" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="180" rx="20" fill="#FFEFDA"/>
    <path d="M70 40 L160 60 L240 35 L330 55 L330 140 L240 120 L160 145 L70 125 Z" fill="#FFFFFF" stroke="#F1D9B8" stroke-width="2"/>
    <line x1="160" y1="60" x2="160" y2="145" stroke="#F1D9B8" stroke-width="2"/>
    <line x1="240" y1="35" x2="240" y2="120" stroke="#F1D9B8" stroke-width="2"/>
    <circle cx="200" cy="90" r="10" fill="#E8663F"/>
    <path d="M200 78 C210 78 216 86 216 94 C216 104 200 118 200 118 C200 118 184 104 184 94 C184 86 190 78 200 78Z" fill="#E8663F"/>
    <circle cx="200" cy="93" r="6" fill="#FFF3E4"/>
    <circle cx="120" cy="90" r="4" fill="#D9C4A3"/>
    <circle cx="290" cy="80" r="4" fill="#D9C4A3"/>
    <circle cx="270" cy="105" r="4" fill="#D9C4A3"/>
</svg>"""

def page(body, filename):
    html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><style>{CSS}</style></head>
<body><div class="slide">{body}</div></body></html>"""
    with open(os.path.join(BASE, filename), "w", encoding="utf-8") as f:
        f.write(html)

# Slide 1 — cover
page(f"""
  <span class="eyebrow">海参崴 · 吃饭攻略</span>
  <h1>在海参崴,菜单终于不用靠连蒙带猜了</h1>
  <p class="sub">一次真实体验分享,不是广告</p>
  {BOWL_SVG}
  <div class="spacer"></div>
  <div class="brandline"><span>宾至指南</span><span class="swipe-hint">往右滑 →</span></div>
""", "slide1.html")

# Slide 2 — what is the QR code
page(f"""
  <span class="eyebrow">01 · 二维码是什么</span>
  <h2>桌上那个二维码,是干嘛的</h2>
  {PHONE_SVG}
  <p class="body-text">找到桌上贴的二维码,扫一下,菜单直接变中文。里面还带了个AI助手,可以直接打字问它"辣不辣""有没有海鲜过敏的选项"——不用再抓着服务员连说带比划。</p>
  <div class="spacer"></div>
  <div class="brandline"><span>宾至指南</span><span>2 / 6</span></div>
""", "slide2.html")

# Slide 3 — how to find on the map
page(f"""
  <span class="eyebrow">02 · 怎么找</span>
  <h2>怎么找到这些店</h2>
  {MAP_SVG}
  <p class="body-text">海参崴有一份城市地图,标了餐厅、免税店和景点。支持中文菜单的店会用专门颜色单独标出来,一眼就能看出该往哪儿走。</p>
  <div class="spacer"></div>
  <div class="brandline"><span>宾至指南</span><span>3 / 6</span></div>
""", "slide3.html")

# Slide 4 — steps
page("""
  <span class="eyebrow">03 · 怎么用</span>
  <h2>具体怎么操作</h2>
  <div class="card">
    <ul class="steps">
      <li><span class="num">1</span><span class="txt">打开地图,看看附近哪里标了颜色——那就是支持中文菜单的店。</span></li>
      <li><span class="num">2</span><span class="txt">到店里坐下,找桌上的二维码贴纸,扫一下。</span></li>
      <li><span class="num">3</span><span class="txt">菜单是中文的,看不懂的地方直接问AI,点完让服务员确认一下就行。</span></li>
    </ul>
  </div>
  <div class="spacer"></div>
  <div class="brandline"><span>宾至指南</span><span>4 / 6</span></div>
""", "slide4.html")

# Slide 5 — context
page("""
  <span class="eyebrow">04 · 为什么会有这个</span>
  <h2>为什么会有这个</h2>
  <p class="body-text">这两年去海参崴的中国游客确实多了不少,当地也在慢慢做一些配套——这份中文菜单加地图,就是其中一件小事,没什么官方大项目的意思。用不用都行,反正免费,顺手扫一下也不亏。</p>
  <div class="spacer"></div>
  <div class="brandline"><span>宾至指南</span><span>5 / 6</span></div>
""", "slide5.html")

# Slide 6 — final CTA with two QR codes
page(f"""
  <span class="eyebrow">05 · 出发前</span>
  <h2>两个码,存好再出发</h2>
  <div class="qr-row">
    <div class="qr-card">
      <img src="data:image/png;base64,{QR_START}">
      <p class="qr-label">网页版攻略</p>
      <p class="qr-sub">完整版本文</p>
    </div>
    <div class="qr-card">
      <img src="data:image/png;base64,{QR_MAP}">
      <p class="qr-label">宾至指南地图</p>
      <p class="qr-sub">直接看地图 →</p>
    </div>
  </div>
  <p class="hint"><b>小提示:</b>如果是在小红书app内打开的,有些内容偶尔会加载不出来——点右上角"···",选"在浏览器中打开"就行。</p>
  <div class="spacer"></div>
  <div class="brandline"><span>内容整理自个人真实体验,仅供参考</span><span>6 / 6</span></div>
""", "slide6.html")

print("done")
