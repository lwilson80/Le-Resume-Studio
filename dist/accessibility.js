// Native dialogs provide modal keyboard containment and Escape handling.
// Keep their initial focus and return destination explicit across async actions.
const returnFocus = new WeakMap();
const invalidFields = new WeakMap();

export function focusElement(element) {
  if (!element || element.isConnected === false || element.disabled) return;
  const details = element.closest?.('details');
  if (details) details.open = true;
  element.focus();
}

export function initializeDialogs(doc) {
  for (const dialog of doc.querySelectorAll('dialog')) {
    dialog.addEventListener('close', () => {
      focusElement(returnFocus.get(dialog));
      returnFocus.delete(dialog);
    });
  }
}

export function openDialog(doc, id, opener = doc.activeElement) {
  const dialog = doc.getElementById(id);
  returnFocus.set(dialog, opener);
  const status = dialog.querySelector('.dialog-status');
  if (status) status.textContent = '';
  dialog.showModal();
  dialog.scrollTop = 0;
  focusElement(doc.getElementById(dialog.getAttribute('aria-labelledby').split(' ')[0]));
}

export function closeDialog(doc, id, {returnTo} = {}) {
  const dialog = doc.getElementById(id);
  if (returnTo) returnFocus.set(dialog, returnTo);
  dialog.close();
}

export function notify(doc, message) {
  const dialog = doc.querySelector('dialog[open]');
  const status = dialog?.querySelector('[data-dialog-status]') || doc.getElementById('toast');
  // The live region exists before updates and stays available until replaced.
  status.textContent = message;
  status.hidden = false;
}

export function fieldError(message, fieldId) {
  return Object.assign(new Error(message), {fieldId});
}

export function clearFieldError(doc, id) {
  const error = doc.getElementById(id);
  for (const field of invalidFields.get(error) || []) {
    field.removeAttribute('aria-invalid');
    const descriptions = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(x => x && x !== id);
    if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '));
    else field.removeAttribute('aria-describedby');
  }
  invalidFields.delete(error);
  error.hidden = true;
  error.textContent = '';
}

export function showFieldError(doc, id, problem) {
  clearFieldError(doc, id);
  const error = doc.getElementById(id);
  error.textContent = problem.message || String(problem);
  error.hidden = false;
  const field = problem.fieldId ? doc.getElementById(problem.fieldId) : null;
  if (field) {
    field.setAttribute('aria-invalid', 'true');
    const descriptions = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    descriptions.add(id);
    field.setAttribute('aria-describedby', [...descriptions].join(' '));
    invalidFields.set(error, [field]);
  }
  focusElement(field || error);
}
