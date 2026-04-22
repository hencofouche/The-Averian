import React from 'react';
import { Contact, Transaction } from '../types';
import { Users, Mail, Phone, MapPin, Edit2, Trash2, ArrowUpRight, ArrowDownRight, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-zinc-900 border border-black-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500", className)} {...props}>
    {children}
  </div>
);

export function ContactsView({ 
  contacts, 
  transactions, 
  viewMode,
  onEdit, 
  onDelete, 
  symbol = '$' 
}: { 
  contacts: Contact[], 
  transactions: Transaction[], 
  viewMode: 'grid-large' | 'list',
  onEdit: (c: Contact) => void, 
  onDelete: (id: string) => void, 
  symbol?: string 
}) {
  const getWhatsAppLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return `https://wa.me/${cleaned}`;
  };

  if (viewMode === 'list') {
    return (
      <div className="space-y-3 max-w-4xl mx-auto">
        {contacts.map(contact => {
          const contactTransactions = transactions.filter(t => t.contactId === contact.id);
          const totalBought = contactTransactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
          const totalSold = contactTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);

          return (
            <Card key={contact.id} className="p-4 bg-zinc-800 border-black-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-zinc-800/80">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-black text-white truncate uppercase tracking-tight">{contact.name}</h3>
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded-full border border-gold-500/20">{contact.type}</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-black-300 font-bold uppercase tracking-widest leading-none">
                  {contact.phone && (
                    <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                      <Phone size={10} className="text-gold-500/70" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={10} className="text-gold-500/70" />
                      <span className="truncate max-w-[150px]">{contact.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 sm:border-l sm:border-black-700 sm:pl-4 w-full sm:w-auto overflow-x-auto no-scrollbar py-1">
                <div className="shrink-0 text-right">
                  <p className="text-[7px] font-black text-black-400 uppercase tracking-widest mb-0.5">Performance</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-rose-500 whitespace-nowrap">{symbol}{totalBought.toFixed(0)}</span>
                    <span className="text-[10px] font-bold text-emerald-500 whitespace-nowrap">{symbol}{totalSold.toFixed(0)}</span>
                  </div>
                </div>
                
                <div className="flex gap-1.5 ml-auto">
                  {contact.phone && (
                    <a 
                      href={getWhatsAppLink(contact.phone)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-2 text-emerald-500 hover:bg-emerald-500/10 bg-black/40 border border-emerald-500/20 rounded-xl transition-all active:scale-95"
                    >
                      <MessageCircle size={14} />
                    </a>
                  )}
                  <button onClick={() => onEdit(contact)} className="p-2 text-white/50 hover:text-white bg-black/40 border border-white/5 rounded-xl transition-all active:scale-95">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => onDelete(contact.id)} className="p-2 text-rose-500/50 hover:text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl transition-all active:scale-95">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
        {contacts.length === 0 && <EmptyContacts />}
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-1 sm:px-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 overflow-hidden">
        {contacts.map(contact => {
          const contactTransactions = transactions.filter(t => t.contactId === contact.id);
          const totalBought = contactTransactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
          const totalSold = contactTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);

          return (
            <Card key={contact.id} className="bg-zinc-900/40 backdrop-blur-sm border-black-800 hover:border-gold-500/40 transition-all duration-300 p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white truncate uppercase tracking-tight">{contact.name}</h3>
                  <div className="mt-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gold-500 bg-gold-500/5 px-2 py-0.5 rounded border border-gold-500/10">
                      {contact.type}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onEdit(contact)} className="p-2 text-white/30 hover:text-white bg-black/20 rounded-lg transition-all active:scale-90"><Edit2 size={14} /></button>
                  <button onClick={() => onDelete(contact.id)} className="p-2 text-rose-500/30 hover:text-rose-500 bg-rose-500/5 rounded-lg transition-all active:scale-90"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="space-y-3">
                {contact.phone && (
                  <div className="group flex items-center justify-between gap-2 p-2 bg-black/30 rounded-xl border border-white/5 hover:border-gold-500/20 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 bg-gold-500/10 rounded-lg">
                        <Phone size={12} className="text-gold-500" />
                      </div>
                      <span className="text-[10px] font-bold text-white/70 truncate">{contact.phone}</span>
                    </div>
                    <a 
                      href={getWhatsAppLink(contact.phone)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black rounded-lg transition-all active:scale-90"
                      title="WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </a>
                  </div>
                )}
                
                {contact.email && (
                  <div className="flex items-center gap-2.5 p-2 bg-black/20 rounded-xl border border-white/5">
                    <div className="p-1.5 bg-zinc-700/50 rounded-lg shrink-0">
                      <Mail size={12} className="text-white/40" />
                    </div>
                    <span className="text-[10px] font-medium text-white/50 truncate break-all">{contact.email}</span>
                  </div>
                )}

                {contact.address && (
                  <div className="flex items-start gap-2.5 p-2 bg-black/20 rounded-xl border border-white/5">
                    <div className="p-1.5 bg-zinc-700/50 rounded-lg shrink-0">
                      <MapPin size={12} className="text-white/40" />
                    </div>
                    <span className="text-[10px] font-medium text-white/50 line-clamp-2">{contact.address}</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-black-800 grid grid-cols-2 gap-3">
                <div className="p-2 bg-rose-500/5 rounded-xl border border-rose-500/10">
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-rose-500/50 mb-1">Bought</p>
                  <p className="text-xs font-black text-rose-500 truncate">{symbol}{totalBought.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                  <p className="text-[8px] font-black uppercase tracking-[0.15em] text-emerald-500/50 mb-1">Sold</p>
                  <p className="text-xs font-black text-emerald-500 truncate">{symbol}{totalSold.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          );
        })}
        {contacts.length === 0 && <EmptyContacts />}
      </div>
    </div>
  );
}

function EmptyContacts() {
  return (
    <div className="col-span-full py-20 text-center bg-black-900/30 border border-dashed border-black-800 rounded-3xl">
      <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
        <Users size={32} className="text-black-300" />
      </div>
      <p className="text-black-100 font-black uppercase tracking-widest">No contacts found</p>
      <p className="text-[10px] text-black-400 uppercase tracking-widest mt-2">Add contacts to track sales and purchases</p>
    </div>
  );
}

