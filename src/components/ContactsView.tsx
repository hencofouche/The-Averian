import React from 'react';
import { Contact, Transaction } from '../types';
import { Users, Mail, Phone, MapPin, Edit2, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function ContactsView({ contacts, transactions, onEdit, onDelete, symbol = '$' }: { contacts: Contact[], transactions: Transaction[], onEdit: (c: Contact) => void, onDelete: (id: string) => void, symbol?: string }) {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map(contact => {
          const contactTransactions = transactions.filter(t => t.contactId === contact.id);
          const totalBought = contactTransactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
          const totalSold = contactTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);

          return (
            <div key={contact.id} className="bg-zinc-800 border border-black-700 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">{contact.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold-500">{contact.type}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(contact)} className="p-2 text-white/50 hover:text-white bg-black/20 rounded-lg transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => onDelete(contact.id)} className="p-2 text-red-500/50 hover:text-red-500 bg-red-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-black-200">
                {contact.email && <div className="flex items-center gap-2"><Mail size={14} /> {contact.email}</div>}
                {contact.phone && <div className="flex items-center gap-2"><Phone size={14} /> {contact.phone}</div>}
                {contact.address && <div className="flex items-center gap-2"><MapPin size={14} /> {contact.address}</div>}
              </div>

              <div className="pt-4 border-t border-black-700 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-black-400 mb-1">Total Bought From</p>
                  <p className="text-rose-500 font-bold flex items-center gap-1"><ArrowDownRight size={14} /> {symbol}{totalBought.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-black-400 mb-1">Total Sold To</p>
                  <p className="text-emerald-500 font-bold flex items-center gap-1"><ArrowUpRight size={14} /> {symbol}{totalSold.toFixed(2)}</p>
                </div>
              </div>
            </div>
          );
        })}
        {contacts.length === 0 && (
          <div className="col-span-full text-center py-12 bg-black/50 border border-dashed border-black-700 rounded-2xl">
            <Users size={32} className="mx-auto text-white mb-2" />
            <p className="text-white text-sm font-bold uppercase tracking-widest">No contacts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
