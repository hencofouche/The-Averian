async function run() {
  try {
    const res = await fetch('https://developer.yoco.com/online/inline');
    console.log(res.status);
    const text = await res.text();
    console.log(text.substring(0, 500));
  } catch(e) { console.error(e); }
}
run();
