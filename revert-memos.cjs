const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Revert ImageGallery
code = code.replace(
  /const ImageGallery = React\.memo\(function ImageGallery\(([^)]+)\) \{/,
  `function ImageGallery($1) {`
);
// Find `});` at the end of ImageGallery
code = code.replace(
  `      </motion.div>
    </div>
  );
});`,
  `      </motion.div>
    </div>
  );
}`
);

// Revert PedigreeFullView
code = code.replace(
  /const PedigreeFullView = React\.memo\(function PedigreeFullView\(([^)]+)\) \{/,
  `function PedigreeFullView($1) {`
);
code = code.replace(
  `        }
      \`}</style>
    </div>
  );
});`,
  `        }
      \`}</style>
    </div>
  );
}`
);
code = code.replace(
  `});\n\nfunction FinancialsView`,
  `\n\nfunction FinancialsView`
);

// Revert FinancialsView
code = code.replace(
  /const FinancialsView = React\.memo\(function FinancialsView\(([^)]+)\) \{/,
  `function FinancialsView($1) {`
);
code = code.replace(
  `      </Modal> 
    </Card>
  );
});`,
  `      </Modal> 
    </Card>
  );
}`
);

// Revert EntityStatsView
code = code.replace(
  /const EntityStatsView = React\.memo\(function EntityStatsView\(([^)]+)\) \{/,
  `function EntityStatsView($1) {`
);
code = code.replace(
  `      </div>
    </Card>
  );
});

function App() {`,
  `      </div>
    </Card>
  );
}

function App() {`
);

// Fix handleNavigate
code = code.replace(
  `    setStatsFilter(filter);
  };

  const handleGoBack`,
  `    setStatsFilter(filter);
  }, [activeTab, searchQuery, statsFilter]);

  const handleGoBack`
);

fs.writeFileSync('src/App.tsx', code);
