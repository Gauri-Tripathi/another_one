import React from 'react';
export default function LivingCat({ walking=false, happy=false }) {
  return <svg className={'living-cat '+(walking?'walking ':'')+(happy?'delighted':'')} viewBox="0 0 400 260" role="img" aria-label="An animated orange cat with blinking eyes and a swishing tail" onPointerMove={event=>{const rect=event.currentTarget.getBoundingClientRect();event.currentTarget.style.setProperty('--look-x',((event.clientX-rect.left)/rect.width*4-2)+'px');}}>
    <ellipse className="cat-ground" cx="205" cy="230" rx="139" ry="12" fill="#332318" opacity=".12"/>
    <g className="cat-body-motion">
      <path className="alive-tail" d="M111 149 C52 157 26 123 39 82 C46 56 71 73 58 95" fill="none" stroke="#bd6833" strokeWidth="26" strokeLinecap="round"/>
      <g className="cat-leg back-leg"><path d="M137 162 L121 220 Q121 229 146 225" fill="none" stroke="#b96131" strokeWidth="22" strokeLinecap="round"/></g>
      <g className="cat-leg front-leg far-leg"><path d="M269 163 L275 221 Q278 230 300 224" fill="none" stroke="#b96131" strokeWidth="20" strokeLinecap="round"/></g>
      <ellipse cx="197" cy="145" rx="99" ry="61" fill="#e9a254"/>
      <ellipse cx="221" cy="168" rx="63" ry="32" fill="#f5c786"/>
      <path d="M148 96l10 29m24-36 4 27m25-25-2 23" stroke="#be6b34" strokeWidth="11" strokeLinecap="round"/>
      <g className="cat-leg near-leg"><path d="M147 168 L161 220 Q162 231 184 225" fill="none" stroke="#e9a254" strokeWidth="24" strokeLinecap="round"/></g>
      <g className="cat-leg front-leg near-front"><path d="M258 167 L248 221 Q249 232 274 225" fill="none" stroke="#e9a254" strokeWidth="24" strokeLinecap="round"/></g>
      <g className="alive-head"><path d="M254 75 251 20 293 50 320 44 356 20 350 84" fill="#e9a254" stroke="#bd6833" strokeWidth="3" strokeLinejoin="round"/>
        <path d="m261 37 3 30 19-14m42 0 20-16-4 32" fill="#e9968f"/>
        <ellipse cx="304" cy="92" rx="61" ry="53" fill="#edac61"/>
        <path d="m290 44 5 18m12-20-1 17m15-15-8 17" stroke="#bd6833" strokeWidth="7" strokeLinecap="round"/>
        <g className="alive-eyes"><ellipse cx="283" cy="88" rx="12" ry="14" fill="#fff7d5"/><ellipse cx="328" cy="88" rx="12" ry="14" fill="#fff7d5"/><g className="alive-pupils"><ellipse cx="286" cy="88" rx="5" ry="10" fill="#394932"/><ellipse cx="331" cy="88" rx="5" ry="10" fill="#394932"/></g></g>
        <ellipse cx="292" cy="113" rx="17" ry="14" fill="#ffe1b0"/><ellipse cx="319" cy="113" rx="17" ry="14" fill="#ffe1b0"/>
        <path d="m299 104 7 8 7-8z" fill="#ae6570"/><path d="M306 112v7m0 0q-7 8-14 0m14 0q7 8 14 0" stroke="#79523a" strokeWidth="2.7" fill="none" strokeLinecap="round"/>
        <path d="m273 108-28-6m29 15-31 5m93-14 29-7m-29 17 31 5" stroke="#79523a" strokeWidth="2.5" strokeLinecap="round"/>
      </g>
    </g>
  </svg>;
}
