const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix ImageGallery
code = code.replace(
  `const ImageGallery = React.memo(function ImageGallery({ imageUrls, initialIndex, onClose });: { imageUrls: string[], initialIndex: number, onClose: () => void }) {`,
  `const ImageGallery = React.memo(function ImageGallery({ imageUrls, initialIndex, onClose }: { imageUrls: string[], initialIndex: number, onClose: () => void }) {`
);

// We need to move the '});' from line 124 to line 136.
// Let's just find the first `});` after `const ImageGallery = `
// Wait, no. `code.replace` on the exact string that was modified incorrectly is safer.
code = code.replace(
  `            <div className="absolute bottom-4 left-1/2 -translate-y-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white rounded-full backdrop-blur-md text-xs font-bold tracking-widest z-20">
              {currentIndex + 1} / {imageUrls.length}
            </div>
          </>
        )}});`,
  `            <div className="absolute bottom-4 left-1/2 -translate-y-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white rounded-full backdrop-blur-md text-xs font-bold tracking-widest z-20">
              {currentIndex + 1} / {imageUrls.length}
            </div>
          </>
        )}`
);

code = code.replace(
  `      </motion.div>
    </div>
  );
}`,
  `      </motion.div>
    </div>
  );
});`
);

// Fix PedigreeFullView
code = code.replace(
  `const PedigreeFullView = React.memo(function PedigreeFullView({ birdId, birds, cages, onBirdRef, onBack, userSettings });: { birdId: string, birds: Bird[], cages: Cage[], onBirdRef: (name: string) => void, onBack: () => void, userSettings?: UserSettings }) {`,
  `const PedigreeFullView = React.memo(function PedigreeFullView({ birdId, birds, cages, onBirdRef, onBack, userSettings }: { birdId: string, birds: Bird[], cages: Cage[], onBirdRef: (name: string) => void, onBack: () => void, userSettings?: UserSettings }) {`
);

code = code.replace(
  `const PedigreeFullView = React.memo(function PedigreeFullView({ birdId, birds, cages, onBirdRef, onBack, userSettings }: { birdId: string, birds: Bird[], cages: Cage[], onBirdRef: (name: string) => void, onBack: () => void, userSettings?: UserSettings }) {});`,
  `const PedigreeFullView = React.memo(function PedigreeFullView({ birdId, birds, cages, onBirdRef, onBack, userSettings }: { birdId: string, birds: Bird[], cages: Cage[], onBirdRef: (name: string) => void, onBack: () => void, userSettings?: UserSettings }) {`
);

// wait, the `});` for PedigreeFullView was placed right after `userSettings}`.
// Let's just find `userSettings });: {`
code = code.replace(
  `userSettings });: {`,
  `userSettings }: {`
);

// Now I need to add `});` at the end of PedigreeFullView.
// Where does it end?
// The next function after PedigreeFullView is `function FinancialsView`
const financialStart = `const FinancialsView = React.memo(function FinancialsView({`;
const financialIndex = code.indexOf(financialStart);
// Just before FinancialsView is the end of PedigreeFullView.
// let's look for `  );\n}` before financialIndex.
if (financialIndex !== -1) {
  const beforeFin = code.substring(financialIndex - 20, financialIndex);
  code = code.substring(0, financialIndex - 20) + beforeFin.replace(/\}\s*$/, '});\n\n') + code.substring(financialIndex);
}

// FinancialsView
code = code.replace(
  `      </Modal> 
    </Card>
  );
}});`,
  `      </Modal> 
    </Card>
  );
});`
);

// Actually, wait! Did the script put `});` right after `{` for FinancialsView?
// Let's just run build and see the exact errors and fix them.

fs.writeFileSync('src/App.tsx', code);
