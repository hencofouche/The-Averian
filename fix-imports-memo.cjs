const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('const GeneticsCalculatorMemo')) {
  code = code.replace(
    `import GeneticsCalculator from './components/GeneticsCalculator';`,
    `import GeneticsCalculatorOriginal from './components/GeneticsCalculator';\nconst GeneticsCalculator = React.memo(GeneticsCalculatorOriginal);`
  );
}

if (!code.includes('const ContactsViewMemo')) {
  code = code.replace(
    `import { ContactsView } from './components/ContactsView';`,
    `import { ContactsView as ContactsViewOriginal } from './components/ContactsView';\nconst ContactsView = React.memo(ContactsViewOriginal);`
  );
}

fs.writeFileSync('src/App.tsx', code);
