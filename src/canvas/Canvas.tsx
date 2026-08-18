// The canvas (§6). Phase 1 scope: render the map on the target, pan/zoom,
// drag-to-reassign. Read-only otherwise — editing, quadrant focus, and the
// full §9.3 cross-category edge treatment come in Phases 3–4.

import {
  Background,
  BackgroundVariant,
  Position,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeTypes,
  type OnNodeDrag,
} from '@xyflow/react';
import { useMemo, useState } from 'react';
import { useMapStore } from '../store';
import type { Bubble, LinkKind } from '../types';
import { BubbleNode, type BubbleNodeData } from './BubbleNode';
import { NOMINAL_SIZE, QUADRANTS, assignRegion, toCenter, toTopLeft } from './geometry';
import { TargetBackground } from './TargetBackground';

const nodeTypes: NodeTypes = {
  targetBg: TargetBackground,
  bubble: BubbleNode,
};

type BubbleFlowNode = Node<BubbleNodeData>;

function makeNodes(bubbles: Bubble[]): BubbleFlowNode[] {
  const background = {
    id: 'targetBg',
    type: 'targetBg',
    position: { x: -1100, y: -1100 },
    draggable: false,
    selectable: false,
    zIndex: -1,
    data: { bubble: null as unknown as Bubble },
  } as BubbleFlowNode;

  return [
    background,
    ...bubbles.map(
      (bubble): BubbleFlowNode => ({
        id: bubble.id,
        type: 'bubble',
        // Doc stores the CENTER; React Flow wants the top-left (§6.1).
        position: toTopLeft(bubble.position, NOMINAL_SIZE),
        data: { bubble },
      }),
    ),
  ];
}

// Which side of each node an edge should leave/enter, from relative centers.
function pickSides(from: Bubble, to: Bubble): { source: Position; target: Position } {
  const dx = to.position.x - from.position.x;
  const dy = to.position.y - from.position.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { source: Position.Right, target: Position.Left }
      : { source: Position.Left, target: Position.Right };
  }
  return dy >= 0
    ? { source: Position.Bottom, target: Position.Top }
    : { source: Position.Top, target: Position.Bottom };
}

function edgeStyle(kind: LinkKind, source: Bubble): React.CSSProperties {
  switch (kind) {
    case 'refines': {
      const hue = source.category ? QUADRANTS[source.category].hue : 0;
      return { stroke: `hsl(${hue} 70% 60% / 0.8)`, strokeWidth: 2 };
    }
    case 'assumes':
      return { stroke: 'var(--text-dim)', strokeWidth: 1.5, strokeDasharray: '2 6', opacity: 0.6 };
    case 'contradicts':
      return { stroke: 'var(--contradict)', strokeWidth: 2, opacity: 0.85 };
    case 'evidence':
      return { stroke: 'var(--text-dim)', strokeWidth: 1, opacity: 0.5 };
  }
}

export function Canvas() {
  const doc = useMapStore((s) => s.doc);
  const updateBubble = useMapStore((s) => s.updateBubble);
  const [initialNodes] = useState(() => makeNodes(doc.bubbles));
  const [nodes, setNodes, onNodesChange] = useNodesState<BubbleFlowNode>(initialNodes);
  const [zoomFar, setZoomFar] = useState(false);

  const edges = useMemo((): Edge[] => {
    const byId = new Map(doc.bubbles.map((b) => [b.id, b]));
    return doc.links.flatMap((link) => {
      const source = byId.get(link.source);
      const target = byId.get(link.target);
      if (!source || !target) return [];
      const sides = pickSides(source, target);
      return [
        {
          id: link.id,
          source: link.source,
          target: link.target,
          sourceHandle: `s-${sides.source}`,
          targetHandle: `t-${sides.target}`,
          type: 'straight',
          style: edgeStyle(link.kind, source),
        },
      ];
    });
  }, [doc.bubbles, doc.links]);

  const onNodeDragStop: OnNodeDrag<BubbleFlowNode> = (_e, node) => {
    if (node.type !== 'bubble') return;
    const bubble = doc.bubbles.find((b) => b.id === node.id);
    if (!bubble) return;

    const size =
      node.measured?.width && node.measured?.height
        ? { width: node.measured.width, height: node.measured.height }
        : NOMINAL_SIZE;
    const center = toCenter(node.position, size);

    // Dragging is how you retier and recategorize (§6.2). Lyric bubbles are
    // exempt — they keep tier/category null wherever they land.
    const patch: Partial<Bubble> =
      bubble.kind === 'lyric' ? { position: center } : { position: center, ...assignRegion(center) };
    updateBubble(node.id, patch);
    setNodes((ns) =>
      ns.map((n) =>
        n.id === node.id ? { ...n, data: { bubble: { ...bubble, ...patch } } } : n,
      ),
    );
  };

  return (
    <div className={`canvas-wrap${zoomFar ? ' zoom-far' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onMove={(_e, viewport) => setZoomFar(viewport.zoom < 0.55)}
        onInit={(instance) => setZoomFar(instance.getViewport().zoom < 0.55)}
        fitView
        fitViewOptions={{ padding: 0.02 }}
        minZoom={0.3}
        maxZoom={2}
        zoomOnDoubleClick={false}
        nodesConnectable={false}
        elevateNodesOnSelect
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={40} size={1} color="#1c2230" />
      </ReactFlow>
    </div>
  );
}
