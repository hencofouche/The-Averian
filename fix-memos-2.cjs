const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix PedigreeFullView end
code = code.replace(
  `        }
      \`}</style>
    </div>
  );
}`,
  `        }
      \`}</style>
    </div>
  );
});`
);

// We inserted \`});\` before FinancialsView, let's remove it.
const badEnd = '});\n\nconst FinancialsView = React.memo(function FinancialsView({';
if (code.includes(badEnd)) {
  code = code.replace(badEnd, 'const FinancialsView = React.memo(function FinancialsView({');
}

// Fix FinancialsView 
code = code.replace(
  `});: { 
  transactions: Transaction[],`,
  `}: { 
  transactions: Transaction[],`
);

// Fix EntityStatsView
code = code.replace(
  `});: {
  filter: { birdId?: string, pairId?: string },`,
  `}: {
  filter: { birdId?: string, pairId?: string },`
);

// EntityStatsView end
// Let's find the end of EntityStatsView and add `});` if it's missing.
// It is before `function App()`
code = code.replace(
  `      </div>
    </Card>
  );
}

function App() {`,
  `      </div>
    </Card>
  );
});

function App() {`
);

fs.writeFileSync('src/App.tsx', code);
