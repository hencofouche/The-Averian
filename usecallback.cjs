const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('const handleNavigate = React.useCallback(')) {
  code = code.replace(
    /const handleNavigate = \(tab: any, query: string = '', filter: \{ birdId\?: string, pairId\?: string \} \| null = null, isDirectNav: boolean = false\) => \{/,
    `const handleNavigate = React.useCallback((tab: any, query: string = '', filter: { birdId?: string, pairId?: string } | null = null, isDirectNav: boolean = false) => {`
  );
  
  // The handleNavigate function ends around line 1498 where handleBirdRef is
  const targetEnd = `  const handleBirdRef = React.useCallback((birdName: string) => {`;
  code = code.replace(
    `} else {\n      handleNavigate('birds', '', null, true);\n    }\n  };\n\n  const handleBirdRef =`,
    `} else {\n      handleNavigate('birds', '', null, true);\n    }\n  }, [activeTab, searchQuery, statsFilter]);\n\n  const handleBirdRef =`
  );
}

if (!code.includes('const handleGoBack = React.useCallback(')) {
  code = code.replace(
    `  const handleGoBack = () => {`,
    `  const handleGoBack = React.useCallback(() => {`
  );
  code = code.replace(
    `} else {\n      handleNavigate('birds', '', null, true);\n    }\n  }, [activeTab, searchQuery, statsFilter]);\n`,
    `} else {\n      handleNavigate('birds', '', null, true);\n    }\n  }, [navigationHistory, handleNavigate]);\n`
  );
}

fs.writeFileSync('src/App.tsx', code);
