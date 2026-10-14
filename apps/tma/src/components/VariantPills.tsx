type Props = Readonly<{
  sizes: string[];
  value: string | null;
  onChange: (size: string) => void;
  soldOut?: string[];
}>;

export default function VariantPills({ sizes, value, onChange, soldOut = [] }: Props) {
  return (
    <div className="pills" role="radiogroup" aria-label="Choose your size">
      {sizes.map((size) => {
        const out = soldOut.includes(size);
        const active = value === size;
        return (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={out}
            className={`pills__pill${active ? " pills__pill--active" : ""}${out ? " pills__pill--out" : ""}`}
            onClick={() => !out && onChange(size)}
            disabled={out}
          >
            {size}
          </button>
        );
      })}
    </div>
  );
}
