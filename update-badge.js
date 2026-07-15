const fs = require('fs');
let code = fs.readFileSync('src/components/ui.tsx', 'utf8');

code = code.replace(
  `variant?: 'default' | 'destructive' | 'male' | 'female'`, 
  `variant?: 'default' | 'destructive' | 'male' | 'female' | 'neutral' | 'success' | 'info' | 'warning'`
);

fs.writeFileSync('src/components/ui.tsx', code);
