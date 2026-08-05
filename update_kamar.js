const fs = require("fs");
let code = fs.readFileSync("src/components/humas/KamarSub.tsx", "utf8");

const targetBlock = `className={\`transition-colors cursor-grab active:cursor-grabbing group \${
                                               isOver && !isOwnSlot ? 'bg-purple-100/95 ring-2 ring-purple-500/90 z-10' : idx > 0 ? 'bg-purple-50/20 hover:bg-purple-50/40' : 'hover:bg-purple-50/20'
                                             }\`}`;

const replacementTr = `draggable={!isSelectionMode && canWriteCurrent}
                                             onClick={() => {
                                               if (isSelectionMode) {
                                                 if (selectedStudentIds.includes(s.id)) {
                                                   setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                                                 } else {
                                                   setSelectedStudentIds(prev => [...prev, s.id]);
                                                 }
                                               } else {
                                                 setSelectedSantriForDetail(s);
                                               }
                                             }}
                                             onDragStart={(e) => {
                                               if (isSelectionMode) return;
                                               setDraggedStudentId(s.id);
                                               e.dataTransfer.setData('text/plain', s.id);
                                               e.dataTransfer.effectAllowed = 'move';
                                             }}
                                             className={\`transition-colors cursor-pointer group \${
                                               isSelectionMode && selectedStudentIds.includes(s.id)
                                                 ? 'bg-purple-100/90 ring-1 ring-purple-300 shadow-2xs'
                                                 : isOver && !isOwnSlot 
                                                   ? 'bg-purple-100/95 ring-2 ring-purple-500/90 z-10' 
                                                   : 'hover:bg-purple-50/60 bg-white'
                                             }\`}`;

if (code.includes(targetBlock)) {
  code = code.replace(targetBlock, replacementTr);
  console.log("Replaced targetBlock successfully");
} else {
  console.error("targetBlock not found");
  // Let us find by substring
  const subIdx = code.indexOf("cursor-grab active:cursor-grabbing");
  console.log("cursor-grab index:", subIdx);
}

// Hide 3-dots in selection mode
code = code.replace(
  "{canWriteCurrent && (\n                                                     <button",
  "{canWriteCurrent && !isSelectionMode && (\n                                                     <button"
);

// Hide hover add row in selection mode
code = code.replace(
  "{occupants.length > 0 && !draggedStudentId && (\n                                       <tr",
  "{occupants.length > 0 && !draggedStudentId && !isSelectionMode && (\n                                       <tr"
);

fs.writeFileSync("src/components/humas/KamarSub.tsx", code, "utf8");
console.log("Updated KamarSub.tsx successfully");
