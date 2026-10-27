export function totals(lines,tax=0,discount=0){const subtotal=Math.round(lines.reduce((sum,l)=>sum+Number(l.qty)*Number(l.price),0)*100)/100;const reduction=Math.min(subtotal,Math.max(0,Number(discount)));const base=subtotal-reduction;const taxes=Math.round(base*Number(tax))/100;return {subtotal,discount:reduction,taxes,total:Math.round((base+taxes)*100)/100};}
export function nextNumber(invoices){return String(invoices.reduce((n,i)=>Math.max(n,Number(i.number)||0),0)+1).padStart(4,'0');}
const safeId=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
const person=p=>p&&typeof p.name==='string'&&['email','phone','address','taxId'].every(k=>p[k]===undefined||typeof p[k]==='string');
const finite=v=>Number.isFinite(v)&&v>=0;
export function validBackup(data){return Boolean(data?.version===1&&person(data.company)&&['EUR','USD'].includes(data.company.currency)&&finite(data.company.tax)&&data.company.tax<=100&&['clients','services','invoices'].every(k=>Array.isArray(data[k]))&&data.clients.every(c=>safeId(c.id)&&person(c))&&data.services.every(s=>safeId(s.id)&&typeof s.name==='string'&&finite(s.price)&&(s.description===undefined||typeof s.description==='string'))&&data.invoices.every(i=>(i.paymentUrl===undefined||typeof i.paymentUrl==='string')&&safeId(i.id)&&typeof i.number==='string'&&/^\d+$/.test(i.number)&&person(i.company)&&person(i.client)&&/^\d{4}-\d{2}-\d{2}$/.test(i.issued)&&/^\d{4}-\d{2}-\d{2}$/.test(i.due)&&Array.isArray(i.lines)&&i.lines.length>0&&i.lines.every(l=>typeof l.name==='string'&&Number.isFinite(l.qty)&&l.qty>0&&finite(l.price)&&(l.description===undefined||typeof l.description==='string'))&&finite(i.tax)&&i.tax<=100&&finite(i.discount)&&['EUR','USD'].includes(i.currency)&&['pending','paid'].includes(i.status))&&['clients','services','invoices'].every(k=>new Set(data[k].map(x=>x.id)).size===data[k].length));}

// En el límite compartido se aplica el tramo que comienza en ese minuto (15 → 60 €).
export function longVideoQuote(minutes){
  if(typeof minutes!=='number'||!Number.isFinite(minutes)||minutes<10)throw new RangeError('Indica una duración de al menos 10 minutos.');
  if(minutes<12)return {from:10,to:12,price:50};
  if(minutes<15)return {from:12,to:15,price:55};
  const step=Math.floor((minutes-15)/5);
  return {from:15+step*5,to:20+step*5,price:60+step*5};
}
