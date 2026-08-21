const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// We need to define handleEditTransaction and handleDeleteTransaction inside App
const targetStart = `  const handleNavigate = React.useCallback((tab: any`;

const newHandlers = `
  const handleEditTransaction = React.useCallback((t: Transaction) => {
    setEditingItem(t);
    setIsModalOpen(true);
  }, []);

  const handleDeleteTransaction = React.useCallback((id: string) => {
    setDeleteConfirmation({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
      onConfirm: async () => {
        try { await deleteDoc(doc(db, 'transactions', id)); }
        catch (e) { handleFirestoreError(e, OperationType.DELETE, 'transactions'); }
      }
    });
  }, [db, handleFirestoreError]);

  const handleEditBreeding = React.useCallback((r: BreedingRecord) => {
    setEditingItem(r);
    setIsModalOpen(true);
  }, []);

  const handleDeleteBreeding = React.useCallback((id: string) => {
    setDeleteConfirmation({
      title: 'Delete Breeding Record',
      message: 'Are you sure you want to delete this breeding record? This action cannot be undone.',
      onConfirm: async () => {
        try { await deleteDoc(doc(db, 'breedingRecords', id)); }
        catch (e) { handleFirestoreError(e, OperationType.DELETE, 'breedingRecords'); }
      }
    });
  }, [db, handleFirestoreError]);

`;

if (!code.includes('const handleEditTransaction = React.useCallback(')) {
  code = code.replace(targetStart, newHandlers + targetStart);
}

// Now replace inline usage
code = code.replace(
  /onEditTransaction=\{\(t\) => \{ setEditingItem\(t\); setIsModalOpen\(true\); \}\}/g,
  `onEditTransaction={handleEditTransaction}`
);

code = code.replace(
  /onDeleteTransaction=\{\(id\) => setDeleteConfirmation\(\{[^}]+\}[^}]+\}[^}]+\}[^}]+\}\)\}/g,
  `onDeleteTransaction={handleDeleteTransaction}`
);

code = code.replace(
  /onEditBreeding=\{\(r\) => \{ setEditingItem\(r\); setIsModalOpen\(true\); \}\}/g,
  `onEditBreeding={handleEditBreeding}`
);

code = code.replace(
  /onDeleteBreeding=\{\(id\) => setDeleteConfirmation\(\{[^}]+\}[^}]+\}[^}]+\}[^}]+\}\)\}/g,
  `onDeleteBreeding={handleDeleteBreeding}`
);


fs.writeFileSync('src/App.tsx', code);
