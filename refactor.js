import { Project, SyntaxKind } from "ts-morph";
import * as fs from "fs";

const project = new Project();
const appFile = project.addSourceFileAtPath("src/App.tsx");

// Create components directory if it doesn't exist
if (!fs.existsSync("src/components")) {
    fs.mkdirSync("src/components");
}

const componentsToExtract = [
    "BirdForm",
    "CageCard", 
    "SubscriptionGate"
];

let extractedCount = 0;

for (const name of componentsToExtract) {
    const funcDecl = appFile.getFunction(name);
    if (funcDecl) {
        console.log(`Found ${name}, extracting...`);
        
        // We could extract it to a new file, but we need to resolve imports!
        // This is actually extremely hard to do robustly with AST because 
        // we have to trace all referenced identifiers to their import declarations 
        // or top level declarations.
    }
}
