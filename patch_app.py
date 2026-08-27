with open('src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target_block = """      {/* Yoco Compliance & Verification Sharing Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-950 border border-gold-500/30 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center shrink-0 border border-gold-500/40">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              Yoco Gateway Public Verification Page
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Share our public landing page with Yoco's compliance team for payment gateway verification. No login required.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <Button
            onClick={onOpenLanding}
            variant="secondary"
            className="flex-1 md:flex-initial bg-zinc-800 hover:bg-zinc-700 text-gold-300 font-bold text-xs py-2.5 px-4 rounded-xl border border-gold-500/30"
          >
            <Eye size={14} />
            Preview Landing Page
          </Button>
          <Button
            onClick={() => {
              const shareUrl = `${window.location.origin}${window.location.pathname}?page=landing`;
              navigator.clipboard.writeText(shareUrl);
              toast.success('Public Yoco verification link copied to clipboard!');
            }}
            className="flex-1 md:flex-initial bg-gold-500 hover:bg-gold-400 text-black font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-gold-500/10"
          >
            <Copy size={14} />
            Copy Link
          </Button>
        </div>
      </div>"""

new_block = """      {/* Yoco Compliance & Verification Sharing Card */}
      {settings.role === 'admin' && (
        <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-950 border border-gold-500/30 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center shrink-0 border border-gold-500/40">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                Yoco Gateway Public Verification Page
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Share our public landing page with Yoco's compliance team for payment gateway verification. No login required.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <Button
              onClick={onOpenLanding}
              variant="secondary"
              className="flex-1 md:flex-initial bg-zinc-800 hover:bg-zinc-700 text-gold-300 font-bold text-xs py-2.5 px-4 rounded-xl border border-gold-500/30"
            >
              <Eye size={14} />
              Preview Landing Page
            </Button>
            <Button
              onClick={() => {
                const shareUrl = `${window.location.origin}/testsiteappyoco`;
                navigator.clipboard.writeText(shareUrl);
                toast.success('Public Yoco verification link copied to clipboard!');
              }}
              className="flex-1 md:flex-initial bg-gold-500 hover:bg-gold-400 text-black font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-gold-500/10"
            >
              <Copy size={14} />
              Copy Link
            </Button>
          </div>
        </div>
      )}"""

if target_block in code:
    code = code.replace(target_block, new_block)
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Successfully patched Yoco block!")
else:
    print("Could not find target_block in src/App.tsx.")
