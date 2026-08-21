const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'const ImageGallery = React.memo(function ImageGallery(',
  'function ImageGallery('
);

code = code.replace(
  'const PedigreeFullView = React.memo(function PedigreeFullView(',
  'function PedigreeFullView('
);

code = code.replace(
  'const FinancialsView = React.memo(function FinancialsView(',
  'function FinancialsView('
);

code = code.replace(
  'const EntityStatsView = React.memo(function EntityStatsView(',
  'function EntityStatsView('
);

fs.writeFileSync('src/App.tsx', code);
