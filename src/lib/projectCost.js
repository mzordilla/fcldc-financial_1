const COST_BASED_CLASSIFICATIONS = new Set(["owned_project", "monitoring_project"]);

export function usesCostIncurred(project) {
  return COST_BASED_CLASSIFICATIONS.has(project?.project_classification);
}

export function calculateProjectCost(project, transactions = [], receivingItems = []) {
  if (!project) return 0;

  const projectReceipts = receivingItems.filter((item) => item.project_name === project.project_name);
  const receiptIds = new Set(projectReceipts.map((item) => item.id));
  const receivedCost = projectReceipts.reduce((sum, item) => sum + (item.total_amount || 0), 0);
  const transactionCost = transactions
    .filter((transaction) =>
      transaction.project_code === project.project_code &&
      transaction.type === "expense" &&
      transaction.status === "completed" &&
      (!transaction.receiving_item_id || !receiptIds.has(transaction.receiving_item_id))
    )
    .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

  return receivedCost + transactionCost;
}