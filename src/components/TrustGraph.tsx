import type { TrustGraph } from '../types';
import { levelColor, scoreToLevel } from '../utils/scoreUtils';

interface TrustGraphProps {
  graph: TrustGraph;
}

const NODE_COLORS: Record<string, string> = {
  user: '#22c55e',       // green
  sender: '#2563eb',     // blue
  domain: '#06b6d4',     // cyan
  link: '#eab308',       // yellow
  attachment: '#a855f7', // purple
  risk: '#06b6d4',       // cyan
  qr: '#f97316',         // orange
  language: '#8b5cf6',   // violet
  behavior: '#10b981',   // emerald
  threatintel: '#ef4444' // red
};

export function TrustGraph({ graph }: TrustGraphProps) {
  const width = 480;
  const height = 280;
  const nodePositions = new Map<string, { x: number; y: number }>();

  const columns: Record<string, number> = {
    user: 0,
    sender: 1,
    domain: 1,
    language: 2,
    behavior: 2,
    link: 2,
    attachment: 2,
    qr: 2,
    risk: 3,
  };

  const colCounts: Record<number, number> = {};
  graph.nodes.forEach((node) => {
    const col = columns[node.type] ?? 2;
    colCounts[col] = (colCounts[col] || 0) + 1;
  });

  const colIndex: Record<number, number> = {};
  graph.nodes.forEach((node) => {
    const col = columns[node.type] ?? 2;
    const idx = colIndex[col] || 0;
    colIndex[col] = idx + 1;
    const total = colCounts[col] || 1;
    const x = 60 + col * ((width - 120) / 3);
    const y = 40 + (idx + 0.5) * ((height - 80) / total);
    nodePositions.set(node.id, { x, y });
  });

  return (
    <div className="glass-card p-4 overflow-hidden border border-cyan-500/25">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        Digital Trust Graph Model
      </h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {graph.edges.map((edge, i) => {
          const from = nodePositions.get(edge.from);
          const to = nodePositions.get(edge.to);
          if (!from || !to) return null;
          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(6,182,212,0.25)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {edge.label && (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 4}
                  fill="rgba(34,211,238,0.4)"
                  fontSize="7"
                  textAnchor="middle"
                  className="font-mono"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {graph.nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;
          const color = NODE_COLORS[node.type] || '#71717a';
          const riskLevel = node.riskScore !== undefined ? scoreToLevel(node.riskScore) : null;

          return (
            <g key={node.id} filter="url(#glow)">
              <circle
                cx={pos.x}
                cy={pos.y}
                r={node.type === 'user' ? 22 : 18}
                fill="rgba(10,10,15,0.9)"
                stroke={node.type === 'risk' ? '#22d3ee' : (riskLevel ? levelColor(riskLevel) : color)}
                strokeWidth="2"
              />
              <text
                x={pos.x}
                y={pos.y + 30}
                fill="#a1a1aa"
                fontSize="8"
                textAnchor="middle"
                className="font-mono"
              >
                {node.label.length > 18 ? `${node.label.slice(0, 16)}…` : node.label}
              </text>
              <text
                x={pos.x}
                y={pos.y + 3}
                fill="white"
                fontSize="7"
                textAnchor="middle"
                fontWeight="600"
                className="font-mono"
              >
                {node.type.toUpperCase().slice(0, 4)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default TrustGraph;
