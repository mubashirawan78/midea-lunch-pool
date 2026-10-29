export function cents(value) {
 const s=String(value??''); if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error('Enter a nonnegative amount with at most two decimals.');
 const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n)||n>10000000)throw Error('Amount is too large.');return n;
}
export function allocate(total,weights){
 const sum=weights.reduce((a,b)=>a+b,0);if(!sum)return weights.map(()=>0);
 const exact=weights.map(w=>total*w/sum),out=exact.map(Math.floor),order=exact.map((n,i)=>({i,r:n-out[i]})).sort((a,b)=>b.r-a.r||a.i-b.i);
 for(let n=total-out.reduce((a,b)=>a+b,0),i=0;i<n;i++)out[order[i].i]++;return out;
}
export function split(p){
 const members=p.members;if(!members.length)throw Error('At least one participant must join.');const food=members.map(()=>0);
 for(const item of p.items){
 if(!item.name.trim()||!item.people.length||item.people.some(id=>!members.some(m=>m.id===id))||new Set(item.people).size!==item.people.length)throw Error('Assign every food item to valid participants.');
 const parts=allocate(cents(item.amount),item.people.map(()=>1));item.people.forEach((id,i)=>food[members.findIndex(m=>m.id===id)]+=parts[i]);}
 const subtotal=food.reduce((a,b)=>a+b,0),fee=cents(p.fee),discount=cents(p.discount),total=cents(p.total);
 if(discount>subtotal)throw Error('Discount cannot exceed the food subtotal.');
 if(subtotal+fee-discount!==total)throw Error('Food + delivery − discount must match the final bill.');
 const fees=allocate(fee,members.map(()=>1)),discounts=allocate(discount,food),equal=allocate(total,members.map(()=>1));
 return members.map((m,i)=>({...m,food:food[i],fee:fees[i],discount:discounts[i],due:p.mode==='equal'?equal[i]:food[i]+fees[i]-discounts[i]}));
}
export function change(p,action,input,user,now=Date.now()){
 const next=structuredClone(p),owner=p.owner===user.id;
 if(['save','lock','finalize','confirm','cancel'].includes(action)&&!owner)throw Error('Only the organizer can do that.');
 const idx=next.members.findIndex(m=>m.id===user.id);
 if(action==='join'){
 if(p.status!=='open'||now>=Date.parse(p.deadline))throw Error('Joining has closed.');if(idx>=0)return next;
 if(p.members.length>=10)throw Error('This pool is full (10 participants).');next.members.push({id:user.id,name:user.name.slice(0,80),payment:'unpaid'});
 }else if(action==='leave'){
 if(p.status!=='open'||now>=Date.parse(p.deadline))throw Error('The pool is locked. Contact the organizer.');
 next.members=next.members.filter(m=>m.id!==user.id);next.items=next.items.map(i=>({...i,people:i.people.filter(id=>id!==user.id)}));
 }else if(action==='save'){
 if(!['open','locked'].includes(p.status))throw Error('The published bill is locked.');
 if(!Array.isArray(input.items)||input.items.length>100)throw Error('Invalid food list.');
 next.items=input.items.map(i=>({name:String(i.name).slice(0,120),amount:String(i.amount),people:Array.isArray(i.people)?[...new Set(i.people.map(String))]:[]}));
 next.fee=String(input.fee);next.discount=String(input.discount);next.total=String(input.total);
 [next.fee,next.discount,next.total,...next.items.map(i=>i.amount)].forEach(cents);
 next.mode=input.mode==='equal'?'equal':'items';next.instructions=String(input.instructions||'').slice(0,1000);
 }else if(action==='lock'){
 if(p.status!=='open')throw Error('Pool is already closed.');next.status='locked';
 }else if(action==='finalize'){
 if(!['open','locked'].includes(p.status))throw Error('Bill already finalized.');
 next.shares=split(next);next.status='finalized';next.members=next.members.map(m=>({...m,payment:m.id===p.owner||next.shares.find(s=>s.id===m.id).due===0?'confirmed':'unpaid'}));
 }else if(action==='paid'){
 if(p.status!=='finalized'||idx<0)throw Error('You cannot report payment for this pool.');if(next.members[idx].payment!=='confirmed')next.members[idx].payment='reported';
 }else if(action==='confirm'){
 if(p.status!=='finalized')throw Error('Finalize the bill first.');const m=next.members.find(m=>m.id===input.memberId);if(!m)throw Error('Participant not found.');m.payment='confirmed';
 }else if(action==='cancel'){
 if(!['open','locked'].includes(p.status))throw Error('A finalized bill cannot be cancelled.');next.status='cancelled';
 }else throw Error('Unknown action.');
 if(next.status==='finalized'&&next.members.every(m=>m.payment==='confirmed'))next.status='settled';return next;
}
