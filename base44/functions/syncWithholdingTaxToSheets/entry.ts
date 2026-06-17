import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { spreadsheetId, monthYear, sheetName } = await req.json().catch(() => ({}));
    if (!spreadsheetId) return Response.json({ error: 'spreadsheetId is required' }, { status: 400 });

    // Get OAuth token for Google Sheets
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    // Fetch all payables with WHT
    const payables = await base44.asServiceRole.entities.Payable.list('-created_date', 1000);
    const whtPayables = payables.filter(p => (p.withholding_tax_amount || 0) > 0 && p.status !== 'paid');

    // Fetch payment requests with WHT
    const paymentRequests = await base44.asServiceRole.entities.PaymentRequest.list('-created_date', 1000);
    const whtPaymentRequests = paymentRequests.filter(p => (p.withholding_tax_amount || 0) > 0);

    // Filter by month if provided
    let filteredPayables = whtPayables;
    let filteredRequests = whtPaymentRequests;
    if (monthYear) {
      const [year, month] = monthYear.split('-');
      const prefix = `${year}-${month}`;
      filteredPayables = whtPayables.filter(p => (p.due_date || p.payment_date || '').startsWith(prefix));
      filteredRequests = whtPaymentRequests.filter(p => (p.due_date || p.invoice_date || '').startsWith(prefix));
    }

    // Calculate totals
    const totalWhtPayable = filteredPayables.reduce((s, p) => s + (p.withholding_tax_amount || 0), 0);
    const totalWhtPaid = filteredRequests.filter(r => r.approval_status === 'paid' || r.approval_step === 'paid')
      .reduce((s, r) => s + (r.withholding_tax_amount || 0), 0);
    const totalWhtPending = filteredRequests.filter(r => r.approval_status !== 'paid' && r.approval_step !== 'paid')
      .reduce((s, r) => s + (r.withholding_tax_amount || 0), 0);

    const sheetTitle = sheetName || `WHT Report ${monthYear || 'All Time'}`;

    // Check if the sheet exists, if not create it
    let targetSheetId = null;
    const sheetsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const sheetsData = await sheetsRes.json();

    const existingSheet = (sheetsData.sheets || []).find(s => s.properties.title === sheetTitle);

    if (!existingSheet) {
      // Add new sheet
      const addRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{ addSheet: { properties: { title: sheetTitle } } }],
          }),
        }
      );
      const addData = await addRes.json();
      targetSheetId = addData.replies?.[0]?.addSheet?.properties?.sheetId;
    }

    // Prepare the data
    const rows = [];
    rows.push(['WITHHOLDING TAX REPORT', '', '', '', '', '', '', '']);
    rows.push([`Generated: ${new Date().toISOString().slice(0, 10)}`, '', '', '', '', '', '', '']);
    if (monthYear) rows.push([`Period: ${monthYear}`, '', '', '', '', '', '', '']);
    rows.push([], []);

    // Summary section
    rows.push(['SUMMARY', '', '', '', '', '', '', '']);
    rows.push(['Total WHT Outstanding (Unpaid Invoices)', `₱${totalWhtPayable.toLocaleString()}`, '', '', '', '', '', '']);
    rows.push(['Total WHT on Paid Requests', `₱${totalWhtPaid.toLocaleString()}`, '', '', '', '', '', '']);
    rows.push(['Total WHT on Pending Requests', `₱${totalWhtPending.toLocaleString()}`, '', '', '', '', '', '']);
    rows.push([], []);

    // Unpaid invoices with WHT
    rows.push(['UNPAID INVOICES WITH WITHHOLDING TAX', '', '', '', '', '', '', '']);
    rows.push(['Supplier', 'Invoice #', 'PO #', 'Project', 'Gross Amount', 'WHT %', 'WHT Amount', 'Net Amount']);
    filteredPayables.forEach(p => {
      rows.push([
        p.supplier_name || '',
        p.invoice_number || '',
        p.po_number || '',
        p.project_name || '',
        (p.amount || 0).toLocaleString(),
        `${p.withholding_tax_percentage || 0}%`,
        (p.withholding_tax_amount || 0).toLocaleString(),
        ((p.amount || 0) - (p.withholding_tax_amount || 0) + (p.vat_amount || 0)).toLocaleString(),
      ]);
    });
    if (filteredPayables.length === 0) {
      rows.push(['No records', '', '', '', '', '', '', '']);
    }
    rows.push([]);

    // Payment requests with WHT
    rows.push(['PAYMENT REQUESTS WITH WITHHOLDING TAX', '', '', '', '', '', '', '']);
    rows.push(['Payee', 'Request #', 'Description', 'Status', 'Gross Amount', 'WHT %', 'WHT Amount', 'Net Amount']);
    filteredRequests.forEach(r => {
      rows.push([
        r.payee || '',
        r.request_number || '',
        r.description || '',
        r.approval_status || r.approval_step || '',
        (r.amount || 0).toLocaleString(),
        `${r.withholding_tax_percentage || 0}%`,
        (r.withholding_tax_amount || 0).toLocaleString(),
        ((r.amount || 0) - (r.withholding_tax_amount || 0) + (r.vat_amount || 0)).toLocaleString(),
      ]);
    });
    if (filteredRequests.length === 0) {
      rows.push(['No records', '', '', '', '', '', '', '']);
    }

    // Write data to the sheet
    const range = `'${sheetTitle}'!A1`;
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: range,
          values: rows,
        }),
      }
    );

    if (!writeRes.ok) {
      const errText = await writeRes.text();
      throw new Error(`Google Sheets API error: ${errText}`);
    }

    const writeData = await writeRes.json();

    // Auto-resize columns
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            autoResizeDimensions: {
              dimensions: {
                sheetId: targetSheetId ?? (existingSheet?.properties?.sheetId || 0),
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 8,
              },
            },
          }],
        }),
      }
    );

    return Response.json({
      success: true,
      updatedCells: writeData.updatedCells || 0,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${targetSheetId ?? existingSheet?.properties?.sheetId ?? 0}`,
      summary: {
        totalWhtPayable,
        totalWhtPaid,
        totalWhtPending,
        unpaidCount: filteredPayables.length,
        requestCount: filteredRequests.length,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});