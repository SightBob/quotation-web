"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { formatBaht, lineAmount } from "@/lib/money";
import { toSatang } from "@/lib/money";
import type { FormItem } from "@/lib/form";

interface Props {
  items: FormItem[];
  onChange: (items: FormItem[]) => void;
  errors?: Record<string, string>;
  products: string[];
}

export function ItemsEditor({ items, onChange, errors, products }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function update(id: string, patch: Partial<FormItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  function add() {
    onChange([...items, { id: `new-${Date.now()}-${items.length}`, description: "", qty: "1", unit: "", unitPrice: "", discount: "", discountMode: "amount" }]);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(items, from, to));
  }

  return (
    <div className="space-y-2">
      <DndContext
        id="items-editor"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              index={index}
              products={products}
              active={activeId === item.id}
              error={
                errors?.[`items.${index}.description`] ??
                errors?.[`items.${index}.qty`] ??
                errors?.[`items.${index}.unitPrice`] ??
                errors?.[`items.${index}.discount`]
              }
              onUpdate={(patch) => update(item.id, patch)}
              onRemove={() => remove(item.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button type="button" onClick={add} className="w-full rounded border border-dashed border-slate-400 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
        + เพิ่มรายการ
      </button>
      {errors?.["items"] ? <p className="text-xs text-red-600">{errors["items"]}</p> : null}
    </div>
  );
}

function ItemRow({
  item,
  index,
  products,
  active,
  error,
  onUpdate,
  onRemove,
}: {
  item: FormItem;
  index: number;
  products: string[];
  active: boolean;
  error?: string;
  onUpdate: (patch: Partial<FormItem>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, transition, zIndex: 10 }
    : { transition };

  const amount = lineAmount({
    qty: Number(item.qty) || 0,
    unitPrice: toSatang(item.unitPrice),
    discount: item.discount ? toSatang(item.discount) : 0,
    discountMode: item.discountMode,
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded border bg-white p-2 ${active ? "border-sky-400 shadow-lg" : "border-slate-200"}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="cursor-grab touch-none px-1 text-slate-400 hover:text-slate-700"
          aria-label="ลากเพื่อสลับลำดับ"
          {...attributes}
          {...listeners}
        >
          ≡
        </button>
        <span className="w-4 text-right text-xs text-slate-400">{index + 1}</span>
        <input
          className={`min-w-0 flex-1 rounded border px-2 py-1 text-sm ${error ? "border-red-400" : "border-slate-300"}`}
          list="product-list"
          placeholder="รายการ / Description"
          value={item.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
        />
        <button type="button" onClick={onRemove} className="px-1 text-slate-400 hover:text-red-600" aria-label="ลบรายการ">
          ✕
        </button>
      </div>

      <div className="mt-1.5 grid grid-cols-4 gap-1.5 pl-9 text-xs">
        <label className="col-span-1">
          <span className="block text-slate-500">จำนวน</span>
          <input
            type="number"
            step="any"
            min="0"
            className="w-full rounded border border-slate-300 px-1.5 py-1"
            value={item.qty}
            onChange={(e) => onUpdate({ qty: e.target.value })}
          />
        </label>
        <label className="col-span-1">
          <span className="block text-slate-500">หน่วย</span>
          <input
            className="w-full rounded border border-slate-300 px-1.5 py-1"
            value={item.unit}
            onChange={(e) => onUpdate({ unit: e.target.value })}
          />
        </label>
        <label className="col-span-1">
          <span className="block text-slate-500">ราคาต่อหน่วย</span>
          <input
            type="text"
            inputMode="decimal"
            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
            value={item.unitPrice}
            onChange={(e) => onUpdate({ unitPrice: e.target.value })}
          />
        </label>
        <label className="col-span-1">
          <span className="block text-slate-500">ส่วนลด</span>
          <div className="flex">
            <input
              type="text"
              inputMode="decimal"
              className="w-full rounded-l border border-slate-300 px-1.5 py-1 text-right"
              value={item.discount}
              onChange={(e) => onUpdate({ discount: e.target.value })}
            />
            <select
              className="rounded-r border border-l-0 border-slate-300 px-1 py-1 text-xs"
              value={item.discountMode}
              onChange={(e) => onUpdate({ discountMode: e.target.value as FormItem["discountMode"] })}
            >
              <option value="amount">฿</option>
              <option value="percent">%</option>
            </select>
          </div>
        </label>
        <div className="col-span-4 text-right text-slate-600">{formatBaht(amount)}</div>
        {error ? <p className="col-span-4 text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
