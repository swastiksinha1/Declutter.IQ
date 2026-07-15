import { useState, useEffect } from 'react';
import { RefreshCw, Brain } from 'lucide-react';

const CARDS = ['📄', '🖼️', '🎵', '🎥', '📦', '📊', '📁', '🔑'];

export default function MemoryGame() {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const shuffled = [...CARDS, ...CARDS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({ id: index, emoji }));
    setCards(shuffled);
    setFlipped([]);
    setSolved([]);
    setMoves(0);
  };

  const handleCardClick = (index) => {
    if (flipped.length === 2 || flipped.includes(index) || solved.includes(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const match = cards[newFlipped[0]].emoji === cards[newFlipped[1]].emoji;
      
      if (match) {
        setSolved([...solved, newFlipped[0], newFlipped[1]]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="game-container fade-in">
      <div className="game-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <Brain className="spin-slow" color="var(--accent-color)" />
          <h3>AI is scanning your files...</h3>
        </div>
        <p style={{opacity: 0.7, margin: '0.5rem 0 0 0'}}>Play "Find the Duplicate" while you wait!</p>
      </div>

      <div className="game-stats">
        <span>Moves: {moves}</span>
        <span>Pairs: {solved.length / 2} / 8</span>
        <button className="btn btn-icon" onClick={initializeGame} title="Restart">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="game-grid">
        {cards.map((card, idx) => (
          <div 
            key={card.id} 
            className={`game-card ${flipped.includes(idx) || solved.includes(idx) ? 'flipped' : ''} ${solved.includes(idx) ? 'solved' : ''}`}
            onClick={() => handleCardClick(idx)}
          >
            <div className="card-inner">
              <div className="card-front">?</div>
              <div className="card-back">{card.emoji}</div>
            </div>
          </div>
        ))}
      </div>

      {solved.length === 16 && (
        <div className="game-won fade-in">
          <h4>Perfect! 🎉</h4>
          <p>You found all duplicates.</p>
        </div>
      )}
    </div>
  );
}
