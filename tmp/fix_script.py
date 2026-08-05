import re

file_path = 'src/components/pendidikan/LembagaKelasSub.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

bad_str = 'className={}'
good_str = '''className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide transition-colors ${
  s.statusEmis === 'Terdaftar'
    ? 'bg-[#E6F4EA] text-[#137333] hover:bg-emerald-100'
    : s.statusEmis === 'Invalid'
    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
}`}'|'''.split("'|'")[0]

if bad_str in content:
    content = content.replace(bad_str, good_str, 1)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESSFULLY FIXED!")
else:
    print("bad_str not found")
