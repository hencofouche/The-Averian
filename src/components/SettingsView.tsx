import React, { useState, useMemo } from 'react';
import { 
  User, Bird as BirdIcon, GitBranch, Tag, Activity, 
  ChevronRight, Edit2, Trash2, Plus, Sliders, Type, Hash, 
  Image as ImageIcon, Cloud, History as HistoryIcon, 
  ArrowRightLeft, Send, CheckCircle2, Shield, Flame
} from 'lucide-react';
import { 
  UserSettings, CustomBirdFieldDefinition, SharedItem 
} from '../types';
import { Button, Input, Select, Badge, Card } from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { defaultSpecies } from '../lib/default-data';
import { db, auth } from '../firebase';
import { doc, writeBatch, collection, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';

export function SettingsView({ 
  settings, 
  onUpdate, 
  allData, 
  user, 
  isSyncing, 
  setDeleteConfirmation, 
  allSharedItems, 
  setAllSharedItems 
}: { 
  settings: UserSettings; 
  onUpdate: (s: UserSettings) => void; 
  allData: any; 
  user: any; 
  isSyncing: boolean; 
  setDeleteConfirmation: (data: any) => void; 
  allSharedItems: SharedItem[]; 
  setAllSharedItems: React.Dispatch<React.SetStateAction<SharedItem[]>>; 
}) {
  const [activeSection, setActiveSection] = useState<'general' | 'species' | 'subspecies' | 'mutations' | 'statuses' | 'customFields' | 'data' | null>('general');
  const [newSpecies, setNewSpecies] = useState('');
  const [newMutation, setNewMutation] = useState('');
  const [newMutationInheritance, setNewMutationInheritance] = useState<'autosomal_recessive' | 'autosomal_dominant' | 'incomplete_dominant' | 'sex_linked_recessive' | ''>('');
  const [newStatus, setNewStatus] = useState('');
  const [newSubSpecies, setNewSubSpecies] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('');
  const [editingItem, setEditingItem] = useState<{ type: 'species' | 'subspecies' | 'mutation' | 'status', id: string, name: string, inheritance?: 'autosomal_recessive' | 'autosomal_dominant' | 'incomplete_dominant' | 'sex_linked_recessive' } | null>(null);

  // Custom Field Form State
  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const [newCustomFieldType, setNewCustomFieldType] = useState<'text' | 'number'>('text');
  const [newCustomFieldDescription, setNewCustomFieldDescription] = useState('');
  const [editingCustomField, setEditingCustomField] = useState<CustomBirdFieldDefinition | null>(null);

  const availableSpecies = useMemo(() => {
    const list = [...(settings.species || [])];
    if (settings.useDefaultData !== false) {
      defaultSpecies.forEach(ds => {
        if (!list.some(s => s.name.toLowerCase() === ds.name.toLowerCase() || s.id === ds.id)) {
          list.push({ id: ds.id, name: ds.name });
        }
      });
    }
    return list;
  }, [settings.species, settings.useDefaultData]);

  const downloadBackup = () => {
    const data = JSON.stringify(allData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aviary_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addSpecies = () => {
    if (!newSpecies.trim()) return;
    onUpdate({ ...settings, species: [...(settings.species || []), { id: crypto.randomUUID(), name: newSpecies.trim() }] });
    setNewSpecies('');
  };

  const addMutation = () => {
    if (!newMutation.trim()) return;
    onUpdate({ 
      ...settings, 
      mutations: [
        ...(settings.mutations || []), 
        { 
          id: crypto.randomUUID(), 
          name: newMutation.trim(), 
          inheritance: newMutationInheritance || undefined 
        }
      ] 
    });
    setNewMutation('');
    setNewMutationInheritance('');
  };

  const addStatus = () => {
    if (!newStatus.trim()) return;
    onUpdate({ ...settings, statuses: [...(settings.statuses || []), { id: crypto.randomUUID(), name: newStatus.trim() }] });
    setNewStatus('');
  };

  const addSubSpecies = () => {
    if (!newSubSpecies.trim() || !selectedSpeciesId) return;
    onUpdate({ ...settings, subspecies: [...(settings.subspecies || []), { id: crypto.randomUUID(), name: newSubSpecies.trim(), speciesId: selectedSpeciesId }] });
    setNewSubSpecies('');
  };

  const handleEdit = () => {
    if (!editingItem || !editingItem.name.trim()) return;
    const newSettings = { ...settings };
    if (editingItem.type === 'species') {
      newSettings.species = newSettings.species.map(s => s.id === editingItem.id ? { ...s, name: editingItem.name.trim() } : s);
    } else if (editingItem.type === 'subspecies') {
      newSettings.subspecies = newSettings.subspecies.map(ss => ss.id === editingItem.id ? { ...ss, name: editingItem.name.trim() } : ss);
    } else if (editingItem.type === 'mutation') {
      newSettings.mutations = newSettings.mutations.map(m => m.id === editingItem.id ? { ...m, name: editingItem.name.trim(), inheritance: editingItem.inheritance } : m);
    } else if (editingItem.type === 'status') {
      newSettings.statuses = newSettings.statuses?.map(s => s.id === editingItem.id ? { ...s, name: editingItem.name.trim() } : s) || [];
    }
    onUpdate(newSettings);
    setEditingItem(null);
  };

  const removeSpecies = (id: string, name: string) => {
    setDeleteConfirmation({
      title: 'Delete Species',
      message: `Are you sure you want to delete "${name}"? All associated sub-species will also be removed.`,
      onConfirm: () => {
        onUpdate({ 
          ...settings, 
          species: settings.species.filter(s => s.id !== id),
          subspecies: settings.subspecies.filter(ss => ss.speciesId !== id)
        });
        toast.success('Species removed');
      }
    });
  };

  const removeSubSpecies = (id: string, name: string) => {
    setDeleteConfirmation({
      title: 'Delete Sub-species',
      message: `Are you sure you want to delete "${name}"?`,
      onConfirm: () => {
        onUpdate({ ...settings, subspecies: settings.subspecies.filter(ss => ss.id !== id) });
        toast.success('Sub-species removed');
      }
    });
  };

  const removeMutation = (id: string, name: string) => {
    setDeleteConfirmation({
      title: 'Delete Mutation',
      message: `Are you sure you want to delete "${name}"? It will also be removed from all birds currently having this mutation.`,
      onConfirm: async () => {
        try {
          const nextMutations = settings.mutations.filter(m => m.id !== id);
          const batch = writeBatch(db);
          const affectedBirds = (allData.birds || []).filter((b: any) => 
            b.mutations?.includes(name) || b.splitMutations?.includes(name)
          );

          affectedBirds.forEach((b: any) => {
            batch.update(doc(db, 'birds', b.id), {
              mutations: b.mutations?.filter((m: string) => m !== name) || [],
              splitMutations: b.splitMutations?.filter((m: string) => m !== name) || []
            });
          });

          await batch.commit();
          onUpdate({ ...settings, mutations: nextMutations });
          toast.success('Mutation removed from settings and all associated birds');
        } catch (e) {
          console.error("Failed to delete mutation: ", e);
          toast.error("Failed to remove mutation from birds or settings");
        }
      }
    });
  };

  const removeStatus = (id: string, name: string) => {
    setDeleteConfirmation({
      title: 'Delete Status',
      message: `Are you sure you want to delete status "${name}"?`,
      onConfirm: () => {
        onUpdate({ ...settings, statuses: settings.statuses?.filter(s => s.id !== id) || [] });
        toast.success('Status removed');
      }
    });
  };

  // Custom Fields Handlers
  const addCustomField = () => {
    if (!newCustomFieldName.trim()) {
      toast.error('Please enter a name for the custom field');
      return;
    }
    const cleanName = newCustomFieldName.trim();
    const existing = (settings.customBirdFields || []).some(f => f.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      toast.error(`A field named "${cleanName}" already exists`);
      return;
    }

    const desc = newCustomFieldDescription.trim();
    const newField: CustomBirdFieldDefinition = {
      id: `cf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      type: newCustomFieldType,
      createdAt: new Date().toISOString()
    };
    if (desc) {
      newField.description = desc;
    }

    onUpdate({
      ...settings,
      customBirdFields: [...(settings.customBirdFields || []), newField]
    });

    setNewCustomFieldName('');
    setNewCustomFieldDescription('');
    setNewCustomFieldType('text');
    toast.success(`Custom field "${newField.name}" added successfully`);
  };

  const handleEditCustomField = () => {
    if (!editingCustomField || !editingCustomField.name.trim()) return;
    const desc = editingCustomField.description?.trim();
    onUpdate({
      ...settings,
      customBirdFields: (settings.customBirdFields || []).map(f => {
        if (f.id === editingCustomField.id) {
          const updated: CustomBirdFieldDefinition = {
            id: editingCustomField.id,
            name: editingCustomField.name.trim(),
            type: editingCustomField.type,
            createdAt: editingCustomField.createdAt || new Date().toISOString()
          };
          if (desc) {
            updated.description = desc;
          }
          return updated;
        }
        return f;
      })
    });
    setEditingCustomField(null);
    toast.success('Custom field updated');
  };

  const removeCustomField = (id: string, name: string) => {
    setDeleteConfirmation({
      title: 'Delete Custom Field',
      message: `Are you sure you want to delete custom field "${name}"? Existing data stored on birds will remain intact in history unless updated.`,
      onConfirm: () => {
        onUpdate({
          ...settings,
          customBirdFields: (settings.customBirdFields || []).filter(f => f.id !== id)
        });
        toast.success(`Custom field "${name}" removed`);
      }
    });
  };

  const SettingRow = ({ icon: Icon, title, description, active, onClick }: { icon: any, title: string, description: string, active: boolean, onClick: () => void }) => (
    <button 
      type="button"
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left cursor-pointer",
        active 
          ? "bg-gold-500/10 border-gold-500/50 shadow-lg shadow-gold-500/5" 
          : "bg-black-900 border-black-800 hover:border-black-700"
      )}
    >
      <div className={cn("p-3 rounded-xl", active ? "bg-gold-500 text-black" : "bg-zinc-800 text-gold-500")}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <h4 className={cn("font-black uppercase tracking-widest text-sm", active ? "text-gold-500" : "text-white")}>{title}</h4>
        <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter mt-0.5">{description}</p>
      </div>
      <ChevronRight size={20} className={cn("transition-transform", active ? "rotate-90 text-gold-500" : "text-black-200")} />
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 min-h-[600px] flex flex-col lg:flex-row gap-8">
      {/* Sidebar / Categories */}
      <div className="w-full lg:w-80 space-y-3 flex-shrink-0">
        <SettingRow 
          icon={User} 
          title="General" 
          description="Language & Currency" 
          active={activeSection === 'general'} 
          onClick={() => setActiveSection('general')} 
        />
        <SettingRow 
          icon={BirdIcon} 
          title="Species" 
          description="Manage Bird Species" 
          active={activeSection === 'species'} 
          onClick={() => setActiveSection('species')} 
        />
        <SettingRow 
          icon={GitBranch} 
          title="Sub-Species" 
          description="Manage Sub-Species" 
          active={activeSection === 'subspecies'} 
          onClick={() => setActiveSection('subspecies')} 
        />
        <SettingRow 
          icon={Tag} 
          title="Mutations" 
          description="Manage Mutations" 
          active={activeSection === 'mutations'} 
          onClick={() => setActiveSection('mutations')} 
        />
        <SettingRow 
          icon={Tag} 
          title="Statuses" 
          description="Manage Statuses" 
          active={activeSection === 'statuses'} 
          onClick={() => setActiveSection('statuses')} 
        />
        <SettingRow 
          icon={Sliders} 
          title="Custom Bird Fields" 
          description="Add & Manage Bird Fields" 
          active={activeSection === 'customFields'} 
          onClick={() => setActiveSection('customFields')} 
        />
        <SettingRow 
          icon={Activity} 
          title="Data Management" 
          description="Backup & Export" 
          active={activeSection === 'data'} 
          onClick={() => setActiveSection('data')} 
        />
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 bg-zinc-950/40 border border-black-800 rounded-3xl p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {activeSection === 'general' && (
            <motion.div 
              key="general"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">General Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Language</label>
                    <Select 
                      value={settings.language || 'en'} 
                      onChange={e => onUpdate({ ...settings, language: e.target.value as any })}
                    >
                      <option value="en" className="bg-black text-white">English</option>
                      <option value="af" className="bg-black text-white">Afrikaans</option>
                      <option value="es" className="bg-black text-white">Español</option>
                      <option value="fr" className="bg-black text-white">Français</option>
                      <option value="de" className="bg-black text-white">Deutsch</option>
                      <option value="it" className="bg-black text-white">Italiano</option>
                      <option value="pt" className="bg-black text-white">Português</option>
                      <option value="nl" className="bg-black text-white">Nederlands</option>
                      <option value="tr" className="bg-black text-white">Türkçe</option>
                      <option value="ar" className="bg-black text-white">العربية</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Currency</label>
                    <Select 
                      value={settings.currency || 'USD'} 
                      onChange={e => onUpdate({ ...settings, currency: e.target.value })}
                    >
                      <option value="USD" className="bg-black text-white">USD ($)</option>
                      <option value="ZAR" className="bg-black text-white">ZAR (R)</option>
                      <option value="EUR" className="bg-black text-white">EUR (€)</option>
                      <option value="GBP" className="bg-black text-white">GBP (£)</option>
                      <option value="AUD" className="bg-black text-white">AUD (A$)</option>
                      <option value="CAD" className="bg-black text-white">CAD (C$)</option>
                      <option value="CHF" className="bg-black text-white">CHF (CHF)</option>
                      <option value="JPY" className="bg-black text-white">JPY (¥)</option>
                      <option value="INR" className="bg-black text-white">INR (₹)</option>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'species' && (
            <motion.div 
              key="species"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">Manage Species</h3>
                  <Badge variant="info">{settings.species?.length || 0} Custom</Badge>
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="New species name..." 
                    value={newSpecies} 
                    onChange={e => setNewSpecies(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && addSpecies()} 
                  />
                  <Button onClick={addSpecies} variant="secondary" className="px-4"><Plus size={18} /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {settings.species?.map(s => (
                    <div key={s.id} className="p-3 bg-black border border-black-700 rounded-xl flex items-center justify-between group">
                      <span className="text-sm font-bold text-white">{s.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingItem({ type: 'species', id: s.id, name: s.name })} className="text-black-200 hover:text-secondary p-1.5 bg-zinc-800 rounded-lg transition-all"><Edit2 size={14} /></button>
                        <button 
                          onClick={() => removeSpecies(s.id, s.name)} 
                          className="p-1.5 rounded-lg transition-all"
                          style={{
                            backgroundColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)`,
                            color: 'var(--theme-delete-color, #ef4444)',
                            borderColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)`,
                            borderWidth: '1px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'subspecies' && (
            <motion.div 
              key="subspecies"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">Manage Sub-Species</h3>
                  <Badge variant="info">{settings.subspecies?.length || 0} Total</Badge>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="w-full sm:w-64">
                    <Select value={selectedSpeciesId} onChange={e => setSelectedSpeciesId(e.target.value)}>
                      <option value="" className="bg-black text-white">Select Parent Species...</option>
                      {availableSpecies.map(s => (
                        <option key={s.id} value={s.id} className="bg-black text-white">{s.name}</option>
                      ))}
                    </Select>
                  </div>
                  <Input placeholder="New sub-species name..." value={newSubSpecies} onChange={e => setNewSubSpecies(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubSpecies()} />
                  <Button onClick={addSubSpecies} variant="secondary" className="px-4" disabled={!selectedSpeciesId}><Plus size={18} /></Button>
                </div>
                <div className="space-y-4 pt-2">
                  {availableSpecies.map(s => {
                    const subs = settings.subspecies?.filter(ss => ss.speciesId === s.id) || [];
                    if (subs.length === 0) return null;
                    return (
                      <div key={s.id} className="space-y-2 p-4 bg-black-900 border border-black-800 rounded-2xl">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gold-500">{s.name}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {subs.map(ss => (
                            <div key={ss.id} className="p-2.5 bg-black border border-black-700 rounded-xl flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{ss.name}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setEditingItem({ type: 'subspecies', id: ss.id, name: ss.name })} className="text-black-200 hover:text-secondary p-1 bg-zinc-800 rounded-lg"><Edit2 size={12} /></button>
                                <button onClick={() => removeSubSpecies(ss.id, ss.name)} className="p-1 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'mutations' && (
            <motion.div 
              key="mutations"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">Manage Mutations</h3>
                  <Badge variant="info">{settings.mutations?.length || 0} Total</Badge>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Input placeholder="New mutation name..." value={newMutation} onChange={e => setNewMutation(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMutation()} />
                  </div>
                  <div className="w-full sm:w-64">
                    <Select value={newMutationInheritance} onChange={e => setNewMutationInheritance(e.target.value as any)}>
                      <option value="" className="bg-black text-white">None (Select in Calculator)</option>
                      <option value="autosomal_recessive" className="bg-black text-white">Recessive</option>
                      <option value="autosomal_dominant" className="bg-black text-white">Dominant</option>
                      <option value="incomplete_dominant" className="bg-black text-white">Incomplete Dominant</option>
                      <option value="sex_linked_recessive" className="bg-black text-white">Sex-linked Recessive</option>
                    </Select>
                  </div>
                  <Button onClick={addMutation} variant="secondary" className="px-4 shrink-0"><Plus size={18} /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {settings.mutations?.map(m => (
                    <div key={m.id} className="p-3 bg-black border border-black-700 rounded-xl flex items-center justify-between group">
                      <span className="text-sm font-bold text-white">{m.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingItem({ type: 'mutation', id: m.id, name: m.name, inheritance: m.inheritance as any })} className="text-black-200 hover:text-secondary p-1.5 bg-zinc-800 rounded-lg transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => removeMutation(m.id, m.name)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'statuses' && (
            <motion.div 
              key="statuses"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">Manage Statuses</h3>
                  <Badge variant="info">{settings.statuses?.length || 0} Total</Badge>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="New status name..." value={newStatus} onChange={e => setNewStatus(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStatus()} />
                  <Button onClick={addStatus} variant="secondary" className="px-4"><Plus size={18} /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {settings.statuses?.map(s => (
                    <div key={s.id} className="p-3 bg-black border border-black-700 rounded-xl flex items-center justify-between group">
                      <span className="text-sm font-bold text-white">{s.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingItem({ type: 'status', id: s.id, name: s.name })} className="text-black-200 hover:text-secondary p-1.5 bg-zinc-800 rounded-lg transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => removeStatus(s.id, s.name)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* --- NEW CUSTOM BIRD FIELDS SECTION --- */}
          {activeSection === 'customFields' && (
            <motion.div 
              key="customFields"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-widest text-gold-500 flex items-center gap-2">
                      <Sliders size={20} />
                      Custom Bird Fields
                    </h3>
                    <p className="text-xs text-white/60 mt-1">
                      Add custom fields to record additional data on your birds (e.g. Ring Size, Weight, Wing Span, Microchip ID).
                    </p>
                  </div>
                  <Badge variant="info">{(settings.customBirdFields?.length || 0)} Configured</Badge>
                </div>

                {/* Add New Field Card */}
                <div className="p-5 bg-black-900 border border-black-800 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <Plus size={14} className="text-gold-500" />
                    Add New Custom Field
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6 space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Field Name *</label>
                      <Input 
                        placeholder="e.g. Ring Size, Weight (g), Microchip ID..." 
                        value={newCustomFieldName} 
                        onChange={e => setNewCustomFieldName(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && addCustomField()} 
                      />
                    </div>
                    
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Field Type *</label>
                      <Select 
                        value={newCustomFieldType} 
                        onChange={e => setNewCustomFieldType(e.target.value as 'text' | 'number')}
                      >
                        <option value="text" className="bg-black text-white">Text (Aa)</option>
                        <option value="number" className="bg-black text-white">Numerical (#)</option>
                      </Select>
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <Button 
                        onClick={addCustomField} 
                        variant="primary" 
                        className="w-full py-2.5 flex items-center justify-center gap-1.5 text-xs font-black uppercase"
                      >
                        <Plus size={16} /> Add
                      </Button>
                    </div>

                    <div className="sm:col-span-12 space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Optional Helper Text / Description</label>
                      <Input 
                        placeholder="e.g. In grams or millimeters (shows as guidance in bird form)" 
                        value={newCustomFieldDescription} 
                        onChange={e => setNewCustomFieldDescription(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && addCustomField()} 
                      />
                    </div>
                  </div>
                </div>

                {/* List of Custom Fields */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                    Active Fields ({settings.customBirdFields?.length || 0})
                  </h4>

                  {(!settings.customBirdFields || settings.customBirdFields.length === 0) ? (
                    <div className="p-8 text-center bg-black/40 border border-dashed border-zinc-800 rounded-2xl space-y-2">
                      <Sliders size={28} className="mx-auto text-zinc-600" />
                      <p className="text-sm font-bold text-white/70">No custom fields created yet</p>
                      <p className="text-xs text-white/40 max-w-md mx-auto">
                        Add a numerical or text field above to start capturing specialized metrics and notes on your birds.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {settings.customBirdFields.map(field => (
                        <div 
                          key={field.id} 
                          className="p-4 bg-black border border-black-700 hover:border-gold-500/40 rounded-2xl flex flex-col justify-between gap-3 group transition-all"
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-bold text-white text-sm truncate">{field.name}</h5>
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0",
                                field.type === 'number' 
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              )}>
                                {field.type === 'number' ? <Hash size={10} /> : <Type size={10} />}
                                {field.type === 'number' ? 'Numerical' : 'Text'}
                              </span>
                            </div>
                            {field.description && (
                              <p className="text-[11px] text-zinc-400 italic line-clamp-2">{field.description}</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[10px]">
                            <span className="text-zinc-500 font-mono text-[9px]">
                              {field.createdAt ? format(new Date(field.createdAt), 'MMM dd, yyyy') : 'Active'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button 
                                type="button"
                                onClick={() => setEditingCustomField(field)} 
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="Edit Field"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => removeCustomField(field.id, field.name)} 
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                                title="Delete Field"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'data' && (
            <motion.div 
              key="data"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">Data Management</h3>
                <div className="p-6 bg-black border border-black-700 rounded-3xl space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gold-500/10 rounded-2xl text-gold-500">
                      <ImageIcon size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-white">Manual Backup</h4>
                      <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter mt-0.5">Download all your records as a JSON file</p>
                    </div>
                  </div>
                  <Button onClick={downloadBackup} className="w-full py-4">Download Backup Now</Button>
                </div>

                <div className="bg-black-900 border border-black-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gold-500/10 rounded-2xl text-gold-500">
                      <Cloud size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black uppercase tracking-widest text-white">Cloud Sync</h4>
                      <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter mt-0.5">
                        {isSyncing ? 'Syncing changes...' : 'All data backed up online'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Shared Items History */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-3">
                    <HistoryIcon size={20} className="text-gold-500" />
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-white">Shared & Transferred Items</h4>
                      <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">Manage links created for other breeders</p>
                    </div>
                  </div>

                  {allSharedItems.length === 0 ? (
                    <p className="text-xs text-white/40 italic p-4 bg-black/40 rounded-xl">No active shared links found.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                      {allSharedItems.map(item => {
                        const url = `${window.location.origin}?${item.action === 'transfer' ? 'transferId' : 'shareId'}=${item.id}`;
                        return (
                          <div key={item.id} className="p-3 bg-black border border-black-700 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={item.action === 'transfer' ? 'warning' : 'neutral'} className="text-[8px] uppercase">
                                  {item.action || 'share'} • {item.type}
                                </Badge>
                                <span className="text-white/40 text-[9px]">{item.createdAt ? format(new Date(item.createdAt), 'MMM dd, HH:mm') : ''}</span>
                              </div>
                              <p className="text-white font-mono text-[10px] truncate mt-1">{url}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(url);
                                  toast.success('Link copied to clipboard');
                                }}
                                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                title="Copy Link"
                              >
                                <Send size={12} />
                              </button>
                              <button 
                                onClick={() => {
                                  setDeleteConfirmation({
                                    title: 'Delete Shared Link',
                                    message: 'Are you sure you want to delete this shared link? Others will no longer be able to access or import it.',
                                    onConfirm: async () => {
                                      try {
                                        await deleteDoc(doc(db, 'shared_items', item.id));
                                        setAllSharedItems(prev => prev.filter(i => i.id !== item.id));
                                        toast.success('Shared item deleted');
                                      } catch (err) {
                                        toast.error('Failed to delete shared item');
                                      }
                                    }
                                  });
                                }}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                title="Delete Link"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Standard Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
            <h4 className="font-black text-sm uppercase tracking-wider text-white">Edit {editingItem.type}</h4>
            <Input 
              value={editingItem.name} 
              onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} 
              onKeyDown={e => e.key === 'Enter' && handleEdit()}
            />
            {editingItem.type === 'mutation' && (
              <Select 
                value={editingItem.inheritance || ''} 
                onChange={e => setEditingItem({ ...editingItem, inheritance: e.target.value as any })}
              >
                <option value="" className="bg-black text-white">None</option>
                <option value="autosomal_recessive" className="bg-black text-white">Recessive</option>
                <option value="autosomal_dominant" className="bg-black text-white">Dominant</option>
                <option value="incomplete_dominant" className="bg-black text-white">Incomplete Dominant</option>
                <option value="sex_linked_recessive" className="bg-black text-white">Sex-linked Recessive</option>
              </Select>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" onClick={() => setEditingItem(null)} className="px-4 py-2 text-xs">Cancel</Button>
              <Button variant="primary" onClick={handleEdit} className="px-4 py-2 text-xs">Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Custom Field Modal */}
      {editingCustomField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
            <h4 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
              <Edit2 size={16} className="text-gold-500" />
              Edit Custom Field
            </h4>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Field Name *</label>
                <Input 
                  value={editingCustomField.name} 
                  onChange={e => setEditingCustomField({ ...editingCustomField, name: e.target.value })} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Field Type</label>
                <Select 
                  value={editingCustomField.type} 
                  onChange={e => setEditingCustomField({ ...editingCustomField, type: e.target.value as 'text' | 'number' })}
                >
                  <option value="text" className="bg-black text-white">Text (Aa)</option>
                  <option value="number" className="bg-black text-white">Numerical (#)</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Description / Prompt</label>
                <Input 
                  value={editingCustomField.description || ''} 
                  onChange={e => setEditingCustomField({ ...editingCustomField, description: e.target.value })} 
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" onClick={() => setEditingCustomField(null)} className="px-4 py-2 text-xs font-bold">Cancel</Button>
              <Button variant="primary" onClick={handleEditCustomField} className="px-5 py-2 text-xs font-black uppercase">Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
