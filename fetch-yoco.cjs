const https = require('https');

https.get('https://developer.yoco.com/api-reference/yoco-api/payments/fetch-payment-v-1-payments-payment-id-get', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const match = data.match(/self\.__next_f\.push\(\[1,"(.*?)"\]\)/g);
    if (match) {
      match.forEach(m => {
        try {
          const str = m.match(/self\.__next_f\.push\(\[1,"(.*)"\]\)/)[1];
          const unescaped = str.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
          console.log(unescaped);
        } catch (e) {}
      });
    }
  });
});
