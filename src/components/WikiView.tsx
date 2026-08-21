import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, Plus, Search, Edit2, Trash2, Egg, Heart, Shield,
  FileText, Award, Calendar, Dna, ArrowRight, X, Sparkles, Loader2,
  AlertTriangle, UploadCloud, ChevronRight, ArrowLeft, Image as ImageIcon
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { toast } from 'sonner';
import { compressAndUploadImage } from '../lib/image-utils';

interface WikiSubspecies {
  id: string;
  name: string;
  description?: string;
  incubationDays?: number;
  clutchSize?: string;
  diet?: string;
  nesting?: string;
  imageUrl?: string;
}

interface WikiSpecies {
  id: string;
  name: string;
  subspecies: WikiSubspecies[];
  createdAt?: string;
  updatedAt?: string;
}

interface WikiMutationReferenceImage {
  id: string;
  url: string;
  name: string;
  speciesName: string;
  subspeciesName: string;
}

interface WikiMutation {
  id: string;
  name: string;
  inheritance: 'autosomal_recessive' | 'autosomal_dominant' | 'incomplete_dominant' | 'sex_linked_recessive';
  description?: string;
  speciesId?: string; // Optional link to a species
  referenceImages?: WikiMutationReferenceImage[];
  createdAt?: string;
  updatedAt?: string;
}

interface WikiViewProps {
  user: any;
  isAdmin: boolean;
  userSettings?: any;
}

// Inlined helper to handle Firestore errors in conformance with the firebase-integration skill
function handleFirestoreErrorInfo(error: unknown, opType: string, path: string) {
  const errMessage = error instanceof Error ? error.message : String(error);
  console.error('Firestore Error inside WikiView: ', errMessage, opType, path);
  
  if (errMessage.toLowerCase().includes('permission') || errMessage.includes('permission-denied')) {
    toast.error('Permission Denied: Your email might not be registered as an administrator in Firestore Rules. Please make sure you are signed in with the correct account.');
  } else {
    toast.error(`Database Error (${opType}): ${errMessage}`);
  }
}

export function WikiView({ user, isAdmin, userSettings }: WikiViewProps) {
  const [wikiSpeciesList, setWikiSpeciesList] = useState<WikiSpecies[]>([]);
  const [wikiMutationsList, setWikiMutationsList] = useState<WikiMutation[]>([]);
  const [activeTab, setActiveTab] = useState<'species' | 'mutations'>('species');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Expanded View Navigation
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [selectedSubspeciesId, setSelectedSubspeciesId] = useState<string | null>(null);
  const [isEditingSubspeciesCare, setIsEditingSubspeciesCare] = useState(false);

  // Modals state
  const [isSpeciesModalOpen, setIsSpeciesModalOpen] = useState(false);
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [editingSpecies, setEditingSpecies] = useState<WikiSpecies | null>(null);
  const [editingMutation, setEditingMutation] = useState<WikiMutation | null>(null);

  // Form states - Species
  const [speciesName, setSpeciesName] = useState('');
  const [subspeciesInput, setSubspeciesInput] = useState('');
  const [subspeciesList, setSubspeciesList] = useState<WikiSubspecies[]>([]);

  // Subspecies Inline Care Sheet Editor States
  const [subName, setSubName] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subIncubation, setSubIncubation] = useState<number>(21);
  const [subClutch, setSubClutch] = useState('');
  const [subNesting, setSubNesting] = useState('');
  const [subDiet, setSubDiet] = useState('');
  const [subImageUrl, setSubImageUrl] = useState('');

  // Inline add subspecies for active species
  const [inlineSubInput, setInlineSubInput] = useState('');

  // Form states - Mutation
  const [mutationName, setMutationName] = useState('');
  const [mutationInheritance, setMutationInheritance] = useState<'autosomal_recessive' | 'autosomal_dominant' | 'incomplete_dominant' | 'sex_linked_recessive'>('autosomal_recessive');
  const [mutationDesc, setMutationDesc] = useState('');
  const [mutationSpeciesId, setMutationSpeciesId] = useState('');

  // Mutation Reference Gallery States
  const [activeMutationGallery, setActiveMutationGallery] = useState<WikiMutation | null>(null);
  const [refImageName, setRefImageName] = useState('');
  const [refSpeciesName, setRefSpeciesName] = useState('');
  const [refSubspeciesName, setRefSubspeciesName] = useState('');
  const [isUploadingRef, setIsUploadingRef] = useState(false);

  // Clear all Wiki Care Guides & Genetics Action
  const handleClearAllWikiData = async () => {
    if (!window.confirm('WARNING: This will permanently delete ALL Species, Subspecies, Care Sheets, and Genetic Mutation reference guides from the Wiki. This action cannot be undone.\n\nAre you sure you want to proceed?')) return;
    const confirmation = window.prompt('Type "DELETE" to confirm wipe of the entire Wiki reference database:');
    if (confirmation !== 'DELETE') {
      toast.error('Wipe aborted. Confirmation text did not match.');
      return;
    }

    const toastId = toast.loading('Wiping wiki databases...');
    try {
      const batch = writeBatch(db);
      wikiSpeciesList.forEach((spec) => {
        batch.delete(doc(db, 'wikiSpecies', spec.id));
      });
      wikiMutationsList.forEach((mut) => {
        batch.delete(doc(db, 'wikiMutations', mut.id));
      });
      await batch.commit();
      toast.success('Wiki Care Guides & Mutation reference database cleared!', { id: toastId });
      setSelectedSpeciesId(null);
      setSelectedSubspeciesId(null);
    } catch (err: any) {
      toast.error('Wipe failed: ' + err.message, { id: toastId });
    }
  };

  // Real-time listener for dynamic Species Wiki
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'wikiSpecies'), (snapshot) => {
      const items: WikiSpecies[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({ 
          id: doc.id, 
          name: data.name || '',
          subspecies: Array.isArray(data.subspecies) ? data.subspecies : [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      setWikiSpeciesList(items.sort((a, b) => a.name.localeCompare(b.name)));
      setIsLoading(false);
    }, (err) => {
      handleFirestoreErrorInfo(err, 'get', 'wikiSpecies');
    });
    return unsub;
  }, []);

  // Real-time listener for dynamic Mutations Wiki
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'wikiMutations'), (snapshot) => {
      const items: WikiMutation[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as WikiMutation);
      });
      setWikiMutationsList(items.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => {
      handleFirestoreErrorInfo(err, 'get', 'wikiMutations');
    });
    return unsub;
  }, []);

  // Open Species Add/Edit Form
  const handleOpenSpeciesForm = (species?: WikiSpecies) => {
    if (species) {
      setEditingSpecies(species);
      setSpeciesName(species.name);
      setSubspeciesList(species.subspecies || []);
    } else {
      setEditingSpecies(null);
      setSpeciesName('');
      setSubspeciesList([]);
    }
    setIsSpeciesModalOpen(true);
  };

  // Open Mutation Add/Edit Form
  const handleOpenMutationForm = (mutation?: WikiMutation) => {
    if (mutation) {
      setEditingMutation(mutation);
      setMutationName(mutation.name);
      setMutationInheritance(mutation.inheritance);
      setMutationDesc(mutation.description || '');
      setMutationSpeciesId(mutation.speciesId || '');
    } else {
      setEditingMutation(null);
      setMutationName('');
      setMutationInheritance('autosomal_recessive');
      setMutationDesc('');
      setMutationSpeciesId('');
    }
    setIsMutationModalOpen(true);
  };

  // Add a Subspecies to the local list in form
  const handleAddSubspeciesLocal = () => {
    if (!subspeciesInput.trim()) return;
    const name = subspeciesInput.trim();
    const cleanId = 'sub_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now().toString().slice(-4);
    if (subspeciesList.some(ss => ss.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Subspecies already exists in this list!');
      return;
    }
    setSubspeciesList([...subspeciesList, { 
      id: cleanId, 
      name,
      description: '',
      incubationDays: 21,
      clutchSize: '',
      diet: '',
      nesting: '',
      imageUrl: ''
    }]);
    setSubspeciesInput('');
  };

  const handleRemoveSubspeciesLocal = (id: string) => {
    setSubspeciesList(subspeciesList.filter(ss => ss.id !== id));
  };

  // Submit Species changes to Firestore
  const handleSaveSpecies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speciesName.trim()) {
      toast.error('Species Name is required!');
      return;
    }

    const payload = {
      name: speciesName.trim(),
      subspecies: subspeciesList,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingSpecies) {
        await updateDoc(doc(db, 'wikiSpecies', editingSpecies.id), payload);
        toast.success(`Updated Species: ${speciesName}!`);
      } else {
        await addDoc(collection(db, 'wikiSpecies'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        toast.success(`Created Species: ${speciesName}!`);
      }
      setIsSpeciesModalOpen(false);
    } catch (err) {
      handleFirestoreErrorInfo(err, editingSpecies ? 'update' : 'create', 'wikiSpecies');
    }
  };

  // Submit Mutation changes to Firestore
  const handleSaveMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutationName.trim()) {
      toast.error('Mutation Name is required!');
      return;
    }

    const payload = {
      name: mutationName.trim(),
      inheritance: mutationInheritance,
      description: mutationDesc.trim(),
      speciesId: mutationSpeciesId || null,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingMutation) {
        await updateDoc(doc(db, 'wikiMutations', editingMutation.id), payload);
        toast.success(`Updated mutation ${mutationName}!`);
      } else {
        await addDoc(collection(db, 'wikiMutations'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        toast.success(`Added mutation ${mutationName}!`);
      }
      setIsMutationModalOpen(false);
    } catch (err) {
      handleFirestoreErrorInfo(err, editingMutation ? 'update' : 'create', 'wikiMutations');
    }
  };

  // Delete Species
  const handleDeleteSpecies = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete the Species "${name}"? This removes all associated subspecies care sheets.`)) return;
    try {
      await deleteDoc(doc(db, 'wikiSpecies', id));
      toast.success(`Deleted ${name}.`);
      if (selectedSpeciesId === id) {
        setSelectedSpeciesId(null);
        setSelectedSubspeciesId(null);
      }
    } catch (err) {
      handleFirestoreErrorInfo(err, 'delete', `wikiSpecies/${id}`);
    }
  };

  // Delete Mutation
  const handleDeleteMutation = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete the Mutation entry for ${name}?`)) return;
    try {
      await deleteDoc(doc(db, 'wikiMutations', id));
      toast.success(`Deleted ${name} Mutation.`);
    } catch (err) {
      handleFirestoreErrorInfo(err, 'delete', `wikiMutations/${id}`);
    }
  };

  // Active Species detail reference
  const selectedSpecies = useMemo(() => {
    return wikiSpeciesList.find(s => s.id === selectedSpeciesId) || null;
  }, [wikiSpeciesList, selectedSpeciesId]);

  // Active Subspecies care reference
  const selectedSubspecies = useMemo(() => {
    if (!selectedSpecies) return null;
    return selectedSpecies.subspecies.find(ss => ss.id === selectedSubspeciesId) || null;
  }, [selectedSpecies, selectedSubspeciesId]);

  // Handle Species Selection
  const handleSelectSpecies = (id: string) => {
    setSelectedSpeciesId(id);
    setIsEditingSubspeciesCare(false);
    const spec = wikiSpeciesList.find(s => s.id === id);
    if (spec && spec.subspecies && spec.subspecies.length > 0) {
      setSelectedSubspeciesId(spec.subspecies[0].id);
    } else {
      setSelectedSubspeciesId(null);
    }
  };

  // Add subspecies inline
  const handleAddSubspeciesInline = async () => {
    if (!inlineSubInput.trim() || !selectedSpecies) return;
    const name = inlineSubInput.trim();
    const cleanId = 'sub_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now().toString().slice(-4);
    
    if (selectedSpecies.subspecies.some(ss => ss.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Subspecies already exists!');
      return;
    }

    const newSub: WikiSubspecies = {
      id: cleanId,
      name,
      description: '',
      incubationDays: 21,
      clutchSize: '',
      diet: '',
      nesting: '',
      imageUrl: ''
    };

    const updatedList = [...selectedSpecies.subspecies, newSub];

    try {
      await updateDoc(doc(db, 'wikiSpecies', selectedSpecies.id), {
        subspecies: updatedList,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Added subspecies "${name}"!`);
      setInlineSubInput('');
      setSelectedSubspeciesId(cleanId);
    } catch (err) {
      toast.error('Failed to add subspecies: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Delete subspecies inline
  const handleDeleteSubspeciesInline = async (subId: string, subName: string) => {
    if (!selectedSpecies) return;
    if (!window.confirm(`Delete subspecies "${subName}" and its care guide?`)) return;

    const updatedList = selectedSpecies.subspecies.filter(s => s.id !== subId);

    try {
      await updateDoc(doc(db, 'wikiSpecies', selectedSpecies.id), {
        subspecies: updatedList,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Removed subspecies "${subName}"`);
      if (selectedSubspeciesId === subId) {
        setSelectedSubspeciesId(updatedList[0]?.id || null);
      }
    } catch (err) {
      toast.error('Failed to delete subspecies: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Open inline care sheet editor for subspecies
  const handleStartEditSubspeciesCare = () => {
    if (!selectedSubspecies) return;
    setSubName(selectedSubspecies.name);
    setSubDesc(selectedSubspecies.description || '');
    setSubIncubation(selectedSubspecies.incubationDays || 21);
    setSubClutch(selectedSubspecies.clutchSize || '');
    setSubNesting(selectedSubspecies.nesting || '');
    setSubDiet(selectedSubspecies.diet || '');
    setSubImageUrl(selectedSubspecies.imageUrl || '');
    setIsEditingSubspeciesCare(true);
  };

  // Save inline care sheet editor
  const handleSaveSubspeciesCare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecies || !selectedSubspeciesId) return;

    const updatedList = selectedSpecies.subspecies.map(sub => {
      if (sub.id === selectedSubspeciesId) {
        return {
          ...sub,
          name: subName.trim(),
          description: subDesc.trim(),
          incubationDays: Number(subIncubation) || 0,
          clutchSize: subClutch.trim(),
          nesting: subNesting.trim(),
          diet: subDiet.trim(),
          imageUrl: subImageUrl.trim()
        };
      }
      return sub;
    });

    try {
      await updateDoc(doc(db, 'wikiSpecies', selectedSpecies.id), {
        subspecies: updatedList,
        updatedAt: new Date().toISOString()
      });
      toast.success('Successfully updated care sheet!');
      setIsEditingSubspeciesCare(false);
    } catch (err) {
      toast.error('Failed to update care sheet: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Filter lists based on Search Query
  const filteredSpecies = useMemo(() => {
    return wikiSpeciesList.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subspecies.some(sub => sub.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [wikiSpeciesList, searchQuery]);

  const filteredMutations = useMemo(() => {
    return wikiMutationsList.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [wikiMutationsList, searchQuery]);

  const getInheritanceLabel = (mode: string) => {
    switch (mode) {
      case 'autosomal_recessive': return 'Autosomal Recessive';
      case 'autosomal_dominant': return 'Autosomal Dominant';
      case 'incomplete_dominant': return 'Incomplete Dominant';
      case 'sex_linked_recessive': return 'Sex-Linked Recessive';
      default: return mode;
    }
  };

  const getInheritanceColor = (mode: string) => {
    switch (mode) {
      case 'autosomal_recessive': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'autosomal_dominant': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'incomplete_dominant': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'sex_linked_recessive': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 bg-gold-500/10 text-gold-400 rounded-lg border border-gold-500/20">
              <BookOpen size={16} />
            </span>
            <span className="text-[10px] text-gold-400 font-bold uppercase tracking-wider">Averian Academy</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">Wiki, Care Guides & Genetics Reference</h1>
          <p className="text-xs text-zinc-500 mt-1">Explore interactive species directories, detailed subspecies guidelines, and genetic mutation inheritance modes.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {isAdmin && (
            <>
              <button
                onClick={handleClearAllWikiData}
                className="flex-1 sm:flex-none text-xs font-bold py-2.5 px-4 bg-zinc-950 hover:bg-rose-950/20 text-rose-500 hover:text-rose-400 border border-rose-950/50 rounded-xl transition-all inline-flex items-center justify-center gap-2"
              >
                <Trash2 size={15} />
                Clear All Wiki Data
              </button>
              <button
                onClick={() => activeTab === 'species' ? handleOpenSpeciesForm() : handleOpenMutationForm()}
                className="flex-1 sm:flex-none text-xs font-black py-2.5 px-4 bg-gold-500 hover:bg-gold-400 text-black rounded-xl transition-all shadow-lg inline-flex items-center justify-center gap-2"
              >
                <Plus size={15} />
                Add {activeTab === 'species' ? 'Species Class' : 'Mutation Rule'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Tab Controls & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/60 p-2.5 border border-zinc-800 rounded-2xl">
        {/* Navigation Tabs */}
        <div className="flex bg-zinc-950/60 p-1 rounded-xl border border-zinc-800 shrink-0">
          <button
            onClick={() => { setActiveTab('species'); setSelectedSpeciesId(null); setSelectedSubspeciesId(null); }}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'species' ? 'bg-gold-500 text-black font-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Egg size={14} />
            Species & Care Guides
          </button>
          <button
            onClick={() => { setActiveTab('mutations'); setSelectedSpeciesId(null); setSelectedSubspeciesId(null); }}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-black rounded-lg uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'mutations' ? 'bg-gold-500 text-black font-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Dna size={14} />
            Mutations & Genetics
          </button>
        </div>

        {/* Live Search */}
        <div className="relative w-full md:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder={`Search ${activeTab === 'species' ? 'species...' : 'mutations...'}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-zinc-950 text-white pl-9 pr-4 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 transition-all placeholder-zinc-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tab Content Panels */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-500 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="text-gold-500 animate-spin" />
          <p className="text-xs">Loading Aviary Care Guides and Mutation Lists...</p>
        </div>
      ) : activeTab === 'species' ? (
        selectedSpeciesId === null ? (
          // ==========================================
          // 1. SPECIES MENU GRID (JUST THE MENU)
          // ==========================================
          filteredSpecies.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl">
              <Egg size={36} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-sm font-semibold text-zinc-300">No species found</p>
              <p className="text-xs text-zinc-500 mt-1">Add a species class using the button above to begin compiling your guides.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSpecies.map((species) => (
                <div 
                  key={species.id}
                  onClick={() => handleSelectSpecies(species.id)}
                  className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 transition-all rounded-2xl p-5 cursor-pointer group relative flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white group-hover:text-gold-400 transition-all tracking-tight">{species.name}</h3>
                      <span className="text-[10px] bg-zinc-950 px-2 py-0.5 border border-zinc-800 text-zinc-400 font-semibold rounded-lg shrink-0">
                        {species.subspecies?.length || 0} Subspecies
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2">
                      Click to explore specific breeds, color varietals, incubation sheets, and diet guidelines.
                    </p>
                  </div>

                  <div className="border-t border-zinc-800/60 pt-3 mt-4 flex items-center justify-between text-[10px] text-gold-400 font-bold uppercase tracking-wider">
                    <span>Explore Guides</span>
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Admin actions overlay */}
                  {isAdmin && (
                    <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-lg border border-zinc-800" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenSpeciesForm(species)}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                        title="Rename Species"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={() => handleDeleteSpecies(species.id, species.name)}
                        className="p-1 hover:bg-rose-950 rounded text-rose-400 hover:text-rose-300"
                        title="Delete Species"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          // ==========================================
          // 2. DETAILED SPECIES VIEW WITH SUBSPECIES TREE
          // ==========================================
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Subspecies List */}
            <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button 
                  onClick={() => { setSelectedSpeciesId(null); setSelectedSubspeciesId(null); }}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-all font-bold"
                >
                  <ArrowLeft size={14} />
                  Back to Menu
                </button>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{selectedSpecies?.name}</span>
              </div>

              {/* Quick Add Subspecies Inline (Admins Only) */}
              {isAdmin && (
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      placeholder="Add breed/subspecies..."
                      value={inlineSubInput}
                      onChange={(e) => setInlineSubInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubspeciesInline(); }}
                      className="flex-1 bg-zinc-950 text-xs text-white border border-zinc-800 focus:outline-none focus:border-gold-500 rounded-lg px-3 py-1.5"
                    />
                    <button 
                      onClick={handleAddSubspeciesInline}
                      className="bg-gold-500 hover:bg-gold-400 text-black p-2 rounded-lg font-bold transition-all text-xs shrink-0"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Subspecies Tree Links */}
              <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                {selectedSpecies?.subspecies && selectedSpecies.subspecies.length > 0 ? (
                  selectedSpecies.subspecies.map((sub) => (
                    <div 
                      key={sub.id}
                      onClick={() => { setSelectedSubspeciesId(sub.id); setIsEditingSubspeciesCare(false); }}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all group ${
                        selectedSubspeciesId === sub.id 
                          ? 'bg-zinc-800 border-zinc-700 text-white font-bold' 
                          : 'bg-zinc-950/40 border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ChevronRight size={12} className={selectedSubspeciesId === sub.id ? 'text-gold-400' : 'text-zinc-600'} />
                        {sub.name}
                      </span>

                      {/* Delete subspecies option */}
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSubspeciesInline(sub.id, sub.name); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-all rounded hover:bg-zinc-800"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 italic text-center py-6">No subspecies registered yet.</p>
                )}
              </div>
            </div>

            {/* Right Column: Dynamic Care Sheet View for selected subspecies */}
            <div className="lg:col-span-8">
              {selectedSubspeciesId === null || !selectedSubspecies ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
                  <Egg size={36} className="text-zinc-700" />
                  <p className="text-sm font-semibold text-zinc-400">Select a subspecies from the list</p>
                  <p className="text-xs text-zinc-500 max-w-sm">Click on any of the subspecies in the tree to view or compile their detailed aviary care guide sheets.</p>
                </div>
              ) : isEditingSubspeciesCare ? (
                // ==========================================
                // 3. IN-LINE SUBSPECIES CARE SHEET EDITOR
                // ==========================================
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">Edit Subspecies Care Sheet</h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Customize care guidelines for {selectedSubspecies.name}</p>
                    </div>
                    <button 
                      onClick={() => setIsEditingSubspeciesCare(false)}
                      className="p-1.5 hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-white"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveSubspeciesCare} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-zinc-400">Subspecies/Breed Name *</label>
                        <input 
                          type="text" 
                          required 
                          value={subName}
                          onChange={(e) => setSubName(e.target.value)}
                          className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3.5 py-2.5"
                        />
                      </div>

                      {/* Image URL & Upload */}
                      <div className="space-y-1.5 sm:col-span-1">
                        <label className="font-bold text-zinc-400 block">Illustration / Cover Image</label>
                        <div className="flex gap-1.5 items-center">
                          <input 
                            type="text" 
                            value={subImageUrl}
                            onChange={(e) => setSubImageUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="flex-1 bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3 py-2 text-xs"
                          />
                          <div className="relative shrink-0">
                            <input 
                              type="file" 
                              accept="image/*"
                              id="subspecies-image-upload"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const toastId = toast.loading('Uploading subspecies cover...');
                                try {
                                  const downloadUrl = await compressAndUploadImage(file, 'wikiSubspecies');
                                  setSubImageUrl(downloadUrl);
                                  toast.success('Cover image uploaded successfully!', { id: toastId });
                                } catch (err: any) {
                                  toast.error('Failed to upload image: ' + err.message, { id: toastId });
                                }
                              }}
                            />
                            <label 
                              htmlFor="subspecies-image-upload"
                              className="bg-zinc-800 hover:bg-zinc-750 text-white px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 font-bold transition-all text-xs"
                            >
                              <UploadCloud size={14} />
                              Upload
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Incubation */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-zinc-400">Incubation Period (Days)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={subIncubation}
                          onChange={(e) => setSubIncubation(Number(e.target.value))}
                          className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3.5 py-2.5"
                        />
                      </div>

                      {/* Clutch size */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-zinc-400">Average Clutch Size</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 4-6 eggs"
                          value={subClutch}
                          onChange={(e) => setSubClutch(e.target.value)}
                          className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3.5 py-2.5"
                        />
                      </div>

                      {/* Nesting Box */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="font-bold text-zinc-400">Nesting Box Requirements</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 30x30x60cm, thick wood shavings..."
                          value={subNesting}
                          onChange={(e) => setSubNesting(e.target.value)}
                          className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3.5 py-2.5"
                        />
                      </div>

                      {/* Dietary Guide */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="font-bold text-zinc-400">Dietary & Nutrition Guide</label>
                        <input 
                          type="text" 
                          placeholder="e.g. High quality pellets, leafy greens, seed mix, calcium block..."
                          value={subDiet}
                          onChange={(e) => setSubDiet(e.target.value)}
                          className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3.5 py-2.5"
                        />
                      </div>

                      {/* Description */}
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="font-bold text-zinc-400">Detailed Description & Breeder Information</label>
                        <textarea 
                          rows={4}
                          value={subDesc}
                          onChange={(e) => setSubDesc(e.target.value)}
                          placeholder="Provide care instructions, behavioral notes, specific temperatures..."
                          className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3.5 py-2.5 resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4 mt-4">
                      <button 
                        type="button" 
                        onClick={() => setIsEditingSubspeciesCare(false)}
                        className="bg-zinc-800 hover:bg-zinc-750 text-white px-4 py-2 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="bg-gold-500 hover:bg-gold-400 text-black px-5 py-2 rounded-xl font-bold"
                      >
                        Save Care Sheet
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // ==========================================
                // 4. BEAUTIFUL CARE SHEET DISPLAY CARD
                // ==========================================
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl flex flex-col">
                  {/* Subspecies Hero Cover banner */}
                  <div className="relative h-48 bg-zinc-950 overflow-hidden">
                    {selectedSubspecies.imageUrl ? (
                      <img 
                        src={selectedSubspecies.imageUrl} 
                        alt={selectedSubspecies.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover opacity-80"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center justify-center gap-2">
                        <Egg size={44} className="text-zinc-800" />
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">No Photo Provided</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                    
                    {/* Header Title on cover */}
                    <div className="absolute bottom-4 left-5">
                      <span className="text-[9px] bg-gold-500/10 text-gold-400 px-2 py-0.5 border border-gold-500/20 font-bold uppercase tracking-wider rounded-lg mb-1 inline-block">
                        {selectedSpecies?.name} Subspecies
                      </span>
                      <h2 className="text-lg font-black text-white drop-shadow-md">{selectedSubspecies.name}</h2>
                    </div>

                    {/* Admin edit trigger button */}
                    {isAdmin && (
                      <button 
                        onClick={handleStartEditSubspeciesCare}
                        className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-white hover:bg-zinc-850 flex items-center gap-1.5 font-bold transition-all"
                      >
                        <Edit2 size={12} />
                        Edit Care Sheet
                      </button>
                    )}
                  </div>

                  {/* Main guidelines body */}
                  <div className="p-6 space-y-6 text-xs">
                    {/* Description */}
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Care Overview & Guidelines</h4>
                      <p className="text-zinc-300 leading-relaxed italic whitespace-pre-line">
                        {selectedSubspecies.description || 'No custom guidelines compiled for this subspecies yet. Admin users can compile incubator sheets, nesting directives, and custom diets using the "Edit Care Sheet" button.'}
                      </p>
                    </div>

                    {/* Care Matrix Details */}
                    <div className="grid grid-cols-2 gap-4 bg-zinc-950/60 p-5 border border-zinc-800 rounded-2xl">
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Incubation duration</span>
                        <p className="font-semibold text-white flex items-center gap-1.5">
                          <Egg size={14} className="text-gold-500" />
                          {selectedSubspecies.incubationDays ? `${selectedSubspecies.incubationDays} Days` : '21 Days'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Avg Clutch Size</span>
                        <p className="font-semibold text-white flex items-center gap-1.5">
                          <Sparkles size={14} className="text-amber-400" />
                          {selectedSubspecies.clutchSize || 'N/A'}
                        </p>
                      </div>
                      <div className="col-span-2 border-t border-zinc-800/60 pt-3 space-y-1">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Nesting Box Guidelines</span>
                        <p className="font-medium text-zinc-300">{selectedSubspecies.nesting || 'N/A'}</p>
                      </div>
                      <div className="col-span-2 border-t border-zinc-800/60 pt-3 space-y-1">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Dietary & Nutrition Guide</span>
                        <p className="font-medium text-zinc-300">{selectedSubspecies.diet || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        // MUTATIONS LIST GRID
        filteredMutations.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl">
            <Dna size={36} className="mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-semibold text-zinc-300">No genetic mutations found</p>
            <p className="text-xs text-zinc-500 mt-1">Add mutation codes or rules using the button above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMutations.map((mutation) => (
              <div 
                key={mutation.id} 
                className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700/60 transition-all text-xs"
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div>
                      <h3 className="font-black text-sm text-white tracking-tight">{mutation.name}</h3>
                      {mutation.speciesId && (
                        <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                          Species: {wikiSpeciesList.find(s => s.id === mutation.speciesId)?.name || 'Custom Species'}
                        </p>
                      )}
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0 bg-zinc-950 p-1 border border-zinc-800 rounded-lg">
                        <button
                          onClick={() => handleOpenMutationForm(mutation)}
                          className="p-1 text-zinc-400 hover:text-white"
                          title="Edit Rule"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteMutation(mutation.id, mutation.name)}
                          className="p-1 text-rose-400 hover:text-rose-300"
                          title="Delete Rule"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inheritance tag */}
                  <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider inline-block mb-3 ${getInheritanceColor(mutation.inheritance)}`}>
                    {getInheritanceLabel(mutation.inheritance)}
                  </span>

                  {/* Description */}
                  {mutation.description && (
                    <p className="text-zinc-400 leading-relaxed mb-4">{mutation.description}</p>
                  )}

                  {/* Reference Image Gallery Thumbnails & Open Action */}
                  <div className="mt-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Reference Photos</span>
                      <span className="text-[10px] text-gold-400 font-bold bg-gold-500/10 px-1.5 py-0.5 border border-gold-500/15 rounded">
                        {mutation.referenceImages?.length || 0}
                      </span>
                    </div>

                    {mutation.referenceImages && mutation.referenceImages.length > 0 ? (
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                        {mutation.referenceImages.slice(0, 4).map((img) => (
                          <img 
                            key={img.id}
                            src={img.url}
                            alt={img.name}
                            className="w-7 h-7 rounded-lg object-cover border border-zinc-800 shrink-0 hover:scale-105 transition-all cursor-pointer"
                            title={`${img.name} (${img.speciesName} - ${img.subspeciesName})`}
                            onClick={() => {
                              setActiveMutationGallery(mutation);
                              setRefImageName('');
                              setRefSpeciesName('');
                              setRefSubspeciesName('');
                            }}
                          />
                        ))}
                        {mutation.referenceImages.length > 4 && (
                          <div 
                            onClick={() => {
                              setActiveMutationGallery(mutation);
                              setRefImageName('');
                              setRefSpeciesName('');
                              setRefSubspeciesName('');
                            }}
                            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[9px] text-zinc-400 font-black shrink-0 cursor-pointer hover:bg-zinc-800 hover:text-white"
                          >
                            +{mutation.referenceImages.length - 4}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-600 italic">No reference photos uploaded.</p>
                    )}

                    <button
                      onClick={() => {
                        setActiveMutationGallery(mutation);
                        setRefImageName('');
                        setRefSpeciesName('');
                        setRefSubspeciesName('');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 transition-all font-bold text-[9px] uppercase tracking-wider"
                    >
                      <ImageIcon size={11} className="text-gold-500" />
                      Open Photo Gallery
                    </button>
                  </div>
                </div>

                {/* Lower guide label */}
                <div className="border-t border-zinc-800/60 pt-3 mt-4 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>Inheritance Mode</span>
                  <span className="font-bold text-zinc-400 uppercase">{mutation.inheritance.replace(/_/g, ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT SPECIES CLASS MODAL */}
      {/* ========================================================= */}
      {isSpeciesModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 max-w-xl w-full max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6 relative text-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-500/10 border border-gold-500/20 text-gold-400 rounded-xl">
                  <Egg size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{editingSpecies ? 'Edit' : 'Create'} Species Class</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Register a parent species group (e.g. Cockatiels or Finches).</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSpeciesModalOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSpecies} className="space-y-4">
              {/* Select from existing */}
              {!editingSpecies && userSettings?.species && userSettings.species.length > 0 && (
                <div className="space-y-1.5 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                  <label className="font-bold text-gold-400 block mb-1">Import from Existing App Species</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const selected = userSettings.species.find((s: any) => s.id === val);
                      if (selected) {
                        setSpeciesName(selected.name);
                        // Find all subspecies belonging to this species in userSettings
                        const subOptions = (userSettings.subspecies || [])
                          .filter((sub: any) => sub.speciesId === selected.id)
                          .map((sub: any) => ({
                            id: sub.id,
                            name: sub.name,
                            description: '',
                            incubationDays: 21,
                            clutchSize: '',
                            diet: '',
                            nesting: '',
                            imageUrl: ''
                          }));
                        setSubspeciesList(subOptions);
                        toast.success(`Imported "${selected.name}" with ${subOptions.length} subspecies!`);
                      }
                    }}
                    className="w-full bg-zinc-900 text-zinc-300 rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3 py-2 text-xs"
                  >
                    <option value="">-- Choose an existing species to pre-fill --</option>
                    {userSettings.species.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500">Choosing an existing species automatically pre-fills its breeds/subspecies for you!</p>
                </div>
              )}

              {/* Species Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-400">Species Class Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. African Parrots, Lovebirds..."
                  value={speciesName}
                  onChange={(e) => setSpeciesName(e.target.value)}
                  className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3.5 py-2.5 transition-all"
                />
              </div>

              {/* Subspecies builder */}
              <div className="border-t border-zinc-800 pt-4 space-y-3">
                <label className="font-bold text-zinc-400 block">Manage Subspecies / Breeds</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add subspecies name..."
                    value={subspeciesInput}
                    onChange={(e) => setSubspeciesInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddSubspeciesLocal(); } }}
                    className="flex-1 bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3.5 py-2 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubspeciesLocal}
                    className="bg-gold-500 hover:bg-gold-400 text-black px-4 rounded-xl font-bold transition-all text-xs"
                  >
                    Add
                  </button>
                </div>

                {/* Subspecies tags layout */}
                <div className="flex flex-wrap gap-1.5 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 min-h-12 max-h-36 overflow-y-auto">
                  {subspeciesList.length > 0 ? (
                    subspeciesList.map((ss) => (
                      <span 
                        key={ss.id} 
                        className="bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-800 flex items-center gap-2 text-[11px]"
                      >
                        {ss.name}
                        <button 
                          type="button"
                          onClick={() => handleRemoveSubspeciesLocal(ss.id)}
                          className="text-zinc-500 hover:text-rose-400"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-500 italic">No subspecies defined yet. Click &apos;Add&apos; to register breeds.</span>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsSpeciesModalOpen(false)}
                  className="bg-zinc-850 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gold-500 hover:bg-gold-400 text-black px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg"
                >
                  {editingSpecies ? 'Save Changes' : 'Create Species'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT MUTATION RULE MODAL */}
      {/* ========================================================= */}
      {isMutationModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-3xl shadow-2xl p-6 relative text-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-500/10 border border-gold-500/20 text-gold-400 rounded-xl">
                  <Dna size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{editingMutation ? 'Edit' : 'Create'} Mutation Rule</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Define inheritance modes for the Genetics Engine.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMutationModalOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveMutation} className="space-y-4">
              {/* Select from existing */}
              {!editingMutation && userSettings?.mutations && userSettings.mutations.length > 0 && (
                <div className="space-y-1.5 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                  <label className="font-bold text-gold-400 block mb-1">Import from Existing Genetics</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const selected = userSettings.mutations.find((m: any) => m.id === val);
                      if (selected) {
                        setMutationName(selected.name);
                        if (selected.inheritance) {
                          setMutationInheritance(selected.inheritance);
                        }
                        toast.success(`Imported "${selected.name}" mutation details!`);
                      }
                    }}
                    className="w-full bg-zinc-900 text-zinc-300 rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3 py-2 text-xs"
                  >
                    <option value="">-- Choose an existing mutation to pre-fill --</option>
                    {userSettings.mutations.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.inheritance ? `(${m.inheritance.replace(/_/g, ' ')})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500">Choosing an existing mutation pre-fills its name and inheritance mode.</p>
                </div>
              )}

              {/* Mutation Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-400">Mutation Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lutino, Albino, Opaline, Cinnamon..."
                  value={mutationName}
                  onChange={(e) => setMutationName(e.target.value)}
                  className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3.5 py-2.5 transition-all"
                />
              </div>

              {/* Inheritance Mode */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-400">Genetic Inheritance Pattern *</label>
                <select
                  value={mutationInheritance}
                  onChange={(e: any) => setMutationInheritance(e.target.value)}
                  className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3 py-2.5 transition-all text-xs"
                >
                  <option value="autosomal_recessive">Autosomal Recessive (Normal Split)</option>
                  <option value="autosomal_dominant">Autosomal Dominant</option>
                  <option value="incomplete_dominant">Incomplete Dominant</option>
                  <option value="sex_linked_recessive">Sex-Linked Recessive (X-Linked)</option>
                </select>
              </div>

              {/* Linked Species Class */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-400">Link to Species Class (Optional)</label>
                <select
                  value={mutationSpeciesId}
                  onChange={(e) => setMutationSpeciesId(e.target.value)}
                  className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3 py-2.5 transition-all text-xs"
                >
                  <option value="">-- Apply Globally to All Species --</option>
                  {wikiSpeciesList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-400">Description & Phenotype Visuals</label>
                <textarea
                  rows={3}
                  placeholder="Describe feather coloration changes, eye color changes, or key breeding rules..."
                  value={mutationDesc}
                  onChange={(e) => setMutationDesc(e.target.value)}
                  className="w-full bg-zinc-950 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3.5 py-2.5 transition-all resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsMutationModalOpen(false)}
                  className="bg-zinc-850 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gold-500 hover:bg-gold-400 text-black px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg"
                >
                  {editingMutation ? 'Save Rule' : 'Add Mutation Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MUTATION REFERENCE GALLERY MODAL */}
      {/* ========================================================= */}
      {activeMutationGallery && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 max-w-4xl w-full max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl p-6 relative text-xs">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-500/10 border border-gold-500/20 text-gold-400 rounded-xl">
                  <ImageIcon size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{activeMutationGallery.name} Mutation Reference Gallery</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Explore how this genetic mutation expresses across different species and breeds.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveMutationGallery(null)}
                className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Admin File Uploader box */}
            {isAdmin && (
              <div className="bg-zinc-950/60 border border-zinc-800 p-5 rounded-2xl mb-6 space-y-4">
                <h4 className="font-bold text-gold-400 text-xs">Upload New Reference Photo</h4>
                
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!refImageName.trim()) {
                      toast.error('Please name the reference image!');
                      return;
                    }
                    if (!refSpeciesName) {
                      toast.error('Please specify a species!');
                      return;
                    }
                    if (!refSubspeciesName) {
                      toast.error('Please specify a subspecies!');
                      return;
                    }

                    const fileInput = document.getElementById('mutation-ref-upload') as HTMLInputElement;
                    const file = fileInput?.files?.[0];
                    if (!file) {
                      toast.error('Please select an image file to upload!');
                      return;
                    }

                    setIsUploadingRef(true);
                    const toastId = toast.loading('Uploading reference photo...');
                    try {
                      const uploadedUrl = await compressAndUploadImage(file, `wikiMutations/${activeMutationGallery.id}`);
                      
                      const newRefImage: WikiMutationReferenceImage = {
                        id: 'ref_' + Math.random().toString(36).substring(7),
                        url: uploadedUrl,
                        name: refImageName.trim(),
                        speciesName: refSpeciesName.trim(),
                        subspeciesName: refSubspeciesName.trim()
                      };

                      const currentImages = Array.isArray(activeMutationGallery.referenceImages) 
                        ? activeMutationGallery.referenceImages 
                        : [];
                      
                      const updatedImages = [...currentImages, newRefImage];

                      await updateDoc(doc(db, 'wikiMutations', activeMutationGallery.id), {
                        referenceImages: updatedImages,
                        updatedAt: new Date().toISOString()
                      });

                      // Update local states
                      const updatedMutation = {
                        ...activeMutationGallery,
                        referenceImages: updatedImages
                      };
                      setActiveMutationGallery(updatedMutation);
                      
                      // Also update general list state in-place so we don't have to wait for server roundtrip
                      setWikiMutationsList(prev => prev.map(m => m.id === activeMutationGallery.id ? updatedMutation : m));

                      setRefImageName('');
                      setRefSpeciesName('');
                      setRefSubspeciesName('');
                      if (fileInput) fileInput.value = '';

                      toast.success('Reference photo uploaded successfully!', { id: toastId });
                    } catch (err: any) {
                      toast.error('Upload failed: ' + err.message, { id: toastId });
                    } finally {
                      setIsUploadingRef(false);
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                >
                  {/* Image Name */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="font-bold text-zinc-400">Photo Title / Label *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Lutino Cobalt Cockatiel"
                      value={refImageName}
                      onChange={(e) => setRefImageName(e.target.value)}
                      className="w-full bg-zinc-900 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3 py-2 text-xs"
                    />
                  </div>

                  {/* Species Dropdown Selector */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="font-bold text-zinc-400">Species Class *</label>
                    <select
                      value={refSpeciesName}
                      onChange={(e) => {
                        setRefSpeciesName(e.target.value);
                        setRefSubspeciesName('');
                      }}
                      required
                      className="w-full bg-zinc-900 text-zinc-300 rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3 py-2 text-xs"
                    >
                      <option value="">-- Choose Species --</option>
                      {wikiSpeciesList.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                      <option value="Other / Custom">Other / Custom</option>
                    </select>
                  </div>

                  {/* Subspecies/Breed Dropdown Selector */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="font-bold text-zinc-400">Subspecies / Breed *</label>
                    {refSpeciesName && refSpeciesName !== 'Other / Custom' ? (
                      <select
                        value={refSubspeciesName}
                        onChange={(e) => setRefSubspeciesName(e.target.value)}
                        required
                        className="w-full bg-zinc-900 text-zinc-300 rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3 py-2 text-xs"
                      >
                        <option value="">-- Choose Breed --</option>
                        {wikiSpeciesList.find(s => s.name === refSpeciesName)?.subspecies?.map(sub => (
                          <option key={sub.id} value={sub.name}>{sub.name}</option>
                        ))}
                        <option value="Other / Custom">Other / Custom</option>
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        required
                        placeholder="Type custom breed name"
                        value={refSubspeciesName}
                        onChange={(e) => setRefSubspeciesName(e.target.value)}
                        className="w-full bg-zinc-900 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3 py-2 text-xs"
                      />
                    )}
                  </div>

                  {/* File Selector & Submit */}
                  <div className="md:col-span-3 flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        required
                        id="mutation-ref-upload"
                        className="hidden"
                      />
                      <label 
                        htmlFor="mutation-ref-upload"
                        className="w-full bg-zinc-900 text-zinc-300 rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3 py-2 text-xs cursor-pointer flex items-center justify-center gap-1.5 font-bold hover:bg-zinc-800 transition-all text-center block"
                      >
                        <UploadCloud size={14} />
                        Select File
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isUploadingRef}
                      className="bg-gold-500 hover:bg-gold-400 text-black px-4 py-2 rounded-xl font-bold transition-all text-xs flex items-center gap-1 shrink-0 disabled:opacity-50"
                    >
                      {isUploadingRef ? <Loader2 size={14} className="animate-spin" /> : 'Upload'}
                    </button>
                  </div>

                  {/* Custom Species override input */}
                  {refSpeciesName === 'Other / Custom' && (
                    <div className="md:col-span-12 space-y-1 mt-1">
                      <label className="font-bold text-zinc-400">Custom Species Name *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Fischer's Lovebirds, Cockatiels"
                        onChange={(e) => setRefSpeciesName(e.target.value)}
                        className="w-full bg-zinc-900 text-white rounded-xl border border-zinc-800 focus:outline-none focus:border-gold-500 px-3 py-2 text-xs"
                      />
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Gallery Display Grid */}
            <div className="space-y-4">
              <h4 className="font-black text-white text-xs uppercase tracking-widest border-b border-zinc-800 pb-2">
                Reference Gallery ({activeMutationGallery.referenceImages?.length || 0} Images)
              </h4>

              {activeMutationGallery.referenceImages && activeMutationGallery.referenceImages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {activeMutationGallery.referenceImages.map((img) => (
                    <div 
                      key={img.id}
                      className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-md flex flex-col group relative"
                    >
                      {/* Name/Species/Subspecies Cards above Image */}
                      <div className="p-3 border-b border-zinc-800/60 bg-zinc-950">
                        <h5 className="font-black text-white text-[11px] truncate">{img.name}</h5>
                        <div className="flex gap-1 items-center mt-1 text-[9px] text-zinc-500">
                          <span className="font-bold truncate text-gold-500/90">{img.speciesName}</span>
                          <span>•</span>
                          <span className="truncate">{img.subspeciesName}</span>
                        </div>
                      </div>

                      {/* Image Frame */}
                      <div className="aspect-video relative overflow-hidden bg-black flex items-center justify-center">
                        <img 
                          src={img.url} 
                          alt={img.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        />

                        {/* Admin Delete overlay */}
                        {isAdmin && (
                          <button
                            onClick={async () => {
                              if (!window.confirm('Are you sure you want to delete this reference photo?')) return;
                              const currentImages = Array.isArray(activeMutationGallery.referenceImages)
                                ? activeMutationGallery.referenceImages
                                : [];
                              const updatedImages = currentImages.filter(i => i.id !== img.id);

                              const toastId = toast.loading('Deleting reference photo...');
                              try {
                                await updateDoc(doc(db, 'wikiMutations', activeMutationGallery.id), {
                                  referenceImages: updatedImages,
                                  updatedAt: new Date().toISOString()
                                });

                                const updatedMutation = {
                                  ...activeMutationGallery,
                                  referenceImages: updatedImages
                                };
                                setActiveMutationGallery(updatedMutation);
                                setWikiMutationsList(prev => prev.map(m => m.id === activeMutationGallery.id ? updatedMutation : m));

                                toast.success('Reference photo deleted.', { id: toastId });
                              } catch (err: any) {
                                toast.error('Failed to delete: ' + err.message, { id: toastId });
                              }
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/80 backdrop-blur-md rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950 border border-zinc-800/50 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                            title="Delete Reference Photo"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-zinc-500 bg-zinc-950/40 border border-zinc-850 rounded-2xl flex flex-col items-center justify-center gap-3">
                  <ImageIcon size={32} className="text-zinc-700" />
                  <p className="text-xs font-semibold text-zinc-400">No reference photos uploaded yet</p>
                  <p className="text-[10px] text-zinc-500 max-w-sm">
                    {isAdmin 
                      ? 'Use the form above to upload direct files showing how this mutation expresses on different birds!' 
                      : 'An administrator hasn&apos;t uploaded any visual representation references for this genetic mode yet.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
