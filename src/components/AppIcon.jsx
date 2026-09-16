import React from 'react';
import { MessageCircle, Music2, Globe2, Code2, Folder, Scissors, Monitor, TvMinimalPlay as Youtube, Camera as Instagram, Terminal, FileText } from 'lucide-react';
import { appKey } from '../lib/usage.mjs';
export default function AppIcon({ name, website = false, icons = {} }) {
  const key = appKey(name);
  const native = icons[key] || icons[String(name).toLowerCase()];
  let Icon = Monitor, tone = 'lavender';
  if (/whatsapp|slack|teams|discord/.test(key)) { Icon = MessageCircle; tone = 'mint'; }
  else if (/spotify|music/.test(key)) { Icon = Music2; tone = 'mint'; }
  else if (/youtube/.test(key)) { Icon = Youtube; tone = 'peach'; }
  else if (/instagram/.test(key)) { Icon = Instagram; tone = 'rose'; }
  else if (/code|studio/.test(key)) { Icon = Code2; tone = 'blue'; }
  else if (/explorer/.test(key)) { Icon = Folder; tone = 'yellow'; }
  else if (/snipping/.test(key)) { Icon = Scissors; tone = 'peach'; }
  else if (/terminal|powershell/.test(key)) { Icon = Terminal; }
  else if (/word|notepad|notion/.test(key)) { Icon = FileText; }
  else if (website || /edge|chrome|firefox|brave|opera|vivaldi/.test(key)) { Icon = Globe2; tone = 'blue'; }
  return <span className={'app-symbol ' + tone}>{native && !website ? <img src={native} alt=""/> : <Icon size={22}/>}</span>;
}
