const $ = s => document.querySelector(s);
const grid = $("#hotelGrid");
const modal = $("#modal");
let hotels = [];

function todayPlus(n){const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
$("#checkin").value=todayPlus(1); $("#checkout").value=todayPlus(2);

async function loadHotels(){
  const q=$("#q").value.trim();
  const r=await fetch("/api/hotels?"+new URLSearchParams({q}));
  hotels=await r.json();
  $("#resultCount").textContent=hotels.length+" stays";
  grid.innerHTML=hotels.map(h=>`
    <article class="card">
      <img src="${h.image}" alt="${h.name}" loading="lazy">
      <div class="card-body">
        <div class="rating">★ ${h.rating.toFixed(1)}</div>
        <h3>${h.name}</h3><div class="area">${h.area}, ${h.city}</div>
        <div class="price">PKR ${h.price.toLocaleString()} <span class="per">/ night</span></div>
        <button class="primary" onclick="openBooking(${h.id})">View & Book</button>
      </div>
    </article>`).join("");
}
$("#searchForm").addEventListener("submit",e=>{e.preventDefault();loadHotels()});

async function openBooking(id){
  const h=hotels.find(x=>x.id===id) || await (await fetch("/api/hotels/"+id)).json();
  $("#modalContent").innerHTML=`
    <p class="eyebrow">BOOK YOUR STAY</p><h2>${h.name}</h2>
    <p class="area">${h.area}, ${h.city} · ★ ${h.rating}</p>
    <p>${h.description}</p>
    <form id="bookForm">
      <label>Your name<input name="guest_name" required></label>
      <label>Phone number<input name="phone" required placeholder="03xx-xxxxxxx"></label>
      <label>Email (optional)<input name="email" type="email"></label>
      <label>Check-in<input name="check_in" type="date" value="${$("#checkin").value}" required></label>
      <label>Check-out<input name="check_out" type="date" value="${$("#checkout").value}" required></label>
      <label>Guests<input name="guests" type="number" min="1" value="${$("#guests").value}" required></label>
      <button class="primary" style="width:100%;margin-top:6px">Request Booking · PKR ${h.price.toLocaleString()}/night</button>
    </form>`;
  modal.classList.remove("hidden");
  $("#bookForm").onsubmit=async e=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(e.target));
    data.hotel_id=h.id;
    const r=await fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
    const out=await r.json();
    if(!r.ok) return alert(out.error||"Booking failed");
    $("#modalContent").innerHTML=`<div class="notice"><h2>Booking request received</h2><p>Your request for <b>${h.name}</b> has been saved.</p><p>Booking ID: <b>BS-${out.booking_id}</b></p><p>Our team can contact you at <b>${data.phone}</b> to confirm availability and payment.</p></div>`;
  };
}
function closeModal(){modal.classList.add("hidden")}
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});
$("#myBooking").onclick=()=>alert("For the MVP, save your Booking ID after submitting a booking. A customer login/booking-history module will be added next.");
loadHotels();
