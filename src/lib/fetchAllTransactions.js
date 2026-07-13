import { base44 } from "@/api/base44Client";

// The backend caps list()/filter() results at 5000 records per request.
// This helper pages through with `skip` until all records are fetched.
export async function fetchAllTransactions(sort = "-date") {
  const pageSize = 5000;
  let skip = 0;
  let all = [];
  while (true) {
    const page = await base44.entities.Transaction.list(sort, pageSize, skip);
    all = all.concat(page);
    if (page.length < pageSize) break;
    skip += pageSize;
  }
  return all;
}