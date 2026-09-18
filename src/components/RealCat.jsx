import React from 'react';
export const CATS=[
  {id:'silver',name:'Miso',breed:'Silver longhair'},
  {id:'tuxedo',name:'Socks',breed:'Tuxedo'},
  {id:'siamese',name:'Chai',breed:'Siamese'},
  {id:'ginger',name:'Marmalade',breed:'Ginger tabby'}
];
export default function RealCat({catId='silver',happy=false,walking=false}) {
  const cat=CATS.find(c=>c.id===catId)||CATS[0];
  return <img className={'real-cat '+(happy?'is-happy ':'')+(walking?'is-moving':'')} src={'./cats/'+cat.id+'.png'} alt={cat.name+', your '+cat.breed.toLowerCase()+' companion'} draggable="false"/>;
}
export function CatPicker({value='silver',onChange,disabled=false}) {
  return <fieldset className="cat-picker" disabled={disabled}><legend>Choose your little supervisor</legend><div>{CATS.map(cat=><button key={cat.id} type="button" aria-pressed={cat.id===value} onClick={()=>onChange(cat.id)}><img src={'./cats/'+cat.id+'.png'} alt=""/><strong>{cat.name}</strong><small>{cat.breed}</small>{cat.id===value&&<span className="cat-chosen">Chosen ✓</span>}</button>)}</div></fieldset>;
}
