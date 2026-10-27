import {totals,validBackup} from './domain.js';
const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
const invoiceNumber=value=>String(value).replace(/^0+(?=\d)/,'');
const partyKey=p=>normalize(p.taxId||p.name);
const serviceKey=s=>JSON.stringify([normalize(s.name),s.price]);
export function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value??''))return false;const d=new Date(value+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===value;}
export function readImportProposal(value){
  if(value?.format!=='kiru-history-review-v1'||!['EUR','USD'].includes(value.catalogCurrency)||!Array.isArray(value.clients)||!Array.isArray(value.services)||!Array.isArray(value.invoices)||!Array.isArray(value.excluded)||value.invoices.length>500)throw Error('Archivo de importación no válido.');
  const ids=new Set(),rowIds=new Set();
  for(const row of value.invoices){
    if(!row||typeof row.source!=='string'||!Array.isArray(row.warnings)||!row.warnings.every(x=>typeof x==='string')||!Number.isFinite(row.expectedTotal)||row.expectedTotal<0||!validDate(row.invoice?.issued)||ids.has(invoiceNumber(row.invoice?.number))||rowIds.has(row.invoice?.id))throw Error('Revisión de facturas no válida.');
    ids.add(invoiceNumber(row.invoice.number));rowIds.add(row.invoice.id);
    const i={...row.invoice,due:row.invoice.due||row.invoice.issued,status:row.invoice.status||'pending'};
    const sample={version:1,company:{name:'Validación',currency:'EUR',tax:0},clients:value.clients,services:value.services,invoices:[i]};
    if(!validBackup(sample)||Math.abs(totals(i.lines,i.tax,i.discount).total-row.expectedTotal)>0.005)throw Error('Una factura no coincide con su total revisado.');
    if(row.invoice.due&&!validDate(row.invoice.due))throw Error('Vencimiento no válido.');
    if(row.invoice.status!=null&&!['paid','pending'].includes(row.invoice.status))throw Error('Estado no válido.');
  }
  if(!validBackup({version:1,company:{name:'Validación',currency:'EUR',tax:0},clients:value.clients,services:value.services,invoices:[]}))throw Error('Catálogo de importación no válido.');
  if(!value.excluded.every(x=>typeof x?.number==='string'&&typeof x?.reason==='string'))throw Error('Facturas pendientes no válidas.');
  return value;
}
// Construye una copia: no modifica la nube ni la selección hasta que el usuario confirme.
export function mergeHistoricalImport(current,proposal,choices){
  readImportProposal(proposal);
  if(!validBackup(current))throw Error('Datos actuales no válidos.');
  if(proposal.services.length&&current.company.currency!==proposal.catalogCurrency)throw Error(`El catálogo del archivo está en ${proposal.catalogCurrency}. Selecciona esa moneda en Mi negocio antes de importarlo; no se convierten precios.`);
  const result=structuredClone(current),counts={clients:0,services:0,invoices:0,skipped:0};
  const selected=new Map();
  for(const choice of choices){if(selected.has(choice.id)||!proposal.invoices.some(r=>r.invoice.id===choice.id))throw Error('Selección no válida.');selected.set(choice.id,choice);}
  for(const [kind,key] of [['clients',partyKey],['services',serviceKey]]){
    const known=new Set(result[kind].map(key)),ids=new Set(result[kind].map(x=>x.id));
    for(const item of proposal[kind]){if(known.has(key(item)))continue;if(ids.has(item.id))throw Error('Identificador de catálogo en conflicto.');result[kind].push(structuredClone(item));known.add(key(item));ids.add(item.id);counts[kind]++;}
  }
  for(const row of proposal.invoices){
    const choice=selected.get(row.invoice.id);if(!choice)continue;
    const existing=result.invoices.find(i=>invoiceNumber(i.number)===invoiceNumber(row.invoice.number));
    if(existing){
      if(partyKey(existing.client)!==partyKey(row.invoice.client)||existing.currency!==row.invoice.currency||Math.abs(totals(existing.lines,existing.tax,existing.discount).total-row.expectedTotal)>0.005)throw Error(`La factura ${row.invoice.number} ya existe con otros datos. No se sobrescribió.`);
      counts.skipped++;continue;
    }
    if(!['paid','pending'].includes(choice.status))throw Error(`Confirma el estado de pago de la factura ${row.invoice.number}.`);
    if(!validDate(choice.due)||choice.due<row.invoice.issued)throw Error(`Revisa el vencimiento de la factura ${row.invoice.number}.`);
    if(row.warnings.length&&!choice.reviewed)throw Error(`Confirma la revisión de la factura ${row.invoice.number}.`);
    if(result.invoices.some(i=>i.id===row.invoice.id))throw Error('Identificador de factura en conflicto.');
    result.invoices.push({...structuredClone(row.invoice),status:choice.status,due:choice.due});counts.invoices++;
  }
  if(!validBackup(result))throw Error('La importación produciría datos no válidos.');
  return {data:result,counts};
}
