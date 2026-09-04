/**
 * QuickInvoice - Client-side Logic & Exporter
 */

// Application State
let items = [];
let nextItemId = 1;

// DOM Elements
const form = document.getElementById('invoice-form');
const itemsBody = document.getElementById('items-body');
const btnAddItem = document.getElementById('btn-add-item');
const btnGenerate = document.getElementById('btn-generate');
const btnPdf = document.getElementById('btn-pdf');
const btnWhatsapp = document.getElementById('btn-whatsapp');
const btnPrint = document.getElementById('btn-print');
const btnSampleData = document.getElementById('btn-sample-data');
const btnReset = document.getElementById('btn-reset');

// Inputs
const inputInvoiceNumber = document.getElementById('invoice-number');
const inputInvoiceDate = document.getElementById('invoice-date');
const inputDueDate = document.getElementById('due-date');
const selectCurrency = document.getElementById('currency-select');
const selectStatus = document.getElementById('payment-status');
const inputBusinessName = document.getElementById('business-name');
const inputBusinessContact = document.getElementById('business-contact');
const inputBusinessAddress = document.getElementById('business-address');
const inputCustomerName = document.getElementById('customer-name');
const inputCustomerContact = document.getElementById('customer-contact');
const inputCustomerAddress = document.getElementById('customer-address');
const inputTaxRate = document.getElementById('tax-rate');
const inputDiscountRate = document.getElementById('discount-rate');
const inputNotes = document.getElementById('invoice-notes');

// Preview DOM
const previewInvoiceNumber = document.getElementById('preview-invoice-number');
const previewInvoiceDate = document.getElementById('preview-invoice-date');
const previewDueDate = document.getElementById('preview-due-date');
const previewDueDateRow = document.getElementById('preview-due-date-row');
const previewStatusBadge = document.getElementById('preview-status-badge');
const previewBusinessName = document.getElementById('preview-business-name');
const previewBusinessContact = document.getElementById('preview-business-contact');
const previewBusinessAddress = document.getElementById('preview-business-address');
const previewCustomerName = document.getElementById('preview-customer-name');
const previewCustomerContact = document.getElementById('preview-customer-contact');
const previewCustomerAddress = document.getElementById('preview-customer-address');
const previewItemsBody = document.getElementById('preview-items-body');
const previewSubtotal = document.getElementById('preview-subtotal');
const previewDiscountRow = document.getElementById('preview-discount-row');
const previewDiscountRate = document.getElementById('preview-discount-rate');
const previewDiscountAmount = document.getElementById('preview-discount-amount');
const previewTaxRow = document.getElementById('preview-tax-row');
const previewTaxRate = document.getElementById('preview-tax-rate');
const previewTaxAmount = document.getElementById('preview-tax-amount');
const previewGrandTotal = document.getElementById('preview-grand-total');
const previewNotes = document.getElementById('preview-notes');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

/**
 * Format date nicely (e.g., 2026-09-04 -> Sep 4, 2026)
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format currency amount
 */
function formatCurrency(amount, symbol = '$') {
  const num = Number(amount) || 0;
  return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Initialize Default Values
 */
function initDefaults() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const due = new Date();
  due.setDate(today.getDate() + 14);
  const dueStr = due.toISOString().split('T')[0];

  inputInvoiceNumber.value = 'INV-' + today.getFullYear() + '-' + String(Math.floor(100 + Math.random() * 900));
  inputInvoiceDate.value = todayStr;
  inputDueDate.value = dueStr;
  selectCurrency.value = '$';
  selectStatus.value = 'DUE';

  // Clear rows and add default first row
  items = [];
  nextItemId = 1;
  addItemRow('Consulting & Development Services', 1, 150.00);
  
  updateCalculations();
}

/**
 * Add a dynamic item row to Editor
 */
function addItemRow(description = '', quantity = 1, price = 0) {
  const id = nextItemId++;
  const item = {
    id,
    description,
    quantity: Number(quantity) || 1,
    price: Number(price) || 0
  };
  items.push(item);

  renderEditorRows();
  updateCalculations();
}

/**
 * Remove an item row
 */
function deleteItemRow(id) {
  if (items.length <= 1) {
    showToast('Invoice must have at least one line item!', true);
    return;
  }
  items = items.filter(it => it.id !== id);
  renderEditorRows();
  updateCalculations();
}

/**
 * Render editable table rows
 */
function renderEditorRows() {
  const currency = selectCurrency.value || '$';
  itemsBody.innerHTML = '';

  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    const lineTotal = (item.quantity * item.price);

    tr.innerHTML = `
      <td>
        <input type="text" class="form-control item-desc" data-id="${item.id}" 
          placeholder="e.g. Website Design" value="${escapeHtml(item.description)}">
      </td>
      <td>
        <input type="number" class="form-control item-qty" data-id="${item.id}" 
          min="0" step="any" value="${item.quantity}">
      </td>
      <td>
        <div class="input-prefix-wrap">
          <input type="number" class="form-control item-price" data-id="${item.id}" 
            min="0" step="0.01" value="${item.price}">
        </div>
      </td>
      <td class="item-row-total" id="row-total-${item.id}">
        ${formatCurrency(lineTotal, currency)}
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-delete-row" data-id="${item.id}" title="Remove item">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;
    itemsBody.appendChild(tr);
  });

  // Re-initialize icons in newly created DOM
  if (window.lucide) {
    lucide.createIcons();
  }

  // Attach event listeners for inputs
  const descInputs = itemsBody.querySelectorAll('.item-desc');
  descInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const id = Number(e.target.dataset.id);
      const item = items.find(it => it.id === id);
      if (item) {
        item.description = e.target.value;
        updateCalculations();
      }
    });
  });

  const qtyInputs = itemsBody.querySelectorAll('.item-qty');
  qtyInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const id = Number(e.target.dataset.id);
      const item = items.find(it => it.id === id);
      if (item) {
        item.quantity = parseFloat(e.target.value) || 0;
        updateCalculations();
      }
    });
  });

  const priceInputs = itemsBody.querySelectorAll('.item-price');
  priceInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const id = Number(e.target.dataset.id);
      const item = items.find(it => it.id === id);
      if (item) {
        item.price = parseFloat(e.target.value) || 0;
        updateCalculations();
      }
    });
  });

  const deleteButtons = itemsBody.querySelectorAll('.btn-delete-row');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(btn.dataset.id);
      deleteItemRow(id);
    });
  });
}

/**
 * Calculate totals and update Live Preview
 */
function updateCalculations() {
  const currency = selectCurrency.value || '$';
  
  // Calculate Subtotal
  let subtotal = 0;
  items.forEach(item => {
    const line = (item.quantity * item.price);
    subtotal += line;
    const rowTotalEl = document.getElementById(`row-total-${item.id}`);
    if (rowTotalEl) {
      rowTotalEl.textContent = formatCurrency(line, currency);
    }
  });

  const taxRate = Math.max(0, parseFloat(inputTaxRate.value) || 0);
  const discountRate = Math.max(0, parseFloat(inputDiscountRate.value) || 0);

  const discountAmount = subtotal * (discountRate / 100);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableAmount * (taxRate / 100);
  const grandTotal = Math.max(0, taxableAmount + taxAmount);

  // Update Live Preview Sheet Header & Meta
  previewInvoiceNumber.textContent = inputInvoiceNumber.value || 'INV-0001';
  previewInvoiceDate.textContent = formatDate(inputInvoiceDate.value) || '—';
  
  if (inputDueDate.value) {
    previewDueDateRow.style.display = 'flex';
    previewDueDate.textContent = formatDate(inputDueDate.value);
  } else {
    previewDueDateRow.style.display = 'none';
  }

  // Status Badge
  const statusVal = selectStatus.value;
  previewStatusBadge.className = 'sheet-status-badge';
  if (statusVal === 'PAID') {
    previewStatusBadge.textContent = 'Paid in Full';
    previewStatusBadge.classList.add('status-paid');
  } else if (statusVal === 'DUE') {
    previewStatusBadge.textContent = 'Payment Due';
    previewStatusBadge.classList.add('status-due');
  } else {
    previewStatusBadge.textContent = 'Pending';
    previewStatusBadge.classList.add('status-pending');
  }

  // Business & Client Meta
  previewBusinessName.textContent = inputBusinessName.value.trim() || 'Your Business Name';
  previewBusinessContact.textContent = inputBusinessContact.value.trim() || 'contact@yourbusiness.com';
  previewBusinessAddress.textContent = inputBusinessAddress.value.trim() || 'Business Address';

  previewCustomerName.textContent = inputCustomerName.value.trim() || 'Client Name';
  previewCustomerContact.textContent = inputCustomerContact.value.trim() || 'client@email.com';
  previewCustomerAddress.textContent = inputCustomerAddress.value.trim() || 'Client Address';

  // Notes
  previewNotes.textContent = inputNotes.value.trim() || 'Payment terms and details will appear here.';

  // Preview Line Items
  previewItemsBody.innerHTML = '';
  items.forEach(item => {
    const tr = document.createElement('tr');
    const lineTotal = item.quantity * item.price;
    tr.innerHTML = `
      <td class="desc-cell">${escapeHtml(item.description) || '<i>Untitled Item</i>'}</td>
      <td class="center-cell">${item.quantity}</td>
      <td class="amount-cell">${formatCurrency(item.price, currency)}</td>
      <td class="amount-cell">${formatCurrency(lineTotal, currency)}</td>
    `;
    previewItemsBody.appendChild(tr);
  });

  // Preview Totals
  previewSubtotal.textContent = formatCurrency(subtotal, currency);

  if (discountRate > 0) {
    previewDiscountRow.style.display = 'flex';
    previewDiscountRate.textContent = `${discountRate}%`;
    previewDiscountAmount.textContent = `-${formatCurrency(discountAmount, currency)}`;
  } else {
    previewDiscountRow.style.display = 'none';
  }

  if (taxRate > 0) {
    previewTaxRow.style.display = 'flex';
    previewTaxRate.textContent = `${taxRate}%`;
    previewTaxAmount.textContent = `+${formatCurrency(taxAmount, currency)}`;
  } else {
    previewTaxRow.style.display = 'none';
  }

  previewGrandTotal.textContent = formatCurrency(grandTotal, currency);
}

/**
 * Generate formatted WhatsApp summary and copy to clipboard
 */
function copyWhatsAppSummary() {
  const currency = selectCurrency.value || '$';
  const business = inputBusinessName.value.trim() || 'Business';
  const client = inputCustomerName.value.trim() || 'Client';
  const invNum = inputInvoiceNumber.value.trim() || 'INV-0001';
  const dateStr = formatDate(inputInvoiceDate.value) || 'Today';
  const dueDateStr = inputDueDate.value ? formatDate(inputDueDate.value) : null;
  const status = selectStatus.options[selectStatus.selectedIndex].text;

  let subtotal = 0;
  let itemsSummary = '';

  items.forEach(item => {
    const total = item.quantity * item.price;
    subtotal += total;
    const desc = item.description.trim() || 'Item';
    itemsSummary += `• *${desc}*: ${item.quantity} x ${formatCurrency(item.price, currency)} = ${formatCurrency(total, currency)}\n`;
  });

  const taxRate = Math.max(0, parseFloat(inputTaxRate.value) || 0);
  const discountRate = Math.max(0, parseFloat(inputDiscountRate.value) || 0);
  const discountAmount = subtotal * (discountRate / 100);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = taxableAmount * (taxRate / 100);
  const grandTotal = Math.max(0, taxableAmount + taxAmount);

  let summary = `🧾 *INVOICE: ${invNum}*\n`;
  summary += `🏢 *From:* ${business}\n`;
  summary += `👤 *To:* ${client}\n`;
  summary += `📅 *Date:* ${dateStr}\n`;
  if (dueDateStr) {
    summary += `⏳ *Due Date:* ${dueDateStr}\n`;
  }
  summary += `📊 *Status:* ${status}\n`;
  summary += `────────────────────\n`;
  summary += `📦 *Items:*\n${itemsSummary}`;
  summary += `────────────────────\n`;
  summary += `*Subtotal:* ${formatCurrency(subtotal, currency)}\n`;

  if (discountRate > 0) {
    summary += `*Discount (${discountRate}%):* -${formatCurrency(discountAmount, currency)}\n`;
  }
  if (taxRate > 0) {
    summary += `*Tax (${taxRate}%):* +${formatCurrency(taxAmount, currency)}\n`;
  }

  summary += `💰 *Grand Total: ${formatCurrency(grandTotal, currency)}*\n`;
  summary += `────────────────────\n`;

  if (inputNotes.value.trim()) {
    summary += `📝 *Notes & Payment:*\n${inputNotes.value.trim()}\n\n`;
  }

  summary += `Thank you for your business! 🙏`;

  // Copy to clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(summary)
      .then(() => showToast('Summary copied! Ready to paste into WhatsApp.'))
      .catch(() => fallbackCopy(summary));
  } else {
    fallbackCopy(summary);
  }
}

/**
 * Fallback clipboard copy for older environments
 */
function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('Summary copied! Ready to paste into WhatsApp.');
  } catch (err) {
    showToast('Could not copy automatically. Please copy manually.', true);
  }
  document.body.removeChild(textArea);
}

/**
 * Show Toast Notification
 */
let toastTimeout;
function showToast(message, isError = false) {
  clearTimeout(toastTimeout);
  toastMessage.textContent = message;
  toast.style.background = isError ? '#ef4444' : '#1e293b';
  toast.classList.add('show');
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

/**
 * Download Invoice as PDF using html2pdf
 */
function downloadPDF() {
  const element = document.getElementById('invoice-sheet');
  const invNum = (inputInvoiceNumber.value.trim() || 'INV').replace(/[^a-zA-Z0-9-_]/g, '_');
  const clientName = (inputCustomerName.value.trim() || 'Customer').replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `${invNum}_${clientName}.pdf`;

  showToast('Generating PDF...');

  const opt = {
    margin: [10, 10, 10, 10], // mm
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollY: 0
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  if (window.html2pdf) {
    html2pdf().set(opt).from(element).save().then(() => {
      showToast('PDF downloaded successfully!');
    }).catch(err => {
      console.error('PDF generation error:', err);
      showToast('PDF export failed. You can use "Print" to save as PDF.', true);
    });
  } else {
    showToast('html2pdf library loading... please use Print as backup.', true);
    window.print();
  }
}

/**
 * Helper to escape HTML strings
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Load Sample Data
 */
function loadSampleData() {
  inputBusinessName.value = 'Apex Studio LLC';
  inputBusinessContact.value = 'billing@apexstudio.io • +1 (555) 234-5678';
  inputBusinessAddress.value = '742 Evergreen Blvd, Suite 300\nSan Francisco, CA 94107';

  inputCustomerName.value = 'NovaTech Solutions';
  inputCustomerContact.value = 'finance@novatech.co • Attn: Alex Morgan';
  inputCustomerAddress.value = '100 Silicon Way\nAustin, TX 78701';

  inputInvoiceNumber.value = 'INV-2026-089';
  const today = new Date().toISOString().split('T')[0];
  inputInvoiceDate.value = today;

  const due = new Date();
  due.setDate(new Date().getDate() + 15);
  inputDueDate.value = due.toISOString().split('T')[0];

  selectCurrency.value = '$';
  selectStatus.value = 'DUE';
  inputTaxRate.value = '8.5';
  inputDiscountRate.value = '5';
  inputNotes.value = 'Bank: Silicon Valley Bank\nAccount: 4892-0012-9841 | Routing: 121000358\nPayment terms: Net 15 days.';

  items = [];
  nextItemId = 1;
  addItemRow('Custom Web App UI/UX Redesign & Figma System', 1, 1850.00);
  addItemRow('Frontend Component Implementation (HTML/CSS/JS)', 24, 75.00);
  addItemRow('Responsive Optimization & Speed Audit', 1, 450.00);

  updateCalculations();
  showToast('Sample business data loaded!');
}

/**
 * Reset form
 */
function resetForm() {
  if (confirm('Are you sure you want to reset the invoice? All entered data will be cleared.')) {
    inputBusinessName.value = '';
    inputBusinessContact.value = '';
    inputBusinessAddress.value = '';
    inputCustomerName.value = '';
    inputCustomerContact.value = '';
    inputCustomerAddress.value = '';
    inputTaxRate.value = '0';
    inputDiscountRate.value = '0';
    inputNotes.value = '';
    initDefaults();
    showToast('Invoice cleared.');
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initDefaults();

  // Inputs live change
  const inputsToListen = [
    inputInvoiceNumber, inputInvoiceDate, inputDueDate, selectCurrency, selectStatus,
    inputBusinessName, inputBusinessContact, inputBusinessAddress,
    inputCustomerName, inputCustomerContact, inputCustomerAddress,
    inputTaxRate, inputDiscountRate, inputNotes
  ];

  inputsToListen.forEach(el => {
    el.addEventListener('input', updateCalculations);
    el.addEventListener('change', updateCalculations);
  });

  btnAddItem.addEventListener('click', () => {
    addItemRow('', 1, 0);
  });

  btnGenerate.addEventListener('click', () => {
    updateCalculations();
    document.getElementById('invoice-sheet').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Invoice preview updated!');
  });

  btnPdf.addEventListener('click', downloadPDF);
  btnWhatsapp.addEventListener('click', copyWhatsAppSummary);
  btnPrint.addEventListener('click', () => window.print());
  btnSampleData.addEventListener('click', loadSampleData);
  btnReset.addEventListener('click', resetForm);

  if (window.lucide) {
    lucide.createIcons();
  }
});
