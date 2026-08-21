const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

const functionsToMemoize = [
  'PedigreeFullView',
  'FinancialsView',
  'EntityStatsView',
  'TaskCalendar',
  'ImageGallery',
];

for (const func of functionsToMemoize) {
  const funcStart = `function ${func}(`;
  const memoStart = `const ${func} = React.memo(function ${func}(`;
  
  if (code.includes(funcStart) && !code.includes(memoStart)) {
    // Find the matching closing brace for the function
    const startIndex = code.indexOf(funcStart);
    let openBraces = 0;
    let foundFirstBrace = false;
    let endIndex = -1;
    
    for (let i = startIndex; i < code.length; i++) {
      if (code[i] === '{') {
        openBraces++;
        foundFirstBrace = true;
      } else if (code[i] === '}') {
        openBraces--;
      }
      
      if (foundFirstBrace && openBraces === 0) {
        endIndex = i;
        break;
      }
    }
    
    if (endIndex !== -1) {
      // Replace the start and end
      const before = code.substring(0, startIndex);
      const after = code.substring(endIndex + 1);
      const middle = code.substring(startIndex + funcStart.length, endIndex);
      
      code = before + memoStart + middle + '});' + after;
      console.log(`Memoized ${func}`);
    } else {
      console.log(`Could not find end of ${func}`);
    }
  } else {
    console.log(`${func} not found or already memoized`);
  }
}

// Ensure `onBirdRef` and `onBack` are memoized using useCallback in App if they are defined there
// Let's add useCallback for `handleBirdRef` and `handleGoBack` if not already
if (!code.includes('useCallback(() => {') && code.includes('const handleBirdRef = (birdName: string) => {')) {
  code = code.replace(
    'const handleBirdRef = (birdName: string) => {',
    'const handleBirdRef = React.useCallback((birdName: string) => {'
  );
  // Need to close it
  code = code.replace(
    `  const handleBirdRef = React.useCallback((birdName: string) => {
    handleNavigate('birds', birdName);
  };`,
    `  const handleBirdRef = React.useCallback((birdName: string) => {
    handleNavigate('birds', birdName);
  }, [handleNavigate]);`
  );
}

fs.writeFileSync('src/App.tsx', code);
