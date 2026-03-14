export interface TreeNode {
  feature?: string;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  value?: number;
}

export function predictTree(tree: TreeNode, features: Record<string, number>): number {
  if (tree.value !== undefined) return tree.value;
  if (!tree.feature || tree.threshold === undefined) return 0.5;
  const featureValue = features[tree.feature] || 0;
  return featureValue <= tree.threshold
    ? predictTree(tree.left!, features)
    : predictTree(tree.right!, features);
}
