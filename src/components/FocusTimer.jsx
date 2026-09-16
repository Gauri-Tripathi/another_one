import React, { useEffect, useState } from "react";

export default function FocusTimer() {
  const [end, setEnd] = useState(() => Number(localStorage.getItem("purrductive-focus-end")) || 0);
  const [minutes, setMinutes] = useState(25);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!end || end <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [end]);
  const remaining = Math.max(0, Math.ceil((end - now) / 1000));
  const change = value => {
    localStorage.setItem("purrductive-focus-end", String(value));
    setNow(Date.now()); setEnd(value);
  };
  return <section className="focus-session">
    <div><p className="eyebrow">ONE THING AT A TIME</p><h2>{end ? remaining ? "Focus session" : "Session complete. Nice work." : "Make room for focused work."}</h2><p>A wall-clock timer. Your activity still gets classified honestly.</p></div>
    <div className="focus-controls">{end ? <><strong role="timer">{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</strong><button onClick={() => change(0)}>{remaining ? "End session" : "Done"}</button></> : <><select aria-label="Focus session duration" value={minutes} onChange={e => setMinutes(Number(e.target.value))}><option value="25">25 minutes</option><option value="50">50 minutes</option><option value="90">90 minutes</option></select><button onClick={() => change(Date.now() + minutes * 60000)}>Start focus</button></>}</div>
  </section>;
}
