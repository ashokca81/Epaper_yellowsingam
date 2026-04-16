const dateStr = "2026-04-09T19:38:00.000Z";
const date = new Date(dateStr);

console.log("Input UTC:", dateStr);

// current formatting (implicit timezone)
console.log("Current getDate():", date.getDate());

// New formatting (IST)
const formatted = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(date);

console.log("IST Formatted (en-GB):", formatted);

const istDay = parseInt(new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric'
}).format(date));

console.log("IST Day of Month:", istDay);
