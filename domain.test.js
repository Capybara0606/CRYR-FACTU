import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totals,nextNumber,validBackup} from './domain.js';
test('factura de referencia: 48 × 3 EUR más 10%',()=>assert.deepEqual(totals([{qty:48,price:3}],10,0),{subtotal:144,discount:0,taxes:14.4,total:158.4}));
test('descuento antes de impuestos y redondeo monetario',()=>assert.deepEqual(totals([{qty:3,price:19.99}],13,10),{subtotal:59.97,discount:10,taxes:6.5,total:56.47}));
test('descuento limitado al subtotal',()=>assert.equal(totals([{qty:1,price:5}],10,20).total,0));
test('numeración toma el máximo existente',()=>assert.equal(nextNumber([{number:'0002'},{number:'0028'}]),'0029'));
test('rechaza respaldos incompletos y líneas inválidas',()=>{assert.equal(validBackup({}),false);assert.equal(validBackup({version:1,company:{name:'Kiru'},clients:[],services:[],invoices:[{id:'1',number:'1',company:{},client:{},lines:[{name:'x',qty:-1,price:1}],tax:10,discount:0,currency:'EUR',status:'pending'}]}),false);});
test('respaldo completo válido y rechazo de identificadores manipulados',()=>{const data={version:1,company:{name:'Kiru',currency:'EUR',tax:10},clients:[{id:'client-1',name:'Cliente'}],services:[],invoices:[{id:'invoice-1',number:'0001',company:{name:'Kiru'},client:{name:'Cliente'},issued:'2026-10-27',due:'2026-10-27',lines:[{name:'Edición',qty:48,price:3}],tax:10,discount:0,currency:'EUR',status:'paid'}]};assert.equal(validBackup(data),true);data.clients[0].id='" onclick="alert(1)';assert.equal(validBackup(data),false);});

import {longVideoQuote} from './domain.js';
test('VL usa las tarifas por tramo, incluyendo límites y duración decimal',()=>{
  for(const [minutes,price,from,to] of [[10,50,10,12],[11.99,50,10,12],[12,55,12,15],[14.99,55,12,15],[15,60,15,20],[19.99,60,15,20],[20,65,20,25],[23,65,20,25],[25,70,25,30],[30,75,30,35],[34.5,75,30,35],[35,80,35,40],[60,105,60,65]])assert.deepEqual(longVideoQuote(minutes),{from,to,price});
});
test('VL rechaza duraciones vacías, menores de 10 y no finitas',()=>{for(const value of [0,9.99,-5,NaN,Infinity,'15',null,undefined])assert.throws(()=>longVideoQuote(value),RangeError);});
test('varios VL del mismo tramo aplican cantidad, impuesto y descuento habituales',()=>assert.deepEqual(totals([{qty:3,price:longVideoQuote(23).price}],10,5),{subtotal:195,discount:5,taxes:19,total:209}));
