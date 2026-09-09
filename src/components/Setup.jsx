import React, { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

export default function Setup({ onComplete }) {
  const [name, setName] = useState("");
  return <main className="setup-shell">
    <div className="setup-brand">purrductive<span>●</span></div>
    <section className="setup-card">
      <div className="setup-number">01</div>
      <p className="eyebrow">PRIVATE BY DEFAULT</p>
      <h1>Let’s make your time<br/><em>visible.</em></h1>
      <p className="setup-lede">Purrductive watches active apps—not keystrokes or page contents—and keeps your timeline on this computer unless you turn on sync.</p>
      <label>Your name <span>optional</span></label>
      <input autoFocus placeholder="What should the cat call you?" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && onComplete(name)} />
      <button className="primary-button" onClick={() => onComplete(name)}>Start tracking <ArrowRight size={18}/></button>
      <div className="privacy-note"><LockKeyhole size={16}/><span>No screenshots. No keylogging. Just app names, window titles, and active time.</span></div>
    </section>
    <div className="setup-art"><img src="./cat-coach.png" alt="Your orange cat coach"/><span className="speech">I’ll handle the<br/>gentle intimidation.</span></div>
  </main>;
}
