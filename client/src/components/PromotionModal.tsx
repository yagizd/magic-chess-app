import type { Color, PromotionType } from '@shared/types';

interface Props {
  color: Color;
  onSelect: (type: PromotionType) => void;
}

const BASE = 'https://lichess1.org/assets/piece/cburnett/';
const OPTS: { type: PromotionType; label: string; code: string }[] = [
  { type: 'queen',  label: 'Vezir', code: 'Q' },
  { type: 'rook',   label: 'Kale',  code: 'R' },
  { type: 'bishop', label: 'Fil',   code: 'B' },
  { type: 'knight', label: 'At',    code: 'N' },
];

export function PromotionModal({ color, onSelect }: Props) {
  const c = color === 'white' ? 'w' : 'b';
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Taşı Seç</h3>
        <div className="promo-options">
          {OPTS.map((o) => (
            <button key={o.type} className="promo-btn" onClick={() => onSelect(o.type)}>
              <img src={`${BASE}${c}${o.code}.svg`} alt={o.label} />
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
